#!/bin/sh
set -eu

PLACEHOLDER="change-me-to-a-long-random-string-at-least-32-chars"

if [ -z "${APP_SECRET:-}" ]; then
  echo "ERROR: APP_SECRET is not set." >&2
  echo "Generate one and pass it in, e.g.:" >&2
  echo "  APP_SECRET=\$(openssl rand -hex 32) docker compose up --build" >&2
  exit 1
fi

if [ "${#APP_SECRET}" -lt 16 ]; then
  echo "ERROR: APP_SECRET must be at least 16 characters (got ${#APP_SECRET})." >&2
  exit 1
fi

if [ "$APP_SECRET" = "$PLACEHOLDER" ] || [ "$APP_SECRET" = "change-me" ]; then
  echo "ERROR: APP_SECRET still uses the insecure example placeholder. Set a unique secret." >&2
  exit 1
fi

if [ -z "${PANEL_PASSWORD:-}" ] && [ -z "${BASIC_AUTH_PASSWORD:-}" ]; then
  echo "WARNING: Panel auth is disabled (PANEL_PASSWORD / BASIC_AUTH_PASSWORD unset)." >&2
  echo "         Fine for localhost; set a password before exposing this on the public internet." >&2
fi

exec "$@"
