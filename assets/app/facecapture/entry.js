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
var pubsub = require('PubSubJS')
var backBtn = require('backbtn');
var server = require('common/server.js').server;
var Css = require('./index.less');
var flvjs = require('flv.js/dist/flv.min.js');

var Facecapture = function(reg){
    //inject method getIId, inject nav, push,leave
    reg.apply(this);
    log.info('Facecapture has been created');
    return this;
}

_.extend(Facecapture, {
    NS : 'facecapture',
    pub : [

    ],
    sub : []
});

var global_obj = true;

var prototype = {
  init : function (){
    var me = this;
    log.info('init Facecapture entry');
    me.user.getUser()
    .done(function (data) {
      log.debug(data, '%s############################ get current user id #######################%s')
      me.currentUserId = data.id;
    });

    // 进来就加载开启流推送
    me.stopCamera(function () {
      me.startCamera();
    });
  },
  destroy: function(cb){
    var me = this;
    pubsub.unsubscribe('SGS_MESSAGE_RECORD_USER_FACE');
    pubsub.unsubscribe('facePicStream');
    me.faceStopscan();
    me.destoryFlv();
    me.stopCamera();
    cb();
  },
  faceStopscan: function() {
    this.server({
      url: '/face/stopScan',
      method: 'get'
    })
  },
  show : function($node, cb){
    var me = this;
    $node.append(jade());

    $node.find('.status-bar').backBtn('show');

    $node.find('#facecapture-btn').on('click', function() {
      $(this).addClass('disabled');
      me.facecapture();
    });
    
    me.initFaceManage();

    me.flvjsLoad();
    me.disconnect();

    cb();
  },
  facecapture: function() {
    var me = this;
    server({
      url: '/face/record',
      method: 'get',
      beforeSend: function() {
        noty({text: '开始人脸采集', type: 'info', layout: 'top', timeout: 2000});
        $('.loader').removeClass('hide');
        me.$node.find('.faceReadPicture').addClass('hide');
      }
    })
    .done(function(data) {
      me.subscriptFace(data);
    })
    .fail(function(error) {
      me.$node.find('#facecapture-btn').removeClass('disabled');
      var errorObj;
      try {
        errorObj = JSON.parse(error.responseText)
      } catch(e) {
        errorObj = {error: '采集失败'}
      }
      $('.loader').addClass('hide');
      noty({text: errorObj.error, type: 'error', layout: 'top', timeout: 3000});
    })
  },
  subscriptFace: function(data) {
    var me = this;
    var $facePicture = me.$node.find('.faceReadPicture');
    var topic = 'SGS_MESSAGE_RECORD_USER_FACE.' + data.id;
    pubsub.unsubscribe(topic);
    pubsub.subscribe(topic, function(topic, value) {
      pubsub.unsubscribe(topic);
      console.log('##################### SGS_MESSAGE_RECORD_USER_FACE value:', value)
      var status = value.status;
      var imgUrl = '/face/facePic?' + Date.now();
      switch (status) {
        case 0:
          me.showNoty('success', '采集成功');
          me.speak('face1');
          break;
        case 1:
          me.showNoty('error', '采集失败,发生未知错误')
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
      if (status !== 1 && status !== 2) {
        $facePicture.attr('src', imgUrl).removeClass('hide');
      }
      me.$node.find('#facecapture-btn').removeClass('disabled');
    });

    // pubsub.unsubscribe('facePicStream');
    // pubsub.subscribe('facePicStream', function(topic, src) {
    //   console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ facePicStream')
    //   me.createRealFacePic($facePicture, src)
    // });
  },
  createRealFacePic: function($img, src) {
    console.log('This is createRealFacePic function', $img);
    var img = $img.attr('src', src).removeClass('hide');
  },
  showNoty: function(type, text) {
    if (type === 'error') {
      noty({text: text, type: 'error', layout: 'top', timeout: 3000})
    } else {
      noty({text: text, type: 'success', layout: 'topRight', timeout: 3000})
    }
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
  initFaceManage: function() {
    console.log('init face manage function')
    var me = this;
    me.$node.find('#faceManagementBtn').off('click')
    .on('click', function() {
      console.log('This is click faceManagementBtn logs')
      me.toggleFaceManage();
    });
  },
  getFaceList: function(id) {
    var me = this;
    server({
      url: '/face?where={"owner":"' + me.currentUserId + '"}',
      method: 'get'
    })
    .done(function(data) {
      me.updateFaceUI(data);
    })
  },
  updateFaceUI: function(data) {
    var len = data.length;
    var $liDiv = $('<div class="div-li clearfix">');
    var $faceManagement = $('#faceManagement').empty();
    var fragement = $('<div>');
    var $content;
    if (!len) {
      return $faceManagement.append($liDiv.text('当前没有数据'));
    }

    _.each(data, function(item, index) {
      $content = '<div class="div-li clearfix"><span class="mgr30">人脸' + (index + 1) + '</span>' + '<span class="removeBtn btn btn-empty full-right" data-id="' + item.id + '">删除</span></div>';
      fragement.append($content);
    });

    $faceManagement.append(fragement);
    this.onClickRemoveBtn($faceManagement);
  },
  onClickRemoveBtn: function($node) {
    var me = this;
    $node.off('click').on('click', '.removeBtn', function() {
      var $this = $(this);
      var id = $this.data('id');
      me.warnMessage('操作删除人脸信息,是否继续?', function() {
        me.removeFace(id, $this);
      });
    });
  },
  warnMessage: function(text, cb) {
    noty({text: text, type: 'info', layout: 'top',
      timeout: null,
      buttons: [
        {
          addClass: 'btn btn-empty big',
          text: '确定',
          onClick: function ($noty) {
            cb();
            $noty.close();
          }
        },
        {
          addClass: 'btn btn-empty big',
          text: '取消',
          onClick: function ($noty) {
            $noty.close();
          }
        }
      ]
    });
  },
  removeFace: function(id, $currentBtn) {
    var me = this;
    server({
      url: '/face',
      method: 'DELETE',
      data: {id: id}
    })
    .done(function(data) {
      $currentBtn.parent().remove();
    });
  },
  toggleFaceManage: function() {
    var $faceManagement = $('#faceManagement'),
        me = this;

    if ($faceManagement.hasClass('isActive')) {
      me.hideFaceManage($faceManagement);
    } else {
      me.showFaceManage($faceManagement);
    }
  },
  showFaceManage: function($box) {
    this.getFaceList();
    $box.addClass('isActive');
  },
  hideFaceManage: function($box) {
    $box.removeClass('isActive');
  },
  /**
   *  实时视频
   * */ 
  flvjsLoad: function () {
    var me = this;
    var $video = me.$node.find('#videoElement').get(0);

    if (window.flvPlayer !== 'undefined' && window.flvPlayer != null) {
      window.flvPlayer.unload();
      window.flvPlayer.detachMediaElement();
      window.flvPlayer.destroy();
      window.flvPlayer = null;
    }
    
    var host = (window.location.host).split(':')[0];
    window.flvPlayer = flvjs.createPlayer({
      type: 'flv',
      // url: 'http://' + host + ':9989/live.flv',
      url: 'http://127.0.0.1:9999',
      // url: 'http://192.168.1.133:9999',
      isLive: true,
      hasAudio: false,
      hasVideo: true,
    }, {
      isLive: true,
      autoCleanupSourceBuffer: true,
      fixAudioTimestampGap: true,
      enableWorker: true,
      enableStashBuffer: false,
      stashInitialSize: 128, // 减少首桢显示等待时长 
    });
    window.flvPlayer.attachMediaElement($video);
    window.flvPlayer.load();

    if ($video && $video.addEventListener) {
      $video.removeEventListener('loadedmetadata', me.videoPlay);
      $video.addEventListener('loadedmetadata', me.videoPlay);
    }
    window.flvPlayer.on(flvjs.Events.STATISTICS_INFO, me.STATISTICS_INFO_fn);
  },
  STATISTICS_INFO_fn: function (e) {
    if (e.speed > 0) {
      // this.loadCount ++;
      console.log('视频日志: ', e)
      global_obj = false;
    }
  },
  disconnect: function () {
    var me = this;
    me.disconnectTime = setInterval(function () {
      if (!global_obj) {
        return clearInterval(me.disconnectTime);
      };
      // me.flvjsLoad();
      window.flvPlayer.unload();
      window.flvPlayer.load();
      global_obj = true;
    }, 1000);
  },
  flvErrorLog: function (type, str) {
    console.log(type, '###################### 日志: ##################', str);
  },
  videoPlay: function() {
    window.flvPlayer.play().catch(function (e) {
      console.warn('捕获视频流没有或者异常', e);
    });
  },
  destoryFlv: function() {
    if (this.disconnectTime) {
      clearInterval(this.disconnectTime);
    }
    global_obj = true;
    var flvPlayer = window.flvPlayer;
    if (flvPlayer) {
      flvPlayer.unload();
      flvPlayer.detachMediaElement();
      flvPlayer.destroy();
      window.flvPlayer = null;
    }
  },
  startCamera: function() {
    var me = this;
    me.$node.find('.loading-box').removeClass('hide');
    me.$node.find('.loading-box .loader').removeClass('hide');
    me.$node.find('.loading-box span').text('正在加载');
    server({
      url: '/camera/stream'
    })
    .done(function(res) {
      if (res && res.data && res.data.status == 0) {
        me.$node.find('.loading-box').addClass('hide');
      } else {
        me.$node.find('.loading-box .loader').addClass('hide');
        me.$node.find('.loading-box span').text('摄像头开启失败');
      }
    })
    .fail(function(err) {
      var errText = err.responseJSON && err.responseJSON.msg || '摄像头开启失败';
      me.$node.find('.loading-box .loader').addClass('hide');
      me.$node.find('.loading-box span').text(errText);
      me.showNoty('error', errText);
    });
  },
  stopCamera: function(fn) {
    var me = this;
    server({
      url: '/camera/stop'
    })
    .always(function() {
      (typeof fn === 'function') && fn();
    });
  },
}

_.extend(Facecapture.prototype, prototype);

module.exports = Facecapture;

/**
  UserfingerprintRecord js
*/
