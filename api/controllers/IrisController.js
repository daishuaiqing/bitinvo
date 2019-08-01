/**
 * FaceController
 *
 * @description :: Server-side logic for managing Faces
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict';
const _ = require('lodash');
const fs = require('fs');
const fifoclient = sails.services.fifoclient
const sm = fifoclient.sendFifoMessage;
const pubsub = sails.config.innerPubsub;
const onError = function(err){
  sails.log.debug(' ##### IrisController:onError #### ');
  sails.log.error(err);
}


module.exports = {
	auth : function(req, res, next){
    let getUserInfo = req.headers.userinfo;
    let userId = req.query.userId;
    let me = this;
    let message = sails.services.face.verifyUserFace(
      userId,
      function(user, message){
        sails.log.debug(' ##### FaceController:auth:onComplete #### ');
        sails.log.debug(message);
        sails.services.message.local({topic : ['SGS_MESSAGE_AUTHEN_PRELOAD_FACE', message.id].join('.'), value : {userId: user ? userId : null, userinfo: getUserInfo}}); // return user:null, if not found
      },
      function(err){
        sails.log.debug(' ##### FaceController:auth, on error #### ');
        sails.log.error(err);
        sails.services.message.local({topic : ['SGS_MESSAGE_AUTHEN_PRELOAD_FACE'].join('.'), value : {user: null, error : err.error, userinfo: getUserInfo}}); // return user:null, if not found
      },
      function(message){
        sails.log.debug(' ##### FaceController:auth, callback #### ');
        sails.services.message.local({topic : 'SGS_MESSAGE_SCAN_USER_FACE', value : {user: null, status : message.status, userinfo: getUserInfo}}); // return user:null, if not found
      },
      function(msgLog){
      }
    );
    res.ok({info: '开始人脸识别'});
  },
  record : function(req, res, next){
    // if(!req.isLocal){
    //   sails.log.error(' ##### FaceController:record forbidden access from remote #### ');
    //   return res.badRequest({error: '不允许访问'});
    // }
    sails.log.debug(' #### Start Record Iris ####');
    let user = req.session.user ? req.session.user : req.user;
    Iris.find({owner: user.id}).then((faces)=>{
      if(faces.length > 0){  //最多拥有1个人脸
        sails.log.debug("User's face collection is full!");
        return res.badRequest({error:'人脸数量已至上限'});
      }else{
        
        let server = sails.services.fifoserver;
        let me = this;
    
        me.sentMessage = null;
        
        me.saveFace = function(message){
          sails.log.debug(' ##### FaceController:record: saveFace User name is %s #### ', user.alias);
          if(message){
            sails.log.debug(' #####  FaceController:record:Loop into the return fifo parsed data  @@@@ 1 #### ');
            sails.log.debug(message);
            if(message){
              if(message.id == me.sentMessage.id){
                sails.log.debug(' ##### FaceController:record: Id Matched #### ');
                sails.log.debug(' ##### FaceController:record: Message Name is %s #### ', message.name);
                sails.log.debug(' ##### FaceController:record: Message Status is %s #### ', message.status);
                if(message.status === 0){
                  sails.log.error(' ##### FaceController:record: Record face success #### ');
                  sails.services.message.local({topic : [message.name, message.id].join('.'), value : _.omit(message, 'data')});
                }else{
                  sails.log.error(' ##### FaceController:record: Record face failed#### ');
                  sails.services.message.local({topic : [message.name, message.id].join('.'), value : _.omit(message, 'data')});
                  return;
                }
                if(user.id){
                  sails.log.debug(' ##### FaceController:record: Going to update user %s with face%s #### ', user.username);

                  User.findOne({id: user.id})
                  .exec(function(err, user){
                    if (err) {
                      sails.log.error(' ##### FaceController:record: Fail to find user  %s #### ', user.alias);
                      return;
                    }
                    if(user){
                      Iris.create({owner: user.id, data: message.data}).exec((err, newFace) => {
                        if(err){
                          sails.log.error(' ##### FaceController:record: Fail to save face for user  %s #### ', user.alias);
                          sails.log.error(err);
                          return;
                        }
                        sails.services.message.local({topic : [message.name, message.id].join('.'), value : _.omit(message, 'data')});                                                
                      })
                    }
                  })
                }
              }
              pubsub.emit('stopStream');
            }
          }
        };
        me.firstEnhanceFace = function(message){
          sails.log.debug(message,'getFace');
          sails.log.debug('#### FaceController: firstEnhanceFace Start ####');
          me.sentMessage = sm('recordFaceEnhance',
            {status: 1},
            _.bind(me.removeFace, me),
            _.bind(function(err){
              onError({error : '人脸比对失败，请检查人脸识别设备'});
              onInternalError(err);
            }, me)
          );
        }
        me.removeFace = function(message){
          if(message){
            sails.log.debug(message,'firstEnhanceFace');
            if(message.id === me.sentMessage.id){
              if(message.status === 0){
                sails.log.debug('#### FaceController: removeFace Start ####');
                sails.services.message.local({topic: 'Face_First', value: {status: 1}});
                me.sentMessage = sm('recordFaceEnhance',
                  {status: 2},
                  _.bind(me.secondEnhanceFace,me),
                  (err) => {sails.log.error(err)}
                );
              }else{
                timeout++;
                if(timeout < 3){//人脸录入过程请求超过三次　录入中断超时
                  sails.log.error('#### FaceController: firstEnhanceFace Failed ####');
                  me.sentMessage = sm('recordFaceEnhance',
                  {status: 1},
                  _.bind(me.removeFace, me),
                  _.bind(function(err){
                      onError({error : '人脸比对失败，请检查人脸识别设备'});
                      onInternalError(err);
                    }, me)
                  );
                }else{
                  timeout = 0;
                  sails.log.info('#### FaceController: firstEnhanceFace Timeout ####');
                  sails.services.message.local({topic: 'Face_Timeout', value: {status: "timeout"}});
                  return;
                }
              }
            }
          }
        }
        me.secondEnhanceFace = function(message){
          if(message){
            sails.log.debug(message,'removeFace');
            if(message.id === me.sentMessage.id){
              if(message.status === 0){
                sails.services.message.local({topic: 'Face_Remove', value: {status: 2}});
                sails.log.debug('#### FaceController: secondEnhanceFace Start ####');
                me.sentMessage = sm('recordFaceEnhance',
                  {status: 3},
                  _.bind(me.recordCombine,me),
                  _.bind(function(err){
                    onError({error : '人脸比对失败，请检查人脸识别设备'});
                    onInternalError(err);
                  }, me)
                );
              }else{
                timeout++;
                if(timeout < 10){
                  sails.log.error('#### FaceController: removeFace Failed ####');
                  me.sentMessage = sm('recordFaceEnhance',
                    {status: 2},
                    _.bind(me.secondEnhanceFace, me),
                    (err) => {sails.log.error(err)}
                  );
                }else{
                  timeout = 0;
                  sails.log.info('#### FaceController: removeFace Timeout ####');
                  sails.services.message.local({topic: 'Face_Timeout', value: {status: "timeout"}});
                  return;
                }
              }
            }
          }
        }
        me.recordCombine = function(message){
          if(message){
            sails.log.debug(message,'secondEnhanceFace');
            if(message.id === me.sentMessage.id){
              if(message.status === 0){
                sails.log.debug('#### FaceController: recordCombine Start ####');
                me.sentMessage = sm('recordFaceEnhance',
                  {status: 4},
                  _.bind(me.saveFace,me),
                  _.bind(function(err){
                    onError({error : '请重新扫描'});
                    onInternalError(err);
                  }, me)
                );
              }else{
                timeout++;
                if(timeout < 3){
                  sails.log.error('#### FaceController: secondEnhanceFace Failed ####');
                  me.sentMessage = sm('recordFaceEnhance',
                    {status: 3},
                    _.bind(me.recordCombine, me),
                    _.bind(function(err){
                      onError({error : '人脸比对失败，请检查人脸识别设备'});
                      onInternalError(err);
                    }, me)
                  );
                }else{
                  timeout = 0;
                  sails.log.info('#### FaceController: secondEnhanceFace Timeout ####');
                  sails.services.message.local({topic: 'Face_Timeout', value: {status: "timeout"}});
                  return;
                }
              }
            }
          }
        }
        me.getFaceQuality = function(message){
          sails.log.debug(message,'recordFace');
          me.sentMessage = sm('getFaceQuality',
            {},
            _.bind(me.firstEnhanceFace, me),
            _.bind(onError, me)
          );
        }
        me.sentMessage = sm('recordFace',
          {retry : 20},
          _.bind(me.saveFace, me),
          _.bind(onError, me)
        );
        //发送人脸数据
        sails.services.face.faceVideo();
        sails.log.silly('#### FaceController : record send message id is %s ####', me.sentMessage.id);
        res.ok(_.pick(me.sentMessage, ['id', 'fnName']));
      }
    })
    .catch((err)=>{
      sails.log.error('error occured in recording face');
      return sails.log.error(err);
    })
  },

  stopScan: function(req,res,next){
    // if(!req.isLocal){
    //   sails.log.error(' ##### FaceController:stopScan forbidden access from remote #### ');
    //   res.badRequest({error: '不允许访问'});
    // }
    if(req.session.cacheMsgId){
      let msgId = req.session.cacheMsgId;
      sails.log.debug('session cache msgId:'+msgId);
      if(fifoclient.destroy(msgId)){
        delete req.session.cacheMsgId;
        res.status(200).json('stop scan success');
      }else{
        sails.log.silly('#### FaceController: stopScan no cache from fifoclient ####');
        res.status(401).json('no cache from fifoclient');
      }
    }else{
      sails.log.silly('#### FaceController: stopScan no cache from session ####');
      res.status(401).json('no cache from session'); 
    }
  },

  recieveSync: function(req, res, next){
    let body = req.body;
    body.data = new Buffer(body.data, 'hex');
    Iris.findOne({id: body.id})
    .then((exist) => {
      if(exist){
        sails.log.info('Iris exist');
        return res.ok(exist);
      }
      Iris.create(body)
      .then((data) => {
        res.ok(data);
      }) 
    })
    .catch((err) => {
      res.serverError(err);
    })
  },

  clean: function(req, res, next){
    let user = req.session.user ? req.session.user : req.user;
    if(typeof user !== 'undefined'){
      Iris.destroy({owner: user.id})
      .then((data) => {
        sails.log.verbose(' ##### FaceController:Clean User Iris Success #### ');
        return res.ok('Success');
      })
      .catch((err) => {
        sails.log.verbose(' ##### FaceController:Clean User Iris Failed #### ');
        return res.serverError({err: '程序错误', msg: err.message});
      })
    }else{
      return res.forBidden('Session No User');
    }
  },

  irisPic: function(req, res, next){
    let path = '/tmp/img_face.bmp';
    fs.readFile(path,(err,data) => {
      if(err){
        sails.log.error('文件不存在');
        return res.sendfile('./assets/face.png');
      }
      if(data){
        res.sendfile(path);
      }else{
        res.sendfile('./assets/face.png');
      }
    })
  }
};
