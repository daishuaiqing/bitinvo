#!/bin/bash
sudo killall -9 SGSCom
cd /home/SGSCom
sudo ./SGSCom >/dev/null 2>&1 &
sudo pm2 restart app