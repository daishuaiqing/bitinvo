/**
ReportCenter module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");

var jade = require("./index.jade");
var css = require("../common/less/base.less");
// var i18n = require('locales/zh-CN.json');

require("./less/index.less");

var noty = require('customnoty');

var easyClock = require('easy-clock');

var statusBar = require('statusbar');

var actionBar = require('actionbar');

var backBtn = require('backbtn');

var server = require('common/server.js').server;
// var differentdevice = require('differentdevice');

var typeListCell = require('./typelistcell.jade');

var list = require('list');
var gridlist = require('gridlist');

var gridcell = require('./gridcell.jade');

var paging = require('paging');
var datepicker = require('datetimepicker');
var pubsub = require('PubSubJS');

//加载枪和子弹的图片
var gunImgUrl = require('./img/gun.png');
var bulletImgUrl = require('./img/bullet.png');
var moment = require("moment");

var ReportCenter = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('ReportCenter has been created');
  return this;
}

var metadata = {
  NS : 'reportcenter',
  pub : [

  ],
  sub : [],
  endpoint : '/cabinetmodule'
};

var prototype = {
  init : function (){
    log.info('init ReportCenter entry');
    this.currentStep = 0;
    var me = this;
    me.server({
      url : '/cabinet?populate=org&where={"isLocal": true}'
    }, true)
    .done(function(data){
      if (data[0] && data[0].isMaster){
        me.listComponentUrl = '/cabinet/list?needLocal=true';
        me.currentCabinetIsMaster = true;
      } else {
        me.listComponentUrl = '/master/cabinet/list?needLocal=true';
        me.currentCabinetIsMaster = false;
      }
      me.currentLocalCabinetCode = data[0] && data[0].code;
    });
    // 定义当前模块的类型
    this.currentModuleType = 'gun';
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    this.offDownloadProcess();
    cb();
  },
  onDownloadProcess: function() {
    var me = this;
    pubsub.subscribe('generate_logs_progress', function (topic, value) {
      console.log('########## 监听到下载进度 ########', value);
      if (value && value.msg && value.msg.value) {
        me.renderDownloadProcess(value.msg.value);
      }
    });
  },
  renderDownloadProcess: function(value) {
    var me = this;
    var btn = me.$node.find('button[name="download"]').find('h4');
    console.log('下载进度', value, typeof value);
    if (value === '100.0') {
      return btn.text('制作完毕，准备下载').removeClass('disabled');
    }
    btn.text('日志制作进度:' + value + '%').addClass('disabled');
  },
  offDownloadProcess: function() {
    pubsub.unsubscribe('generate_logs_progress');
  },
  show : function($node, cb){
    var me = this;
    this.onDownloadProcess();
    this.checkedFaceLog();

    // create html frame
    $node.append(jade({
      i18n: __('reportcenter')
    }));

    // put modules to frame
    $node.find('.rpt-comp-clock').easyClock();
    $node.find('.rpt-status-bar').backBtn('show', function(){me.nav('/m/userhome')});
    $node.find('.rpt-action-bar').actionBar('show');

    $node.find('#return-btn').on('click', function(){
      me.nav('/m/userhome');
    });
    me.getGunCount();
    me.getBulletCount();

    $node.on('click', '.click-object', function(){
      var $this = $(this);
      var map = {
        local : function(){
          me.getBulletCount();
          me.getGunCount();
        },
        all : function(){
          if(me.currentCabinetIsMaster){
            me.getBulletCount(metadata.endpoint + '/countbullet');
            me.getGunCount(metadata.endpoint + '/countgun');
          }else{
            me.getBulletCount('/master' + metadata.endpoint + '/countbullet');
            me.getGunCount('/master' + metadata.endpoint + '/countgun');
          }
        },
        prev : function(){
          $node.find('.list-cont').gridlist('prev');
        },
        next : function(){
          $node.find('.list-cont').gridlist('next');
        },
        gunModule : function(){
          log.debug(me)
          $this.addClass('on').siblings().removeClass('on');
          me.currentModuleType = 'gun';
          var url;
          if (me.currentCabinetId) {
            url = '/cabinetmodule/list?type=gun&cabinetId=' + me.currentCabinetId;
          } else {
            url = '/cabinetmodule/list?type=gun&isLocal=true'
          }
          $node.find('.list-cont').gridlist('fetch', null, null, null, null, url, true);
        },
        bulletModule : function(){
          $this.addClass('on').siblings().removeClass('on');
          var url;
          if (me.currentCabinetId) {
            url = '/cabinetmodule/list?type=bullet&cabinetId=' + me.currentCabinetId
          } else {
            url = '/cabinetmodule/list?type=bullet&isLocal=true'
          }
          me.currentModuleType = 'bullet';
          $node.find('.list-cont').gridlist('fetch', null, null, null, null, url, true);
        },
        specified : function(){
          var $modal = $('<div/>').appendTo($node)
          .flexmodal()
          .on('shown.bs.modal'/*Bootstrap event*/, function(e){
            log.debug("click specified", e);
            var $targetNode = $(e.target);
            var $list = $targetNode.find('.type-list')
            .on('click', 'li', function(e){
              var $target = $(e.currentTarget);
              var cabinetId = $target.data('cabinet');
              var type = me.currentModuleType;

              var url = '/cabinetmodule/list?type=' + type + '&cabinetId=' + cabinetId;
              
              me.currentCabinetId = cabinetId;
              $node.find('.list-cont').gridlist('fetch', null, null, null, null, url, true);
              $modal.flexmodal('modalHide');
            })
            .list({
              source: {
                url : me.listComponentUrl
              },
              innerTpl: function(data){
                return typeListCell(data)
              }, // A compiled jade template,
              renderFn : null // How to render body
            });
            $list.list('show');
          });
          $modal
          .flexmodal('show',
            {
              modalTitle : '请选择挂载机柜'
            },
              require('./typelist.jade')
          );
        },
        endDateFilter: function() {
          var $modal = $('<div class="filter-date">').appendTo($node)
          .flexmodal({IsSureBtn: true})
          .on('shown.bs.modal', function(e) {
            $node.find('.time-box').datetimepicker({
              locale: 'zh-CN',
              format: 'YYYY-MM-DD HH:mm',
              sideBySide: true,
              inline: true
            })
          })
          .on('onOk', function() {
            var timeValue = $modal.find('.time-box').data().date;
            $this.val(timeValue);
            $modal.flexmodal('modalHide');

            // 选择了就显示clear按钮
            me.showInputCloseBtn($this.prev());
          });

          $modal.flexmodal('show',
            {
              modalTitle : '请选择过滤的开始时间'
            }
          );
        },
        logType: function() {
          var $modal = $('<div>').appendTo($node);
          $modal.flexmodal({IsSureBtn: true})
          .on('shown.bs.modal', function(e) {
            var $nodeBox = $node.find('.time-box').parent();
            me.createdTypeList($nodeBox);
            $modal.off('click', '.filterTypeList')
            .on('click', '.filterTypeList', function (e) {
              var $currentDiv = $(e.target);
              var type = $currentDiv.data('type');
              var name = $currentDiv.text();
              console.log('选择的类型过滤的类型', type, name);

              if (type === 'all') {
                type = null;
              }
              
              $this.data('type', type);
              $this.val(name);

              // 选择了就显示clear按钮
              me.showInputCloseBtn($this.prev());
              $modal.flexmodal('modalHide');
            });

          })
          .on('onOk', function() {
            $modal.flexmodal('modalHide');
            me.showInputCloseBtn($this.prev());
          })
          $modal.flexmodal('show', {
            modalTitle: '请选择下载的日志类型'
          });
        },
        startDateFilter: function() {
          var $modal = $('<div class="filter-date">').appendTo($node)
          .flexmodal({IsSureBtn: true})
          .on('shown.bs.modal', function(e) {
            $node.find('.time-box').datetimepicker({
              locale: 'zh-CN',
              format: 'YYYY-MM-DD HH:mm',
              sideBySide: true,
              inline: true
            })
          })
          .on('onOk', function() {
            var timeValue = $modal.find('.time-box').data().date;
            $this.val(timeValue);
            $modal.flexmodal('modalHide');
            $modal.remove();
            // 选择了就显示clear按钮
            me.showInputCloseBtn($this.prev());

          });

          $modal.flexmodal('show',
            {
              modalTitle : '请选择过滤的开始时间'
            }
          );
        },
        download: function() {
          var me = this;
          var isRemote = $('html').hasClass('remote');
          var type = me.$node.find('#logType').data('type');
          if (!isRemote) {
            return noty({text: '下载日志,请远程访问下载', type: 'info', layout: 'top', timeout: 3000});
          }
          var startTime = $node.find('#startDateFilter').val(),
          endTime = $node.find('#endDateFilter').val();
          if (!startTime) {
            return noty({text: '请填写开始时间', type: 'error', layout: 'top', timeout: 3000});
          }

          if (!endTime) {
            return noty({text: '请填写结束时间', type: 'error', layout: 'top', timeout: 3000});
          }

          if (new Date(startTime) > new Date(endTime)) {
            return noty({text: '开始时间不能比结束时间大', type: 'error', layout: 'top', timeout: 3000});
          }

          if (moment(endTime) - moment(startTime) > 2592000000) {
            return noty({text: "下载日期间隔不能超过30天", type: 'error', layout: 'top', timeout:5000});
          }

          if (!type) {
            type = 'all';
          }

          $this.addClass('disabled');

          // 判断用哪个url
          // var url = '/optlog/logsTextOnly';
          var url = '/optlog/pdfdownload';
          // if (me.enableFaceLog) {
          // }
          $.ajax({
            url: url + "?start=" + startTime + '&end=' + endTime + '&type=' + type,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })
          .done(function(data) {
            $this.removeClass('disabled');
            if (!(data && data.length)) {
              return noty({text: '当前没有日志信息', type: 'info', layout: 'topRight', timeout: 3000});
            }
            _.each(data, function(item) {
              setTimeout(function() {
                var a = document.createElement('a');
                var filename = item.split('/');
                var len = filename.length;
                a.href = '/system/downloadFile' + '?path=' + item;
                a.download = filename[len - 1];
                a.click();
                a = null;
                filename = null;
                $this.find('h4').text('下载日志');
              }, 0);
            });
          })
          .fail(function() {
            $this.removeClass('disabled');
            noty({text: '下载失败!', type: 'error', layout: 'top', timeout: 3000});
          });
        },
        clear: function() {
          $this.addClass('hide').next().val('');
        }
      }
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });
    $node.find('.list-cont').gridlist({
      source : {
        url: '/cabinetmodule/list?type=moduleList'
      },
      innerTpl: function(data){
        if (data.cmLoad){
          if(data.type === 'gun') {
            data.imgUrl = gunImgUrl;
          }else{
            data.imgUrl = bulletImgUrl;
          }
        }
        return gridcell(_.merge(data, {
          i18n: __('reportcenter')
        }));
      }, // A compiled jade template,
      renderFn : null // How to render body
    })
    .on('onNext', function(e, skip, total, limit){
      $node.find('.paging-btn-box')
      .paging('next', skip, total, limit);
    })
    .on('onPrev', function(e, skip, total, limit){
      $node.find('.paging-btn-box')
      .paging('prev', skip, total, limit);
    })
    .on('gridlist.afterTotalChange', function(event, total, limit, skip){
      $node.find('.paging-btn-box')
      .paging('refresh', skip, total, limit);
    })
    .gridlist('show');

    $node.find('.paging-btn-box')
    .paging('show');
    cb();
  },
  createdTypeList: function($node) {
    var $div,
        fragment = $('<div>'),
        data = [
          {
            name: '所有类型',
            type: 'all'
          },
          {
            'name': __('logmanagement').getGun,
            'type': 'gun'
          },
          {
            'name': __('logmanagement').getBullet,
            'type': 'bullet'
          },
          {
            'name': __('logmanagement').returnGun,
            'type': 'returnGun'
          },
          {
            'name': __('logmanagement').returnBullet,
            'type': 'returnBullet'
          },
          {
            name: '存枪',
            type: 'storeGun'
          },
          {
            name: '存子弹',
            type: 'storeBullet'
          },
          {
            name: '维护取枪',
            type: 'maintain'
          },
          {
            name: '维护还枪',
            type: 'returnMaintain'
          }
        ];

    _.each(data, function(item, index) {
      $div = '<div class="filterTypeList" data-type="' + item.type + '">' + item.name + '</div>';
      fragment.append($($div));
    });

    $node.empty().append(fragment)
  },  
  showInputCloseBtn: function($btn) {
    $btn.removeClass('hide');
  },
  getBulletCount : function(url){
    if(url){
      var url = url;
    }else{
      var url = metadata.endpoint + '/countbullet';
    }
    var method = 'GET',
        dataType = 'json';
    var notyInst = null;
    var me = this;
    server({
      url: url,
      method: method,
      // contentType : 'application/json',
      dataType: dataType
    }).done(function(data){
      log.debug(data);
      if(data && data.length > 0){
        var count = 0;
        if(!_.isNil(data[0].load))
          count = data[0].load;
        me.$node.find('#bulletTotal').text(count);
      }
      noty({text: '子弹数量更新成功', type: 'success', timeout:1000, layout: 'topRight'});
    })
    .fail(function(err){
      log.debug(err);
      noty({text: '子弹数量更新失败', type: 'success', timeout:1000, layout: 'topRight'});
    })
  },

  getGunCount : function(url){
    if(url){
        var url = url;
    }else{
        var url = metadata.endpoint + '/countgun';
    }
    var method = 'GET',
        dataType = 'json';
    var notyInst = null;
    var me = this;
    server({
      url: url,
      method: method,
      // contentType : 'application/json',
      dataType: dataType
    }).done(function(data){
      log.debug(data);
      if(data && data.length > 0){
        var count = 0;
        if(!_.isNil(data[0].load))
          count = data[0].load;
        me.$node.find('#gunTotal').text(count);
      }
      noty({text: '枪支数量更新成功', type: 'success', timeout:1000, layout: 'topRight'});
    })
    .fail(function(err){
      log.debug(err);
      noty({text: '枪支数量更新失败', type: 'success', timeout:1000, layout: 'topRight'});
    })
  },
  checkedFaceLog: function() {
    var me = this;
    server({
      url: '/system/settings'
    })
    .done(function(res) {
      console.log('settings', res);
      _.each(res, function(item) {
        if (item.key === 'enableFaceLog' && item.value === 'true'){
          console.log('开始图文日志下载功能');
          me.enableFaceLog = true;
          return true;
        } else {
          me.enableFaceLog = false;
        }
      });
    })
  }
}

_.extend(ReportCenter, metadata);
_.extend(ReportCenter.prototype, prototype);
module.exports = ReportCenter;
/**
ReportCenter module end
*/
