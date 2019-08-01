'use strict';

// var bootstrap = require("bootstrap-webpack!./bootstrap.config.js");
var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");
// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var keypad = require('keypad');

var noty = require('customnoty');

var jade = require("./index.jade");
var css = require("common/less/base.less");
var user = require("common/usermanagement");
var actionBar = require('actionbar');
var backBtn = require('backbtn');

var pubsub = require('PubSubJS');

require("./less/login.less");

var i18n = require('locales/zh-CN.json');

var identitycheck = require('identitycheck');

var Autocomplete = require('autocomplete-nasetech');
var faceLogin = require('faceLogin');

var Login = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('Login has been created');
  return this;
}

_.extend(Login, {
    NS : 'login',
    pub : [],
    sub : []
});

var prototype = {
  init : function (){
    log.info('Init Login entry');
  },
  destroy: function(cb){
    this.$node.find('form input').keypad('destroy');
    pubsub.unsubscribe('adminauthbyfingerprint');
    this.$node.find('#identity-scan-btn').identityCheck('destroy');
    $('#noty_topRight_layout_container').remove();
    //销毁自动提示
    this.$node.find('#username').Autocomplete('destroy')
    $('object').remove();
    cb();
  },
  show : function($node, cb){
    var me = this;
    $node.append(jade({i18n : i18n}));

    $node.find('.status-bar').backBtn('show', function(){
      
      if($('html').hasClass('local')) {
        me.$node.find('.btn-back').addClass('disabled');
        me.server({
          url: '/camera/stop'
        })
        .done(function() {
          me.$node.find('.btn-back').removeClass('disabled');
          me.nav('/m/boxlogin');
        })
        .fail(function() {
          me.$node.find('.btn-back').removeClass('disabled');
          noty({
            text: '请重试返回操作',
            type: 'error',
            layout: 'top',
            timeout: 3000
          });
        });
      } else {
        me.nav('/m/home');
      }
    });

    $node.find('.action-bar').on('signup', function(){me.nav('/m/signup')}).actionBar('show', ['signup']);

    //添加键盘
    this.addKeyboard($node);

    $node.on('click', '.action-btn', function(e){
      var id = $(this).attr('id');
      var $button = $(this);
      $node.find('.error-info').addClass('hide');
      e.preventDefault();
      switch(id) {
        case 'cancel':
        case 'close':
          me.nav('/m/boxlogin');
          break;
        case 'signin':
          me.signin($node, $button);
          break;
        case 'signup':
          me.nav('/m/signup');
          break;
        default:
        ;
      }
    });
    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('#signin'), ['waves-light']);
    // waves.init();
    this.speak('signin');


    $node.find('#identity-scan-btn')
    .on('getIdCardInfoSuccess', function(event, userIdCardInfo){
      me.server({
        url: '/idCard/getUserId',
        method: 'POST',
        data: {'identityNumber': userIdCardInfo.certNumber}
      })
      .done(function(userInfo){
        if(userInfo){
            noty({text: '扫描成功', type: 'success', layout: 'topRight', timeout: 3000});
            var userName = userInfo.username;
            $node.find('#username').val(userName);
        }
      })
      .fail(function(error){
        log.debug(error.responseJSON.error)
        noty({text: error.responseJSON.error, type: 'error', layout: 'top', timeout: 3000});
      });
    })
    .on('getIdCardInfoError', function(event, error){
      noty({text: error, type: 'error', layout: 'top', timeout:3000});
    })
    .identityCheck('show')

    //初始化自动补全组件
    me.autocomplete();
    cb();
  },
  autocomplete: function() {
    this.$node.find('#username').Autocomplete({
      url: '/user/autocomplete',
      limit: 5
    }).Autocomplete('show')
  },
  signin : function($node, $button){
    var username = $('#username').val(),
    password = $('#password').val(),
    me = this;
    $button.addClass('disabled');
    user.signin(
      username,
      password,  //data
      function(data){ // on success
        log.debug(data);
        me.userId = data.userId;
        me.speak('account_signin_success');
        me.nav('/m/userhome');
        // me.initFaceLogin();
      },
      function(err){ // on error
        log.debug(err);
        $button.removeClass('disabled');
        if(err.status === 403){
          me.speak('login_fail');
          // print error;
          $node.find('.error-info').removeClass('hide').text(err.responseJSON.error);
          noty({text: err.responseJSON.error, type: 'error', layout: 'top', timeout:5000});
        }else{
          // print error;
          if(err && err.responseJSON)
            $node.find('.error-info').removeClass('hide').text(err.responseJSON.error);
          else
            $node.find('.error-info').removeClass('hide').text('未知错误');
        }
      }
    )
  },
  initFaceLogin: function() {
    var me = this,
        $node = me.$node,
        $html = $('<div class="col-md-12">');
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
    });
  },
  faceStopscan: function() {
    this.server({
      url: '/face/stopScan',
      method: 'get'
    })
  },
  addKeyboard : function($node){
    // dont show keyboard at other media
    $node.find('.form input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    });
  }
}

_.extend(Login.prototype, prototype);

module.exports = Login;
