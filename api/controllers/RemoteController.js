'use strict';
const request = require('request');
const uuid = require('node-uuid');
const co = require('co');
const client = require('../services/Discover').client;

module.exports = {
  master(req, res, next) {
    Cabinet.findOne({ isMaster: true })
      .then((data) => {
        let option = {};
        let method = req.method;
        let pagination = req.headers.pagination;
        let onemachine = req.headers.onemachine;
        let target = req.url.replace('/master', '');
        let user = req.session.user ? req.session.user : req.user;
        let userId = user ? user.id : req.headers.userId;
        if (data && data.code == sails.config.cabinet.id) {
          //检查自己是不是主机
          return Promise.reject('本机是主机, 无法使用此接口');
        } else if (data && data.code != sails.config.cabinet.id) {
          let b64Token = 'Token ' + new Buffer(data.remoteToken).toString('base64');
          let url = `http://${data.host}:${data.port}` + target;
          return sails.services.network.proxy(url, method, req.body, b64Token, userId, pagination, onemachine);
        } else {
          return Promise.reject('没有找到主机');
        }
      })
      .then((data) => {
        sails.log.debug('Master Proxy Success');
        return res.ok(data ? data.body : '');
      })
      .catch((err) => {
        sails.log.error('Master Proxy Failed');
        if (err.body) {
          sails.log.error(err.body);
          return res.badRequest(err.body);
        } else {
          sails.log.error(err);
          return res.serverError(err);
        }
      })
  },
  peer(req, res, next) {
    co(function* () {
      let option = {}, method = req.method, pagination = req.headers.pagination;
      let uid = req.params['uid'], target = req.url.replace('/peer/' + uid, '');
      let user = req.session.user ? req.session.user : req.user;
      let masterCabinet = yield Cabinet.findOne({ isMaster: true })
      let targetCabinet = req.body ? req.body.targetCabinet : undefined;
      if (masterCabinet.id === sails.config.cabinet.id) {
        //master method
        targetCabinet = yield Cabinet.findOne({ code: uid });
        if (!targetCabinet) {
          return yield Promise.reject('主机数据库中不存在该机器');
        }
      } else if (!targetCabinet) {
        //slave method
        try {
          let raw = yield client.get(`cabinet/${uid}`);
          let cabinet = JSON.parse(raw.node.value);
          targetCabinet = cabinet;
        } catch (err) {
          if (err.errorCode == '100') {
            sails.log.error('不存在的');
            return yield Promise.reject('ETCD表中无该柜机');
          }
        }
      }
      if (!targetCabinet || !targetCabinet.remoteToken) {
        sails.log.error('ETCD数据未储存remoteToken');
        if (masterCabinet.id === sails.config.cabinet.id) {
          sails.services.etcd.requestNewToken(targetCabinet, masterCabinet);
          return yield Promise.reject('没有远程访问权限,将重新获取,请稍后再尝试');
        } else {
          return yield Promise.reject('没有访问的权限');
        }
      }
      let Token = 'Token ' + new Buffer(targetCabinet.remoteToken).toString('base64');
      let url = `http://${targetCabinet.host}:${targetCabinet.port}` + target;
      return sails.services.network.proxy(url, method, req.body, Token, undefined, pagination);
    })
      .then((data) => {
        sails.log.debug('Peer Proxy Success');
        return res.ok(data ? data.body : data);
      })
      .catch((err) => {
        sails.log.error('Peer Proxy Finish: Failed');
        if (err.body) {
          sails.log.error(err.body);
          return res.badRequest({ error: '访问过程出现错误' });
        } else if (typeof err === 'string') {
          sails.log.error(err);
          return res.serverError({ error: err });
        } else {
          sails.log.error(err);
          return res.serverError({ error: '服务器错误' });
        }
      })
  },
  org(req, res, next) {
    let id = req.params.id;
    if (!id) { return res.badRequest({ error: 'Need Org Id' }) };
    Org.findOne({ id: id })
      .then((targetOrg) => {
        if (!targetOrg.host || !targetOrg.port) return Promise.reject('No Avaliable Target');
        if (!targetOrg.remoteToken) return Promise.reject('No Avaliable Token');
        let method = req.method;
        let Token = 'Token ' + new Buffer(targetOrg.remoteToken).toString('base64');
        let target = req.url.replace('/remote/org/' + id, '');
        let user = req.session.user ? req.session.user : req.user;
        let url = `http://${targetOrg.host}:${targetOrg.port}`.concat(target);
        return sails.services.network.proxy(url, method, req.body, Token, user.id);
      })
      .then((data) => {
        return res.ok(data.body);
      })
      .catch((err) => {
        return res.badRequest({ error: err });
      })
  },
  restartPolo(req, res, next) {
    try {
      sails.services.discovery.restart();
      return res.ok('发送重启POLO成功');
    } catch (err) {
      sails.log.error(err);
      return res.serverError({ error: err.message });
    }
  },
  NewSync(req, res, next) {
    let data = req.body.data;
    let tag = req.body.tag;
    let source = req.body.source;
    let model = sails.models[tag];
    for (let e of data) {
      if (!e.SyncFrom) {
        e.SyncFrom = source;
      }
      model.findOrCreate({ id: e.id }, e)
        .then((suc) => {
          sails.log.debug('Create/Find Sync Item Success');
        })
        .catch((err) => {
          sails.log.error('Error in DB');
          sails.log.error(error.message);
        })
    }
  },

  requestNewToken(req, res, next) {
    let masterInfo = req.body.masterInfo;
    if (!masterInfo) return res.badRequest({ error: '没有数据' });
    sails.log.verbose(masterInfo);
    co(function* () {
      let localMaster = yield Cabinet.findOne({ id: masterInfo.id, isMaster: true });
      if (!localMaster) {
        return res.badRequest({ error: '没有对应主机存在' });
      } else {
        let dummyUser = yield User.findOne({ username: sails.config.cabinet.id });
        if (!dummyUser) {
          sails.log.verbose('No dummy user,need create new one');
          let remoteToken = uuid.v4();
          yield User.create({ username: sails.config.cabinet.id, token: remoteToken, isDummy: true });
          return res.ok({ token: remoteToken });
        } else {
          sails.log.verbose('Already have dummy user');
          if (dummyUser.token) {
            return res.ok({ token: dummyUser.token });
          } else {
            sails.log.verbose('Dummy user have not token, regenerator');
            let remoteToken = uuid.v4();
            yield User.update({ username: sails.config.cabinet.id }, { token: remoteToken });
            return res.ok({ token: remoteToken });
          }
        }
      }
    })
      .catch((err) => {
        sails.log.error(err);
        if (typeof err === 'string') {
          return res.badRequest({ error: err });
        } else {
          return res.serverError({ error: err });
        }
      })
  },
  checkRemoteMaster(req, res) {
    co(function* () {
      try {
        let localCabinet = yield Cabinet.findOne({ isLocal: true });
        let remoteMaster = yield Cabinet.findOne({ isLocal: false, isMaster: true });
        return yield Promise.resolve({ hasRemoteMaster: remoteMaster ? true : false, localCabinetCode: localCabinet.code });
      } catch (err) {
        return yield Promise.reject(err);
      }
    }).then((data) => {
      return res.ok(data);
    }).catch((err) => {
      sails.log.error(`#### RemoteController : checkRemoteMaster error ${err} ####`);
      return res.serverError(err);
    })
  }
}
