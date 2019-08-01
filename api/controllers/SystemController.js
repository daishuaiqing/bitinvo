/**
 * SystemController
 *
 * @description :: Server-side logic for managing Systems
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict';
const localProtocol = require('../services/protocols/local');
const sm = sails.services.fifoclient.sendFifoMessage;
const _ = require('lodash');
const Promise = require('bluebird');
const validator = require('validator');
const soap = require('soap');
const http = require('http');
const fs = require('fs');
const exec = require('child_process').exec;
const csv = require('csvtojson');

var onError = function (err) {
  sails.log.error(' ##### SystemController :onError #### ');
  sails.log.error(err);
}

var updateSystem = function (dataItem, resolve, reject) {
  System.findOrCreate({ key: dataItem.key })
    .exec(function (err, record) {
      if (err) {
        sails.log.error(' #### SystemController:updatesettings update error');
        sails.log.error(err);
        return reject(err);
      }
      sails.log.debug(' #### SystemController:updatesettings find success for update');
      record.value = dataItem.value;
      System.update({ key: dataItem.key }, { value: dataItem.value }).exec(function (err, rs) {
        if (err) {
          sails.log.error(' #### SystemController:updatesettings update failed');
          sails.log.error(err);
          return reject(err);
        }
        sails.log.debug(' #### SystemController:updatesettings update success');
        resolve(record);
      })
      // record.save(function(err){
      //   if(err){
      //     sails.log.error(' #### SystemController:updatesettings update success');
      //     sails.log.error(err);
      //     return reject(err);
      //   }
      //   sails.log.debug(' #### SystemController:updatesettings update success');
      //   if(sails.services.settings[dataItem.key]){
      //     sails.log.debug(' #### SystemController:updatesettings update cache');
      //     sails.services.settings[dataItem.key] = dataItem.value;
      //   }
      //   resolve(record);
      // });
    });
}

var pathGenerator = function (path) {
  let buf = new Buffer(path, 'ascii');
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

var setAutoIp = function (dataItem, resolve, reject) {
  ShellProxy.eth0Restart();
  System.destroy({ key: 'ip' }).exec(function (err, rs) {
    if (err) {
      sails.log.error('#### SystemController : setAutoIp destory ip failed');
      sails.log.error(err);
      return reject(err);
    }
    System.destroy({ key: 'gateway' }).exec(function (err, rs) {
      if (err) {
        sails.log.error('#### SystemController : setAutoIp destory gateway failed');
        sails.log.error(err);
        return reject(err);
      }
      System.destroy({ key: 'netmask' }).exec(function (err, rs) {
        if (err) {
          sails.log.error('#### SystemController : setAutoIp destory netmask failed');
          sails.log.error(err);
          return reject(err);
        }
        updateSystem(dataItem, resolve, reject);
      });
    });
  });
}

var setFingerPrintQuality = function (reject) {
  System.findOne({ key: 'enteringQuality' })
    .then((enteringQuality) => {
      if (!enteringQuality) {
        var enteringQuality = { value: 20 };
      }
      System.findOne({ key: 'loadingQuality' })
        .then((loadingQuality) => {
          if (!loadingQuality) {
            var loadingQuality = { value: 9 };
          }
          sails.log.debug(enteringQuality, loadingQuality);
          sm('setFingerPrintQuality',
            { enteringQuality: enteringQuality.value, loadingQuality: loadingQuality.value },
            function (message) {
              if (message) {
                sails.log.debug(message);
                return;
              }
            },
            function (err) {
              onError(err);
              reject({ error: '更新阀值值失败' });
            });
        }).catch((err) => {
          sails.log.error(err);
        })
    }).catch((err) => {
      sails.log.error(err);
    })
}

let setFaceArg = function (type, value, reject) {
  switch (type) {
    case 'faceMaxRotateAngle':
      type = 'setFaceRotateAngle';
      break;
    case 'faceFuzzyThreshold':
      type = 'setFaceFuzzyThreshold';
      break;
    case 'faceBrightThreshold':
      type = 'setFaceBrightThreshold';
      break;
    case 'minLoginFaceSize':
      type = 'setFaceMinLoginSize';
      break;
    case 'faceMatchThreshold':
      type = 'setFaceMatchThreshold';
      break;
  }
  sm(type,
    { value: value },
    function (message) {
      if (message) {
        sails.log.debug(message);
        return;
      }
    },
    function (err) {
      onError(err);
      reject({ error: '设置人脸识别参数失败' });
    }
  );
}

module.exports = {

  envinfo: function (req, res) {
    sails.log.silly(' ##### SystemController:envinfo #### ');

    var query = { where: { 'key': ['temperature', 'humidity', 'connection', 'power', 'powerType', 'alcoho', 'signal', 'disk'] } };
    System.find(query)
      .exec(function (err, records) {
        if (err) return res.negotiate(err);
        return res.ok(records);
      })
  },

  resetalarm: function (req, res) {
    // if(!req.isLocal){
    //   sails.log.error(' ##### SystemController:resetalarm forbidden access from remote #### ');
    //   res.badRequest({error: '不允许访问'});
    // }

    sails.log.silly(' ##### SystemController:resetalarm #### ');

    var me = this;

    var type = req.body.type;
    var adminAuth = req.body.adminAuth;
    let prohibitionItem = req.body.prohibitionItem;
    let alarmType = req.body.alarmType;
    let peer = req.body.peer;
    let remoteReset = req.body.remoteReset;

    var handler = function (message, log) {
      sails.log.silly(' ##### SystemController:Handler #### ');
      sails.log.silly(message);

      if (message && log) {
        sails.log.silly(' #####  SystemController:handler#### ');
        sails.log.silly(message);
        // the params we pass to sails.services.fifoclient.sendFifoMessage
        var params = log.params;
        sails.log.silly(' #####  SystemController:handler  #### ');
        sails.log.silly(params);

        if (message.name === 'SGS_MESSAGE_SET_ALERT_STATE') {
          sails.log.silly(' #####  SystemController:handler - Entering SGS_MESSAGE_SET_ALERT_STATE  #### ');
        }
      }
    }
    if (remoteReset) {
      sails.log.debug(`#### This is remote reset command #####`);
      sm('setAlertState',
        {
          canId: 253,
          type: 0,
          state: 1
        },
        _.bind(handler, me),
        _.bind(onError, me)
      );
      sails.services.alarmqueue.dequeue();
      return res.ok({ info: '警报已经解除' });
    }
    if (type === 'base64') {

      var authString = new Buffer(adminAuth, 'base64').toString();

      var username = authString.split(':')[0];
      var password = authString.split(':')[1];

      sails.log.debug('authenticating', username, 'using basic auth:', req.url);

      localProtocol.login(req, username, password, function (error, user, passport) {
        if (error) {
          onError(error);
        }
        if (!user) {
          return res.status(401).json({ error: sails.__('Could not authenticate user') + username });
        }
        if (user === 'Limit') {
          return res.status(401).json({ error: sails.__('已经被禁止登录，请1分钟后再尝试') });
        }
        if (user.isAdmin && !user.isAdmin()) {
          return res.status(401).json({ error: '只有管理员才能解除报警' });
        }
        if (alarmType === 'gunovertime' || alarmType === 'bulletovertime') {
          if (user.isSuperAdmin && !user.isSuperAdmin()) {
            return res.status(401).json({ error: '只有超级管理员才能解除此报警' });
          }
        }
        sm('setAlertState',
          {
            canId: 253,
            type: 0,
            state: 1
          },
          _.bind(handler, me),
          _.bind(onError, me)
        );
        OptLog.create({
          object: 'system',
          action: '解除警报',
          log: user.alias + '解除警报',
          logType: 'warning',
          objectId: null,
          createdBy: user.id,
          updatedBy: user.id
        }).then((data) => {
          if (peer) {
            Cabinet.findOne({ code: peer }).exec((err, cabinet) => {
              if (err) {
                sails.log.error(err);
              } else if (cabinet) {
                sails.services.network.proxy(`http://${cabinet.host}/system/resetalarm`, 'POST', { remoteReset: 'true' });
              } else {
                sails.log.debug(`#### SystemController : reset peer's alarm failed , no cabinet found ####`);
              }
            })
          }
          sails.services.alarmqueue.dequeue();
          res.ok({ 'user': user.username });
        })
      });
    }
    else if (type === 'token') {
      var token = adminAuth;
      if (!token) {
        return res.status(401).json({ error: sails.__('Could not authenticate user with token') });
      } else {
        User.findOne({ token: token })
          .populate('roles')
          .exec(function (err, user) {
            if (err) {
              sails.log.debug(' #### Token authenticating fails #### ');
              sails.log.debug(err);
              req.session.authenticated = false;
              return res.status(401).json({ error: sails.__('Could not authenticate user') });
            }
            if (user && user.isAdmin && !user.isAdmin()) {
              return res.status(401).json({ error: '只有管理员才能解除报警' });
            }
            OptLog.create({
              object: 'system',
              action: '解除警报',
              log: user.alias + '解除警报',
              logType: 'warning',
              objectId: null,
              createdBy: user.id,
              updatedBy: user.id
            }).then((data) => {
              sm('setAlertState',
                {
                  canId: 253,
                  type: 0,
                  state: 1
                },
                _.bind(handler, me),
                _.bind(onError, me)
              );
              if (peer) {
                Cabinet.findOne({ code: peer }).exec((err, cabinet) => {
                  if (err) {
                    sails.log.error(err);
                  } else if (cabinet) {
                    sails.services.network.proxy(`http://${cabinet.host}/system/resetalarm`, 'POST', { remoteReset: 'true' });
                  } else {
                    sails.log.debug(`#### SystemController : reset peer's alarm failed , no cabinet found ####`);
                  }
                })
              }
              sails.services.alarmqueue.dequeue();
              res.ok({ info: '警报已经解除' });
            })
          });
      }
    }

    //设置不再提示
    /**
     * temperature
     * humidity
     * power_off
     */
    if (prohibitionItem) {
      for (let key in prohibitionItem) {
        if (prohibitionItem[key]) sails.services.nevermore.block(key);
      }
    }
  },

  settings: function (req, res) {
    sails.log.debug(' #### SystemController:settings Get infomations');

    var query = {
      where: {
        'key': ['ip', 'netmask', 'gateway', 'isAutoIp',
          'boxname', 'isMaster', 'minDutyTime', 'externalEndpointWsdl', 'restartTime', 'restartType',
          'enteringQuality', 'loadingQuality', 'clusterSize', 'syncMasterTime', 'isMqttServer', 'mqttUrl',
          'facePerception', 'faceMaxRotateAngle', 'faceFuzzyThreshold', 'faceBrightThreshold',
          'minLoginFaceSize', 'faceMatchThreshold', 'focusCabinet', 'showCount', 'includeLocalCabinet', 'quickApplication',
          'showCount', 'includeLocalCabinet', 'showGateSwitch', 'enableCam', 'title1', 'title2',
          'enableAlcohol', 'openBatch', 'disableSignature', 'enablePanel', 'enableRemotePanel', 'needMaintainCount',
          'onlyFetch', 'enableRemoteAlarm', 'isApplicationMachine', 'storageTime', 'enableFaceLog', 'adminCreateApp',
          'lockCabinet', 'remoteLockCabinet', 'ieDownloadUrl', 'videosDownloadUrl', 'enableABGun', 'productId',
          'enableApproveSign', 'enableFetchList', 'videoRecordType', 'reportLogTitle', 'adminSignature']
      }
    };
    System.find(query)
      .exec(function (err, records) {
        if (err) return res.negotiate(err);
        return res.ok(records);
      });
  },

  updatesettings: function (req, res) {
    var settings = req.body.settings;
    if (!settings) return res.badRequest('参数不能为空');
    sails.log.debug(' #### SystemController:updatesettings update infomations');
    sails.log.debug(settings);
    var promises = _.map(settings, function (dataItem, key) {
      return new Promise(function (resolve, reject) {
        switch (dataItem.key) {
          case 'ip':
            sails.log.debug('#### SystemController : ip ####');
            var ip = dataItem.value;

            if (!validator.isIP(ip)) {
              reject({ error: 'IP地址不合法' });
            }
            updateSystem(dataItem, function (rec) {
              sm('setIP',
                { ip: ip },
                function () {
                  sails.log.debug(' #### SystemController:updatesettings update ip infomations');
                },
                function (err) {
                  onError(err);
                  reject({ error: 'IP地址更新失败' });
                }
              );
              sails.services.systemconfig.setIp(ip);
              resolve(rec);
            }, reject);
            break;
          case 'netmask':
            sails.log.debug('#### SystemController : netmask ####');
            var netmask = dataItem.value;
            updateSystem(dataItem, function (rec) {
              sails.log.debug('#### SystemController : netmask set success ####');
              resolve(rec);
            }, reject);
            break;
          case 'gateway':
            sails.log.debug('#### SystemController : gateway ####');
            var gateway = dataItem.value;
            updateSystem(dataItem, function (rec) {
              sails.log.debug('#### SystemController : gateway set success ####');
              resolve(rec);
            }, reject);
            break;
          case 'minDutyTime':
          case 'boxname':
          case 'isMaster':
            sails.log.debug('#### SystemController : isMaster ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'externalEndpointWsdl':
            sails.log.debug('#### SystemController : externalEndpointWsdl ####');
            soap.createClient(dataItem.value, function (err, client) {
              if (err) {
                sails.log.error(err)
                sails.log.error('#### SystemController : updatesettings update wsdl url failed');
                sails.services.message.send2(req.session.user ? req.session.user : req.user, '信息交换接口设置失败，请检查URL或网络连接', 'user.message', 'both', '', '', '', '', '确认', '取消');
                reject(new Error('信息交换接口设置失败，请检查URL或网络连接'));
              } else {
                sails.services.redis.set('externalEndpointWsdl', dataItem.value, (err, rs) => {
                  if (err) {
                    sails.log.error('SystemController: 设置externalEndpointWsdl失败');
                    reject({ error: '设置externalEndpointWsdl缓存失败' });
                  } else {
                    updateSystem(dataItem, resolve, reject);
                  }
                })
              }
            });
            break;
          case 'time':
            sails.log.debug('#### SystemController : time ####');
            var datetime = validator.toDate(dataItem.value);
            sails.log.debug('time is %s', datetime);
            if (!datetime) {
              reject({ error: '时间不合法, 不能更新系统时间' });
            }
            sails.services.systemconfig.setRTCTime(datetime); //先设置系统时间，防止页面提示反复弹跳
            sm('setRTC',
              { datetime: datetime },
              function () {
                sails.log.debug('#### SystemController : updateSystem time ####');
                updateSystem(dataItem, resolve, reject);
              },
              function (err) {
                sails.log.error('#### SystemController: setRTC failed ####');
                onError(err);
                reject({ error: '更新系统时间失败' });
              }
            );
            break;
          case 'restartType':
            sails.log.info(dataItem.value);
            if (dataItem.value === '') {
              reject({ error: 'Empty Type' });
            }
            updateSystem(dataItem, function (rec) {
              sails.log.info('#### SystemController : restartType set success ####');
              resolve(rec);
            }, reject);
            break;
          case 'restartTime':
            sails.log.info(dataItem.value);
            if (dataItem.value === '') {
              reject({ error: 'Empty Value' });
            }
            updateSystem(dataItem, function (rec) {
              sails.log.info('#### SystemController : restartTime set success ####');
              resolve(rec);
              sails.services.systemrestart.setRestart();
            }, reject);
            break;
          case 'enteringQuality':
            sails.log.info(dataItem.value);
            updateSystem(dataItem, function (rec) {
              sails.log.info('#### SystemController: enteringQuality set success ####', rec);
              if (rec) {
                setFingerPrintQuality(reject);
              }
              resolve(rec);
            }, reject);
            break;
          case 'loadingQuality':
            sails.log.info(dataItem.value);
            updateSystem(dataItem, function (rec) {
              sails.log.info('#### SystemController: enteringQuality set success ####', rec);
              if (rec) {
                setFingerPrintQuality(reject);
              }
              resolve(rec);
            }, reject);
            break;
          case 'isAutoIp':
            if (dataItem.value === 'true') {
              sails.log.debug('#### SystemController : isAutoIp true ####');
              setAutoIp(dataItem, resolve, reject);
            } else {
              sails.log.debug('#### SystemController : isAutoIp false ####');
              updateSystem(dataItem, resolve, reject);
            }
            break;
          case 'clusterSize':
            sails.log.debug('#### SystemController : clusterSize ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'isMqttServer':
            sails.log.debug('#### SystemController : isMqttServer ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'mqttUrl':
            sails.log.debug('#### SystemController : mqttUrl ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'facePerception':
            sails.log.debug('#### SystemController : facePerception ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'syncMasterTime':
            sails.log.debug('#### SystemController : syncMasterTime ####');
            if (dataItem.value === 'true') {
              Cabinet.findOne({ isMaster: true, isLocal: true }).exec((err, rs) => {
                if (rs) {
                  reject({ error: '不能设置为与本机同步' })
                } else {
                  updateSystem(dataItem, resolve, reject);
                }
              })
            } else {
              updateSystem(dataItem, resolve, reject);
            }
            break;
          case 'faceMaxRotateAngle':
            updateSystem(dataItem, function (rec) {
              sails.log.info('#### SystemController: faceMaxRotateAngle set success ####', rec);
              if (rec) {
                setFaceArg('faceMaxRotateAngle', dataItem.value, reject);
              }
              resolve(rec);
            }, reject);
            break;
          case 'faceFuzzyThreshold':
            updateSystem(dataItem, function (rec) {
              sails.log.info('#### SystemController: faceFuzzyThreshold set success ####', rec);
              if (rec) {
                setFaceArg('faceFuzzyThreshold', dataItem.value, reject);
              }
              resolve(rec);
            }, reject);
            break;
          case 'faceBrightThreshold':
            updateSystem(dataItem, function (rec) {
              sails.log.info('#### SystemController: faceBrightThreshold set success ####', rec);
              if (rec) {
                setFaceArg('faceBrightThreshold', dataItem.value, reject);
              }
              resolve(rec);
            }, reject);
            break;
          case 'minLoginFaceSize':
            updateSystem(dataItem, function (rec) {
              sails.log.info('#### SystemController: minLoginFaceSize set success ####', rec);
              if (rec) {
                setFaceArg('minLoginFaceSize', dataItem.value, reject);
              }
              resolve(rec);
            }, reject);
            break;
          case 'faceMatchThreshold':
            updateSystem(dataItem, function (rec) {
              sails.log.info('#### SystemController: faceMatchThreshold set success ####', rec);
              if (rec) {
                setFaceArg('faceMatchThreshold', dataItem.value, reject);
              }
              resolve(rec);
            }, reject);
            break;
          case 'focusCabinet':
            sails.log.debug('#### SystemController : focusCabinet ####');
            sails.services.redis.set('focusCabinet', dataItem.value, (err, rs) => {
              if (err) sails.log.error(err);
            })
            updateSystem(dataItem, resolve, reject);
            break;
          case 'showCount':
            sails.log.debug('#### SystemController : showCount ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'includeLocalCabinet':
            sails.log.debug('#### SystemController : includeLocalCabinet ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'quickApplication':
            sails.log.debug('#### SystemController : quickApplication ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'showCount':
            sails.log.debug('#### SystemController : showCount ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'includeLocalCabinet':
            sails.log.debug('#### SystemController : includeLocalCabinet ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'showGateSwitch':
            sails.log.debug('#### SystemController : showGateSwitch ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'enableCam':
            sails.log.debug('#### SystemController : enableCam ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'title1':
            sails.log.debug('#### SystemController : title1 ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'title2':
            sails.log.debug('#### SystemController : title2 ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'enableAlcohol':
            sails.log.debug('#### SystemController : enableAlcohol ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'openBatch':
            sails.log.debug('#### SystemController : openBatch ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'disableSignature':
            sails.log.debug('#### SystemController : disableSignature ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'enablePanel':
            sails.log.debug('#### SystemController : enablePanel ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'enableRemotePanel':
            sails.log.debug('#### SystemController : enableRemotePanel ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'needMaintainCount':
            sails.log.debug('#### SystemController : needMaintainCount ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'onlyFetch':
            sails.log.debug('#### SystemController : onlyFetch ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'enableRemoteAlarm':
            sails.log.debug('#### SystemController : enableRemoteAlarm ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'isApplicationMachine':
            sails.log.debug('#### SystemController : isApplicationMachine ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'enableFaceLog':
            sails.log.debug('#### SystemController : enableFaceLog ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'adminCreateApp':
            sails.log.debug('#### SystemController : adminCreateApp ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'lockCabinet':
            sails.log.debug('#### SystemController : lockCabinet ####');
            let msg = { lockType: 'local', status: dataItem.value };
            msg = JSON.stringify(msg);
            sails.sockets.blast('lockCabinet', msg);
            updateSystem(dataItem, resolve, reject);
            break;
          case 'storageTime':
            sails.log.debug('#### SystemController : storageTime ####');
            let _storageTime = null;
            try {
              _storageTime = JSON.parse(dataItem.value);
              sails.services.shellproxy.setStorageTime(_storageTime);
              updateSystem(dataItem, resolve, reject);
            } catch (e) {
              sails.log.error('#### SystemController : storageTime parse error ####')
              sails.log.error(e)
            }
            break;
          case 'ieDownloadUrl':
            sails.log.debug('#### SystemController : ieDownloadUrl ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'videosDownloadUrl':
            sails.log.debug('#### SystemController : videosDownloadUrl ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'enableABGun':
            {
              sails.log.debug('#### SystemController : enableABGun ####');
              sails.services.redis.set('ABGunEnabled', dataItem.value.toString(), (err, rs) => {
                if (err) sails.log.error(err);
                updateSystem(dataItem, resolve, reject);
              })
              break;
            }
          case 'productId':
            sails.log.debug('#### SystemController : productId ####');
            sails.services.redis.set('productId', dataItem.value, (err, rs) => {
              if (err) {
                sails.log.error('SystemController: 设置设备ID失败');
                reject({ error: '设置设备ID缓存失败' });
              } else {
                updateSystem(dataItem, resolve, reject);
              }
            })
            break;
          case 'enableApproveSign':
            sails.log.debug('#### SystemController : enableApproveSign ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'enableFetchList':
            sails.log.debug('#### SystemController : enableFetchList ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'videoRecordType':
            sails.log.debug('#### SystemController : videoRecordType ####');
            sails.services.redis.set('videoRecordType', dataItem.value.toString(), (err, rs) => {
              if (err) sails.log.error(err);
              updateSystem(dataItem, resolve, reject);
            })
            break;
          case 'reportLogTitle':
            sails.log.debug('#### SystemController : reportLogTitle ####');
            updateSystem(dataItem, resolve, reject);
            break;
          case 'adminSignature':
            sails.log.debug('#### SystemController : adminSignature ####');
            updateSystem(dataItem, resolve, reject);
            break;
          default:
            reject({ error: '字段不合法' });
        }
      });
    });
    Promise
      .all(promises)
      .then(
        function (results) {
          sails.log.debug(' #### SystemController:updatesettings all update success and return');
          sails.log.debug(results);
          return res.ok({ info: '更新成功', rs: results });
        },
        function (err) {
          console.log(err);
          return res.badRequest({ error: '更新失败' });
        }
      );
  },
  resetDefault: function (req, res) {
    DefaultData.Reset()
      .then((data) => {
        sails.log.verbose(data);
      })
      .catch((err) => {
        sails.log.error(err);
      });
    return res.ok({ info: '重置成功' });
  },

  ipAddress: function (req, res) {
    CabinetNetworkService.getNetworkInfo(function (err, alias) {
      if (err) return res.badRequest({ error: 'ip address not found' });
      return res.ok(alias);
    })
  },

  update: function (req, res) {
    var canId = req.body.canId;
    var path = req.body.path;
    var encodedPath = pathGenerator(path);
    sails.log.silly('#### SystemController : update file path is %s####', path);
    this.handler = function (message) {
      sails.log.debug('#### SystemController : update success ####');
      var state = {
        state: message.status
      }
      return res.ok(state);
    }
    this.onError = function (err) {
      sails.log.error('#### SystemController : update error ####');
      return res.serverError(err);
    }
    sm('updateProgram', {
      canId: canId,
      path: encodedPath
    },
      _.bind(this.handler, this),
      _.bind(this.onError, this))
  },

  uploadUpdateFile: function (req, res) {
    sails.log.debug('#### SystemController : uploadUpdateFile ####');
    let distPath = '/tmp';
    req.file('updateFile').upload({
      // don't allow the total upload size to exceed ~10MB
      maxBytes: 10000000,
      dirname: distPath
    }, function (err, uploadedFile) {
      if (err) {
        sails.log.error('#### SystemController : uploadUpdateFile upload error ####');
        sails.log.error(err);
        return res.serverError(err);
      }
      // If no files were uploaded, respond with an error.
      if (uploadedFile.length === 0) {
        sails.log.debug('#### SystemController : uploadUpdateFile No file was uploaded ####');
        return res.badRequest('No file was uploaded');
      }
      let fd = uploadedFile[0].fd;
      let filename = uploadedFile[0].filename;
      let path = '/tmp/' + filename;
      ///tmp/7885a559-8425-4c37-8397-ef14cb06368f.bin
      let cmd = 'mv ' + fd + ' ' + path;
      exec(cmd, function (err, stdOut) {
        if (err) {
          sails.log.error('#### SystemController : uploadUpdateFile mv error ####');
          sails.log.error(err);
          return res.serverError('rename file failed');
        }
        sails.log.debug('#### SystemController : uploadUpdateFile uplaod success ####');
        return res.ok({
          filepath: path
        })
      })
    });
  },

  version: function (req, res) {
    sails.log.debug('#### SystemController : info ####');
    fs.readFile('version.json', function (err, data) {
      let version = {};
      let emptyVersion = {
        app: {
          tag: 'No Tag Info',
          commit: 'No Commit Id Info'
        },
        buildTime: 'No buildTime Info'
      };

      if (err) {
        sails.log.error('#### SystemController : info read version.json error ####');
        sails.log.error(err);
        version = emptyVersion;
      } else {
        try {
          version = JSON.parse(data);
        } catch (e) {
          sails.log.error('#### SystemController : version parse error ####');
          sails.log.error(e)
        } finally {
          version = version.app ? version : emptyVersion
        }
      }

      fs.readFile('/home/SGSCom/version.txt', function (err, data) {
        if (err) {
          sails.log.error('#### SystemController : info read SGSCom version error ####');
          sails.log.error(err);
          version.SGSCom = 'No Version Info';
          return res.ok(version);
        }
        let sgscomVersion = {};
        try {
          sgscomVersion = JSON.parse(data);
        } catch (e) {
          sails.log.error('#### SystemController : sgscomVersion parse error ####');
          sails.log.error(e)
        } finally {
          sgscomVersion = sgscomVersion.version ? sgscomVersion : {
            version: 'No Version Info'
          }
        }
        version.SGSCom = sgscomVersion.version;
        return res.ok(version);
      })
    })
  },

  restart(req, res) {
    let type = req.params.type;
    let time = new Date();
    if (!type) { return res.badRequest({ error: 'Need Type' }) };
    sails.log.debug(`----system restart ${type}----`);
    OptLog.create({
      object: 'system',
      action: '系统重启',
      log: '系统重启时间：' + time,
      logType: 'normal',
    }).exec((err) => {
      if (err) {
        sails.log.error(err);
      }
    })
    if (type === 'confirm') {
      sails.services.systemconfig.cleanRestart();
      sails.services.shellproxy.systemRestart();
    } else if (type === 'delay') {
      sails.services.systemconfig.cleanRestart();
      let delay = sails.config.cabinetSettings.restartDelay || 60 * 1000;
      setTimeout(function () { sails.services.systemconfig.sendRestartInfo() }, delay);
    } else {
      return res.badRequest({ error: 'Invalid Type' });
    }
  },
  //系统升级
  //传入升级URL，由升级接口返回的文件名，以及升级密码
  updateSoftware: function (req, res) {
    let requestUrl = req.body.url;
    let password = req.body.password;
    http.get(requestUrl, (response) => {
      if (response.statusCode !== 200) {
        sails.log.error('####SystemController : updateSoftware access url fail ####');
        return res.serverError('升级地址访问失败')
      }
      let updateRes = ''
      response.on('data', (data) => {
        updateRes += data;
      })
      response.on('end', () => {
        let urlPrefix = requestUrl.split('/');
        urlPrefix.pop();
        let fileName = updateRes.split(',')[0];
        let MD5 = updateRes.split(',')[1];
        let downloadUrl = urlPrefix.join('/') + '/download?filename=' + fileName;
        let downloadDir = '/tmp/' + fileName;
        let curl = 'curl -o ' + downloadDir + ' ' + downloadUrl;
        exec(curl, function (err, stdout, stderr) {
          if (err) {
            sails.log.error('####SystemController : updateSystem wget error####');
            sails.log.error(err);
            return res.serverError('文件下载失败')
          }
          sails.log.debug('#### SystemController : updateSystem file download success####');
          //downlaod finished , verify file
          let md5Cmd = 'md5sum /tmp/' + fileName;
          exec(md5Cmd, (err, stdOut) => {
            if (err) {
              sails.log.error('#### SystemController : updateSoftware MD5 error #####');
              return sails.log.error(err);
            }
            if (stdOut.split(' ')[0] === MD5) {
              sails.log.debug('#### SystemController : updateSoftware MD5 verify success ####');
              let decrypt = 'openssl des3 -in /tmp/' + fileName + ' -d -k ' + password + '|tar xvf - -C /tmp';
              exec(decrypt, function (err, stdout) {
                if (err) {
                  sails.log.error('#### SystemController : updateSystem decrypt error####');
                  sails.log.error(err);
                  return res.serverError('解压失败，检查密码是否正确');
                }
                ShellProxy.updateSystem();
                return res.ok('更新文件下载完成，正在安装...');
              })
            } else {
              sails.log.error('#### SystemController : updateSoftware MD5 verify failed ####');
              return res.serverError('文件校验失败，请检查更新文件，重新更新')
            }
          })
        });
      })
    }).on('error', (err) => {
      sails.log.error('####SystemController: updateSoftware access update url fail ####');
      sails.log.error(err);
      return res.serverError('升级地址访问失败')
    })
  },

  testCanStates: function (req, res) {
    sails.services.lock.testCanStates((err, msg) => {
      if (err) {
        sails.log.error('#### GunController : testCanStates error #####');
        sails.log.error(err);
        return res.serverError('获取Can通讯状态失败')
      }
      return res.ok(msg);
    })
  },

  getMasterTime: function (req, res) {
    sails.services.settings.getMasterTime((err, rs) => {
      if (err) return res.serverError(err);
      return res.ok(rs);
    })
  },

  importUserData: function (req, res) {
    const user = {};
    const year = new Date().getFullYear();
    req.file('userList').upload({
      // don't allow the total upload size to exceed ~10MB
      maxBytes: 10000000,
      dirname: '/tmp'
    }, function (err, uploadedFile) {
      if (!uploadedFile[0]) return res.badRequest({ code: 'NO_FILE_UPLOADED', msg: '没有上传文件' });
      const filePath = uploadedFile[0].fd;
      csv()
        .fromFile(filePath)
        .on('json', (jsonObj) => {
          if (jsonObj['警号']) {
            user.username = jsonObj['警号'];
            user.password = '123456';
            user.identityNumber = jsonObj['身份证号'];
            user.alias = jsonObj['姓名'];
            user.sex = jsonObj['身份证号'].slice(16, 17) % 2 === 0 ? 'F' : 'M';
            user.age = year - jsonObj['身份证号'].slice(6, 10);
            user.position = '5b558389-9c19-48e5-a3ee-fbcee77b6d15';
            user.phone = jsonObj['手机号'] || '13100000000';
            sails.services.passport.protocols.local.createUser(user, function (error, created) {
              if (error) {
                sails.log.error(`#### SystemController: importUserData error ${error} ####`);
              } else {
                User.update({ id: created.id }, { roles: 'efe43deb-1d44-4d36-8575-dc71f6171c9d' }).exec((err, rs) => {
                  if (err) {
                    sails.log.error(`####SystemController : importUserData Update error ${err} ####`);
                  }
                  sails.log.debug(`User ${created.username} import success`);
                })
              }
            })
          }
        })
        .on('done', (error) => {
          sails.log.debug('import user finished');
          return res.ok('user list imported');
        })
    })
  },

  wakeUp: function (req, res) {
    sails.services.shellproxy.lightUp();
    sails.log.debug('#### SystemController : wake up ####');
    return res.ok();
  },

  moduleCount: function (req, res) {
    let gun = Number(req.body.gun);
    let bullet = Number(req.body.bullet);
    let canId = Number(req.body.canId) || 253;
    this.handler = function (message) {
      sails.log.debug('#### SystemController : set moduleCount success ####');
      var state = {
        state: message.status
      }
      return res.ok(state);
    }
    this.onError = function (err) {
      sails.log.error('#### SystemController : set moduleCount error ####');
      return res.serverError(err);
    }
    sm('saveGunBulletCount', {
      canId: canId,
      counts: [gun, bullet]
    },
      _.bind(this.handler, this),
      _.bind(this.onError, this))
  },

  facePerception: function (req, res) {
    System.findOne({ key: 'facePerception' }).exec((err, rs) => {
      if (err) return res.serverError(err);
      return res.ok(rs);
    })
  },

  fetchPic: function (req, res, next) {
    let filename = req.query.filename;
    let path = `/home/ssd/fingerAndFace/${filename}.jpg`;
    fs.stat(path, (err, rs) => {
      if (err) {
        path = `/home/ssd/fingerAndFace/${filename}.bmp`;
      }
      fs.readFile(path, (err, data) => {
        if (err) {
          sails.log.error('文件不存在');
          return res.sendfile('./assets/face.png');
        }
        if (data) {
          res.sendfile(path);
        } else {
          res.sendfile('./assets/face.png');
        }
      })
    })
  },

  systemStatus: function (req, res) {
    let cabinet = req.query.cabinet;
    sails.services.redis.hget(cabinet, 'temp', (err, temp) => {
      if (err) sails.log.error(err);
      sails.services.redis.hget(cabinet, 'humi', (err, humi) => {
        if (err) sails.log.error(err);
        sails.services.redis.hget(cabinet, 'power', (err, power) => {
          if (err) sails.log.error(err);
          sails.services.redis.hget(cabinet, 'powerType', (err, powerType) => {
            if (err) sails.log.error(err);
            return res.ok({
              temp,
              humi,
              power,
              powerType
            })
          })
        })
      })
    })
  },

  alarm: function (req, res) {
    const topic = req.query.topic;
    const msg = req.query.msg;
    sails.services.message.alarm(msg, topic, 'local');
    // sails.services.message.all('ID: ' + 444 + ' 通讯失败', 'user.message', 'both');
    return res.ok();
  },

  logo: function (req, res) {
    const method = req.method;
    switch (method) {
      case 'POST': {
        //upload logo
        sails.log.debug('#### SystemController : upload logo ####');
        req.file('logo').upload({
          // don't allow the total upload size to exceed ~10MB
          maxBytes: 10000000,
          dirname: '/tmp'
        }, function (err, uploadedFile) {
          if (err) {
            sails.log.error('#### SystemController : logs upload error ####');
            sails.log.error(err);
            return res.serverError(err);
          }
          // If no files were uploaded, respond with an error.
          if (uploadedFile.length === 0) {
            sails.log.debug('#### SystemController : uploadUpdateFile No file was uploaded ####');
            return res.badRequest('No file was uploaded');
          }
          const fd = uploadedFile[0].fd;
          const filename = uploadedFile[0].filename;
          const suffix = filename.split('.')[1];

          const logoBuf = fs.readFileSync(fd)
          const URI = `data:image/${suffix};base64,` + logoBuf.toString('base64');
          System.findOne({ key: 'logo' }).exec((err, rs) => {
            if (err) {
              return res.serverError({ code: 'DBERROR', msg: err })
            }
            if (rs && rs.value) {
              rs.value = URI;
              rs.save();
              return res.ok({
                dataURI: URI
              })
            } else {
              System.create({ key: 'logo', value: URI }).exec((err, rs) => {
                if (err) {
                  return res.serverError({ code: 'DBERROR', msg: err })
                }
                return res.ok({
                  dataURI: URI
                })
              })
            }
          })
        });

        break;
      }
      case 'GET': {
        System.findOne({ key: 'logo' }).exec((err, rs) => {
          if (err) {
            return res.serverError({ code: 'DBERROR', msg: err })
          }
          if (!rs || !rs.value) {
            return res.notFound({ code: 'NOLOGO' })
          }
          return res.ok({
            dataURI: rs.value
          })
        })
      }
    }
  },

  downloadFile: (req, res) => {
    const path = req.query.path;
    res.download(path);
  },

  alarmConfig: (req, res) => {
    const method = req.method;

    switch (method) {
      case 'GET': {
        System.findOne({ key: 'alarmConfig' }).exec((err, rs) => {
          if (err) return res.serverError(err);
          if (!rs) return res.badRequest({ code: 'NOT_SET_YET' })
          return res.ok(rs.value);
        })
        break;
      }
      case 'POST': {
        const applyToAll = req.body.applyToAll;
        if (applyToAll === 'true') {
          System.findOne({ key: 'alarmConfig' }).exec((err, ac) => {
            if (err) return res.serverError(err);
            if (!ac || !ac.value) return res.badRequest({ code: 'NOT_SET_YET' });
            sails.services.alarm.apply(ac.value, (err, rs) => {
              if (err) return res.serverError(err);
              return res.ok(rs);
            });
          })
        } else {
          const config = req.body;
          delete config.applyToAll;
          System.findOne({ key: 'alarmConfig' }).exec((err, ac) => {
            if (err) return res.serverError(err)
            if (!ac) {
              System.create({ key: 'alarmConfig', value: JSON.stringify(config) }).exec((err, rs) => {
                if (err) return res.serverError(err);
                return res.ok(rs);
              })
            } else {
              System.update({ key: 'alarmConfig' }, { value: JSON.stringify(Object.assign(JSON.parse(ac.value), config)) }).exec((err, rs) => {
                if (err) return res.serverError(err);
                return res.ok(rs);
              })
            }
          })
        }
        break;
      }
      case 'DELETE': {
        System.destroy({ key: 'alarmConfig' }).exec((err, rs) => {
          if (err) return res.serverError(err);
          return res.ok(rs);
        });
        break;
      }
      default: {
        return res.badRequest({ code: 'NO_SUCH_METHOD' });
      }
    }
  },

  ping: (req, res) => {
    const ip = req.query.ip;
    if (!ip) return res.badRequest({ code: 'NO_ARG', msg: '需要填写IP' });
    const cmd = `ping -c 5 -i 1 ${ip}`;
    exec(cmd, { shell: '/bin/bash' }, (err, stdOut, stdErr) => {
      return res.ok({ code: 'success', data: stdOut ? stdOut : stdErr, msg: '执行成功' })
    })
  },

  resetUUID: function (req, res) {
    sails.services.shellproxy.resetUUID();
    sails.log.info('#### SystemController : reset uuid ####');
    return res.ok({ code: 'success', msg: '已重置UUID, 正在应用设置' });
  },
  /**
   * 通过看板锁定机构
   * @param {*} req
   * @param {*} res
   */
  lockCabinet: (req, res) => {
    const status = req.query.status;
    let msg = {
      lockType: 'remote',
      status
    }
    msg = JSON.stringify(msg);
    sails.sockets.blast('lockCabinet', msg);
    System.findOne({ key: 'remoteLockCabinet' }).exec((err, setting) => {
      if (err) {
        sails.log.error(`#### SystemControll : lockCabinet query config failed`);
        sails.log.error(err);
        return res.serverError({ msg: '获取远程锁定状态失败' })
      }
      if (setting) {
        if (setting.value != status) {
          System.update({ key: 'remoteLockCabinet' }, { value: status }).exec((err, rs) => {
            if (err) {
              sails.log.error('#### SystemController: lockCabinet update status failed');
              sails.log.error(err);
              return res.serverError({ msg: '更新远程锁定状态失败' })
            }
            return res.ok();
          })
        } else {
          return res.ok();
        }
      } else {
        System.create({ key: 'remoteLockCabinet', value: status }).exec((err, rs) => {
          if (err) {
            sails.log.error(`#### SystemController : lockCabinet create config failed`);
            sails.log.error(err);
            return res.serverError({ msg: '更新远程锁定状态失败' })
          }
          return res.ok();
        })
      }
    })
  },

  restart: (req, res) => {
    const type = req.query.type;
    if (type === 'system') {
      sails.services.shellproxy.systemRestart();
    } else if (type === 'application') {
      sails.services.shellproxy.restartApplication();
    }
    return res.ok();
  }
};
