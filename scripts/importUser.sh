#!/bin/bash
#导入用户, ./importUser path-to-userlist.csv
curl -H 'Authorization: Basic MDAwMToxMjM0NTY=' -X POST -F userList=@$1  http://127.0.0.1:1337/system/importcsv