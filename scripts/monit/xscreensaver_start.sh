#! /bin/bash
su - ubuntu -c '/usr/bin/xscreensaver -no-splash &'
sleep 1s
echo $(pidof -s xscreensaver) > /tmp/xscreensaver.pid
