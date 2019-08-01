#!/bin/bash
sudo mv /home/SGSCom/HubPowerOff /home/SGSCom/HubPowerOff_backup
sudo rm -rf /home/bitinvo/node_modules
cd /tmp/bitinvo_dist
cp -f /home/bitinvo/config/cabinet.js ./
tar zxvmf bitinvo.tar.gz -C /home
cp -f cabinet.js /home/bitinvo/config
cd /home/bitinvo
./scripts/apply_conf.sh
sudo ./scripts/remove_trash.sh
sudo cp -f electron/browser_startup /home/ubuntu/browser_startup
sudo ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
sudo crontab scripts/crontab_tasks
mysql -uroot -p123456 bitinvo -e 'source ./scripts/db/auto_incr.sql'
rm -rf /tmp/bitinvo_dist
rm /tmp/*.des3
sudo chown -R ubuntu /home/bitinvo
sudo npm run pm2prod

while true;
do

r=$( netstat -lnt | grep 1337)
echo "test connection"
if [[ -z "$r" ]];
then
echo "sleep 1s"
sleep 1s
else
break
fi
done

echo "service up"

sudo mv /home/SGSCom/HubPowerOff_backup /home/SGSCom/HubPowerOff
sudo reboot