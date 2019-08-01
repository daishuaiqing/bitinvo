#!/bin/bash
tar cvf www.tar www
scp -r www.tar $1:/home/ubuntu
ssh -t $1 "tar xvfm www.tar -C /home/bitinvo && rm www.tar && sudo reboot"