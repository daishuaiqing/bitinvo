'use strict';
var _ = require('lodash');
var uuid = require('node-uuid');
var fifoclient = require('./FifoClient');
var sm = fifoclient.sendFifoMessage;
const co = require('co');
const fs = require('fs');
const pubsub = sails.config.innerPubsub;
var onInternalError = function (err) {
  sails.log.debug(' ##### FaceController:onError #### ');
  sails.log.error(err);
}
var that = this;
that.facesPreDB = [];
that.isPreload = false;
that.inUsing = {};
that.timers = {};

module.exports = {
  /**
    @return message id when success, null when error
  */
  verifyUserFace: function (userId, onComplete, onError, onProgress, onCache) {
    sails.log.debug(' #### Start Scan Face ####');
    var server = sails.services.fifoserver;
    var skip = 0; //跳过前0个人脸
    var limit = 50;
    var preloadCompelete = true;
    var me = this;
    var sentMessage = null;
    var isCallbacked = false;
    me.facesInDB = [];
    //扫描完成后读取人脸(普通方法)
    me.loadFace = function (status) {
      if (typeof status === 'undefined') {
        sails.services.message.local({ topic: 'Face_Status', value: { status: 1 } });
      }
      Face.findOne({ owner: userId }).exec((err, face) => {
        if (err || !face) {
          onError && onError({ error: '查找人脸失败' });
          return;
        }
        me.sentMessage = me.authFs(face.data);
      })
    }
    //普通验证
    me.authFs = function (fs) {
      var sentMessage = sm('authenFace',
        { data: fs },
        _.bind(me.validateResult, me),
        _.bind(function (err) {
          onError({ error: '人脸比对失败，请检查人脸识别设备' });
          onInternalError(err);
        }, me)
      );
      return sentMessage;
    }

    //校验结果
    me.validateResult = function (message) {
      that.inUsing = {};
      sails.log.debug(' ##### FaceController:auth: validateResult %s #### ');
      sails.log.debug(message);
      //send scan success
      if (message) {
        if (message.id == me.sentMessage.id) {
          sails.log.debug(' ##### FaceController:auth:  Id Matched #### ');
          sails.log.debug(' ##### FaceController:auth: Message Name is %s #### ', message.name);
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
          if (message.status === 0) {
            // sails.services.message.local({topic : 'Face_Status', value: {status: 0}});
            User.findOne({ id: userId }).populate('roles').exec((err, user) => {
              if (err) {
                sails.log.error(err);
                sails.log.error(' ##### FaceController:auth: Try udate token fail after UUID is genrated #### ');
                return;
              } else {
                //验证用户人脸成功之后, 保存指纹图片
                let filename = uuid.v4();
                sails.services.shellproxy.savePic(filename, 'face', e => {
                  if (!e) {
                    sails.services.redis.hset('face', userId, filename, (err, rs) => {
                      if (err) sails.log.error(err);
                      if (that.timers[userId]) clearTimeout(that.timers[userId]);
                      // that.timers[userId] = setTimeout(() => {
                      //   sails.services.redis.hdel('face', userId, (err, rs) => {
                      //     if (err) sails.log.error(err)
                      //   })
                      // }, 300000)
                    })
                  }
                });

                onComplete(user, message);
              }
            })
          } else if (message.status === 1) {
            onComplete(null, message);
          }
        }
      }
    }
    // server.on('fifodata', me.validateResult);
    me.updateFaceCount = function (fg) {
      Face.findOne({ id: fg.id })
        .then((target) => {
          if (target) {
            let count = target.used + 1;
            return Face.update({ id: fg.id }, { used: count });
          } else {
            sails.log.error(' ##### FaceController:auth: updateFaceCount Get Failed #### ')
            return Promise.reject(new Error('No Match Face'))
          }
        })
        .then((res) => {
          sails.log.verbose(' ##### FaceController:auth: updateFaceCount Success #### ')
        })
        .catch((err) => {
          sails.log.error(err);
          sails.log.error(' ##### FaceController:auth: updateFaceCount Failed #### ')
        })
    };
    Face.count().exec(function (err, total) {
      if (err) {
        sails.log.error(' ##### FaceController:auth: Get Face count error #### ');
        onError && onError({ error: '人脸库查询失败' });
        return;
      }

      me.total = total;
      sails.log.debug(' ##### FaceController:auth: Get Face count is %s #### ', total);

      if (total > 0) {
        //发送搜索命令
        if (typeof that.inUsing.msgId !== 'undefined') {
          if (fifoclient.destroy(that.inUsing.msgId)) {
            sails.log.debug('Destroy face event success');
          } else {
            sails.log.debug('Destroy face event failed');
          }
          that.inUsing = {};
        }
        let msg = sm(
          'scanFace',
          {},
          _.bind(function (data) {
            onProgress && onProgress({ status: data.status });
            //普通验证, 无预加载
            if (Number(data.status) === 0) {
              me.loadFace();
            }
            pubsub.emit('stopStream');
          }, me),
          _.bind(function (err) {
            onError && onError({ error: '人脸扫描超时失败，请重试' });
            onInternalError(err);
            pubsub.emit('stopStream');
          }, me)
        );
        //发送人脸数据
        sails.services.face.faceVideo();
        that.inUsing = {
          msgId: msg.id,
        }
        onCache && onCache(msg);
      } else {
        onError && onError({ error: '人脸库中没有人脸信息，请使用先录制人脸' });
      }
    });
  },

  _verifyUserFace: function (onComplete, onError, onProgress, onCache, onTimeout) {
    sails.log.debug(' #### Start Scan Face ####');
    var server = sails.services.fifoserver;
    var preloadCompelete = true;
    var me = this;
    me.sentMessage = null;
    var isCallbacked = false;
    me.facesInDB = [];

    //开始人脸识别时记录
    sails.services.redis.set('onAir', 50, (err, rs) => {
      if (err) sails.log.error(err);
    })

    me.loadFace = () => {
      co(function* () {
        if (typeof status === 'undefined') {
          sails.services.message.local({ topic: 'Face_Status', value: { status: 1 } });
        }
        //按人脸使用频率排序
        sails.log.verbose('Face Service : 验证人脸')
        const faces = yield Face.find({ sort: 'used desc' });
        if (faces.length === 0) {
          sails.log.verbose('#### Face Service : No face data ');
          sails.services.message.local({ topic: 'Face_Msg', value: { status: 0, msg: '人脸数据为空, 请先录制人脸' } });
        } else {
          for (let index = 0; index < faces.length; index++) {
            sails.log.verbose(`Face service: 正在进行第 ${index + 1} 次比对`);
            const rs = yield me.authFs(faces[index].data);
            sails.log.verbose(`Face service: 比对结果 :`);
            sails.log.verbose(rs);
            if (rs && rs.status === 0) {
              let user = yield User.findOne({ id: faces[index].owner }).populate('roles');
              user.token = UserToken.generate(user.id);
              yield User.update({ id: user.id }, { token: user.token });
              yield Face.update({ id: faces[index].id }, { used: faces[index].used + 1 });
              return yield Promise.resolve(user);
            }
          }
          return yield Promise.resolve(null);
        }
      }).then((user) => {
        if (user) {
          const filename = uuid.v4();
          sails.log.verbose('Face Service : 识别人脸 : ' + user.username);
          sails.services.shellproxy.savePic(filename, 'face', e => {
            if (!e) {
              sails.services.redis.hget('face', user.id, (err, preFace) => {
                sails.log.debug(`---- 获取到上一次人脸记录  ${preFace}`)
                sails.services.redis.hset('face', user.id, filename, (err, rs) => {
                  if (err) sails.log.error(err);
                  sails.log.debug(`Face Service:  设置人脸记录  user : ${user.id}  face : ${filename}`)
                  if (that.timers[user.id]) clearTimeout(that.timers[user.id]);
                  that.timers[user.id] = setTimeout(() => {
                    sails.services.redis.hget('face', user.id, (err, f) => {
                      if (f === filename) {
                        sails.services.redis.hdel('face', user.id, (err, rs) => {
                          if (err) sails.log.error(err)
                        })
                      }
                    })
                  }, 300000);
                  //结束人脸识别时记录
                  sails.services.redis.set('onAir', 0, (err, rs) => {
                    if (err) sails.log.error(err);
                  })
                  onComplete(user, { preFace: preFace });
                })
              })
            } else {
              //结束人脸识别时记录
              sails.services.redis.set('onAir', 0, (err, rs) => {
                if (err) sails.log.error(err);
              })
              onError({ error: '人脸图像存档失败，请重新扫描' });
            }
            // else if (e == 'timeout') {
            //   onTimeout()
            // } else {
            //   sails.log.error(`#### Face Server : 移动人脸图片失败 !`)
            //   onComplete(user);
            // }
          });
        } else {
          //结束人脸识别时记录
          sails.services.redis.set('onAir', 0, (err, rs) => {
            if (err) sails.log.error(err);
          })
          onComplete(null);
        }
      }).catch((err) => {
        //结束人脸识别时记录
        sails.services.redis.set('onAir', 0, (err, rs) => {
          if (err) sails.log.error(err);
        })
        onError(err);
      })
    }

    me.authFs = data => {
      return new Promise((resolve, reject) => {
        me.sentMessage = sm('authenFace',
          { data: data },
          data => resolve(data),
          err => reject(err)
        )
      })
    }

    Face.count().exec(function (err, total) {
      if (err) {
        sails.log.error(' ##### FaceController:auth: Get Face count error #### ');
        //结束人脸识别时记录
        sails.services.redis.set('onAir', 0, (err, rs) => {
          if (err) sails.log.error(err);
        })
        onError && onError({ error: '人脸库查询失败' });
        return;
      }

      me.total = total;
      sails.log.debug(' ##### FaceController:auth: Get Face count is %s #### ', total);

      if (total > 0) {
        //发送搜索命令
        if (typeof that.inUsing.msgId !== 'undefined') {
          if (fifoclient.destroy(that.inUsing.msgId)) {
            sails.log.debug('Destroy face event success');
          } else {
            sails.log.debug('Destroy face event failed');
          }
          that.inUsing = {};
        }
        let msg = sm(
          'scanFace',
          {},
          _.bind(function (data) {
            onProgress && onProgress({ status: data.status });
            //普通验证, 无预加载
            sails.log.verbose('Face Service : 扫描人脸')
            sails.log.verbose(data);
            if (Number(data.status) === 0) {
              me.loadFace();
            } else {
              //结束人脸识别时记录
              sails.services.redis.set('onAir', 0, (err, rs) => {
                if (err) sails.log.error(err);
              })
              sails.log.silly(`Face Service : 扫描人脸失败, 错误代码 ${data.status}`);
            }
            pubsub.emit('stopStream');
          }, me),
          _.bind(function (err) {
            //结束人脸识别时记录
            sails.services.redis.set('onAir', 0, (err, rs) => {
              if (err) sails.log.error(err);
            })
            onError && onError({ error: '人脸扫描超时失败，请重试' });
            onInternalError(err);
            pubsub.emit('stopStream');
          }, me)
        );
        //发送人脸数据
        // sails.services.face.faceVideo();
        that.inUsing = {
          msgId: msg.id,
        }
        onCache && onCache(msg);
      } else {
        //结束人脸识别时记录
        sails.services.redis.set('onAir', 0, (err, rs) => {
          if (err) sails.log.error(err);
        })
        onError && onError({ error: '人脸库中没有人脸信息，请使用先录制人脸' });
      }
    });
  },

  preloadAppend: function (owner, faceId, data) {
    sails.services.redis.get('preloadOffset', (err, offset) => {
      if (err) {
        sails.log.error(`#### Face preloadAppend get offset error : ${err} ####`);
      } else {
        if (offset < 1000) {
          that.facesPreDB.push({ id: faceId, owner: owner });
          sm('preloadFace',
            {
              offset: Number(offset),
              data: [data]
            },
            (msg) => {
              sails.log.verbose(`Preload Append At Offset ${offset} Success`);
              sails.services.redis.set('preloadOffset', Number(offset) + 1, (err, rs) => {
                if (err) {
                  sails.log.error(`#### Face preloadAppend set new offset error : ${err}####`)
                } else {
                  sails.log.debug(`#### Face preloadAppend new offset is ${Number(offset) + 1}`);
                }
              })
            },
            (err) => { sails.log.error(err) }
          );
        } else {
          sails.log.error(`#### Face preloadAppend error : preloaded 1K faces`)
        }
      }
    })
  },

  faceVideo: function () {
    sails.services.shellproxy.deletePic();
    setTimeout(function () {
      sails.services.redis.set('stopStream', 'true', (err) => {
        if (err) sails.log.error(err);
        sails.log.debug(`#### Face Services : start send face img stream ####`);
        let path = '/tmp/img_face.bmp';
        //每200ms读取并发送一次
        for (let i = 0; i < 50; i++) {
          setTimeout(() => {
            sails.services.redis.get('stopStream', (err, rs) => {
              if (rs.toString() === 'true') {
                fs.readFile(path, (err, data) => {
                  if (err) {
                    sails.log.error(`#### Face Service : no img found ${err} ####`);
                  }
                  if (data) {
                    //发送图片数据
                    let base64Str = data.toString('base64');
                    sails.sockets.blast('facePicStream', 'data:image/bmp;base64,' + base64Str);
                  }
                })
              }
            })
          }, 200 * i)
        }
      })
    }, 1500);
  },

  removeRecord: function (userId, caller) {
    return new Promise((resolve, reject) => {
      sails.services.redis.hdel('face', userId, (err) => {
        if (err) sails.log.error(err);
      })
      sails.services.redis.hdel('finger', userId, (err) => {
        if (err) sails.log.error(err);
      })
      resolve();
    })
  }
};
