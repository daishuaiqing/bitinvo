'use strict';
var moment = require("moment");

// var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var jade = require("./index.jade");
var css = require("../common/less/base.less");
var home = require("./less/home.less");
var pubsub = require('PubSubJS');
var hammerJs = require('hammerjs');

var arrowCss = require('./less/main.less');
var arrowTpl = require('./arrow.jade');

var statefooter = require('statefooter');
var Message = require('common/message.js');

var HomePage = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('Home has been created');
  return this;
}

//prefer Declarative (contrast: Imperative)
_.extend(HomePage, {
  NS : 'home',
  pub : [

  ],
  sub : []
});

var prototype = {
  init: function (){
    log.info('init home page entry');
    // 获取系统设置数据
    this.getSystemSetData();
    this.initWakeScreen();
  },
  show: function($node, cb){
    var me = this,
        $html_hasClass__local = true;
    me.speak('welcome');

    me.$node = $node;
    $node
    .append(jade( {
      badgeImg : ''
    }));

    // 设置logo
    me.setLogo();
    // 设置标题
    me.setApplicationTitle();

    //插入动画箭头
    $node.find('.home_arrow_left').append(arrowTpl({title: '管理版'}));
    $node.find('.home_arrow_right').append(arrowTpl({title: '快捷版'}));
    // $('body')
    //   .off('click')
    //   .on('click', function(){
    //     $node.find('.my-arrow').removeClass('hide');
    //     $node.find('.my-arrow').removeClass('hide');
    //   });

    //添加脚步state
    $node.find('.footer').statefooter('show', {
      isShowIcon: false
    });

    setInterval(
      function(){
        var locale = moment().locale("zh-cn");
        $node.find('.inline-date-year').text(locale.format('LL'));
        $node.find('.inline-time').text(locale.format('HH:mm:ss'));
      },
      1000
    );

    // 检测柜机的类型（根据添加的模块）
    me.checkedCabinetType();

    // 延时处理保证系统设置获取成功
    setTimeout(function() {
      if (me.isLocalhost()) {
        Message.initAsLocal();
      } else if (me.isApplicationMachine()) {
        Message.initAsLocal();
      }
      console.log('检查是否推送');
    }, 400);

    cb();

    //添加手势识别
    me.addHammer();
  },
  isApplicationMachine: function() {
    var systemSetData,
        isApplicationMachine;
    
    systemSetData = window.localStorage.getItem('systemSetData');
    
    try {
      systemSetData = JSON.parse(systemSetData);
    } catch(e) {
      systemSetData = null;
    }

    if (systemSetData) {
      isApplicationMachine = systemSetData.isApplicationMachine;
    }

    console.log('systemSetData', systemSetData);
    console.log('isApplicationMachine', isApplicationMachine);

    if (isApplicationMachine === 'true') {
      return true;
    } else {
      return false;
    }
  },
  isLocalhost: function() {
    return $('html').hasClass('local');
  },
  setApplicationTitle: function() {
    var me = this;
    var settings = window.localStorage.getItem('systemSetData');
    var oSettings = null;
    try {
      oSettings = JSON.parse(settings);
    } catch(e) {
      console.log('转换为JSON格式失败 setApplication')
    }
    if (oSettings) {
      _.forEach(oSettings, function(value, key) {
        if (key === 'title1') {
          me.$node.find('#title1').text(value || '智能枪支弹药专用保险柜');
        } else if (key === 'title2') {
          me.$node.find('#title2').text(value || '管理系统');
        }
      })
    } else {
      me.$node.find('#title1').text('智能枪支弹药专用保险柜');
      me.$node.find('#title2').text('管理系统');
    }
  },
  setLogo: function() {
    var me = this;
    var logoPath = require('../common/img/logo.jpeg');
    $.ajax({
      url: '/system/logo',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    .done(function(data) {
      if (data && data.dataURI) {
        var dataURI = data.dataURI;
        me.$node.find('#logoPic').attr('src', dataURI);
      } else {
        me.$node.find('#logoPic').attr('src', logoPath);
      }
    })
    .fail(function() {
      if (me.$node) {
        me.$node.find('#logoPic').attr('src', logoPath);
      }
    });
    
  },
  getSystemSetData: function () {
    var me = this;
    $.ajax({
      url: '/system/settings',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    .done(function(data) {
      // 获取系统设置的标题
      var systemSetData = {};
      _.forEach(data, function(item) {
        if (item.value === 'true') {
          item.value = true
        } else if (item.value === 'false') {
          item.value = false
        }
        _.set(systemSetData, item.key, item.value);
      });
      window.localStorage.setItem('systemSetData', JSON.stringify(systemSetData));
    })
  },
  checkedCabinetType: function () {
    this.server({
      url: '/cabinetmodule/moduletype',
      method: 'GET'
    })
    .done(function (data) {
      var gun = data.gun,
          bullet = data.bullet;
      if (gun && !bullet) {
        sessionStorage.setItem('CABINETTYPE', 'gun')
      } else if (!gun && bullet) {
        sessionStorage.setItem('CABINETTYPE', 'bullet')
      } else {
        sessionStorage.setItem('CABINETTYPE', 'gunAndBullet')
      }
    })
  },
  addHammer: function() {
    //给当前页面div.home-screen绑定一个手势识别，用于切换到哪里版本
    var homeScreen = this.$node.find('.home-screen').get(0);
    var hammerTime = new Hammer(homeScreen),
        me = this,
        $html_hasClass__local = true;
    hammerTime.on('swipeleft', function(e){
      $('body').addClass('isSimpleapplication');
      me.nav('/m/simpleapplication');
    });
    hammerTime.on('swiperight', function(e){
        $('body').removeClass('isSimpleapplication');
      if($html_hasClass__local){
        me.nav('/m/boxlogin', {
          mode: 'fullpage',
          stay: false
        })
      }else{
        me.nav('/m/login');
      }
    });
  },
  destroy: function(cb){
    pubsub.unsubscribe(this.pubsubToken);
    pubsub.unsubscribe('approvedApplication')
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  wakeScreen: function () {
    $.ajax({
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

_.extend(HomePage.prototype, prototype);

module.exports = HomePage;
