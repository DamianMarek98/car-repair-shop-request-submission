#!/bin/bash
# Runs the shop backend on :8080 against local-env (profile `local`: LocalStack + mail sink).
# Alternative: run ShopApplication from the IDE with SPRING_PROFILES_ACTIVE=local.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/car-repair-shop-backend/shop"

# The pom declares no spring-boot-maven-plugin, so call it by full coordinates.
# `clean` because an IDE language server may have left Lombok-less classes in target/.
exec mvn -q clean org.springframework.boot:spring-boot-maven-plugin:3.3.1:run \
  -Dspring-boot.run.profiles=local
