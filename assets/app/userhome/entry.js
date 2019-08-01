/**
User Home Entry.js
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var Swiper = require('Swiper/dist/js/swiper.js');
var swipercss = require('Swiper/dist/css/swiper.css');

var home = require("./default.jade");

var css = require("../common/less/base.less");
require("./less/index.less");

var easyClock = require('easy-clock');

var statusBar = require('statusbar');

var actionBar = require('actionbar');

// var i18n = require('locales/zh-CN.json');

var noty = require('customnoty');

var UserHome = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('UserHome has been created');
  return this;
}

_.extend(UserHome, {
  NS : 'userhome',
  pub : [

  ],
  sub : []
});

/**
  sources : 访问的来源, local, remote
  permissions : 对应permission, 默认是空， 所有人访问
*/

var prototype = {

  onTransition: false,
  currentIndex: 0,
  init : function (){
    log.info('init UserHome entry');
  },
  start : function($node, cb, user){
    var me = this;
    // create html frame
    var isLocal = !$('html').hasClass('remote');

    var allItems = [
      {
        name: 'reportCenter',
        label: __('userhome').reportcenter,
        img: require('./img/report_100.png'),
        sources: ['local', 'remote'],
        permissions: ['view-report', 'manage-cabinet']
      },
      {
        name: 'userApplicationManagement',
        label: __('userhome').userapplicationmanagement,
        img: require('./img/userapplication_100.png'),
        sources: ['local', 'remote']
      },
      {
        name: 'applicationManagement',
        label: __('userhome').applicationmanagement,
        img: require('./img/applicationmanagement_100.png'),
        sources: ['local', 'remote'],
        permissions: ['view-app', 'manage-cabinet']
      },
      {
        name: 'orgManagement',
        label: __('userhome').orgmanagement,
        img: require('./img/org_100.png'),
        sources: ['remote', 'local'],
        permissions: 'manage-cabinet'
      },
      {
        name: 'userManagement',
        label: __('userhome').usermanagement,
        img: require('./img/users_100.png'),
        sources: ['remote', 'local'],
        permissions: 'manage-cabinet'
      },
      {
        name: 'gunManagement',
        label: __('userhome').gunmanagement,
        img: require('./img/gun_100.png'),
        sources: ['remote', 'local'],
        permissions: 'manage-cabinet'
      },
      {
        name: 'bulletTypeManagement',
        label: __('userhome').bullettypemanagement,
        img: require('./img/bullet_100.png'),
        sources: ['remote', 'local'],
        permissions: 'manage-cabinet'
      },
      {
        name: 'safeboxManagement',
        label: __('userhome').cabinetmanagement,
        img: require('./img/safebox_100.png'),
        sources: ['remote', 'local'],
        permissions: 'manage-cabinet'
      },
      {
        name: 'systemManagement',
        label: __('userhome').systemmanagement,
        img: require('./img/gear_100.png'),
        sources: ['remote', 'local'],
        permissions: 'manage-cabinet'
      },
      {
        name: 'messageManagement',
        label: __('userhome').messagemanagement,
        img: require('./img/message_100.png'),
        sources: ['remote', 'local']
      },
      {
        name: 'cabinetStatusManagement',
        label: __('userhome').cabinetStatusManagement,
        img: require('./img/safebox_100.png'),
        sources: ['remote', 'local'],
        permissions: 'manage-cabinet'
      },
      {
        name: 'openDoor',
        label: __('userhome').openDoor,
        img: require('./img/safebox_100.png'),
        sources: ['local', 'remote'],
        permissions: ['view-report', 'manage-cabinet']
      }
    ];

    // 判断是否要报表中心
    if (!this.checkIsShowGunBulletCountPanel()) {
      allItems = _.filter(allItems, function(item) {
        if (item.name === 'reportCenter') {
          return false;
        } else {
          return true;
        }
      });
    }

    if (!me.checkedShowGateSwitch()) {
      allItems = _.filter(allItems, function(item) {
        if (item.name === 'openDoor') {
          return false;
        } else {
          return true;
        }
      });
    }

    log.info('UserHome check permissions');
    var items = _.filter(allItems, function(item){
      var sources = typeof item.sources === 'string' ? [item.sources] : item.sources;
      var isMeetSourcePolicy = (!sources || _.some(sources, function(source){
        return source === (isLocal ? 'local' : 'remote');
      }));
      var permissions = typeof item.permissions === 'string' ? [item.permissions] : item.permissions;
      var isPermit = (!permissions || _.some(permissions, function(permission){
        return me.user.hasPermission(permission);
      }));
      return isMeetSourcePolicy && isPermit;
    })
    $node.append(
      home({
        i18n: __('userhome'),
        username : user.username,
        user : user,
        items : items
      }
    ));

    // put modules to frame
    $node.find('.userhome-com-clock-box').easyClock('start');
    $node.find('.userhome-status-bar').statusBar('show', false);
    $node.find('.userhome-action-bar').actionBar('show');

    //map events
    $node.on('click', '.menu-btn', function(e){
      if(me.onTransition) return;
      var map = {
        reportCenter: function(){
          me.nav('/m/reportcenter');
          // me.nav('/m/info');
        },
        applicationManagement: function(){
          me.nav('/m/applicationmanagement');
        },
        orgManagement: function(){
          me.nav('/m/orgmanagement');
        },
        userManagement: function(){
          me.nav('/m/usermanagement');
        },
        gunManagement: function(){
          me.nav('/m/gunmanagement');
        },
        bulletTypeManagement: function(){
          me.nav('/m/bullettypemanagement');
        },
        safeboxManagement: function(){
          me.nav('/m/cabinetmanagement');
        },
        systemManagement: function(){
          me.nav('/m/systemmanagement');
          // me.nav('/m/info');
        },
        createApplication: function(){
          me.nav('/m/createapplication');
        },
        userApplicationManagement : function(){
          me.nav('/m/userapplicationmanagement');
        },
        messageManagement: function(){
          me.nav('/m/messagemanagement');
        },
        cabinetStatusManagement: function() {
          me.nav('/m/cabinetStatusManagement');
        },
        openDoor: function() {
          me.openDoor(user);
        }
      };
      var target = $(e.currentTarget).attr('name');
      map[target] && map[target].call(me);
    })
    .on('click', '.action-btn', function(e){
      var map = {
        modifyProfile : function(){
          me.nav('/m/userprofilemanagement');
        }
      };
      var target = $(this).attr('id');
      map[target] && map[target].call(me);
    });

    cb();
    var swiper = new Swiper($node.find('.swiper-container'), {
      pagination: '.swiper-pagination',
      effect: 'coverflow',
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 'auto',
      paginationClickable: true,
      nextButton: '.swiper-button-next',
      prevButton: '.swiper-button-prev',
      initialSlide : localStorage.currentIndex || 0,
      freeMode: false,
      freeModeMomentum: true,
      slideToClickedSlide:true,
      watchSlidesProgress:true,
      touchMoveStopPropagation : true,
      coverflow: {
        rotate: 5,
        stretch: 0,
        depth: 10,
        modifier: 4,
        slideShadows : true
      },
      // pagination: '.swiper-pagination',
      paginationBulletRender: function (index, className) {
        // return '<span class="' + className + '">' + (index + 1) + '</span>';
        return '<span class="' + className + '"></span>';
      },
      hashnav: false,
      onTransitionStart : function(swiper){
        log.debug('onTransitionStart');
        localStorage.currentIndex = swiper.activeIndex;
      },
      onTransitionEnd : function(swiper){
        log.debug('onTransitionEnd');
      },
      onSlideChangeStart : function(swiper){
        log.debug('onSlideChangeStart');
        // me.onTransition = true;
      },
      onSlideChangeEnd : function(swiper){
        log.debug('onSlideChangeEnd');
        // me.onTransition = false;
      },
    });
  },
  openDoor: function(user) {
    this.server({
      url: '/cabinetmodule/opengate',
      method: 'post',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(user.token));
      },
      data: {
        username: user.username,
        userId: user.id,
        alias: user.alias
      }
    })
    .done(function(data) {
      noty({text: '库房门已打开', type: 'success', layout: 'topRight', timeout: 3000});
    })
    .fail(function(error) {
      noty({text: '库房门打开操作失败', type: 'error', layout: 'top', timeout: 3000});
    });
  },
  checkedShowGateSwitch: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      try {
        setting = JSON.parse(setting);
        return setting.showGateSwitch;
      } catch(e) {
        return false;
      }
    } else {
      return false;
    }
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  checkIsShowGunBulletCountPanel: function() {
    var isShow = false;
    var systemSetData = window.localStorage.getItem('systemSetData');
    if (systemSetData) {
      try {
        systemSetData = JSON.parse(systemSetData);
        if (systemSetData && systemSetData.showCount) {
          isShow = true;
        } else {
          isShow = false;
        }
      } catch(e) {
        isShow = false;
      }
    };
    return isShow;
  },
  show : function($node, cb){
    var me = this;
    var user = me.user.getUser();

    user.done(function(user){
      me.start($node, cb, user);
    })
    .fail(function(){
      cb && cb();
      me.nav('/m/login');
    });
  }
}

_.extend(UserHome.prototype, prototype);
module.exports = UserHome;
