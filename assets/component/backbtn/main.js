'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');

var BackBtn = function(element, conf) {
  // this would never change
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'backBtn',
  events : {}
};

var prototype = {
  show : function(targetFn){
    log.debug('show back btn');
    var html = tpl(),
        me = this;
    me.$node.html(html);
    me.$node.find('.btn-back')
    .off('touchstart')
    .on('touchstart', function(e) {
      var $target = $(e.target);
      $target.addClass('active');
    })
    .off('touchend')
    .on('touchend', function(e) {
      var $target = $(e.target);
      $target.removeClass('active');      
    })
    .off('click')
    .on('click', function(){
      me.routers(targetFn);
    })
    return this;
  },
  routers: function(targetFn){
    if(targetFn){
      if (typeof targetFn === 'function') {
        targetFn();
      } else if (Array.isArray(targetFn)) {
        var len = targetFn.length;
        if (len > 1) {
          targetFn[len -1 ]();
          targetFn.splice(len - 1, 1);
        } else {
          targetFn[0]();
        }
      }
    }else{
      window.history.back();
    }
  },
  refresh: function(targetFn, arg){
    this.show(targetFn);
  }
};

//register to jquery
module.exports = ejp.pluginize(BackBtn, metadata, prototype);
