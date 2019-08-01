'use strict';
const Promise = require('bluebird');
const moment = require('moment');
const soap = require('soap');
const Redis = require('../services/Redis');

const retry = 0; //上传失败重试次数

let getApp = function (data) {
  return new Promise(function (resolve, reject) {
    Application.findOne({ id: data.applicationId }).then((apps) => {
      if (!apps) {
        return reject(new Error('未找到工单记录!'));
      } else {
        if (apps.status === 'approved') {
          data.gunNum = 1;
          data.bulletNum = apps.num || 0;
        } else {
          data.gunNum = 0;
          data.bulletNum = 0;
          data.bulletType = 0;
          data.returnApplication = true;
        }
        data.time = getTime();
        data.applicant = apps.applicant; //申请人ID
        data.cms = apps.cabinetModule;
      }
      resolve(data);
    }).catch((err) => {
      return reject(err);
    })
  })
};

let getModule = function (data) {
  return new Promise(function (resolve, reject) {
    if (data.returnApplication) return resolve(data);
    const moduleIds = data.cms.split(',');
    CabinetModule.find({ id: moduleIds }).then((modules) => {
      if (!modules || modules.length === 0) {
        return reject({ error: '没有找到对应的模块, 上传开柜信息失败' });
      } else {
        if (modules[0].type === 'gun') {
          data.gunNum = modules.length;
          data.bulletType = 0;
          data.bulletNum = 0;
          resolve(data);
        } else {
          Bullettype.findOne({ id: modules[0].bulletType }, (err, bulletType) => {
            if (err) {
              sails.log.error(`MessageExchange: 获取子弹类型失败, 上传开柜信息失败`);
              sails.log.error(err);
              return reject(err);
            } else {
              data.gunNum = 0;
              data.bulletType = bulletType ? bulletType.code : 0;
              resolve(data);
            }
          })
        }
      }
    }).catch((e) => {
      sails.log.error(`MessageExchange: 获取模块信息失败, 上传开柜信息失败`);
      sails.log.error(e);
      reject(e);
    })
  })
};

let getID1 = function (data) {
  return new Promise(function (resolve, reject) {
    User.find({ id: data.applicant }).then((users) => {
      if (users.length === 0) {
        data.identityNumber1 = '000000000000000000';
      } else {
        data.identityNumber1 = users[0].identityNumber;
      }
      resolve(data);
    }).catch((err) => {
      return reject(err);
    })
  })
};

let getLog = function (data) {
  return new Promise(function (resolve, reject) {
    OptLog.find({
      object: 'application',
      objectId: data.applicationId,
      actionType: ['admin_password_authorize_success', 'admin_fingerprint_authorize_success']
    }).then((logs) => {
      if (logs.length === 0) {
        data.approveId = -1;
      } else {
        data.approveId = logs[0].logData.approverId || 1;
      }
      resolve(data);
    }).catch((err) => {
      return reject(err);
    })
  })
};

let getID2 = function (data) {
  return new Promise(function (resolve, reject) {
    User.find({ id: data.approveId }).then((users) => {
      if (users.length === 0) {
        data.identityNumber2 = '000000000000000000';
      } else {
        data.identityNumber2 = users[0].identityNumber;
      }
      resolve(data);
    }).catch((err) => {
      return reject(err);
    })
  })
};

let getGunType = function (data) {
  return new Promise(function (resolve, reject) {
    Gun.find({ user: data.applicant }).then((guns) => {
      if (guns.length === 0) {
        data.gunType = -1;
      } else {
        data.gunType = guns[0].type;
      }
      resolve(data);
    }).catch((err) => {
      return reject(err);
    })
  })
};

let getBulletType = function (data) {
  return new Promise(function (resolve, reject) {
    GunType.find({ id: data.gunType }).then((gunTypes) => {
      if (gunTypes.length === 0) {
        data.bulletType = -1;
      } else {
        data.bulletType = gunTypes[0].bulletType;
      }
      resolve(data);
    }).catch((err) => {
      return reject(err);
    })
  })
};

let getBulletName = function (data) {
  return new Promise(function (resolve, reject) {
    Bullettype.find({ code: data.bulletType }).then((bulletTypes) => {
      if (bulletTypes.length === 0) {
        data.bulletName = '';
      } else {
        data.bulletName = bulletTypes[0].name;
      }
      resolve(data);
    }).catch((err) => {
      return reject(err);
    })
  })
};

let getProductId = function (data) {
  return new Promise(function (resolve, reject) {
    Redis.get('productId', (err, productId) => {
      if (err) {
        sails.log.error('MessageExchange Service: 获取缓存的设备ID失败');
        sails.log.error(err);
        return reject(err);
      } else if (!productId) {
        System.find({ key: 'productId' }).then((values) => {
          if (values.length === 0) {
            sails.log.debug('productId has not been set!');
            return reject('未设置柜机编号');
          } else {
            data.productId = values[0].value;
            Redis.set('productId', data.productId, (err, rs) => {
              if (err) {
                sails.log.error('MessageExchange Service: 设置设备ID缓存失败');
                sails.log.error(err);
                return reject(err);
              } else {
                return resolve(data);
              }
            })
          }
        }).catch((err) => {
          return reject(err);
        })
      } else {
        data.productId = productId;
        resolve(data);
      }
    })
  })
}

let sendMsg = function (data) {
  return new Promise(function (resolve, reject) {
    var msg = [{
      cid: data.productId,
      identitynumber1: data.identityNumber1,
      identitynumber2: data.identityNumber2,
      time: data.time,
      qzsl: data.gunNum,
      type: '0', //没有记录异常开启
      zdlx: data.bulletType,
      zdsl: data.bulletNum
    }];
    sails.log.debug('#### MessageExchange:uploadOpenMsg ####');
    sails.log.debug(msg);

    getWsdlUrl().then((url) => {
      soap.createClient(url, function (err, client) {
        if (err) {
          sails.log.error('MessageExchange : uploadOpenMessage Create Client Failed!');
          return reject(err);
        } else {
          uploadOpenMessage(client, msg, retry);
        }
      });
    }).catch((err) => {
      sails.log.error('#### MessageExchange : sendOpenMsg Error occured in finding externalEndpoint');
      sails.log.error(err);
    })

  })
};

let uploadOpenMessage = function (client, msg, retry) {
  msg = JSON.stringify(msg);
  client.uploadOpenMessage({ msg }, function (err, result) {
    if (typeof result === 'string') {
      result = JSON.parse(result);
    }
    if (!result || err) {
      if (retry < 1) {
        return sails.log.debug('upload failed!');
      } else {
        retry -= 1;
        sails.log.debug('upload failed, retry...');
        uploadOpenMessage(client, msg, retry);
      }
    } else if (result) {
      sails.log.debug(result);
      return sails.log.debug('upload succeed!');
    }
  });
};

let uploadAlarmMessage = function (client, msg, retry) {
  msg = JSON.stringify(msg);
  client.uploadAlarmMessage({ msg }, function (err, result) {
    if (typeof result === 'string') {
      result = JSON.parse(result);
    }
    if (!result || err) {
      if (retry < 1) {
        return sails.log.debug('upload failed!');
      } else {
        retry -= 1;
        sails.log.debug('upload failed, retry...');
        uploadAlarmMessage(client, msg, retry);
      }
    } else if (result) {
      sails.log.debug(result);
      return sails.log.debug('upload succeed!');
    }
  });
}

let getTime = function () {
  return moment().format('YYYY-MM-DD HH:mm:ss');
}

const getWsdlUrl = function () {
  return new Promise(function (resolve, reject) {
    Redis.get('externalEndpointWsdl', (err, externalEndpointWsdl) => {
      if (err) {
        sails.log.error('MessageExchange Service: 获取缓存的wsdl地址失败');
        sails.log.error(err);
        return reject(err);
      } else if (!externalEndpointWsdl) {
        System.findOne({ key: 'externalEndpointWsdl' }).then((sys) => {
          if (!sys) {
            sails.log.debug('externalEndpointWsdl has not been set!');
            return reject('未设置wsdl地址');
          } else {
            Redis.set('externalEndpointWsdl', sys.value, (err, rs) => {
              if (err) {
                sails.log.error('MessageExchange Service: 设置wsdl地址缓存失败');
                sails.log.error(err);
                return reject(err);
              } else {
                return resolve(sys.value);
              }
            })
          }
        }).catch((err) => {
          return reject(err);
        })
      } else {
        resolve(externalEndpointWsdl);
      }
    })
  })
}

let sendErrMsg = function (data) {
  return new Promise(function (resolve, reject) {
    var msg = [{
      cid: data.productId,
      identitynumber1: 0,
      identitynumber2: 0,
      time: getTime(),
      qzsl: 0,
      type: '1', //异常开启
      zdlx: 0,
      zdsl: 0
    }];
    sails.log.debug('#### MessageExchange:uploadOpenMsg ####');
    sails.log.debug(msg);

    getWsdlUrl().then((url) => {
      soap.createClient(url, function (err, client) {
        if (err) {
          sails.log.error('MessageExchange : uploadErrMsg Create Client Failed!');
          return reject(err);
        } else {
          uploadOpenMessage(client, msg, retry);
        }
      });
    }).catch((err) => {
      sails.log.error('#### MessageExchange : sendErrMessage Error occured in finding externalEndpoint');
      sails.log.error(err);
    });
  })
}

let sendAlarmMsg = function (data) {
  return new Promise(function (resolve, reject) {
    var msg = [{
      cid: data.productId,
      alarmcontent: data.log,
      time: getTime()
    }];
    sails.log.debug('#### MessageExchange:uploadAlarmMsg ####');
    sails.log.debug(msg);

    getWsdlUrl().then((url) => {
      soap.createClient(url, function (err, client) {
        if (err) {
          sails.log.error('MessageExchange : uploadAlarmMessage Create Client Failed!');
          return reject(err);
        } else {
          uploadAlarmMessage(client, msg, retry);
        }
      });
    }).catch((err) => {
      sails.log.error('#### MessageExchange : sendAlarmMsg Error occured in finding externalEndpoint');
      sails.log.error(err);
    })
  })
}
module.exports = {
  uploadOpenMsg: function (data, status) {
    if (status) {
      sails.log.debug('异常开门！')
      Promise.resolve(data)
        .then(getProductId)
        .then(sendErrMsg)
        .catch((err) => {
          sails.log.error(err);
        })
      return;
    }
    Promise.resolve(data)
      .then(getApp)
      .then(getModule)
      .then(getID1)
      .then(getLog)
      .then(getID2)
      //  .then(getGunType)
      //  .then(getBulletType)
      //  .then(getBulletName)
      .then(getProductId)
      .then(sendMsg)
      .catch((err) => {
        sails.log.error(err);
      })
  },

  uploadAlarmMsg: function (data) {
    Promise.resolve(data)
      .then(getProductId)
      .then(sendAlarmMsg)
      .catch((err) => {
        sails.log.error(err);
      })
  },

  testUploadOpen: function () {
    // var msg = [{
    //   cid: data.productId,
    //   identitynumber1: data.identityNumber1,
    //   identitynumber2: data.identityNumber2,
    //   time: data.time,
    //   qzsl: data.gunNum,
    //   type: '0', //没有记录异常开启
    //   zdlx: data.bulletType,
    //   zdsl: data.bulletNum
    // }];
    sendMsg({
      'productId': '1310000000263',
      'identityNumber1': '111111111111111111',
      'identityNumber2': '111111111111111111',
      'time': getTime(),
      'gunNum': '2',
      'type': '0',
      'bulletType': '1103',
      'bulletNum': '2'
    }).then((data) => {
      sails.log.debug(`MESSAGEEXCHANGE: SEND TEST MESSAGE SUCCESS`);
      sails.log.debug(data);
    }).catch((e) => {
      sails.log.debug(`MESSAGEEXCHANGE: SEND TEST MESSAGE FAILED`);
      sails.log.debug(e);
    })
  },

  testUploadAlarm: function () {
    // var msg = [{
    //   cid: data.productId,
    //   alarmcontent: data.log,
    //   time: getTime()
    // }];
    sendAlarmMsg({
      'productId': '1310000000263',
      'log': '这是测试警报消息'
    }).then((data) => {
      sails.log.debug(`MESSAGEEXCHANGE: SEND TEST MESSAGE SUCCESS`);
      sails.log.debug(data);
    }).catch((e) => {
      sails.log.debug(`MESSAGEEXCHANGE: SEND TEST MESSAGE FAILED`);
      sails.log.debug(e);
    })
  }
}