// Camera services
'use strict'
const _ = require('lodash')
const uuid = require('node-uuid');
const FifoClient = require('./FifoClient');
const Promise = require('bluebird');
const fs = require('fs');
const mkdirp = require('mkdirp');
const root = sails.config.asset.path;
const applicationPath = sails.config.asset.applicationPath;
var onCompleteDefault = function (data) {
  sails.log.debug(' ##### CameraService:onComplete #### ');
  sails.log.debug(data);
}

var onErrorDefault = function (err) {
  sails.log.debug(' ##### CameraService:onError #### ');
  sails.log.error(err);
}

var createOptLog = function (data) {
  OptLog.create(data)
    .exec(function (err) {
      if (err) {
        sails.log.error(' #### SystemAlarmHook :createOptLog  adding OptLog fails');
        sails.log.error(err);
      }
    });
}

var pathGenerator = function (root) {
  let buf = new Buffer(root, 'ascii');
  let count = 1, ebyte = '0x', arr = [], localArr = [];
  for (let i = 0; i < buf.length; i++) {
    if (localArr.length == 4) {
      localArr.reverse();
      ebyte += localArr.join('');
      arr.push(ebyte);
      ebyte = '0x';
      localArr = [];
    }
    localArr.push(buf[i].toString(16));
    if (i == buf.length - 1 && localArr.length < 4) {
      let need = 4 - localArr.length;
      for (let j = 1; j < need + 1; j++) {
        localArr.push('00')
      }
      localArr.reverse();
      ebyte += localArr.join('');
      arr.push(ebyte)
    } else if (i == buf.length - 1 && localArr.length == 4) {
      localArr.reverse();
      ebyte += localArr.join('');
      arr.push(ebyte);
      arr.push('0x00000000');
    }
  }
  return arr;
}

let addVideo = function (name, path, type, isLogin) {
  return new Promise(
    function (resolve, reject) {
      sails.log.debug(' #### CameraService:addVideo ####');

      let userId = sails.config.systemOptId;
      Asset.create({
        name: name,
        path: path,
        type: type,
        createdBy: userId,
        updatedBy: userId
      })
        .exec(function (err, video) {
          if (err) {
            sails.log.error(' #### CameraService:addVideo  adding video fails');
            sails.log.error(err);
            return reject(err);
          }

          sails.log.debug(' #### CameraService:addVideo created successfully ####');
          //上传视频到看板
          setTimeout(() => {
            sails.services.syncfile.upload(path);
          }, type === 'video' ? 61000 : 500);
          if (!isLogin) {
            createOptLog({
              object: 'asset',
              action: '柜机操作',
              log: '柜机操作记录图像记录',
              logType: 'normal',
              objectId: video.id,
              assets: [video.id],
              createdBy: userId,
              updatedBy: userId
            });
          }
          resolve(video);
        });
    }
  )
}

let addApplicationAsset = function (applicationId, name, path, retry, retryAssetId) {
  sails.log.debug(' #### CameraService:addApplicationAsset ####');
  let userId = sails.config.systemOptId;
  Asset.create({
    name: name,
    path: path,
    type: 'image',
    status: 'ready',
    createdBy: userId,
    updatedBy: userId
  })
    .exec(function (err, image) {
      if (err) {
        sails.log.error(' #### CameraService:addApplicationAsset  adding images fails');
        sails.log.error(err);
        return err;
      }
      //上传工单图片
      sails.services.syncfile.upload(path);
      sails.log.debug(' #### CameraService:addApplicationAsset created successfully ####');
      if (retry) {
        ApplicationCaptured.findOne({ assetId: retryAssetId }).exec((err, rs) => {
          if (err || !rs) {
            sails.log.error(`#### Camera Service : find retry asset failed ####`);
            sails.services.message.local({
              topic: 'ApplicationCapture',
              value: { info: '没有找到对应的附件', imageId: image.id, status: 'failed' }
            });
          } else {
            ApplicationCaptured.update({ assetId: retryAssetId }, { assetId: image.id }).exec((err, rs) => {
              if (err) {
                sails.log.error(`#### update ApplicationCaptured record faild ${err} ####`);
                sails.services.message.local({
                  topic: 'ApplicationCapture',
                  value: { info: '更新数据库失败', imageId: image.id, status: 'failed' }
                });
              }
              sails.services.message.local({
                topic: 'ApplicationCapture',
                value: { info: '申请扫描成功', imageId: image.id, status: 'success' }
              });
            })
          }
        })
      } else {
        ApplicationCaptured.create({ applicationId: applicationId, assetId: image.id }).exec((err, rs) => {
          if (err) {
            sails.log.error(`#### create ApplicationCaptured record faild ${err} ####`);
            sails.services.message.local({
              topic: 'ApplicationCapture',
              value: { info: '更新数据库失败', imageId: image.id, status: 'failed' }
            });
          }
          sails.services.message.local({
            topic: 'ApplicationCapture',
            value: { info: '申请扫描成功', imageId: image.id, status: 'success' }
          });
        })
      }
    });

}

let updateVideo = function (videoId) {
  return new Promise(
    function (resolve, reject) {
      sails.log.debug(' #### CameraService:updateVideo update video status ####');
      let userId = sails.config.systemOptId;
      Asset.update({ id: videoId }, {
        status: 'ready',
        createdBy: userId,
        updatedBy: userId
      })
        .exec(function (err, video) {
          if (err) {
            sails.log.error(' #### CameraService:updateVideo  adding video fails');
            sails.log.error(err);
            return reject(err);
          }
          sails.log.debug(' #### CameraService:updateVideo update video status success ####');

          resolve();
        });
    }
  )
}

let getFolderPath = function (applicationPath) {
  return new Promise(
    function (resolve, reject) {
      let date = new Date();
      let folder = [applicationPath ? applicationPath : root, date.getFullYear(), 1 + date.getMonth(), date.getDate()].join('/');
      fs.exists(folder, (exists) => {
        sails.log.debug(' #### CameraService:getFolderPath checking folder exists ####');
        if (!exists) {
          sails.log.debug(' #### CameraService:getFolderPath folder is not there yet ####');
          mkdirp(folder, (err) => {
            if (err) {
              sails.log.error(' #### CameraService:getFolderPath checking folder exists fails ####');
              sails.log.error(err);
              reject(err);
            }
            else {
              sails.log.debug(' #### CameraService:getFolderPath folder is created ####');
              resolve(folder);
            }
          });
        }
        else {
          sails.log.debug(' #### CameraService:getFolderPath folder is existed ####');
          resolve(folder);
        }
      });
    }
  );
}

//如果摄像头正在工作，则为true， 否则为false
var onAir = false;
//高拍仪工作状态
var scannerOnAir = false;
var timer = null;
var videoId = null;
var count = 1;
module.exports = {
  capture: function (onComplete, onError, isLogin) {
    sails.log.debug(' #### CameraService:capture image start ####');

    if (onAir) {
      sails.log.debug(' #### CameraService:capture camera is in using ####');
      return { error: 'camera is in use' };
    }

    onComplete = onComplete ? onComplete : onCompleteDefault;
    onError = onError ? onError : onErrorDefault;

    let me = this;
    let code = uuid.v1().substr(0, 8);
    let fileName = code + '.jpg';
    getFolderPath()
      .then((path) => {
        let filePath = [path, fileName].join('/');
        let encodedPath = pathGenerator(filePath);

        onAir = true;

        let msgLog = FifoClient.sendFifoMessage('getCameraCapture', { path: encodedPath }, function () {
          sails.log.debug(' #### CameraService:capture getCameraCapture fifo call is done successfully ####');
          addVideo(fileName, filePath, 'image', isLogin)
            .then((video) => {
              updateVideo(video.id);
              onComplete(video);
            })
          onAir = false;
        }, onError);
      });
    for (let i = 3; i > -1; i--) {
      setTimeout(() => {
        sails.services.redis.set('onAir', i, (err, rs) => {
          if (err) sails.log.error(err);
        })
      }, (3 - i) * 1000);
    }
    return null;
  },

  startRecording: function (onComplete, onError, isLogin) {
    if (onAir) {
      sails.log.debug(' #### CameraService:startRecording camera is in using ####');
      return { error: 'camera is in use' };
    }

    onComplete = onComplete ? onComplete : onCompleteDefault;
    onError = onError ? onError : onErrorDefault;

    let me = this;

    getFolderPath()
      .then((path) => {

        let code = uuid.v1().substr(0, 8);
        let fileName = code + '.mp4';
        let filePath = [path, fileName].join('/');

        let imgFileName = code + '.jpg';
        let imgFilePath = [path, imgFileName].join('/');

        sails.log.debug(' #### CameraService:startRecording filePath is %s ####', filePath);
        sails.log.debug(' #### CameraService:startRecording img filePath is %s ####', imgFilePath);

        let encodedPath = pathGenerator(filePath);
        let encodedImgPath = pathGenerator(imgFilePath);

        onAir = true;

        FifoClient.sendFifoMessage('startCameraRecording', { path: encodedPath }, function () {
          sails.log.debug(' #### CameraService:startRecording startCameraRecording fifo call is done successfully ####');
          addVideo(fileName, filePath, 'video', isLogin)
            .then(function (video) {
              sails.log.debug(' #### CameraService:startRecording video record is inserted to DB successfully with id = %s ####', video.id);
              videoId = video.id;
              onComplete(video);
            });

          //设置10s结束
          timer = setTimeout(function () {
            me.stopRecording(function () {
              sails.log.debug(`Camera Service : auto stop recording success`)
            }, function (e) {
              sails.log.debug(`Camera Service : auto stop recording failed`)
              sails.log.error(e)
            });
          }, 10000);

          FifoClient.sendFifoMessage('getCameraCapture', { path: encodedImgPath }, function () {
            sails.log.debug(' #### CameraService:capture getCameraCapture fifo call is done successfully ####');
            //上传封面图到看板
            sails.services.syncfile.upload(imgFilePath);
          }, onError);

        }, onError);
      });
    for (let i = 15; i > -1; i--) {
      setTimeout(() => {
        sails.services.redis.set('onAir', i, (err, rs) => {
          if (err) sails.log.error(err);
        })
      }, (15 - i) * 1000);
    }
    return null;
  },
  stopRecording: function (onComplete, onError) {
    if (!onAir) {
      sails.log.debug(' #### CameraService:stopRecording camera is not in using ####');
      return onComplete({ error: 'camera is not in use' });
    }

    onComplete = onComplete ? onComplete : onCompleteDefault;
    onError = onError ? onError : onErrorDefault;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    let msgLog = FifoClient.sendFifoMessage('stopCameraRecording', {}, function () {
      if (!_.isNil(videoId)) {
        updateVideo(videoId)
          .then(function () {
            sails.log.debug(' #### CameraService:stopRecording video record is updated successfully with id = %s and status="ready"####', videoId);
          });
      }
      videoId = null;

      onAir = false;

      onComplete();
    }, onError);
    return msgLog;
  },

  captureApplication: function (applicationId, retry, retryAssetId) {
    sails.log.debug(' #### CameraService:captureApplication  start ####');

    if (scannerOnAir) {
      sails.log.debug(' #### CameraService:captureApplication scanner is in using ####');
      return { error: 'scanner is in use' };
    }

    let me = this;
    let code = uuid.v1().substr(0, 8);
    let fileName = code + '.jpg';
    getFolderPath(applicationPath)
      .then((path) => {
        let filePath = [path, fileName].join('/');
        let encodedPath = pathGenerator(filePath);

        scannerOnAir = true;

        FifoClient.sendFifoMessage('getScannerCapture', { path: encodedPath }, function () {
          sails.log.debug(' #### CameraService:capture getCameraCapture fifo call is done successfully ####');
          addApplicationAsset(applicationId, fileName, filePath, retry, retryAssetId);
          scannerOnAir = false;
        }, function (err) {
          sails.log.debug(' ##### CameraService:onError #### ');
          sails.log.error(err);
          sails.services.message.local({
            topic: 'ApplicationCapture',
            value: { info: '申请扫描失败', status: 'failed' }
          });
        });
      });
    return null;
  },

  startStream: (cb) => {

    if (onAir) {
      sails.log.debug(' #### CameraService:startCameraPreviewing camera is in using ####');

      FifoClient.sendFifoMessage('stopCameraPreviewing', {}, function (message) {
        sails.log.debug(' #### CameraService: stop streaming successfully ####');
        onAir = false;
        sails.services.message.local({
          topic: 'stopCameraPreviewing',
          value: { status: 0 }
        });
        FifoClient.sendFifoMessage('startCameraPreviewing', {}, function (message) {
          cb(null, message)
          sails.log.debug(' #### CameraService: start streaming successfully ####');
        }, function (e) {
          sails.log.debug(' #### CameraService: start streaming failed ####');
          sails.log.error(e)
          cb(e)
        });
      }, function (e) {
        sails.services.message.local({
          topic: 'stopCameraPreviewing',
          value: { status: 1 }
        });
        return cb(e)
      });

    } else {

      onAir = true

      FifoClient.sendFifoMessage('startCameraPreviewing', {}, function (message) {
        cb(null, message)
        sails.log.debug(' #### CameraService: start streaming successfully ####');
      }, function (e) {
        sails.log.debug(' #### CameraService: start streaming failed ####');
        sails.log.error(e)
        cb(e)
      });
    }

  },

  stopStream: (cb) => {

    if (!onAir) {
      sails.log.debug(' #### CameraService:stopCameraPreviewing camera is not in using ####');
      return cb(null, '摄像头未被使用')
    }

    FifoClient.sendFifoMessage('stopCameraPreviewing', {}, function (message) {
      cb(null, message)
      sails.log.debug(' #### CameraService: stop streaming successfully ####');
      onAir = false;
    }, function (e) {
      return cb(e)
    });

  },

  addApplicationAsset,
  getFolderPath
}
