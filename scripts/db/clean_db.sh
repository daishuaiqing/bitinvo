#!/bin/bash
mysql -uroot -p123456 bitinvo -e 'source clean_db.sql'
mysql -uroot -p123456 bitinvo -e 'source auto_incr.sql'
sudo rm -rf /home/ssd/video/