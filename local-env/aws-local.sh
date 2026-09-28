#!/bin/bash
# `aws` CLI pinned to LocalStack. Overrides any profile / credentials from ~/.aws, so it can
# never touch the real AWS account. Usage: local-env/aws-local.sh dynamodb scan --table-name repair_request
set -euo pipefail

unset AWS_PROFILE AWS_SESSION_TOKEN
export AWS_ACCESS_KEY_ID=009160054371
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=eu-north-1
export AWS_PAGER=""

exec aws --endpoint-url=http://localhost:4566 "$@"
