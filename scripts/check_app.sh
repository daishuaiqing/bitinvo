#!/bin/bash
echo " #### Install monit"
check_monit=$(which monit)
if [[ -z $check_monit ]];
then
  sudo cp -f /home/ssd/bitinvo/deb/monit_1%3a5.6-2_armhf.deb /var/cache/apt/archives/
  sudo apt-get install monit -y
else
  echo 'Monit Already Installed';
fi

echo " #### Install cgroup"
check_cgroup=$(which cgset);
if [[ -z $check_cgroup ]];
then
  sudo cp -f /home/ssd/bitinvo/deb/cgroup-bin_0.38-1ubuntu2_armhf.deb /var/cache/apt/archives/
  sudo apt-get install cgroup-bin -y
else
  echo 'Cgroup Already Installed';
fi