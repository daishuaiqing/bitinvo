#! /bin/bash
cgcreate -a ubuntu:ubuntu -t ubuntu:ubuntu -g cpu:chromium
cgset -r cpu.cfs_quota_us=150000 chromium
cgcreate -a ubuntu:ubuntu -t ubuntu:ubuntu -g cpu:node
cgset -r cpu.cfs_quota_us=100000 node
cgcreate -a ubuntu:ubuntu -t ubuntu:ubuntu -g cpu:SGSCom
cgset -r cpu.cfs_quota_us=100000 SGSCom
cgcreate -a ubuntu:ubuntu -t ubuntu:ubuntu -g cpu:mysql
cgset -r cpu.cfs_quota_us=100000 mysql
cgcreate -a ubuntu:ubuntu -t ubuntu:ubuntu -g cpu:camera
cgset -r cpu.cfs_quota_us=50000 camera