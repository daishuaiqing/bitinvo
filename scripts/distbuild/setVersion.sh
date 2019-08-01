#!/bin/bash
function readVersion {
  read -p "输入当前版本号 : " version
  read -p "确认当前版本号 : $version (y/n) " ack
  case $ack in
    y) versionCode='"tag":"'$version'"',;;
    n) readVersion;;
    *) readVersion;;
  esac
}
echo '是否重新生成版本数据 (y/n)'
while true
do
read cd
case "$cd" in
y) cp _version.json version.json 
   readVersion;
   getGitCommit=`git rev-parse HEAD`;
   commit='"commit":"'$getGitCommit'"';
   getBuildTime=`date '+%Y-%m-%d, %H:%M:%S'`;
   buildTime='"buildTime":"'$getBuildTime'"';
   sed -i "" "s/^.*tag.*/$versionCode/g" version.json
   sed -i "" "s/^.*commit.*/$commit/g" version.json
   sed -i "" "s/^.*buildTime.*/$buildTime/g" version.json
   break;;
n) break;;
*) echo '请输入 y/n';;
esac
done
