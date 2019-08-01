#!/bin/bash
#作为发现服务启动 ./etcd_master.sh ip 
export ETCD_UNSUPPORTED_ARCH=arm
./etcd/etcd \
  --name=default \
  --listen-client-urls=http://$1:8379,http://127.0.0.1:8379 \
  --advertise-client-urls=http://$1:8379,http://127.0.0.1:8379 \
  --listen-peer-urls=http://0.0.0.0:8380 \
  --initial-advertise-peer-urls=http://$1:8380 \
  --data-dir /tmp/default.etcd \
  --initial-cluster=default=http://$1:8380 \
  --initial-cluster-token='discovery' \
  --initial-cluster-state='new' > /var/log/etcd_server.log 2>&1 &