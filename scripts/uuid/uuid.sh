#!/bin/bash
function generate_uuid {
  cp config/cabinet.js.dist config/cabinet.js
  uuid=$(node scripts/uuid/uuid.js)
  id="  id: '$uuid',"
  sed -i "s/^.*id:.*/$id/g" config/cabinet.js
  echo '新的uid '$uuid
}
echo '当前uid：'
sed -n 6p config/cabinet.js
if [ -n "$1" ];then
 generate_uuid
else
echo '是否生成新的uid?若是第一次安装请重新生成 (Y/N)'
while true
do
read keypress
case "$keypress" in
Y) generate_uuid
   break;;
N) echo '未修改uid，继续'
   break;;
*) echo '请输入 Y/N';;
esac
done
fi