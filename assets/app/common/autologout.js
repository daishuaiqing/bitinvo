/*
  Autologout.js
*/
'use strict';
var pubsub = require('PubSubJS');
var psFactory = require('./pubsubfactory');
var flexModal = require('flexmodal');
var router = require('common/router.js');


var AutoLogout = function(){
  log.info('Autologout has been created');
}


var metadata = {
  NS : 'AutoLogout',
  pub : {
  },
  sub : {
    start: 'autologout.start',
    stop: ['autologout.stop', 'system.error']
  }
}

var prototype = {
  timer :null,
  logoutTimer : null,
  logoutInterval: null,
  timeLeft: 30,                    //初始化倒计时数，以秒为单位
  defaultTime : 120000,            //用来重置延迟时间和默认的customTime一样，以毫秒为单位
  customTime :  120000,             //初始化延迟时间，程序中会变动
  init : function(){
    log.debug('Message AutoLogout intializing');
    psFactory(this, metadata);
    var me = this;
    $('.main').on('click', function(){
      me.restartCount();
    });
    return this;
  },
  restartCount: function(){
    if(this.timer){
      this.start(null, this.customTime);
    }
  },
  start: function(msg, time){
    var me = this,
        countDownNumber = me.timeLeft,       //倒计时显示
        TimeOut = countDownNumber * 1000;   //补时间差
    time = (time === null || typeof time === 'undefined') ? this.customTime : time;
    this.customTime = time;
    clearTimeout(this.timer);
    clearTimeout(this.logoutTimer);
    clearInterval(this.logoutInterval);

    this.timer = setTimeout(function(){
      $('#logoutnoti').remove();
      if ($('.window').hasClass('hide')) {
      // if(window.location.pathname !== '/m/alert'){//在 alert页面上不需要提示登出
        var $modal = $('<div/>').attr('id', 'logoutnoti').appendTo($('body'))
        .flexmodal()
        .on('hide.bs.modal', function(){
          me.restartCount();
        })
        .on('shown.bs.modal'/*Bootstrap event*/, function(e){
          me.logoutInterval = setInterval(function(){
            countDownNumber = countDownNumber - 1;
            $modal.$node.find('#timeleft').html(countDownNumber)
          },
          1000);
          me.logoutTimer = setTimeout(function(){
            me.stop();
            log.debug(' AutoLogout : Timeout, send info to logout');

            pubsub.publish('user.logout', function(){
              return true; //force Refresh
            });
          },
          TimeOut);    //补上提前弹出提示框的时间
        })
        .flexmodal('show',
          {
            modalTitle : '即将退出本次登录'
          },
          function(){
            return '<h1>您已经有两分钟没有操作，系统即将在<span id="timeleft">'+ me.timeLeft +'</span>秒后退出, 点击取消以继续操作</h1>'
          }
        )
      };
      $('#logoutnoti').find('.modal-content').addClass('logoutnoti-red-bg')
    },
    time - TimeOut);  //提前倒计时的时间，弹出自动退出提示框
  },
  stop: function(msg){
    $('#logoutnoti').remove().find('.modal-content').removeClass('logoutnoti-red-bg');
    clearTimeout(this.timer);
    clearTimeout(this.logoutTimer);
    clearInterval(this.logoutInterval);
    this.timer = null;
    this.logoutTimer = null;
    this.logoutInterval = null;
    this.customTime = this.defaultTime;   //this.customTime 初始化为我们默认的defaultTime
    this.timeLeft = 30;
  },
  destroy : function(){
    this.stop();
    return this;
  },
  remove: function () {
    clearTimeout(this.time);
  }
}

_.extend(AutoLogout, metadata);
_.extend(AutoLogout.prototype, prototype);

module.exports = new AutoLogout();
/*
  Autologout.js
*/
