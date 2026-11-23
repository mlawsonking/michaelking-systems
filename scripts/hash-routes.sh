#!/usr/bin/env bash
# Hash 10 portfolio routes (status + body). Vercel 404 bodies embed a per-request id,
# so that line is stripped from 404 bodies only before hashing. curl UA is used on purpose: middleware.ts
# skips it, so this check never sends Michael a visit notification.
BASE="${1:-https://michaelking.systems}"
for p in / /index.html /index /resume.pdf /styles.css /og.png /favicon.svg /vercel.json /middleware.ts /does-not-exist; do
  code=$(curl -s -A "curl/8 route-hash" -o /tmp/route.body -w "%{http_code}" "$BASE$p")
  if [ "$code" = 404 ]; then h=$(grep -av "::" /tmp/route.body | sha256sum | cut -c1-16); else h=$(sha256sum < /tmp/route.body | cut -c1-16); fi
  echo "$p $code $h"
done
