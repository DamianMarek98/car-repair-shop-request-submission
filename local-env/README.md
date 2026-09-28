# Local environment

Runs the whole platform on your machine — both portals, the `shop` backend and all three
Lambdas — with **no real AWS calls and no real e-mails**. Every e-mail is captured and shown on
a local page.

Needs Docker, JDK 21, Maven, Node, the `aws` CLI and `jq`. You don't need `awslocal`.

## Start

```bash
npm run local:up                  # LocalStack + mail sink, resources, builds & deploys the 3 Lambdas (~30 s)
npm run local:shop                # shop backend on :8080 (or ShopApplication in the IDE, profile `local`)
npm run local:submission-portal   # client form      http://localhost:4200
npm run local:admin-portal        # admin portal     http://localhost:4201   (renocar / 12345)
```

Captured e-mails: **http://localhost:8025** (refreshes every 5 s).

Stop and reset: `npm run local:down`. LocalStack keeps no state, so the next `local:up` starts
with empty tables.

## What runs where

| Component | Local | Notes |
|---|---|---|
| DynamoDB `repair_request` (+ `SubmittedAtIndex`, stream), `unavailable_day` | LocalStack `:4566` | created by `init/ready.d/10-resources.sh` |
| `shop` | host `:8080`, profile `local` | `application-local.properties` |
| Consumer Lambda (production submit path) | LocalStack Lambda | not used by the local form (see below); call it with `local:submit-via-lambda` |
| Notification Lambda → SNS | LocalStack Lambda, triggered by the stream | the SNS topic delivers to SQS queue `local-notifications` |
| Confirmation-email Lambda | LocalStack Lambda, triggered by the stream | e-mail → mail sink |
| E-mails from `shop` (appointment, review) | mail sink `:8025` | |

All AWS resources live in account **`009160054371`**, region **`eu-north-1`**, the same as
production. LocalStack uses the 12-digit access key as the account ID, so the notification
Lambda's hardcoded topic ARN works without changes.

## Inspect

```bash
npm run local:scan              # all repair_request items (raw DynamoDB JSON)
npm run local:emails            # captured e-mails as JSON (UI: http://localhost:8025)
npm run local:notifications     # "Nowe zgłoszenie od …" messages the shop would get via SNS
./local-env/aws-local.sh logs tail /aws/lambda/new-repair-request-confirmation-email --follow
./local-env/aws-local.sh <any aws cli command>   # always LocalStack, ignores ~/.aws
curl -X DELETE localhost:8025/emails            # clear the mail sink
```

## Flows

- **Everyday flow:** submit on `:4200` → the stream fires the confirmation e-mail and the SNS
  notification → the request shows on `:4201` → "Umów wizytę" → a "Termin wizyty" e-mail →
  "Wizyta odbyta" → a review e-mail (if the customer consented).
- **Production submit path:** locally the form posts to `shop`'s own
  `/api/repair-request/submit`, while production posts to the consumer Lambda. To test the
  Lambda path: `npm run local:submit-via-lambda -- path/to/dto.json` (defaults to the
  consumer's `sample-asap.json`).
- **The notification Lambda skips a request whose first name is exactly `test`**, as in
  production.

## After changing code

- A Lambda: `npm run local:lambdas` rebuilds and redeploys all three (tests skipped). Use
  `./local-env/deploy-lambdas.sh --skip-build` to redeploy jars you've already built.
- `shop`: restart `local:shop`.
- Portals: `ng serve` hot-reloads.
- New DynamoDB attribute or index: update `init/ready.d/10-resources.sh`, then run
  `local:down` / `local:up`.

## Gotchas (all hit while setting this up)

- **SES v2 isn't in LocalStack community** (it returns a 501). `shop` and the confirmation
  Lambda therefore send to `mail-sink/mail_sink.py`, a small SES v2 `SendEmail` stand-in.
  `shop` reaches it via `car.repair.shop.aws.ses-endpoint`, the Lambdas via
  `AWS_ENDPOINT_URL_SESV2`.
- **Lambdas get explicit credentials** (`AWS_ACCESS_KEY_ID=009160054371`). Otherwise
  LocalStack hands them the default account's keys, and they can't see the tables.
- **The `local-lambda` IAM role must exist.** The stream poller assumes it. Without it the
  poller reads the default account and logs "Stream … was not found".
- **Consumer events:** the consumer's `sample-*.json` files hold the bare DTO. The handler
  expects an API Gateway event with `body` as a JSON string, which `submit-via-lambda.sh` wraps
  for you.
- **LocalStack is pinned to 3.8.** The shop integration tests pin 3.2 separately.
- **"Unresolved compilation problem" when running `shop`:** an IDE language server compiled
  `target/` without Lombok. `local:shop` already runs `mvn clean` first.
