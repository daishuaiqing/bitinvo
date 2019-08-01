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

var signupform = require('signupform');

var messagebox = require('messagebox');

var Promise = require("bluebird");

var Info = function(reg){
  //inject method getIId, inject nav, push,leave 
  reg.apply(this);
  log.info('Info has been created');
  return this;
}

_.extend(Info, {
  NS : 'info',
  pub : [

  ],
  sub : []
});


var prototype = {
  init : function (){
      log.info('init Info entry');
  },
  show : function($node, cb){
    var me = this;
    $node.append(jade({i18n : i18n}));
    $node.find('.info-screen')
    .on(messagebox.EVENTS.confirm, function(e){
      log.debug('confirm');
      me.nav('/m/userhome');
    })
    .on(messagebox.EVENTS.cancel, function(e){
      log.debug('cancel');
      me.nav('/m/userhome');
    })
    .messagebox('show', {text:'请联系我们的服务专员安装此模块'});

    cb();
  }
}

_.extend(Info.prototype, prototype);
module.exports = Info;