#!/bin/bash
rsync -avz --delete /home/ssd/mysqldata/ /backup/mysqldata/
rsync -avz --delete /home/ssd/video/ /backup/video/