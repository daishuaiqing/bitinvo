'use strict';

var jade = require('./tmp/password.jade');
var ejp = require('easy-jq-plugin');
var i18n = require('locales/zh-CN.json');
var user = require("common/usermanagement");
var server = require('common/server.js').server;
var audio = require('common/audio.js');
var noty = require('customnoty');
var formwork = require('formwork');
var Autocomplete = require('autocomplete-nasetech');
var keypad = require('keypad');

require('./less/password.less');

var passwordLogin = function(element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version: '0.0.1',
  name: 'passwordLogin'
};

var prototype = {
  render: function(config) {
    var me = this;
    var $node = me.$node;

    // 如果admin对象存在，则就认为是管理员验证
    var isAdminLogin = config && config.isAdmin;
    var isGetUserInfo = config && config.password.isGetUserInfo;
    this.config = config;

    $node.html(jade(
      {
        i18n: i18n
      }
    ));
    var $editform = $node.find('#password-panel form');
    
    me.initAutoComplete();
    me.initKeyboard();

    me.initFormwork($editform)
    .off('onSubmit')
    .on('onSubmit', function(e, data) {
      if (isGetUserInfo) {
        me.$node.trigger('GET_USER_INFO', data);
      } else {
        if (isAdminLogin) {
          me.requestAdminUser(data);
        } else {
          me.requestUserLogin(data);
        }
      }
    });

    $node
    .off('click', '#close')
    .on('click', '#close', function() {
      me.$node.trigger('RESTART_LOGIN');
      me.removeDisabled();
    })
    .off('click', '#signin')
    .on('click', '#signin', function () {
      if (me.isSubmit) {
        console.log('######### 重复点击登录 #############');
        return;
      }
      me.iSubmit = true;
      // 禁用按钮
      me.disabledSubmit();
      $editform.formwork('validate');
    });

    $(document).off('keyup').on('keyup', function(e) {
      if(e.keyCode === 13) {
        if (me.isSubmit) {
          return;
        }
        me.isSubmit = true;
        $editform.formwork('validate');
      }
    });

    return $node;
  },
  requestUserLogin: function(data) {
    var username = data.username,
        password = data.password,
        me = this,
        url = '/auth/login?nosession=true',
        isNoSession = me.config.password && me.config.password.isNoSession;
    if (!isNoSession) {
      url = null;
    }
    user.signin(
      username,
      password,
      function(data) {
        console.log('普通身份验证，账号密码登录成功: ', data);
        me.$node.trigger('PASSWORD_LOGIN_SUCCESS', data);
      },
      function (err) {
        me.speak('login_fail');
        me.removeDisabled();
        me.errorHandle(err);
      },
      url
    );
  },
  requestAdminUser: function(data) {
    var me = this;
    var ajaxConfig = me.config.password.adminAjaxConfig;
    var base64 = btoa(data.username + ':' + data.password);
    ajaxConfig.data['adminAuth'] = base64; 

    if (!ajaxConfig) {
      throw '初始化参数: password.adminAjaxConfig 不存在';
    }

    server(ajaxConfig)
    .done(function(data) {
      me.$node.trigger('PASSWORD_LOGIN_SUCCESS', data);
    })
    .fail(function(error) {
      var errorText = error.responseJSON && error.responseJSON.error || '登录失败';
      noty({text: errorText, type: 'error', layout: 'top', timeout: 2000});
      me.removeDisabled();
      me.speak('admin_auth_failed');
    });
  },
  errorHandle: function(error) {
    if (typeof error === 'object' && error.responseJSON) {
      noty({text: error.responseJSON.error, type: 'error', layout: 'top', timeout: 1000});
    } else if (typeof error === 'string') {
      noty({text: error, type: 'error', layout: 'top', timeout: 1000});
    } else {
      noty({text: '未知错误', type: 'error', layout: 'top', timeout: 1000});
    }
  },  
  disabledSubmit: function() {
    this.$node.find('#signin').addClass('disabled');
    this.iSubmit = true;
  },
  removeDisabled: function() {
    this.$node.find('#signin').removeClass('disabled');
    this.isSubmit = false;
  },
  initFormwork: function($editform) {
    var me = this;
    var $node = me.$node;

    me.formwork = $editform.formwork(me.formConfig());

    me.formwork
    .off(metadata.name + '.form.validate.valid')
    .on(metadata.name + '.form.validate.valid', function (e) {
      e.preventDefault();
      $editform.formwork('submit');
    })
    .off(metadata.name + '.form.validate.error')
    .on(metadata.name + '.form.validate.error', function (e, errors) {
      e.preventDefault();
      noty({
        text: __('Something is wrong').replace('%s', errors.join(',')),
        type: 'error',
        layout: 'top',
        timeout: 2000
      });
      me.removeDisabled();
    })
    .off(metadata.name + '.form.submit')
    .on(metadata.name + '.form.submit', function (e, data) {
      e.preventDefault();
      $editform.trigger('onSubmit', data);
    })
    .formwork('init');

    return $editform;
  },
  formConfig: function() {
    return {
      namespace: metadata.name,
      fields: {
        '#username': {
          name: 'username',
          validate: function () {
            var val = $(this).val();
            if (!val) {
              return '名称不能为空';
            } else {
              return null;
            }
          }
        },
        '#password': {
          name: 'password',
          validate: function () {
            var val = $(this).val();
            if (!val) {
              return '密码不能为空';
            } else {
              return null;
            }
          }
        }
      }
    }
  },
  initAutoComplete: function() {
    this.$node.find('#username').Autocomplete({
      url: '/user/autocomplete',
      limit: 5,
    }).Autocomplete('show');
  },
  destroyAutoComplete: function() {
    var $input_username = this.$node.find('#username');
    if ($input_username.length) {
      $input_username.Autocomplete('destroy');
    }
  },
  initKeyboard: function() {
    this.$node.find('input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    });
  },
  destroyKeyboard: function() {
    var $input = this.$node.find('input');
    if ($input.length) {
      $input.keypad('destroy');
    }
  },
  speak: function(key, keepKey) {
    audio.play(key, keepKey);
  },
  destroy: function() {
    this.destroyAutoComplete();
    this.destroyKeyboard();
  }
};

module.exports = ejp.pluginize(passwordLogin, metadata, prototype);