/*
    Vmenu Component Start
*/
'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');

var Taskbar = function(element, conf) {
  // this would never change
  this.$node = $(element);
  this.conf = conf;
  return this;
};

_.extend(Taskbar, {
  version : '0.0.1',
  DATA_PREFIX : 'data-',
  UNDERSCORE_VAR : {variable : 'option'},
  INSTANCE_PREFIX : 'taskbar',
  EVENTS : {}
})

var prototypes = {
  show : function(items){
    log.debug('Show TaskMenu Menu');
    var callbackList = [];
    items = _.map(items, function(item, key){
      item = _.clone(item);
      if(_.isFunction(item.target)){
        callbackList.push(item.target);
        item = _.merge(item, { target : "javascript:void(0);", callbackId : key});
      }
      return item;
    });
    var html = tpl({
      items : items ? items :[]
    });
    this.$node.html(html);
    this.$node.find('.comp-taskbar').on('click', '.btn', function(e){
      if($(e.currentTarget).attr('callback')){
        e.preventDefault();
        var callbackId = $(e.currentTarget).attr('callback');
        var callback = callbackList[callbackId];
        callback(e);
      }
    })
    return this;
  }
};

 _.extend(Taskbar.prototype, prototypes);

//register to jquery
ejp.reg(Taskbar, Taskbar.INSTANCE_PREFIX, Taskbar.EVENTS, Taskbar.version);

module.exports = Taskbar;

/**
    Vmenu Component End
*/
