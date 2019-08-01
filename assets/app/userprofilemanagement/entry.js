/**
User Profile Entry.js
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var Swiper = require('Swiper/dist/js/swiper.js');
var swipercss = require('Swiper/dist/css/swiper.css');

var jade = require("./index.jade");
var css = require("../common/less/base.less");
require("./less/index.less");

var easyClock = require('easy-clock');

var statusBar = require('statusbar');

var actionBar = require('actionbar');

var backBtn = require('backbtn');

var i18n = require('locales/zh-CN.json');

var UserProfile = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('UserProfile has been created');
  return this;
}

_.extend(UserProfile, {
  NS : 'userprofile',
  pub : [

  ],
  sub : []
});

var allItems = [
  { name: 'userprofileeditor', label: '修改资料', img: require('./img/userprofile_100.png'), sources: 'remote' },
  { name: 'userfingerprintrecord', label: '采集指纹', img: require('./img/fingerprintscan_100.png'), sources: 'local' },
  { name: 'userpassworeditor', label: '修改密码', img: require('./img/password_100.png'), sources: ['local', 'remote'] },
  { name: 'face', label: '采集人脸', img: require('./img/face.png'), sources: ['local', 'remote'] },
  // { name: 'iris', label: '虹膜采集', img: require('./img/iris.png'), sources: ['local'] }
];

var prototype = {
  init : function (){
    log.info('init UserProfile entry');
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  start : function($node, cb, user){
    var me = this;
    if(!user){
      cb && cb();
      me.nav('/m/login');
    }

    var isLocal = true;

    var items = _.filter(allItems, function(item){
      var sources = typeof item.sources === 'string' ? [item.sources] : item.sources;
      var isMeetSourcePolicy = (!sources || _.some(sources, function(source){
        return isLocal;
      }));
      var permissions = typeof item.permissions === 'string' ? [item.permissions] : item.permissions;
      var isPermit = (!permissions || _.some(permissions, function(permission){
        return me.user.hasPermission(permission);
      }));

      return isMeetSourcePolicy && isPermit;
    })

    // create html frame
    $node.append(jade({
        i18n: i18n,
        user: user,
        roles : user.roles,
        username : user.username,
        items : items
      }
    ));

    // put modules to frame
    $node.find('.comp-clock').easyClock();
    $node.find('.status-bar').backBtn('show', function(){
      if($('body').hasClass('isSimpleapplication')){
        me.nav('/m/simpleapplication');
      }else{
        me.nav('/m/userhome');
      }
    });
    $node.find('.action-bar').actionBar('show');

    //map events
    $node.on('click', '.menu-btn', function(e){
      var map = {
        userprofileeditor : function(){
          me.nav('/m/userprofileeditor');
        },
        userfingerprintrecord : function(){
          me.nav('/m/userfingerprintrecord');
        },
        userpassworeditor : function(){
          me.nav('/m/userpassworeditor');
        },
        userhome : function(){
          me.nav('/m/userhome');
        },
        face: function() {
          me.nav('/m/facecapture');
        }
      };
      var target = $(this).attr('name');
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
    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('.big-btn-cont'), ['waves-block']);
    // waves.init();

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
      coverflow: {
        rotate: 5,
        stretch: 0,
        depth: 10,
        modifier: 4,
        slideShadows : true
      }
    });
  },
  show : function($node, cb){
    var me = this;
    me.user.getUser()
    .then(function(user){
      me.start($node, cb, user)
    })
    .fail(function(){
      me.nav('/m/login')
    })
  }
}

_.extend(UserProfile.prototype, prototype);
module.exports = UserProfile;
