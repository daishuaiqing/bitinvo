#!/bin/bash
# According to https://help.ubuntu.com/community/BackupYourSystem/TAR
# and https://wiki.archlinux.org/index.php/full_system_backup_with_rsync
# or http://www.thegeekstuff.com/2010/10/dd-command-examples/
# or http://www.linuxnix.com/what-you-should-know-about-linux-dd-command/
folder=/home/ssd/backup
mkdir -p $folder
#rsync -aAXv --exclude={"/dev/*","/proc/*","/sys/*","/tmp/*","/run/*","/mnt/*","/media/*","/lost+found"} / /home/ssd/backup
file_name=$folder/$(date +"%Y_%m_%d_%H%M%S")_backup.tar.bz2
tar -cvpjf $file_name  \
--exclude="${folder}" \
--exclude=/dev  \
--exclude=/proc \
--exclude=/tmp  \
--exclude=/run  \
--exclude=/mnt  \
--exclude=/media  \
--exclude=/lost+found \
--exclude=/home/*/.thumbnails \
--exclude=/home/*/.cache/mozilla \
--exclude=/home/*/.cache/chromium \
--exclude=/home/*/.local/share/Trash \
--exclude=/home/*/.thumbnails \
/