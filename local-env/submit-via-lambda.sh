#!/bin/bash
# Submits a repair request through the production path: the consumer Lambda (as API Gateway
# would call it). The DynamoDB stream then triggers the notification + confirmation Lambdas.
# Usage: local-env/submit-via-lambda.sh [dto.json]
#   default dto: repair-request-submitted-consumer/src/main/resources/sample-asap.json
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DTO="${1:-$ROOT/car-repair-shop-backend/repair-request-submitted-consumer/src/main/resources/sample-asap.json}"
OUT="$(mktemp)"

# The handler reads the API Gateway proxy event's "body" (a JSON string), not the DTO itself.
EVENT="$(jq -c '{body: (. | tojson)}' "$DTO")"

"$ROOT/local-env/aws-local.sh" lambda invoke --function-name repair-request-submitted-consumer \
  --cli-binary-format raw-in-base64-out --cli-read-timeout 120 \
  --payload "$EVENT" "$OUT" > /dev/null

jq . "$OUT"
rm -f "$OUT"
