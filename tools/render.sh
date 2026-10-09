#!/bin/bash
# render icon.svg to PNGs with headless chrome
cd /workspace/injury-reports
for s in 512 192 180 32; do
  cat > /tmp/ic.html <<H
<html><body style="margin:0;background:transparent"><img src="file:///workspace/injury-reports/icon.svg" style="width:${s}px;height:${s}px;display:block"></body></html>
H
  google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=$s,$s --screenshot=/tmp/ic_$s.png file:///tmp/ic.html 2>/dev/null
done
cp /tmp/ic_512.png icon-512.png; cp /tmp/ic_192.png icon-192.png; cp /tmp/ic_180.png apple-touch-icon.png; cp /tmp/ic_32.png favicon.png
