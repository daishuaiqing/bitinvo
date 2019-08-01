/**
Getgun module
*
* nase_i18n 为全局json路径
*
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
require('jquery-circle-progress');
var server = require('common/server.js').server;
var moment = require("moment");
var user = require("common/usermanagement");
var logout = require('common/autologout.js').destroy();
var animateCss = require("animate.css");
var backbtn = require('backbtn');
var statefooter = require('statefooter');
var simpleAppHeader = require('simpleappheader');
var less = require('./less/index.less');
var menuLess = require('./less/menuModule.less');
var pubsub = require('PubSubJS');
var hammerJs = require('hammerjs');
var noty = require('customnoty');
var SimpleApplication = function(reg){
    //inject method getIId, inject nav, push,leave
    reg.apply(this);
    return this;
}

var metadata =  {
  NS : 'simpleapplication',
  noAuth: true,
  pub : [

  ],
  sub : [],
  endpoint : '/simpleapplication'
}
_.extend(SimpleApplication, metadata)

var prototype = {
    init : function (){
      log.info('init SimpleApplication entry');
      var me = this;
      me.cabinetType = null;
      //定义一个传递给下一个app的数据对象
      me.NEXTAPPDATA = {
        "jobType": null,
        "clickButtonName": null,
        "facePerception": null
      };
      //先执行登出，保证session无用户信息
      me.logout();

      var settings = window.localStorage.getItem('systemSetData');
      if (!settings) {
        me.localStroageSetting();
      }
      me.getSystemSetData();
      // 检测是否需要人脸识别
      me.hasFaceperception();
      me.initWakeScreen();
    },
    destroy: function (cb) {
      if (this.shortTime) {
        clearInterval(this.shortTime);
      }
      $('#noty_topRight_layout_container').remove();
      cb();
    },
    show : function($node, cb){
      var me = this;
      // // 检测枪数量
      // me.newCheckGunBulletCount();
      // create html frame
      //检测柜机的类型,过滤ui
      var cabinetType = sessionStorage.getItem('CABINETTYPE');
      var $filterBeforeDOM = me.filterUI(cabinetType);
      $node.append($filterBeforeDOM);

      //插入脚步状态组件
      $node.find('.simply-footer').statefooter('show');

      //获取枪数量，子弹数量
      if (this.checkIsShowGunBulletCountPanel()) {
        // 控制UI
        $node.find('#simpleApplicationLeftPanel').show();
        $node.find('#simpleApplicationRightPanel').removeClass('col-md-10 col-md-offset-1').addClass('col-md-8');

        if (cabinetType === 'gun') {
          me.getGunNumber(function() {
            me.pubsubToken = pubsub.subscribe('system.message', me.gunNumberHandler.bind(me));
          });
        } else if (cabinetType === 'bullet') {
          me.getBulletCount();
        } else {
          me.getGunNumber(function() {
            me.pubsubToken = pubsub.subscribe('system.message', me.gunNumberHandler.bind(me));
          });
        }
        // 短轮询查询枪弹数
        me.shortPollingGetGunAndBulletCount();
      } else {

        $node.find('#simpleApplicationRightPanel').removeClass('col-md-8').addClass('col-md-10 col-md-offset-1');
        $node.find('#simpleApplicationLeftPanel').hide();
      }

      //添加头部组件
      $node.find('.simply-header')
      .simpleAppHeader('show', function(){
        //点击返回按钮跳转到上一个app页面
        me.changeRouteSetFlashBag('/m/home');
      });

      // 检测是否开始极速版本
      me.getSystemSetting()
      .done(function(isOpenQuickApplication) {
        me.onEntryButtonClickEvent(isOpenQuickApplication);
      });

      me.checkedWebCam();

      // 添加菜单
      me.initCloseMenu();

      // 添加手势监听
      me.addHammer();

      cb();

    },
    checkedWebCam: function() {
      var me = this;
      if (me.systemSetting) {
        window.localStorage.setItem('isWebCam', me.systemSetting.isWebCam);
      } else {
        me.server({
          url: '/system/settings'
        })
        .done(function(data) {
          _.forEach(data, function(item, index) {
            if (item.key === 'enableCam') {
              if (item.value === 'true') {
                window.localStorage.setItem('isWebCam', true);
              } else {
                window.localStorage.setItem('isWebCam', false);
              }
            }
          });
        })
        .fail(function() {
          window.localStorage.setItem('isWebCam', false);
        });
      }
    },
    localStroageSetting: function () {
      var me = this;
      $.ajax({
        url: '/system/settings',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      .done(function(data) {
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
      });
    },      
    checkIsShowGunBulletCountPanel: function() {
      var isShow = false;
      var systemSetData = window.localStorage.getItem('systemSetData');

      if (systemSetData) {
        try {
          systemSetData = JSON.parse(systemSetData);
        } catch(e) {}
        if (systemSetData.showCount) {
          isShow = true;
        } else {
          isShow = false;
        }
      };
      return isShow;
    },
    getSystemSetData: function() {
      var me = this;
      var setting = window.localStorage.getItem('systemSetData');

      if (setting) {
        try {
          me.systemSetting = JSON.parse(setting);
        } catch(e) {}
      } else {
        $.ajax({
          url: '/system/settings',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        .done(function(data) {
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
          me.systemSetting = systemSetData;
        })
        .fail(function() {
          me.systemSetting = {};
        })
      }
    },
    getGunNumber: function(fn){
      var me = this;
      var $gunBox = this.$node.find('#cabinet-gun-number');
      server({
        url: '/cabinetmodule/countgun?' + new Date().getTime()
      }).done(function (data) {
        var gunCount = data.length && data[0].load ? data[0].load : 0;
        var allCount = data.length && data[0].capacity ? data[0].capacity : 0;
        var value = null;
        // 如果数量没有改变则不更新
        if (me.gunCount === gunCount) return;
        me.gunCount = gunCount;
        me.allCount = allCount;
        me.updateGunCountUi(gunCount,allCount);
      }).fail(function(){
        me.updateGunCountUi();
      });
      fn && fn();
    },
    newCheckGunBulletCount: function () {
      this.server({
        url: '/gun/gunisisit'
      })
    },
    gunNumberHandler: function(topic, msg){
      log.debug('#### gunNumber getting ####');
      log.debug(msg);
      var me = this;
      if(msg.topic === 'allCount'){
        var gunCount = msg.msg[0].load ? msg.msg[0].load : 0;
        var allCount = msg.msg[0].capacity ? msg.msg[0].capacity  : 0;
        var value = null;
        me.updateGunCountUi(gunCount, allCount);
      }
    },
    updateGunCountUi: function (gunCount, allCount) {
      if (!this.$node) return;
      var $gunBox = this.$node.find('#cabinet-gun-number'),
          value = null,
          me = this;
      if (!allCount) {
        value = 0;
        gunCount = 0;
      } else {
        value = gunCount / allCount;
      }
      $gunBox.circleProgress({
          value: value,
          size: 180,
          thickness: 6,
          emptyFill: "#8061a7",
          fill : {
            gradient: ["#a2cb5f","#dc9d61"]
          }
      });
      $gunBox.find('.show-number-span').text(gunCount);
      $gunBox.find('.title').text('枪支量');
    },
    updateBulletCountUi: function (bulletCount) {
      if (!this.$node) return;
      var $bulletBox = this.$node.find('#cabinet-bullet-number');
      var value = null;
      if (!bulletCount) {
        value = 0;
        bulletCount = 0;
      } else {
        value = bulletCount / 640;
      }
      $bulletBox.circleProgress({
          value: value,
          size: 180,
          thickness: 6,
          emptyFill: "#8061a7",
          fill: {
            gradient: ["#0097ff","#a93789"]
          }
      });
      $bulletBox.find('.show-number-span').text(bulletCount);
      $bulletBox.find('.title').text('弹药量');
    },
    getBulletCount: function(fn){
      var $bulletBox = this.$node.find('#cabinet-bullet-number');
      var me = this;
      server({
        url: '/cabinetmodule/countbullet?' + new Date().getTime(),
        method: 'get'
      })
      .done(function(data){
        var bulletCount = data.length && data[0].load ? data[0].load : 0;
        if (me.bulletCount === bulletCount) return;
        me.bulletCount = bulletCount;
        //更改ui，不传参数默认为0
        me.updateBulletCountUi(bulletCount);
      })
      .fail(function(){
        me.updateBulletCountUi();
      });
      fn && fn();
    },
    filterUI: function (cabinetType) {
      if (cabinetType === 'gun') {
        return require('./gunIndex.jade')({
          i18n: __('simpleapplication'),
          type: 'gun'
        });
      } else if (cabinetType === 'bullet') {
        return require('./bulletIndex.jade')({
          i18n: __('simpleapplication'),
          type: 'bullet'
        });
      }
      return require('./index.jade')({
        i18n: __('simpleapplication'),
        type: 'both'
      });
    },
    logout: function () {
      user.signout(null);
    },
    changeRouteSetFlashBag: function (route) {
      var me = this;
      me.setFlashbag(me.NEXTAPPDATA);
      me.nav(route);
    },
    hasFaceperception: function() {
      var me = this;
      if (me.systemSetting) {
        me.setStateData('next', 'facePerception', me.systemSetting.facePerception);
      } else {
        me.server({
          url: '/system/faceperception',
          method: 'get'
        })
        .done(function(data) {
          console.log('This is check faceperception #################', data)
          if (data.value === 'true') {
            me.setStateData('next', 'facePerception', true)
          } else {
            me.setStateData('next', 'facePerception', false)
          }
        })
        .fail(function(err) {
          // noty({text: '检测是否需要人脸识别失败', layout: 'top', type: 'error', timeout: 2000});
          me.setStateData('next', 'facePerception', false)
        });
      }
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
    },    
    /*
      状态管理
    */
    setStateData: function (type, attr, value) {
      var me = this,
          obj = me.getStatePosition(type),
          dataObject = me[obj];
      _.set(dataObject, attr, value);
    },
    getStateData: function (type, attr) {
      var me = this,
          obj = me.getStatePosition(type),
          dataObject = this[obj];
      return _.get(dataObject, attr);
    },
    getStatePosition: function (type) {
      switch (type) {
        case 'prev':
          return 'PREVAPPDATA';
        case 'curr':
          return 'CURRENTSTATE';
        case 'next':
          return 'NEXTAPPDATA';
      }
    },
    getSystemSetting: function() {
      var me = this;
      var d = $.Deferred();
      var isOpenQuickApplication = false;
      if (me.systemSetting) {
        return d.resolve(me.systemSetting.quickApplication);
      }
      me.server({
        url: '/system/settings'
      })
      .done(function(data) {
        _.forEach(data, function(item, index) {
          if (item.key === 'quickApplication') {
            if (item.value === 'true') {
              isOpenQuickApplication = true;
            }
          }
        });
        if (isOpenQuickApplication) {
          me.setStateData('curr', 'isOpenQuickApplication', true);
        } else {
          me.setStateData('curr', 'isOpenQuickApplication', false);
        }
        d.resolve(isOpenQuickApplication);
      })
      .fail(function(error) {
        d.reject(false);
      });
      return d;
    },
    onEntryButtonClickEvent: function(isOpenQuickApplication) {
      var me = this;
      var $node = me.$node;

      $node.find('.button-list-ul')
      .off('touchstart', 'button')
      .on('touchstart', 'button', function (e) {
        var $target = $(e.target);
        $target.addClass('active');
      })
      .off('touchend', 'button')
      .on('touchend', 'button', function (e) {
        var $target = $(e.target);
        $target.removeClass('active');
      })
      .off('click', 'button')
      .on('click', 'button', function(e) {
        var map = {
          getGun: function() {
            var url = isOpenQuickApplication ? '/m/minPage#type=gun' : '/m/simplesaveget';
            me.setStateData('next', 'jobType', 'gun');
            me.changeRouteSetFlashBag(url);
            // me.startCameraStream(function() {
            // })
          },
          getBullet: function() {
            var url = isOpenQuickApplication ? '/m/minPage#type=bullet' : '/m/simplesaveget';
            me.setStateData('next', 'jobType', 'bullet');
            me.changeRouteSetFlashBag(url);
            // me.startCameraStream(function() {
            // })
          },
          returnGun: function() {
            var url = isOpenQuickApplication ? '/m/minPage#type=returnGun' : '/m/simplesaveget';
            me.setStateData('next', 'jobType', 'returnGun');
            me.changeRouteSetFlashBag(url);
            // me.startCameraStream(function() {
            // })
          },
          returnBullet: function () {
            var url = isOpenQuickApplication ? '/m/minPage#type=returnBullet' : '/m/simplesaveget';
            me.setStateData('next', 'jobType', 'returnBullet');
            me.changeRouteSetFlashBag(url);
            // me.startCameraStream(function() {
            // })
          },
          saveGun: function() {
            var url = isOpenQuickApplication ? '/m/minPage#type=storageGun' : '/m/simplesaveget';
            me.setStateData('next', 'jobType', 'storageGun');
            me.changeRouteSetFlashBag(url);
            // me.startCameraStream(function() {
            // })
          },
          saveBullet: function() {
            var url = isOpenQuickApplication ? '/m/minPage#type=storageBullet' : '/m/simplesaveget';
            me.setStateData('next', 'jobType', 'storageBullet');
            me.changeRouteSetFlashBag(url);
            // me.startCameraStream(function() {
            // })
          },
          emergency: function() {
            var url = isOpenQuickApplication ? '/m/minPage#type=emergency' : '/m/simplesaveget';
            me.setStateData('next', 'jobType', 'emergency');
            me.changeRouteSetFlashBag(url);
            // me.startCameraStream(function() {
            // })
          },
          authorized: function() {
            me.setStateData('next', 'clickButtonName', 'authorized');
            me.changeRouteSetFlashBag('/m/simplelogin');
            // me.startCameraStream(function() {
            // })
          },
          moreMenu: function() {
            me.openMenu();
          },
          system: function () {
            me.setStateData('next', 'clickButtonName', 'system');
            me.changeRouteSetFlashBag('/m/simplelogin');
            // me.startCameraStream(function() {
            // })
          },
          userInfo: function() {
            me.setStateData('next', 'clickButtonName', 'userInfo');
            me.changeRouteSetFlashBag('/m/simplelogin');
            // me.startCameraStream(function() {
            // })
          },
          maintain: function () {
            var url = isOpenQuickApplication ? '/m/minPage#type=maintain' : '/m/simplesaveget';
            me.setStateData('next', 'jobType', 'maintain');
            me.changeRouteSetFlashBag(url);
            // me.startCameraStream(function() {
            // })
          },
          returnmaintain: function () {
            var url = isOpenQuickApplication ? '/m/minPage#type=returnMaintain' : '/m/simplesaveget';
            me.setStateData('next', 'jobType', 'returnMaintain');
            me.changeRouteSetFlashBag(url);
            // me.startCameraStream(function() {
            // })
          }
        };
        //只要是从按钮进去的都设置返回按钮的状态为false
        $node.find('.status-bar').backBtn('refresh', function () {
          me.handleBackBtn(true);
        });

        var target = $(this).attr('name');
        map[target] && map[target].call(me);
      });
    },
    openMenu: function() {
      var me = this;
      me.$node.find('.menu-entry_container').addClass('active');
      me.$node.find('.menu-entry-mask').addClass('active');
    },
    closeMenu: function() {
      var me = this;
      me.$node.find('.menu-entry_container').removeClass('active');
      me.$node.find('.menu-entry-mask').removeClass('active');
    },
    initCloseMenu: function() {
      var me = this;
      this.$node.find('.menu-entry-mask')
      .off('click')
      .on('click', function() {
        me.closeMenu();
      });
    },
  addHammer: function () {
    //给当前页面div.home-screen绑定一个手势识别，用于切换到哪里版本
    var homeScreen = this.$node.find('.simly-application').get(0);
    var hammerTime = new Hammer(homeScreen),
      me = this;
    hammerTime.on('swiperight', function (e) {
      $('body').removeClass('isSimpleapplication');
      me.nav('/m/home', {
        mode: 'fullpage',
        stay: false
      });
    });
  },
  startCameraStream: function(fn) {
    var me = this;
    server({
      url: '/camera/stream'
    })
    .done(function(res) {
      console.log('开始视频的返回:::', res);
      if (res.data && res.data.status == 0) {
        fn && fn();
      } else {
        noty({
          text: '开启人脸设备失败',
          type: 'error',
          layout: 'top',
          timeout: 3000
        });
      }
    })
    .fail(function(error) {
      var errText = error && error.responseJSON && error.responseJSON.msg || '请再次尝试点击';
      noty({
        text: errText,
        type: 'info',
        layout: 'top',
        timeout: 3000
      });
    });
  },
  // 短轮询,
  shortPollingGetGunAndBulletCount: function() {
    var me = this;
    me.shortTime = setInterval(function() {
      me.getGunNumber();
      me.getBulletCount();
    }, 3000);
    me.getGunNumber();
    me.getBulletCount();
  }
}

_.extend(SimpleApplication.prototype, prototype);
module.exports = SimpleApplication;
