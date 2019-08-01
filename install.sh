#!/bin/bash

function install_node {
  echo 'Install Node';
  curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
  sudo apt-get install -y nodejs
}

function install_mysql {
  echo 'Install mysql';
  #sudo apt-get install -y mysql-server-5.6
  sudo apt-get install -y mysql-server
}

#function install_ffmpeg {
#  echo 'Install ffmpeg';
#  sudo apt-get install yasm -y
#  sudo apt-get install libx264-dev -y
#  sudo apt-get install libfaac-dev -y
#  sudo apt-get install libmp3lame-dev -y
#  sudo apt-get install libtheora-dev -y
#  sudo apt-get install libvorbis-dev -y
#  sudo apt-get install libxvidcore-dev -y
#  sudo apt-get install libxext-dev -y
#  sudo apt-get install libxfixes-dev -y
#  wget -c http://ffmpeg.org/releases/ffmpeg-3.1.1.tar.bz2
#  tar -jxvf ffmpeg-3.1.1.tar.bz2
#  cd ffmpeg-3.1.1
#  ./configure
#  make
#  make install
#  cd ..
#}

check_os_version=$(lsb_release -r | grep 14.04);
if [[ -z $check_os_version ]];
then
  echo 'Version is not Ubuntu 14.04';
else
  echo 'Version Check OK';
fi

echo " #### Update OS Repository"
sudo apt-get -y update

echo " #### Install Node"
check_node=$(which node);
if [[ -z $check_node ]];
then
  install_node
else
  echo 'Node Already Installed';
fi

echo " #### Install node"
check_db=$(which mysqld);
if [[ -z $check_db ]];
then
  install_mysql
else
  echo 'DB Already Installed';
fi

echo " #### Install pm2 from npm"
check_pm2=$(which pm2);
if [[ -z $check_pm2 ]];
then
  sudo npm install pm2 -g
else
  echo 'PM2 Already Installed';
fi

echo " #### Install bower from bower"
check_bower=$(which bower);
if [[ -z $check_bower ]];
then
  sudo npm install bower -g
else
  echo 'bower Already Installed';
fi

echo " #### Install redis from npm"
check_redis=$(which redis-server);
if [[ -z $check_redis ]];
then
  sudo apt-get install redis-server -y
else
  echo 'Redis-server Already Installed';
fi

echo " #### Install cgroup"
check_cgroup=$(which cgset);
if [[ -z $check_cgroup ]];
then
  sudo apt-get install cgroup-bin -y
else
  echo 'Cgroup Already Installed';
fi

echo " #### Install monit"
check_monit=$(which monit);
if [[ -z $check_monit ]];
then
  sudo apt-get install monit -y
else
  echo 'Monit Already Installed';
fi
#echo " #### Install ffmpeg"
#check_ffmpeg=$(which ffmpeg);
#if [[ -z $check_ffmpeg ]];
#then
#  install_ffmpeg
#else
#  echo 'ffmpeg Already Installed';
#fi

# uninstall if anything's already there
#GRANT ALL PRIVILEGES ON *.* TO 'username'@'%';
#DROP USER 'username'@'%';
#DROP DATABASE IF EXISTS `tablename`;

# create the user
#CREATE USER 'node'@'%' IDENTIFIED BY '123456';
#CREATE DATABASE IF NOT EXISTS `tablename`;
#GRANT ALL PRIVILEGES ON `tablename` . * TO 'username'@'%';
mysql -uroot -p123456 -e 'CREATE DATABASE `bitinvo` DEFAULT CHARACTER SET utf8;'
mysql -u root -p123456 bitinvo < scripts/bitinvo.sql

npm install --verbose --production
bower install --verbose --production

# refer to https://gist.github.com/firstdoit/6389682
# https://www.digitalocean.com/community/questions/how-can-i-get-node-js-to-listen-on-port-80
# http://serverfault.com/questions/665709/allowing-node-js-applications-to-run-on-port-80
echo "Allow node to run on 80 port"
sudo apt-get install libcap2-bin
sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``

echo " #### Start "
# node app.js --prod --verbose
npm run pm2

#TODO
# pm2 install pm2-logrotate
# pm2 set pm2-logrotate:max_size 1G
# pm2 set pm2-logrotate:interval 1
# pm2 set pm2-logrotate:interval_unit 'DD'
# pm2 set pm2-logrotate:retain 31

exit 0;
