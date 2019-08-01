#!/bin/bash
# @usage './remote_depoly_dist.sh 192.168.1.100 5600 '
scp -P $2 -r ../bitinvo_docker $1:/home/ubuntu
ssh -p $2 -t $1 "cd /home/ubuntu/bitinvo_docker && ./extract.sh"