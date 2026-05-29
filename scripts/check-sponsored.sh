#!/usr/bin/env bash
set -u
URL="${URL:-http://127.0.0.1:5181}"
FILES=(
  /src/livehealth/data/useLiveSponsored.ts
  /src/livehealth/components/AdCard.tsx
  /src/livehealth/screens/Landing.tsx
  /src/livehealth/screens/SurveillanceMap.tsx
  /src/livehealth/screens/AnalyticsDashboard.tsx
)
for f in "${FILES[@]}"; do
  out=$(mktemp)
  code=$(/usr/bin/curl -s -o "$out" -w "%{http_code}" "${URL}${f}")
  echo "$code  $f"
  if [ "$code" != "200" ]; then head -10 "$out"; fi
  rm -f "$out"
done
