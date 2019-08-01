#!/bin/bash
# @usage './remote_depoly_dist.sh 192.168.1.100 /home/ubuntu'
rsync -avz ../bitinvo_dist $1:$2
ssh -t $1 "cd $2/bitinvo_dist && ./extract.sh"