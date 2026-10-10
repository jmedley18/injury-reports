#!/bin/bash
# Build all icon PNGs: python3 tools/make_icon.py writes icon.svg (+ /tmp/icn variants), then headless Chrome renders them.
set -e
cd /workspace/injury-reports
mkdir -p /tmp/icn && python3 tools/make_icon.py
r(){ cat > /tmp/icn/p.html <<H
<html><body style="margin:0;background:transparent"><img src="file://$1" style="width:$2px;height:$2px;display:block"></body></html>
H
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=$2,$2 --screenshot=$3 file:///tmp/icn/p.html 2>/dev/null; }
r "$PWD/icon.svg" 512 icon-512.png
r "$PWD/icon.svg" 192 icon-192.png
r /tmp/icn/full.svg 180 apple-touch-icon.png
r /tmp/icn/mask.svg 512 icon-maskable-512.png
r /tmp/icn/small.svg 32 favicon.png
