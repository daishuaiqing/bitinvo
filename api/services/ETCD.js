'use strict';
const co = require('co');
const shellProxy = require('./ShellProxy');
const Redis = require('./Redis');
const client = require('./Discover').client;
const checkInterval = 2 * 60 * 1000;
let me = this;
me.isStart = false;

let initMaster = function(localCabinet){
  client.set(`cabinet/${localCabinet.id}`, JSON.stringify(localCabinet))
  .then((suc) => {
    sails.log.debug('$$$$$ Set default success $$$$$');
  })
  .catch((err) => {
    if(err.errorCode && err.errorCode == '110'){
      sails.log.info('Auth failed');  
    }else{
      sails.log.error(err);
    }
  })
}
exports.initMaster = initMaster;

let startMaster = function(localCabinet){
  sails.log.info('ETCD Service start master');
  co(function* (){
    //Check etcd code is saved
    try{
      let result = yield client.get('cabinet');
      me.isStart = true;
    }catch(err){
      sails.log.error(err);
      if(err.errorCode && err.errorCode == '100'){
        sails.log.error('Cabinet key not exist');  
        me.isStart = true;
      }
      if(err.errno === 'ECONNREFUSED'){
        me.isStart = false;
      }
    }
    sails.services.discover.setAuth('root', 'nasetech');
    if(me.isStart){
      sails.log.info('Already Started');
      return;
    }
    let etcdCode = process.pid.toString(16) + Math.random().toString(16).substr(2),
    localIp = localCabinet.host;
    sails.log.info(`New Etcd Code ${etcdCode}`);
    let updated = yield Cabinet.update({id: localCabinet.id}, {etcdCode: etcdCode});
    let clusterSizeRecord = yield System.findOne({key: 'clusterSize'});
    let clusterSize = 1;
    if(!clusterSizeRecord){
      sails.log.verbose('No cluster size config')
    }else{
      clusterSize = clusterSizeRecord.value;
    }
    //Start discovery service and start member
    setTimeout(function(){
      shellProxy.etcdDiscoverServer(localIp); 
    }, 100)
    setTimeout(function(){
      shellProxy.etcdGenToken(etcdCode, clusterSize);
    }, 1000)
    setTimeout(function(){
      shellProxy.etcdMember(etcdCode, localIp, localIp, etcdCode);
    }, 2100)

    // setTimeout(function(){
    //   shellProxy.etcdEnableAuth('nasetech');//Test pwd
    // }, 2000)
    //Set auth, Init master
   
  })
  .catch((err) => {
    sails.log.error('Error in start master');
    sails.log.error(err);
  })
  setTimeout(function(){
    initMaster(localCabinet);
  }, 5000)
}
exports.startMaster = startMaster;

/**
 * 用于检查从机是否需要启动ETCD
 */

let startSlave = function(local, target){
  if(me.isStart){
    sails.log.verbose('ETCD already started');
    sails.services.discover.writeToETCD(local);
  }else{
    sails.log.verbose('ETCD not started');
    co(function* (){
      let res = yield sails.services.network.proxy(`http://${target.host}:${target.port}/cabinet/refreshETCDCode`, 'GET')
      if(typeof res.body.code !== 'undefined'){
        yield Cabinet.update({id: target.id}, {etcdCode: res.body.code});
        sails.services.shellproxy.etcdMember(local.etcdCode, local.host, target.host, res.body.code); 
        setTimeout(function(){
          sails.services.discover.writeToETCD(local);
        }, 2 * 1000);
        return yield Promise.resolve('Finish');
      }else{
        return yield Promise.reject('更新失败');
      }
    })
    .then((data) => {
      me.isStart = true;
      sails.log.info('Slave ETCD start success')
    })
    .catch((err) => {
      sails.log.error(err);
      sails.log.error('更新etcdcode本体错误, 15秒后重试');
      setTimeout(function(){
        startSlave(local, target);
      }, 15 * 1000);
    })
  }
}
exports.startSlave = startSlave;

function stopEtcd(){
  sails.services.shellproxy.stopEtcd();
  try{
    sails.services.broadcast.close();
    sails.services.broadcast.open();
  }catch(err){
    sails.log.error(`#### ETCD service : stop broadcast error : ${err} ####`)
  }
  Redis.del('broadcastList', (err, rs) => {
    if(err){
      sails.log.error(`#### ETCD service error : ${err} ####`);
    }
  })
}
function check(){
  co(function* (){
    let length = yield Redis.scardAsync('broadcastList');
    if(length === 0){
      return yield Promise.resolve('No cabinet');
    }
    //Notice user that new cabinet wanna join
    sails.services.message.all('有待确认的柜机组网请求', 'user.message', 'both');
  }) 
  .catch((err) => {
    sails.log.error(err);
  })
}
exports.setMaster = function(){
  co(function* (){
    try{
      stopEtcd();
      let localCabinet = yield Cabinet.findOne({isLocal: true});
      //As Master
      sails.services.etcd.startMaster(localCabinet);
      //Start listening
      sails.services.broadcast.announce(localCabinet);
      setInterval(check, checkInterval);
    }catch(err){
      return yield Promise.reject(err);
    }
  }).catch((err) => {
    sails.log.error(`#### ETCD service setMaster error : ${err}`)
  })
}

exports.setSlave = function(){
  co(function* (){
    try{
      stopEtcd();
      let localCabinet = yield Cabinet.findOne({isLocal: true});
      sails.services.discover.checkCluster(localCabinet);
    }catch(err){
      return yield Promise.reject(err);
    }
  }).catch((err) => {
    sails.log.error(`#### ETCD service setSlave error : ${err}`)
  })
}

exports.requestNewToken = function(target, master){
  let url = `http://${target.host}:${target.port}/remote/requestNewToken`;
  sails.services.network.proxy(url, 'POST', {masterInfo: master})
  .then((res) => {
    if(res.body.token){
      return Cabinet.update({code: target.code}, {remoteToken: req.body.token})
      .then((res) => {
        sails.log.info('success');
      })
    }else{
      sails.log.error('Request Token Failed');
    }
  })
  .catch((err) => {
    if(err.body){
      sails.log.error('Error in request new token');
      sails.log.error(err.body);
    }else{
      sails.log.error('Server error in request new token');
      sails.log.error(err);
    }
  })
}


