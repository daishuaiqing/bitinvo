'use strict';
const co = require('co');
const uuid = require('node-uuid');
const client = require('./Discover');
const Redis = require('./Redis');
const etcdClient = require('./Discover').client;
const moment = require('moment')
const _ = require('lodash');

let log = (info) => {
  sails.log.debug(` #### Cabinet Service : ${info} #### `);
}

let clean = (id) => {
  co(function* () {
    id = `*${id}*`;
    let res = yield Redis.sscanAsync('broadcastList', 100, 'match', id)
    if (res.length > 0) {
      let data = res[1][0];
      let deleted = yield Redis.sremAsync('broadcastList', data);
      if (deleted === 1) {
        sails.log.verbose('Delete uncreated cabinet from redis queue successed');
      } else if (deleted === 0) {
        sails.log.verbose('Delete uncreated cabinet from redis queue failed');
      }
    } else {
      sails.log.error('Redis中没有要删除的数据');
    }
  })
    .catch((err) => {
      sails.log.error(err);
    })
}

const transaction = function (code) {

}

/**
 * 现在用于主机发送给从机信息让其加入网络
 */
exports.doHandshake = (req, res) => {
  let id = req.body.id;
  if (!id) {
    return res.badRequest({ error: 'No avaliable id' });
  }
  let rawInfo = req.body;
  if (typeof rawInfo.master === 'undefined' && Boolean(rawInfo.master)) {
    rawInfo.isMaster = true;
  }
  delete rawInfo.master;
  delete rawInfo.isLocal;
  co(function* () {
    log(`Ready To Handshake with ${id}`);
    let cabinetExist = yield Cabinet.findOne({ id: id });
    if (cabinetExist) return yield Promise.resolve('Exist');
    let dummyUser = yield User.findOne({ username: id });
    //Create Dummy User Or Update;
    if (dummyUser) {
      clean(id);
      return yield Promise.resolve('Exist');
    }
    let selfCabinet = yield Cabinet.findOne({ isLocal: true });
    let url = `http://${rawInfo.host}:${rawInfo.port}/cabinet/handshake`;
    selfCabinet.isLocal = false;
    delete selfCabinet.localId;
    let body = {
      cabinet: selfCabinet
    };
    let res = yield sails.services.network.proxy(url, 'POST', body);
    let recieveToken = res.body;
    rawInfo.remoteToken = recieveToken;
    log('Register new dummy user');
    yield User.register({ username: id, password: id, isDummy: true });
    if (rawInfo.name === '本地柜机') {
      rawInfo.name = '远程柜机';
    }
    log('Create new cabinet');
    rawInfo.isAlive = true;
    let created = yield Cabinet.create(rawInfo);
    return yield Promise.resolve(created);
  })
    .then((data) => {
      if (typeof data === 'object') {
        sails.log.info('Finish HandShake');
        clean(data.id);
        return res.ok();
      } else if (typeof data === 'string') {
        sails.log.info('Exist');
        return res.badRequest({ error: '该柜机已经添加' });
      } else {
        sails.log.error('Nothing Update In HandShake');
        res.badRequest({ error: '没有对象' });
      }
    })
    .catch((err) => {
      if (err.body) { sails.log.error(err.body) }
      else sails.log.error(err);
      return res.serverError(err);
    })
}

exports.recieveHandShake = (req, res) => {
  log('Recieve HandShake Request');
  let cabinetInfo = req.body.cabinet;
  if (!cabinetInfo) return res.badRequest({ error: 'Arguments Not Avaliable' });
  let cabinetId = cabinetInfo.id;
  co(function* () {
    let self = yield Cabinet.findOne({ isLocal: true });
    let local = yield Cabinet.findOne({ id: cabinetId });
    let target = {};
    if (!local) {
      log('Create new cabinet');
      if (cabinetInfo.name === '本地柜机') {
        cabinetInfo.name = '远程主机';
      };
      cabinetInfo.isAlive = true;
      target = yield Cabinet.create(cabinetInfo);//May report error in future
    } else {
      log('Update exist cabinet');
      target = yield Cabinet.update({ id: cabinetId }, { isAlive: true });
    }
    let userInfo = yield User.findOne({ username: cabinetId });
    let newToken = uuid.v4();
    if (!userInfo) {
      log('Create new dummy user');
      let dummyUser = yield User.register({ username: cabinetId, password: cabinetId, isDummy: true, token: newToken });
    } else {
      log('Update exist dummy user');
      let updated = yield User.update({ username: cabinetId }, { token: newToken });
    }
    if (typeof self.etcdCode === 'undefined' || self.etcdCode === null) {
      self.etcdCode = process.pid.toString(16) + Math.random().toString(16).substr(2);
      yield Cabinet.update({ id: self.id }, { etcdCode: self.etcdCode });
    }
    sails.services.etcd.startSlave(self, target);
    log('complete process ready to return new remoteToken');
    return yield Promise.resolve(newToken);
  })
    .then((token) => {
      try {
        sails.services.broadcast.close();
      } catch (err) {
        sails.log.error(err);
      }
      res.ok(token);
    })
    .catch((err) => {
      sails.log.error(err);
      res.serverError({ error: err.message });
    })
}

exports.checkAlive = function () {
  co(function* () {
    log('Start check cabinet alive');
    let self = yield Cabinet.findOne({ isLocal: true });
    let list = yield Cabinet.find({ isLocal: false });
    if (list.length === 0) {
      log('No other cabinet');
      return;
    }
    for (let cabinet of list) {
      let url = `http://${cabinet.host}:${cabinet.port}/cabinet/checkAlive`;
      try {
        yield sails.services.network.proxy(url, 'POST', self);
        yield Cabinet.update({ code: cabinet.code }, { isAlive: true });
      } catch (err) {
        sails.log.error('检查Alive时发生错误');
        if (err.errno === 'ECONNREFUSED') {
          sails.log.error(`无法连接到IP为${cabinet.host}的柜机`);
          yield Cabinet.update({ code: cabinet.code }, { isAlive: false });
        }
        if (err.body) {
          sails.log.error(err.body);
        } else {
          sails.log.error(err);
        }
      }
    }
    log('Check cabinet alive finish');
  })
    .catch((err) => {
      sails.log.error(err);
    })
}

exports.count = function (type, cb) {
  let rs = [{ load: '', capacity: '' }];
  let sql = `SELECT \
    sum(\`load\`) as \`load\` \
    FROM cabinetmodule \
    WHERE \
      type ='${type}' \
    GROUP BY  \
      type`;
  let capacitySql = `select sum(\`capacity\`) as \`capacity\` from cabinetmodule where type='${type}'`;
  CabinetModule.query(sql, function (err, load) {
    if (err) {
      return cb(err);
    }
    CabinetModule.query(capacitySql, (err, capacity) => {
      if (err) {
        return cb(err);
      }
      rs[0].load = load[0] ? load[0].load : null;
      rs[0].capacity = capacity[0] ? capacity[0].capacity : null;
      cb(null, rs);
    })
  });
}

//比对验证码
exports.verifyCode = code => {
  const date = moment().format('YYYYMMDDHH')
  let _code = date * Math.PI
  _code = String(_code).slice(0, 6)
  _code = _code * moment().year() * moment().month() / moment().day()
  if (code == String(_code).slice(0, 6)) return true
  return false
}

//生成验证码
exports.getVCode = preCode => {
  let code = preCode * moment().year() * moment().month() / moment().day()
  return String(code).slice(0, 6)
}