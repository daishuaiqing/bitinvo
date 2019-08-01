'use strict';
const co = require('co');
let me = this;
const SyncService = require('./Sync');
const SyncRole = require('./SyncRole');
me.lock = {};
me.syncList = {};
//Route

/**
 * status
 * @param chksum 发送方最新chksum
 * @param model 表名
 * @param origin 发送方id
 */
exports.check = function(req, res){
  let chksum = req.body.chksum, model = req.body.model, origin = req.body.origin;
  if(me.lock[model]){
    sails.log.info('Target has been locked');
    return res.ok({msg: 'Target has been locked', status: 0});
  }
  /**
   * Status
   * 0: 双方无需同步
   * 1: 接收方落后，需要发送方进行同步,并回报当前最新chksum
   * 2: 发送方落后，需要接收方进行同步
   */
  co(function* (){
    let originLatest = yield sails.models[model].findOne({chksum: chksum});
    let where = {};
    let localLatest = [];
    if(model === 'user'){
      localLatest = yield sails.models[model].find({isLocal: false, isDummy: false}).limit(1).sort('updatedAt DESC').populate('roles');
    }else if(model === 'passport'){
      localLatest = yield sails.models[model].find({filter: false}).limit(1).sort('updatedAt DESC').populate('user');
    }else{
      localLatest = yield sails.models[model].find().limit(1).sort('updatedAt DESC');
    }
    if(!originLatest){
      //接收方常规表无发送方最新chksum,去归档数据里查询
      let archiveName = model.concat('_archive');
      let archived = yield sails.models[archiveName].findOne({chksum: chksum});
      if(!archived){
        let reportChksum = 'nochksum'; 
        if(localLatest.length > 0){
          reportChksum = localLatest[0].chksum;
        }
        sails.log.info(`#### Sync Check: Model: ${model} ,Status: 1 ####`);
        return res.ok({msg: 'No chksum in DB', status: 1, recieveChksum: reportChksum});
      }else if(archived){
        sails.log.info(`#### Sync Check: Model: ${model} ,Status: 2 with archived ####`);
        me.directSync(chksum, localLatest, archived, model, origin);
        return res.ok({msg: 'Need Recieve Sync', status: 2});
      }
    }else if(originLatest){
      if(localLatest[0].chksum === chksum){
        sails.log.info(`#### Sync Check: Model: ${model} ,Status: 0 ####`);
        return res.ok({msg: 'Nothing to sync', status: 0});
      }else{
        sails.log.info(`#### Sync Check: Model: ${model} ,Status: 2 with originLatest ####`);
        me.directSync(chksum, localLatest, originLatest, model, origin);
        return res.ok({msg: 'Need Send Sync', status: 2});
      }
    }
  })
  .catch((err) => {
    sails.log.error(err); 
    return res.serverError({error: err});
  })
}

/**
 * 接收对向同步信息，更新本地数据
 * @param latest 最新记录
 * @param history 历史数据
 */

exports.recieve = function(req, res){
  co(function* (){
    let model = req.body.model,
        list = req.body.list,
        Model = sails.models[model],
        origin = req.body.origin;
    sails.log.info(`Recieve from ${origin}, Target model : ${model}, Data length is ${list.length}`);
    for(let item of list){
      if(model === 'fingerprint'){
        let convert = new Buffer(item.data.data, 'hex');
        item.data = convert;
      }
      try{
        me.syncList[item.id] = true;
        yield SyncService.syncUpdate(item, model, origin, true);
      }catch(err){
        sails.log.error('Error in recieve SyncUpdate');
        sails.log.error(err);
      }
    }
    return yield Promise.resolve('Finish');
  })
  .then((suc) => {
    sails.log.info('Recieve Ok');
    res.ok('Finish');
  })
  .catch((err) => {
    sails.log.error(err);
    res.serverError(err);
  })

};

// Service

/**
 * 检查是否需要同步
 */
exports.checkSync = function(model){
  co(function* (){
    sails.log.info(`Model: ${model} Check Sync Start`);
    let list = yield Cabinet.find({isAlive: true, isLocal: false});
    if(list.length === 0){
      sails.log.verbose('No alive cabinet');
      return yield Promise.resolve('No alive cabinet')
    }
    me.lock[model] = true;
    for(let cabinet of list){
      if(!cabinet.remoteToken){
        sails.log.error('Target No Token');
      }
      try{
        yield me.sendChksum(model, cabinet);
      }catch(err){
        if(err.body){
          sails.log.error(err.body);
        }else{
          sails.log.error(err);
        }
      }
    }
    return yield Promise.resolve('Check Finish');
  })
  .then((suc) => {
    sails.log.info('Check Sync Finish');
    me.lock = {};
  })
  .catch((err) => {
    sails.log.error(err);
  })
}

/**
 * 发送Chksum以及同步行为
 */
me.sendChksum = function(model, target){ 
  return co(function* (){
    let localLatest = [];
    if(model === 'user'){
      localLatest = yield sails.models[model].find({isLocal:false, isDummy: false}).limit(1).sort('updatedAt DESC').populate('roles');
    }else if(model === 'passport'){
      localLatest = yield sails.models[model].find({filter: false}).limit(1).sort('updatedAt DESC').populate('user');
    }else{
      localLatest = yield sails.models[model].find().limit(1).sort('updatedAt DESC');
    }
    if(localLatest.length === 0) {return yield Promise.reject('No Avaliable Data in DB to Sync')};
    let chksum = localLatest[0].chksum; 
    if(!chksum){
      let newChksum = SyncRole.pureSign(localLatest[0]);
      chksum = newChksum;
    }
    let body = {
      chksum: chksum,
      model: model,
      origin: sails.config.cabinet.id
    }
    sails.log.info(body);
    let url = `http://${target.host}:${target.port}/sync/checkSync`;
    let Token = 'Token ' + new Buffer(target.remoteToken).toString('base64');
    let res = yield sails.services.network.proxy(url, 'POST', body, Token);
    let resBody = res.body;
    switch(resBody.status){
      case 0: sails.log.info('Nothing to sync');return yield Promise.resolve('Nothing to Sync');
      case 1: sails.log.info(`Need send sync data to remote ${target.host}`);break;
      case 2: sails.log.info('Need recieve sync data from remote');return yield Promise.resolve('Ready to recieve sync');
    }
    let recieveChksum = resBody.recieveChksum;
    return yield me.sync(recieveChksum, localLatest, model, target);
  })
 }

/**
 * Status为1时,作为发送方向接收方发送数据的Function
 */
me.sync = (chksum, latestRecord, model, target) => {
  return co(function* (){
    let Model = sails.models[model];
    let selfCabinet = yield Cabinet.findOne({isLocal: true});
    let oldIndex = yield Model.findOne({chksum: chksum}); 
    if(!oldIndex) { 
      oldIndex = yield sails.models[model.concat('_archive')].findOne({chksum: chksum});
      if(!oldIndex) oldIndex = {};
    }
    let afterList = yield me.syncAfterChksum(oldIndex, model);
    let body = {
      list: afterList,
      model: model,
      origin: selfCabinet.code
    }
    let token = 'Token ' + new Buffer(target.remoteToken).toString('base64');
    let url = `http://${target.host}:${target.port}/sync/recieve`;
    let res = yield sails.services.network.proxy(url, 'POST', body, token);
    return res.body;
  })
}

/**
 * Status为2时,作为接收方向送发方发送数据的Function
 * @param chksum 
 * @param latestRecord
 * @param record
 * @param model
 * @param target
 */
me.directSync = (chksum, latestRecord, record, model, target) => {
  co(function* (){
    let Model = sails.models[model], oldIndex = record;
    let selfCabinet = yield Cabinet.findOne({isLocal: true});
    target = yield Cabinet.findOne({code: target});
    let afterList = yield me.syncAfterChksum(oldIndex, model);
    let body = {
      list: afterList,
      model: model,
      origin: selfCabinet.code
    }
    let token = 'Token ' + new Buffer(target.remoteToken).toString('base64');
    let url = `http://${target.host}:${target.port}/sync/recieve`;
    let res = yield sails.services.network.proxy(url, 'POST', body, token);
    return res.body
  })
  .catch((err) => {
    sails.log.error('Error in directSync');
    if(err.body){
      sails.log.error(err.body);
    }else{
      sails.log.error(err);
    }
  })
}

/**
 * 组织数据方法
 */
me.syncAfterChksum = (old, model) => {
  return co(function* (){
    let afterList = [], where = {};
    let Model = sails.models[model];
    if(model === 'user'){
      where = {isDummy: false, isLocal: false}; 
    }
    if(model === 'passport'){
      where = {filter: false};
    }
    if(old.id){
      where = Object.assign(where, {updatedAt: {'>': new Date(old.updatedAt)}});
    }
    if(model === 'user'){
      afterList = yield sails.models[model].find({where, sort: 'updatedAt ASC'}).populate('roles');
    }else if(model === 'passport'){
      afterList = yield sails.models[model].find({where, sort: 'updatedAt ASC'}).populate('user');
    }else{
      afterList = yield sails.models[model].find({where, sort: 'updatedAt ASC'});
    }
    if(afterList.length === 0){
      return yield Promise.reject('Already Latest');
    }else{
      return afterList.map((e) => {
        delete e.localId;
        delete e.createdAt;
        delete e.updatedAt;
        return e;
      });
    }
  })
};

/**
 * 创建之后的检查
 * @param {*} model 
 * @param {*} item 
 */
const afterCreateCheck = function(model, item){
  Cabinet.findOne({isMaster: true})
  .then((masterCabinet) => {
    if(!masterCabinet){
      sails.log.silly('Not have master');
      return;
    }
    if(masterCabinet.code === sails.config.cabinet.id){
      //Master
      me.checkSync(model);
    }else{
      //Slave
      if(typeof me.syncList[item.id] !== 'undefined'){
        sails.log.debug('This is a sync data');
        delete me.syncList[item.id];
      }else{
        me.checkSync(model);
      }
    }
  })
}
exports.afterCreateCheck = afterCreateCheck;
