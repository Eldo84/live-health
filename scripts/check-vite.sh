#!/usr/bin/env bash
# Probe each new LiveHealth+ file through the running Vite dev server.
set -u
URL="${URL:-http://127.0.0.1:5181}"
FILES=(
  /src/livehealth/screens/Landing.tsx
  /src/livehealth/screens/SurveillanceMap.tsx
  /src/livehealth/screens/AnalyticsDashboard.tsx
  /src/livehealth/LiveHealthHost.tsx
  /src/livehealth/styles.css
  /src/livehealth/components/WorldMap.tsx
  /src/livehealth/components/AlertTicker.tsx
  /src/livehealth/data/useLiveOutbreaks.ts
  /src/livehealth/data/useLiveAlerts.ts
  /src/livehealth/data/useLiveRegionRisk.ts
  /src/livehealth/data/useLiveSeries.ts
  /src/livehealth/data/useLiveDiseases.ts
  /src/livehealth/data/useOutbreakCategoriesLive.ts
  /src/livehealth/lib/geometry.ts
)
for f in "${FILES[@]}"; do
  out=$(mktemp)
  code=$(/usr/bin/curl -s -o "$out" -w "%{http_code}" "${URL}${f}")
  echo "$code  $f"
  if [ "$code" != "200" ]; then
    echo '--- response ---'
    head -10 "$out"
    echo '----------------'
  fi
  rm -f "$out"
done
