'user strict';

var jade = require('./index.jade');
var less = require('./index.less');
var loginForm = require('loginform');
var keypad = require('keypad');
var pubsub = require('PubSubJS');
var countdown = require('countdown');
var Autocomplete = require('autocomplete-nasetech');
var noty = require('customnoty');

var user = require("common/usermanagement");

function LockCabinetPage (res) {
  res.apply(this);
  return this;
}

var prototype = {
  failtimes: 0,
  show: function(data, $node, speak, cb) {
    var me = this;
    var isRemote = false;
    var tips = '系统本地锁定';

    var remoteLockCabinet = data && data.remoteLockCabinet || null;
    
    console.log('#############remoteLockCabinet: ', remoteLockCabinet)

    if (remoteLockCabinet) {
      isRemote = true;
      tips = '系统已被远程锁定';
    }

    me.$node = $node;
    me.speak = speak;
    me.isRemote = isRemote;

    $node.append(jade({
      tips: tips
    }));

    if (!isRemote) {
      me.initLoginModule(isRemote);
    }

    cb();
  },
  // 如果锁定已经存在， 则进行状态更新
  update: function(data) {
    var me = this;
    var remoteLockCabinet = data && data.remoteLockCabinet || null;
    if (remoteLockCabinet) {
      me.$node.find('.login').addClass('hide');
      me.$node.find('.tipsH2').text('该柜机已被远程锁定');
    }
  },
  initLoginModule: function() {
    var me = this;
    this.$node.find('.login')
    .on('loginform.submit', function(e, data){
      e.preventDefault();
      // 登陆成功的操作
      me.passwordLogin(data);
    })
    .loginform({
      openFinger : function(){
        me.startFingerprintAuth();
      },
      cancelFinger : function(){
        $.ajax({
          url: '/fingerprint/stopScan',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
      }
    })
    .loginform('show', null, {btnLabel1 : '通过密码解锁', btnLabel2 : '解锁'});
    me.startFingerprintAuth();

    me.$node
      .on('click', "#restart-prints", function (e) {
        e.preventDefault();
        me.startFingerprintAuth();
      });

    // 注册键盘
    me.$node.find('.form input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    });
  },
  startFingerprintAuth: function() {
    var me = this;
    me.countdown();
    $.ajax({
      url: '/fingerprint/auth',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      beforeSend: function() {
        noty({
          text: '启动指纹扫描仪',
          type: 'info',
          layout: 'topRight',
          timeout: 2000
        });
      }
    })
    .done(function() {
      me.speak('scan');
    })
    .always(function() {
      me.onFingerprintResult();
      me.onFingerprintStatus();
      me.countdown();
    });
  },
  onFingerprintStatus: function() {
    var me = this;
    var $node = me.$node;

      pubsub.unsubscribe('FingerPrint_Status');
      pubsub.subscribe('FingerPrint_Status', function(topic, msg){
        if(msg.status === 1){
          noty({text: '预载入指纹比对失败，重新校验', type: 'info', layout: 'topRight', timeout: 1000})
          $node.find('.login').loginform('canvasPic', '/fingerprint/fingerPic?' + new Date().getTime(), false, false)
        }else if(msg.status === 0){
          noty({text: '扫描成功，正在校验用户指纹', type: 'info', layout: 'topRight', timeout: 1000})
          $node.find('.login').loginform('canvasPic', '/fingerprint/fingerPic?' + new Date().getTime(), false, true)
        }else if(msg.status === 4){
          noty({text: '扫描的指纹较差，请重新扫描', type: 'error', layout: 'topRight', timeout: 1000})
          $node.find('.login').loginform('canvasPic', '/fingerprint/fingerPic?' + new Date().getTime(), false, false)
        }
      });
  },
  onFingerprintResult: function() {
    var me = this;
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT');
    pubsub.subscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT', function(topic, message) {
      var userInfo = message.user;
      if(userInfo){
        console.log('指纹扫描成功, 获取的用户信息', message);
        user.getUserByToken(userInfo.token)
        .done(function(data) {
          console.log('根据用户的token， 拿到的用户信息', data)
          me.resetLockCabinet(data);
        })
        .fail(function() {
          noty({text: '验证失败', type: 'error', layout: 'top', timeout: 2000 });
        });
      } else {
        me.failtimes++;
        if(me.failtimes > 2){
          me.failtimes = 0;
          noty({text: '如果手指沾水或受伤，建议使用密码登录', type: 'error', layout: 'topRight', timeout:2000});
        }else{
          noty({text: message.error, type: 'error', layout: 'topRight', timeout:2000});
        }
        me.speak('scan_fail');
        me.destroyCountdown();
      }    
    });
  },
  passwordLogin: function(data) {
    var username = data.username;
    var password = data.password;
    var me = this;
    var nosessionUrl = '/auth/login?nosession=true';

    user.signin(
      username,
      password,  //data
      function(data){ // on success
        me.resetLockCabinet(data);
      },
      function(err){ // on error
        me.$node.find('#signin').removeClass('disabled');
        if(err.status === 403){
          me.speak('login_fail');
          noty({text: err.responseJSON.error, type: 'error', layout: 'top', timeout:1000});
        }else{
          // print error;
          if(err && err.responseJSON){
            noty({text: err.responseJSON.error, type: 'error', layout: 'top', timeout: 1000});
          }
        }
      },
      nosessionUrl    //添加nosessionURL
    )
  },
  resetLockCabinet: function(data) {
    console.log('登录成功，检测用户身份', data);
    var me = this;
    var roles = data.roles && data.roles[0] || null;
    var permissions = roles && roles.permissions || [];
    var token = data.token;

    if (permissions.indexOf('manage-cabinet') > -1) {
      me.updateSettings(token);
    } else {
      noty({text: '您不是柜机管理员无法解除', type: 'error', layout: 'top', timeout: 2000});
    }
  },
  updateSettings: function(token) {
    var me = this;
    var settings = [{
      key: 'lockCabinet',
      value: false
    }];

    $.ajax({
      url: '/system/updatesettings',
      method: 'POST',
      data: {
        settings: settings
      },
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(token));
      }
    })
    .done(function() {
      noty({text: '解除成功', type: 'success', layout: 'topRight', timeout: 2000});
      // 调用销毁当前模块的
      pubsub.publish('sub.lockCabinet', {
        lockCabinet: false,
        remoteLockCabinet: null
      });
    })
    .fail(function() {
      noty({text: '解除失败', type: 'error', layout: 'top', timeout: 2000});
    })
  },
  countdown: function () {
    var me = this,
      $node = me.$node;
    //隐藏重新扫描按钮
    $node.find('#restart-prints').addClass('hidden');
    $node.find('.countdown-box').removeClass('hide').countdown('show', 15, function () {
      me.destroyCountdown();
      me.cancelFinger();
      //显示重新扫描按钮
      $node.find('#restart-prints').removeClass('hidden');
    });
  },
  cancelFinger: function() {
    $.ajax({
      url: '/fingerprint/stopScan',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
  },
  destroyCountdown: function () {
    var me = this,
      $node = me.$node;
    //销毁倒计时
    $node.find('.countdown-box').addClass('hide').countdown('destroy');
    //显示重新扫描按钮
    $node.find('#restart-prints').removeClass('hidden');
  },
  destroy: function(cb) {
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT');
    pubsub.unsubscribe('FingerPrint_Status');
    
    var keypadUIContainer = $('body').find("#keypad-ui-component");
    if (keypadUIContainer.length) {
      keypadUIContainer.remove();
    }

    cb();
  }
}

_.extend(LockCabinetPage, prototype);

module.exports = LockCabinetPage;