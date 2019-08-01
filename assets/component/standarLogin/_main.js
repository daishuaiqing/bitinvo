/**
 * create date: 2018/9/5
 * author: zhangfu
*/

'use strict';

var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var pagestate = require('pagestate');
var server = require('common/server.js').server;
var pubsub = require('PubSubJS');
var noty = require('customnoty');
var formwork = require('formwork');
var i18n = require('locales/zh-CN.json');
var countdown = require('countdown');
var user = require("common/usermanagement");

// icon
var faceIcon = require('./img/face.png');
var fingerprintIcon = require('./img/fingerprint-white.png');


var standarLogin = function(element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version: '0.0.1',
  name: 'standarLogin',
};

var prototype = {
  loginCount: {
    face: 0,
    fingerprint: 0
  },
  show: function(config) {
    var me = this, html;
    
    html = tpl({
      i18n: i18n,
      faceIcon: faceIcon,
      fingerprintIcon: fingerprintIcon,
      btnLabel1: (config && config.btnLabel1) ? config.btnLabel1 : '通过密码解锁',
      btnLabel2: (config && config.btnLabel2) ? config.btnLabel2 : '登录'
    });
    
    me.$node.html(html);

    // 记录基本信息
    me.speak = config && config.speak || function(){};
    me.fingerprintAjaxConfig = config && config.fingerprintAjax;
    me.passwordAjaxConfig = config && config.passwordAjaxConfig;
    me.isAdminAuth = config && config.isAdminAuth;

    me.$node
    .pagestate({
      namespace: metadata.name,
      state: 'face',
      states: {
        'fingerprint': [
          '#fingerprint-panel'
        ],
        'face': [
          '#face-panel'
        ],
        'password': [
          '#password-panel'
        ]
      }
    })
    .on('state.change.after', function(e, status) {
      // 根据状态渲染模块
      switch (status) {
        case 'face':
          me.initFaceLoginModule();
          break;
        case 'fingerprint':
          me.initFingerprintLoginModule();
          break;
        case 'password':
        default:
          me.intiPasswordLoginModule();
      }
    });

    // 检查是否为人脸登录
    me.isCheckedFaceLogin()
    .done(function(isFaceLogin) {
      // 记录是否为人脸验证
      me.isFaceLogin = isFaceLogin;

      if (isFaceLogin) {
        me.$node.pagestate('setState', 'face');
      } else {
        me.$node.pagestate('setState', 'fingerprint');
      }
    });

    return $(me);
  },
  fetchCheckedSetting: function(key) {
    var $dfd = $.Deferred();
    var status = false;
    var systemSetData = window.localStorage.getItem('systemSetData');

    if (systemSetData) {
      try {
        systemSetData = JSON.parse(systemSetData);
        return $dfd.resolve(systemSetData[key]);
      } catch(e) {
        //
      }
    }

    server({
      url: '/system/settings'
    })
    .done(function(data) {
      for (var i = 0, len = data.length; i < len; i++) {
        if (data[i].key === key) {
          if (data[i].value === 'true') {
            status = true;
          }
          break;
        }
      }
      $dfd.resolve(status);
    })
    .fail(function() {
      $dfd.reject(status);
    });
    return $dfd;
  },
  isAdminCreatedApp: function() {
    return this.fetchCheckedSetting('adminCreateApp');
  },
  isCheckedFaceLogin: function() {
    return this.fetchCheckedSetting('facePerception');
  },

  /** ###############################
   * 初始化人脸登录
   * ######################
  */
  initFaceLoginModule: function() {
    console.log('开始初始化人脸登录');
    var me = this;
    var $node = me.$node;

    me.speak('faceAuth');

    // 监听切换账号密码登录按钮点击
    $node.find('.switch-password')
    .off('click')
    .on('click', function() {
      me.$node.pagestate('setState', 'password');
    });

    // 监听进行人脸识别按钮点击
    $node.find('.faceLogin-button')
    .off('click')
    .on('click', function() {
      me.disabledFaceLoginBtn();
      // 初始化人脸推送监听
      me.onFaceAuthSubscribe();

      me.startFaceAuth();
    });
  },

  // 开始人脸验证请求
  startFaceAuth: function() {
    var me = this;
    server({
      url: '/face/_auth',
    })
    .fail(function() {
      me.removeDisabledFaceLoginBtn();
    })
  },

  // // 停止人脸验证请求
  // stopFaceAuth: function() {
  //   server({
  //     url: '/face/stopScan'
  //   });
  // },

  // 监听人验证结果
  onFaceAuthSubscribe: function() {
    var me = this;
    var $img = me.$node.find('#face-panel img');
    // 扫描结果
    pubsub.unsubscribe('SGS_MESSAGE_SCAN_USER_FACE');
    pubsub.subscribe('SGS_MESSAGE_SCAN_USER_FACE', function(topic, value) {
      pubsub.unsubscribe('SGS_MESSAGE_SCAN_USER_FACE');
      console.log('人脸扫描返回的状态', value);
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
    pubsub.subscribe('SGS_MESSAGE_AUTHEN_FACE', function(topic, value) {
      pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_FACE');
      me.removeDisabledFaceLoginBtn();
      console.log('接受到人脸验证的信息', value)
      
      // #########user不存在的情况##########
      if (value && !value.user) {
        me.$node.trigger('loginError');
        return me.showNoty('error', '人脸没有匹配成功!');
      }
      
      // ######### 管理验证模式 ###########
      if (me.isAdminAuth) {
        // 检测是否为同一个人
        if (me.fingerprintAjaxConfig && 
          me.fingerprintAjaxConfig.data.application.applicant === value.user.id) {
          me.showNoty('error', '工单不能自我授权!');
          return me.$node.trigger('loginError');
        } else if (value.user) {
          if (!(me.hasPermission(value.user, "manage-cabinet") || me.hasPermission(value.user, "view-app"))) {
            me.showNoty('error', '非管理员无法授权');
            return me.$node.trigger('loginError');
          }
        }
      }

      // ###########3 正常流程 ##########
      console.log('人脸验证的结果: ', value);
      if (value && value.user) {
        user.getUserByToken(value.user.token)
        .done(function(userData) {
          me.$node.trigger('loginSuccess', userData);
        })
        .fail(function(err) {
          me.$node.trigger('loginError', err);
        });
      } else {
        if (value.error) {
          if (value.error.error) {
            me.showNoty('error', value.error.error);
          } else {
            me.showNoty('error', value.error);
          }
        } else {
          me.showNoty('error', '用户信息不存在');
        }
        me.$node.trigger('loginError');
      }
    });
  },
  hasPermission: function (user, permission) {
    var me = this;
    if(user && user.roles && user.roles.length >0){
      var hasRole = false;
      if (!user.roles) {
        return false;
      };
      _.each(user.roles, function(role){
        if(role.permissions && role.permissions.length > 0){
          if(_.indexOf(role.permissions, permission) >= 0){
            hasRole = true;
          }
        }
      });
      return hasRole;
    }
  },  
  disabledFaceLoginBtn: function() {
    var me = this;
    me.$node.find('.faceIcon img').attr('src', faceIcon);
    me.$node.find('.faceLogin-button').addClass('disabled');
    me.$node.find('.faceLogin-button .loader').removeClass('hide');
  },
  removeDisabledFaceLoginBtn: function() {
    var me = this;
    me.$node.find('.faceLogin-button').removeClass('disabled');
    me.$node.find('.faceLogin-button .loader').addClass('hide');
  },
  /**
   * ############################
   * 初始化指纹登录
   * ###########################
  */
  initFingerprintLoginModule: function() {
    console.log('开始初始化指纹登录');
    var me = this;
    var $node = me.$node;

    // 初始化canvnas为默认图片
    me.renderCanvas(null, true, false);

    $node.find('#fingerprint-panel .switch-password')
    .off('click')
    .on('click', function() {
      me.stopFingerprintScan();
      me.stopCountdown();
      $node.pagestate('setState', 'password');
    });

    $node.find('#fingerprint-panel #restart-prints')
    .off('click')
    .on('click', function() {
      $(this).addClass('hide');
      me.startFingerprintScan();
    });

    // 监听点击close按钮
    // $node.off('onClose').on('onClose', function() {
    //   // me.startFingerprintScan();
    // });

    // 默认开始指纹扫描
    me.startFingerprintScan();
  },
  startFingerprintScan: function() {
    var me = this;
    // 注册指纹扫描监听
    this.subscribeFingerprint();
    if (!this.fingerprintAjaxConfig) {
      return me.showNoty('error', '指纹扫描请求ajaxConfig不存在');
    }

    server(me.fingerprintAjaxConfig)
    .done(function() {
      // 开始倒计时
      me.startCountdown();
    })
    .fail(function() {
      me.showNoty('error', '请求指纹扫描失败');
      me.showRestartScanBtn();
    });
  },
  stopFingerprintScan: function() {
    server({
      url: '/fingerprint/stopScan'
    });
    this.unsubscribeFingerprint();
  },

  startCountdown: function() {
    var me = this;
    var $node = me.$node;
    if (!$node) return;

    var $countdown = $node && $node.find('.countdown-box');
  
    me.speak('scan');

    if ($countdown.length) {
      me.hideRestartScanBtn();
      $countdown.removeClass('hide').countdown('show', 15, function () {
        // 倒计时结果，停止指纹扫描
        me.stopFingerprintScan();
        me.showNoty('error', '指纹扫描超时,请重试');
        me.stopCountdown();
        me.showRestartScanBtn();
      });
    }
  },

  stopCountdown: function() {
    var me = this;
    var $node = me.$node;
    if (!$node) return;
    
    var $countdown = $node && $node.find('.countdown-box');
    if ($countdown.length) {
      $countdown.addClass('hide').countdown('destroy');
    }
  },
  showRestartScanBtn: function() {
    var $restartPrints = this.$node.find('#restart-prints');
    $restartPrints.removeClass('hide');
  },
  hideRestartScanBtn: function() {
    var $restartPrints = this.$node.find('#restart-prints');
    $restartPrints.addClass('hide');
  },

  // 监听指纹扫描推送
  subscribeFingerprint: function() {
    var me = this;
    var $node = me.$node;
    // 指纹扫描状态
    pubsub.unsubscribe('FingerPrint_Status');
    pubsub.subscribe('FingerPrint_Status', function(topic, msg) {
      pubsub.unsubscribe('FingerPrint_Status');

      if (msg.status == 1) {
        me.showNoty('error', '预载入指纹比对失败，重新校验');
      } else if (msg.status == 0) {
        me.showNoty('success', '扫描成功，正在校验警员指纹');
      } else if (msg.status == 4) {
        me.showNoty('error', '扫描的指纹较差，请重新扫描');
      }
      var url = '/fingerprint/fingerPic?v=' + Date.now();
      if (msg.status == 0) {
        me.renderCanvas(url, false, true);
      } else {
        me.renderCanvas(url, false, false);
        me.showRestartScanBtn();
      }
    });

    // 判断是否为管理员验证
    var authTopic = me.isAdminAuth ? 'adminauthbyfingerprint' : 'SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT';

    // 指纹验证状态
    pubsub.unsubscribe(authTopic);
    pubsub.subscribe(authTopic, function (topic, msg) {
      pubsub.unsubscribe(authTopic);
      me.stopCountdown();
      console.log('接收到指纹验证推送 => ', msg);

      var user = msg && msg.user;
      var status = msg && msg.status;
      var error;

      if (user) {
        me.getUserByToken(user.token);
      } else if (status) {
        if (status === 'success') {
          $node.trigger('loginSuccess', msg);
        } else {
          $node.trigger('loginError', msg);
          if (msg.status === 'fail') {
            error = msg && msg.info;
          } else if (msg && msg.error) {
            error = msg.error;
          }
          me.showNoty('error', error);
          me.showRestartScanBtn();
          me.speak('scan_fail');
        }
      } else {
        // 抛出登录失败
        $node.trigger('loginError');
        me.speak('scan_fail');
        me.showRestartScanBtn();

        // 没有user信息
        if (msg.error) {
          me.showNoty('error', msg.error);
        } else {
          me.showNoty('error', '用户信息不存在');
        }
      }
    });
  },

  // 根据用户的token获取用户信息
  getUserByToken: function(token) {
    var me = this;
    var $node = me.$node;
    user.getUserByToken(token)
    .done(function(data) {
      me.speak('scan_success');
      
      // 抛出登录成功
      $node.trigger('loginSuccess', data);
    })
    .fail(function(error) {
      var error = error && error.responseJSON && error.responseJSON.error || '指纹验证失败';
      me.speak('scan_fail');
      me.showNoty('error', error);

      // 抛出登录失败
      $node.trigger('loginError');
    });
  },

  // 解除指纹扫描推送
  unsubscribeFingerprint: function() {
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT');
    pubsub.unsubscribe('adminauthbyfingerprint');
    pubsub.unsubscribe('FingerPrint_Status');
  },

  // 渲染指纹图片
  renderCanvas: function(img, isDefault, isSuccess) {
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
    ImgDOM.src = img || require('./img/fingerprint-white.png')
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

  /**
   * #######################
   * 初始化账号密码登录
   * #######################
  */
  intiPasswordLoginModule: function() {
    console.log('初始化账号密码登录');
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('#password-panel form');

    // 监听关闭按钮
    $node.find('#close')
    .off('click')
    .on('click', function() {
      if (me.isFaceLogin) {
        me.$node.pagestate('setState', 'face');
      } else {
        me.$node.pagestate('setState', 'fingerprint');
      }
      me.removeDisabledFaceLoginBtn();
    });

    $node.find('#signin')
    .off('click')
    .on('click', function() {
      $editform.formwork('validate');
    });

    $node.on('keyup', function(e) {
      if (e.keyCode === 13) {
        $editform.formwork('validate');
      }
    });

    // 初始化表单
    me.initFormwork()
    .off('onSubmit')
    .on('onSubmit', function(e, data) {
      // 抛出点击了登录按钮事件，并返回登录需要的数据
      me.$node.trigger("onPWDSubmit", data);
    })
  },
  initFormwork: function() {
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('#password-panel form');

    me.formwork = $editform.formwork(me.formConfig());
    me.formwork
    .off(metadata.name + '.form.validate.valid')
    .on(metadata.name + '.form.validate.valid', function (e) {
      e.preventDefault();
      $editform.formwork('submit');
    })
    .off(metadata.name + '.form.validate.error')
    .on(metadata.name + '.form.validate.error', function (e, errors) {
      e.preventDefault();
      noty({
        text: __('Something is wrong').replace('%s', errors.join(',')),
        type: 'error',
        timeout: 5000
      });
    })
    .off(metadata.name + '.form.submit')
    .on(metadata.name + '.form.submit', function (e, data) {
      e.preventDefault();
      $editform.trigger('onSubmit', data);
    })
    .formwork('init');
    return $editform;
  },
  formConfig: function() {
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('#password-panel form');

    return {
      "namespace": metadata.name,
      "fields": {
        '#username': {
          name: 'username',
          validate: function () {
            if ($(this).val() === '') {
              log.debug('User name invalid');
              return '名称不能为空';
            } else {
              return null;
            }
          }
        },
        '#password': {
          name: 'password',
          validate: function () {
            if ($(this).val() === '') {
              log.debug('password invalid');
              return '密码不能为空';
            } else {
              return null;
            }
          }
        }
      }
    }
  },
  /**
   * 通用函数
  */
  showNoty: function(type, message) {
    if (type === 'error') {
      noty({text: message, type: 'error', layout: 'top', timeout: 2000 });
    } else {
      noty({text: message, type: 'success', layout: 'topRight', timeout: 2000});
    }
  },
  destroy: function() {
    var me = this;
    me.unsubscribeFingerprint();
    me.stopCountdown();
    me.stopFingerprintScan();
  }
}



module.exports = ejp.pluginize(standarLogin, metadata, prototype);