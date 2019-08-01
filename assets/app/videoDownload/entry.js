'use strict';

var paging = require('paging');
var gridlist = require('gridlist');
var Jade = require('./index.jade');
var gridCell = require('./gridCell.jade');
var flexModal = require('flexmodal');
var videoPlayer = require('./videoPlayer.jade');
var moment = require('moment');
var noty = require('customnoty');
var datepicker = require('datetimepicker');
var less = require('./index.less');

var VideoDownload = function(reg) {
  reg.apply(this);
  return this;
}

_.extend(VideoDownload, {
  NS: 'videoDownload',
  noAuth: true,
  pub : [

  ],
  sub : []
});

var prototype = {
  init: function() {
  },
  show: function($node, cb) {
    var me = this;
    $node.append(Jade);
    
    // 获取视频列表
    me.fetchVideoList();
    // 初始化分页
    me.initPagin();
    me.onClickBtn();

    cb();
  },
  initPagin: function() {
    var me = this;
    var $listNode = me.$node.find('.list-cont');
    var $pageContainer = me.$node.find('.pageContainer');

    $pageContainer.paging('show');

    me.$node
    .find('.nav')
    .off('click', '.btn')
    .on('click', '.btn', function() {
      var map = {
        prev: function() {
          $listNode.gridlist('prev');
        },
        next: function() {
          $listNode.gridlist('next');
        },
        refresh: function () {
          $listNode.gridlist('refresh');
        },
        filter: function() {
          me.filterFlexModal();
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });
  },
  filterVideoList: function (start, end) {
    var url = '/asset/list?type=video';

    if (start && end) {
      url = url + '&start=' + start + '&end=' + end;
    }

    this.$node.find('.list-cont').gridlist('fetch', null, null, null, null, url, true);
  },
  fetchVideoList: function() {
    var me = this;
    var $listNode = me.$node.find('.list-cont');
    var $pageContainer = me.$node.find('.pageContainer');

    $listNode
    .gridlist({
      source: {
        url: '/asset/list?type=video'
      },
      innerTpl: function (data) {
        var sourceData = data;
        _.merge(sourceData, {
          moment: moment
        })
        return gridCell(sourceData);
      }
    }).gridlist('show');

    $listNode
    .off('onNext')
    .on('onNext', function (e, skip, total, limit) {
      $pageContainer.paging('next', skip, total, limit);
    })
    .off('onPrev')
    .on('onPrev', function(e, skip, total, limit) {
      $pageContainer.paging('prev', skip, total, limit);
    })
    .off('gridlist.afterTotalChange')
    .on('gridlist.afterTotalChange', function(event, total, limit, skip) {
      $pageContainer.paging('refresh', skip, total, limit);
    });
  },
  onClickBtn: function() {
    var me = this;
    var $node = me.$node;

    this.$node.find('.list-cont')
    .on('click', '.btn', function(e) {
      var $target = $(e.target);
      var id = $target.data('id');
      if ($target.hasClass('lookVideoBtn')) {
        var $screen = $node.find('.videDownloadScreen');
        var $modal = $('<div/>').appendTo($screen)
        .flexmodal()
        .on('shown.bs.modal'/*Bootstrap event*/, function(e){
          var $videoNode = $(e.target);
          var $video = $videoNode.find('.video-cont');
          $video.html(videoPlayer({
            data : {
              id: id
            }
          }));
        })
        .on('hide.bs.modal'/*Bootstrap event*/, function(e){
          var $videoNode = $(e.target);
          $videoNode.find('.video-cont').empty();
        });
        $modal
        .flexmodal('show',
          {
            modalTitle : '查看视频记录日志'
          },
          require('./videoCont.jade')
        );
      }
    });
  },
  filterFlexModal: function(orgId) {
    var $node = this.$node,
        me = this,
        $modal = $('<div id="fetchLogFlexModal">').appendTo('.videDownloadScreen');
    $modal.flexmodal({
      IsSureBtn: true,
      modalBackdropRemove: true,
      innerTpl: require('./asyncLog.jade'),
    })
    .off('show.bs.modal')
    .on('show.bs.modal', function(e) {
      $node.find('.asyncDate .dateInput')
      .off('click')
      .on('click', function () {
        me.openSelectedDate($(this));
      });
    })
    .off('onOk')
    .on('onOk', function(e) {
      var start = $modal.find('#start').val();
      var end = $modal.find('#end').val();
      console.log('开始时间， 结束时间', start, end);
      me.filterVideo(start, end);
      $modal.flexmodal('modalHide');
    }).flexmodal('show', {
      modalTitle: '请填写日期'
    });    
  },
  openSelectedDate: function($input) {
    var $node = this.$node,
        me = this,
        $modal = $('<div id="dateFlexmodal">').appendTo('.videDownloadScreen');
    $modal.flexmodal({
      IsSureBtn: true,
    })
    .on('show.bs.modal', function(e) {
      var $timeBox = $node.find('.time-box');
      $timeBox.datetimepicker({
        locale: 'zh-CN',
        format: 'YYYY-MM-DD HH:mm',
        sideBySide: true,
        inline: true
      });
    })
    .on('onOk', function(e) {
      var timeValue = $modal.find('.time-box').data().date;
      $input.val(timeValue);
      $modal.flexmodal('modalHide');
    }).flexmodal('show', {
      modalTitle: '请选择日期'
    });
  },
  // 过滤视频
  filterVideo: function(start, end) {
    if (start && end && (new Date(start)  > new Date(end))) {
      noty({text: '开始时间不能比结束时间大', type: 'error', layout: 'top', timeout: 2000});
    }
    console.log('开始时间:' + start + ', 结束时间:' + end);
    this.filterVideoList(start, end);
  },
  destroy: function(cb) {
    cb();
  }
}

_.extend(VideoDownload.prototype, prototype);

module.exports = VideoDownload;