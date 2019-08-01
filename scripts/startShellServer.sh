#!/bin/bash
# @usage ./startdeamon.sh
sudo node ./systemctl/shellServer.js &
sleep 1s
echo $! > /tmp/shellServer.pid
chown ubuntu /tmp/shellServer.pid