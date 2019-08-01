#!/bin/bash
# function fix_sh{
#   cgroup_boot=$(sed -n '/cgroup/p' /etc/rc.local)
#   if [[ -z $cgroup_boot ]];
#   then
#     sudo sed -i 's/^.*create_cgroup.*/sudo \/home\/ubuntu\/create_cgroups.sh/g' /etc/rc.local
#   else
#     sudo sed -i '/bitinvo_startup/i\sudo \/home\/ubuntu\/create_cgroups.sh' /etc/rc.local
#   fi
#   sudo sed -i 's/^.*cgclassify_task.*/sudo \/home\/ubuntu\/cgclassify_tasks.sh/g' /home/ubuntu/bitinvo_startup
# }

sudo cp -f scripts/logrotate.conf /etc
#sudo service mysql stop
#sudo cp -f scripts/mysql_conf/my.cnf /etc/mysql
#sudo service mysql start
sudo cp -f scripts/logrotate/* /etc/logrotate.d
sudo cp -f scripts/cgroups/* /home/ubuntu
#fix_sh
sudo cp -f scripts/monit/monitrc /etc/monit/monitrc
sudo cp -f scripts/monit/mysql /etc/monit/conf.d
sudo cp -f scripts/monit/redis /etc/monit/conf.d
sudo cp -f scripts/monit/SGSCom /etc/monit/conf.d
sudo cp -f scripts/monit/disk_usage /etc/monit/conf.d
sudo cp -f scripts/monit/electron /etc/monit/conf.d
sudo cp -f scripts/monit/xscreensaver /etc/monit/conf.d
sudo cp -f scripts/monit/shellServer /etc/monit/conf.d
sudo service monit restart
sudo cp -f scripts/bitinvo_startup /home/ubuntu/bitinvo_startup