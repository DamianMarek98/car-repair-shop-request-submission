# Local end-to-end environment — plan

Goal: run the whole flow on a laptop — submit a request, book it in the admin portal, see
what the stream Lambdas do — with **every AWS call going to LocalStack**, so data can be
inspected and **no e-mail ever leaves the machine**.

Status: **implemented 2026-09-28** — how to use it: `local-env/README.md`. This file is kept
as the design record. Where the implementation differs from the plan:

- **No SES in LocalStack.** The community edition has no SES v2 (it returns a 501), so e-mails
  go to `local-env/mail-sink/` (a small SES v2 `SendEmail` stand-in, UI on `:8025`). `shop`
  reaches it through a new `car.repair.shop.aws.ses-endpoint` property, and the Lambdas
  through `AWS_ENDPOINT_URL_SESV2`. The `/_aws/ses` inspection endpoint below is not used.
- **LocalStack 3.8, not 3.2.**
- **Lambdas get explicit account credentials**, and the init script creates the
  `local-lambda` IAM role. Without both, Lambdas and the stream poller fall back to
  LocalStack's default account.
- **The mail-sink container** was added to `docker-compose.yml`. The `awslocal` host
  commands are replaced by `local-env/aws-local.sh`.

---

## 1. What works today, and what doesn't

| Piece | Local today? | Notes |
|---|---|---|
| `shop` (Spring) | ✅ | profile `local`, DynamoDB Local on `:8081`, login `renocar` / `12345` (`application-local.properties`). Tables must be created by hand from `shop/src/main/resources/dynamodb/*.txt`. |
| `submission-portal` / `repair-requests-portal` | ✅ | `npm start` → `:4200` / `:4201`, dev env points at `http://localhost:8080/api`. |
| Submission path | ⚠️ | locally the form posts to **shop's** duplicate `/api/repair-request/submit`, not the consumer Lambda that production uses. |
| **E-mails from `shop`** (review, appointment) | ❌ **unsafe** | `SesConfig` always builds a real `SesV2Client` (eu-north-1, default credential chain) — the `local` profile does **not** redirect it. With `~/.aws/credentials` present, booking a request locally can send a **real** e-mail to whatever address the test request has. |
| `repair-request-submitted-consumer` | ⚠️ | unit tests only; `DynamoDbClient.create()` could be pointed at LocalStack via `AWS_ENDPOINT_URL`, but nothing invokes it locally. |
| `new-repair-request-notification-lambda` (SNS) | ❌ | needs a DynamoDB stream + event-source mapping; `TOPIC_ARN` hardcodes account `009160054371`. |
| `new-repair-request-confirmation-email-lambda` (SES) | ❌ | needs a DynamoDB stream; SES region hardcoded `eu-north-1`. |

**Conclusion:** shop + portals run locally now, with the e-mail risk above; the stream
Lambdas don't run locally at all. You need the setup below to test the full flow.

---

## 2. Target setup

```
 host                                    docker: LocalStack :4566  (region eu-north-1,
                                                 account 009160054371)
 submission-portal :4200 ─┐              ┌──────────────────────────────────────────┐
 repair-requests-portal :4201 ─► shop :8080 ─► DynamoDB  repair_request (+stream)    │
                                         │            unavailable_day                │
                                         │     │ stream (INSERT)                     │
                                         │     ├─► Lambda notification ─► SNS topic ─► SQS inspect queue
                                         │     └─► Lambda confirmation ─► SES (captured, never sent)
                                         │  shop e-mails ──────────────► SES (captured)│
                                         └──────────────────────────────────────────┘
```

- One `docker compose up` gives LocalStack with all resources created by an init hook.
- `shop` and both portals keep running on the host (fast reload, debugger).
- **Using access key `009160054371`**: LocalStack uses a 12-digit access key as the account
  ID, so the notification Lambda's hardcoded `TOPIC_ARN` resolves **without code changes**.
  Use region `eu-north-1` everywhere, because the confirmation Lambda hardcodes it.
- LocalStack injects `AWS_ENDPOINT_URL` into the Lambda containers, and SDK v2 (2.31 here)
  honours it, so the Lambdas' `SnsClient.create()` / `SesV2Client.builder()` reach LocalStack
  without code changes. **Verify this in step 4.** If it doesn't work, add an
  `AWS_ENDPOINT_URL` env var on `create-function`.

---

## 3. Implementation steps

### Step 1 — make `shop`'s e-mails safe (**do first; small code change**)
- `notification/SesConfig`: when `car.repair.shop.aws.endpoint` is set (profiles `local` /
  `test`), build the client with `.endpointOverride(URI)` + static fake credentials, like
  `DynamoDBConfig.localAmazonDynamoDB()` already does. Production (no endpoint) is unchanged.
- Test: a context test under profile `test` asserting the client's endpoint is the
  LocalStack one. **Until this lands, don't book requests with real addresses locally.**

### Step 2 — `local-env/docker-compose.yml`
- `localstack/localstack` **pinned** to a version (tests already pin `3.2`; Lambda `java21`
  needs ≥ 3.0). `SERVICES=dynamodb,dynamodbstreams,lambda,sns,sqs,ses,logs,iam`,
  `DEFAULT_REGION=eu-north-1`, port `4566`, and mount `/var/run/docker.sock` (LocalStack
  runs Lambdas as sibling containers). Mount `./init` to `/etc/localstack/init/ready.d`.
- Check whether the chosen LocalStack image needs an auth token before picking a version.

### Step 3 — `local-env/init/ready.d/10-resources.sh` (runs on every start)
Idempotent `awslocal` calls:
- `repair_request` table: hash `id`, GSI `SubmittedAtIndex` (`dummyPartitionKey` +
  `submittedAt`, projection ALL), **stream `NEW_AND_OLD_IMAGES`**. Add `TrackingTokenIndex`
  when Phase 2 of the status page lands.
- `unavailable_day` table (hash `id`).
- SES: `verify-domain-identity renocar-zgloszenie.pl` (sender for all e-mails).
- SNS topic `NewRepairRequestSubmittedTopic` + SQS queue `local-notifications`, subscribed
  so the shop notification can be read back.
- This replaces the loose CLI strings in `shop/src/main/resources/dynamodb/*.txt`. Keep
  those files in sync or delete them.

### Step 4 — `local-env/deploy-lambdas.sh`
- Build: `mvn -q package` (consumer), `./gradlew shadowJar` (both stream Lambdas).
- `awslocal lambda create-function` (or `update-function-code` if it exists), runtime
  `java21`, dummy role `arn:aws:iam::009160054371:role/local`, handlers:
  - `car.repair.shop.notification.NewRepairRequestSubmittedSnsNotifier`
  - `car.repair.shop.confirmation.NewRepairRequestSubmittedEmailNotifier`
  - `car.repair.shop.RepairRequestSubmittedHandler` (consumer, invoked by hand — see step 6)
- `awslocal lambda create-event-source-mapping` for both stream Lambdas on the
  `repair_request` stream ARN, `--starting-position LATEST`.
- Run it after `compose up`, and again after changing Lambda code.

### Step 5 — point `shop` at LocalStack
`application-local.properties`: `endpoint=http://localhost:4566`, `region=eu-north-1`,
`access-key=009160054371`. Everything else stays the same. DynamoDB Local on `:8081` is
retired; update the three docs that mention it (`shop/CLAUDE.md`, both skills).

### Step 6 — the consumer Lambda (optional)
The portals keep submitting through shop, so the everyday flow needs nothing here. To check
the production submit path, invoke the consumer directly with the existing samples:
`awslocal lambda invoke --function-name repair-request-submitted-consumer --payload
file://…/sample-asap.json out.json`. That writes a real item and fires the stream Lambdas.
Exposing it through a LocalStack API Gateway and adding a `local` Angular environment is
possible, but it's an extra — skip it unless the two submit paths drift.

### Step 7 — scripts + docs
- Root `package.json`: `local:up` (compose up + deploy-lambdas), `local:down`,
  `local:emails`, `local:scan`.
- A short "Local environment" section in root `CLAUDE.md` / README with the walkthrough below.

**Effort:** about a day. Step 1 is roughly an hour; most of the remaining time is steps 3–4
and checking the Lambda endpoint injection.

---

## 4. How to use it (after implementation)

```bash
docker compose -f local-env/docker-compose.yml up -d     # LocalStack + resources
./local-env/deploy-lambdas.sh                              # 3 Lambdas + stream mappings
# shop: run ShopApplication with SPRING_PROFILES_ACTIVE=local (IDE)
cd submission-portal && npm start                          # :4200
cd repair-requests-portal && npm start                     # :4201  (renocar / 12345)
```

Walk the flow: submit at `:4200` → the request appears at `:4201` → "Umów wizytę".

| Inspect | Command |
|---|---|
| Saved data | `awslocal dynamodb scan --table-name repair_request` |
| **All e-mails** (confirmation, appointment, review) | `curl -s localhost:4566/_aws/ses \| jq` — LocalStack captures them and never sends them |
| Shop's "new request" notification (SNS) | `awslocal sqs receive-message --queue-url …/local-notifications` |
| Lambda logs | `awslocal logs tail /aws/lambda/<function-name> --follow` |

Reset: `docker compose down` (LocalStack is ephemeral by default — every start is a clean DB).
