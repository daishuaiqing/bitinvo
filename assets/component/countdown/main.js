/**
Messagebox module start
*/
'use strict';
var animateCss = require("animate.css");

var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');

var Countdown = function(element, conf){
  log.info('countdown has been created');
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version : '0.0.1',
  name : 'countdown'
};

var prototype = {
  init : function (){
    log.info('init countdown Component');
  },
  destroy: function(){
    log.debug('######################destory countdown')
    var me = this;
    me.time && clearInterval(me.time);
    me.$node.empty().hide();
  },
  show : function(data, fn, text){
    log.debug('######### countdown show')
    var me = this,
        $node = me.$node,
        time = null;
    data = data ? data : 60;
    var $box = $(tpl());
    //开始倒计时前，me.time存在则清除
    me.time && clearInterval(me.time);

    me.time = setInterval(function(){
      if(data <= 1){
        clearInterval(me.time);
        $box.empty();
        //时间到了，执行一个回调
        if(typeof fn === 'function'){
          me.destroy();
          fn();
        }
      }else{
        data = data - 1;
        $box.text((text ? text : '指纹扫描倒计时：') + data + '秒');
      }
    }, 1000);
    $node.empty().show().append($box);
    return this;
  }
}

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(Countdown, metadata, prototype);
/**
Messagebox module End
*/
