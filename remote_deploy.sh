#!/bin/bash
# @usage go to bitinvo foler and run ./remote_deploy.sh ubuntu@192.168.1.79 /home/ssd
echo 'Remote deploy code to '$1:$2
./rsync.sh $1:$2
echo 'Run Configuring remotely '
ssh -t $1 "cd $2/bitinvo && ./configure.sh"
echo "配置数据库自增属性"
ssh $1 "cd $2/bitinvo && mysql -uroot -p123456 bitinvo < scripts/db/auto_incr.sql"
echo "Done, Thank you"