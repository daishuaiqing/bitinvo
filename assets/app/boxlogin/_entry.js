/**
  Boxlogin.js
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var noty = require("customnoty");
var jade = require("./index.jade");
var css = require("../common/less/base.less");
require("./less/boxlogin.less");
// var i18n = require('locales/zh-CN.json');

var backBtn = require('backbtn');

var pubsub = require('PubSubJS')

var server = require("common/server.js").server;

var countdown = require('countdown');
var faceLogin = require('faceLogin');


var BoxLogin = function(reg){
    //inject method getIId, inject nav, push,leave
    reg.apply(this);
    log.info('BoxLogin has been created');
    return this;
}
_.extend(BoxLogin, {
    NS : 'boxlogin',
    pub : [],
    sub : []
});

var failtimes = 0;
var prototype = {
  init : function (){
    log.info('init BoxLogin entry');

    //定义一个判断是否要请求stopScan
    this.isStopScan = true;
    this.getSystemSetData();
    this.initWakeScreen();
  },
  destroy: function(cb){
    this.cancelFinger();
    this.$node.find('.countdown-box').countdown('destroy');
    this.stopRecordVideo();
    pubsub.unsubscribe('adminauthbyfingerprint');
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  authFingreprintHandler : function(topic, message){
    log.debug(' #### BoxLogin : authFingreprintHandler - receive event topic %s, see message below ####', topic);
    log.debug(message);
    var me = this;
    var $node = me.$node;
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT', me.bindAuthFingreprintHandler);
    pubsub.unsubscribe('FingerPrint_Status');
    /**
      message  = {
       user : user or null
      };
    */
    me.$node.find('.check').addClass('hide');
    var user = message.user;
    if(user){
      log.debug(' #### BoxLogin : authFingreprintHandler - scan success ####');
      me.user.getUserByToken(user.token)
      .done(function(){
        me.speak('scan_success');
        me.userId = user.userId;
        me.nav('/m/userhome');
      })
      .fail(
        function(err){
          try {
            var errorResponseText = JSON.parse(err.responseText);
            noty({text: errorResponseText.error, type: 'error', layout: 'topRight', timeout:2000});
          } catch(e) {
            noty({text: '用户验证失败', type: 'error', layout: 'topRight', timeout: 2000});
          }
          $node.find('#fingerprint-btn').removeClass('hide');
          $node.find('.countdown-box').countdown('destroy');
          $node.find('#restart-prints').removeClass('hidden');
          me.speak('scan_fail');
        }
      );
    }else{
      log.debug(' #### BoxLogin : authFingreprintHandler - scan fails ####');
      //验证失败改变指纹扫描图片上的边框样式
      $node.find('#fingerprint-btn').removeClass('hide');
      $node.find('.countdown-box').countdown('destroy');
      failtimes++;
      if(failtimes > 2){
        failtimes = 0;
        noty({text: '如果手指沾水或受伤，建议使用密码登录', type: 'error', layout: 'top', timeout:2000});
      }else{
        noty({text: message.error, type: 'error', layout: 'topRight', timeout:2000});
      }
      this.speak('scan_fail');
    }
  },
  isCheckFaceLogin: function() {
    var settings = window.localStorage.getItem('systemSetData');
    if (!settings) return false;
    try {
      settings = JSON.parse(settings);
    } catch(e) {
      settings = null;
    }
    if (settings) {
      return settings.facePerception
    }
    return false;
  },
  show : function($node, cb){
    var me = this;

    if (me.isCheckFaceLogin()) {
      $node.append(require('./face.jade')(
        {
          faceIcon: require('./img/face.png'),
          i18n_buttonText: __('buttonText'),
          i18n: __('boxlogin')
        }
      ));
      me.initFaceLoginModule();
    } else {
      $node.append(jade({
        src: require('./img/fingerprint-white.png'),
        i18n_buttonText: __('buttonText'),
        i18n: __('boxlogin')
      }));
      //canvas显示图片
      me.canvasPic(null, true);
      pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT', me.bindAuthFingreprintHandler);
      //automatically start
      me.authFingerPrint();
      //start coutnDown
      me.startCountDown();
    }


    $node.find('.status-bar').backBtn('show', function(){
      me.nav('/m/home');
    });

    $node.on('click', '.btn', function(e){
      var id = $(this).attr('id');
      switch(id) {
        case 'cancel':
          me.nav('/m/home');
          break;
        case 'login':
          me.nav('/m/login');
          break;
        case 'register':
          me.nav('/m/signup');
          break;

        case 'fingerprint-btn':
          me.authFingerPrint();
          me.startCountDown();
          $node.find('#fingerprint-btn').addClass('hide');
          break;
        default:
        ;
      }
    })
    .on('click', '#restart-prints', function(){
      $(this).addClass('hidden');
      me.authFingerPrint();
      me.isStopScan = true;
    });

    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('.btn'), ['waves-light']);
    // waves.init();

    me.recordVideo();

    cb();
  },
  initFaceLoginModule: function() {
    var me = this;
    var $node = me.$node;
    
    me.speak('faceAuth');

    $node.find('.faceLogin-button')
    .off('click').on('click', function() {
      me.disabledFaceLoginBtn();
      me.onFaceAuthSubscribe();
      me.startFaceScan();
    });
  },
  startFaceScan: function() {
    var me = this;
    server({
      url: '/face/_auth'
    })
    .fail(function() {
      me.removeDisabledFaceLoginBtn();
    })
  },
  disabledFaceLoginBtn: function() {
    var me = this;
    me.$node.find('.faceIcon img').attr('src', require('./img/face.png'));
    me.$node.find('.faceLogin-button').addClass('disabled');
    me.$node.find('.faceLogin-button .loader').removeClass('hide');
  },
  removeDisabledFaceLoginBtn: function() {
    var me = this;
    me.$node.find('.faceLogin-button').removeClass('disabled');
    me.$node.find('.faceLogin-button .loader').addClass('hide');
  },
  onFaceAuthSubscribe: function () {
    var me = this;
    var $img = me.$node.find('.faceIcon img');

    pubsub.unsubscribe('SGS_MESSAGE_SCAN_USER_FACE');
    pubsub.subscribe('SGS_MESSAGE_SCAN_USER_FACE', function (topic, value) {
      pubsub.unsubscribe('SGS_MESSAGE_SCAN_USER_FACE');
      var status = value.status;
      var url = '/face/facePic?v=' + Date.now();
      switch (status) {
        case 0:
          me.showNoty('success', '采集成功');
          me.speak('face1');
          break;
        case 1:
          me.showNoty('error', '采集失败,发生未知错误')
          me.speak('face2');
          break;
        case 2:
          me.showNoty('error', '采集失败,摄像头内没有人脸')
          me.speak('face3');
          break;
        case 3:
          me.showNoty('error', '采集失败,人脸光线太暗,建议增加光线')
          me.speak('face4');
          break;
        case 4:
          me.showNoty('error', '采集失败,人脸太模糊,请保持头部静止')
          me.speak('face5');
          break;
        case 5:
          me.showNoty('error', '采集失败,人脸旋转角度太大,请正对屏幕')
          me.speak('face6');
          break;
        case 6:
          me.showNoty('error', '采集失败,人脸特征不清楚，请保持面部整洁')
          me.speak('face7');
          break;
      }
      // 非未状态为(1 | 2)展示图片
      if (status != 1 && status != 2) {
        $img.attr('src', url);
      }

      me.removeDisabledFaceLoginBtn();
    });

    // 验证结果
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_FACE');
    pubsub.subscribe('SGS_MESSAGE_AUTHEN_FACE', function (topic, value) {
      pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_FACE');
      me.removeDisabledFaceLoginBtn();

      console.log('人脸验证的结果: ', value);
      if (value.user) {
        me.speak('scan_success');
        me.userId = value.user.id;
        me.user.getUserByToken(value.user.token)
        .done(function() {
          me.nav('/m/userhome');
        })
        .fail(function() {
          noty({
            text: '用户验证失败',
            type: 'error',
            layout: 'topRight',
            timeout: 2000
          });
        });
      } else {
        if (value.error) {
          if (value.error.error) {
            me.showNoty('error', value.error.error);
          } else {
            // 
          }
        } else {
          me.showNoty('error', '人脸没有匹配成功！');
        }
      }
    });
  },
  showNoty: function(type, message) {
    if (type === 'success') {
      noty({text: message, type: 'success', layout: 'topRight', timeout: 2000});
    } else {
      noty({text: message, type: 'error', layout: 'top', timeout: 2000});
    }
  },
  startCountDown: function(){
    var me = this,
        $node = me.$node;
    $node.find('#fingerprint-btn').addClass('hide');
    $node.find('.countdown-box').countdown('show', 15, function(){
      //时间到了停止指纹扫描，显示重新扫描按钮
      me.cancelFinger();
      noty({text: '指纹扫描超时，请重试', type: 'error', layout: 'top', timeout: 1000});
      $node.find('#fingerprint-btn').removeClass('hide');
    });
  },
  stopRecordVideo: function(){
    server({
      url: '/camera/stop'
    });
  },
  recordVideo: function(){
    server({
      url: '/camera/record'
    });
  },
  canvasPic: function (img, isDefault, isSuccess) {
    var $canvas = this.$node.find('#canvas');
    var canvas = $canvas.get(0);
    var context = canvas.getContext('2d');
    canvas.width = 150;
    canvas.height = 168;
    var ImgDOM = new Image();
    ImgDOM.src = img || require('./img/fingerprint-white.png')
    ImgDOM.onload = function () {
      if (!isDefault) {
        if (isSuccess) {
          context.strokeStyle = "green"
        } else {
          context.strokeStyle = 'red'
        }
        $canvas.addClass('scan_build_pic')
        context.drawImage(ImgDOM, 0, 0, 150, 168)
        context.strokeRect(16, 10, 118, 147)
      } else {
        $canvas.removeClass('scan_build_pic')
        context.drawImage(ImgDOM, 0, 30, 150, 128)
      }
    }
  },
  cancelFinger: function(){
    if(this.isStopScan){
      server({
        url: '/fingerprint/stopScan'
      });
    }
    pubsub.unsubscribe('FingerPrint_Status');
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT');
    pubsub.unsubscribe('adminauthbyfingerprint');
  },
  authFingerPrint: function(){
    var notyInst = null;
    var me = this;

    me.speak('scan');
    server({
      url : '/fingerprint/auth',
      beforeSend: function(){
        notyInst = noty({text: '启动指纹扫描仪', type: 'info', layout: 'topRight', timeout: 2000});
      }
    })
    .done(function(message){
      log.debug(' #### Start Auth by fingerprint #### ');
      log.debug(message);
      pubsub.subscribe('FingerPrint_Status', function(topic, msg){
        me.isStopScan = false;
        console.log('%这里是指纹登录管理系统返回的状态值%', msg.status)
        if(msg.status === 1){
          log.debug('%s ################################################### 1')
          noty({text: '预载入指纹比对失败，重新校验', type: 'info', layout: 'topRight', timeout: 1000})
          me.canvasPic('/fingerprint/fingerPic?' + new Date().getTime(), false, false)
        }else if(msg.status === 0){
          log.debug('%s ################################################### 0')
          noty({text: '扫描成功，正在校验用户指纹', type: 'info', layout: 'topRight', timeout: 1000})
          me.canvasPic('/fingerprint/fingerPic?' + new Date().getTime(), false, true)
          me.$node.find('.countdown-box').countdown('destroy');
          me.$node.find('.check').removeClass('hide');
          me.$node.find('.countdown').countdown('show', 20, function(){
            //时间到了停止指纹扫描，显示重新扫描按钮
            $('.check').addClass('hide');
          }, '正在校验：');
        }else if(msg.status === 4) {
          noty({text: '录入指纹质量较差，请重试', type: 'error', layout: 'top', timeout: 1000})
          me.canvasPic('/fingerprint/fingerPic?' + new Date().getTime(), false, false)
        }
      });
      me.bindAuthFingreprintHandler = _.bindKey(me, 'authFingreprintHandler');
      pubsub.subscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT', me.bindAuthFingreprintHandler);
      me.speak('scan', true);
    })
    .fail(function(err){
      me.isStopScan = false;
      pubsub.unsubscribe('FingerPrint_Status');
      var responseJSON = err && err.responseJSON;
      if (responseJSON) {
        var errorText = responseJSON.msg ? responseJSON.msg : (responseJSON.code ? responseJSON.code : '请求异常');
        return noty({text: errorText, type: 'error', layout: 'top', timeout:2000});
      }
    })
    .always(function(){
      notyInst.close();
    });
  },
  initFaceLogin: function() {
    var me = this,
        $node = me.$node,
        $html = $('<div>');
    //初始化人脸识别组件
    $html.faceLogin('show');
    me.speak('face');
    $html.on('onFaceLogin', function() {
      me.faceAuth();
    });

    $node.find('.face-box').html($html);
  },
  faceAuth: function() {
    var me = this;
    var userId = me.userId;
    me.server({
      url: '/face/auth?userId=' + userId
    })
    .done(function(data) {
      pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FACE')
      pubsub.subscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FACE', function(topic, message) {
        if (message.userId === userId) {
          me.nav('/m/userhome');
        } else {
          noty({text: '人脸验证失败,当前用户不匹配', type: 'error', layout: 'top', timeout: 3000});
        }
      });
    })
    .fail(function(error) {
      console.log('This is faceAuth error', error)
      var errorObj = null;
      if (error.responseText) {
        errorObj = JSON.parse(error.responseText);
      } else {
        errorObj = {error: '开启人脸验证失败'}
      }
      noty({text: errorObj.error, type: 'error', layout: 'top', timeout: 2000});
    })
    .always(function() {
      me.faceStopscan();
    });
  },
  faceStopscan: function() {
    this.server({
      url: '/face/stopScan',
      method: 'get'
    })
  },
  getSystemSetData: function () {
    var me = this;
    $.ajax({
      url: '/system/settings',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    .done(function(data) {
      var systemSetData = {};
      _.forEach(data, function(item) {
        if (item.value === 'true') {
          item.value = true
        } else if (item.value === 'false') {
          item.value = false
        }
        _.set(systemSetData, item.key, item.value);
      });
      window.localStorage.setItem('systemSetData', JSON.stringify(systemSetData));
    })
  },
  wakeScreen: function () {
    server({
      url: '/system/wakeup',
      method: 'get'
    });
  },
  initWakeScreen: function () {
    var me = this;

    var throttled = _.throttle(me.wakeScreen, 6000, { 'trailing': false });

    $(document)
    .off('click')
    .on('click', throttled)
  }   
}

_.extend(BoxLogin.prototype, prototype);

module.exports = BoxLogin;
