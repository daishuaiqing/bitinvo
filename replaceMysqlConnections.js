'use strict'
const filepath = './config/connections.js';
const quickLoginSh = './quickLogin.sh';
const fs = require('fs');
const cp = require('child_process');
let content = require(filepath);
let user = content.connections.prodMainDB.user;
let password = content.connections.prodMainDB.password
function RandomString(length) {
  let str = '';
  for ( ; str.length < length; str += Math.random().toString(36).substr(2) );
  return str.substr(0, length);
}
let newUser = RandomString(5);
let newPassword = RandomString(10);
content.connections.devDB.user = newUser;
content.connections.devDB.password = newPassword;
content.connections.prodMainDB.user = newUser;
content.connections.prodMainDB.password = newPassword;
let createUser = `mysql -uroot -p${password} -e "GRANT ALTER,SELECT,INSERT,UPDATE,DELETE,CREATE ON bitinvo.* TO '${newUser}'@'localhost' IDENTIFIED BY '${newPassword}'"`;
let dropUser = `mysql -uroot -p${password} -e "DROP USER '${user}'@'localhost'"`;
let changeRootPwd = `mysqladmin -uroot -p${password} password '${newPassword}'`;
let quickLogin = `#!/bin/bash \nmysql -u${newUser} -p${newPassword} bitinvo`;
let chmod = `chmod 755 ${quickLoginSh}`;
cp.exec(createUser, (err, stdout) => {
  if(err){
    console.log(err)
  }else{
    if(user !== 'root'){
      cp.exec(dropUser, (err, stdout) => {
        if(err) console.log(err);
      })
    }
    cp.exec(changeRootPwd, (err, stdout) => {
      if(err) console.log(err);
    })
    fs.writeFile(filepath, "module.exports.connections = " + JSON.stringify(content.connections) ,'utf8', (err) => {
      if(err) console.log(err);
    })
    fs.writeFile(quickLoginSh, quickLogin, 'utf8', (err) => {
      if(err) console.log(err);
      cp.exec(chmod, (err, stdout) => {
        if(err) console.log(err);
      })
    })
  }
})