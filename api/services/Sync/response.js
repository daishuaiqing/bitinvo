'use strict';
const _ = require('lodash');
const Logger = require('../Logger');
const log = new Logger('Sync Response Service');
const co = require('co');

const response = function (req, res) {
  let body = req.body;
  let data = body.data, model = body.model, method = body.method, origin = body.origin;
  let showMethod = method ? method : 'created';
  log.info(`Revieve a sync request with ${showMethod} ${model}`, 'Response')
  if (model === 'fingerprint' && method !== 'destroy') {
    data.data = new Buffer(data.data, 'hex');
  }
  if (model === 'application' && method !== 'destroy') {
    delete data.processList;
    // let processList = data.processList;
    // if(typeof(processList) !== 'string'){
    //   for(let i in processList){
    //     processList[i] = JSON.stringify(processList[i]);
    //   }
    //   if(processList && processList.length > 0) data.processList = processList.toString();
    // }
  }

  if (model === 'applicationprocess' && method !== 'destroy') {
    return res.badRequest({ error: 'Ignored Model' });
    // if(data.application){
    //   let processList = data.application.processList;
    //   if(typeof(processList) !== 'string'){
    //     for(let i in processList){
    //       processList[i] = JSON.stringify(processList[i]);
    //     }
    //     if(processList && processList.length > 0) data.application.processList = processList.toString();
    //   }
    //   if(data.application.localId){ delete data.application.localId };
    // }
  }

  if (model === 'optlog') {
    if ((data.actionType === 'admin_fingerprint_authorize_success' && !data.fingerPrint) || (data.actionType === 'admin_face_authorize_success' && !data.facePic)) {
      sails.log.debug('#### Sync : response ignored model');
      return res.badRequest({ error: 'Ignored Model' });
    }
  }

  if (data.localId) { delete data.localId };
  if (sails.models[model]) {
    if (!method) {
      log.debug('Create a sync record', 'Response');
      data.SyncFrom = origin;
      return create(data, model, origin)
        .then((created) => {
          return res.ok(created);
        })
        .catch((err) => {
          log.error('Error in create sync record', 'Response');
          sails.log.error(err);
          if (typeof err === 'string') {
            return res.badRequest({ err: err });
          } else {
            return res.serverError(err);
          }
        })
    } else if (method && method === 'update') {
      log.debug('Update a sync record', 'Response');
      data.UpdatedFrom = origin;
      return update(data, model, origin)
        .then((updated) => {
          if (typeof updated === 'string') {
            return res.ok({});
          } else {
            return res.ok(updated);
          }
        })
        .catch((err) => {
          log.error('Error in update sync record', 'Response');
          sails.log.error(err);
          if (typeof err === 'string') {
            return res.badRequest({ err: err });
          } else {
            return res.serverError(err);
          }
        });
    } else if (method && method === 'destroy') {
      log.debug('Destroy a sync record', 'Response');
      return destroy(data, model)
        .then((destroyed) => {
          if (typeof destroyed === 'string') {
            return res.ok({});
          } else {
            return res.ok(destroyed[0]);
          }
        })
        .catch((err) => {
          log.error('Error in destroy sync record', 'Response');
          sails.log.error(err);
          return res.serverError(err);
        })
    } else {
      return res.notFound({ error: 'Invalid Method' });
    }
  } else {
    return res.badRequest({ error: 'Invalid Model' });
  }
}

exports.recieve = response;

const create = function (data, model, origin) {
  return co(function* () {
    let exist = yield sails.models[model].findOne({ id: data.id });
    if (exist) {
      sails.log.debug('exist');
      return yield Promise.resolve({ msg: 'Exist' });
    } else {
      let created = yield sails.models[model].create(data);
      return yield Promise.resolve(created);
    }
  })
};

const update = function (data, model, origin) {
  return co(function* () {
    let query = sails.models[model].findOne({ id: data.id });
    if (model === 'user') {
      query = sails.models[model].findOne({ id: data.id }).populate('roles');
    } else if (model === 'applicationtype') {
      query = sails.models[model].findOne({ id: data.id }).populate('approvers');
    }
    let matchingRecord = yield query;
    //Compare
    if (!matchingRecord) {
      if (model === 'cabinetmodule' || model === 'gun') {
        log.debug('Not existed module/gun, create new one', 'Response Update');
        let created = yield sails.models[model].create(data)
        log.debug('Created new instance ok', 'Response Update');
        return yield Promise.resolve(created);
      } else {
        return yield Promise.reject('不存在该条记录');
      }
    }
    if (model === 'application') {
      if ((matchingRecord.status === 'processed' && data.status === 'approved') || (matchingRecord.status === 'approved' && data.status === 'pending') || (matchingRecord.status === 'complete' && data.status === 'prereturn') || (matchingRecord.status === 'complete' && data.status === 'processed') || (matchingRecord.remoteStatus === 'approved' && data.remoteStatus === 'pending') || (matchingRecord.status === 'complete' && data.status === 'approved')) {
        return yield Promise.resolve('工单状态无法倒退');
      }
      delete data.processList;
    }
    let obj = matchingRecord.toObject(),
      matchingChksum = matchingRecord.chksum ? matchingRecord.chksum : sails.services.syncrole.pureSign(obj),
      tempObj = Object.assign({}, obj, data),
      valuesChksum = sails.services.syncrole.pureSign(tempObj);
    if (valuesChksum === matchingChksum) {
      if (sails.services.syncrule.updateRule[model]) {
        if (sails.services.syncrule.updateRule[model](obj, data)) {
          log.debug('Target record has no change', 'Response Update');
          return yield Promise.resolve('No change');
        }
      } else {
        log.debug('Target record has no change', 'Response Update');
        return yield Promise.resolve('No Change');
      }
    }
    if (model === 'user') {
      const remoteRoles = data.roles;
      const localRoles = obj.roles;
      let roleChanged = false;
      for (let i in remoteRoles) {
        if (remoteRoles[i] !== localRoles[i].id) {
          roleChanged = true;
          break;
        }
      }
      if (!roleChanged || (remoteRoles && remoteRoles.length === 0)) delete data.roles;
    }
    let updated = yield sails.models[model].update({ id: data.id }, data)
    if (updated.length > 0) {
      return yield Promise.resolve(updated[0]);
    } else {
      return yield Promise.reject('没有记录被更新');
    }
  })
}

const destroy = function (data, model) {
  return co(function* () {
    let modelId = data.length > 0 ? data[0].id : data.id;
    if (!modelId) return yield Promise.resolve('获取Model ID失败');
    let exist = yield sails.models[model].findOne({ id: modelId });
    if (exist) {
      let destroyed = yield sails.models[model].destroy({ id: modelId });
      return yield Promise.resolve(destroyed);
    } else {
      return yield Promise.resolve('已经删除');
    }
  })
}