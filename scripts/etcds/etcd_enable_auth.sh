#!/bin/bash
#./etcd_enable_auth '{"user":"root","password":"password"}' password
curl -X PUT -d $1 http://127.0.0.1:2379/v2/auth/users/root
./etcd/etcdctl --endpoints=http://127.0.0.1:2379 auth enable
./etcd/etcdctl --endpoints=http://127.0.0.1:2379 -u root:$2 role revoke --path=/* --rw guest