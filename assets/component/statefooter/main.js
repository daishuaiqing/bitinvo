/*
  快捷版头部大组件,嵌套backbtn组件
*/

'use strict';

var $ = require('jquery');
var ejp = require('easy-jq-plugin');

var jade = require('./main.jade');
var less = require('./main.less');
var server = require('common/server.js').server;
var pubsub = require('PubSubJS');
var page = require("page/index");
var font = require('fontawesome/less/font-awesome.less');
var StateFooter = function (element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'statefooter',
  events : {}
};

var prototype = {
  show : function (options) {
    var me = this,
        $node = me.$node,
        statuses = [
                {src: require('./img/network.png'), text: "网络正常", id : 'connection'},
                {src: require('./img/db.png'), text: "数据正常", id : 'db'},
                {src: require('./img/powers.png'), text: "电源正常", id : 'power'},
                {src: require('./img/heart.png'), text: '柜机正常', id : 'heart'},
                {src: require('./img/temperature.png'), text: '温度获取中', id : 'temperature'},
                {src: require('./img/humidity.png'), text: '湿度获取中', id : 'humidity'}
                //{src: require('./img/signal.png'), text: '手机信号获取中', id: 'signal'}
              ],
      isShowIcon = options && options.isShowIcon || false,
      settings = me.getSystemSetting();

    

    if (settings) {
      if (settings.enableAlcohol) {
        statuses.push({src: require('./img/beercan.png'), text: '酒精度获取中', id: 'alcoho'});
      }
    }

    $node.append(jade({
      statuses: statuses
    }));

    if (!isShowIcon) {
      $node.find('.status-cont').hide();
    }

    //更新状态
    me.updateState();
    me.setApproved();
    me.setRetrunApplication();

    $node.find('#approvedIcon')
    .off('click')
    .on('click', function () {
      page('/m/quickdook');
    });

    $node.find('#returnApplication')
    .off('click')
    .on('click', function () {
      page('/m/returnquickdook');
    });

    return me;
  },
  getSystemSetting: function () {
    var systemSetting = window.localStorage.getItem('systemSetData');
    var settingObject = {};
    var me = this;
    if (systemSetting) {
      settingObject = JSON.parse(systemSetting);
      return settingObject;
    }
    return null;
  },
  updateState: function () {
    // var me = this;
        // $node = me.$node,
        // getConnectionUpdate = function(){
        //   // add the function to the list of subscribers for a particular topic
        //   // we're keeping the returned token, in order to be able to unsubscribe
        //   // from the topic later on
        //   // me.pubsubToken = pubsub.subscribe('system.message', me.messageHandler);
        // };

    this.getStatus();
    // setTimeout(function(){
    //   me.getStatus();
    // }, 2 * 1000);

  },
  setApproved: function () {
    pubsub.unsubscribe('approvedApplication')
    pubsub.subscribe('approvedApplication', function (topic, value) {
      if (value.count > 0) {
        $('#approvedIcon').removeClass('hide').find('.status-text .text').text('待取工单');
        $('#approvedIcon').find('.badge_tips').text(value.count);
      } else {
        $('#approvedIcon').addClass('hide');
      }
    })
  },
  setRetrunApplication: function () {
    pubsub.unsubscribe('prereturnApplication')
    pubsub.subscribe('prereturnApplication', function (topic, value) {
      if (value.count > 0) {
        $('#returnApplication').removeClass('hide').find('.status-text .text').text('待还工单');
        $('#returnApplication').find('.badge_tips').text(value.count);
      } else {
        $('#returnApplication').addClass('hide');
      }
    })
  },
  getStatus : function(){
    var me = this;
    log.debug(' #### status getting#### ');
    
    pubsub.unsubscribe('system.status')
    me.pubsubToken = pubsub.subscribe('system.status', me.StatusHandler);

    pubsub.unsubscribe('masterInfo');
    pubsub.subscribe('masterInfo', me.checkHasMaster);
  },
  checkHasMaster: function(topic, msg) {
    if (!msg.hasMaster) {
      $('#connection .status-icon').removeClass('status-warning').removeClass('status-ok').addClass('status-warning');
      $('#connection .status-text').text('未连接主机').addClass('text-warning');
    } else {
      $('#connection .status-icon').removeClass('status-warning').removeClass('status-error').addClass('status-ok');
      $('#connection .status-text').text('网络正常').removeClass('text-warning');
    }
  },
  StatusHandler : function(topic, msg){
    log.debug(' #### Status setting #### ');
    log.debug(msg);
    var me = this;
    if(msg.topic === 'temperature'){
      var val = msg.msg;
      if(val < -15 || val > 65){
        $('#temperature .status-icon').removeClass('status-warning').removeClass('status-ok').addClass('status-error');
        $('#temperature .status-text').html(val !== null ? val + '&#8451': '数据异常').addClass('text-error');
      }else{
        $('#temperature .status-icon').removeClass('status-warning').removeClass('status-error').addClass('status-ok');
        $('#temperature .status-text').html(val !== null ? val + '&#8451': '数据异常').removeClass('text-error');
      }
    }else if(msg.topic === 'humidity'){
      var val = msg.msg;
      if(val >= 70){
        $('#humidity .status-icon').removeClass('status-warning').removeClass('status-ok').addClass('status-error');
        $('#humidity .status-text').text(val !== null? val + '%': '数据异常').addClass('text-error');
      }else{
        $('#humidity .status-icon').removeClass('status-warning').removeClass('status-error').addClass('status-ok');
        $('#humidity .status-text').text(val !== null ? val + '%': '数据异常').removeClass('text-error');
      }
    }else if(msg.topic === 'powerType'){
      var powerType = parseInt(msg.msg[0]);
      var val = msg.msg[1];
      if (powerType !== powerType) powerType = null;
      if (powerType === 1) {
        $('#power .status-text').text('电源正常').removeClass('text-error');
        $('#power .status-icon')
        .addClass('status-ok')
        .removeClass('status-error')
        .removeClass('status-warning');
      } else {
        if (powerType === -1) {
          $('#power .status-text').text('获取电源失败').addClass('text-error');
          $('#power .status-icon').removeClass('status-warning').removeClass('status-ok').addClass('status-error');
        } else {
          if (val === null) {
            $('#power .status-text').text('数据异常').addClass('text-error');
          } else {
            $('#power .status-text').text('备用电源' + val + '%').addClass('text-error');
          }
          $('#power .status-icon').removeClass('status-warning').removeClass('status-ok').addClass('status-error');
        }
      }
    }else if(msg.topic === 'alcoho'){
      var alcohoType = msg.msg;
      if(alcohoType < 8){
        if (alcohoType === null) {
          alcohoType = 0;
        }
        $('#alcoho .status-text').text(alcohoType + 'mg/100mL').removeClass('text-error');
        $('#alcoho .status-icon').removeClass('status-warning').removeClass('status-error').addClass('status-ok').removeClass('status-error');
      } else if (alcohoType >= 8 && alcohoType <= 80){
        $('#alcoho .status-text').text(alcohoType + 'mg/100mL').addClass('text-error');
        $('#alcoho .status-icon').removeClass('status-warning').removeClass('status-ok').addClass('status-error');
      } else if (alcohoType > 80) {
        $('#alcoho .status-text').text(alcohoType + 'mg/100mL').addClass('text-error');
        $('#alcoho .status-icon').removeClass('status-warning').removeClass('status-ok').addClass('status-error');
      }
    }else if(msg.topic === 'SMSDevice'){
      var signalType = msg.msg
      if(signalType == 0){
        $('#signal .status-text').text('无信号').addClass('text-error');
        $('#signal .status-icon').removeClass('status-warning').removeClass('status-ok').addClass('status-error');
      }else if( signalType == 1){
        $('#signal .status-text').text('信号差').removeClass('text-error');
        $('#signal .status-icon').addClass('status-warning').removeClass('status-ok').removeClass('status-error');
      }else if(signalType == 2){
        $('#signal .status-text').text('信号良好').removeClass('text-error');
        $('#signal .status-icon').addClass('status-ok').removeClass('status-warning').removeClass('status-error');
      }else{
        $('#signal .status-text').text('信号优').removeClass('text-error');
        $('#signal .status-icon').removeClass('status-warning').removeClass('status-error').addClass('status-ok');
      }
    } else if (msg.topic === 'connection') {
      if(msg.msg === 'offline'){
        $('#connection .status-icon').removeClass('status-warning').removeClass('status-ok').addClass('status-error');
        $('#connection .status-text').text('没有网络').addClass('text-error');
      }else{
        $('#connection .status-icon').removeClass('status-warning').removeClass('status-error').addClass('status-ok');
        $('#connection .status-text').text('网络正常').removeClass('text-error');
      }
    }
  }
}

module.exports = ejp.pluginize(StateFooter, metadata, prototype);
