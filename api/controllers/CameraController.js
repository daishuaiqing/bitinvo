/**
 * CameraController
 *
 * @description :: Server-side logic for managing Cameracontrollers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
const moment = require('moment');
const fs = require('fs');
module.exports = {
  record: function (req, res, next) {
    return res.badRequest({ msg: '此方法已弃用' });
    // sails.log.debug(' ##### CameraController:record #### ');
    // if (!req.isLocal) {
    //   sails.log.error(' ##### CameraController:record forbidden access from remote #### ');
    //   return res.badRequest({ error: '不允许访问' });
    // }
    // sails.services.camera.startRecording(function () {
    //   sails.log.debug(' ##### CameraController:record start #### ');
    // });
    // res.ok({ message: '已经开始摄像' });
  },
  stop: function (req, res, next) {
    sails.log.debug(' ##### CameraController:stop #### ');
    if (!req.isLocal) {
      sails.log.error(' ##### CameraController:stop forbidden access from remote #### ');
      return res.badRequest({ error: '不允许访问' });
    }
    sails.services.camera.stopStream((err, message) => {
      if (err) {
        sails.log.error(`CameraController  : stop stream failed`)
        sails.log.error(err)
        return res.serverError({ data: err })
      } else {
        return res.ok({ message: '停止视频摄像' })
      }
    })
  },
  capture: function (req, res, next) {
    sails.log.debug(' ##### CameraController:capture #### ');
    if (!req.isLocal) {
      sails.log.error(' ##### CameraController:capture forbidden access from remote #### ');
      return res.badRequest({ error: '不允许访问' });
    }
    sails.services.camera.capture(function () {
      sails.log.debug(' ##### CameraController:record start #### ');
    });
    res.ok({ message: '已经开始拍照' });
  },

  captureApplication: function (req, res) {
    let applicationId = req.body.applicationId;
    const retry = req.body.retry === 'true' ? true : false;
    const retryAssetId = req.body.retryAssetId;
    if (!applicationId) return res.badRequest({ error: '没有Application ID' });
    if (!req.isLocal) {
      sails.log.error(' ##### CameraController:capture captureApplication access from remote #### ');
      return res.badRequest({ error: '不允许访问' });
    }
    sails.services.camera.captureApplication(applicationId, retry, retryAssetId);
    res.ok({ message: '已经开始拍照' });
  },

  upload: function (req, res) {
    const applicationId = req.query.applicationId;
    const distPath = '/tmp';
    const retry = req.body.retry === 'true' ? true : false;
    const rootPath = req.query.rootPath;
    const retryAssetId = req.query.retryAssetId;
    req.file('attachment').upload({
      // don't allow the total upload size to exceed ~10MB
      maxBytes: 10000000,
      dirname: distPath
    }, function (err, uploadedFile) {
      if (err) {
        sails.log.error('#### CameraController : uploadUpdateFile upload error ####');
        sails.log.error(err);
        return res.serverError(err);
      }
      // If no files were uploaded, respond with an error.
      if (uploadedFile.length === 0) {
        sails.log.debug('#### CameraController : uploadUpdateFile No file was uploaded ####');
        return res.badRequest('No file was uploaded');
      }
      let fd = uploadedFile[0].fd;
      const fileInfo = fd.split('/');
      let filename = fileInfo[fileInfo.length - 1];
      sails.services.camera.getFolderPath(rootPath).then((path) => {
        sails.services.shellproxy.mv(fd, path);
        let filePath = [path, filename].join('/');
        sails.services.camera.addApplicationAsset(applicationId, filename, filePath, retry, retryAssetId);
        return res.ok({ code: 'SUCCESS' })
      })
    });
  },

  startStream: function (req, res) {
    sails.services.camera.startStream((err, message) => {
      if (err) {
        return res.badRequest({ msg: err || '启动视频流失败' })
      } else {
        sails.log.debug(' ##### CameraController:record start #### ');
        sails.log.debug(message)
        if (message && message.status != 0) {
          sails.services.camera.stopRecording(function () {
            sails.log.debug(' ##### CameraController:record stop #### ');
          });
        }
        res.ok({ data: message });
      }
    })
  }
};
