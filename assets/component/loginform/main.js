/**
  LoginForm Start
*/
'use strict';
var animateCss = require("animate.css");

var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var pagestate = require('pagestate');
var noty = require('customnoty');
var formwork = require('formwork');

var i18n = require('locales/zh-CN.json');

var LoginForm = function(element, conf) {
  // this would never change
  log.debug(' #### LoginForm Start #### ');
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'loginform',
  events : {
    'submit' : 'loginform.submit'
  }
};


var prototype = {
  show : function($node, config){
    log.debug(' #### LoginForm Show #### ');
    var me = this;
    this.$node.pagestate({
      namespace : metadata.name,
      state: 0,
      /*
        0 list
        1 edit
      */
      states : {
        0 : [
          '#password-panel'
        ],
        1 : [
          '#fingerprint-panel'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    var html = tpl({
      src: require('./img/fingerprint-white.png'),
      i18n : i18n,
      btnLabel1 : (config && config.btnLabel1) ? config.btnLabel1 : '通过密码解锁',
      btnLabel2 : (config && config.btnLabel2) ? config.btnLabel2 : '登录'
    });
    this.$node.html(html)
    .on('click', '#password-login', function(e){
      e.preventDefault();
      me.$node.pagestate('setState', 0);
      me.$node.trigger('onPasswordLogin');
      me.cancelFinger();
      var $username = me.$node.find('#username');
      $username.focus();
      setTimeout(function() {
        $username.click();
      })
    })
    .on('click', '#restart-prints', function(e){
      $(this).addClass('hidden');
      me.$node.trigger('onRestartPrints');
    })
    .on('click', '#close', function(e){
      e.preventDefault();
      me.$node.pagestate('setState', 1);
      me.openFinger();
      me.$node.find('#restart-prints').addClass('hidden');
      me.$node.trigger('onClose');
    })
    .on('click', '#cancel', function(e){
      e.preventDefault();
      me.$node.pagestate('setState', 1);
      me.openFinger();
    })
    .on('click', '#signin', function(e){
      e.preventDefault();
      var $editform = me.$node.find('form');
      log.debug(' #### LoginForm Validate #### ');
      $editform.formwork('validate');
      me.cancelFinger();
    })
    this.initFormwork();
    this.$node.pagestate('setState', 1);

    //初始化图片
    me.canvasPic(null, true)
    return this;
  },
  cancelFinger: function(){
    this.conf && this.conf.cancelFinger && this.conf.cancelFinger();

  },
  openFinger: function(){
    this.conf && this.conf.openFinger && this.conf.openFinger();
  },
  signin : function(){
    var $editform = this.$node.find('form');
    $editform.formwork('validate');
  },
  canvasPic: function (img, isDefault, isSuccess) {
    if (!this.$node) return;
    var $canvas = this.$node.find('#canvas');
    var canvas = $canvas.get(0);
    var context = null;
    if (!this.canvasContext) {
      context = canvas.getContext('2d');
      this.canvasContext = context;
    } else {
      context = this.canvasContext;
    }
    canvas.width = 150;
    canvas.height = 158;
    var ImgDOM = new Image();
    ImgDOM.src = img || require('./img/fingerprint-white.png')
    ImgDOM.onload = function () {
      if (!isDefault) {
        if (isSuccess) {
          context.strokeStyle = "green"
        } else {
          context.strokeStyle = 'red'
        }
        $canvas.addClass('scan_build_pic')
        context.drawImage(ImgDOM, 0, 0, 150, 158)
        context.strokeRect(16, 10, 118, 137)
      } else {
        $canvas.removeClass('scan_build_pic')
        context.drawImage(ImgDOM, 0, 30, 150, 128)
      }
    }
  },
  initFormwork : function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');

    me.formwork = $editform.formwork(me.formConfig());

    me.formwork
    .on(metadata.name + '.form.validate.valid', function(e){
      log.debug('Handling form validate event valid');
      $editform.formwork('submit');
    })
    .on(metadata.name + '.form.validate.error', function(e, errors){
      log.debug('Handling form validate event error');
      noty({text: __('Something is wrong').replace('%s', errors.join(',')), type: 'error', timeout:5000});
    })
    .on(metadata.name + '.form.submit', function(e, data){
      me.$node.trigger(metadata.events.submit, data);
    })
    .formwork('init');
  },
  formConfig : function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    return {
      "namespace" : metadata.name,
      "fields" : {
        '#username':{
          name: 'username',
          validate : function(){
            if($(this).val() === ''){
              log.debug('User name invalid');
              return '名称不能为空';
            }
            else{
                return null;
            }
          }
        },
        '#password': {
          name: 'password',
          validate : function(){
            if($(this).val() === ''){
              log.debug('password invalid');
              return '密码不能为空';
            }
            else{
                return null;
            }
          }
        }
      }
    }
  }
};

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(LoginForm, metadata, prototype);

/**
  LoginForm End
*/
