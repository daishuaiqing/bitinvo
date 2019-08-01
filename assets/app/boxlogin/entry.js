'use strict';

var standarLogin = require('standarLogin');
var tmp = require('./newIndex.jade');
var backBtn = require('backbtn');
var server = require("common/server.js").server;
var pubsub = require('PubSubJS');
require('./less/boxlogin.less');

var BoxLogin = function(reg) {
  reg.apply(this);
  return this;
};

_.extend(BoxLogin, {
  NS: 'boxlogin',
  pub: [],
  sub: []
});

var prototype = {
  init: function(){

  },
  destroy: function (cb) {
    var me = this;
    me.destroyStandarLogin();
    cb();
  },
  show: function($node, cb) {
    var me = this;
    $node.append(tmp());

    $node.find('.status-bar').backBtn('show', function() {
      me.destroyStandarLogin();
      $node.find('.status-bar').addClass('disabled');
      
      me.stopCamrea(function() {
        $node.find('.status-bar').removeClass('disabled');
        me.nav('/m/home');
      });
    });
    
    $node.find('.passwordLogin').off('click').on('click', function() {
      me.destroyStandarLogin();
      me.stopCamrea(function() {
        me.nav('/m/login');
      })
    });

    me.renderLoginModule();
    me.changeLoginPosition();

    cb();
  },
  stopCamrea: function (fn) {
    this.server({
        url: '/camera/stop'
      })
      .always(function () {
        fn && fn();
      });
  },
  changeLoginPosition: function() {
    var oldClass = '';
    var me = this;
    this.$node.off('keypadComponentClickInputShow').on('keypadComponentClickInputShow', function () {
      // var className = me.$node.find('.login-module_container')
      // .removeClass('col-md-offset-4').addClass('col-md-offset-4');
    })
    .off('keypadComponentClickInputHide').on('keypadComponentClickInputHide', function() {
      // var className = me.$node.find('.login-module_container')
      //   .removeClass('col-md-offset-4').addClass('col-md-offset-4');
    });
  },
  destroyStandarLogin: function() {
    this.$node.find('.loginBox').standarLogin('destroy');
  },
  renderLoginModule: function() {
    var me = this;
    var $module = me.$node.find('.loginBox');

    // 进行录像
    // this.recordVideo();

    $module.standarLogin('show', {
      isLoginManagePage: true,
      isAdmin: false,
      password: {
        isNoSession: false
      },
      fingerprint: {
        ajaxConfig: {
          url: '/fingerprint/auth'
        }
      }
    });

    $module.off('loginSuccess').on('loginSuccess', function() {
      me.nav('/m/userhome');
    });
  }
};

_.extend(BoxLogin.prototype, prototype);

module.exports = BoxLogin;