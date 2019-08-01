/**
 * FingerprintController
 *
 * @description :: Server-side logic for managing Fingerprints
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict';
var _ = require('lodash');
var uuid = require('node-uuid');
var fs = require('fs');
var fifoclient = sails.services.fifoclient
var sm = fifoclient.sendFifoMessage;
var timeout = 0; //防止硬件出错导致的指纹录入不断请求的超时保护
var onError = function (err) {
  sails.log.debug(' ##### FingerprintController:onError #### ');
  sails.log.error(err);
}

var getUserRoleInfo = function (user, getUserInfo, cb) {
  if (getUserInfo !== 'true') return cb(null, user);
  User.findOne({ id: user.id }).populate('roles').exec((err, userInfo) => {
    if (err) {
      sails.log.error(`#### FingerprintController: getUserRoleInfo error ${err} ####`);
      return cb(err);
    } else {
      return cb(null, userInfo);
    }
  })
}

module.exports = {
  auth: function (req, res, next) {
    if (!req.isLocal) {
      sails.log.error(' ##### FingerprintController:auth forbidden access from remote #### ');
      return res.badRequest({ error: '不允许访问' });
    }
    sails.services.redis.get('fingerprintPreloaded', (err, preloaded) => {
      if (err) return res.serverError(err);
      if (preloaded === 'false') return res.badRequest({ code: 'FINGERPRINT_NOT_READY', msg: '指纹仪未就绪' });
      var getUserInfo = req.headers.userinfo;
      var me = this;
      var message = sails.services.fingerprint.verifyUserFingerprint(
        function (user, message) {
          sails.log.debug(' ##### FingerprintController:auth:onComplete #### ');
          sails.log.debug(message);
          getUserRoleInfo(user, getUserInfo, (err, userInfo) => {
            if (err) return;
            sails.services.message.local({ topic: ['SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT', message.id].join('.'), value: { user: userInfo, userinfo: getUserInfo } }); // return user:null, if not found
          })
        },
        function (err) {
          sails.log.debug(' ##### FingerprintController:auth, on error #### ');
          sails.log.error(err);
          sails.services.message.local({ topic: ['SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT'].join('.'), value: { user: null, error: err.error, userinfo: getUserInfo } }); // return user:null, if not found
        },
        function (message) {
          sails.log.debug(' ##### FingerprintController:auth, callback #### ');
          sails.services.message.local({ topic: 'SGS_MESSAGE_SCAN_USER_FINGERPRINT', value: { user: null, info: message, userinfo: getUserInfo } }); // return user:null, if not found
        },
        function (msgLog) {
          sails.log.debug('###Cache Fingerprint log ###');
          req.session.cacheMsgId = msgLog.id;
          req.session.save((err) => {
            sails.log.error(err);
          })
        },
        function () {
          sails.log.debug(`#### FingerprintController : auth timeout`);
        }
      );
      res.ok({ info: '开始扫描指纹' });
    })
  },
  record: function (req, res, next) {
    if (!req.isLocal) {
      sails.log.error(' ##### FingerprintController:record forbidden access from remote #### ');
      return res.badRequest({ error: '不允许访问' });
    }
    sails.log.debug(' #### Start Record Fingerprint ####');
    var user = req.session.user ? req.session.user : req.user;
    Fingerprint.find({ owner: user.id }).then((fingerprints) => {
      if (fingerprints.length > 9) {  //最多拥有10个指纹
        sails.log.debug("User's fingerprint collection is full!");
        return res.badRequest({ error: 'fingerpeint collection full' });
      } else {

        var server = sails.services.fifoserver;
        var me = this;

        me.sentMessage = null;

        me.saveFingerprint = function (message) {
          sails.log.debug(' ##### FingerprintController:record: saveFingerprint User name is %s #### ', user.alias);
          if (message) {
            sails.log.debug(' #####  FingerprintController:record:Loop into the return fifo parsed data  @@@@ 1 #### ');
            sails.log.debug(message);
            if (message) {
              if (message.id == me.sentMessage.id) {
                sails.log.debug(' ##### FingerprintController:record: Id Matched #### ');
                sails.log.debug(' ##### FingerprintController:record: Message Name is %s #### ', message.name);
                sails.log.debug(' ##### FingerprintController:record: Message Status is %s #### ', message.status);
                if (message.status === 1) {
                  sails.log.error(' ##### FingerprintController:record: Record fingerPrint fail #### ');
                  sails.services.message.local({ topic: [message.name, message.id].join('.'), value: _.omit(message, 'data') });
                  return;
                }
                if (message.status === 4) {
                  sails.log.error(' ##### FingerprintController:record: Record fingerPrint success but low quality #### ');
                  sails.services.message.local({ topic: [message.name, message.id].join('.'), value: _.omit(message, 'data') });
                  return;
                }
                if (message.status === 0) {
                  sails.log.debug('#### FingerprintController: recordCombine success ####');
                  sails.services.message.local({ topic: 'Fingerprint_Combine', value: { status: 3 } });
                } else if (message.status === 3) {
                  sails.log.error('#### FingerprintController: recordCombine Failed ####');
                  sails.services.message.local({ topic: 'Fingerprint_Fail', value: { status: 4 } });
                  return;
                }
                if (user.id) {
                  sails.log.debug(' ##### FingerprintController:record: Going to update user %s with fingerprint%s #### ', user.username);

                  User.findOne({ id: user.id })
                    .populate('fingerprints')
                    .exec(function (err, user) {
                      if (err) {
                        sails.log.error(' ##### FingerprintController:record: Fail to find user  %s #### ', user.alias);
                        return;
                      }
                      if (user) {
                        if (user.fingerprints.length === 0) {
                          User.update({ id: user.id }, { disablePasswdLogin: 'yes' }).exec((err, rs) => {
                            if (err) {
                              sails.log.error(`#### 禁止用户密码登录失败: ${err} ####`);
                            } else {
                              sails.log.debug(`#### 用户 ${user.alias} 已被禁止密码登录 ####`);
                            }
                          })
                        }
                        Fingerprint.create({ owner: user.id, data: message.data }).exec((err, newFingerprint) => {
                          if (err) {
                            sails.log.error(' ##### FingerprintController:record: Fail to save fingerprint for user  %s #### ', user.alias);
                            sails.log.error(err);
                            return;
                          }
                          sails.services.message.local({ topic: [message.name, message.id].join('.'), value: _.omit(message, 'data') });
                        })
                        // user.fingerprints.add({data : message.data}); //finger data in buffer
                        // user.save(function (err) {
                        //   if(err){
                        //     sails.log.error(' ##### FingerprintController:record: Fail to save fingerprint for user  %s #### ', user.alias);
                        //     sails.log.error(err);
                        //     return;
                        //   }
                        //   /**
                        //     message  = {
                        //       id: auto incr id return from client
                        //       typeId : message type id correspond to name
                        //       name : 'SGS_MESSAGE_RECORD_FINGERPRINT',
                        //       status : 0 for done, 1 for fail
                        //       data : fingerprintData would be omitted here for security
                        //     };
                        //   */
                        //   sails.services.fingerprint.preloadAppend(user.id, message.data);
                        //   sails.services.message.local({topic : [message.name, message.id].join('.'), value : _.omit(message, 'data')});
                        // });
                      }
                    })
                }
              }
            }
          }
        };
        me.firstEnhanceFingerprint = function (message) {
          sails.log.debug(message, 'getFingerprint');
          sails.log.debug('#### FingerprintController: firstEnhanceFingerprint Start ####');
          me.sentMessage = sm('recordFingerPrintEnhance',
            { status: 1 },
            _.bind(me.removeFingerprint, me),
            _.bind(function (err) {
              onError({ error: '指纹比对失败，请检查指纹识别设备' });
              onInternalError(err);
            }, me)
          );
        }
        me.removeFingerprint = function (message) {
          if (message) {
            sails.log.debug(message, 'firstEnhanceFingerprint');
            if (message.id === me.sentMessage.id) {
              if (message.status === 0) {
                sails.log.debug('#### FingerprintController: removeFingerprint Start ####');
                sails.services.message.local({ topic: 'Fingerprint_First', value: { status: 1 } });
                me.sentMessage = sm('recordFingerPrintEnhance',
                  { status: 2 },
                  _.bind(me.secondEnhanceFingerprint, me),
                  (err) => { sails.log.error(err) }
                );
              } else {
                timeout++;
                if (timeout < 10) {//指纹录入过程请求超过三次　录入中断超时
                  sails.log.error('#### FingerprintController: firstEnhanceFingerprint Failed ####');
                  me.sentMessage = sm('recordFingerPrintEnhance',
                    { status: 1 },
                    _.bind(me.removeFingerprint, me),
                    _.bind(function (err) {
                      onError({ error: '指纹比对失败，请检查指纹识别设备' });
                      onInternalError(err);
                    }, me)
                  );
                } else {
                  timeout = 0;
                  sails.log.info('#### FingerprintController: firstEnhanceFingerprint Timeout ####');
                  sails.services.message.local({ topic: 'Fingerprint_Timeout', value: { status: "timeout" } });
                  return;
                }
              }
            }
          }
        }
        me.secondEnhanceFingerprint = function (message) {
          if (message) {
            sails.log.debug(message, 'removeFingerprint');
            if (message.id === me.sentMessage.id) {
              if (message.status === 0) {
                sails.services.message.local({ topic: 'Fingerprint_Remove', value: { status: 2 } });
                sails.log.debug('#### FingerprintController: secondEnhanceFingerprint Start ####');
                me.sentMessage = sm('recordFingerPrintEnhance',
                  { status: 3 },
                  _.bind(me.recordCombine, me),
                  _.bind(function (err) {
                    onError({ error: '指纹比对失败，请检查指纹识别设备' });
                    onInternalError(err);
                  }, me)
                );
              } else {
                timeout++;
                if (timeout < 10) {
                  sails.log.error('#### FingerprintController: removeFingerprint Failed ####');
                  me.sentMessage = sm('recordFingerPrintEnhance',
                    { status: 2 },
                    _.bind(me.secondEnhanceFingerprint, me),
                    (err) => { sails.log.error(err) }
                  );
                } else {
                  timeout = 0;
                  sails.log.info('#### FingerprintController: removeFingerprint Timeout ####');
                  sails.services.message.local({ topic: 'Fingerprint_Timeout', value: { status: "timeout" } });
                  return;
                }
              }
            }
          }
        }
        me.recordCombine = function (message) {
          if (message) {
            sails.log.debug(message, 'secondEnhanceFingerprint');
            if (message.id === me.sentMessage.id) {
              if (message.status === 0) {
                sails.log.debug('#### FingerprintController: recordCombine Start ####');
                me.sentMessage = sm('recordFingerPrintEnhance',
                  { status: 4 },
                  _.bind(me.saveFingerprint, me),
                  _.bind(function (err) {
                    onError({ error: '请重新扫描' });
                    onInternalError(err);
                  }, me)
                );
              } else {
                timeout++;
                if (timeout < 10) {
                  sails.log.error('#### FingerprintController: secondEnhanceFingerprint Failed ####');
                  me.sentMessage = sm('recordFingerPrintEnhance',
                    { status: 3 },
                    _.bind(me.recordCombine, me),
                    _.bind(function (err) {
                      onError({ error: '指纹比对失败，请检查指纹识别设备' });
                      onInternalError(err);
                    }, me)
                  );
                } else {
                  timeout = 0;
                  sails.log.info('#### FingerprintController: secondEnhanceFingerprint Timeout ####');
                  sails.services.message.local({ topic: 'Fingerprint_Timeout', value: { status: "timeout" } });
                  return;
                }
              }
            }
          }
        }
        me.getFingerprintQuality = function (message) {
          sails.log.debug(message, 'recordFingerprint');
          me.sentMessage = sm('getFingerPrintQuality',
            {},
            _.bind(me.firstEnhanceFingerprint, me),
            _.bind(onError, me)
          );
        }
        me.sentMessage = sm('recordFingerPrint',
          { retry: 20 },
          _.bind(me.getFingerprintQuality, me),
          _.bind(onError, me)
        );
        req.session.cacheMsgId = me.sentMessage.id;
        sails.log.silly('#### FingerprintController : record send message id is %s ####', me.sentMessage.id);
        res.ok(_.pick(me.sentMessage, ['id', 'fnName']));
      }
    })
      .catch((err) => {
        sails.log.error('error occured in recording fingerprint');
        return sails.log.error(err);
      })
  },

  stopScan: function (req, res, next) {
    if (!req.isLocal) {
      sails.log.error(' ##### FingerprintController:stopScan forbidden access from remote #### ');
      return res.badRequest({ error: '不允许访问' });
    }
    if (req.session.cacheMsgId) {
      var msgId = req.session.cacheMsgId;
      sails.log.debug('session cache msgId:' + msgId);
      if (fifoclient.destroy(msgId)) {
        delete req.session.cacheMsgId;
        res.status(200).json('stop scan success');
      } else {
        sails.log.silly('#### FingerprintController: stopScan no cache from fifoclient ####');
        res.status(401).json('no cache from fifoclient');
      }
    } else {
      sails.log.silly('#### FingerprintController: stopScan no cache from session ####');
      res.status(401).json('no cache from session');
    }
  },

  recieveSync: function (req, res, next) {
    let body = req.body;
    body.data = new Buffer(body.data, 'hex');
    Fingerprint.findOne({ id: body.id })
      .then((exist) => {
        if (exist) {
          sails.log.info('Fingerprint exist');
          return res.ok(exist);
        }
        Fingerprint.create(body)
          .then((data) => {
            res.ok(data);
          })
      })
      .catch((err) => {
        res.serverError(err);
      })
  },

  clean: function (req, res, next) {
    let user = req.session.user ? req.session.user : req.user;
    if (typeof user !== 'undefined') {
      Fingerprint.destroy({ owner: user.id })
        .then((data) => {
          sails.log.verbose(' ##### FingerprintController:Clean User FingerPrint Success #### ');
          sails.services.fingerprint.preloadBeforeVerify();
          return res.ok('Success');
        })
        .catch((err) => {
          sails.log.verbose(' ##### FingerprintController:Clean User FingerPrint Failed #### ');
          return res.serverError({ err: '程序错误', msg: err.message });
        })
    } else {
      return res.forBidden('Session No User');
    }
  },

  fingerPic: function (req, res, next) {
    let type = req.query.type;
    let path = '/tmp/fingerprint_user.bmp';
    if (type == 'record') {
      path = '/tmp/fingerprint_record.bmp'
    }
    fs.readFile(path, (err, data) => {
      if (err) {
        sails.log.error('文件不存在');
        return res.sendfile('./assets/fingerprint.png');
      }
      if (data) {
        res.sendfile(path);
      } else {
        res.sendfile('./assets/fingerprint.png');
      }
    })
  }
};
