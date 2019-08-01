'use strict'
const uploadPath = '/sync/file';
const co = require('co');
const fs = require('fs');
const Redis = require('../services/Redis');
const exec = require('child_process').exec;

exports.getSyncHost = function () {
  return new Promise((resolve, reject) => {
    co(function* () {
      //从redis获取mqtt主机地址
      //不存在则从主机请求获取, 并设置redis, 过期时间24小时
      let host = yield Redis.getAsync('syncFileHost');
      if (!host) {
        //Mqtt主机不参与同步
        let isMqttServer = yield Redis.getAsync('isMqttServer');
        if (isMqttServer === null) {
          const data = yield System.findOne({ key: 'isMqttServer' });
          isMqttServer = (data && data.value === 'true') ? 'true' : 'false'
          yield Redis.setexAsync('isMqttServer', 3600, isMqttServer);
        }
        if (isMqttServer === 'true') return resolve('self');
        const masterCabinet = yield Cabinet.findOne({ isMaster: true });
        if (!masterCabinet) return yield Promise.reject({ msg: '没有设置主机' });
        const res = yield sails.services.network.proxy(`http://${masterCabinet.host}:${masterCabinet.port}/sync/uploadPath`, 'GET');
        if (!res.body || !res.body.url) yield Promise.reject({ msg: '没有获取到mqtt服务器地址' });
        host = res.body.url;
        yield Redis.setexAsync('syncFileHost', 3600, host);
      }
      return resolve(host);
    }).catch((e) => {
      sails.log.error(`SyncFile getSyncHost failed`);
      sails.log.error(e);
      return reject(e);
    })
  })
}

exports.upload = function (filePath) {
  co(function* () {
    //不上传大小为0的文件
    try {
      const stats = fs.statSync(filePath);
      if (stats.size < 1) {
        sails.log.verbose('SyncFile: upload file size < 1');
        return;
      }
    } catch (e) {
      sails.log.error('SyncFile : upload stat file failed');
      sails.log.error(e);
      return;
    }
    const host = yield sails.services.syncfile.getSyncHost();
    if (!host) return yield Promise.reject({ msg: '没有获取到mqtt服务器地址' });
    if (host === 'self') return;
    //发送文件到文件同步接口
    const cmd = `curl -X POST -F "syncfile=@${filePath}" ${host}${uploadPath}?filePath=${filePath}`
    exec(cmd, (err, stdOut, stdErr) => {
      if (err) {
        sails.log.error(`#### SyncFile : upload failed`)
        sails.log.error(err);
      }
    })
  }).catch((e) => {
    sails.log.error(`上传资源文件失败: ${e.msg ? e.msg : e}`)
  })
}

exports.assets = function (method, table, key, data) {
  co(function* () {
    const host = yield sails.services.syncfile.getSyncHost();
    if (!host) return yield Promise.reject({ msg: '没有获取到mqtt服务器地址' });
    if (host === 'self') return;
    yield sails.services.network.proxy(`${host}/sync/syncAssets`, 'POST', { method, table, key, data });
  }).catch((e) => {
    sails.log.error(`SyncFile : assets sync failed`);
    sails.log.error(e);
  })
}

