#!/bin/bash
# @usage ./configure.sh
if [ ! -f config/cabinet.js ]; then
cp config/cabinet.js.dist config/cabinet.js
fi
cp config/local.js.dist config/local.js
cp .sailsrc.dist.prod .sailsrc
./scripts/fixbcrypt.sh
if [ ! -d ".tmp/public" ]; then
  mkdir -p ".tmp/public"
fi
./scripts/uuid/uuid.sh
./scripts/moveasset.sh
./scripts/apply_conf.sh
sudo ./scripts/remove_trash.sh
sudo cp -f electron/browser_startup /home/ubuntu/browser_startup
sudo ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
sudo crontab scripts/crontab_tasks
node app.js --verbose