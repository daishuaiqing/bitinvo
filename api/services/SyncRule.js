'use strict';
const co = require('co');
/**
 * log
 */
const l = (msg) => {
  sails.log.verbose(`$$$$$ SyncRule : ${msg} $$$$$`);
}

// 用于返回用于同步的匹配数据
exports.user = function(id){
  l('user');
  return co(function* (){
    let record = yield User.findOne({id: id}).populate('roles');
    if(!record) return yield Promise.resolve(undefined)
    record = record.toObject();
    if(record.roles.length > 0){
      record.roles = [record.roles[0].id];
    }
    return yield Promise.resolve(record);
  })
}

exports.applicationtype = function(id){
  l('applicationtype');
  return co(function* (){
    let record = yield ApplicationType.findOne({id: id}).populate('approvers')
    if(!record) return yield Promise.resolve(undefined)
    record = record.toObject();
    if(record.approvers.length > 0){
      record.approvers = record.approvers.map((e) => {
        return e.id;
      });
    }
    return yield Promise.resolve(record);
  })
};

exports.applicationprocess = function(id){
  return co(function* (){
    let record = yield ApplicationProcess.findOne({id: id}).populate('application')
    if(!record) return yield Promise.resolve(undefined)
    record = record.toObject();
    return yield Promise.resolve(record);
  })
}

exports.passport = function(id){
  return co(function* (){
    let record = yield sails.models['passport'].findOne({id: id});
    if(!record) return yield Promise.resolve(undefined);
    let user = yield User.findOne({id: record.user});
    record = record.toObject;
    if(user && !user.filter){
      return Promise.resolve(record);
    }else{
      return yield Promise.resolve(undefined);
    }
  })
}


/**
 * 用于在blueprint相同chksum条件下判断是否需要更新
 * @param {Object} 数据库值
 * @param {Object} 输入值
 * @return {Boolean} 是否阻止
 */

const userUpdate = function(db, input){
  let inputId, dbId;
  if(typeof input.roles !== 'undefined' && input.roles.length > 0){
    if(db.roles.length > 0){
      if(typeof input.roles[0] === 'object'){
        inputId = input.roles[0].id;
      }else if(typeof input.roles[0] === 'string'){
        inputId = input.roles[0];
      }
      if(typeof db.roles[0] === 'object'){
        dbId = db.roles[0].id;
      }else if(typeof db.roles[0] === 'string'){
        dbId = db.roles[0];
      }
      if(inputId !== dbId){
        sails.log.info('Role Change');
        return false;
      }else{
        return true;
      }
    }else{
      sails.log.info('Add Role');
      return false; 
    }
  }else{
    return true;
  }
}

const applicationtypeUpdate = function(db, input){
  let tempObj = Object.assign({}, db, input);
  if(tempObj.approverOption === 'arbitary' && typeof input.approvers !== 'undefined' && input.approvers.length > 0){
    let compare = [];
    for(let e of db.approvers){
      if(compare.indexOf(e) === -1){
        compare.push(e.id);
      }
    }
    if(input.approvers.length !== compare.length){
      sails.log.info('add approvers')
      return false;
    }else{
      let count = 0;
      for(let e of input.approvers){
        compare.indexOf(e) === -1? null: count++;
      }
      if(count !== compare.length){
        sails.log.info('Approvers change')
        return false;
      }else{
        return true;
      }
    }
  }else{
    return true;
  }
}

exports.updateRule = {
  user: userUpdate,
  applicationtype: applicationtypeUpdate
}