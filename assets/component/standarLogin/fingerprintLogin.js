'use strict';

var jade = require('./tmp/fingerprint.jade');
var ejp = require('easy-jq-plugin');
var countdown = require('countdown');
var i18n = require('locales/zh-CN.json');
var pubsub = require('PubSubJS');
var noty = require('customnoty');
var server = require('common/server.js').server;
var user = require("common/usermanagement");
var audio = require('common/audio.js');
require('./less/fingerprint.less');

var fingerprintLogin = function (element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version: '0.0.1',
  name: 'fingerprintLogin'
};

var prototype = {
  render: function (config) {
    var me = this;
    var $node = me.$node;
    this.config = config;
    $node.html(jade());

    me.initFingerprintAuth();

    $node.find('#restart-prints')
    .off('click')
    .on('click', function() {
      me.initFingerprintAuth();
    });

    return $node;
  },
  initFingerprintAuth: function() {
    var me = this;
    me.hideRestartScanBtn();
    me.renderCanvas(true);
    me.onScanStatus();
    me.onAuthStatus();
    me.startScan();
  },
  startScan: function() {
    var me = this;
    var ajaxConfig = me.config.fingerprint.ajaxConfig;

    // 判断是否为登录管理版
    me.isLoginManagePage = me.config.isLoginManagePage;

    console.log('指纹扫描AIP', ajaxConfig, me.config);

    if (!ajaxConfig) {
      throw '初始化参数: fingerprint.ajaxConfig 不存在';
    }
    
    server(ajaxConfig)
    .done(function() {
      me.startCountdown();
    })
    .fail(function(error) {
      var errText = '请求指纹扫描失败';
      if (error && error.responseJSON && error.responseJSON.msg) {
        errText = error.responseJSON.msg;
      }
      me.showNoty('error', errText);
      me.showRestartScanBtn();
      me.$node.trigger('FINGERPRINT_AUTH_ERROR');
    });
  },
  stopScan: function() {
    var me = this;
    server({
      url: '/fingerprint/stopScan'
    });
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT');
    pubsub.unsubscribe('adminauthbyfingerprint');
    pubsub.unsubscribe('FingerPrint_Status');
  },
  onScanStatus: function() {
    var me = this;
    var $node = me.$node;

    pubsub.unsubscribe('FingerPrint_Status');
    pubsub.subscribe('FingerPrint_Status', function(topic, value) {
      pubsub.unsubscribe('FingerPrint_Status');
      console.log('##### 接收到指纹扫描状态 ########', topic, value)

      var status = value.status;
      // 0是成功
      if (status == 0) {
        me.showNoty('success', '扫描成功，正在校验警员指纹');
      } else if (status == 1) {
        me.showNoty('success', '预载入指纹比对失败，重新校验');
      } else if (status == 4) {
        me.showNoty('error', '扫描的指纹较差，请重新扫描');
      }
      if (status == 0) {
        me.renderCanvas(false, true);
      } else {
        me.renderCanvas(false, false);
        me.showRestartScanBtn();
        
        // 通知外面
        me.$node.trigger('FINGERPRINT_AUTH_ERROR');
      }
    });
  },
  onAuthStatus: function() {
    var me = this;
    var config = me.config;
    var isAdminAuth = config.isAdmin;
    var TOPIC = isAdminAuth ? 'adminauthbyfingerprint' : 'SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT';

    pubsub.unsubscribe(TOPIC);
    pubsub.subscribe(TOPIC, function (topic, value) {
      pubsub.unsubscribe(TOPIC);
      // 停止倒计时
      me.stopCountdown();

      var user = value && value.user;
      var status = value && value.status;
      var error;
      if (user) {
        me.handleSuccess(user);
      } else {
        // 处理管理员验证的情况
        if (status === 'success') {
          me.handleSuccess({id: value.userId});
        } else {
          me.handleFailed(value);
        }
      }
    });
  },
  handleSuccess: function(userData) {
    console.log('指纹扫描用户信息存在：', userData);
    var me = this;
    if (userData && userData.token) {
      user.getUserByToken(userData.token, me.isLoginManagePage)
      .done(function(data) {
        me.speak('scan_success');
        me.$node.trigger('FINGERPRINT_AUTH_SUCCESS', data);
      })
      .fail(function(err) {
        var _err = err && err.responseJSON && err.responseJSON.error || '指纹验证失败';
        me.handleFailed({
          error: _err
        });
      });
    } else if (userData.id) {
      // 管理员验证成功只有, userId
      me.$node.trigger('FINGERPRINT_AUTH_SUCCESS', userData);
    } else {
      me.showNoty('error', '用户的token或者userId不存在');
      me.$node.trigger('FINGERPRINT_AUTH_ERROR');
      me.speak('scan_fail');
    }
  },
  handleFailed: function(value) {
    console.log('指纹扫描验证结果失败:', value);
    var me = this;

    me.showRestartScanBtn();
    me.speak('scan_fail');

    if (value && value.status === 'fail') {
      me.showNoty('error', value.info);
    } else if (value.error) {
      me.showNoty('error', value.error);
    } else {
      me.showNoty('error', '用户信息不存在');
    }
    // 通知外面
    me.$node.trigger('FINGERPRINT_AUTH_ERROR');
  },
  // 倒计时开始
  startCountdown: function() {
    var me = this;
    var $node = me.$node;
    var $countdown;
    
    if (!$node) return;
    
    me.speak('scan');
    $countdown = $node.find('.countdown-box');
    if ($countdown.length) {
      $countdown.countdown('show', 15, function() {
        // 倒计时结束:>停止指纹扫描
        me.stopScan();
        me.showRestartScanBtn();
        me.showNoty('error', '指纹扫描超时, 请重试!');
        me.$node.trigger('FINGERPRINT_AUTH_ERROR');
      });
    }
  },
  stopCountdown: function() {
    var $node = this.$node;
    var $countdown = $node.find('.countdown-box');
    if ($countdown.length) {
      console.log('########### 销毁了倒计时 ############');
      $countdown.countdown('destroy');
    }
  },
  showRestartScanBtn: function() {
    this.$node.find('#restart-prints').removeClass('hide');
    this.stopCountdown();
  },
  hideRestartScanBtn: function() {
    this.$node.find('#restart-prints').addClass('hide');
  },
  // 渲染指纹图片
  renderCanvas: function(isDefault, isSuccess) {
    if (!this.$node) return;
    var $canvas = this.$node.find('#canvas');
    var canvas = $canvas.get(0);
    var context = null;
    if (!this.canvasContext) {
      context = canvas.getContext('2d');
      this.canvasContext = context;
    } else {
      context = this.canvasContext;
    }
    canvas.width = 150;
    canvas.height = 158;
    var ImgDOM = new Image();
    ImgDOM.src = !isDefault ? '/fingerprint/fingerPic?v=' + Date.now() : require('./img/fingerprint-white.png');
    ImgDOM.onload = function () {
      if (!isDefault) {
        if (isSuccess) {
          context.strokeStyle = "green"
        } else {
          context.strokeStyle = 'red'
        }
        $canvas.addClass('scan_build_pic')
        context.drawImage(ImgDOM, 0, 0, 150, 158)
        context.strokeRect(16, 10, 118, 137)
      } else {
        $canvas.removeClass('scan_build_pic')
        context.drawImage(ImgDOM, 0, 30, 150, 128)
      }
    }
  },
  // 倒计时结束
  speak: function(key, keepKep) {
    audio.play(key, keepKep);
  },
  showNoty: function (type, message) {
    if (type === 'success') {
      noty({
        text: message,
        type: type,
        layout: 'topRight',
        timeout: 2000
      });
    } else if (type === 'error') {
      noty({
        text: message,
        type: type,
        layout: 'top',
        timeout: 1000
      });
    } else {
      noty({
        text: message,
        type: 'info',
        layout: 'topRight',
        timeout: 2000
      });
    }
  },
  destroy: function () {
    this.stopScan();
    this.stopCountdown();
  }
};

module.exports = ejp.pluginize(fingerprintLogin, metadata, prototype);