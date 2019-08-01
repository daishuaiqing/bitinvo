'use strict'

const cp = require('child_process');
const os = require('os');
let platform = process.platform;

function getActiveInterface(cb) {
  let cmd = platform === 'linux' ? "netstat -rn | grep UG | awk '{print $NF}'" : "netstat -rn | grep UG | awk '{print $6}'";
  cp.exec(cmd, (err, stdout) => {
    if (err) return cb(err);
    let raw = stdout.toString().trim().split('\n');
    if (!raw) return cb(new Error('No active network interface found.'));
    if (raw.length === 0 || raw[0].length === 0)
      return cb(new Error('No active network interface found.'));

    cb(null, raw[0]);
  })
}

function getPrivateIp(cb) {
  getActiveInterface((err, activeInterface) => {
    if (err) return cb(err);
    let cmd = platform === 'linux' ? `ifconfig ${activeInterface} | grep 'inet addr' | awk '{print $2}'` : `ifconfig ${activeInterface} | grep 'netmask' | awk '{print $2}'`
    cp.exec(cmd, (err, stdout) => {
      if (err) return cb('Get private ip cmd failed');
      let raw = stdout.toString().trim().split('\n');
      if (raw.length === 0 || raw[0].length === 0)
        return cb(new Error('No ip found.'));
      if (platform === 'linux')
        raw[0] = raw[0].split(':')[1];
      cb(null, raw[0]);
    })
  })
}

function getNetworkInfo(cb) {
  let interfaces = [];
  try {
    interfaces = os.networkInterfaces();
  } catch (e) {
    return cb(e);
  }
  for (let devName in interfaces) {
    let iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      let alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        try {
          return cb(null, alias);
        } catch (e) {
          return cb(e)
        }
      }
    }
  }
  return cb(new Error('no active network interface'))
}
module.exports = {
  getActiveInterface: getActiveInterface,
  getPrivateIp: getPrivateIp,
  getNetworkInfo: getNetworkInfo
}
