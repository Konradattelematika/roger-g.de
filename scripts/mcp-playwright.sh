#!/usr/bin/env bash
# Startet den Playwright-MCP mit dem lokalen Chromium (Libs ohne root unter ~/chrome-libs).
# Wird von .mcp.json aufgerufen – nicht direkt nutzen, außer zum Debuggen.
set -euo pipefail
source "$(dirname "$0")/env.sh"
exec npx @playwright/mcp@latest \
  --browser chromium \
  --executable-path "$CHROME_PATH" \
  --headless \
  --no-sandbox \
  "$@"
