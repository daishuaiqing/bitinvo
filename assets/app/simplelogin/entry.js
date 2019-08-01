/*
  simplelogin 进入需要权限验证的app的登录
*/
'user strict';

var indexTpl = require('./index.jade');
var user = require("common/usermanagement");
var loginForm = require('loginform');
var server = require('common/server.js').server;
var countdown = require('countdown');
var simpleAppHeader = require('simpleappheader');
var pubsub = require('PubSubJS');
var noty = require('customnoty');
var indexCSS = require('./less/index.less');
var keypad = require('keypad');
var Autocomplete = require('autocomplete-nasetech');
var faceLogin = require('faceLogin');
var standarLogin = require('standarLogin');

var SimpleLogin = function (reg) {
  reg.apply(this);
  return this;
}

var metadata = {
  NS: 'simpleLogin',
  pub: [

  ],
  sub: [],
  endpoint: '/simplelogin'
}

_.extend(SimpleLogin, metadata);

var prototype = {
  init: function () {
    //定义一个获取上一个app传递过来的数据对象
    var me = this;
    //定义一个接收上一个app的数据对象
    var previousAppData = me.getFlashbag();
    if(previousAppData){
      if(!previousAppData.hasOwnProperty('topic')){
        previousAppData = JSON.stringify(previousAppData);
        sessionStorage.setItem('PREVAPPDATA', previousAppData);
      }
    }
    previousAppData = sessionStorage.getItem('PREVAPPDATA');
    previousAppData = JSON.parse(previousAppData);
    me.PREVAPPDATA = previousAppData;

    //定义一个当前状态
    me.CURRENTSTATE = {
      "isStopScan": true
    }
    me.initWakeScreen();
  },
  stopCamrea: function(fn) {
    server({
      url: '/camera/stop'
    })
    .always(function() {
      fn && fn();
    });
  },  
  show: function ($node, cb) {
    var me = this,
        clickButtonName = me.getClickButtonName();
    $node.append(indexTpl());

    var checkCameraStopSuccess = function(data) {
        me.$node.find('.btn-back').addClass('disabled');
        me.stopCamrea(function() {
          me.$node.find('.btn-back').removeClass('disabled');
          me.nav("/m/simpleapplication");
        });
    }


    //添加头部组件
    if(clickButtonName === 'userInfo'){
      $node.find('.simple-app_header')
      .simpleAppHeader('show', function(){
        checkCameraStopSuccess();
        //点击返回按钮跳转到上一个app页面
        // me.nav('/m/simpleapplication');
      }, true, function(){
        me.nav('/m/signup');
      });

    }else{
      $node.find('.simple-app_header')
      .simpleAppHeader('show', function(){
        //点击返回按钮跳转到上一个app页面
        // me.nav('/m/simpleapplication');
        checkCameraStopSuccess();
      });
    }
    
    //加载登录器
    me.initLoginModule();
    me.changeLoginPosition();
    
    cb();
  },
  initLoginModule: function() {
    var me = this;
    var $module = me.$node.find('.simple-app_main');
    
    $module.standarLogin('show', {
      isAdmin: false,
      password: {
        isNoSession: false,
      },
      fingerprint: {
        ajaxConfig: {
          url: '/fingerprint/auth'
        }
      }
    });

    $module
    .off('loginSuccess').on('loginSuccess', function(e, data, type) {
      me.loginType = type;
      me.CURRENTSTATE.token = data.token;
      me.CURRENTSTATE.userId = data.id;
      me.intoNextModule();
    })
    .off('loginError').on('loginError', function() {

    });
  },
  updateLoginModuleStatus: function() {
    var type = this.loginType;
    this.$node.find('.simple-app_main').standarLogin('outAuthFailed', type);
  },
  changeLoginPosition: function() {
    var oldClass = '';
    var me = this;
    this.$node.off('keypadComponentClickInputShow').on('keypadComponentClickInputShow', function () {
      // var className = me.$node.find('.login-module_container')
      // .removeClass('col-md-offset-3').addClass('col-md-offset-4');
    })
    .off('keypadComponentClickInputHide').on('keypadComponentClickInputHide', function() {
      // var className = me.$node.find('.login-module_container')
      //   .removeClass('col-md-offset-4').addClass('col-md-offset-3');
    });
  },  
  isAccess: function (type) {
    var me = this,
        permissions,
        isPermit;
    if (type === 'cabinetManage') {
      permissions = ['manage-cabinet'];
    } else if (type === 'viewApp') {
      permissions = ['view-app', 'manage-cabinet'];
    }

    isPermit = _.some(permissions, function(permission){
        return me.user.hasPermission(permission);
    });
    return isPermit;
  },
  intoNextModule: function () {
    var me = this,
        clickButtonName = me.getClickButtonName();

    me.loginSuccessNav(clickButtonName);
  },
  loginSuccessNav: function(clickButtonName) {
    var me = this;
    console.log('登录成功', clickButtonName)
    switch (clickButtonName) {
      case 'system':
      //判断是否有权限访问
      if(me.unAuthorizedAccess(me.isAccess('cabinetManage'))){
        me.nav('/m/systemmanagement');
      }
      break;
      case 'userInfo':
      me.nav('/m/userprofilemanagement');
      break;
      case 'authorized':
      if(me.unAuthorizedAccess(me.isAccess('viewApp'))){
        me.nav('/m/approvalmanagement');
      }
      break;
    }
  },
  showNoty: function(type, text) {
    if (type === 'error') {
      noty({text: text, type: 'error', layout: 'top', timeout: 3000})
    } else {
      noty({text: text, type: 'success', layout: 'topRight', timeout: 3000})
    }
  },
  unAuthorizedAccess: function (isAccess) {
    var me = this;
    if(!isAccess) {
      me.speak('unAuthorizedAccess');
      noty({text: '非管理员用户无法访问！', type: 'error', layout: 'top'});
      me.updateLoginModuleStatus();
      return false;
    }
    me.speak('account_signin_success');
    return true;
  },
  getClickButtonName: function () {
    return this.PREVAPPDATA.clickButtonName;
  },
  setStateData: function (type, attr, value) {
    var me = this,
        obj = me.getStatePosition(type),
        dataObject = me[obj];
    _.set(dataObject, attr, value);
  },
  getStateData: function (type, attr) {
    var me = this,
        obj = me.getStatePosition(type),
        dataObject = me[obj];
    return _.get(dataObject, attr);
  },
  getStatePosition: function (type){
    switch (type) {
      case 'prev':
        return 'PREVAPPDATA';
      case 'curr':
        return 'CURRENTSTATE';
      case 'next':
        return 'NEXTAPPDATA';
    }
  },
  destroyStandarLogin: function() {
    var $module = this.$node.find('.simple-app_main');
    if ($module.length) {
      $module.standarLogin('destroy');
    }
  },
  destroy: function(cb) {
    $('#noty_topRight_layout_container').remove();
    this.destroyStandarLogin();
    cb();
  },
  wakeScreen: function () {
    server({
      url: '/system/wakeup',
      method: 'get'
    });
  },
  initWakeScreen: function () {
    var me = this;

    var throttled = _.throttle(me.wakeScreen, 6000, { 'trailing': false });

    $(document)
    .off('click')
    .on('click', throttled)
  }  
}

_.extend(SimpleLogin.prototype, prototype);
module.exports = SimpleLogin;
