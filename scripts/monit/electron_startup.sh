#!/bin/bash
su - ubuntu -c 'cgexec -g cpu:chromium /home/bitinvo/electron/electron --use-gl=egl --kiosk --touch-devices --touch-events --disable-pinch --overlay-scrollbars --overscroll-history-navigation=0 /home/bitinvo/electron/browser &'
sleep 3s
chown ubuntu /tmp/electron.pid
echo $(pidof '/home/bitinvo/electron/electron --type=zygote --no-sandbox') > /tmp/electron.pid
