/**
autocomplete-nasetech module start
*/
'use strict';

var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var _ = require('lodash');


var Autocomplete = function(element, conf){
  log.info('Autocomplete has been created');
  this.$node = $(element);
  this.conf = conf;
  this.url = this.conf.url;
  this.limit = this.conf.limit || 5;
  return this;
}

var metadata = {
  version : '0.0.1',
  name : 'Autocomplete'
};

var prototype = {
  init : function (){
    log.info('init Autocomplete Component');
  },
  show : function(data){
    var $node = this.$node,
        me = this,
        $nodeParent = $node.parent(),
        $tpl = tpl();

    $nodeParent.append($tpl);
    //记录input的parent
    me.$nodeParent = $nodeParent;
    //插入DOM才可获取到
    var $ulBox = $nodeParent.find('ul.autocomplete');

    //定义是否隐藏的状态
    me.isHide = true;

    //input获取焦点后显示提示容器
    $node.on('focus', function() {
      $ulBox.removeClass('hide');
    })

    //让input失去焦点的时候隐藏
    $node.on('blur', function() {
      me.isHide = false;
      clearTimeout(me.time);
      //延迟执行失去焦点掩藏，避免闪烁问题
      me.time = setTimeout(function(){
        if(!me.isHide){
          $ulBox.addClass('hide');
        }else{
          clearTimeout(me.time);
        }
      }, 300);
    })


    //这里监听虚拟键盘输入触发的事件
    $('body').off('keypadComponentUpdateTexts').on('keypadComponentUpdateTexts', function(event, option){
      if ($node.attr('id') !== option.$input.attr('id')) {
        return;
      }

      var key = $node.val();
      me.getData(key)
      .done(function(data) {
        var value = data;
        //如果数据为空，则把value为null
        if(!data.length){
          value = null;
        }
        me.renderLi(value);
      })
      .fail(function(error) {
        var data = null;
        me.renderLi(data);
      })
    }).off('keypadComponentClick').on('keypadComponentClick', function() {
      //点击虚拟键盘的时候，把isHide设置为true.
      me.isHide = true;
    });

    //监听li的click来改变input的值
    me.setValue();

    return this;
  },

  getData: function(value) {
    var me = this,
        $node = me.$node,
        d = new $.Deferred(),
        url = me.url,
        limit = me.limit;
    $.ajax({
      url: url + '?username=' + value + '&limit=' + limit,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    .done(function(data) {
      d.resolve(data);
    })
    .fail(function(error) {
      d.reject(error);
    })

    return d;
  },
  renderLi: function(data){
    var me = this,
        liString = '',
        $li = null;
    if(data){
      for(var i = 0, len = data.length; i < len; i++) {
        liString += "<li data-id=" + data[i].id + ">" + data[i].username + "</li>";
      }
    }else{
      liString = "<li class='pointer-events'>没有匹配相关数据</li>";
    }
    $li = $(liString);
    me.$nodeParent.find('ul.autocomplete').empty().append($li);
  },
  setValue: function() {
    var me = this;
    me.$nodeParent.find('ul.autocomplete')
    .off('click')
    .on('click', 'li', function(){
      var value = $(this).text();
      me.$nodeParent.find('input').val(value);
      //获取值后隐藏提示框
      $('ul.autocomplete').addClass('hide');
    })
  },
  destroy: function() {
    if (typeof this.$nodeParent !== 'undefined' && this.$nodeParent.find('ul.autocomplete').length > 0) {
      this.$nodeParent.find('ul.autocomplete').remove();
    }
    $('body').off('keypadComponentUpdateTexts').off('keypadComponentClick')
  }
}

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(Autocomplete, metadata, prototype);
/**
Autocomplete module End
*/
