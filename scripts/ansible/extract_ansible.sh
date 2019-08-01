#!/bin/bash
function clean_database {
  mysql -uroot -p123456 -e 'drop database bitinvo';
  mysql -uroot -p123456 -e 'create database bitinvo';
  mysql -uroot -p123456 bitinvo -e 'source /home/ubuntu/bitinvo_dist/bitinvo_backup.sql'
}
sudo mkdir /home/bitinvo
sudo chown -R ubuntu /home/bitinvo
sudo pm2 delete all
sudo killall -9 electron
sudo killall -9 electron
sudo rm -rf /home/bitinvo/api/hooks
sudo rm -rf /home/bitinvo/node_modules/bitinvo-fifo
cd /home/ubuntu/bitinvo_dist
cp -f /home/bitinvo/config/cabinet.js ./
cp -f /home/bitinvo/config/connections.js ./
tar zxvmf bitinvo.tar.gz -C /home
cp -f cabinet.js /home/bitinvo/config
cp -f connections.js /home/bitinvo/config
cd /home/bitinvo
./scripts/apply_conf.sh
if [ -n "$1" ];then
 clean_database
 ./scripts/uuid/uuid.sh clean
fi
#增加数据库Gun表字段
mysql -uroot -p123456 bitinvo -e 'alter table gun add column associatedGun varchar(255)'
mysql -uroot -p123456 bitinvo -e 'alter table gun add column associatedBulletModule varchar(255)';
sudo ./scripts/remove_trash.sh
sudo cp -f electron/browser_startup /home/ubuntu/browser_startup
sudo ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
sudo crontab scripts/crontab_tasks
sudo chown -R ubuntu /home/bitinvo
redis-cli flushall
sudo npm run pm2prod
while true;
do
r=$( netstat -lnt | grep 1337)
echo "test connection"
if [[ -z "$r" ]];
then
sleep 1s
else
break
fi
done
echo "service up"