'use strict';
const shellProxy = require('./ShellProxy');
const Promise = require('bluebird');
let me = this;
//TimeOut用以自动启动重启
me.timeout = null;
exports.getRTCTime = function(){
  var onCompleteUpdate = function(message, log){
    sails.log.debug('RTC Manage Sucess,Start Update OS Time');
    shellProxy.setOSTime(message.RTCDate);//不知道返回格式，先用new Date()代替
  };
  var onError = function(err){
    sails.log.error('System Config Service Error:')
    sails.log.error(err);
  };
  sails.services.fifoclient.sendFifoMessage('getRTC',{},onCompleteUpdate,onError);
};

exports.setRTCTime = function(datetime){
  shellProxy.setOSTime(datetime);
};

exports.setIp = function(ip){
  if(ip){
    Cabinet.update({code: sails.config.cabinet.id}, {host: ip})
    .exec((err, suc) => {
      if(err) sails.log.error;
      else sails.log.debug('update cabinet success');
    })
    Promise.all([
      System.findOne({key: 'netmask'}),
      System.findOne({key: 'gateway'})
    ]).spread((netmask, gateway) => {
      let mask, gw;
      if(netmask){
        mask = netmask.value;
      }else{
        sails.log.info('no DB netmask so using 255.255.255.0');
        mask = '255.255.255.0';
      }
      if(gateway){
        gw = gateway.value;
      }else{
        sails.log.info('no DB netmask so using ip default');
        let local = ip.split('.');
        local.pop();
        local.push('1');
        local = local.join('.')
        gw = local;
      }
      shellProxy.setIp(ip, mask, gw)
    });
  }else{
    sails.log.error('No Incoming Ip');
  }
  
};

exports.setProductId = function () {
  let random = Math.random().toString().substr(2, 11); //先以11位随机数代替productId
  System.update({key: 'productId'}, {value: random}).then((data)=>{
    sails.log.debug('Insert productId success!');
  }).catch((err)=>{
    sails.log.debug('Insert productId failed!');
    sails.log.error(err);
    return;
  })
}

exports.sendRestartInfo = () => {
  let msg = '系统将在2分钟后重启', topic='user.message', channel='both';
  let onConfirmAPI='/system/restart/confirm', onCancelAPI='/system/restart/delay', onConfirmRedirect='',onCancelRedirect='', confirmText='立即重启', cancelText='延后一分钟';//测试用
  sails.log.debug('----time to restartSystem----');
  sails.services.message.all(msg, topic, channel, onConfirmAPI, onCancelAPI, onConfirmRedirect, onCancelRedirect, confirmText, cancelText);
  sails.log.debug('Set Auto Restart Timeout');
  me.timeout = setTimeout(function(){
    sails.services.shellproxy.systemRestart();
  }, 2 * 60 * 1000);//提示窗的时间只有两分钟 所以先这么设置
};

exports.parseRestart = (type, time) => {
  let dateTime;
  sails.log.debug(type, time,'-----------------------------')
  switch(type){
    case '按每月':
    if (time.length !== 8){
      return Promise.reject('Invalid Length');
    }
    let arr1 = time.split(' ');
    let arr2 = arr1[1].split(':');
    let obj = {
      date: arr1[0],
      hour: arr2[0],
      minute: arr2[1],
      second: 0 
    }
    dateTime = obj;
    sails.log.debug(dateTime,'---the restart time---');//调试
    break;
    case '按星期':
    if (time.length !== 7){
      return Promise.reject('Invalid Length');
    }
    let arr3 = time.split(' ');
    let arr4 = arr3[1].split(':');
    let obj1 = {
      dayOfWeek: Number(arr3[0]) === 7 ? 0 : arr3[0],
      hour: arr4[0],
      minute: arr4[1],
      second: 0
    }
    dateTime = obj1;
    sails.log.debug(dateTime,'---the restart time---');//调试
    break;
    case '按天':
      if(time.length !== 5){
        return Promise.reject('Invalid Length');
      }
      let arr5 = time.split(':');
      let obj2 = {
        hour: arr5[0],
        minute: arr5[1],
        second: 0
      }
      dateTime = obj2;
      sails.log.debug(dateTime,'---the restart time---');//调试
    break;
    default: return Promise.reject('No Invalid Type Or Time');
  }
  return Promise.resolve(dateTime);
};

exports.cleanRestart = () => {
  sails.log.debug('Clear Restart Timeout');
  clearTimeout(me.timeout);
}