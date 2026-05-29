#!/usr/bin/env bash
set -u
URL="${URL:-http://127.0.0.1:5181}"
for f in /src/livehealth/lib/useTheme.tsx /src/livehealth/components/ThemeToggle.tsx /src/livehealth/LiveHealthHost.tsx /src/livehealth/screens/SurveillanceMap.tsx /src/livehealth/screens/Landing.tsx /src/livehealth/screens/MobileMap.tsx /src/livehealth/screens/MobileLanding.tsx; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" "${URL}${f}")
  echo "$code  $f"
done
