#!/usr/bin/env bash
set -u
URL="${URL:-http://127.0.0.1:5181}"
for f in /src/livehealth/data/useAIPredictions.ts /src/livehealth/screens/dashboard/PredictionsTab.tsx /src/livehealth/styles.css; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" "${URL}${f}")
  echo "$code  $f"
done
