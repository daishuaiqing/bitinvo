#!/bin/bash
id=$(ps axw | grep "[ /]pppd call $1" | awk '{print $1}')
if [[ -z $id ]]; 
then
 echo 'no connection' >> /var/log/pptp/retry
 sudo pon bitinvo.nasetech.com
else
 echo 'yes'
fi