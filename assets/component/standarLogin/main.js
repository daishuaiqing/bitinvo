/** 使用说明
 *  $element.standarLogin('show', config).on('loginSuccess').on('loginError);
 * 
 * config: {
    password: {
      isAdmin: false,
      isNoSession: false,   // isAdmin: false, 用户验证才需要
      adminAjaxConfig: {

      }
    },
    fingerprint: {
      ajaxConfig: {

      }
    }
  }
*/

'use strict';
var ejp = require('easy-jq-plugin');
var passwordLogin = require('./password.js');
var faceLoginModule = require('./faceLoginModule.js');
var fingerprintLogin = require('./fingerprintLogin.js');
var pubsub = require('PubSubJS');
var server = require('common/server.js').server;

require('./main.less');

var standarLogin = function(element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version: '0.0.1',
  name: 'standarLogin'
};

var prototype = {
  show: function(config) {
    var me = this;
    this.config = config;
    me.loginCount = {
      face: 0,
      fingerprint: 0
    };
    me.checkedIsOpenFaceLogin = me.getSystemSetting('facePerception');
    // type: ['face', 'fingerprint', 'password'];
    var defaultLoginType = me.checkedIsOpenFaceLogin() ? 'face' : 'fingerprint';
    
    me.render(defaultLoginType);
  },
  render: function(type) {
    var me = this;
    var $node = me.$node;
    var $module = $node.find('.login-module_container');
    if ($module.length) {
      me.destroy();
    }
    
    if ($('html').hasClass('remote')) {
      type = 'password';
    }

    $module = $('<div class="col-md-offset-4 col-md-6 clearfix pull-middle-center login-module_container">');
    me.type = type;
    $node.html($module);
    if (type === 'face') {
      me.renderFaceLogin($module);
    } else if (type === 'fingerprint') {
      me.renderFingerprint($module);
    } else if (type === 'password') {
      me.renderPassword($module);
    }
  },
  getSystemSetting: function(key) {
    var me = this;
    var status = {};

    return function() {
      if (status[key] != null) return status[key];
      var systemSetData = window.localStorage.getItem('systemSetData');
      var _status = null;
      if (systemSetData) {
        try {
          systemSetData = JSON.parse(systemSetData);
          _status = systemSetData[key];
        } catch (e) {
          _status = false;
        }
      }
      status[key] = _status;
      return _status;
    }
  },
  destroy: function() {
    var me = this;
    var $module = me.$node.find('.login-module_container');
    
    // 指纹监听
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT');
    pubsub.unsubscribe('adminauthbyfingerprint');
    pubsub.unsubscribe('FingerPrint_Status');

    // 人脸监听
    pubsub.unsubscribe('SGS_MESSAGE_SCAN_USER_FACE');
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_FACE');
    pubsub.unsubscribe('adminauthbyface');


    if ($module.length) {
      $module.passwordLogin('destroy');
      $module.fingerprintLogin('destroy');
      $module.faceLoginModule('destroy');
    }
  },
  resetInt: function() {
    var me = this;
    var $module = me.$node.find('.login-module_container');
    $module.faceLoginModule('destroy');
    setTimeout(function() {
      // me.renderFaceLogin($module);
      $module.faceLoginModule('resetLoadFlv');
    }, 300);
  },
  showRestartBtn: function() {
    this.$node.find('#restartFaceAuth').removeClass('hide');
  },
  renderFaceLogin: function($module) {
    var me = this;
    if (!me.checkedIsOpenFaceLogin()) {
      return this.renderPassword($module);
    }
    me.loginCount = {
      face: 0,
      fingerprint: 0
    };
    $module.faceLoginModule('render', me.config)
    .off('FACE_AUTH_FAILED').on('FACE_AUTH_FAILED', function () {
      me.loginCount.face += 1;
      console.log('################### 人脸扫描失败的次数: ', me.loginCount.face);
      if (me.loginCount.face >= 2) {
        me.stopCamera(function() {
          me.render('fingerprint');
        })
      }
      me.triggerAuthError('face');
    })
    .off('FACE_AUTH_SUCCESS').on('FACE_AUTH_SUCCESS', function (e, user) {
      console.log('人脸验证成功 trigger: FACE_AUTH_SUCCESS', user);
      me.stopCamera(function() {
        me.triggerAuthSuccess(user, 'face');
      })
    });
  },
  outAuthFail: function() {
    var me = this;
    if (me.type === 'face') {
      me.loginCount.face += 1;
        if (me.loginCount.face >= 2) {
          me.stopCamera(function () {
            me.render('fingerprint');
          })
        }
        me.triggerAuthError('face');

    } else if (me.type === 'fingerprint') {
      me.loginCount.fingerprint += 1;
      if (me.loginCount.fingerprint >= 2) {
        me.render('password');
      }
      me.triggerAuthError('fingerprint');
    }
  },
  renderPassword: function($module) {
    var me = this;
    $module.passwordLogin('render', me.config)
    .off('PASSWORD_LOGIN_SUCCESS').on('PASSWORD_LOGIN_SUCCESS', function (e, data) {
      console.log('账号密码登录成功', data);
      me.triggerAuthSuccess(data, 'password');
    })
    .off('RESTART_LOGIN').on('RESTART_LOGIN', function () {
      me.render('face');
    })
    .off('GET_USER_INFO').on('GET_USER_INFO', function(e, data) {
      me.$node.trigger('GET_USER_DATA', data);
    });

    me.$node.off('removeDisabled').on('removeDisabled', function() {
      $module.passwordLogin('removeDisabled');
    });
  },
  renderFingerprint: function($module) {
    var me = this;
    $module.fingerprintLogin('render', me.config)
    .off('FINGERPRINT_AUTH_ERROR').on('FINGERPRINT_AUTH_ERROR', function () {
      me.loginCount.fingerprint += 1;
      if (me.loginCount.fingerprint >= 2) {
        me.render('password');
      }
      me.triggerAuthError('fingerprint');
    })
    .off('FINGERPRINT_AUTH_SUCCESS').on('FINGERPRINT_AUTH_SUCCESS', function (e, user) {
      console.log('#### 指纹验证成功 trigger: FINGERPRINT_AUTH_SUCCESS #####', user);
      me.triggerAuthSuccess(user, 'fingerprint');
    });
  },
  stopCamera: function(fn) {
    var me = this;
    server({
      url: '/camera/stop'
    })
    .always(function () {
      (typeof fn === 'function') && fn();
    });
  },  
  outAuthFailed: function(type) {
    var me = this;
    if (me.loginCount[type] != null) {
      me.loginCount[type] += 1;
    }

    if (type === 'face') {
      me.showRestartBtn();
    } else if (type === 'password') {
      me.$node.trigger('removeDisabled');
    } else if (type === 'fingerprint') {
      me.$node.find('#restart-prints').removeClass('hide');
    }
  },
  // 统一的 trigger
  triggerAuthSuccess: function(user, type) {
    var data = [user, type];
    this.$node.trigger('loginSuccess', data);
    
    // 登录成功开启自动登出
    pubsub.publish('message.subscribe');
    pubsub.publish('autologout.start');
  },
  triggerAuthError: function(type) {
    this.$node.trigger('loginFailed', type);
  }
};

module.exports = ejp.pluginize(standarLogin, metadata, prototype);