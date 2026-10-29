#!/usr/bin/env bash
# Invoked by cron. Reads CRON_SECRET from the shared env file instead of the
# crontab, so the secret never lands in a world-readable crontab.
set -euo pipefail

ENV_FILE="/var/www/loovimob/shared/.env.production"
CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"

if [ -z "$CRON_SECRET" ]; then
  logger -t loovimob-cron "CRON_SECRET missing in $ENV_FILE"
  exit 1
fi

if ! curl -fsS -m 120 -o /dev/null \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  http://127.0.0.1:3000/api/cron/follow-ups; then
  logger -t loovimob-cron "follow-ups run failed"
  exit 1
fi
