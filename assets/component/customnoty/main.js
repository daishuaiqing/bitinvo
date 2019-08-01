'use strict';
require('./main.less');
var noty = require('noty');
var theme = require('./theme.js');

var customized = function(config){
  log.debug('customized component start');
  _.defaults(config, {
    theme : 'blue',
    timeout: 2000,
    animation: { //默认的显示及关闭动画
      open: null,
      close: null,
      easing: 'swing',
      speed: 800 // opening & closing animation speed
    },
  });
  return noty(config);
}
module.exports = customized;
