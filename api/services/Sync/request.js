'use strict';
const Logger = require('../Logger');
const _ = require('lodash');
const log = new Logger('Sync Request Service');
const fetch = require('node-fetch');
const co = require('co');

module.exports = class {
  /**
   * 初始化信息
   * @param {Object} local 
   * @param {Object} master 
   * @param {Array}
   */
  constructor(local, master, fullTable) {
    log.info('Init Sync Request Service', 'Constructor');
    this._local = local;
    this._master = master;
    this._fullTable = fullTable;
    if (local.isMaster) {
      this._isMaster = true;
    } else {
      this._isMaster = false;
    }
  }
  sendRequest(data, model, method, cabinet) {
    if (!cabinet || !cabinet.remoteToken) return Promise.reject("Sync: sendRequest 没有柜机信息或remoteToken");
    let url = `http://${cabinet.host}:${cabinet.port}/syncservice/recieve`,
      token = 'Token ' + new Buffer(cabinet.remoteToken).toString('base64'),
      body = {
        data: data,
        model: model,
        method: method,
        origin: sails.config.cabinet.id
      },
      option = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': token
        },
        body: typeof body === 'object' ? JSON.stringify(body) : body
      }
    return fetch(url, option)
      .then((res) => res.json())
      .then((body) => body);
  }
  toSlave(data, model, method) {
    log.info('Start To Slave Sync', 'To Slave');
    let me = this;
    return co(function* () {
      let list = yield Cabinet.find({ isMaster: false, isLocal: false });
      if (list.length === 0) {
        return yield Promise.resolve('No Cabinet to Sync');
      }
      log.debug(`Sync Cabinet length is ${list.length}`, 'To Slave');
      if (model === 'fingerprint' && method !== 'destroy') {
        data.data = new Buffer(data.data).toString('hex');
      }
      for (let cabinet of list) {
        if (!cabinet.remoteToken) {
          continue;
        }
        try {
          yield me.sendRequest(data, model, method, cabinet);
        } catch (err) {
          log.error('Error in to slave sync', 'To Slave');
          sails.log.error(err);
          sails.services.syncrole.saveQueue(data, model, method)
        }
      }
      return yield Promise.resolve('Finish');
    })
  }
  sync(data, model, method, target) {
    log.info(`Start once sync with model ${model}`, 'Sync');
    model = _.toLower(model);
    delete data.localId;
    if (this._isMaster) {
      //Master
      log.debug('master sync', 'Sync');
      if (this._fullTable.indexOf(model) > -1) {
        //Full table
        return this.toSlave(data, model, method);
      } else {
        switch (model) {
          case 'application': return this.application(data, model, method);
          case 'applicationprocess': return this.applicationprocess(data, model, method);
          case 'gun': return this.gun(data, model, method);
          case 'cabinetmodule': return this.cabinetModule(data, model, method);
          default: return Promise.resolve('ok');
        }
      }
    } else {
      //Slave
      log.debug('salve sync', 'Sync');
      if (this._master) {
        if (model === 'fingerprint' && method !== 'destroy') {
          data.data = new Buffer(data.data).toString('hex');
        }
        if (model === 'cabinetmodule') {
          if (data.UpdatedFrom === this._master.id) {
            sails.log.debug(`Sync request : 从远程柜机获取的数据, 不再发回`)
            return Promise.resolve('ok');
          }
        }
        return this.sendRequest(data, model, method, this._master);
      } else {
        return Promise.resolve('ok');
      }
    }
  }

  applicationprocess(data, model, method) {
    log.info('Application Process Sync', 'Application Process');
    let me = this;
    return co(function* () {
      if (data.application.cabinet === sails.config.cabinet.id) {
        log.debug('本机器的授权信息无需同步', 'Application Process');
        return yield Promise.resolve('本机授权信息');
      }
      if (!data.application.cabinet && data.application.flatType !== 'gun' && data.application.flatType !== 'bullet') {
        log.debug('非取类型工单授权无需同步', 'Application Process');
        return yield Promise.resolve('非需要同步的授权行为');
      }
      let target = yield Cabinet.findOne({ code: data.application.cabinet });
      data.application = data.application.id;
      return me.sendRequest(data, model, method, target);
    })
  }
  application(data, model, method) {
    log.info('Application Sync', 'Application');
    let me = this;
    // if(data.flatType === 'emergency'){
    //   return Promise.resolve('紧急工单无需同步');
    // }
    if (typeof data.cabinetModule === 'undefined' && typeof data.cabinet === 'undefined') {
      if (data.flatType === 'storageGun' || data.flatType === 'storageBullet') {
        return Promise.resolve('非取工单无需同步');
      } else {
        if (method !== 'destroy' && data.flatType !== 'emergency') {
          log.error('缺少模块或者柜机信息', 'Application');
          return Promise.reject('缺少模块或者柜机信息');
        }
      }
    }
    if (data.status === 'timeout' && method === 'update' && data.cabinet !== sails.config.cabinet.id) {
      log.debug('超时工单由对应柜机自行触发', 'Application');
      return Promise.reject('超时操作由工单对应柜机自行触发');
    }
    return co(function* () {
      let isMqttServer = yield System.findOne({ key: 'isMqttServer' });
      if (isMqttServer && isMqttServer.value == 'true' && data.remote === true) return yield Promise.resolve('远程工单无需同步');
      let target = {};
      if (data.flatType === 'storageBullet' || data.flatType === 'storageGun' || data.flatType === 'emergency') {
        log.debug('存枪工单', 'Application');
        if (data.cabinet === sails.config.cabinet.id) {
          log.debug('本机器工单无需同步', 'Application');
          return yield Promise.resolve('这是本机器的工单');
        }
        target = yield Cabinet.findOne({ code: data.cabinet });
      } else if (method !== 'destroy') {
        if (!data.cabinet) {
          return yield Promise.resolve('工单没有指定柜机');
        }
        if (data.cabinet === sails.config.cabinet.id) {
          log.debug('本机模块无需同步', 'Application');
          return yield Promise.resolve('这是本机的工单');
        } else {
          target = yield Cabinet.findOne({ code: data.cabinet });
        }
      } else {
        if (data.cabinet) target = yield Cabinet.findOne({ code: data.cabinet });
        return me.sendRequest(data, model, method, target);
      }
      return me.sendRequest(data, model, method, target);
    })
  }

  gun(data, model, method) {
    log.info('Gun Sync', 'Gun');
    let me = this;
    return co(function* () {
      const ownerCabinet = data.UpdatedFrom || data.SyncFrom;
      if (!ownerCabinet || ownerCabinet === sails.config.cabinet.id) {
        log.debug('本机枪支信息无需同步', 'Gun Sync');
        return yield Promise.resolve('本机枪支信息');
      }
      let target = yield Cabinet.findOne({ code: ownerCabinet });
      return me.sendRequest(data, model, method, target);
    })
  }

  cabinetModule(data, model, method) {
    log.info('CabinetModule Sync', 'CabinetModule');
    let me = this;
    return co(function* () {
      if (data.cabinet === sails.config.cabinet.id) {
        log.debug('本机模块信息无需同步', 'CabinetModule Sync');
        return yield Promise.resolve('本机模块信息');
      }
      let target = yield Cabinet.findOne({ code: data.cabinet });
      return me.sendRequest(data, model, method, target);
    })
  }
}
