#!/bin/bash
function edit_interfaces {
	echo '请输入新的mac地址：'
	read hwaddress
	hwline="        hwaddress ether $hwaddress"
	sed -i "s/^.*hwaddres.*/$hwline/g" interfaces
	confirm
}

function confirm {
	echo 'interfaces文件内容将被修改为如下所示：'
	echo -e \\n
	cat interfaces
	echo -e \\n
	echo '确认修改？（Y/N）'
	while true
	do
	read confirm_YN
	case "$confirm_YN" in
	Y) sudo cp -r -f interfaces /etc/network/interfaces
	   echo '修改完成'
	   break;;
	N) echo '未修改interface文件，结束'
	   break;;
	*) echo '请输入 Y/N';;
	esac
	done
}

echo '-----------MacEditor-------------'
echo '当前/etc/network/interfaces文件：'
echo -e \\n
cat /etc/network/interfaces
#sudo cp -r interfaces /etc/network/interfaces
echo -e \\n
echo '是否写入新的mac地址？（Y/N）'
while true
do
read YN
case "$YN" in
Y) edit_interfaces
   break;;
N) echo '未修改interface文件，结束'
   break;;
*) echo '请输入 Y/N';;
esac
done
exit 0

