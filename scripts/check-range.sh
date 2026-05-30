#!/usr/bin/env bash
set -u
URL="${URL:-http://127.0.0.1:5181}"
FILES=(
  /src/livehealth/lib/timeRange.ts
  /src/livehealth/data/useLiveOutbreaks.ts
  /src/livehealth/data/useLiveAlerts.ts
  /src/livehealth/screens/SurveillanceMap.tsx
  /src/livehealth/screens/AnalyticsDashboard.tsx
  /src/livehealth/screens/Landing.tsx
)
for f in "${FILES[@]}"; do
  out=$(mktemp)
  code=$(/usr/bin/curl -s -o "$out" -w "%{http_code}" "${URL}${f}")
  echo "$code  $f"
  if [ "$code" != "200" ]; then head -10 "$out"; fi
  rm -f "$out"
done
