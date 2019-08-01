'use strict';
const recieveService = require('../services/Sync/response');
const exec = require('child_process').exec;
const co = require('co');
const pubsub = sails.config.innerPubsub;

module.exports = {
  checkSync: (req, res) => {
    sails.services.fullsync.check(req, res);
  },

  recieve: (req, res) => {
    recieveService.recieve(req, res);
  },

  checkCountRecieve(req, res) {
    sails.services.sync.checkCountRecieve(req, res);
  },

  checkCountSync(req, res) {
    sails.services.sync.checkCountSync(req, res);
  },

  uploadPath(req, res) {
    System.findOne({ key: 'mqttUrl' }).exec((err, data) => {
      if (err) {
        sails.log.error('#### SyncController : find mqttUrl failed ####');
        sails.log.error(err);
        return res.serverError({ msg: '查询mqtt服务器地址失败' });
      }
      if (!data) {
        return res.badRequest({ msg: '没有设置mqtt服务器地址' });
      }
      return res.ok({ url: data.value });
    })
  },

  file(req, res) {
    req.file('syncfile').upload({
      // don't allow the total upload size to exceed ~10MB
      maxBytes: 10000000,
      dirname: '/tmp'
    }, function (err, uploadedFile) {
      if (err) {
        sails.log.error('#### SyncController : file upload error ####');
        sails.log.error(err);
        return res.serverError({ msg: 'upload failed' });
      }
      // If no files were uploaded, respond with an error.
      if (uploadedFile.length === 0) {
        sails.log.debug('#### SyncController :  No file was uploaded ####');
        return res.badRequest({ msg: 'No file was uploaded' });
      }
      const filePath = req.query.filePath;
      const fd = uploadedFile[0].fd;
      sails.services.shellproxy.mv(fd, filePath);
      return res.ok();
    });
  },

  uploadFile(req, res) {
    const filePath = req.query.filePath;
    sails.services.syncfile.upload(filePath);
    return res.ok();
  },

  syncAssets(req, res) {
    co(function* () {
      const method = req.body.method;
      const table = req.body.table;
      const key = req.body.key;
      const data = req.body.data;
      switch (method) {
        case 'create': {
          const hasRecord = yield sails.models[table].findOne(data);
          if (!hasRecord) yield sails.models[table].create(data);
          break;
        }
        case 'update': {
          const hasRecord = yield sails.models[table].findOne(key);
          if (!hasRecord) {
            yield sails.models[table].create(Object.assign(key, data));
          } else {
            yield sails.models[table].update(key, data);
          }
          break;
        }
        case 'destroy': {
          yield sails.models[table].destroy(key);
          break;
        }
      }
      return res.ok();
    }).catch((e) => {
      sails.log.error(`#### SyncController : syncAssets failed`);
      sails.log.error(e);
      return res.serverError({ msg: '数据库操作失败' })
    })
  },
  //拉取更新
  requestUpdate(req, res) {
    const org = req.query.org;
    const date = req.query.date;
    pubsub.emit('uploadAssets', org, date);
    return res.ok({ msg: '已发送更新请求' })
  },

  //发送更新
  sendUpdate(req, res) {
    let date = req.query.date;
    if (!date) return res.badRequest({ msg: '没有指定更新日期' });
    date = new Date(date);
    res.ok();
    co(function* () {
      const assets = yield Asset.find({ createdAt: { '>=': date } });
      if (!assets || assets.length === 0) return res.ok();
      for (let i in assets) {
        sails.services.syncfile.assets('update', 'asset', { id: assets[i].id }, { name: assets[i].name, path: assets[i].path, type: assets[i].type, status: assets[i].status, md5: assets[i].md5 });
        sails.services.syncfile.upload(assets[i].path);
      }
      const aps = yield ApplicationCaptured.find({ createdAt: { '>=': date } });
      for (let i in aps) {
        sails.services.syncfile.assets('update', 'applicationcaptured', { id: aps[i].id }, { applicationId: aps[i].applicationId, assetId: aps[i].assetId });
      }
      const signs = yield Signature.find({ createdAt: { '>=': date } });
      for (let i in signs) {
        sails.services.syncfile.assets('update', 'signature', { id: signs[i].id }, { signature: signs[i].signature, user: signs[i].user, application: signs[i].application });
      }
    }).catch((e) => {
      sails.log.error(`SyncController :sendUpdate failed`);
      sails.log.error(e);
      return res.serverError({ msg: '发送更新失败' })
    })
  }
}