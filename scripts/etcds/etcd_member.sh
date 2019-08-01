#!/bin/bash
#作为主机启动 ./etcd_master.sh name ip discoverIp token
export ETCD_UNSUPPORTED_ARCH=arm
./etcd/etcd \
  --name=$1 \
  --listen-client-urls=http://$2:2379,http://127.0.0.1:2379 \
  --advertise-client-urls=http://$2:2379 \
  --listen-peer-urls=http://$2:2380 \
  --initial-advertise-peer-urls=http://$2:2380 \
  --data-dir /tmp/$1.etcd \
  --discovery http://$3:8379/v2/keys/discovery/$4 > /var/log/etcd.log 2>&1 &