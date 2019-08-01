'use strict';
let me = this;
const request = require('request');
const _ = require('lodash');
const co = require('co');
const crypto = require('crypto');
const Client = require('./Discover').client;
const syncRequest = require('./Sync/request');
me.sync = null;
me.syncQueue = [];

const fullTable = [
  'GunType','Role','BulletType', 'DutyShift', 'user', 'passport', 'applicationtype'
];
let ObjKeySort = function(obj){
  let keys = Object.keys(obj).sort();
  let result = {};
  for(let key of keys){
    result[key] = obj[key];
  }
  return result;
}

/**
 * 纯计算chksum
 * @param {*} item 
 */
const pureSign = function(item){
  let record = Object.assign({}, item); 
  if(!record.version) record.version = 1;
  let oldVersion = record.version.toString();
  if(record.activeConnections) { delete record.activeConnections };
  if(record.roles) {delete record.roles};
  if(record.approvers) {delete record.approvers};
  if(record.processList) {delete record.processList};
  if(record.application && typeof record.application == 'object') { record.application = record.application.id };
  if(record.guns || record.guns === null) {delete record.guns};
  if(record.token) {delete record.token};
  if(typeof record.age !== 'undefined' && typeof record.age === 'string'){
    record.age = Number(record.age);
  }
  record = Object.assign(record, {
    chksum: null,
    createdAt: null,
    updatedAt: null,
    updatedBy: null,
    createdBy: null,
    isDeleted: null,
    SyncFrom: null,
    UpdatedFrom: null,
    userIp: null,
    localId: null,
    version: null
  })
  record = ObjKeySort(record);
  record = _.pickBy(record, function(value, key){
    if(key === 'isDummy' || key === 'isBlock' || key === 'isLocal'){
      sails.log.silly(typeof value);
      if(typeof value === 'number'){
        value = !!value;
        return {key: value};
      }
    }

    if(value !== null){
      return {key: value};
    }
  });
  sails.log.silly('Sorted record');
  sails.log.silly(record);
  let json = JSON.stringify(record).trim();
  sails.log.silly('Json Record');
  sails.log.silly(json)
  sails.log.silly(json.length);
  let recordMD5 = crypto.createHash('md5').update(json).digest('hex');
  sails.log.silly('Record MD5');
  sails.log.silly(recordMD5);
  let versionMD5 = crypto.createHash('md5').update(oldVersion).digest('hex');
  sails.log.silly('Version MD5');
  sails.log.silly(versionMD5);
  let temp = recordMD5.concat(versionMD5);
  let resultMD5 = crypto.createHash('md5').update(temp).digest('hex');
  sails.log.silly('Result MD5');
  sails.log.silly(resultMD5);
  return resultMD5;
}
exports.pureSign = pureSign;

me.signature = (record, model) => {
  sails.log.info(`Start a signature for model ${model}`);
  if(!record.version) record.version = 1;
  let oldVersion = record.version.toString();
  if(record.activeConnections) { delete record.activeConnections };
  record = Object.assign(record, {
    chksum: null,
    createdAt: null,
    updatedAt: null,
    updatedBy: null,
    createdBy: null,
    isDeleted: null,
    SyncFrom: null,
    UpdatedFrom: null,
    userIp: null,
    localId: null
  }) 
  record = ObjKeySort(record);
  sails.log.silly('Sorted record');
  sails.log.silly(record);
  sails.log.silly('Json Record');
  sails.log.silly(JSON.stringify(record))
  let recordMD5 = crypto.createHash('md5').update(JSON.stringify(record)).digest('hex');
  sails.log.silly('Record MD5');
  sails.log.silly(recordMD5);
  let versionMD5 = crypto.createHash('md5').update(oldVersion).digest('hex');
  sails.log.silly('Version MD5');
  sails.log.silly(versionMD5);
  let temp = recordMD5.concat(versionMD5);
  let resultMD5 = crypto.createHash('md5').update(temp).digest('hex');
  sails.log.info('Result MD5');
  sails.log.info(resultMD5);
  let result = {
    resultMD5: resultMD5,
    recordMD5: recordMD5,
    versionMD5: versionMD5
  }
  return result;
}
exports.signature = me.signature;

/**
 * @title 在子- 多-子条件项目下向单个柜机发送
 * @param 柜机object
 * @param item
 * @param model
 * @param method
 */
me.ToSlave = (e, item, model, method) => {
  if(e.remoteToken && e.isAlive){
    sails.log.debug(' #### SyncRole : Sync : Master to Slave Start #### ')
    delete item.localId;
    delete item.createdBy;
    delete item.updatedBy;
    let options = {};
    if(method && method == 'update'){
      //Update时
      if(!item.UpdatedFrom && item.SyncFrom){
        item.UpdatedFrom = sails.config.cabinet.id;
      }else if(!item.UpdatedFrom && !item.SyncFrom){
        item.UpdatedFrom = sails.config.cabinet.id;
        item.SyncFrom = sails.config.cabinet.id;
      }else{
        /**
         * BreakPoint
         * @Situation item.SyncFrom && item.UpdatedFrom already exist
         * @Should resolve local update reject other update
         */
        item.UpdatedFrom = sails.config.cabinet.id;
      }
      let url = `http://${e.host}:${e.port}/${model}/${item.id}`;
      let token = 'Token ' + new Buffer(e.remoteToken).toString('base64');
      return sails.services.network.proxy(url, 'PUT', item, token);
    }else if(method && method == 'destroy'){
      let url = `http://${e.host}:${e.port}/${model}/${item[0].id}`;
      let token = 'Token ' + new Buffer(e.remoteToken).toString('base64');
      return sails.services.network.proxy(url, 'DELETE', {id: item[0].id}, token);
    }else{
      //Create时
      if(!item.SyncFrom){
        item.SyncFrom = sails.config.cabinet.id;
      }
      let url = `http://${e.host}:${e.port}/${model}`;
      let token = 'Token ' + new Buffer(e.remoteToken).toString('base64');
      return sails.services.network.proxy(url, 'POST', item, token);
    }
  }else{
    sails.log.error('Target Offline Or No Avaliable Token');
    return Promise.reject('Target Offline Or No Avaliable Token');
  }
}

//作为Master时的同步规则
me.MasterSync = (masterCabinet, item, model, method) => {
  sails.log.debug(' #### SyncRole : Sync : Local is Master #### ');
  if(fullTable.indexOf(model) > -1){
    return Cabinet.find({isMaster: false})
    .then((slaveCabinet) => {
      if(slaveCabinet.length == 0){
        return Promise.reject('No Slave Cabinet Connect');
      }
      for(let e of slaveCabinet){
        me.ToSlave(e, item, model, method)  
        .then((res) => {
          sails.log.debug('Sync Success');
        })
        .catch((err) => {
          sails.log.error('Error In To Slave');
          if(err.error === '重复的类型名称！'){
            sails.log.error(err.error);
            return;
          }
          sails.services.syncrole.saveQueue(item, model, method);
          if(err.body) sails.log.error(err.body.message)
          else { sails.log.error(err) }
        })
      }
      return Promise.resolve('Sync Complete');
    })
  }else if(model == 'Application'){
    if(item.cabinetModule || item.cabinet){
      co(function* (){
        if(item.flatType == 'storageBullet' || item.flatType == 'storageGun'){
          sails.log.debug('This is a Storage Application');
          if(item.cabinet == sails.config.cabinet.id){
            return yield Promise.reject('This is Your Self');
          }
          //resolve(Cabinet.findOne({code: item.cabinet}));
          return yield Cabinet.findOne({code: item.cabinet});
        }else if(typeof item.cabinetModule !== 'undefined'){
          let targetCabinetModule = yield CabinetModule.findOne({id: item.cabinetModule})
            if(targetCabinetModule){
              if(targetCabinetModule.cabinet == sails.config.cabinet.id){
                sails.log.debug('It\'s Local');
                return yield Promise.reject('This is Your Self');
              }else{
                return yield Promise.resolve(Cabinet.findOne({code: targetCabinetModule.cabinet}));
              }
            }else{
              return yield Promise.reject('Target CabinetModule Not Include In Master');
            }
        }else{
          return yield Promise.reject('Illegal Application Cannot Sync');
        }
      })
      .then((data) => {
        if(data){
          if(method && method === 'update'){
            item.UpdatedFrom = sails.config.cabinet.id;
            let url = `http://${data.host}:${data.port}/${model}/${item.id}`;
            let token = 'Token ' + new Buffer(data.remoteToken).toString('base64');
            return sails.services.network.proxy(url, 'PUT', item, token);
          }else if(method && method === 'destroy'){
            let url = `http://${data.host}:${data.port}/${model}/${item[0].id}`;
            let token = 'Token ' + new Buffer(data.remoteToken).toString('base64');
            return sails.services.network.proxy(url, 'DELETE', item[0], token);
          }else{
            item.UpdatedFrom = sails.config.cabinet.id;
            item.SyncFrom = sails.config.cabinet.id;
            let url = `http://${data.host}:${data.port}/application/recieve`;
            let token = 'Token ' + new Buffer(data.remoteToken).toString('base64');
            return sails.services.network.proxy(url, 'POST', item, token);
          }
        }else{
          return Promise.reject('Target Cabinet Not Include In Master');
        }
      })
    }else{
      return Promise.reject('Cannot get CabinetModule');
    }
  }else if(model == 'fingerprint'){
    return Cabinet.find({isMaster: false}).then((data) => {
      if(data.length == 0){
        return Promise.reject('No Slave Connect');
      }
      if(method !== 'destroy'){
        item.data = new Buffer(item.data).toString('hex');
      }
      for(let cabinet of data) {
        if(method === 'destroy'){
          let url = `http://${cabinet.host}:${cabinet.port}/fingerprint/${item[0].id}`;
          let token = 'Token ' + new Buffer(cabinet.remoteToken).toString('base64');
          sails.services.network.proxy(url, 'DELETE', {id: item[0].id}, token)
          .then((suc) => {
            sails.log.error('Fingerprint delete success');
          })
          .catch((err) => {
            sails.log.error('Error in fingerprint delete');
            sails.log.error(err);
          });
          continue;
        }
        if(item.SyncFrom == cabinet.code){
          sails.log.debug('FingerPrint Need not to Send To Origin');
          continue;
        }else{
          let options = {};
          if(!item.SyncFrom){
            item.SyncFrom = sails.config.cabinet.id;
          }
          let url = `http://${cabinet.host}:${cabinet.port}/fingerprint/recieve`;
          let token = 'Token ' + new Buffer(cabinet.remoteToken).toString('base64');
          sails.services.network.proxy(url, 'POST', item, token)
          .then((suc) => {
            sails.log.error('Fingerprint sync success');
          })
          .catch((err) => {
            sails.log.error('Error in fingerprint sync');
            sails.log.error(err);
            sails.services.syncrole.saveQueue(item, model, method);
          });
          
        }
      }
      return Promise.resolve('complete');
    })
  }else if(model == 'ApplicationProcess'){
    return co(function* (){
      if(item.application.cabinet === masterCabinet.id){
        return yield Promise.resolve('Nothing to sync');
      }else{
        let target = yield Cabinet.findOne({code: item.application.cabinet});
        if(!target){
          return yield Promise.reject('No Data in local');
        }
        item.application = item.application.id;
        let url = `http://${target.host}:${target.port}/applicationprocess`;
        let token = 'Token ' + new Buffer(target.remoteToken).toString('base64');
        if(method && method === 'update'){
          url = `http://${target.host}:${target.port}/applicationprocess/recieve/${item.id}`;
          return sails.services.network.proxy(url, 'PUT', item, token);
        }else{
          return sails.services.network.proxy(url, 'POST', item, token)
        }
      }
    })
  }else{
    return Promise.resolve('Nothing to Sync');
  }
};

//作为Slave时的同步规则
me.SlaveSync = (data, item, model, method) => {
  //拦截
  if (!data.isAlive) return Promise.reject(new Error('Master Cabinet Offline'));
  sails.log.debug(' #### SyncRole : Sync : Local is not Master #### ');
  delete item.localId;
  delete item.createdBy;
  delete item.updatedBy;
  // if(fullTable.indexOf(model) > -1){
  //   //Full sync table
  //   return me.slaveETCDSync(item, model, data, method);
  // }
  let options = {};
  if(!data.remoteToken){
    return Promise.reject('You are not verified');
  }
  if(method && method === 'update'){
    item.UpdatedFrom = sails.config.cabinet.id;
    let url = `http://${data.host}:${data.port}/${model}/${item.id}`;
    if(model === 'ApplicationProcess'){
      url = `http://${data.host}:${data.port}/applicationprocess/recieve/${item.id}`;
    }
    let token = 'Token ' + new Buffer(data.remoteToken).toString('base64');
    return sails.services.network.proxy(url, 'PUT', item, token);
  }else if(method && method === 'destroy'){
    let url = `http://${data.host}:${data.port}/${model}/${item[0].id}`;
    let token = 'Token ' + new Buffer(data.remoteToken).toString('base64');
    return sails.services.network.proxy(url, 'DELETE', {id: item[0].id}, token);
  }else{
    item.SyncFrom = sails.config.cabinet.id;
    let url = `http://${data.host}:${data.port}/${model}`;
    if(model === 'fingerprint'){
      item.data = new Buffer(item.data).toString('hex');
      url = `http://${data.host}:${data.port}/fingerprint/recieve`;
    }
    if(model === 'application'){
      url = `http://${data.host}:${data.port}/application/recieve`;
    }
    let token = 'Token ' + new Buffer(data.remoteToken).toString('base64');
    return sails.services.network.proxy(url, 'POST', item, token);
  }
};

me.slaveETCDSync = function(bodyInfo, model, masterInfo, isUpdate){
  return co(function* (){
    let list = yield Client.ls('cabinet');
    if(list.node.nodes && list.node.nodes.length > 0){
      let parsedArr = list.node.nodes.map((e) => {
        return JSON.parse(e.value);
      })
      for(let item of parsedArr){
        if(item.id === sails.config.cabinet.id){continue};
        if(item.id === masterInfo.id){item = masterInfo};
        let url = '';
        let token = 'Token ' + new Buffer(item.remoteToken).toString('base64');
        let $Method = 'POST';
        if(isUpdate){
          //PUT
          bodyInfo.UpdatedFrom = sails.config.cabinet.id;
          url = `http://${item.host}:${item.port}/${model}/${bodyInfo.id}`;
          $Method = 'PUT';
        }else{
          //POST
          bodyInfo.SyncFrom = sails.config.cabinet.id;
          url = `http://${item.host}:${item.port}/${model}`;
          if(model == 'Fingerprint'){
            url = `http://${item.host}:${item.port}/fingerprint/recieve`;
          }
          $Method = 'POST';
        }
        try{
          yield sails.services.network.proxy(url, $Method, bodyInfo, token);
        }catch(err){
          sails.log.error('### Error in slave etcd sync ###');
          if(err.body){
            sails.log.error(err.body);
          }else{
            sails.log.error(err);
          }
        }
      }
      return yield Promise.resolve('Finish');
    }else{
      return yield Promise.reject({error: 'ETCD中没有柜机信息'})
    }
  })
}

// exports.initClass = function(){
//   Promise.all(Cabinet.findOne({isLocal: true}), Cabinet.findOne({isMaster: true}))
// }

// exports.Sync = function(item, model, method){

// }
exports.Sync = function(item, model, method){
  const redis = sails.services.redis;
  sails.log.debug(' #### SyncRole : Sync : Start #### ');
  sails.log.silly(item);
  let source = _.merge({}, item);
  sails.services.utils.delay(200)
  .then(() => {
    return Cabinet.findOne({isMaster: true});
  })
  .then((data) => {
    if(!data) return Promise.reject('Not Connect to Master');
    if(data.code == sails.config.cabinet.id){
      return me.MasterSync(data, item, model, method);
    }else{
      return me.SlaveSync(data, item, model, method);
    }
  })
  .then((data) => {
    sails.log.verbose(' #### SyncRole : Sync : Finish #### ')
  })
  .catch((err) => {
    sails.log.error(' #### SyncRole : Sync : Error #### ')
    if(typeof err === 'string'){
      sails.log.error(err);
    }else{
      if(err.error === '重复的类型名称！'){
        sails.log.error(err);
        return;
      }
      if(err.message && err.message.indexOf('A record with that `PRIMARY` already exists') > -1){
        sails.log.error('目标已经有该数据');
        sails.log.error(err);
        return;
      }
      if(err.body){
        sails.log.error(err.body);
      }else{
        sails.log.error(err);        
      }
      sails.services.syncrole.saveQueue(source, model, method);
    }
  })
}

const NewSync = (code) => {
  return co(function* (){
    let findResult = yield [
      User.find({isDummy: false, isLocal: false}),
      GunType.find(),
      Bullettype.find(),
      Role.find(),
      Passport.find({filter: false})
    ];
    let targetCabinet = yield Cabinet.findOne({code: code});
    let selfCabinet = yield Cabinet.findOne({code: sails.config.cabinet.id});
    if(!targetCabinet || !targetCabinet.remoteToken){
      return yield Promise.reject('No Target Cabinet');
    }
    let arr = [
      {data: findResult[0], tag: 'user', source: sails.config.cabinet.id},
      {data: findResult[1], tag: 'guntype', source: sails.config.cabinet.id},
      {data: findResult[2], tag: 'bullettype', source: sails.config.cabinet.id},
      {data: findResult[3], tag: 'role', source: sails.config.cabinet.id},
      {data: findResult[4], tag: 'passport', source: sails.config.cabinet.id}
    ]
    if(!selfCabinet.isMaster){
      let cabinetModule = yield CabinetModule.find();
      arr.push({data: cabinetModule, tag: 'cabinetmodule', source: sails.config.cabinet.id});
    }
    for(let e of arr){
      let url = `http://${targetCabinet.host}:${targetCabinet.port}/newsync`;
      let token = 'Token ' + new Buffer(targetCabinet.remoteToken).toString('base64');
      try{
        yield sails.services.network.proxy(url, 'POST', e, token);
      }catch(err){
        sails.log.error('向目标柜机发送全量同步时错误');
        sails.log.error(err);
      }
    }
    return Promise.resolve('Send Queue Finish');
  })
}

exports.NewSync = NewSync;

const syncQueue = function(){
  co(function* (){
    if(me.syncQueue.length === 0){
      return Promise.resolve('OK')
    }
    while(me.syncQueue.length > 0){
      let once = me.syncQueue.shift();
      try{
        yield NewSync(once);
      }catch(err){
        me.syncQueue.push(once);
        sails.log.error(err);
      }
    }
  })
  .catch((err) => {
    sails.log.error('全量同步时发生错误');
    sails.log.error(err);
  })
}

exports.saveQueue = (item, model, method) => {
  const Redis = sails.services.redis;
  let key = 'SyncItem:' + item.id;
  let singleItem = {
    id: item.id,
    model: model,
    method: method
  }
  singleItem = JSON.stringify(singleItem);
  Redis.saddAsync('SyncItem', singleItem)
  .then((data) => {
    sails.log.verbose(' #### SyncRole : Sync : Add Error Item to Queue Success #### ')
  })
  .catch((err) => {
    sails.log.error(' #### SyncRole : Sync : Add Error Item to Queue Failed #### ')
  })
}
