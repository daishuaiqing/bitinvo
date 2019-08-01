'use strict';
var pubsub = require('PubSubJS');
var server = require('./server');
var noty = require('customnoty');

var Director = function(){
  log.info('Director has been created');
}
Director.sub = {
  'registerTask' : 'router.changed',
  // 'alarmNoty' : 'system.error',
  'alarmNoty': 'system.alarm',
  'closeWindow': 'closeWindow',
  'warningHandler' : 'system.warning',
  'messageHandler' : 'system.message',
  'forceLogout' : 'request.forbidden'
};
Director.pub = {

};
var prototype = {
  //managed modules
  modules : [],

  tasks : [],

  loading : false,

  // 保存东西给下一个module用， 会在下次跳转的时候被清空
  flashbag: null,

  alarmHandler : function(topic, data){
    this.flashbag = data;
    if(this.currModuleMountIsWindow && this.checkedPrevModuleMountIsWindow()){
      this.sendUpdate(data);
    }else{
      this.router.nav('/m/alert#window');
    }
  },
  alarmNoty: function(topic, data) {
    var me = this;
    var notyText = '';
    var msgArray = data.msg.split('|');
    var msgArrayLen = msgArray.length;
    var alarmText = null;
    var notyText = null;

    if (me.notyArray.indexOf((data.msg).trim()) !== -1) return;
    
    me.notyArray.push(data.msg)
    
    if (this.currModuleMountIsWindow && this.checkedPrevModuleMountIsWindow()) {
      me.notyArray = [];
      me.alarmHandler(topic, data)
      return;
    }
    
    if (msgArrayLen > 1) {
      alarmText = msgArray[1] + '柜机' + '/' + msgArray[0];
    } else {
      alarmText = data.msg
    }
    this.flashbag = data;  


    noty({
      text: alarmText,
      maxVisible : 10,
      template: '<div class="noty_message" style="background-color:#562525;"><span class="noty-number-style"></span><span class="noty_text"></span><div class="noty_close"></div></div>',
      callback : {
        onShow : function() {
        },
        afterClose: function() {
          me.notyArray.splice(me.notyArray.indexOf(data.msg), 1)
        }
      },
      buttons: [
        {
          addClass: 'btn btn-empty big', text: '解除', onClick: function($noty) {
            $noty.close();
            if(data.onConfirmAPI){
              server.server({url: data.onConfirmAPI});
            }
            if(data.onConfirmRedirect){
              me.router.nav(data.onConfirmRedirect);
            }
            me.alarmHandler(null, data)
          }
        },
        {
          addClass: 'btn btn-empty big', text: '取消', onClick: function($noty) {
            $noty.close();
            if(data.onCancelAPI){
              server.server({url: data.onCancelAPI});
            }
            if(data.onCancelRedirect){
              me.router.nav(data.onCancelRedirect);
            }
          }
        }
      ],
      type: 'information', layout: 'top', timeout: 52000000
    });    
  },
  warningHandler : function(topic, data){
    noty({text: data.msg, type: 'warning', layout: 'top', timeout: 120000});
  },
  notyArray: [],
  messageNotyArray: [],
  messageHandler : function(topic, data){
    var me = this;
    console.log('message handler method: ##############################', data)
    if(data.topic === 'user.message'){
      var confirmText = data.confirmText ? data.confirmText : '确认';
      var cancelText = data.cancelText ? data.cancelText : '取消';
      var dataMsgPos = me.messageNotyArray.indexOf(data.msg);
      if ( dataMsgPos > -1) return; 
      me.messageNotyArray.push(data.msg);

      noty({
        text: data.msg,
        maxVisible : 10,
        template: '<div class="noty_message"><span class="noty-number-style"></span><span class="noty_text"></span><div class="noty_close"></div></div>',
        callback : {
          onShow : function() {
          },
          afterClose: function() {
            me.messageNotyArray.splice(me.messageNotyArray.indexOf(data.msg), 1);
          }
        },
        buttons: [
          {
            addClass: 'btn btn-empty big', text: confirmText, onClick: function($noty) {
              $noty.close();
              if(data.onConfirmAPI){
                server.server({url: data.onConfirmAPI});
              }
              if(data.onConfirmRedirect){
                me.router.nav(data.onConfirmRedirect);
              }
            }
          },
          {
            addClass: 'btn btn-empty big', text: cancelText, onClick: function($noty) {
              $noty.close();
              if(data.onCancelAPI){
                server.server({url: data.onCancelAPI});
              }
              if(data.onCancelRedirect){
                me.router.nav(data.onCancelRedirect);
              }
            }
          }
        ],
        type: 'information', layout: 'top', timeout: 52000000
      });
    }
  },

  closeWindow: function() {
    var outModule = this.removeModule();
    $('.window_mask').addClass('hide');
    $('.window').addClass('hide');
    this.layout.out(
      outModule,
      {　node: $('.window')　},
      function () {
        console.log('@@@@@@@ invocked first module destroy @@@@@@@@@@@@@@@@@@@@')
      }
    )
  },

  forceLogout : function(){
    noty({text: '上次登录已经失效, 请重新登录', type: 'error', timeout: 10000});
    var me = this;
    this.userManagement.signout('user.signout.fromdirector', function(){
      me.router.nav('/m/login');
    });
  },

  addModule : function(module){
    this.modules.push(module);
  },
  removeModule : function(){
    return this.modules.pop();
  },
  removeAllModule : function(){
    this.modules = [];
    return this.modules;
  },
  removeLastSecondModule: function() {
    return this.modules.shift();
  },
  checkedPrevModuleMountIsWindow: function() {
    var prevModule = this.modules[this.modules.length - 1];
    return prevModule && prevModule.isWindowMount;
  },

  onLoadModuleError : function(e){
    log.error('Error on loading modules');
    this.loading = false;
    this.modules = [];
    var isDebug = $('html').hasClass('debug');
    if(isDebug) return;
    if (typeof e !== 'undefined') {
      this.recordFrontEndFailLog(e);
    }
    noty({text: '请稍等片刻，然后再登录', type: 'error', timeout:5000});
    setTimeout(function(){
      window.location.href = '/m/login';
    }, 5000);
  },

  /**
    记录错误发送到后端，进行前端错误上报
  */

  recordFrontEndFailLog: function (e) {
    console.log('############## this is recordFrontEndFailLog', e);
    $.ajax({
      url: '/recordFrontEndFailLog/recordLog',
      type: 'POST',
      data: {'message': e.message, 'stack': e.stack}
    })
  },

  /**
    所有的切换都是以task形式存在的， 在上一个task结束之后才会执行下一个，如果router.change之后就会在这里注册
  */
  registerTask : function(msg, data){
    log.info('new Task is registered', data);
    if (typeof data === 'object') {
      this.currModuleMountIsWindow = true;
      this.tasks.push([msg, data.moduleName]);
    } else {
      this.currModuleMountIsWindow = false;
      this.tasks.push([msg, data]);
    }
    this.checkTask();
    this.checkedLockCabinet();
  },

  // 检测是否封柜
  checkedLockCabinet: function(data) {
    var lockCabinet = null;
    var remoteLockCabinet = null;
    $.ajax({
      url: '/system/settings',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    .done(function(data) {
      for (var i = 0, len = data.length; i < len; i++) {
        if (data[i].key === 'lockCabinet') {
          lockCabinet = data[i].value === 'true';
        } else if (data[i].key === 'remoteLockCabinet') {
          remoteLockCabinet = data[i].value === 'true';
        }
      }

      pubsub.publish('sub.lockCabinet', {lockCabinet: lockCabinet, remoteLockCabinet: remoteLockCabinet});
    });
  },

  /**
    runtask的形式一个是主动检查，如果为1 说明task 队列中只有刚刚加入的task，可以马上执行，否则要等待上一个结束
  */
  checkTask : function(){
    log.info('Checking the task buffer');
    if(this.tasks.length === 1){
      log.info('Only one task left, we can go on to run task');
      this.runTask();
    }
  },

  /**
    执行task
  */
  runTask : function(){
    if(this.tasks.length > 0){
      log.info('Run next task');
      this.loadModule.apply(this, this.tasks[0]);
    }
  },

  /**
    标记task已经完成，同时执行下一个
  */
  finishTask: function(){
    this.tasks.shift();
    this.runTask();
  },

  /**
    如果当前的module和nav到的router一样，那么可以通过这个方法来调用app的更新方法
  */
  sendUpdate : function(data){
    log.info('Send update to module', this.modules, 'send data:', data);
    if(this.modules && this.modules.length > 0){
      var lastModule = this.modules[this.modules.length - 1];
      console.log(lastModule, '-----------------------')
      lastModule.update && lastModule.update(data);
    }
  },

  loadModule : function(msg, data){
    var me = this;
    log.info('Loading Module');
    log.debug('Event is ' + msg);
    log.debug('Module name is ' + data); // module name

    // require.ensure([], function(require) {
      var Module = require('../'+ data + '/entry.js');
      try{
        me.syncLoadModule(Module, msg, data);
      }catch(e){
        log.error(e);
        me.onLoadModuleError();
      }
    // });
  },
  syncLoadModule : function(Module, msg, data){
    var me = this;
    log.info('Module "%s" Loaded', data);
    log.info('Module name space is "%s"', Module.NS);

    var $mountDOM = this.currModuleMountIsWindow ? $('.window') : $('.main');

    if (this.currModuleMountIsWindow) {
      $mountDOM.removeClass('hide');
      $('.window_mask').removeClass('hide');
    } else {
      $('.window').addClass('hide');
      $('.window_mask').addClass('hide');
    }

    var iid = UUID.v1();
    var injection = {
      getIId : function(){
        return iid;
      },
      getFlashbag : function(){
        var flashbag = me.flashbag;
        me.flashbag = null;
        return flashbag;
      },
      setFlashbag : function(flashbag){
        me.flashbag = flashbag;
      },
      ///////////////////////////// Layout Start
      nav : function(moduleName, config){
        if(me.loading){
          return;
        }else{
          me.loading = true;
          me.router.nav(moduleName);
        }
      },
      push : function (moduleName, config){
        // log.debug(moduleName);
        // log.debug(config);
      },
      leave : function (moduleName, config){
        // log.debug(moduleName);
        // log.debug(config);
      },
      ///////////////////////////// Layout End
      speak : function(soundId, stopPrev){
        me.audio.play(soundId, stopPrev);
      },
      ///////////////////////////// message related start
      message : {
        send : function(data){
          me.message.send(data);
        },
        subscribe : function(){
          me.message.subscribe();
        },
        unsubscribe : function(){
          me.message.unsubscribe();
        }
      },
      ///////////////////////////// message related end

      ///////////////////////////// user related start
      user : {
        signin: function(username, password, onSuccess, onError){
          me.userManagement.signin(username, password, onSuccess, onError);
        },
        signout: function(onSuccess, onError){
          me.userManagement.signout(onSuccess, onError);
        },
        getUser: function(){
          return me.userManagement.getUser();
        },
        getUserByToken : function(token){
          return me.userManagement.getUserByToken(token);
        },
        updateUser : function(data, beforeSend){
          return me.userManagement.updateUser(data, beforeSend);
        },
        hasPermission : function(permission){
          return me.userManagement.hasPermission(permission);
        }
      },
      server : function(conf){
        return server.server(conf);
      }

      ///////////////////////////// user related end
    }

    var module = new Module(function(){_.extend(this, injection)});

    module.NS = Module.NS;

    log.info('Module %s, %s initializing', Module.NS, module.getIId());
    module.init();
    log.info('Module %s, %s initialized', Module.NS, module.getIId());


    if(this.modules.length == 0){
      log.info('This is first module, go with it');
      // me.layout.in(module, {node: $mountDOM}, function(){
      //     log.info('Add module to module list for the first time');
      //     me.addModule(module);
      // });

      // push new module to the stack
      me.addModule(module);
      log.info('%s %s is pushed to stack', module.NS, module.getIId());
      if(Module.noAuth){
        log.info('Fetch user info in Director is fail, fall back to display module without user info');
        me.layout.in(
          module,
          {node: $mountDOM},
          function(){
            me.loading = false;
            log.info('================= %s %s sequence is end after fail ===============', module.NS, module.getIId());
            me.finishTask();
          },
          _.bind(me.onLoadModuleError, me)
        );
      }else{
        var user = me.userManagement.getUser();
        user.done(function(user){
          log.info('Fetch user info in Director is ok, go to display module');
          log.info('%s %s is going in under directed for first', module.NS, module.getIId());
          me.layout.in(
            module,
            {node: $mountDOM},
            function(){
              log.info('Add module to module list for the first time');
              log.info('%s %s is going in under directed', module.NS, module.getIId());
              me.loading = false;
              log.info('================= %s %s sequence is end after first added ===============', module.NS, module.getIId());
              me.finishTask();
            },
            _.bind(me.onLoadModuleError, me)
          );
        })
        .fail(function(){
          log.info('Fetch user info in Director is fail, fall back to display module without user info');
          me.layout.in(
            module,
            {node: $mountDOM},
            function(){
              me.loading = false;
              log.info('================= %s %s sequence is end after fail ===============', module.NS, module.getIId());
              me.finishTask();
            },
            _.bind(me.onLoadModuleError, me)
          );
        });
      }
    }else{

      if (me.currModuleMountIsWindow) {
        module.isWindowMount = true;
      } else {
        module.isWindowMount = false;
      }
      // 当前模块是窗口模式，上一个模块不是窗口模式。不进行layout.out操作
      if (me.currModuleMountIsWindow && !me.checkedPrevModuleMountIsWindow()) {
        // 如果是挂载为window则自动添加isWindowMount为true
        me.addModule(module);

        me.layout.in(
          module,
          {node: $mountDOM},
          function(){
            log.info('%s %s is in and loading over', module.NS, module.getIId());
            me.loading = false;
            log.info('================= %s %s sequence is end after module switch ===============', module.NS, module.getIId());
            me.finishTask();
          },
          _.bind(me.onLoadModuleError, me)
        );

        // 如果当前模块为是window挂载点，直接return
        return true;
      }

      // 如果当前模块不是窗口模式，上一个模块是窗口模式。则手动删除main的一个模块
      console.log('all mode:', this.modules)
      console.log('检测模块：', me.checkedPrevModuleMountIsWindow(), '当前模块:', !me.currModuleMountIsWindow)
      if (me.checkedPrevModuleMountIsWindow() && !me.currModuleMountIsWindow) {
        var lastSecond = this.removeLastSecondModule();
        this.layout.out(
          lastSecond,
          {　node: $mountDOM　},
          function () {
            console.log('@@@@@@@ invocked first module destroy @@@@@@@@@@@@@@@@@@@@')
          }
        )
      }

      // 非窗口模块加载
      log.info('This is another module, go with it');
      var outModule = this.removeModule();

      log.info('%s %s is poped from stack', outModule.NS, outModule.getIId());

      // push new module to the stack
      me.addModule(module);
      log.info('%s %s is pushed to stack', module.NS, module.getIId());

      this.layout.out(
        outModule,
        {node: $mountDOM},
        function(){
          log.info('%s %s is going in under directed', module.NS, module.getIId());
          me.layout.in(
            module,
            {node: $mountDOM},
            function(){
              log.info('%s %s is in and loading over', module.NS, module.getIId());
              me.loading = false;
              log.info('================= %s %s sequence is end after module switch ===============', module.NS, module.getIId());
              me.finishTask();
            },
            _.bind(me.onLoadModuleError, me)
          );
        },
        _.bind(me.onLoadModuleError, me)
      );
    }
  },

  init : function(router, layout, message, audio, userManagement){
    var me = this;

    this.router = router;
    this.layout = layout;
    this.message = message;
    this.audio = audio;
    this.userManagement = userManagement;

    _.each(Director.sub, function(topicName/*value*/, handlerFn/*key*/){
      pubsub.subscribe(topicName, function(msg, data){
        me[handlerFn].apply(me, [msg, data]);
      });
    });

    return this;
  },
  destroy : function(){
    return this;
  }
}

_.extend(Director.prototype, prototype);
module.exports = new Director();
