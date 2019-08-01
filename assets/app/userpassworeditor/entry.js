/**
UserpasswordManagement module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");

var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var breadcrumbs = require('breadcrumbs');

var jade = require("./index.jade");
var css = require("common/less/base.less");
var i18n = require('locales/zh-CN.json');

require("./less/index.less");

var noty = require('customnoty');

var easyClock = require('easy-clock');

var statusBar = require('statusbar');

var actionBar = require('actionbar');

var taskbar = require('taskbar');

var backBtn = require('backbtn');

var edit = require('./edit.jade');

var formwork = require('formwork');

var server = require('common/server.js').server;

var keypad = require('keypad');

var UserpasswordManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('UserpasswordManagement has been created %s', this.getIId());
  return this;
}

var metadata =  {
  NS : 'userpasswordmanagement',
  pub : [

  ],
  sub : [],
  endpoint: '/auth/reset'
}

_.extend(UserpasswordManagement, metadata);

var prototype = {
  init : function (){
    log.info('init UserpasswordManagement entry');
  },
  destroy: function(cb){
    this.$node.find('.form input').keypad('destroy');
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  show : function($node, cb){
    var me = this;

    // create html frame
    $node.append(jade());

    $node.find('.status-bar').backBtn('show', function(){me.nav('/m/userprofilemanagement')});
    $node.find('.action-bar').actionBar('show');

    $node.find('.edit-cont').append(edit({
      i18n : i18n
    }));

    me.initFormwork();

    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      1,
      [
        {name : '个人主页', target: 'javascript:void(0)'},
        {name : '个人登录密码修改', target: 'javascript:void(0)'}
      ],
      false
    );

    // put modules to frame
    $node.find('.posm-comp-clock').easyClock();
    $node.find('.posm-status-bar').statusBar('show', false);
    $node.find('.posm-action-bar').actionBar('show');

    var actions = [
      {
        name : '取消',
        target: function(){
          me.nav('/m/userprofilemanagement');
        }
      },
      {
        name : '确认修改密码',
        target: function(e){
          e.preventDefault();
          var $editform = $node.find('form');
          $editform.formwork('validate');
        }
      }
    ];

    $node.find('.taskbar').taskbar('show', actions);

    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('.big-btn-cont'), ['waves-block']);
    // waves.init();
    this.addKeyboard($node);
    cb();
  },
  addKeyboard: function($node){
    var me = this;
    $node.find('.form input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    })
    //当隐藏键盘的时候，登录组件回位
    .on('keypadComponentClickInputHide', function(){
      $node.find('.user-password-editor-box').removeClass('col-md-offset-4').addClass('col-md-offset-3');
    })
    //当显示键盘的时候，登录组件往右推
    .on('keypadComponentClickInputShow', function(){
      $node.find('.user-password-editor-box').removeClass('col-md-offset-3').addClass('col-md-offset-4');
    });
  },
  initFormwork: function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    me.formwork = $editform.formwork({
      namespace : metadata.NS, //use current comp's name as namespace
      fields : {
        '#password': {
          name: 'password',
          validate : function(){
            log.debug('Handling password validate event');
            if($(this).val() === ''){
              log.debug('password invalid');
              return '密码不能为空';
            }
            else{
              return null;
            }
          }
        },
        '#id': {
          name: 'id'
        },
        '#newpassword': {
          name: 'newpassword',
          validate: function(){
            if( $(this).val() === $editform.find('#password').val()){
              return '新密码和原密码不能相同';
            }
            if( $(this).val() === ''){
              return '密码不能为空';
            }
            if($(this).val().length < 6){
              return '密码不能少于6位'
            }
          }
        },
        '#confirmpassword': {
          name: 'confirmpassword',
          exclude : true,
          validate: function(){
            if( $(this).val() === ''){
              return '请再次输入确认密码';
            }
            if($editform.find('#newpassword').val() != $(this).val()){
              return '两次输入的密码不相同';
            }
          }
        }
      }
    })
    .on(metadata.NS + '.form.validate.valid', function(e){
      log.debug('Handling form validate event valid');
      $editform.formwork('submit');
    })
    .on(metadata.NS + '.form.validate.error', function(e, errors){
      log.debug('Handling form validate event error');
      noty({text: __('Something is wrong').replace('%s', errors.join(',')), type: 'error', timeout:5000});
    })
    .on(metadata.NS + '.form.submit', function(e, data){
      log.debug(data);
      me.submit(data);
    })
    .formwork('init');
  },
  submit : function(data){
    log.debug('Change New user ');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = '';
    var method = '';
    if(data.id){
      url = metadata.endpoint + '/' + data.id;
      method = 'PUT';
    }else{
      url = metadata.endpoint;
      method = 'POST';
    }
    var dataType = 'json';
    var notyInst = null;
    server({
      url: url,
      method: method,
      data: data,
      dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      log.debug(data);
      noty({text: '修改密码成功, 请重新登录', type: 'success', timeout:5000, layout: 'topRight'});
      me.user.getUser();
      me.nav('/m/login');
    })
    .fail(function(err){
      log.debug(err.responseText);
      noty({text: err.responseText, type: 'error', timeout:5000, layout: 'top'});
    })
    .always(function(){
      notyInst.close();
    })
  }
}

_.extend(UserpasswordManagement.prototype, prototype);
module.exports = UserpasswordManagement;
/**
UserpasswordManagement module end
*/
