'use strict';
const co = require('co');
const SyncRole = require('./SyncRole');


/**
 * 新的更新记录的方法
 * @param oldPK
 * @param modelName
 * @param newValues
 * @param origin
 */
exports.insertSync = function(pk, model, values, SyncFrom, isRecieve){
  return co(function* (){
    let Model = sails.models[model];
    let archiveName = model.concat('_archive');
    let record = {};
    if(model === 'user'){
      record = yield Model.findOne(pk).populate('roles');
    }else if(model === 'passport'){
      record = yield Model.findOne(pk).populate('user');
    }else{
      record = yield Model.findOne(pk);
    }
    if(!record) return yield Promise.reject('没有对应数据');
    let destroyed = yield Model.destroy(pk);
    delete record.localId;
    let archived = yield sails.models[archiveName].create(record);
    if(!isRecieve){
      values.version = Number(record.version) + 1;
    }else{
      if(values.version !== record.version && values.version < record.version){
        values.version = record.version;
      }
    }
    if(typeof values.roles !== 'undefined' && typeof values.roles[0] === 'object'){
      values.roles = [values.roles[0].id]; 
    }
    if(typeof values.roles === 'undefined' && record.roles){
      if(record.roles.length > 0){
        values.roles = [record.roles[0].id];
      }
    }
    let newRecord = Object.assign({}, record, values);
    newRecord.SyncFrom = SyncFrom;
    delete newRecord.createdAt;
    delete newRecord.updatedAt;
    let created = yield Model.create(newRecord);
    sails.log.silly('New Create version of data');
    sails.log.silly(created);
    return yield Promise.resolve(created);
  })
}

/**
 * 同步时用于更新记录的方法
 * @param item
 * @param Model
 * @param origin
 */

exports.syncUpdate = (item, model, origin, isRecieve) => {
  return co(function* (){
    let Model = sails.models[model];
    let record = yield Model.findOne({id: item.id});
    if(!record && model === 'user'){
      record = yield Model.findOne({username: item.username});
      if(record) item.id = record.id;
    }
    sails.log.info('Sync Update Record');
    if(!record){
      sails.log.debug('This is a new record');
      item.SyncFrom = origin;
      if(typeof item.roles !== 'undefined' && typeof item.roles[0] === 'object'){
        item.roles = [item.roles[0].id]; 
      }
      let created = yield Model.create(item);
      sails.log.silly(created);
      return yield Promise.resolve(created);
    }else{
      //Add reject here
      let cacheChksum = record.chksum;
      let chksumObj = Object.assign({}, record, item);
      let localChksum = SyncRole.pureSign(chksumObj);
      if(cacheChksum === localChksum){
        sails.log.debug('Same chksum');
        return yield Promise.resolve('Same chksum');
      }else{
        return sails.services.sync.insertSync(item.id, model, item, origin, isRecieve)
      }
    }
  })
}

const sendCheckSync = function(data, target){
  co(function* (){
    for(let e of data){
      let where = undefined;
      if(e.key === 'user'){
        where = {isLocal: false, isDummy: false}
      }else if(e.key === 'passport'){
        where = {filter: false};
      }
      let localCount = yield sails.models[e.key].count(where);
      if(e.count < localCount){
        //more 
        let diff = parseInt(localCount) - parseInt(e.count);
        let selectList = yield sails.models[e.key].find(where).limit(diff).sort('createdAt DESC');
        if(e.key === 'fingerprint'){
          selectList = selectList.map((e) => {
            e.data = new Buffer(e.data).toString('hex');
            return e;
          });
        }
        let body = {
          data: selectList,
          model: e.key
        },
        token = 'Token ' + new Buffer(target.remoteToken).toString('base64');
        try{
          yield sails.services.network.proxy(`http://${target.host}:${target.port}/sync/checkCountSync`, 'POST', body, token);
        }catch(err){
          sails.log.error('**** error in send request in send check sync ****');
          sails.log.error(err);
        }
      }else{
        //less
        sails.log.debug('less');
        continue;
      }
    }
  })
  .catch((err) => {
    sails.log.error('**** error in send Check Sync ****');
    sails.log.error(err);
  })
}

const checkNum = function(){
  return co(function* (){
    let master = yield Cabinet.findOne({isMaster: true});
    if(!master){
      sails.services.message.local({
        topic : 'masterInfo',
        value : {hasMaster : false}              
      })
      return yield Promise.reject({error: '缺少主机'});
    };
    if(!master.remoteToken){
      return yield Promise.reject({error: '主机还未对你授权'});
    };
    let count = yield Promise.all([
      User.count({isDummy: false, isLocal: false}),
      Fingerprint.count(),
      Passport.count({filter: false}),
      Role.count(),
      ApplicationType.count(),
      GunType.count(),
      Bullettype.count()
    ]);
    let result = {
      user: count[0],
      fingerprint: count[1],
      passport: count[2],
      role: count[3],
      applicationtype: count[4],
      guntype: count[5],
      bullettype: count[6]
    },
    url = `http://${master.host}:${master.port}/sync/checkCount`,
    token = 'Token ' + new Buffer(master.remoteToken).toString('base64'),
    body = {
      data: result,
      origin: sails.config.cabinet.id
    }
    let res = yield sails.services.network.proxy(url, 'POST', body, token);
    if(res.body.length > 0){
      sendCheckSync(res.body, master);
    }
    sails.services.message.local({
      topic : 'masterInfo',
      value : {hasMaster : true}              
    })
    return yield Promise.resolve('ok');
  })
}

const checkCount = function(){
  Cabinet.findOne({isLocal: true})
  .then((data) => {
    if(data.isMaster){
      sails.log.debug('master not check');
    }else{
      checkNum()
      .then((suc) => {
        sails.log.debug('checkCount success'); 
      })
      .catch((err) => {
        sails.log.error('checkCount error');
        sails.log.error(err);
        setTimeout(function(){
          checkCount()
        }, 10 * 1000);
      });
    }
  })
  .catch((err) => {
    sails.log.error(err);
  })
};

exports.checkCount = checkCount;

exports.checkCountRecieve = function(req, res){
  co(function* (){
    sails.log.info('recieve');
    let data = req.body.data, origin = req.body.origin, target = [];
    for(let key in data){
      if(sails.models[key]){
        let where = undefined;
        if(key === 'user'){
          where = {isLocal: false, isDummy: false}
        }else if(key === 'passport'){
          where = {filter: false};
        }
        let localCount = yield sails.models[key].count(where);
        if(localCount !== data[key]){
          //diff
          sails.log.debug(`diff count: ${key}`);
          target.push({
            key: key,
            count: localCount
          })
          if(localCount > data[key]){
            //send back
            let target = yield Cabinet.findOne({code: origin});
            if(target && target.remoteToken){
              sendCheckSync([{
                key: key,
                count: data[key]
              }], target);
            }
          };
        }else{
          //same
          sails.log.debug(`same count: ${key}`);
        }
      }else{
        continue;
      }
    }
    return yield Promise.resolve(target);
  })
  .then((suc) => {
    res.ok(suc);
  })
  .catch((err) => {
    sails.log.error(err);
    res.serverError({error: err});
  })
}

exports.checkCountSync = function(req, res){
  sails.log.debug('### Recieve a checkCount Sync Request ###');
  co(function* (){
    let data = req.body.data, model = req.body.model;
    if(!model){
      res.badRequest({error: '缺失参数'});
      return yield Promise.resolve(); 
    }
    for(let re of data){
      try{
        let exist = yield sails.models[model].findOne(re.id);
        if(exist){
          sails.log.debug('Exist checkcount sync data');
          continue;
        }else{
          delete re.localId;
          sails.log.debug('New checkcount sync data');
          if(model === 'fingerprint'){
            re.data = new Buffer(re.data, 'hex');
          }
          yield sails.models[model].create(re);
        }
      }catch(err){
        sails.log.error('Error in create count sync data')
        sails.log.error(err);
      }
    }
    res.ok('ok');
    return yield Promise.resolve();
  })
  .catch((err) => {
    sails.log.error(err);
    return res.serverError(err);
  })
}