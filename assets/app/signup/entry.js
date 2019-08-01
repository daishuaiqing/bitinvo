/**
RegisterForm module
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var jade = require("./index.jade");
var css = require("../common/less/base.less");
var i18n = require('locales/zh-CN.json');

require("./less/index.less");

var noty = require('customnoty');

var easyClock = require('easy-clock');

var statusBar = require('statusbar');

var actionBar = require('actionbar');

var backBtn = require('backbtn');

var signupform = require('signupform');

var messagebox = require('messagebox');

var Promise = require("bluebird");

var keypad = require('keypad');

var Signup = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('Singup has been created');
  return this;
}

_.extend(Signup, {
  NS : 'signup',
  pub : [

  ],
  sub : []
});


var prototype = {
  init : function (){
      log.info('init Signup entry');
  },
  destroy: function(cb){
    this.$node.find('form input').keypad('destroy');
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  show : function($node, cb){
    var me = this;
    $node.append(jade({i18n : i18n}));

    $node.find('.status-bar').backBtn('show');

    $node.on('click', '#cancel', function(){
      me.nav('/m/login');
    });
    $node.find('.signup-form-container')
    .on(signupform.EVENTS.success, function(e, result){
      log.debug(result);
      $node.empty()
      .on(messagebox.EVENTS.confirm, function(e){
        log.debug('confirm');
        me.nav('/m/login');
      })
      .on(messagebox.EVENTS.cancel, function(e){
        log.debug('cancel');
        me.nav('/m/login');
      })
      .messagebox('show', {
        text: __('Thank you for registing, Your account has been created, please contact admin to activate it.')
      });
    })
    .on(signupform.EVENTS.fail, function(e, err){

      if(err.responseText){
        var error = null;
        try{
          error = JSON.parse(err.responseText).error;
        }catch(errText){
          error = err.responseText;
        }
        noty({text: error, type: 'error', timeout:5000, layout: 'top'});
        return;
      }
      if(err.responseJSON ){
        var res = err.responseJSON;
        if(res.invalidAttributes){
          var obj = res.invalidAttributes,
              objUsername = obj['username'] || [],
              objPassword = obj['password'] || [];
          if(objUsername.length > 0){
            if(objUsername[0].message === 'Error.Passport.User.Exists'){
              noty({text: '用户已存在', type: 'error', timeout:5000, layout: 'top'});
            }
          }else if( objPassword.length > 0){
            if(objPassword[0].message === 'Error.Passport.Password.Short'){
              noty({text: '密码不能少于6位', type: 'error', timeout:5000, layout: 'top'});
            }
          }
        }
        return;
      }
    })
    .on(signupform.EVENTS.cancel, function(e, err){
      me.nav('/m/login');
    })
    .signupform('show');

    me.addKeyboard($node);
    cb();
  },
  addKeyboard : function($node){
    $node.find('.form input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    })
    //当隐藏键盘的时候，登录组件回位
    .on('keypadComponentClickInputHide', function(){
      $node.find('.signup-form-container').removeClass('col-md-offset-6').addClass('col-md-offset-4');
    })
    //当显示键盘的时候，登录组件往右推
    .on('keypadComponentClickInputShow', function(){
      $node.find('.signup-form-container').removeClass('col-md-offset-4').addClass('col-md-offset-6');
    });
  }
}

_.extend(Signup.prototype, prototype);
module.exports = Signup;
