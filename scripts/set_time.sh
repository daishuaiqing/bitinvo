#!/bin/bash
# "date"
killall xscreensaver -9
date -s $1
su - ubuntu -c 'xscreensaver -no-splash &'
sleep 1s
echo $(pidof -s xscreensaver) > /tmp/xscreensaver.pid
service monit restart