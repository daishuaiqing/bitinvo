'use strict';
var $ = require('jquery');
var moment = require('moment');
var ejp = require('easy-jq-plugin');
var tpl = require('./tpl.jade');

var EasyClock = function(element, conf) {
  // this would never change
  this.$node = $(element);
  this.conf = conf;
  return this;
};

_.extend(EasyClock, {
  version : '0.0.1',
  DATA_PREFIX : 'data-',
  UNDERSCORE_VAR : {variable : 'option'},
  INSTANCE_PREFIX : 'easyClock',
  EVENTS : {}
})

var prototypes = {
  start : function(conf) {
    log.debug('EasyClock Start');
    conf = conf ? conf : this.conf;
    this.secTimmer = setInterval(_.bindKey(this, 'second'), 1000);
    return this;
  }, 
  second : function(){
    var locale = moment().locale("zh-cn");
    var html = tpl({year: locale.format('LL'), time: locale.format('HH:mm:ss') });
    this.$node.html(html);
    return this;
  }
};

 _.extend(EasyClock.prototype, prototypes);

//register to jquery
ejp.reg(EasyClock, EasyClock.INSTANCE_PREFIX, EasyClock.EVENTS, EasyClock.version);

module.exports = EasyClock;