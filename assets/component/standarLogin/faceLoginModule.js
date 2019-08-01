'use strict';

var jade = require('./tmp/face.jade');
var ejp = require('easy-jq-plugin');
var server = require('common/server.js').server;
var pubsub = require('PubSubJS');
var audio = require('common/audio.js');
var noty = require('customnoty');
var userManage = require("common/usermanagement");
require('./less/face.less');
var flvjs = require('flv.js/dist/flv.min.js');

var faceLoginModule = function (element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version: '0.0.1',
  name: 'faceLoginModule'
};

var global_obj = true;

var prototype = {
  render: function (config) {
    var me = this;
    var $node = me.$node;

    $node.html(jade());

    me.config = config;
    me.isAdminAuth = config.isAdmin;
    me.isLoginManagePage = config.isLoginManagePage;
    
    // 开始直播成功后开启人脸验证
    // me.stopCamera(function () {
    // });
    me.startCamera();

    // 初始化flv
    me.flvjsLoad();

    // 不停的尝试连接
    me.disconnect();
    
    $node.find('#restartFaceAuth')
    .off('click')
    .on('click', function() {
      me.initFaceAuth();
      // me.startCamera();
      // me.stopCamera(function () {
      // });
    });

    return $node;
  },
  resetLoadFlv: function() {
    console.log('根据后台推送进行重新初始化视频')
    var me = this;
    me.flvjsLoad();
    me.disconnect();
  },
  initFaceAuth: function () {
    var me = this;
    me.onRecordStatus();
    me.onAuthResult();
    me.startFaceAuth();
  },
  returnAdminFaceAuthConfig: function() {
    return this.config.face.adminAjaxConfig;
  },
  returnUserFaceAuthConfig: function() {
    return {
      url: '/face/_auth'
    };
  },
  flvjsLoad: function() {
    var me = this;
    // var $video = document.getElementById('videoElement');
    var $video = me.$node.find('#videoElement').get(0);
    $video.createPlayer
    console.log('初始化flvjsLoad');

    if (window.flvPlayer !== 'undefined' && window.flvPlayer != null) {
      window.flvPlayer.unload();
      window.flvPlayer.detachMediaElement();
      window.flvPlayer.destroy();
      // window.flvPlayer.off(flvjs.Events.STATISTICS_INFO, me.STATISTICS_INFO_fn)
      window.flvPlayer = null;
    } 

    window.flvPlayer = flvjs.createPlayer({
      type: 'flv',
      // url: 'http://' + host + ':9989/live.flv',
      url: 'http://127.0.0.1:9999',
      isLive: true,
      hasAudio: false,
      hasVideo: true,
    }, {
      isLive: true,
      autoCleanupSourceBuffer: true,
      fixAudioTimestampGap: false,
      enableWorker: true,
      enableStashBuffer: false,
      stashInitialSize: 128, // 减少首桢显示等待时长 
    });
    $video.currentTime = 1.5;
    window.flvPlayer.attachMediaElement($video);
    window.flvPlayer.load();

    if ($video && $video.addEventListener) {
      $video.removeEventListener('loadedmetadata', me.videoPlay);
      $video.addEventListener('loadedmetadata', me.videoPlay);
    }

    window.flvPlayer.on(flvjs.Events.STATISTICS_INFO, me.STATISTICS_INFO_fn);
  },
  STATISTICS_INFO_fn: function(e) {
    if (e.speed > 0) {
      // this.loadCount ++;
      console.log('视频日志: ', e)
      global_obj = false;
    }
  },
  disconnect: function() {
    var me = this;
    me.disconnectTime = setInterval(function() {
      if (!global_obj) {
        return clearInterval(me.disconnectTime);
      };
      // me.flvjsLoad();
      window.flvPlayer.unload();
      window.flvPlayer.load();
      global_obj = true;
    }, 1000);
  },
  videoPlay: function(e) {
    window.flvPlayer.play().catch(function(e) {
      console.warn('捕获视频流没有或者异常', e);
    });
  },
  destoryFlv: function() {
    var flvPlayer = window.flvPlayer;
    var me = this;
    if (flvPlayer) {
      flvPlayer.unload();
      flvPlayer.detachMediaElement();
      flvPlayer.destroy();
      window.flvPlayer = null;
    }
    if (me.disconnectTime) {
      clearInterval(me.disconnectTime);
    }
  },
  startCamera: function() {
    var me = this;
    me.$node.find('.loading-box span').text('正在加载中');
    me.$node.find('.loading-box .loading').removeClass('hide');
    me.$node.find('.loading-box').show();
    me.$node
    server({
      url: '/camera/stream'
    })
    .done(function(res) {
      me.clearTimeoutCallback();
      if (res && res.data && res.data.status == 0) {
        // me.initFaceAuth();
        me.initFaceAuthTime = setTimeout(function () {
          // 开始人脸验证
          me.initFaceAuth();
        }, 2000);
        me.$node.find('.loading-box').hide();
      } else {
        me.showNoty('error', '摄像头开启失败');
        me.$node.find('.loading-box .loading').addClass('hide');
        me.$node.find('.loading-box span').text('摄像头开启失败,退出重试');
      }
    })
    .fail(function(err) {
      var errText = err.responseJSON && err.responseJSON.msg || '摄像头开启失败';
      me.$node.find('.loading-box .loading').addClass('hide');
      me.$node.find('.loading-box span').text(errText + ', 退出重试');
      me.showNoty('error', errText);
    });
  },
  clearTimeoutCallback: function() {
    var me = this;
    if (me.flvjsLoadTime) {
      clearTimeout(me.flvjsLoadTime);
    }

    if (me.initFaceAuthTime) {
      clearTimeout(me.initFaceAuthTime);
    }
  },
  stopCamera: function(fn) {
    var me = this;
    server({
      url: '/camera/stop'
    })
    .done(function() {
      pubsub.publish('CAMERA_STOP', true);
    })
    .fail(function() {
      pubsub.publish('CAMERA_STOP', false);
    })
    .always(function () {
      (typeof fn === 'function') && fn();
    });
  },
  startFaceAuth: function() {
    var me = this;
    me.hideRestartBtn();
    me.restartRenderVideo();

    var ajaxConfig = me.isAdminAuth ? me.returnAdminFaceAuthConfig() : me.returnUserFaceAuthConfig();

    server(ajaxConfig)
    .done(function() {
      me.speak('faceAuth');
    })
    .fail(function(err) {
      var errText = err && err.responseJSON && err.responseJSON.error || '开启人脸验证失败';
      me.showNoty('error', errText);
      me.triggerFailed();
      me.showRestartBtn();
    });
  },
  onRecordStatus: function() {
    var me = this;
    pubsub.unsubscribe('SGS_MESSAGE_SCAN_USER_FACE');
    pubsub.subscribe('SGS_MESSAGE_SCAN_USER_FACE', function (topic, value) {
      pubsub.unsubscribe('SGS_MESSAGE_SCAN_USER_FACE');
      console.log('on standarLogin faceLogin.js, 人脸扫描返回的状态', value);
      var status = value.status;
      switch (status) {
        case 0:
          me.showNoty('success', '采集成功, 开始比对请等待！');
          me.$node.find('.tips').removeClass('hide');
          me.speak('face1');
          break;
        case 1:
          me.showNoty('error', '采集失败,发生未知错误, 请到系统设置里重启应用');
          me.speak('face2');
          break;
        case 2:
          me.showNoty('error', '采集失败,摄像头内没有人脸')
          me.speak('face3');
          break;
        case 3:
          me.showNoty('error', '采集失败,人脸光线太暗,建议增加光线')
          me.speak('face4');
          break;
        case 4:
          me.showNoty('error', '采集失败,人脸太模糊,请保持头部静止')
          me.speak('face5');
          break;
        case 5:
          me.showNoty('error', '采集失败,人脸旋转角度太大,请正对屏幕')
          me.speak('face6');
          break;
        case 6:
          me.showNoty('error', '采集失败,人脸特征不清楚，请保持面部整洁')
          me.speak('face7');
          break;
      }
      // 非未状态为(1 | 2)展示图片
      if (status != 1 && status != 2) {
        me.renderVideo();
      }
      if (status !== 0) {
        me.triggerFailed();
        me.showRestartBtn();
      }
    });
  },
  onAuthResult: function () {
    var me = this;
    var TOPIC = me.isAdminAuth ? 'adminauthbyface' : 'SGS_MESSAGE_AUTHEN_FACE';

    pubsub.unsubscribe(TOPIC);
    pubsub.subscribe(TOPIC, function (topic, value) {
      pubsub.unsubscribe(TOPIC);
      console.log('on standarLogin faceLogin.js, 监听到人脸验证信息: ', value, topic);
      var user = value && value.user || (value && value.userId ? value.userId : null);
      if (user) {
        if (!me.isAdminAuth) {
          console.log('用户的token信息，进行user/me请求', user, user.token)
          userManage.getUserByToken(user.token, me.isLoginManagePage)
          .done(function(data) {
            me.authSuccessHandle(data);
          })
          .fail(function(error) {
            me.authFailedHandle(error);
          });
        } else {
          me.authSuccessHandle(value);
        }
      } else {
        me.authFailedHandle(value);
      }
    });
  },
  // user不存在的验证
  authFailedHandle: function(data) {
    console.log('人脸验证失败处理函数: ', data);
    var me = this;
    var errorText = '用户验证失败';
    
    if (data && data.error) {
      console.log('人脸验证失败: data.error', data.error);
      errorText = data.error.error ? data.error.error : data.error;
    }
    
    if (data && data.info) {
      errorText = data.info;
    }

    me.showNoty('error', errorText);
    me.speak('face_error');
    me.triggerFailed();
    me.showRestartBtn();

  },
  // user存在的情况
  authSuccessHandle: function(user) {
    var me = this;
    // 人脸验证成功, 关闭实时视频
    // this.stopCamera();
    this.destroy();
    me.$node.trigger('FACE_AUTH_SUCCESS', user);
    // me.stopCamera(function() {
    // });
  },
  triggerFailed: function () {
    var me = this;
    me.$node.trigger('FACE_AUTH_FAILED');
    // me.stopCamera(function() {
    // })
  },
  speak: function(key, keepKey) {
    audio.play(key, keepKey);
  },
  showRestartBtn: function() {
    this.$node.find('#restartFaceAuth').removeClass('hide');
    this.$node.find('.tips').addClass('hide');
  },
  hideRestartBtn: function() {
    this.$node.find('#restartFaceAuth').addClass('hide');
    this.$node.find('.tips').addClass('hide');
  },
  renderVideo: function() {
    var me = this;
    var $node = me.$node;
    var url = '/face/facePic?v=' + Date.now();
  },
  restartRenderVideo: function() {
  },
  showNoty: function(type, message) {
    if (type === 'success') {
      noty({text: message, type: type, layout: 'topRight', timeout: 2000});
    } else if(type === 'error') {
      noty({text: message, type: type, layout: 'top', timeout: 1000});
    } else {
      noty({text: message, type: 'info', layout: 'topRight', timeout: 2000});
    }
  },
  destroy: function () {
    this.destoryFlv();
    this.clearTimeoutCallback();
    global_obj = true;
    pubsub.unsubscribe('SGS_MESSAGE_SCAN_USER_FACE');
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_FACE');
    pubsub.unsubscribe('adminauthbyface');
    pubsub.unsubscribe('node_stop');
    pubsub.unsubscribe('alert_fail');
    console.log('############ 销毁人脸验证 #############');
  }
};

module.exports = ejp.pluginize(faceLoginModule, metadata, prototype);