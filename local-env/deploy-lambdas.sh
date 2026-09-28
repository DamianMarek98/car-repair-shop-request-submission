#!/bin/bash
# Builds the three Lambdas and (re)deploys them into LocalStack, wiring the two stream Lambdas
# to the repair_request DynamoDB stream. Safe to re-run after any Lambda code change.
# Pass --skip-build to redeploy the jars already built.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/car-repair-shop-backend"
AWS_LOCAL="$ROOT/local-env/aws-local.sh"
ROLE_ARN="arn:aws:iam::009160054371:role/local-lambda"
# Explicit so the SDK clients inside the Lambda containers always hit LocalStack, in the same
# account as the resources (LocalStack otherwise hands Lambdas the default 000000000000 keys).
# SES v2 goes to the mail sink - LocalStack community has no SES v2.
LAMBDA_ENV="Variables={AWS_ENDPOINT_URL=http://renocar-localstack:4566,AWS_ENDPOINT_URL_SESV2=http://renocar-mail-sink:8025,AWS_ACCESS_KEY_ID=009160054371,AWS_SECRET_ACCESS_KEY=test}"

CONSUMER_DIR="$BACKEND/repair-request-submitted-consumer"
NOTIFICATION_DIR="$BACKEND/new-repair-request-notification-lambda"
CONFIRMATION_DIR="$BACKEND/new-repair-request-confirmation-email-lambda"

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "[renocar] building Lambdas (tests skipped - run them separately)"
  (cd "$CONSUMER_DIR" && mvn -q -DskipTests package)
  (cd "$NOTIFICATION_DIR" && ./gradlew -q shadowJar)
  (cd "$CONFIRMATION_DIR" && ./gradlew -q shadowJar)
fi

CONSUMER_JAR="$CONSUMER_DIR/target/repair-request-submitted-consumer-1.0-SNAPSHOT.jar"
NOTIFICATION_JAR=$(ls "$NOTIFICATION_DIR"/build/libs/*-all.jar)
CONFIRMATION_JAR=$(ls "$CONFIRMATION_DIR"/build/libs/*-all.jar)

deploy() {
  local name=$1 handler=$2 jar=$3
  if "$AWS_LOCAL" lambda get-function --function-name "$name" > /dev/null 2>&1; then
    echo "[renocar] updating $name"
    "$AWS_LOCAL" lambda update-function-code --function-name "$name" \
      --zip-file "fileb://$jar" > /dev/null
    "$AWS_LOCAL" lambda wait function-updated-v2 --function-name "$name"
    "$AWS_LOCAL" lambda update-function-configuration --function-name "$name" \
      --timeout 60 --memory-size 1024 --environment "$LAMBDA_ENV" > /dev/null
  else
    echo "[renocar] creating $name"
    "$AWS_LOCAL" lambda create-function --function-name "$name" \
      --runtime java21 --handler "$handler" --role "$ROLE_ARN" \
      --timeout 60 --memory-size 1024 \
      --environment "$LAMBDA_ENV" \
      --zip-file "fileb://$jar" > /dev/null
  fi
  "$AWS_LOCAL" lambda wait function-active-v2 --function-name "$name"
  "$AWS_LOCAL" lambda wait function-updated-v2 --function-name "$name"
}

map_stream() {
  local name=$1 stream_arn=$2
  local existing
  existing=$("$AWS_LOCAL" lambda list-event-source-mappings --function-name "$name" \
    --query 'length(EventSourceMappings)' --output text)
  if [[ "$existing" == "0" ]]; then
    echo "[renocar] mapping repair_request stream -> $name"
    "$AWS_LOCAL" lambda create-event-source-mapping --function-name "$name" \
      --event-source-arn "$stream_arn" --starting-position LATEST --batch-size 10 > /dev/null
  fi
}

deploy repair-request-submitted-consumer \
  car.repair.shop.RepairRequestSubmittedHandler "$CONSUMER_JAR"
deploy new-repair-request-notification \
  car.repair.shop.notification.NewRepairRequestSubmittedSnsNotifier "$NOTIFICATION_JAR"
deploy new-repair-request-confirmation-email \
  car.repair.shop.confirmation.NewRepairRequestSubmittedEmailNotifier "$CONFIRMATION_JAR"

STREAM_ARN=$("$AWS_LOCAL" dynamodb describe-table --table-name repair_request \
  --query Table.LatestStreamArn --output text)
map_stream new-repair-request-notification "$STREAM_ARN"
map_stream new-repair-request-confirmation-email "$STREAM_ARN"

echo "[renocar] Lambdas deployed"
