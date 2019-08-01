'use strict';
var _ = require('lodash');
var uuid = require('node-uuid');
var fifoclient = require('./FifoClient');
var sm = fifoclient.sendFifoMessage;
var onInternalError = function (err) {
  sails.log.debug(' ##### FingerprintController:onError #### ');
  sails.log.error(err);
}
var that = this;
that.fingerprintsPreDB = [];
that.isPreload = false;
that.inUsing = {};
that.timers = {};

module.exports = {
  /**
    @return message id when success, null when error
  */
  verifyUserFingerprint: function (onComplete, onError, onProgress, onCache, onTimeout) {
    sails.log.debug(' #### Start Scan Fingerprint ####');
    var server = sails.services.fifoserver;
    var skip = 20; //跳过前1000个指纹
    var limit = 50;
    var preloadCompelete = true;
    var me = this;
    var sentMessage = null;
    var isCallbacked = false;
    me.fingerprintsInDB = [];
    //扫描完成后读取指纹(普通方法)
    me.loadFingerprint = function (status) {
      if (typeof status === 'undefined') {
        sails.services.message.local({ topic: 'FingerPrint_Status', value: { status: 1 } });
      }
      sails.log.debug(' ##### FingerprintController:auth: Total Fingerprint count is %s #### ', me.total);
      sails.log.debug(' ##### FingerprintController:auth: Preloaded Fingerprint count is %s #### ', that.fingerprintsPreDB.length);
      if (me.total > that.fingerprintsPreDB.length && preloadCompelete) {
        sails.log.debug(' ##### FingerprintController:auth: 预加载指纹数量少于指纹总数, 加载剩余部分 #### ');
        preloadCompelete = false;
        skip = parseInt(that.fingerprintsPreDB.length / limit);
      }
      sails.log.debug(' ##### FingerprintController:auth: start from %s to %s #### ', skip * limit, (skip + 1) * limit);
      if ((skip * limit) >= me.total) {
        sails.log.error(' ##### FingerprintController:auth: Fail to find user, search to the end #### ');
        onError({ error: '用户或指纹不存在' });
        preloadCompelete = true;
        return;
      }
      Fingerprint.find()
        .sort('createdAt ASC')
        .limit(limit)
        .skip(skip * limit)
        .exec(function (err, fs) {
          if (err) {
            onError && onError({ error: '查找指纹失败' });
            return;
          }
          skip++;
          me.fingerprintsInDB = fs.map(f => {
            return {
              id: f.id,
              owner: f.owner
            }
          });
          let data = fs.map(f => f.data);
          me.sentMessage = me.authFs(data);
        });
    }
    //扫描完成后读取指纹(预加载方法)
    me.loadPreloadFingerprint = function () {
      sails.services.message.local({ topic: 'FingerPrint_Status', value: { status: 0 } });
      me.sentMessage = sm('preloadAuthFingerPrint',
        {},
        _.bind(me.validateResult, me),
        _.bind(me.loadFingerprint, me)
      );
    }
    //普通验证
    me.authFs = function (fs) {
      var sentMessage = sm('authenFingerPrint',
        { data: fs },
        _.bind(me.validateResult, me),
        _.bind(function (err) {
          onError({ error: '指纹比对失败，请检查指纹识别设备' });
          onInternalError(err);
        }, me)
      );
      return sentMessage;
    }

    //校验结果
    me.validateResult = function (message) {
      that.inUsing = {};
      sails.log.debug(' ##### FingerprintController:auth: validateResult %s #### ');
      sails.log.debug(message);
      //send scan success
      if (message) {
        if (message.id == me.sentMessage.id) {
          sails.log.debug(' ##### FingerprintController:auth:  Id Matched #### ');
          sails.log.debug(' ##### FingerprintController:auth: Message Name is %s #### ', message.name);
          /**
            Structure is like this
            message = {
              id: auto incr id return from client
              typeId : message type id correspond to name
              name : 'SGS_MESSAGE_AUTHEN_FINGERPRINT',
              index : -1 if not found, return found item index
              status: 0 for done, 1 for fail
            }
          */
          if (message.status === 0 && message.index !== -1) {
            var index = message.index;
            sails.log.debug(' ##### FingerprintController:auth: fingerprint located  at   %s #### ', index);
            let fingerprint = {};
            if (message.name == 'SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT') {
              fingerprint = that.fingerprintsPreDB[index];
            } else if (message.name == 'SGS_MESSAGE_AUTHEN_FINGERPRINT') {
              fingerprint = me.fingerprintsInDB[index];
            }
            let userId = 0;
            if (typeof fingerprint !== 'undefined') {
              userId = fingerprint.owner;
            } else {
              sails.log.error(' ##### FingerprintController:auth: index is found, but fail to load fingerprint #### ');
              onError({ error: '无法匹配指纹' });
              return;
            }
            sails.log.debug(' ##### FingerprintController:auth: Load user from  cache for user  %s #### ', userId);
            sails.log.debug(fingerprint.owner);

            if (userId) {
              sails.log.debug(' ##### FingerprintController:auth: Loading user from  DB for user  %s #### ', userId);
              User.findOne({ id: userId })
                .exec(function (err, user) {
                  if (err || !user) {
                    sails.log.error(' ##### FingerprintController:auth: userId is found, bute fail to load user #### ');
                    sails.log.error(err);
                    onError({ error: '无法匹配指纹用户' });
                    return;
                  }

                  sails.log.debug(' ##### FingerprintController:auth: Success to find fingerprint for user  %s #### ', user.id);

                  //产生token并且在redis中保存， 默认两分钟过期
                  user.token = UserToken.generate(user.id);

                  user.save(function (err) {
                    if (err) {
                      sails.log.error(err);
                      sails.log.error(' ##### FingerprintController:auth: Try udate token fail after UUID is genrated #### ');
                      return;
                    }
                    me.updateFingerPrintCount(fingerprint);
                    //验证用户指纹成功之后, 保存指纹图片
                    let filename = uuid.v4();
                    sails.services.shellproxy.savePic(filename, 'finger', e => {
                      if (!e) {
                        sails.services.redis.hget('finger', userId, (err, preFinger) => {
                          sails.log.debug(`---- 获取到上一次指纹记录  ${preFinger}`)
                          sails.services.redis.hset('finger', userId, filename, (err, rs) => {
                            if (err) sails.log.error(err);
                            if (that.timers[user.id]) clearTimeout(that.timers[user.id]);
                            that.timers[user.id] = setTimeout(() => {
                              sails.services.redis.hget('finger', userId, (err, f) => {
                                if (f === filename) {
                                  sails.services.redis.hdel('finger', userId, (err, rs) => {
                                    if (err) sails.log.error(err)
                                  })
                                }
                              })
                            }, 300000);
                            sails.log.debug(`----- 设置指纹记录 user : ${userId} fingerprint : ${filename} -----`)
                            message.preFinger = preFinger;
                            onComplete && onComplete(user, message);
                          })
                        })
                      } else {
                        onError({ error: '指纹图像存档失败，请重新扫描' });
                      }
                      // else if (e == 'timeout') {
                      //   onTimeout();
                      // } else {
                      //   sails.log.error(`#### Finger Server : 移动指纹图片失败 !`)
                      //   onComplete && onComplete(user, message);
                      // }
                    })
                  });
                })
            }
          } else if (message.status === 4) {
            sails.log.error(' ##### FingerprintController:auth: User Fingerprint Low Quality #### ');
            sails.services.message.local({ topic: 'FingerPrint_Status', value: { status: 4 } });
            sails.log.error(err);
            onError({ error: '用户扫描指纹质量低，请重新扫描' });
            return;
          } else {
            sails.log.error(' ##### FingerprintController:auth: RELOAD !!! #### ');
            me.loadFingerprint(false);
          }
        }
      }
    }
    // server.on('fifodata', me.validateResult);
    me.updateFingerPrintCount = function (fg) {
      Fingerprint.findOne({ id: fg.id })
        .then((target) => {
          if (target) {
            let count = target.used + 1;
            return Fingerprint.update({ id: fg.id }, { used: count });
          } else {
            sails.log.error(' ##### FingerprintController:auth: updateFingerPrintCount Get Failed #### ')
            return Promise.reject(new Error('No Match Fingerprint'))
          }
        })
        .then((res) => {
          sails.log.verbose(' ##### FingerprintController:auth: updateFingerPrintCount Success #### ')
        })
        .catch((err) => {
          sails.log.error(err);
          sails.log.error(' ##### FingerprintController:auth: updateFingerPrintCount Failed #### ')
        })
    };
    Fingerprint.count().exec(function (err, total) {
      if (err) {
        sails.log.error(' ##### FingerprintController:auth: Get Fingerprint count error #### ');
        onError && onError({ error: '指纹库查询失败' });
        return;
      }

      me.total = total;
      sails.log.debug(' ##### FingerprintController:auth: Get Fingerprint count is %s #### ', total);

      if (total > 0) {
        //发送搜索命令
        if (typeof that.inUsing.msgId !== 'undefined') {
          if (fifoclient.destroy(that.inUsing.msgId)) {
            sails.log.debug('Destroy fingerprint event success');
          } else {
            sails.log.debug('Destroy fingerprint event failed');
          }
          that.inUsing = {};
        }
        let msg = sm(
          'scanFingerPrint',
          { retry: 20 },
          _.bind(function () {
            onProgress && onProgress({ info: '指纹扫描成功，正在进行比对' });
            me.loadPreloadFingerprint();
          }, me),
          _.bind(function (err) {
            onError && onError({ error: '指纹扫描超时失败，请重试' });
            onInternalError(err);
          }, me)
        );
        that.inUsing = {
          msgId: msg.id,
        }
        onCache && onCache(msg);
      } else {
        onError && onError({ error: '指纹库中没有指纹信息，请使用密码登录' });
      }
    });
  },
  preloadBeforeVerify: function () {
    sails.log.verbose('Start To Preload');
    // Fingerprint.count()
    // .then((nums) => {
    //   if(nums == 0){return Promise.reject('No Fingerprint')};
    //   if(nums >= 100){
    //     //应该加载高频指纹,先限制头100个
    //     return Fingerprint.find().sort('used DESC').limit(100);
    //   }else{
    //     return Fingerprint.find().sort('used DESC');
    //   }
    // })
    // .then((fs) => {
    //   that.fingerprintsPreDB = fs.map(f => {
    //     return {
    //       id: f.id,
    //       owner: f.owner
    //     }
    //   })
    //   sails.log.verbose(that.fingerprintsPreDB);
    //   sails.log.verbose('Ready To Preload');
    // let data = fs.map(f => f.data);
    //   sm('preloadFingerPrint',
    //     {data: data},
    //     (msg) => {sails.log.verbose('Preload Success')},
    //     (err) => {sails.log.error(err)}
    //   );
    // })
    // .catch((err) => {
    //   sails.log.error(err);
    // })
    function preloadRecursive(recursiveTime, currentTime) {
      if (currentTime === 10) {
        sails.log.debug(`Preloaded 1K Fingerprints, Preload Finished`);
      } else if (currentTime <= recursiveTime) {
        Fingerprint.find({
          limit: 100,
          skip: currentTime * 100,
          sort: 'used DESC'
        }).exec((err, fs) => {
          sails.log.verbose(`Ready To Preload For The ${currentTime} Part`);
          let data = fs.map(f => f.data);
          let offset = currentTime * 100;
          sm('preloadFingerPrint',
            {
              offset: offset,
              data: data
            },
            (msg) => {
              sails.log.verbose(`Preload For The ${currentTime} Part Success`);
              preloadRecursive(recursiveTime, currentTime + 1);
            },
            (err) => { sails.log.error(err) }
          );
        })
      } else {
        sails.services.redis.set('fingerprintPreloaded', true, (err, rs) => {
          if (err) sails.log.error(err);
        })
        sails.log.debug(`Preload Finished`)
      }
    }
    Fingerprint.count()
      .then((nums) => {
        sails.services.redis.set('preloadOffset', nums, function (err, rs) {
          if (err) {
            sails.log.error(`#### Fingerprint services : set offset key error ${err} ####`)
          } else {
            sails.log.debug(`#### Fingerprint Preload set offset ${nums} ####`);
          }
        })
        if (nums === 0) {
          sails.services.redis.set('fingerprintPreloaded', true, (err, rs) => {
            if (err) sails.log.error(err);
          })
          return Promise.reject('No Fingerprint');
        }
        Fingerprint.find({
          sort: 'used DESC'
        }).exec((err, fs) => {
          that.fingerprintsPreDB = fs.map(f => {
            return {
              id: f.id,
              owner: f.owner
            }
          });
        })
        let recursiveTime = parseInt(nums / 100);
        preloadRecursive(recursiveTime, 0);
      })
      .catch((err) => {
        sails.log.error(err);
      })
  },

  preloadAppend: function (owner, fingerprintId, data) {
    sails.services.redis.get('preloadOffset', (err, offset) => {
      if (err) {
        sails.log.error(`#### Fingerprint preloadAppend get offset error : ${err} ####`);
      } else {
        if (offset < 1000) {
          sails.log.debug(`#### Fingerprint preloadAppend get offset  : ${offset} ####`);
          sails.log.debug(`#### Fingerprint preloadAppend owner : ${owner} ####`);
          that.fingerprintsPreDB.push({ id: fingerprintId, owner: owner });
          sm('preloadFingerPrint',
            {
              offset: Number(offset),
              data: [data]
            },
            (msg) => {
              sails.log.verbose(`Preload Append At Offset ${offset} Success`);
              sails.services.redis.set('preloadOffset', Number(offset) + 1, (err, rs) => {
                if (err) {
                  sails.log.error(`#### Fingerprint preloadAppend set new offset error : ${err}####`)
                } else {
                  sails.log.debug(`#### Fingerprint preloadAppend new offset is ${Number(offset) + 1}`);
                }
              })
              sails.services.redis.set('fingerprintPreloaded', true, (err, rs) => {
                if (err) sails.log.error(err);
              })
            },
            (err) => { sails.log.error(err) }
          );
        } else {
          sails.log.error(`#### Fingerprint preloadAppend error : preloaded 1K fingerprints`)
        }
      }
    })
  }
};
