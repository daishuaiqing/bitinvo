'user strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var jsmpeg = require('./jsmpeg.min.js');
var Monitor = function (element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version: '0.0.1',
  name: 'monitor',
  events: {}
};

var prototype = {
  init: function(options) {
    var me = this;
    var ip = window.location.host.split(':')[0];
    me.url = options && options.url || 'ws://' + ip + ':8082/';
    console.log('########## 监控视频地址 #########################', me.url);
    me.cabinetId = '';
    me.$node.empty().append(tpl).hide();
    var css = options && options.css;
    var uid = options && options.uid || (new Date().getTime());
    var canvas = me.$node.find('#videoCanvas').get(0);

    if (css) {
      me.$node.find('.monitor-component').css(css);
    }

    if (me.player) {
      try {
        me.player.destroy();
      } catch(e) {
        console.log('############## me.player不存在 ##########');
      }
    }
    if (window['PLAYER' + uid]) {
      // me.player = window.PLAYER;
      try {
        window['PLAYER' + uid].destroy();
      } catch(e) {
        
      }
    }
    console.log('####### 建立jsmpeg连接 ###########', canvas);
    console.log(jsmpeg.Player);
    me.player = new jsmpeg.Player(me.url, {canvas: canvas});
    window['PLAYER' + uid] = me.player;
    me.$node.find('.close-button')
    .off('click')
    .on('click', function() {
      me.close();
    });
    return this;
  },
  requestWebcam: function(status, cb) {
    var me = this;
    if (!me.cabinetId) {
      return console.log('没有获取到Cabient ID');
    }
    $.ajax({
      url: '/cabinet/webcam',
      type: 'PUT',
      data: { status: status, cabinetId: me.cabinetId }
    })
    .done(function(data) {
      cb && cb();
      console.log('改变摄像头状态成功', data);
    })
    .fail(function(error) {
      console.log('改变摄像头状态失败', error);
    });
  },
  closeWebCam: function(id, fn) {
    var me = this;
    me.cabinetId = id;
    me.requestWebcam('close', function() {
      fn && fn();
    });
  },
  open: function(id) {
    var me = this;
    me.cabinetId = id;
    me.requestWebcam('close', function() {
      me.requestWebcam('open', function () {
        me.$node.show();
      });
    });
  },
  close: function() {
    var me = this;
    console.log('######### monitor close ###################')
    me.requestWebcam('close', function() {
      me.$node.hide().first().remove();
      me.isClose = true;
      if (me.player) {
        console.log('monitor destroy', me.player.destroy)
        me.player.destroy();
        me.player = null;
      }
    });
  },
  isClose: false
};

module.exports = ejp.pluginize(Monitor, metadata, prototype);
