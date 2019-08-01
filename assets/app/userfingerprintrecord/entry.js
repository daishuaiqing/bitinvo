/**
  UserfingerprintRecord js
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");

var waves = require("waves");
var wavecsss = require("waves/src/less/waves.less");
var noty = require('customnoty');
var jade = require("./index.jade");
var css = require("../common/less/base.less");
require("./less/boxlogin.less");
var i18n = require('locales/zh-CN.json');
var pubsub = require('PubSubJS')
var backBtn = require('backbtn');
var server = require('common/server.js').server;
var hammerJs = require('hammerjs');
var countdown = require('countdown');

var UserfingerprintRecord = function(reg){
    //inject method getIId, inject nav, push,leave
    reg.apply(this);
    log.info('UserfingerprintRecord has been created');
    return this;
}

_.extend(UserfingerprintRecord, {
    NS : 'userfingerprintrecord',
    pub : [

    ],
    sub : []
});


var prototype = {
  init : function (){
    log.info('init UserfingerprintRecord entry');
    var user = this.user.getUser(),
        me = this;
    me.errorDelayId = null;
    me.againFingreprintDelayId = null;
    me.isStopScan = true;
    me.user.getUser()
    .done(function (data) {
      log.debug(data, '%s############################ get current user id #######################%s')
      me.currentUserId = data.id;
    })
  },
  destroy: function(cb){
    var me = this;
    me.cancelFinger();
    //清除延迟_.delay
    me.errorDelayId && clearTimeout(me.errorDelayId);
    me.againFingreprintDelayId && clearTimeout(me.againFingreprintDelayId);
    me.hammerTime && me.hammerTime.destroy();
    cb();
  },
  show : function($node, cb){
    var me = this;
    $node.append(jade({
      src: require('./img/fingerprint-white.png'),
      i18n: i18n
    }));
    //初始是化指纹图片
    me.canvasPic(null, true);

    $node.find('.status-bar').backBtn('show');

    $node.find('.sanning-fingger-cont').on('click', '.btn', function(e){
      var id = $(this).attr('id');
      switch(id) {
        case 'return':
          me.nav('/m/userprofilemanagement');
          break;
        case 'login':
          me.nav('/m/login');
          break;
        case 'register':
          me.nav('/m/signup');
          break;
        case 'fingerprint-btn':
          me.cancelFinger();
          me.recordFingerPrint();
          me.countDown();
          $node.find('#fingerprint-btn').addClass('hide');
          break;
        default:
          me.nav('/m/userhome');
      }
    });

    //初始指纹管理
    me.initFingerprintManagement();
    me.recordFingerPrint();
    cb();
  },
  initFingerprintManagement: function () {
    var me = this,
        $node = me.$node,
        $fingerprintBox = $node.find('#fingerprintList');
    //指纹管理按钮监听on事件
    $node.find('#fingerprintManagement').off('click')
    .on('click', function () {
      if($fingerprintBox.hasClass('isActive')){
        me.updateFingerprintUI(true, $fingerprintBox);
      }else {
        me.updateFingerprintUI(false, $fingerprintBox);
      }
    });

    //删除指定指纹按钮
    $node.find('#fingerprintList').on('click', '.remove-fingerprint-button', function () {
      var id = $(this).data('id'),
          index = $(this).data('index'),
          $li = $(this).parents('.div-li');
      me.removeSpecifyFingerprint(id, $li, index);
    });

    //监听左右滑动
    var oScreen = $node.find('.userfingerprint-screen').get(0);
    var hammerTime = new Hammer(oScreen);
    me.hammerTime = hammerTime;
    hammerTime.on('swipeleft', function (e) {
      me.updateFingerprintUI(false, $fingerprintBox)
    });
    hammerTime.on('swiperight', function (e) {
      if($fingerprintBox.hasClass('isActive')){
        me.updateFingerprintUI(true, $fingerprintBox);
      }
    })
  },
  cancelFinger: function(){
    pubsub.unsubscribe('adminauthbyfingerprint');
    pubsub.unsubscribe('Fingerprint_First');
    pubsub.unsubscribe('Fingerprint_Remove');
    pubsub.unsubscribe('Fingerprint_Combine');
    pubsub.unsubscribe('Fingerprint_Fail');
    pubsub.unsubscribe('Fingerprint_Timeout');
    if (this.isStopScan) {
      server({
        url: '/fingerprint/stopScan'
      })
    }
  },
  countDown: function(){
    var me = this,
        $node = me.$node;
    if (!$node) return;
    $node.find('#fingerprint-btn').addClass('hide');
    $node.find('.countdown-box').removeClass('hide').countdown('show', 60, function() {
      //停止倒计时
      me.countDown()
    });
  },
  destroyCountDown: function(isShowFinger){
    var me = this,
        $node = me.$node,
        $countDownBox = $node.find('.countdown-box');
    if($countDownBox.length){
      $countDownBox.addClass('hide').countdown('destroy');
      if (!isShowFinger) {
        $node.find('#fingerprint-btn').removeClass('hide');
      }
    }
  },
  removeSpecifyFingerprint: function (id, $li, index) {
    var me = this;
    me.server({
      url: '/fingerprint',
      method: 'DELETE',
      data: {"id": id}
    })
    .done(function (data) {
      $li.remove();
      console.log(index, '@@@@@@@@@@@@@@@@@@@@@ this currentIndex')
      if (index === 0) {
        me.resetDsiablePasswdLogin();
      }
    })
    .fail(function (error) {
      noty({text:'服务器出错', type: 'error', layout: 'error'});
      console.log(error)
    })
  },
  resetDsiablePasswdLogin: function () {
    var me = this;
    me.server({
      url: '/user/' + me.currentUserId,
      method: 'PUT',
      data: {"disablePasswdLogin": 'no'}
    })
    .done(function (data) {
      console.log('%s######################################%s 清空指纹让其可以密码登录', data)
    })
    .fail(function (error) {
      console.log('%s######################################%s 清空指纹让其可以密码登录, 操作失败', error)
    })
  },
  getCurrUserId: function () {
    var me = this,
        d = $.Deferred();
    me.user.getUser()
    .done(function(user){
      d.resolve(user.id);
    })
    .fail(function(error){
      d.reject(error);
    });
    return d;
  },
  getFingerprintData: function () {
    var me = this,
        d = $.Deferred();
    me.getCurrUserId()
    .done(function(id){
      me.server({
        url: '/fingerprint?' + 'where={' + '"owner":"' + id + '"}'
      })
      .done(function (data) {
        d.resolve(data);
      })
      .fail(function(error){
        d.reject(data);
      })
    });
    return d;
  },
  updateFingerprintUI: function (isActive, $fingerprintBox) {
    var me = this,
        $node = me.$node,
        $textBox = $node.find('.fingerprint_info');

    //控制显示还是隐藏
    if (isActive) {
      $textBox.removeClass('col-md-offset-2').addClass('col-md-offset-4');
      $fingerprintBox.removeClass('isActive');
      me.cancelFinger();
      //隐藏指纹管理开启指纹扫描
      me.recordFingerPrint();
    } else {
      //打开指纹管理停止指纹扫描
      me.cancelFinger();
      me.destroyCountDown();
      //打开列表的时候获取指纹数据
      me.getFingerprintData()
      .done(function(data) {
        var li_collections = '';

        if (data.length) {
          data.forEach(function (item, index) {
            li_collections += '<div class="div-li clearfix">' +
            '<span class="fingerprint_list_info_span">' +
              '指纹' + (index + 1) +
            '</span>' +
            '<span class="span remove-fingerprint-button btn btn-empty" data-id="' + item.id + '" data-index="' + index +  '">' +
            '删除' +
            '</span>' +
            '</div>'
          });
        } else {
          li_collections = '您当前没有指纹信息';
        }

        $node.find('#fingerprintList').empty().append(li_collections)
      })
      .fail(function () {
        var li_collections = '无法获取数据';
        $node.find('#fingerprintList').empty().append(li_collections)
      });
      $fingerprintBox.addClass('isActive');
      $textBox.removeClass('col-md-offset-4').addClass('col-md-offset-2');
    }
  },
  canvasPic: function (img, isDefault, isSuccess) {
    var $canvas = this.$node.find('#canvas');
    var canvas = $canvas.get(0);
    var context = canvas.getContext('2d');
    canvas.width = 150;
    canvas.height = 168;
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
        context.drawImage(ImgDOM, 0, 0, 150, 168)
        context.strokeRect(16, 10, 118, 147)
      } else {
        $canvas.removeClass('scan_build_pic')
        context.drawImage(ImgDOM, 0, 30, 150, 128)
      }
    }
  },
  recordFingerPrint: function(){
    var notyInst = null;
    var me = this;
    me.$node.find('#fingerprint-btn').addClass('hide')
    server({
      url : '/fingerprint/record',
      beforeSend: function(){
        notyInst = noty({text: '启动指纹扫描仪', type: 'info', layout: 'topRight', timeout:2000});
      }
    })
    .done(function(message){
      log.debug(' #### UserfingerprintRecord : recordFingerPrintHandler - starting record #### ');
      log.debug(message);
      me.countDown();
      me.speak('scan', true);
      var $fringerprintTips = me.$node.find('#fingerprintTips');
      pubsub.unsubscribe('Fingerprint_First')
      pubsub.subscribe('Fingerprint_First', function(topic, msg){
        me.isStopScan = false;
        log.debug(msg);
        pubsub.unsubscribe('Fingerprint_First');
        console.log('%这里是指纹录入管理系统返回的状态值%', msg.status);
        if(msg.status === 1){
          $fringerprintTips.text('第一次扫描成功，请将手指移开');
          noty({text: '第一次扫描成功，请将手指移开', type: 'success', layout: 'top', timeout: 2000});
          me.canvasPic('/fingerprint/fingerPic?type=record&' + new Date().getTime(), false, true);
        }
        me.speak('movefinger');
        me.destroyCountDown(true);
      });
      pubsub.unsubscribe('Fingerprint_Remove')
      pubsub.subscribe('Fingerprint_Remove',function(topic, msg){
        me.isStopScan = false;
        log.debug(msg);
        pubsub.unsubscribe('Fingerprint_Remove');
        console.log('%这里是指纹录入管理系统返回的状态值%', msg.status);
        if(msg.status === 2){
          $fringerprintTips.text('请将手指放在指纹扫描仪上进行第二次采集');
          noty({text: '请进行第二次扫描', type: 'info', layout: 'topRight', timeout: 2000});
          me.countDown();
        }
      });
      pubsub.unsubscribe('Fingerprint_Combine')
      pubsub.subscribe('Fingerprint_Combine',function(topic, msg){
        me.isStopScan = false;
        log.debug(msg);
        pubsub.unsubscribe('Fingerprint_Combine');
        console.log('%这里是指纹录入管理系统返回的状态值%', msg.status);
        if(msg.status === 3){
          noty({text: '第二次扫描成功,指纹录入成功', type: 'success', layout: 'topRight', timeout: 2000});
          me.canvasPic('/fingerprint/fingerPic?type=record&' + new Date().getTime(), false, true);
          me.speak('fingerprintRecordSuccess');
          me.destroyCountDown(true);
          me.againFingreprintDelayId = _.delay(function () {
            me.nav('/m/userprofilemanagement');
          }, 1000)
        }
      });
      pubsub.unsubscribe('Fingerprint_Fail')
      pubsub.subscribe('Fingerprint_Fail',function(topic, msg){
        me.isStopScan = false;
        log.debug(msg);
        pubsub.unsubscribe('Fingerprint_Fail');
        console.log('%这里是指纹录入管理系统返回的状态值%', msg.status);
        if(msg.status === 4){
          noty({text: '录入失败，请返回重新扫描', type: 'error', layout: 'topRight', timeout: 2000});
          me.speak('fingerprintRecordFail');
          me.destroyCountDown();
        }
      });
      pubsub.unsubscribe('Fingerprint_Timeout')
      pubsub.subscribe('Fingerprint_Timeout', function(topic, msg){
        me.isStopScan = false;
        log.debug(msg);
        pubsub.unsubscribe('Fingerprint_Timeout');
        if(msg.status === "timeout"){
          $fringerprintTips.text('手指移开扫描仪超时');
          noty({text: '指纹录入超时，请重新录入', type: 'error', layout: 'topRight', timeout: 2000});
          me.destroyCountDown();
        }
      })
    })
    .fail(function(err){
      log.error(' #### UserfingerprintRecord : recordFingerPrintHandler - can not record #### ');
      log.error(err);
      me.isStopScan = false;
      if(err.responseJSON.error === 'fingerpeint collection full'){
        noty({text: '您已采集10个指纹，请删除再采集', type: 'error', layout: 'top', timeout:5000});
        me.speak('fingerprintisfull');
      }else{
        noty({text: '扫描失败, 请返回重新扫描', type: 'error', layout: 'top', timeout:5000});
      }

    })
    .always(function(){
      notyInst.close();
    });
  }
}

_.extend(UserfingerprintRecord.prototype, prototype);

module.exports = UserfingerprintRecord;

/**
  UserfingerprintRecord js
*/
