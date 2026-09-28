#!/bin/bash
# Runs inside LocalStack once it is ready. Creates every resource the platform needs.
# LocalStack is ephemeral, so this runs on each start against an empty state.
set -euo pipefail

# A 12-digit access key becomes the account id, so ARNs match production
# (the notification Lambda hardcodes arn:aws:sns:eu-north-1:009160054371:...).
export AWS_ACCESS_KEY_ID=009160054371
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=eu-north-1

echo "[renocar] creating Lambda role"
# Event source mappings assume the function's role to read the stream; without the role the
# poller falls back to the default account and never finds the repair_request stream.
awslocal iam create-role --role-name local-lambda \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
  > /dev/null

echo "[renocar] creating DynamoDB tables"
# Mirrors @DynamoDBTable RepairRequest: hash key id, GSI SubmittedAtIndex (listing sorted by date),
# stream for the two stream Lambdas (production streams NEW_IMAGE at least; both images is a superset).
awslocal dynamodb create-table \
  --table-name repair_request \
  --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=dummyPartitionKey,AttributeType=S \
      AttributeName=submittedAt,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{
      "IndexName": "SubmittedAtIndex",
      "KeySchema": [
        {"AttributeName": "dummyPartitionKey", "KeyType": "HASH"},
        {"AttributeName": "submittedAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }]' \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  > /dev/null

awslocal dynamodb create-table \
  --table-name unavailable_day \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  > /dev/null

# No SES setup: shop and the confirmation Lambda use SES v2, which LocalStack community does
# not emulate - their e-mails go to the mail-sink container instead (http://localhost:8025).

echo "[renocar] creating SNS topic + inspection queue"
TOPIC_ARN=$(awslocal sns create-topic --name NewRepairRequestSubmittedTopic --query TopicArn --output text)
QUEUE_URL=$(awslocal sqs create-queue --queue-name local-notifications --query QueueUrl --output text)
QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)
awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$QUEUE_ARN" \
  --attributes RawMessageDelivery=true > /dev/null

echo "[renocar] resources ready - now run local-env/deploy-lambdas.sh"
