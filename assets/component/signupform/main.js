/**
* SignupForm Component Start
*/
'use strict';

var animateCss = require("animate.css");

var noty = require("customnoty");

var ejp = require('easy-jq-plugin');
var formwork = require('formwork');
var user = require("common/usermanagement");
var i18n = require('locales/zh-CN.json');

var tpl = require('./main.jade');
var less = require('./main.less');


var SignupForm = function(element, conf){
  log.info('Signup Form has been created');
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version : '0.0.1',
  name : 'signupform',
  events : {
    'success' : 'signupform.signup.success',
    'fail' : 'signupform.signup.fail',
    'cancel' : 'signupform.signup.cancel'
  }
};

var prototype = {
  init : function (){
    log.info('init SignupForm entry');
  },
  show : function(){
    var me = this;
    var $node = this.$node;
    // create html frame
    $node.append(tpl({i18n : i18n}))

    var $editform = $node.find('form');
    me.formwork = $editform.formwork({
      namespace : metadata.name, //use current comp's name as namespace
      fields : {
        '#username': {
          name: 'username',
          init: function(){
          },
          validate : function(){
            log.debug('Handling username validate event');
            var userName = $(this).val();
            var reg = /^[a-zA-Z0-9]\w{3,15}$/ig;
            if(userName === ''){
              log.debug('Username invalid');
              return '警员编号不能为空';
            }else if(!reg.test(userName)){
              return '用户名必须由数字或字母大于4位的字符组成';
            }else{
                return null;
            }
          }
        },
        '#password': {
          name: 'password',
          validate : function(){
            log.debug('Handling password validate event');
            var passwordStr = $(this).val();
            if(passwordStr === ''){
              log.debug('Password invalid');
              return __('Password required');
            }else if(!/[a-zA-Z0-9]{6,}/.test(passwordStr)){
              return "密码格式不正确,必须由大小字母和数字组成6～16位字符串";
            }else{
              return null;
            }
          }
        },
        '#confirm-password': {
          name: 'confirm-password',
          validate : function(){
            log.debug('Handling confirm-password validate event');
            if($(this).val() === ''){
              log.debug('Confirm Password invalid');
              return __('Confirm Password required');
            }
            else if($(this).val() !== $('#password').val()){
              log.debug('Confirm Password mismatch');
              return __('Password mismatch');
            }
            else{
                return null;
            }
          }
        }
      }
    })
    .on(metadata.name + '.form.validate.valid', function(e){
      log.debug('Handling form validate event valid');
      $editform.formwork('submit');
    })
    .on(metadata.name + '.form.validate.error', function(e, errors){
      log.debug('Handling form validate event error');
      noty({text: __('Something is wrong').replace('%s', errors.join(',')), type: 'error', timeout:5000, layout:'top'});
    })
    .on(metadata.name + '.form.submit', function(e, data){
      log.debug(data);
      me.signup(data);
    })
    .on('click', '.action-btn', function(e){
      log.debug('Handling .action-btn click event');
      var id = $(this).attr('id');
      log.debug('Get button id as %s', id);
      $editform.find('.error-info').addClass('hide');
      e.preventDefault();
      switch(id) {
        case 'cancel':
          log.debug('Trigger SignupForm cancel event');
          $node.trigger(metadata.events.cancel);
          break;
        case 'close':
          log.debug('Trigger SignupForm cancel event from close');
          $node.trigger(metadata.events.cancel);
          break;
        case 'signup':
          // validate first , but do not submit !!, use event handler to deal with validate result and decide whehter to submit
          $editform.formwork('validate');
          break;
        default:
      }
    });

    return this;
  },
  signup : function(data){
    log.debug('Signing up new user');
    var username = data.username,
    password = data.password,
    me = this;
    log.info('New User with name %s', username);
    user.signup(
      username,
      password,  //data
      function(data){ // on success
          log.debug(data);
          me.$node.trigger(metadata.events.success, [data]);
      },
      function(err){ // on error
          log.debug('Signup api return error : %s ', err);
          me.$node.trigger(metadata.events.fail, [err]);
      })
  }
}

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(SignupForm, metadata, prototype);
/**
* SignupForm Component End
*/
