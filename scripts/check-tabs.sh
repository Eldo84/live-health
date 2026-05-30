#!/usr/bin/env bash
set -u
URL="${URL:-http://127.0.0.1:5181}"
FILES=(
  /src/livehealth/screens/dashboard/AnalyticsTab.tsx
  /src/livehealth/screens/dashboard/PredictionsTab.tsx
  /src/livehealth/screens/dashboard/CategoriesTab.tsx
  /src/livehealth/screens/dashboard/HealthIndexTab.tsx
  /src/livehealth/screens/dashboard/DataMgmtTab.tsx
  /src/livehealth/screens/dashboard/TrackingTab.tsx
  /src/livehealth/screens/AnalyticsDashboard.tsx
  /src/livehealth/screens/MobileMap.tsx
  /src/livehealth/screens/Map.tsx
)
for f in "${FILES[@]}"; do
  out=$(mktemp)
  code=$(/usr/bin/curl -s -o "$out" -w "%{http_code}" "${URL}${f}")
  echo "$code  $f"
  if [ "$code" != "200" ]; then head -10 "$out"; fi
  rm -f "$out"
done
