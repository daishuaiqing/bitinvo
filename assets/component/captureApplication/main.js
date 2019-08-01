'use strict';

var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var pubsub = require('PubSubJS');
var noty = require('customnoty');

var CaptureApplication = function(element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version: '0.0.1',
  name: 'captureApplication'
};

var prototype = {
  init: function(options) {
    var me = this;
    var $node = me.$node;
    me.appId = options.appId;
    me.token = options.token;

    $node.html(tpl);
    
    $node.find('.add-capture_btn')
    .off('click')
    .on('click', function() {
      if (me.startCapture) {
        return noty({text: '正在拍摄中,请等待!', type: 'info', layout: 'topRight', timeout: 3000});
      }
      $(this).find('.plus_icon').addClass('loader');
      me.capture();
    });

    $node.find('.captureApplication_cp').off('click')
    .on('click', '.retry-btn', function(e) {
      console.log('点击了删除按钮');
      noty({text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
        timeout: null,
        buttons: [
          {
            addClass: 'btn btn-empty big',
            text: '确定',
            onClick: function ($noty) {
              me.removePic($(e.target));
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
    });

    return this;
  },
  removePic: function($cell) {
    var $box = $cell.parent();
    var id = $box.data('id');
    var me = this;
    $.ajax({
      url: '/asset/applicationAssets/' + id,
      type: 'DELETE',
      beforeSend: function(xhr) {
        if (me.token) {
          xhr.setRequestHeader('Authorization', 'Token ' + btoa(me.token));
        }
      }
    })
    .done(function() {
      noty({text: '删除成功!', type: 'success', layout: 'top', timeout: 3000});
      $box.remove();
      me.checkedHasFile();
    })
    .fail(function(){
      noty({text: '删除操作失败!', type: 'error', layout: 'top', timeout: 3000});
    });
  },
  capture: function(retry) {
    var me = this;
    me.startCapture = true;
    $.ajax({
      url: '/camera/captureapplication',
      type: 'post',
      data: {applicationId: me.appId, retry: retry},
      beforeSend: function(xhr) {
        xhr.setRequestHeader('asLocal', true);
        if (me.token) {
          xhr.setRequestHeader('Authorization', 'Token ' + btoa(me.token));
        }
      }
    })
    .done(function(data) {
      me.onCapture();
      me.$node.trigger('startCapture');
      
      // setTimeout(function() {
      //   pubsub.publish('ApplicationCapture', {
      //     status: 'success',
      //     testSrc: 'http://192.168.1.29/asset/image/ac691c15-04cf-47b9-8212-df4589fada88'
      //   })        
      // }, 2000);
    })
    .fail(function(error) {
      noty({text: '扫描失败!', type: 'error', layout: 'top', timeout: 3000});
    });
  },
  onCapture: function() {
    var $node = this.$node;
    var me = this;
    noty({text: '正在扫描中,请等待！', type: 'info', layout: 'topRight', timeout: 4000});

    pubsub.unsubscribe('ApplicationCapture');
    pubsub.subscribe('ApplicationCapture', function(topic, message) {
      pubsub.unsubscribe('ApplicationCapture');

      if (message.status === 'success') {
        console.log('subscribe success: ', message);
        noty({text: '扫描成功', type: 'success', layout: 'topRight', timeout: 3000});
        me.successCreatedPic(message);
      } else if (message.status === 'failed') {
        noty({text: message.info, type: 'error', layout: 'top', timeout: 3000});
        me.$node.trigger('captureError');
      }
      $node.find('.add-capture_btn').find('.plus_icon').removeClass('loader');
      me.startCapture = false;
    });
  },
  successCreatedPic: function(value) {
    var $main = this.$node.find('.captureApplication_cp');
    var $img = $('<img />')
    var $li = $('<li class="section-box" />');
    var $btn = $('<div class="retry-btn"/>');
    var imageId = value.imageId;
    var imgSrc;

    if (imageId) {
      imgSrc = '/asset/image/' + imageId;
      $li.data('imageId', imageId);
    } else if (value.testSrc) {
      imgSrc = value.testSrc;
    }

    $btn.text('删除');
    $img.attr('src', imgSrc);
    $li.append($btn).data('id', imageId);
    this.$node.find('.add-capture_btn').before($li.append($img));
    this.$node.trigger('captureSuccess', imgSrc);
  },
  checkedHasFile: function() {
    var $section = this.$node.find('.section-box');
    if ($section.length === 1) {
      this.$node.trigger('not_found_file');
    }
  }
}

module.exports = ejp.pluginize(CaptureApplication, metadata, prototype);