#!/bin/bash
function clean_database {
  mysql -uroot -p123456 -e 'drop database bitinvo';
  mysql -uroot -p123456 -e 'create database bitinvo default character set utf8';
  mysql -uroot -p123456 bitinvo -e 'source /home/ubuntu/bitinvo_dist/bitinvo_backup.sql'
}
sudo mkdir /home/bitinvo
sudo chown -R ubuntu /home/bitinvo
sudo pm2 delete all
sudo killall -9 electron
sudo killall -9 electron
sudo rm -rf /home/bitinvo/api/hooks
sudo rm -rf /home/bitinvo/www
cd /home/ubuntu/bitinvo_dist
cp -f /home/bitinvo/config/cabinet.js ./
cp -f /home/bitinvo/config/connections.js ./
tar zxvmf bitinvo.tar.gz -C /home
cp -f cabinet.js /home/bitinvo/config
cp -f connections.js /home/bitinvo/config
cd /home/bitinvo
echo '是否清理数据库?若是第一次安装请选择是 (Y/N)'
while true
do
read cd
case "$cd" in
Y) clean_database
   break;;
N) echo '未清理数据库，继续'
   mysql -uroot -p123456 bitinvo -e 'source ./scripts/db/auto_incr.sql'
   #增加数据库Gun表字段
   mysql -uroot -p123456 bitinvo -e 'alter table gun add column associatedGun varchar(255)';
   mysql -uroot -p123456 bitinvo -e 'alter table gun add column associatedBulletModule varchar(255)';
   break;;
*) echo '请输入 Y/N';;
esac
done
./scripts/uuid/uuid.sh
sudo ./scripts/remove_trash.sh
sudo cp -f scripts/browser_startup /home/ubuntu/browser_startup
sudo ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
sudo crontab scripts/crontab_tasks
rm -rf /home/ubuntu/bitinvo_dist
cd /home/bitinvo
sudo npm run pm2

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

sudo chown -R ubuntu /home/bitinvo