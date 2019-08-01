'use strict';
let me = this;
const request = require('request');
const _ = require('lodash');
const co = require('co');
const crypto = require('crypto');
const Client = require('./Discover').client;
const syncRequest = require('./Sync/request');
me.sync = null;
me.syncQueue = {};

const fullTable = [
  'guntype', 'role', 'bullettype', 'dutyshift', 'user', 'passport', 'applicationtype', 'fingerprint'
];
let ObjKeySort = function (obj) {
  let keys = Object.keys(obj).sort();
  let result = {};
  for (let key of keys) {
    result[key] = obj[key];
  }
  return result;
}

/**
 * 纯计算chksum
 * @param {*} item 
 */
const pureSign = function (item) {
  let record = Object.assign({}, item);
  if (!record.version) record.version = 1;
  let oldVersion = record.version.toString();
  if (record.activeConnections) { delete record.activeConnections };
  if (record.roles) { delete record.roles };
  if (record.approvers) { delete record.approvers };
  if (record.processList) { delete record.processList };
  if (record.application && typeof record.application == 'object') { record.application = record.application.id };
  if (record.guns || record.guns === null) { delete record.guns };
  if (typeof record.age !== 'undefined' && typeof record.age === 'string') {
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
  record = _.pickBy(record, function (value, key) {
    if (key === 'isDummy' || key === 'isBlock' || key === 'isLocal') {
      sails.log.silly(typeof value);
      if (typeof value === 'number') {
        value = !!value;
        return { key: value };
      }
    }

    if (value !== null) {
      return { key: value };
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

function initClass() {
  co(function* () {
    let local = yield Cabinet.findOne({ isLocal: true });
    let master = yield Cabinet.findOne({ isMaster: true });
    sails.log.info('Init sync request class');
    me.sync = new syncRequest(local, master, fullTable);
  })
    .catch((err) => {
      sails.log.error('Error in Init sync request class');
      sails.log.error(err);
    })
}

exports.initClass = initClass;

exports.Sync = function (item, model, method) {
  sails.log.info('Push into syncQueue')
  if (typeof me.syncQueue[item.id] !== 'undefined' && typeof me.syncQueue[item.id].method === 'undefined') {
    sails.log.info('Create exist, merge data');
    me.syncQueue[item.id].item = Object.assign(me.syncQueue[item.id].item, item);
    delete me.syncQueue[item.id].method;
  } else {
    sails.log.info('replace exist record')
    me.syncQueue[item.id] = {
      item: item,
      model: model,
      method: method
    };
  }
}

exports.setMaster = function (master) {
  if (me.sync !== null) {
    me.sync._master = master;
  }
}

const queueChecker = setInterval(function () {
  if (me.syncQueue.length == 0) {
    return;
  };
  let cache = me.syncQueue;
  me.syncQueue = {};
  for (let e in cache) {
    let storage = cache[e];
    delete cache[e];
    trueSync(storage.item, storage.model, storage.method);
  }
}, 2 * 1000);

const trueSync = function (item, model, method) {
  if (me.sync !== null) {
    me.sync.sync(item, model, method)
      .then((res) => {
        sails.log.info('Sync Finish');
      })
      .catch((err) => {
        sails.log.error('Sync Failed');
        sails.log.error(err)
        if (typeof item.retry !== 'undefined' && item.retry >= 10) {
          sails.log.error('Attempt 10 times failed, drop it');
        } else {
          saveQueue(item, model, method);
        }
      });
  }
}


const NewSync = (code) => {
  return co(function* () {
    let findResult = yield [
      User.find({ isDummy: false, isLocal: false }),
      GunType.find(),
      Bullettype.find(),
      Role.find(),
      Passport.find({ filter: false })
    ];
    let targetCabinet = yield Cabinet.findOne({ code: code });
    let selfCabinet = yield Cabinet.findOne({ code: sails.config.cabinet.id });
    if (!targetCabinet || !targetCabinet.remoteToken) {
      return yield Promise.reject('No Target Cabinet');
    }
    let arr = [
      { data: findResult[0], tag: 'user', source: sails.config.cabinet.id },
      { data: findResult[1], tag: 'guntype', source: sails.config.cabinet.id },
      { data: findResult[2], tag: 'bullettype', source: sails.config.cabinet.id },
      { data: findResult[3], tag: 'role', source: sails.config.cabinet.id },
      { data: findResult[4], tag: 'passport', source: sails.config.cabinet.id }
    ]
    if (!selfCabinet.isMaster) {
      let cabinetModule = yield CabinetModule.find();
      arr.push({ data: cabinetModule, tag: 'cabinetmodule', source: sails.config.cabinet.id });
    }
    for (let e of arr) {
      let url = `http://${targetCabinet.host}:${targetCabinet.port}/newsync`;
      let token = 'Token ' + new Buffer(targetCabinet.remoteToken).toString('base64');
      try {
        yield sails.services.network.proxy(url, 'POST', e, token);
      } catch (err) {
        sails.log.error('向目标柜机发送全量同步时错误');
        sails.log.error(err);
      }
    }
    return Promise.resolve('Send Queue Finish');
  })
}

exports.NewSync = NewSync;

const saveQueue = (item, model, method) => {
  sails.log.verbose(' #### SyncRole : Sync : Add Error Item to Queue Start #### ')
  if (typeof item.retry === 'undefined') {
    item.retry = 1;
  } else {
    if (item.retry > 10) {
      return;
    }
    item.retry++;
  };
  sails.log.verbose(` #### SyncRole : Sync : Error Item Retry Times ${item.retry} #### `)
  const Redis = sails.services.redis;
  let key = 'SyncItem:' + item.id;
  let singleItem = {
    id: item.id,
    model: model,
    method: method,
    retry: item.retry
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
exports.saveQueue = saveQueue;

