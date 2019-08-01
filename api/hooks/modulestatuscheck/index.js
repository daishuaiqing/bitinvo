/*
*
* Module Status Check Hook Start
*/

'use strict';

var _ = require('lodash');
var Promise = require("bluebird");
var FIFO = require('bitinvo-fifo').Fifo;

var checkModuleListInterval = sails.config.cabinetSettings.checkModuleListInterval; 
var checkModuleStatusInterval = sails.config.cabinetSettings.checkModuleStatusInterval;
var gunIsItInterval = 60 * 60 * 1000;
var messageLimit = 10000;

var onError = function(err){
  sails.log.error(' ##### Module Status Check Hook :onError #### ');
  sails.log.error(err);
}

module.exports = function ModuleStatusCheck(sails) {
  sails.log.silly('Module Status Check Hook Loaded');
  return {
    initialize: function(cb) {
      sails.log.debug(' #### Module Status Check Hook is initialized @1 #### ');
      var sm = sails.services.fifoclient.sendFifoMessage;
      var me = this;

      if(checkModuleStatusInterval > checkModuleListInterval){
        throw new Error('Module Status Hook:initialize: checkModuleStatusInterval can not be bigger than checkModuleListInterval')
      }

      me.handler = function(message, log){
        sails.log.silly(' ##### Module Status Check Hook:Handler #### ');
        sails.log.silly(message);
        if(message && log){
          sails.log.silly(' #####  Module Status Check Hook: Loop into the return fifo parsed data  @@@@ 3 #### ');
          sails.log.silly(message);
          // the params we pass to sails.services.fifoclient.sendFifoMessage
          var params = log.params;
          sails.log.silly(' #####  Module Status Check Hook: cache log  @@@@ 3.1 #### ');
          sails.log.silly(params);
          var moduleId = params.moduleId;
          var canId = params.canId;
          if(message.name === 'SGS_MESSAGE_GET_GUNLOCK_STATE'){
            sails.log.silly(' #####  ModuleStatusCheckHook:handler - Entering SGS_MESSAGE_GET_GUNLOCK_STATE with canId %s , module Id %s @@@@ 5 #### ', canId, moduleId);
            CabinetModule.findOne({canId : canId, moduleId : moduleId})
            .exec(function(err, cm){
              if(err || !cm){
                return;
              }
              cm.lockState = message.lockState;
              cm.gunState = message.gunState;
              if(cm.gunState === 0){
                cm.load = 1;
              }else{
                cm.load = 0;
              }
              cm.UpdatedFrom = sails.config.cabinet.id;
              cm.save(function(err){
                if(err){
                  sails.log.error(' ##### Module Status Check Hook:handler update  ---  GUN LOCK STATE  --- fails with can id %s, module Id %s##### ', canId, moduleId);
                  sails.log.error(err);
                }
                return;
              });
            });
          }else if(message.name === 'SGS_MESSAGE_GET_BULLETLOCK_STATE'){
            sails.log.silly(' #####  ModuleStatusCheckHook:handler - Entering SGS_MESSAGE_GET_BULLETLOCK_STATE with canId %s @@@@ 6 #### ', canId);
            CabinetModule.findOne({canId : canId})
            .exec(function(err, cm){
              if(err || !cm){
                return;
              }
              cm.state = message.state;
              cm.UpdatedFrom = sails.config.cabinet.id;
              cm.save(function(err){
                if(err){
                  sails.log.error(' ##### Module Status Check Hook:handler update --- BULLET LOCK STATE --- fails with can id %s ##### ', canId);
                  sails.log.error(err);
                }
                return;
              });
            });
          }else if(message.name === 'SGS_MESSAGE_GET_BULLET_NUMBER'){
            sails.log.silly(' #####  ModuleStatusCheckHook:handler - Entering SGS_MESSAGE_GET_BULLET_NUMBER with canId %s @@@@ 6 #### ', canId);

            CabinetModule.findOne({canId : canId})
            .exec(function(err, cm){
              if(err || !cm){
                return;
              }
              cm.load = message.number;
              cm.UpdatedFrom = sails.config.cabinet.id;
              cm.save(function(err){
                if(err){
                  sails.log.error(' ##### Module Status Check Hook:handler update --- bullet number --- fails with can id %s ##### ', canId);
                  sails.log.error(err);
                }
                return;
              });
            });
          }
        }
      }

      var getModules = function(){
        return new Promise(function (resolve, reject) {
          CabinetModule.find()
          .limit(100)
          .skip(0)
          .exec(function(err, modules){
            if(err){
              if(err){
                sails.log.error(' ##### Module Status Check Hook: Can not find ##### ');
                sails.log.error(err);
                reject(err);
                return;
              }
            }
            resolve(modules);
          });
        });
      }

      me.moduleListTimer = null;

      me.bulletStatustTimer = null;

      function checkModuleStatus(){
        me.bulletStatustTimer = setTimeout(function() {
          sails.log.silly('Checking Module Status');
          var modules = me.modules;
          _.each(modules, function(module, index){
            sails.log.silly('Checking Module %s with canid %s', module.id, module.canId);
            //发送过快会导致can busy， 无法发送消息，从而返回55aaff的错
            _.delay(function(){
              if(module.type === 'bullet'){
                sm('getBulletLockState',
                  {
                    canId : module.canId
                  },
                  _.bind(me.handler, me),
                  _.bind(onError, me)
                );
                sm('getBulletNumber',
                  {
                    canId : module.canId
                  },
                  _.bind(me.handler, me),
                  _.bind(onError, me)
                );
              }
              // else if (module.type === 'gun'){
              //   sm('getGunLockState',
              //     {
              //       canId : module.canId,
              //       moduleId : module.moduleId
              //     },
              //     _.bind(me.handler, me),
              //     _.bind(onError, me)
              //   );
              // }
            }, 100 * index);
          });
          checkModuleStatus();
        }, checkModuleStatusInterval);
      }

      /**
       *  添加检查枪位和弹仓信息的timer，这里去查询更新数据库中关于整个柜机的配置信息， 通过配置信息来调用checkModuleStatus检查子弹数量和枪是否在位
       */
      function checkModuleList(){
        me.moduleListTimer = setTimeout(function() {
          sails.log.silly('Checking Module List');
          clearTimeout(me.bulletStatustTimer);
          getModules()
          .then(function(modules){
            sails.log.silly('Checking Module Status : %s Module is loaded', modules.length);
            me.modules = modules;
            checkModuleStatus(modules);
            checkModuleList();
          });
        }, checkModuleListInterval);
      }

      function checkGun(){
        me.checkGunTimer = setTimeout(function() {
          sm('getGunIsisit', {}, function(msg){
            sails.log.debug('#### modulestatuscheck hook : checkGun fifo sent success ####');
            if(msg.status == 1){
              sails.log.debug(`#### modulestatuscheck hook : checkGun fifo msg fail ####`)
            }else{
              sails.log.debug(`#### moduelstatuscheck hook : checkGun fifo msg success ####`);
            }
          }, function(err){
            sails.log.debug(`#### moduelstatuscheck hook : checkGun fifo msg fail`);
          });
          checkGun();
        }, 60 * 60 * 1000);
      }

      sails.after(['lifted'], function() {
        // Finish initializing custom hook
        // setTimeout(function() { //在真机上如果不延时的话， 会出现访问数据库超时的错误
        //   getModules()
        //   .then(function(modules){
        //     sails.log.silly('Checking Module Status : Module is loaded at first time after orm loaded');
        //     sails.log.silly(modules);
        //     me.modules = modules;
        //     //开始检查模块状态
        //     checkModuleStatus();
        //     //注册加载模块列表
        //     checkModuleList();
        //     //校准枪位
        //     checkGun();
        //   });
        // }, 2000);
      });

      sails.after(['lowered'], function () {
        sails.log.silly(' ####  Module Status Check Hook:  Server is lowered, Module Checking hook is going to shutdown @ 1 #### ');
        //close file
        server.close();
        //clean timer
        clearTimeout(me.bulletStatustTimer);
        clearTimeout(me.moduleListTimer);
        clearTimeout(me.checkGunTimer);
      });
      return cb();
    }
  }
}
/**
* Module Status Check Hook End
*/
