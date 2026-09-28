#!/bin/bash
# Starts LocalStack + mail sink, waits for the init hook to create resources, deploys the Lambdas.
# Pass --skip-build to deploy already-built Lambda jars.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

docker compose -f "$DIR/docker-compose.yml" up -d

echo "[renocar] waiting for LocalStack resources..."
for _ in $(seq 1 90); do
  if docker logs renocar-localstack 2>&1 | grep -q "resources ready"; then
    break
  fi
  sleep 2
done
if ! docker logs renocar-localstack 2>&1 | grep -q "resources ready"; then
  echo "[renocar] LocalStack init did not finish - check: docker logs renocar-localstack" >&2
  exit 1
fi

"$DIR/deploy-lambdas.sh" "$@"

cat <<'EOF'

[renocar] local environment ready
  shop backend      npm run local:shop            -> http://localhost:8080
  client form       npm run local:submission-portal -> http://localhost:4200
  admin portal      npm run local:admin-portal    -> http://localhost:4201  (renocar / 12345)
  captured e-mails  http://localhost:8025
EOF
