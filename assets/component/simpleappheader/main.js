/*
  快捷版头部大组件,嵌套backbtn组件
*/

'use strict';

var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var moment = require('moment');

var tpl = require('./main.jade');
var backBtn = require('backbtn');
var mainCss = require('./main.less');
var actionBar = require('actionbar');


var SimpleAppHeader = function (element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'simpleAppHeader',
  events : {}
};

var prototype = {
  show : function (backBtnHandle, hasSingup, singupHandle) {
    var me = this,
        $node = me.$node;

    $node.append(tpl());

    //左边嵌入backBtn部分
    me.backBtnModule($node, backBtnHandle);

    //中间嵌入时钟模块部分
    me.clockModule($node);
    //加载登录
    if(hasSingup){
      me.singupModule(singupHandle);
    }
    return me;
  },
  backBtnModule : function($node, backBtnHandle){
    $node.find('.simple-component_left').backBtn('show', backBtnHandle);
  },
  singupModule: function (cb) {
    this.$node.find('.action-bar').on('signup', function(){
      cb();
    }).actionBar('show', ['signup']);
  },
  clockModule : function ($node) {
    var $timeContent = $node.find('.time'),
        locale = moment().locale('zh-cn');

    $timeContent.text(locale.format('LL') + ' ' + locale.format('HH:mm:ss'));
    setInterval(function () {
      locale = moment().locale('zh-cn');
      $timeContent.text(locale.format('LL') + ' ' + locale.format('HH:mm:ss'));
    }, 1000);

  }
}

module.exports = ejp.pluginize(SimpleAppHeader, metadata, prototype);
