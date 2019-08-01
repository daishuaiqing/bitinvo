/**
* OptLog.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/
'use strict'
module.exports = {

  attributes: {
    object: {
      type: 'string',
      // enum: ['cabinet', 'gun', 'bullet', 'user', 'application', 'system']
    },
    objectId: {
      type: 'string'
    },
    action: {
      type: 'string'
    },
    actionType: {
      type: 'string'
    },
    logData: {
      type: 'json'
    },
    log: {
      type: 'string'
    },
    logType: {
      type: 'string',
      enum: ['warning', 'error', 'normal'],
      // 所有的警报日志类型都是warning，非法、失败、失效的操作都是error，其余都是normal.
      defaultsTo: 'normal'
    },
    gunAction: {
      type: 'string'
    },
    applicationId: {
      type: 'string'
    },
    facePic: {
      type: 'string'
    },
    fingerPrint: {
      type: 'string'
    },
    signature: {
      type: 'string'
    },
    cabinet: {
      type: 'string',
      defaultsTo: function () {
        return sails.config.cabinet.id;
      }
    },
    org: {
      model: 'org'
    },
    assets: {
      collection: 'asset'
    },
    createdBy: {
      model: 'user'
    },
    updatedBy: {
      model: 'user'
    }
  },
  beforeCreate: function (data, cb) {
    if ((data.actionType === 'admin_fingerprint_authorize_success' && !data.fingerPrint) || (data.actionType === 'admin_face_authorize_success' && !data.facePic)) {
      sails.log.error(`OptLog : before created  invalid log format !`)
      cb('错误的日志格式');
    } else {
      cb();
    }
  },
  afterCreate: function (item, cb) {
    sails.services.syncrole.Sync(item, 'optlog');
    if (item && item.action) {
      const keyWords = ['登录', '登出', '警报', '警告', '报警', '线', '变更'];
      let sendToMqttServer = true;
      for (let i in keyWords) {
        if (item.action.indexOf(keyWords[i]) > -1) {
          sendToMqttServer = false;
          break;
        }
      }
      const needSendKeyWords = ['超时未锁', '未按时', '开枪锁', '开启'];
      for (let i in needSendKeyWords) {
        if (item.action.indexOf(needSendKeyWords[i]) > -1) {
          sendToMqttServer = true;
          break;
        }
      }
      if (sendToMqttServer) sails.config.innerPubsub.emit('log', item);
    }
    cb();
  },

  afterUpdate: function (item, cb) {
    sails.services.syncrole.Sync(item, 'optlog', 'update');
    cb();
  },
};

