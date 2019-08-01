'use strict';

var KanbanJade = require('./index.jade');
var KanbanLess = require('./less/index.less');

var paging = require('paging');
var gridlist = require('gridlist');
var gridCell = require('./gridCell.jade');
var pagestate = require('pagestate');
var detaileJade = require('./detaile.jade');
var backBtn = require('backbtn');
var datagrid = require("datagrid");
var moment = require('moment');
var pubsub = require('PubSubJS');
var flexModal = require('flexmodal');
var keypad = require('keypad');
var noty = require('customnoty');
var Message = require('common/message.js');
var datepicker = require('datetimepicker');
var videoPlayer = require('./videoPlayer.jade');
var keypad = require('keypad');

var Kanban = function (reg) {
  reg.apply(this);
  return this;
}

_.extend(Kanban, {
  NS : 'Kanban',
  noAuth: true,
  pub : [

  ],
  sub : []
});

var prototype = {
  init: function () {
    pubsub.unsubscribe('system.message');
    Message.initAsLocal();
  },
  show: function ($node, cb) {
    var me = this;
    $node.append(KanbanJade);
    var $pageContainer = $node.find('.pageContainer');
    var $listCont = $node.find('.list-cont');
    $pageContainer.paging('show');
    
    // 获取系统设置
    this.fetchSetting();
    
    me.initGridlist($listCont, $pageContainer);

    me.initPagestage($node);

    // me.$node.find('.downloadVideoBtn')
    // .off('click')
    // .on('click', function() {
    //   me.nav('/m/videoDownload');
    // });

    $node.on('click', '.clickBtn', function() {
      var map = {
        refresh: function() {
          $listCont.gridlist('refresh');
        },
        processList: function() {
          me.routeEnter('/m/KanbanAuth');
        },
        logout: function() {
          me.openLoginModule();
          window.sessionStorage.removeItem('isLogin');
          window.sessionStorage.removeItem('token');
        },       
      }
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });

    $node.find('.pageContainer')
    .on('click', '.btn', function() {
      var map = {
        prev: function() {
          $listCont.gridlist('prev');
        },
        next: function() {
          $listCont.gridlist('next');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });

    me.pusbubRemotePendingApplication();
    // 第一次拉取总数
    me.checkDataGetIsSuccess();
    me.fetchTotalCount();
    // 订阅总数枪、弹更改
    me.subscribeTotalCount();
    // 订阅库房更改
    me.subscribeNewOrgJoin();
    // 订阅org列表修改，枪子弹数量的更新
    me.subscribeUpdateOrgList();

    // 订阅机构开门日志更新
    pubsub.unsubscribe('newOpenDoorEvent');
    pubsub.subscribe('newOpenDoorEvent', function (topic, msg) {
      console.log('########### 开门日志推送: #############', msg, topic);
      var orgname = msg && msg.orgName;
      me.$node.find('.orgNameH2').each(function (index, item) {
        var $currOrg = $(item);
        console.log($currOrg.text(), orgname, '对比')
        if ($currOrg.text() === orgname) {
          $currOrg.parents('.grid-list-cell').addClass('tipsAnimation');
          setTimeout(function() {
            $currOrg.parents('.grid-list-cell').removeClass('tipsAnimation');
          }, 3000);
        }
      });
    });

    me.$node.find('.login-btn')
    .off('click')
    .on('click', function() {
      var username = me.$node.find('#username').val();
      var password = me.$node.find('#password').val();
      me.adminlogin(username, password, function(data) {
          var roles = data.roles[0];
          var permissions = roles.permissions;
          var token = data.token;
          
          var isSuccess = permissions.indexOf('manage-system') > -1;
          
          if (isSuccess) {
            me.admingLoginSuccess(token);
            noty({text: '登录成功', type: 'success', layout: 'topRight', timeout: 2000});
          } else {
            noty({text: '您不是超级管理员, 无法进入看板', type: 'error', layout: 'top', timeout: 3000});
          }
      });

    });

    me.checkNeedLogin();
    me.initKeypad();
    cb();
  },
  checkNeedLogin: function() {
    var isLogin = window.sessionStorage.getItem('isLogin');
    if (isLogin !== 'true') {
      this.openLoginModule();
    } else {
      this.closeLoginModule();
    }
  },
  // 登录成功， 保存登录状态和token
  admingLoginSuccess: function(token) {
    window.sessionStorage.setItem('isLogin', true);
    window.sessionStorage.setItem('token', token);
    this.closeLoginModule();
  },
  openLoginModule: function() {
    this.$node.find('.loginModule').show();
  },
  closeLoginModule: function() {
    this.$node.find(".loginModule").hide();
  },
  adminlogin: function(username, password, fn) {
    var me = this,
        base64 = btoa(username + ":" + password),
        basicAuth = "Basic " + base64;
    $.ajax({
      url: '/auth/login?v=' + new Date().getTime(),
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      dataType: 'json',
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", basicAuth);
        xhr.setRequestHeader('userinfo', 'true');
      }
    })
    .done(function(data) {
      fn && (typeof fn === 'function') && fn(data);
    })
    .fail(function(err) {
      if(err.status === 403){
        me.speak('login_fail');
        // print error;
        noty({text: err.responseJSON.error, type: 'error', layout: 'top', timeout:5000});
      }else{
        // print error;
        if(err && err.responseJSON) {
          noty({text: err.responseJSON.error, type: 'error', layout: 'top', timeout:5000});
        } else {
          noty({text: '未知错误', type: 'error', layout: 'top', timeout:5000});
        }
      }
    });
  },
  initKeypad: function ($node) {
    var $keypadBox = this.$node.find('.has-keypad');
    $keypadBox.keypad('init', {
      type: 'http',
      showPosition: 'bottom',
      PinYinID: 'usernameFilter'
    });
  },
  checkDataGetIsSuccess: function () {
    var me = this;
    me.checkDataGetIsSuccessTime = setTimeout(function() {
      me.fetchTotalCount();
      me.checkDataGetIsSuccess();
    }, 800);
  },
  setKanbanGunCount: function(num) {
    this.$node.find('.allGunCount').text(num);
  },
  setKanbanBulletCount: function(num) {
    this.$node.find('.allBulletCount').text(num);
  },
  setKanbanOrgCount: function(num) {
    this.$node.find('.allOrgCount').text(num);
  },
  fetchTotalCount: function() {
    var me = this;
    this.server({
      url: '/org/orgList?skip=0&limit=0',
      method: 'get'
    })
    .done(function(data) {
      if (me.checkDataGetIsSuccessTime) {
        $('button[name="refresh"]').click();
        clearTimeout(me.checkDataGetIsSuccessTime)
      }
      me.setKanbanOrgCount(data.total)
      me.setKanbanBulletCount(data.totalBulletCounts)
      me.setKanbanGunCount(data.totalGunCounts)
    })
  },
  fetchSetting: function() {
    var me = this;
    this.server({
      url: '/system/settings'
    })
    .done(function(res) {
      var ieURL = null;
      var videURL = null;
      for (var i = 0, len = res.length; i < len; i++) {
        if (res[i].key === 'ieDownloadUrl') {
          ieURL = res[i].value;
        } else if (res[i].key === 'videosDownloadUrl') {
          videURL = res[i].value;
        }
      }
      me.updateDownloadIEUI(ieURL);
      me.updateDownloadVideo(videURL);
    })
    .fail(function() {
      // 异常
      me.updateDownloadIEUI();
      me.updateDownloadVideo();
    })
  },
  updateDownloadIEUI: function(url) {
    if (!url) return;
    var me = this;
    var $downloadModule = me.$node.find('.downloadModule');
    var isRemote = $('html').hasClass('remote');

    if (isRemote) {
      $downloadModule.find('.downloadIEBtn').removeClass('hide').attr('href', url);
    }
  },
  updateDownloadVideo: function(url) {
    if (!url) return this;
    var me = this;
    var $downloadModule = me.$node.find('.downloadModule');
    var isRemote = $('html').hasClass('remote');
    if (isRemote) {
      $downloadModule.find('.downloadVideoBtn').removeClass('hide').attr('href', url);
    }
  },
  subscribeUpdateOrgList: function() {
    var me = this;

    pubsub.unsubscribe('gunCount');
    pubsub.subscribe('gunCount', function(topic, msg) {
      setTimeout(function() {
        me.refreshOrgGunCount(msg.orgId, msg.count)
      }, 300);
    });

    pubsub.unsubscribe('bulletCount');
    pubsub.subscribe('bulletCount', function(topic, msg) {
      setTimeout(function() {
        me.refreshOrgBulletCount(msg.orgId, msg.count)
      }, 300);
    });
  },
  refreshOrgGunCount: function(id, count) {
    var $box = $('#' + id);
    if ($box.length > 0) {
      $box.find('.gridlist_gun_count').text('枪支总数 ' + count);
    }
  },
  refreshOrgBulletCount: function(id, count) {
    var $box = $('#' + id);
    if ($box.length > 0) {
      $box.find('.gridlist_bullet_count').text('子弹总数 ' + count);
    }
  },
  //订阅枪、库房、子弹总数改变的推送
  subscribeTotalCount: function() {
    var me = this;
    pubsub.unsubscribe('totalCount');
    pubsub.subscribe('totalCount', function(topic , msg) {
      me.setKanbanBulletCount(msg.bulletCount)
      me.setKanbanGunCount(msg.gunCount)
    })
  },
  //订阅库房改变后的推送
  subscribeNewOrgJoin: function() {
    var me = this,
        $button = $('button[name="refresh"]');
    pubsub.unsubscribe('system.message')
    pubsub.subscribe('system.message', function(topic, msg) {
      console.log('system.message topic is newOrg', msg)
      if (msg.topic === 'newOrg') {
        me.fetchTotalCount();
        $button.click();
      } else if (msg.topic === 'connection') {
        $button.click();
      }
    })
  },
  initPagestage: function($node) {
    $node.pagestate({
      state: 0,
      states: {
        0: ['.Kanban-main'],
        1: ['.detaile-cont']
      }
    });
    $node.pagestate('setState', 0);
  },
  pusbubRemotePendingApplication: function() {
    pubsub.unsubscribe('remotePendingApplication')
    pubsub.subscribe('remotePendingApplication', function (topic, value) {
      console.log('### remotePendingApplication ##################', value);
      if (value.count > 0) {
        $('#processTips').removeClass('hide').find('.status-text').text('待取审核工单' + value.count);
      } else {
        $('#processTips').addClass('hide');
      }
    })
  },
  initDetailePage: function(orgId, bulletCount, gunCount, orgName) {
    var me = this,
        $KanbanTable,
        $iframeContainer,
        $node = me.$node;
    $node.pagestate('setState', 1);

    // 记录orgId
    me.orgId = orgId;

    $node.find('.detaile-cont').append(detaileJade({
      orgName: orgName,
      bulletCount: bulletCount,
      gunCount: gunCount,
      orgId: orgId
    }));

    var $gunDOM = $node.find('#KanbanTable .bullet_count');
    var $bulletDOM = $node.find('#KanbanTable .gun_count');


    // 获取温湿度
    me.systemStatus(orgId);

    pubsub.unsubscribe('gunCount');
    pubsub.subscribe('gunCount', function(topic, msg) {
      if (msg.orgId === orgId) {
        $gunDOM.text(msg.count);
      }
    });

    pubsub.unsubscribe('bulletCount');
    pubsub.subscribe('bulletCount', function(topic, msg) {
      if (msg.orgId === orgId) {
        $bulletDOM.text(msg.count);
      }
    });

    //取消枪、弹总数的订阅
    pubsub.unsubscribe('totalCount');
    pubsub.unsubscribe('newOrg');

    $KanbanTable = $node.find('#KanbanTable');
    $iframeContainer = $node.find('#iframeContainer');

    $node.find('.rpt-status-bar').backBtn('show', function(){
      $node.pagestate('setState', 0);

      // 返回的时候重新订阅总数量
      me.subscribeTotalCount();
      me.subscribeNewOrgJoin();
      me.subscribeUpdateOrgList();

      $node.find('.detaile-cont').empty();
    });

    $node.find('#log-table')
    .on('click', '.seePic', function(e) {
      var filename = $(e.currentTarget).data('filename');
      console.log('This is picture url', filename);
      var $screen = $node.find('.Kanban-screen');
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
    .on('click', '.seeSignaturePic', function(e) {
      var filename = $(e.currentTarget).data('filename');
      console.log('This is picture url', filename);
      var $screen = $node.find('.Kanban-screen');
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
    .on('click', '.assetsPic', function(e) {
      var id = $(e.currentTarget).data('id');
      var $screen = $node.find('.Kanban-screen');
      var $modal = $('<div/>').appendTo($screen);
      var URL = '/asset/image/' + id;

      $modal.flexmodal()
        .off('hide.bs.modal')
        .on('hide.bs.modal', function (e) {
          $modal.remove();
        })
        .off('shown.bs.modal')
        .on('shown.bs.modal', function () {
          $modal.find('.modal-body').append('<img class="faceImg" src="' + URL + '">');
        })
        .flexmodal('show', {
          modalTitle: '查看图片'
        })
    })
    .on('click', '.play-video', function(e){
      log.debug('show videos');
      var $videoBtn = $(e.currentTarget);
      var id = $videoBtn.data('assetid');
      var $screen = $node.find('.Kanban-screen');
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
      var $target = $(e.target),
          logText = $target.text(),
          $screen = $node.find('.Kanban-screen'),
          $modal = $('<div/>').appendTo($screen);
      

        $modal.flexmodal()
        .on('shown.bs.modal', function(e) {
          var $html = require('./logDataTpl.jade')({
            data: logText
          });
          $(e.target).find('.logData-cont').html($html);
        })
        .on('hide.bs.modal', function(e) {
          $(e.target).find('.logData-cont').empty();
        });      

        // 有内容弹框展示日志详情
        $modal.flexmodal('show', {
          modalTitle: '日志详情'
        }, require('./logData.jade'));
    })
    .off('click', '.date_box')
    .on('click', '.date_box', function(e) {
      var $target = $(e.target),
          $screen = $node.find('.Kanban-screen'),
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
      url: '/optlog/fetchLog?' + 'org=' + orgId,
      data: {sort:{ createdAt: 'DESC'}},
      createdRow: function (row, data, index) {
        if (data.logType === 'warning') {
          $(row).addClass('highlight_log');
        }
      },
      columns: [
        { title: '用户名称', orderable : false,
          data : function ( row, type, val, meta ) {
            // 'sort', 'type' and undefined all just use the integer
            var createdBy =  (row.createdBy && row.createdBy.alias) ? row.createdBy.alias : row.createdBy;
            return createdBy ? createdBy : '无';
          }
        },
        {
          title: '操作', data: 'action'
        },
        { title: '日志', data : 'log', width: "20%", orderable : false, class: "log"},
        { title: '操作时间', orderable : false,
          data : function ( row, type, val, meta ) {
            var createdAt = moment(row.createdAt).locale('zh-cn').format('YYYY-MM-DD HH:mm')
            return "<div class='small-font-size'>" + createdAt + "</div>";
          }
        },
        {
          title: '签名图片',
          name: 'signature',
          with: '10%',
          orderable: false,
          data: function (row, type, val, meta) {
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
          data: function (row, type, val, meta) {
            var filename = row.fingerPrint;
            if (filename) {
              return '<button class="btn btn-empty seePic" data-filename=' + filename + '><i class="glyphicon glyphicon-picture"></i></button>';
            }
            return '';
          }
        }, {
          title: '人脸图片',
          name: 'facePic',
          width: '10%',
          orderable: false,
          data: function (row, type, val, meta) {
            var filename = row.facePic;
            if (filename) {
              return '<button class="btn btn-empty seePic" data-filename=' + filename + '><i class="glyphicon glyphicon-picture"></i></button>';
            }
            return '';
          }
        }, {
          title: '视频记录',
          name: 'assets',
          data: function (row, type, val, meta) {
            var assets = row.assets;
            if (assets && assets.length > 0) {
              var asset = assets[0];
              var type = asset.type;
              var id = asset.id;
              var status = asset.status;
              if (type === 'video') {
                if (status === 'ready') {
                  return '<button class="btn btn-empty play-video" data-assetid=' + id + '><i class="glyphicon glyphicon-film"></i></button>';
                } else if (status === 'notFound') {
                  return '资源未找到';
                } else {
                  return '正在转码';
                }
              } else if (type === 'image') {
                return '<button class="btn btn-empty assetsPic" data-id=' + id + '><i class="glyphicon glyphicon-picture"></i></button>';
              } else {
                return '';
              }
            } else {
              return '';
            }
          },
          width: "10%",
          orderable: false
        }
      ],
    });

    $node.find('#closeBtn')
    .off('click')
    .on('click', function() {
      $iframeContainer.addClass('hide').find('iframe').remove();
      $iframeContainer.find('.no-iframe').remove();
      $KanbanTable.removeClass('hide');
    });

    $node.find('#supervision')
    .off('click')
    .on('click', function() {
      //获取摄像url
      me.getWebcamUrl(orgId)
      .done(function(data) {
        me.showWebcam($KanbanTable, $iframeContainer, data.webcamUrl)
      })
      .fail(function(error) {
        noty({text: '获取监控视频url失败', type: 'error', layout: 'top', timeout: 3000});
      });
    });

    // 设置监控地址
    $node.find('#setWebcamUrl')
    .off('click')
    .on('click', function(e) {
      me.getWebcamUrl(orgId)
      .done(function(data) {
        me.showSetWebcamUrlPop(orgId, data.webcamUrl);
      })
      .fail(function(error) {
        noty({text: '获取监控视频url失败', type: 'error', layout: 'top', timeout: 3000});
      })
    });

    // 主动拉取指定时间到至今的日志
    $node.find('#fetchLogBtn')
    .off('click')
    .on('click', function(e) {
      me.openFetchLogsFlexmodal(orgId);
    });

    $node.find('.filterDateBtn')
    .off('click')
    .on('click', function(e) {
      me.filterFlexModal(orgId);
    });

    // 警报日志
    $node.find('.alarmLogBtn')
    .off('click')
    .on('click', function() {
      // type => warning
      me.logType = 'warning';
      me.clickBtnAction($(this));
      me.filterDatagrid(orgId, 'warning', me.filterStartDate, me.filterEndDate);
    });

    // 非警报日志
    $node.find('.notAlarmLogBtn')
    .off('click')
    .on('click', function() {
      // type => normal
      me.logType = 'normal';
      me.clickBtnAction($(this));
      me.filterDatagrid(orgId, 'normal', me.filterStartDate, me.filterEndDate);
    });

    // 所有日志
    $node.find('.allLogBtn')
    .off('click')
    .on('click', function() {
      // all => 所有日志
      me.logType = 'all';
      me.clickBtnAction($(this));
      me.filterDatagrid(orgId, 'all', me.filterStartDate, me.filterEndDate);
    });

    // 锁定机构
    $node.find('#lockCabinet')
    .off('click')
    .on('click', function() {
      me.localCabient('true');
    });

    $node.find('#unlockCabinet')
    .off('click')
    .on('click', function() {
      me.localCabient('false');
    })

  },
  clickBtnAction: function($this) {
    $this.addClass('actionBtn').siblings().removeClass('actionBtn')
  },
  systemStatus: function(id) {
    var me = this;
    var token = window.sessionStorage.getItem('token');
    this.server({
      url: '/system/systemStatus?cabinet=' + id,
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(token));
      }
    })
    .done(function(res) {
      console.log('获取柜机状态: success', res);
      // 更改ui柜机状态
      me.updateSystemStatusUI(res);
    })
    .fail(function(res) {
      console.log('获取柜机状态: error', res)
    });
  },
  updateSystemStatusUI: function(data) {
    console.log(data);
    var temp = data.temp,
        humi = data.humi,
        power = data.power,
        powerType = data.powerType;
    // 温度
    if(temp < -15 || temp > 65){
      $('#temperature h4').html(temp !== null ? temp + '&#8451' : '数据异常').addClass('text-error');
    }else{
      $('#temperature h4').html(temp !== null ? temp + '&#8451' : '数据异常').removeClass('text-error');
    }

    if (temp === null) {
      $('#temperature h4').addClass('text-error');
    }

    // 湿度
    if (humi >= 70) {
      $('#humidity h4').text(humi !== null ? humi + '%' : '数据异常').addClass('text-error');
    } else {
      $('#humidity h4').text(humi !== null ? humi + '%' : '数据异常').removeClass('text-error');
    }

    if (humi === null) {
      $('#humidity h4').addClass('text-error');
    }
    
    // 电源
    if (powerType !== powerType) powerType = null;
    if (powerType === '1') {
      $('#power h4').text('电源正常').removeClass('text-error');
    } else {
      if (powerType === '-1') {
        $('#power h4').text('获取电源失败').addClass('text-error');
      } else {
        if (power === null) {
          $('#power h4').text('数据异常').addClass('text-error');
        } else {
          $('#power h4').text('备用电源' + power + '%').addClass('text-error');
        }
      }
    }
  },
  localCabient: function(status) {
    var id = this.orgId;
    var token = window.sessionStorage.getItem('token');
    this.server({
      url: '/org/lockCabinet',
      method: 'POST',
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(token));
      },
      data: {id: id, status: status}
    })
    .done(function(res) {
      console.log('锁柜机,success:', res);
      noty({text: '操作成功', type: 'success', layout: 'top', timeout: 2000});
    })
    .fail(function(res) {
      console.log('锁柜机, error:', res);
      var error = res && res.responseJSON && res.responseJSON.error || '请求失败';
      noty({text: error, type: 'error', layout: 'top', timeout: 2000});
    });
  },
  filterFlexModal: function(orgId) {
    var $node = this.$node,
        me = this,
        $modal = $('<div id="fetchLogFlexModal">').appendTo('.Kanban-screen');
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
      console.log('开始时间， 结束时间', start, end)
      me.refreshLogCompoent(start, end, orgId);
      $modal.flexmodal('modalHide');
    }).flexmodal('show', {
      modalTitle: '请填写日期'
    });    
  },
  refreshLogCompoent: function (filterStartDate, filterEndDate, orgId) {
    console.log(filterStartDate && filterEndDate)
    if (!filterStartDate) {
      return noty({ text: '开始时间不能为空!', type: 'error', layout: 'top', timeout: 3000 });
    } else if (!filterEndDate) {
      return noty({ text: '结束时间不能为空!', type: 'error', layout: 'top', timeout: 3000 });
    } else if (filterStartDate && filterEndDate && new Date(filterStartDate) > new Date(filterEndDate)) {
      return noty({text: '开始时间不能比结束时间大', type: 'error', layout: 'top', timeout: 3000});
    }

    // 记录开始时间和结束时间
    this.filterStartDate = filterStartDate;
    this.filterEndDate = filterEndDate;
    var logType = this.logType;
    // 过滤日志
    this.filterDatagrid(orgId, logType, filterStartDate, filterEndDate);
  },
  filterDatagrid: function(orgId, logType, start, end) {
    var url = '/optlog/fetchLog?org=' + orgId;
    if (start && end) {
      url = url + '&start=' + start + '&end=' + end;
    }
    if (logType) {
      url = url + '&logType=' + logType;
    }
    this.$node.find('#log-table').datagrid('refresh', url);
  },
  openSelectedDate: function($input) {
    var $node = this.$node,
        me = this,
        $modal = $('<div id="dateFlexmodal">').appendTo('.Kanban-screen');
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
  openFetchLogsFlexmodal: function(orgId) {
    var $node = this.$node,
        me = this,
        $modal = $('<div id="fetchLogFlexModal">').appendTo('.Kanban-screen');
    $modal.flexmodal({
      IsSureBtn: true,
      // modalBackdropRemove: true,
      // innerTpl: require('./asyncLog.jade'),
    })
    .on('show.bs.modal', function(e) {
      var $timeBox = $node.find('.time-box');
      $timeBox.datetimepicker({
        locale: 'zh-CN',
        format: 'YYYY-MM-DD HH:mm',
        sideBySide: true,
        inline: true
      });
      // $node.find('.asyncDate .dateInput')
      // .off('click')
      // .on('click', function () {
      //   me.openSelectedDate($(this));
      // });
    })
    .on('onOk', function(e) {
      var timeValue = $modal.find('.time-box').data().date;
      // var start = $modal.find('#start').val();
      // var end = $modal.find('#end').val();
      me.fetchLogs(timeValue, orgId);
      $modal.flexmodal('modalHide');
    }).flexmodal('show', {
      modalTitle: '请选择起始时间(起始时间～至今到的日志)'
    });
  },
  fetchLogs: function(start, orgId) {
    this.server({
      url: '/sync/requestUpdate?org=' + orgId + '&date=' + start
    })
    .done(function(res) {
      var msg = res && res.msg || '已发送成功';
      noty({text: msg, type: 'success', layout: 'topRight', timeout: 2000});
    })
    .fail(function(res) {
      noty({text: '请求失败', type: 'success', layout: 'top', timeout: 2000});
    });
  },
  showSetWebcamUrlPop: function (orgId, url) {
    var $node = this.$node,
        me = this,
        $modal = $('<div id="MessageFlexmodal">').appendTo($node);

    $modal.flexmodal({
      IsSureBtn: true,
      innerTpl: require('./messageBox.jade'),
      // 配置modalBackdropRemove:true,禁止flexmodal点击背景隐藏
      modalBackdropRemove: true
    })
    .on('shown.bs.modal', function(e) {
      me.initPopKeypad($modal);
      $modal.find('input').val(url);
      $modal.find('.save-btn').text('保存');
    })
    .on('hide.bs.modal', function(e) {
      me.destoryPopKeypad($modal);
      $modal.flexmodal('remove');
      $modal.remove()
    })
    .on('onOk', function() {
      var url = $('#MessageFlexmodal').find('.webcamUrl').val();
      me.saveWebcamUrl(url, orgId);
      $modal.flexmodal('modalHide');
    })
    .flexmodal('show', {
      modalTitle: '设置监控视频地址'
    });
  },
  initPopKeypad: function($modal) {
    $modal.find('.init-keypad').keypad('init', {
      type: 'http'
    })
  },
  destoryPopKeypad: function($modal) {
    $modal.find('.init-keypad').keypad('destroy');
  },
  saveWebcamUrl: function(url, orgId) {
    this.server({
      url: '/org/webcamUrl/' + orgId,
      data: { webcamUrl: url },
      method: 'PUT'
    })
    .done(function(data) {
      console.log('%s this is save webcam url success msg', data);
      noty({text: '监控地址更新成功', type: 'success', layout: 'topRight', timeout: 1000});
    })
    .fail(function(err) {
      console.log('%s this is save webcam url fail msg', err)
      noty({text: '监控地址更新失败', type: 'error', layout: 'top', timeout: 3000});
    })
  },
  showWebcam: function ($KanbanTable, $iframeContainer, url) {
    var iframe;
    if (url) {
      iframe = document.createElement('iframe');
      iframe.src = url;
    } else {
      iframe = $('<div class="no-iframe">');
      iframe.text('该库房还没有指定的监控地址!');
    }
    $iframeContainer.append(iframe).removeClass('hide');
    $KanbanTable.addClass('hide');
  },
  getWebcamUrl: function(id) {
    var dfd = new $.Deferred();
    this.server({
      url: '/org/webcamUrl?id=' + id
    })
    .done(function(data) {
      console.log('% This is get webcam url success msg', data)
      dfd.resolve(data)
    })
    .fail(function(error){
      console.log('% this is get webcam url error msg', error)
      dfd.reject(error)
    })
    return dfd;
  },
  initGridlist: function ($listNode, $pageContainer) {
    var me = this;
    $listNode.gridlist({
      source: {
        url: '/org/orgList'
      },
      innerTpl: function (data) {
        return gridCell(data);
      }
    }).gridlist('show');

    $listNode
    .on('click', '.grid-list-cell', function(e) {
      var orgId = $(this).data('orgid');
      var name = $(this).data('name');
      var bulletCount = $(this).data('bulletcount') || 0;
      var gunCount = $(this).data('guncount') || 0;
      me.initDetailePage(orgId, bulletCount, gunCount, name);
    })
    .on('click', '.delete-btn', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var orgId = $(this).data('id');
      me.warnMessage('正在删除机构，是否继续？', _.bindKey(me, 'deleteOrg', orgId));
    })
    .on('onNext', function (e, skip, total, limit) {
      $pageContainer.paging('next', skip, total, limit);
    })
    .on('onPrev', function(e, skip, total, limit) {
      $pageContainer.paging('prev', skip, total, limit);
    })
    .on('gridlist.afterTotalChange', function(event, total, limit, skip) {
      $pageContainer.paging('refresh', skip, total, limit);
    });
  },
  deleteOrg: function(orgId) {
    var me = this;
    me.server({
      url: '/org/clear/' + orgId,
      method: 'delete'
    })
    .done(function(data) {
      console.log('% This is delete org success data', data)
      noty({text: '删除机构成功', type: 'success', layout: 'topRight', timeout: 2000});
      me.$node.find('.list-cont').gridlist('refresh');
      me.fetchTotalCount();
    })
    .fail(function(err){
      console.log('% This is delete fail msg', err)
      noty({text: '删除机构失败', type: 'error', layout: 'top', timeout: 3000});
    })
  },
  routeEnter: function(route) {
    this.setFlashbag(null);
    this.nav(route);
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
  destroy: function (cb) {
    pubsub.unsubscribe('gunCount');
    pubsub.unsubscribe('bulletCount');
    pubsub.unsubscribe('totalCount');
    pubsub.unsubscribe('newOrg');
    cb();
  }
}

_.extend(Kanban.prototype, prototype);

module.exports = Kanban;
