#!/bin/bash

echo " #### Install ntp ####"
check_lib=$(dpkg -l | grep libopts25);
rm /etc/ntp.conf
if [[ -z $check_lib ]];
then
  dpkg -i ./deb/libopts25_1%3a5.18-2ubuntu2_armhf.deb
else
  echo 'Libopts25 Already Installed';
fi
if [ -f "/etc/init.d/ntp" ]; then
  echo 'Ntp Already Installed';
else
  dpkg -i ./deb/ntp_1%3a4.2.6.p5+dfsg-3ubuntu2.14.04.10_armhf.deb
fi
cp ./scripts/ntp/ntp.conf /etc/ntp.conf
service ntp restart