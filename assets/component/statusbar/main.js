'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');

var StatusBar = function(element, conf) {
  // this would never change
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'statusBar',
  events : {}
};

var prototype = {
  show : function(showText){
    log.debug('show status bar');
    var html = tpl({
      badgeImg : require('common/img/badge.png'),
      showText :  !!showText,
      statuses : [
        {src: require('./img/network.png'), text: __("Network Connected")},
        {src: require('./img/db.png'), text: __("DB Runing")},
        {src: require('./img/power.png'), text: __("Power Runing")},
        {src: require('./img/heart.png'), text: __("Heartbeat Listening")},
      ]
    });
    this.$node.html(html);
    return this;
  }
};

//register to jquery
module.exports = ejp.pluginize(StatusBar, metadata, prototype);