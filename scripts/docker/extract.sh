#!/bin/bash
function clean_database {
  mysql -uroot -p123456 -e 'drop database bitinvo';
  mysql -uroot -p123456 -e 'create database bitinvo default character set utf8';
  mysql -uroot -p123456 bitinvo -e 'source /home/ubuntu/bitinvo_docker/bitinvo_backup.sql'
}
sudo mkdir /home/bitinvo
sudo chown -R ubuntu /home/bitinvo
sudo pm2 delete all
sudo rm -rf /home/bitinvo/api/hooks
sudo rm -rf /home/bitinvo/node_modules/bitinvo-fifo
cd /home/ubuntu/bitinvo_docker
cp -f /home/bitinvo/config/cabinet.js ./
cp -f /home/bitinvo/config/connections.js ./
tar zxvmf bitinvo.tar.gz -C /home
cp -f cabinet.js /home/bitinvo/config
cp -f connections.js /home/bitinvo/config
cd /home/bitinvo
clean_database
./scripts/uuid/uuid.sh default
sudo ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
cd /home/bitinvo
sudo pm2 start apps.json

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
exit 0