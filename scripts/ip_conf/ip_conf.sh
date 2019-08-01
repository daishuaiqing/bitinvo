#!/bin/bash
function dhcp_conf {
  echo 'dhcp_conf'
  echo $sed_append|bash
  cp -f scripts/ip_conf/interfaces_tmp /etc/network/interfaces
}
function static_conf {
  echo 'static_conf'
  sed -i "s/^.*iface eth0.*/iface eth0 inet static/g" scripts/ip_conf/interfaces_tmp
  sed_address="sed -i '/iface eth0/a $address' scripts/ip_conf/interfaces_tmp"
  sed_netmask="sed -i '/address/a $netmask' scripts/ip_conf/interfaces_tmp"
  sed_gateway="sed -i '/network/a $gateway' scripts/ip_conf/interfaces_tmp"
  sed_network="sed -i '/netmask/a $network' scripts/ip_conf/interfaces_tmp"
  echo $sed_address|bash
  echo $sed_netmask|bash
  echo $sed_network|bash
  echo $sed_gateway|bash
  echo $sed_append|bash
  cp -f scripts/ip_conf/interfaces_tmp /etc/network/interfaces
}
cp scripts/ip_conf/interfaces_temp scripts/ip_conf/interfaces_tmp
hwaddress=$(sed -n '/hwaddress/p' /etc/network/interfaces)
append="\$a $hwaddress"
sed_append="sed -i '${append}' scripts/ip_conf/interfaces_tmp" 
address="address $2"
netmask="netmask $3"
gateway="gateway $4"
network="network $5"
case "$1" in
dhcp) dhcp_conf
;;
static) static_conf
;;
*) echo '未识别的参数'
esac