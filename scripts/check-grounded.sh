#!/usr/bin/env bash
set -u
URL="${URL:-http://127.0.0.1:5181}"
for f in /src/livehealth/data/useGroundedForecasts.ts /src/livehealth/screens/dashboard/PredictionsTab.tsx; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" "${URL}${f}")
  echo "$code  $f"
done
