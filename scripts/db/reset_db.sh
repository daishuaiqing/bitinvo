#!/bin/bash
sudo pm2 delete app
mysql -uroot -p123456 -e 'drop database bitinvo';
mysql -uroot -p123456 -e 'create database bitinvo default character set utf8';
mysql -uroot -p123456 bitinvo -e 'source /home/bitinvo/scripts/distbuild/bitinvo_backup.sql'
cd /home/bitinvo
sudo npm run pm2