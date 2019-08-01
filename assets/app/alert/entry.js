/**
Alert module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");

var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");
var font = require('fontawesome/less/font-awesome.less');
var moment = require("moment");
// window.moment = moment;
var jade = require("./index.jade");

var title = require("./title.jade");

var css = require("common/less/base.less");

require("./less/index.less");

var noty = require('customnoty');

var vmenu = require('vmenu');

var taskbar = require('taskbar');

var gridlist = require('gridlist');

var list = require('list');

var formwork = require('formwork');

var pagestate = require('pagestate');

var Promise = require("bluebird");

var loginForm = require('loginform');

var keypad = require('keypad');

var pubsub = require('PubSubJS');

var countdown = require('countdown');
var checkbox3 = require('checkbox3/dist/checkbox3.css');
var Autocomplete = require('autocomplete-nasetech');
var standarLogin = require('standarLogin');

var Alert = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('Alert has been created');
  return this;
}

var metadata =  {
  NS : 'alert',
  pub : [

  ],
  sub : [],
  endpoint : '/application'
}

_.extend(Alert, metadata);
var failtimes = 0;
var prototype = {
  init: function (){
    this.cancelFinger();
    log.info('init Alert entry');
    //定义一个存储报警信息的数组
    this.alarmArray = [];
    // 判断键盘是否存在，存在则remove这个元素
    var keypadUIContainer = $('body').find("#keypad-ui-component");
    if (keypadUIContainer.length) {
      keypadUIContainer.remove();
    }

    var $iframe = $('iframe');
    if ($iframe && $iframe.length > 0) {
      $iframe.remove();
    }
    pubsub.unsubscribe('words');
  },
  destroy: function(cb){
    this.cancelFinger();
    this.$node.find('form input').keypad('destroy');
    this.destroyAutocomplete();
    this.destoryStandarLogin();
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  destoryStandarLogin: function() {
    this.$node.find('.login').standarLogin('destroy');
  },
  show : function($node, cb){
    if (document.querySelector('#PinYinComponent')) {
      $('#PinYinComponent').remove();
    }
    var me = this;
    var msg = me.getFlashbag();
    var alarmText = (msg && msg.msg) ? msg.msg : '报警';
    me.topic = msg && msg.topic;
    //这里也把上一个页面的报警添加this.alarmArray
    if(msg && msg.msg){
      me.alarmArray.push(msg);
    }

    me.checkedRemoteAlert(msg && msg.msg);

    this.$node.pagestate({
      namespace : metadata.name,
      state: 0,
      /*
        0 list
        1 edit
      */
      states : {
        0 : [
          '.slide-1'
        ],
        1 : [
          '.slide-2'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(
      jade({
        alertText : alarmText
      })
    );
    
    var $module = $node.find('.login');
    
    this.$node
    .on('click', '.reset-alarm', function(e){
      me.prohibitionItem = me.detectionCheckbox();
      e.preventDefault();
      me.$node.pagestate('setState', 1);

      $module.standarLogin('show', {
        isAdmin: false,
        password: {
          isNoSession: true,
          isGetUserInfo: true
        },
        fingerprint: {
          ajaxConfig: {
            url: '/fingerprint/auth'
          }
        }
      });
    });

    me.$module = $module;

    pubsub.unsubscribe('alert_fail');
    pubsub.subscribe('aler_fail', function() {
      // $module.standarLogin("");
    })

    pubsub.unsubscribe('stopCameraPreviewing');
    pubsub.subscribe('stopCameraPreviewing', function() {
      console.log('#######3 接收到后端的stop 命令 #######')
      $module.standarLogin('resetInt');
    });

    $module
    .off('GET_USER_DATA').on('GET_USER_DATA', function (e, data) {
      console.log('#### 获取用户信息 #####', data);
      me.resetAlarm('base64', data);
    })
    .off('loginSuccess').on('loginSuccess', function(e, data, type) {
      console.log('########### 人脸登录成功 ##########', data, type)
      if (type != 'password') {
        if (data && data.token) {
          me.resetAlarm('token', data.token);
        } else {
          me.showError('用户信息不存在');
        }
      }
    })
    .off('loginError').on('loginError', function(e) {
      console.log('######## 人脸登录失败 #########', e);
    });

    me.changeLoginPosition();

    //添加帐号自动补全功能
    me.autocomplete();
    this.$node.pagestate('setState', 0);
    cb();
  },
  destroyAutocomplete: function () {
    this.$node.find('#username').Autocomplete('destroy');
  },
  autocomplete: function() {
    this.$node.find('#username').Autocomplete({
      url: '/user/autocomplete',
      limit: 5
    }).Autocomplete('show')
  },
  detectionCheckbox: function(){
    var me = this,
        $node = me.$node,
        data = {
          humidity: false,
          power_low: false,
          power_off: false
        };
    $node.find('.switch').each(function(item){
      var $this = $(this);
      data[$this.attr('name')] = $this.prop('checked');
    });
    return data;
  },
  resetAlarm : function(type, loginData){
    var d = $.Deferred();
    var me = this;
    var url = '/system/resetalarm?nosession=false',
      dataType = 'json',
      method = 'POST';

    var data = null;
    if(type === 'token'){
      data = {
        type : 'token',
        adminAuth: loginData,
        prohibitionItem: me.prohibitionItem,
        alarmType: me.alarmArray[me.alarmArray.length - 1] && me.alarmArray[me.alarmArray.length - 1].topic
      };
    }else if(type === 'base64'){
      var base64 = btoa(loginData.username + ":" + loginData.password),
      data = {
        type : 'base64',
        adminAuth: base64,
        prohibitionItem: me.prohibitionItem,
        alarmType: me.alarmArray[me.alarmArray.length - 1] && me.alarmArray[me.alarmArray.length - 1].topic
      };
    }
    else{
      noty({text: '解除失败', type: 'error', layout: 'topRight', timeout:2000});
      return d.reject({error: '类型不对'});
    }

    if (me.isRemote) {
      data.peer = me.cabinetId
    }

    me.$node.find('#signin').addClass('disabled');
    me.server({
      url: url,
      method: method,
      data : data,
      dataType : dataType
    }) //authorizations of getting gun
    .done(function(data){
      console.log('######### 解除警报########## ', data);
      noty({text: '管理员已经成功解除警报', type: 'success', timeout:5000, layout: 'topRight'});
      me.destoryStandarLogin();
      me.stopCamrea(function() {
        pubsub.publish('closeWindow');
      })
      d.resolve(data);
    })
    .fail(function(err){
      console.log('############ 采集成功验证失败 ##############', err)
      me.$node.find('#signin').removeClass('disabled');
      me.$node.find('#restart-prints').removeClass('hide');
      try{
        var error = err.responseJSON.error
        me.showError(error);
      }catch(e){
        me.showError('服务器出错');
      }
      console.log('######## 采集成功验证失败 发送alert_fail ########', me.$module.standarLogin);
      me.$module.standarLogin('outAuthFail')
      // 通知登录组件人脸验证失败
      pubsub.publish('alert_fail');
      
      d.reject(err);
    });

    return d;
  },
  stopCamrea: function (fn) {
    this.server({
        url: '/camera/stop'
      })
      .always(function () {
        fn && fn();
      });
  },
  showError : function(err){
    noty({text: err, type: 'error', layout: 'topRight', timeout:5000});
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
  update : function(data){
    var me = this,
        alarmMessage = data.msg,
        alarmArray = me.alarmArray,
        len = alarmArray.length,
        i = 0,
        isOnly = 0;
    for(i; i < len; i++) {
      if(alarmArray[i].msg === alarmMessage){
        isOnly++;
        return;
      }
    }
    me.checkedRemoteAlert(data.msg);
    //如果是唯一就添加到数组，并且len不为0,然后插入报警
    if(!isOnly){
      me.alarmArray.push(data);
      me.$node.find('.title').append(title({alertText: data.msg}));
    }
  },
  addKeyboard : function($node){
    // dont show keyboard at other media
    var me = this;
    $node.find('.form input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    })
    //当隐藏键盘的时候，登录组件回位
    .on('keypadComponentClickInputHide', function(){
      $node.find('.slide-2').removeClass('col-md-offset-2');
    })
    //当显示键盘的时候，登录组件往右推
    .on('keypadComponentClickInputShow', function(){
      $node.find('.slide-2').addClass('col-md-offset-2');
    });
  },
  cancelFinger: function() {
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT');
    pubsub.unsubscribe('adminauthbyfingerprint');
    pubsub.unsubscribe('FingerPrint_Status');
    this.server({
      url: '/fingerprint/stopScan',
    });
  },
  checkedRemoteAlert: function(data) {
    if (!data) return;
    var array = data.split('|');
    var me = this;
    if (array.length > 0) {
      me.isRemote = true;
    } else {
      me.isRemote = false;
    }
    if (me.isRemote) {
      me.cabinetId = array[array.length -1];
    }
  }
}

_.extend(Alert.prototype, prototype);
module.exports = Alert;
/**
Alert module end
*/
