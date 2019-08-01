#!/bin/bash
mysql -uroot -p123456 bitinvo -e 'delete from cabinet where isLocal=true';
sudo pm2 restart app;
