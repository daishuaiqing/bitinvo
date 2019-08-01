/**
LogManagement module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var font = require('fontawesome/less/font-awesome.less');
var moment = require("moment");
// window.moment = moment;
var checkbox3 = require('checkbox3/dist/checkbox3.css');
var datepicker = require('datetimepicker');
var jade = require("./index.jade");
var css = require("common/less/base.less");
// var i18n = require('locales/zh-CN.json');

require("./less/index.less");

var noty = require('customnoty');

var easyClock = require('easy-clock');

var statusBar = require('statusbar');

var actionBar = require('actionbar');

var backBtn = require('backbtn');

var vmenu = require('vmenu');

var taskbar = require('taskbar');

var table = require('./table.jade');

var videoPlayer = require('./videoPlayer.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var dg = require("datagrid");

var differentdevice = require('differentdevice');

var typeListCell = require('./typelistcell.jade');

var list = require('list');

var datepicker = require('datetimepicker');

var noty = require('customnoty');

var keypad = require('keypad');

var pubsub = require('PubSubJS');

var LogManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('LogManagement has been created');
  return this;
}

var metadata =  {
  NS : 'logmanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/optlog'
}

_.extend(LogManagement, metadata);

var prototype = {
  init : function (){
    log.info('init LogManagement entry');
    var me = this;
    me.server({
      url : '/cabinet?where={"isLocal": true}'
    }, true)
    .done(function(data){
      data = data && data[0];
      if (data.isMaster) {
        me.listComponentUrl = '/cabinet/list?needLocal=false';
        me.currentCabinetIsMaster = true;
      }else{
        me.listComponentUrl = '/cabinet/list?needLocal=false';
        me.currentCabinetIsMaster = false;
      }
      me.currentLocalCabinetCode = data.code;
    })
  },
  show : function($node, cb){
    var me = this;
    me.$node.pagestate({
      namespace : metadata.NS,
      state: 0,
      /*
        0 list
        1 edit
      */
      states : {
        0 : [
          '.list-cont'
        ],
        1 : [
          '.detail-cont'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(jade({
      i18n: __('logmanagement'),
      i18nButton: __('buttonText')
    }));

    $node.pagestate('setState', 0);

    // put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    $node.find('.appm-status-bar').backBtn('show', function(){me.nav('/m/userhome')});
    $node.find('.appm-action-bar').actionBar('show');

    $node.find('.leftmenu')
    .on('vmenu.afterChange', function(e, previous, next, originalEvent){
      originalEvent.preventDefault();
      var id = next.attr('id');
      switch(id){
        case 'cab-list' :
          _.delay(function(){me.nav('/m/cabinetmanagement')}, 250);
          break;
        case 'module-list' :
          _.delay(function(){me.nav('/m/modulemanagement')}, 250);
          break;
        case 'log-list' :
          _.delay(function(){me.nav('/m/logmanagement')}, 250);
          break;
        case 'lock-location-list':
          _.delay(function(){me.nav('/m/locklocation')}, 250);
          break;
      }
    })
    .vMenu('show',
      2,
      [
        {
          name: __('cabinetmanagement').cabinetList,
          target: '#list',
          id: 'cab-list',
          clsName: 'vlink'
        },
        {
          name: __('cabinetmanagement').moduleList,
          target: '#modulelist',
          id: 'module-list',
          clsName: 'vlink'
        },
        {
          name: __('cabinetmanagement').logList,
          target: '#loglist',
          id: 'log-list',
          clsName: 'vlink'
        },
        {
          name: __('cabinetmanagement').lockPositionList,
          target: '#locklocationlist',
          id: 'lock-location-list',
          clsName: 'vlink'
        }
      ],
      true//clickable
    );

    $node.find('.table-cont')
    .append(table());

    log.debug('Create new Table');

    // 初始化表格
    me.initDatagrid();
    me.onClickFilterInput();
    me.onClearBtn();
    me.initKeypad();

    $node.find('.download-time-box').on('click', 'input', function(){
      var me = this;
      var map = {
        start: function(){
          var $modal = $('<div class="start-date">').appendTo($node)
          .flexmodal({IsSureBtn: true})
          .on('shown.bs.modal'/*Bootstrap event*/, function(e){
            $node.find('.time-box').datetimepicker({
              locale: 'zh-CN',
              format: 'YYYY-MM-DD HH:mm',
              sideBySide: true,
              inline: true
            });
          })
          .on('onOk', function(){
            var timeValue = $modal.find('.time-box').data().date;
            $(me).val(timeValue);
            $modal.flexmodal('modalHide');
          });

          $modal.flexmodal('show',
            {
              modalTitle : '请选择日志开始时间'
            }
          );

        },
        end: function(){
          var $modal = $('<div class="end-date">').appendTo($node)
          .flexmodal({IsSureBtn: true})
          .on('shown.bs.modal'/*Bootstrap event*/, function(e){
            $node.find('.time-box').datetimepicker({
              locale: 'zh-CN',
              format: 'YYYY-MM-DD HH:mm',
              sideBySide: true,
              inline: true
            });
          })
          .on('onOk', function(){
            var timeValue = $modal.find('.time-box').data().date;
            $(me).val(timeValue);
            $modal.flexmodal('modalHide');
          });

          $modal.flexmodal('show',
            {
              modalTitle : '请选择日志结束时间'
            }
          );
        }
      }
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })

    $node.find('.actions-bar').on('click', '.btn', function(){
      var map = {
        download : function(){
          log.debug('download');
          var isRemote = $('html').hasClass('remote');
          if (!isRemote) {
            return noty({text: '下载日志,请远程访问下载', type: 'info', layout: 'top', timeout: 3000});
          }
          var startTime = $('#startDateFilter').val(),
              endTime = $('#endDateFilter').val();
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

          var $modal = $('<div class="filter-type">').appendTo($node)
          .flexmodal({IsSureBtn: false})
          .on('shown.bs.modal', function(e) {
            var $nodeBox = $node.find('.time-box').parent();

            me.createdDownloadTypeList($nodeBox);

            $modal.on('click', '.downloadList', function(e) {
              var $currentDiv = $(e.target);
              me.downloadLog($currentDiv);
              $modal.flexmodal('modalHide');
            });

          });

          $modal.flexmodal('show', {
            modalTitle: '请选择过滤类型'
          });

          // $node.find('.download-time-box').toggleClass('hide');
          // window.location.assign("/optlog/download");
          // window.location.href = "/optlog/download";
        },
        refresh : function(){
          log.debug('refresh');
          $node.find('#log-table').datagrid('refresh');
        },
        next : function(){
          log.debug('next page');
          $node.find('#log-table').datagrid('next');
        },
        prev : function(){
          log.debug('prev page');
          $node.find('#log-table').datagrid('prev');
        },
        all : function(){
          if(me.currentCabinetIsMaster){
            var url = metadata.endpoint;
          }else{
            var url = '/master' + metadata.endpoint;
          }
          $node.find('#log-table')
          .off('onError')
          .on('onError', function(){
            noty({text: '联网失败无法访问远程柜机', type: 'error', layout: 'topRight', timeout: '3000'});
          })
          .datagrid('refresh', url);
        },
        local : function(){
          var url = metadata.endpoint;
          $node.find('#log-table').datagrid('refresh', url);
        },
        specified : function(){
          var $modal = $('<div/>').appendTo($node)
          .flexmodal()
          .on('shown.bs.modal'/*Bootstrap event*/, function(e){
            var $node = $(e.target);
            var $list = $node.find('.type-list')
            .on('click', 'li', function(e){
              var $me = $(this);
              var cabinetCode = $me.data('code');
              
              var isLocal = Boolean($me.data('local'));
              var isMaster = Boolean($me.data('master'));

              var url = isLocal && metadata.endpoint || (isMaster && '/master' + metadata.endpoint || '/peer/' + cabinetCode + metadata.endpoint);
              me.$node.find('#log-table').datagrid('refresh', url);
              $modal.flexmodal('modalHide');
            });
            $list.list({
              source: {
                url : me.listComponentUrl
              },
              innerTpl: function(data){
                if(data.code === me.currentLocalCabinetCode){
                  data.isLocal = true;
                }else{
                  data.isLocal = false;
                }
                return typeListCell(data)
              }, // A compiled jade template,
              renderFn : null // How to render body
            });
            $list.off('onError')
            .on('onError', function(){
              noty({text: '联网失败无法访问远程柜机', type: 'error', layout: 'topRight', timeout: '3000'});
            })
            .list('show');
          });
          $modal
          .flexmodal('show',
            {
              modalTitle : '请选择挂载机柜'
            },
              require('./typelist.jade')
          );
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });

    $node.find('.different-device-box').differentDevice({
      'btnArray' : [
        {name : 'local', text: '本地柜机'},
        {name : 'all', text: '全部柜机'},
        {name : 'specified', text: '指定柜机'}
      ]
    }).differentDevice('show');

    cb();
  },
  downloadLog: function($currentDiv) {
    console.log(type, 'This is download log type')
    var me = this,
        type = $currentDiv.data('type'),
        url = '';

    switch (type) {
      case 'pdf':
        me.pdfDownload();
        break;
      case 'csv':
        me.cvxDownload();
        break;
    }
  },
  pdfDownload: function() {
    var me = this;
    var $node = this.$node;
    var startDate = $node.find('#startDateFilter').val();
    var endDate = $node.find('#endDateFilter').val();
    var filterName = $node.find('#usernameFilter').val();
    var patrn = /[\u4E00-\u9FA5]|[\uFE30-\uFFA0]/gi;
    var filterNameKey = patrn.exec(filterName) ? 'alias' : 'username';
    var url = "/optlog/syslog?start=" + startDate + '&end=' + endDate + '&' + filterNameKey + '=' + filterName + '&download=true';

    // if (me.isFilterLog) {
    //   url = me.filterLogDownloadUrl + '&download=true';
    // }

    window.location.assign(url);
  },
  cvxDownload: function() {
    var me = this;
    var $node = me.$node;
    var startDate = $node.find('#startDateFilter').val();
    var endDate = $node.find('#endDateFilter').val();
    var filterName = $node.find('#usernameFilter').val();
    var patrn = /[\u4E00-\u9FA5]|[\uFE30-\uFFA0]/gi;
    var filterNameKey = patrn.exec(filterName) ? 'alias' : 'username';
    if (filterName) {
      var url = "/optlog/download?start=" + startDate + '&end=' + endDate + '&' + filterNameKey + '=' + filterName;
    } else {
      var url = "/optlog/download?start=" + startDate + '&end=' + endDate
    }

    // if (me.isFilterLog) {
    //   url = me.filterLogDownloadUrl + '&download=true';
    // }
    window.location.assign(url);
  },
  initDatagrid: function() {
    var me = this;
    var $node = me.$node;

    $node.find('#log-table')
    .on('click', '.seePic', function(e) {
      var filename = $(e.currentTarget).data('filename');
      console.log('This is picture url', filename);
      var $screen = $node.find('.logmanagement-screen');
      var $modal = $('<div/>').appendTo($screen)
      $modal.flexmodal()
      .on('shown.bs.modal', function(e) {
        var url = ' /system/fetchPic?filename=' + filename;
        $modal.find('.modal-body').empty().append('<img class="faceImg" src="' + url + '">');
      })
      .on('hide.bs.modal', function(e) {
        $modal.remove();
      });
      $modal.flexmodal('show',
        {
          modalTitle: '查看图片'
        }
      )
    })
    .on('click', '.videoPic', function(e) {
      var filename = $(e.currentTarget).data('filename');
      console.log('This is picture url', filename);
      var $screen = $node.find('.logmanagement-screen');
      var $modal = $('<div/>').appendTo($screen)
      $modal.flexmodal()
      .on('shown.bs.modal', function(e) {
        var url = '/asset/image/' + filename;
        $modal.find('.modal-body').empty().append('<img style="width:800px;display:block;margin:0 auto;" src="' + url + '">');
      })
      .on('hide.bs.modal', function(e) {
        $modal.remove();
      });
      $modal.flexmodal('show',
        {
          modalTitle: '查看图片'
        }
      );
    })
    .on('click', '.seeSignaturePic', function(e) {
      var filename = $(e.currentTarget).data('filename');
      console.log('This is picture url', filename);
      var $screen = $node.find('.logmanagement-screen');
      var $modal = $('<div/>').appendTo($screen)
      $modal.flexmodal()
      .on('hide.bs.modal', function(e) {
        $modal.remove();
      });
      me.server({
        url: '/signature/fetch?signatureId=' + filename
      })
      .done(function(data) {
        $modal.off('shown.bs.modal').on('shown.bs.modal', function() {
          $modal.find('.modal-body').append('<img class="faceImg" src="' + data + '">');
        })
        .flexmodal('show',
          {
            modalTitle: '查看签名图片'
          }
        )
      })
    })
    .on('click', '.play-video', function(e){
      log.debug('show videos');
      var $videoBtn = $(e.currentTarget);
      var id = $videoBtn.data('assetid');
      var $screen = $node.find('.logmanagement-screen');
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
    })
    .off('click', '.log')
    .on('click', '.log', function(e) {
      console.log('click .log td')
      var $target = $(e.target),
          $next = $target.next(),
          log = $target.text(),
          jsonString = $next.text(),
          jsonObject,
          $screen = $node.find('.logmanagement-screen'),
          $modal = $('<div/>').appendTo($screen);

      try {
        jsonObject = JSON.parse(jsonString);
      } catch(e) {
        jsonObject = {};
      } 
    
      $modal.flexmodal()
      .on('shown.bs.modal', function(e) {
        var $html = require('./logDataTpl.jade')({
          data: jsonObject,
          log: log,
          i18n: __('application')
        });

        $(e.target).find('.logData-cont').html($html);
      })
      .on('hide.bs.modal', function(e) {
        $(e.target).find('.logData-cont').empty();
      });      

      // 有内容弹框展示日志详情
      $modal.flexmodal('show', {
        modalTitle: '工单信息'
      }, require('./logData.jade'));

    })
    .off('click', '.date_box')
    .on('click', '.date_box', function(e) {
      var $target = $(e.target),
          $screen = $node.find('.logmanagement-screen'),
          $modal = $('<div/>').appendTo($screen),
          date = $target.text();
      $modal.flexmodal()
        .on('shown.bs.modal', function (e) {
          var $html = require('./dateInfo.jade')({
            date: date
          });

          $(e.target).find('.logData-cont').html($html);
        })
        .on('hide.bs.modal', function (e) {
          $(e.target).find('.logData-cont').empty();
        });

      // 有内容弹框展示日志详情
      $modal.flexmodal('show', {
        modalTitle: '详情'
      }, require('./logData.jade'));      
    })
    .datagrid('init', {
      url: metadata.endpoint,
      data: {
        populate: 'createdBy,assets'
      },
      order: [[0, 'desc'],[ 5, 'desc' ]],
      createdRow: function(row, data, index) {
        if (data.logType === 'warning') {
          $(row).addClass('highlight_log');
        }
      },
      columns: [
        { title: 'ID', data : 'localId', width: "5%", orderable : false},
        { title: '用户名',
          name: 'createdBy',
          data : function ( row, type, val, meta ) {
            // 'sort', 'type' and undefined all just use the integer
            var createdBy =  (row.createdBy && row.createdBy.alias) ? row.createdBy.alias : row.createdBy;
            var createdByUsername = (row.createdBy && row.createdBy.username) ? row.createdBy.username : row.createdBy
            return (typeof createdBy === 'string') ? createdBy : createdByUsername ? createdByUsername: '无';
          },
          width: "8%",
          orderable : false
        },
        { title: '操作', data : 'action', width: "15%", orderable : false},
        {
          title:'日志',
          data : 'log',
          width: "20%",
          orderable : false,
          class: "log"
        },
        { title: '', 
          data: function (row, type, val, meta) {
            return row && row.logData && row.logData.applicationType || '';
          },
          class: "log_detail",
          width: "0", 
          orderable : false
        },
        { title: '操作时间',
          name: 'createdAt',
          data : function ( row, type, val, meta ) {
            var createdAt =  moment(row.createdAt).format('YYYY-MM-DD HH:mm');
            return createdAt ? createdAt : '-';
          },
          width: "15%",
          orderable : false,
          class: 'date_box'
        },
        {
          title: '签名图片',
          name: 'signature',
          width: '10%',
          orderable: false,
          data: function(row, type, val, meta) {
            var filename = row.signature;
            if (filename) {
              return '<button class="btn btn-empty seeSignaturePic" data-filename=' + filename + '><i class="glyphicon glyphicon-picture"></i></button>';
            }
            return '';
          }
        },
        {
          title: '指纹图片',
          name: 'fingerPrint',
          width: '10%',
          orderable: false,
          data: function(row, type, val, meta) {
            var filename = row.fingerPrint;
            if (filename) {
              return '<button class="btn btn-empty seePic" data-filename=' + filename + '><i class="glyphicon glyphicon-picture"></i></button>';
            }
            return '';
          }
        },
        {
          title: '人脸图片',
          name: 'facePic',
          width: '10%',
          orderable: false,
          data: function(row, type, val, meta) {
            var filename = row.facePic;
            if (filename) {
              return '<button class="btn btn-empty seePic" data-filename=' + filename + '><i class="glyphicon glyphicon-picture"></i></button>';
            }
            return '';
          }
        },
        { title: '视频记录',
          name: 'assets',
          data : function ( row, type, val, meta ) {
            var assets = row.assets;
            if(assets && assets.length > 0){
              var asset = assets[0];
              var type = asset.type;
              var id = asset.id;
              var status = asset.status;
              if(type === 'video'){
                if(status === 'ready'){
                  return '<button class="btn btn-empty play-video" data-assetid=' + id + '><i class="glyphicon glyphicon-film"></i></button>';
                } else if (status === 'notFound') {
                  return '资源未找到';
                } else {
                  return '正在转码';
                }
              } else if (type === 'image'){
                return '<button class="btn btn-empty videoPic" data-filename=' + id + '><i class="glyphicon glyphicon-picture"></i></button>';
              } else {
                return '';
              }
            }else{
              return '';
            }
          },
          width: "10%",
          orderable : false
        },
      ],
    });
  },
  onClearBtn: function() {
    this.$node.find('.clear').off('click')
    .on('click', function(e) {
      var $target = $(this);
      $target.addClass('hide').next().val('');
    })
  },
  onClickFilterInput: function() {
    var me = this;
    var $node = me.$node;
    me.$node.find('.filter-box').on('click', '.click_object', function(e) {
      var $this = $(this);
      var map = {
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

            // 选择了就显示clear按钮
            me.showInputCloseBtn($this.prev());

          });

          $modal.flexmodal('show',
            {
              modalTitle : '请选择过滤的开始时间'
            }
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
        typeFilter: function() {
          var $modal = $('<div class="filter-type">').appendTo($node)
          .flexmodal({IsSureBtn: false})
          .on('shown.bs.modal', function(e) {
            var $nodeBox = $node.find('.time-box').parent();
            me.createdTypeList($nodeBox);

            $modal.on('click', '.filterTypeList', function(e) {
              var $currentDiv = $(e.target);
              var type = $currentDiv.data('type');
              var name = $currentDiv.text();
              if (type === 'all') {
                type = null;
              }
              $this.data('type', type);
              $this.val(name);

              // 选择了就显示clear按钮
              me.showInputCloseBtn($this.prev());
              $modal.flexmodal('modalHide');
            });
            
          });

          $modal.flexmodal('show', {
            modalTitle: '请选择过滤类型'
          });
        },
        filterButton: function() {
          var me = this,
              name = $('#usernameFilter').val() || '',
              filterStartDate = $('#startDateFilter').val() || '',
              filterEndDate = $('#endDateFilter').val() || '',
              filterType = $('#typeFilter').val() && $('#typeFilter').data('type') || '',
              patrn = /[\u4E00-\u9FA5]|[\uFE30-\uFFA0]/gi,
              fiilterNameKey = null,
              filterName = name ? name : '',
              filterNameKey = patrn.exec(filterName) ? 'alias' : 'username';

          if (filterStartDate && filterEndDate && new Date(filterStartDate) > new Date(filterEndDate)) {
            return noty({text: '开始时间不能比结束时间大', type: 'error', layout: 'top', timeout: 3000});
          }
          var query = [
            {
              key: 'type',
              val: filterType
            },
            {
              key: filterNameKey,
              val: filterName
            },
            {
              key: 'end',
              val: filterEndDate
            },
            {
              key: 'start',
              val: filterStartDate
            }
          ];

          var queryString = '';
          _.each(query, function(item) {
            if (item.val) {
              if (queryString.indexOf('?') === -1) {
                queryString += ('?' + item.key + '=' + item.val);
              } else {
                queryString += ('&' + item.key + '=' + item.val); 
              }
            }
          });

          var url = '/optlog/syslog' + queryString;

          // 记录是否进行过滤操作
          me.isFilterLog = true;
          me.filterLogDownloadUrl = url;

          if (!(filterStartDate || filterEndDate || filterName || filterType )) {
            url = metadata.endpoint;
            me.isFilterLog =  false;
            me.filterLogDownloadUrl = url;
          }

          $node.find('#log-table').datagrid('refresh', url);
        }
      };

      var target = $this.attr('name');
      map[target] && map[target].call(me);
    });
  },
  showInputCloseBtn: function($btn) {
    $btn.removeClass('hide');
  },
  hideInputCloseBtn: function($btn) {
    $btn.addClass('hide');
  },
  createdTypeList: function($node) {
    var $div,
        fragment = $('<div>'),
        data = [
          {
            'name': __('logmanagement').getGun,
            'type': 'getGun'
          },
          {
            'name': __('logmanagement').getBullet,
            'type': 'getBullet'
          },
          {
            'name': __('logmanagement').warningInfo,
            'type': 'warning'
          },
          {
            'name': __('logmanagement').returnGun,
            'type': 'returnGun'
          },
          {
            'name': __('logmanagement').returnBullet,
            'type': 'returnBullet'
          }
        ];

    _.each(data, function(item, index) {
      $div = '<div class="filterTypeList" data-type="' + item.type + '">' + item.name + '</div>';
      fragment.append($($div));
    });
    $node.empty().append(fragment)
  },
  createdDownloadTypeList: function($node) {
    var $div,
        fragment = $('<div>'),
        data = [
          // {
          //   name: 'csv格式',
          //   type: 'csv'
          // },
          {
            name: 'pdf格式',
            type: 'pdf'
          }
        ];
    _.each(data, function(item, index) {
      $div = '<div class="downloadList" data-type="' + item.type + '">' + item.name + '</div>'
      fragment.append($div);
    });
    $node.empty().append(fragment);
  },
  initKeypad: function($node) {
    var $keypadBox = this.$node.find('.has-keypad');
    $keypadBox.keypad('init', {
      type: 'http',
      showPosition: 'bottom',
      PinYinID: 'usernameFilter'
    });
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    this.$node.find('.has-keypad').keypad('destroy');
    $('body').off('closeKeypadComponent').off('keypadComponentClickInputShow');
    cb();
  }
}

_.extend(LogManagement.prototype, prototype);
module.exports = LogManagement;
/**
LogManagement module end
*/
