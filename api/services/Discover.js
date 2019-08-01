'use strict';
const co = require('co');
const etcd4js = require('etcd4js');
const Redis = require('./Redis');
const uuid = require('node-uuid');
let client = new etcd4js.v2();
const checkInterval = 2 * 60 * 1000;
let me = this;
me.isStart = false;
me.localCabinet = {};

exports.client = client;

exports.setAuth = function(username, password){
  client.setAuth(username, password);
}

let error = (info) => {
  let text = `#### Error In Discover Service: ${info} ####`; 
  sails.log.error(text);
}

let debug = (info) => {
  sails.log.debug(`#### Discover Service : ${info} ####`);
}

let writeToETCD = function(cabinetInfo){
  sails.log.info('#### Discover Service: write to ETCD ####');
  client.set(`cabinet/${cabinetInfo.id}`, JSON.stringify(cabinetInfo))
  .then((suc) => {
    sails.log.info('#### Discover Service:write to ETCD Success####');
  })
  .catch((err) => {
    sails.log.error('将信息写入ETCD失败,30秒后重试');
    sails.log.error(err);
    setTimeout(function(){
      writeToETCD(cabinetInfo);
    }, 30 * 1000);
  })
}
exports.writeToETCD = writeToETCD;
/**
 * 新的check,用于从机检查
 */
exports.checkCluster = function(localCabinet){
  me.localCabinet = localCabinet;
  me.target = null;
  co(function* (){
    let master = yield Cabinet.findOne({isMaster: true});
    if(!localCabinet.remoteToken){
      sails.log.verbose('No etcd remotetoken, generator a new one');
      let remoteToken = uuid.v4(); 
      yield User.create({username: sails.config.cabinet.id, token: remoteToken, isDummy: true});
      yield Cabinet.update({id: localCabinet.id}, {remoteToken: remoteToken});
      localCabinet.remoteToken = remoteToken;
    }
    if(master){
      //Already have master
      me.target = master;
      client.setAuth('root', 'nasetech');
      sails.log.verbose('Already Have master, update key');
      yield client.set(`cabinet/${localCabinet.id}`, JSON.stringify(localCabinet))
      return Promise.resolve('Already have master');
    }else{
      //No master in using
      sails.services.broadcast.announce(localCabinet);
    }
  })
  .catch((err) => {
    if(err.errorCode && err.errorCode == '110'){
      //Auth failed
      sails.log.error('ETCD Auth failed');
    }
    if(typeof err === 'string') { error(err) }
    else{ 
      if(err.errno === 'ECONNREFUSED'){
        sails.log.error(err.message);
        //Restart
        let newEtcdCode = process.pid.toString(16) + Math.random().toString(16).substr(2);
        Cabinet.update({isLocal: true, code: sails.config.cabinet.id}, {etcdCode: newEtcdCode})
        .then((data) => {
          if(data.length > 0){
            sails.services.etcd.startSlave(data[0], me.target);
          }
        })
        .catch((err) => {
          sails.log.error(err);
        })
      }else{
        sails.log.error(err) 
      }
    };
  })
}

exports.getDiscoverList = function(req){
  let result = [];
  let limit = req.query.limit, skip = req.query.skip, sort = req.query.sort;
  return co(function* (){
    let list = yield Redis.smembersAsync('broadcastList');
    let pagData = {};
    if(list.length === 0){
      if(req.headers.pagination){
        return yield Promise.resolve({
          total: 0,
          limit: limit,
          skip: skip,
          data: [] 
        })
      }else{
        return yield Promise.resolve([]); 
      }
    }
    for(let member of list){
      let transfer = JSON.parse(member);
      result.push(transfer);
    }
    if(req.headers.pagination === 'true'){
      let end = Number(skip) + Number(limit);
      if(end > result.length){
        //Slice not include tail
        end = result.length;
      }
      let splitData = result.slice(skip, end);
      pagData = {
        total: result.length,
        limit: limit,
        skip: skip,
        data: splitData 
      }
      return yield Promise.resolve(pagData);
    }else{
      if(skip && limit){
        let end = Number(skip) + Number(limit);
        if(end > result.length){
          end = result.length;
        }
        let splitData = result.slice(skip, end);
        return yield Promise.resolve(splitData);
      }
      return yield Promise.resolve(result);
    };
  })
}