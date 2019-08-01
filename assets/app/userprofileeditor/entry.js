/**
UserProfileEditor module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");

var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var checkbox3 = require('checkbox3/dist/checkbox3.css');
var font = require('fontawesome/less/font-awesome.less');
var jade = require("./index.jade");
var css = require("common/less/base.less");
var i18n = require('locales/zh-CN.json');

require("./less/index.less");

var noty = require('customnoty');

var easyClock = require('easy-clock');

var statusBar = require('statusbar');

var actionBar = require('actionbar');

var vmenu = require('vmenu');

var taskbar = require('taskbar');

var backBtn = require('backbtn');

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var UserProfileEditor = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('UserProfileEditor has been created %s', this.getIId());
  return this;
}

var metadata =  {
  NS : 'userprofileeditor',
  pub : [

  ],
  sub : [],
  endpoint: '/user'
}

_.extend(UserProfileEditor, metadata);

var prototype = {
  init : function (){
    log.info('init UserProfileEditor entry');
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  show : function($node, cb){
    var me = this;
    me.$node.pagestate({
      namespace : metadata.NS,
      state: 0,
      /*
        0 list
        1 edit
      */
      states : {
        0 : [
          '.edit-cont'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(jade());

    $node.find('.status-bar').backBtn('show', function(){me.nav('/m/userprofilemanagement')});
    $node.find('.action-bar').actionBar('show');

    $node.find('.edit-cont').hide().append(edit({
      i18n : i18n
    }));

    me.initFormwork();

    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      1,
      [
        {name : '个人主页', target: 'javascript:void(0)'},
        {name : '个人资料修改', target: 'javascript:void(0)'}
      ],
      false
    );

    $node.pagestate('setState', 0);

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
        name : '保存修改',
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

    var user = me.user.getUser();
    user.done(function(user){
      var $editform = me.$node.find('form');
      $editform.formwork('refresh', user);
    })
    .fail(function(err){
      noty({text: __('Something is wrong').replace('%s', errors.join(',')), type: 'error', timeout:5000});
    });

    cb();
  },
  initFormwork: function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    me.formwork = $editform.formwork({
      namespace : metadata.NS, //use current comp's name as namespace
      fields : {
        '#username' : {
          name : 'username',
          exclude : true
        },
        '#alias': {
          name: 'alias',
          validate : function(){
            log.debug('Handling title validate event');
            if($(this).val() === ''){
              log.debug('alias invalid');
              return '名称不能为空';
            }
            else{
              return null;
            }
          }
        },
        '#id': {
          name: 'id'
        },
        '#phone': {
          name: 'phone',
          validate: function () {
            var phone = $(this).val();
            if(!(/^1[34578]\d{9}$/.test(phone))){
              return '手机号码格式有误';
            } else {
              return null;
            }
          }
        },
        '#age': {
          name: 'age',
          validate: function(){
            var $meValue = Number($(this).val());
            if($meValue < 1 || $meValue > 130){
              return '请输入合法的年龄'
            }else{
              return null;
            }
          }
        },
        '#email': {
          name: 'email',
          validate: function(){
            var email = $(this).val(),
            reg = /\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;
            if(!reg.test(email)){
              return '邮箱地址不正确';
            }else{
              return null;
            }
          }
        },
        '#details': {
          name: 'details'
        },
        '[name="sex"]': {
          name: 'sex',
          init : function(){
            $(this).on('click', function(e){
              $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
              $(this).attr("checked", 'checked').prop("checked", "checked");
            });
          },
          refresh: function(value, data){
            $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
            $(this).attr("checked", 'checked').prop("checked", "checked");
            if(value == 'M'){
              $editform.find('#male').attr("checked", 'checked').prop("checked", "checked");
            }
            else{
              $editform.find('#female').attr("checked", 'checked').prop("checked", "checked");
            }
          },
          val : function(value, originalData){
            return $editform.find('[name="sex"]:checked').val();
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
      me.submitUser(data);
    })
    .formwork('init');
  },
  submitUser : function(data){
    log.debug('Update user');
    log.debug(data);
    if(!data) return;
    var me = this;
    var notyInst = null;
    me.user.updateUser(
      data,
      function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    ).done(function(data){
      log.debug(data);
      noty({text: '创建成功', type: 'success', timeout:5000, layout: 'topRight'});
      me.nav('/m/userprofilemanagement');
    })
    .fail(function(err){
      log.debug(err);
      noty({text: err, type: 'success', timeout:5000, layout: 'top'});
    })
    .always(function(){
      notyInst.close();
    })
  }
}

_.extend(UserProfileEditor.prototype, prototype);
module.exports = UserProfileEditor;
/**
UserProfileEditor module end
*/
