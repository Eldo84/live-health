#!/usr/bin/env bash
set -u
URL="${URL:-http://127.0.0.1:5181}"
for f in /src/livehealth/components/Modal.tsx /src/livehealth/components/AddAlertDialog.tsx /src/livehealth/components/FeedbackDialog.tsx /src/livehealth/components/DiseaseRecommendationsDialog.tsx /src/livehealth/components/HeaderUser.tsx /src/livehealth/screens/SurveillanceMap.tsx; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" "${URL}${f}")
  echo "$code  $f"
done
