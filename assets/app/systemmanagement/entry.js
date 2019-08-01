/**
SystemManagement module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");

var animateCss = require("animate.css");

//var mask = require("jquery.inputmask/dist/jquery.inputmask.bundle.js");

var font = require('fontawesome/less/font-awesome.less');
var moment = require("moment");
// window.moment = moment;
var checkbox3 = require('checkbox3/dist/checkbox3.css');

var datepicker = require('datetimepicker');


// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var breadcrumbs = require('breadcrumbs');

var jade = require("./index.jade");
var css = require("common/less/base.less");
var i18n = require('locales/zh-CN.json');

require("./less/index.less");

var noty = require('customnoty');

var easyClock = require('easy-clock');

var statusBar = require('statusbar');

var actionBar = require('actionbar');

var taskbar = require('taskbar');

var backBtn = require('backbtn');

var ipEdit = require('./ipEdit.jade');
var timeEdit = require('./timeEdit.jade');
var boxEdit = require('./boxEdit.jade');
var restartType = require('./restarttype.jade');

var formwork = require('formwork');

var list = require('list');

var tabnav = require('tabnav');

var pagestate = require('pagestate');

var validator = require('validator-js');

var keypad = require('keypad');

var jqueryForm = require('jquery-form');
var pubsub = require('PubSubJS');
var SystemManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('SystemManagement has been created %s', this.getIId());
  return this;
}

var metadata =  {
  NS : 'systemmanagement',
  pub : [

  ],
  sub : [],
  endpoint: '/system'
}

_.extend(SystemManagement, metadata);

var prototype = {
  state : 0, //当前状态
  editings : null, //正在编辑的
  init : function (){
    log.info('init SystemManagement entry');
  },
  destroy: function(cb){
    var keyboard  = this.$node.find('input.has-keyboard').keypad('destroy');
    $('#noty_top_layout_container').remove();
    cb();
  },
  show : function($node, cb){
    var me = this;
    // create html frame
    $node.append(jade({
      i18n: __("systemmanagement")
    }));
    if($('body').hasClass('isSimpleapplication')){
      $node.find('.status-bar').backBtn('show', function(){me.nav('/m/simpleapplication')})
    }else{
      $node.find('.status-bar').backBtn('show', function(){me.nav('/m/userhome')});
    }
    $node.find('.action-bar').actionBar('show');
    me.initFormwork();

    // put modules to frame
    $node.find('.posm-status-bar').statusBar('show', false);
    $node.find('.posm-action-bar').actionBar('show');

    var tabNavArray = [
      {
        name: __("systemmanagement").ip,
        target: '#ip',
        id: 'ip',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").time,
        target: '#time',
        id: 'time',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").box,
        target: '#box',
        id: 'box',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").externalEndpointWsdl,
        target: '#externalEndpointWsdl',
        id: 'externalEndpointWsdl',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").updateProgram,
        target: '#updateProgram',
        id: 'updateProgram',
        clsName: 'vlink',
        manageSystem: true
      },
      {
        name: __("systemmanagement").updateApplicationProgram,
        target: '#updateApplicationProgram',
        id: 'updateApplicationProgram',
        clsName: 'vlink',
        manageSystem: true
      },
      {
        name: __("systemmanagement").restart,
        target: '#restart',
        id: 'restart',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").systemInfo,
        target: '#systemInfo',
        id: 'systemInfo',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").fingerQuality,
        target: '#fingerQuality',
        id: 'fingerQuality',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").clusterSize,
        target: '#clusterSize',
        id: 'clusterSize',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").controller,
        target: '#controller',
        id: 'controller',
        clsName: 'vlink',
        manageSystem: true
      },
      {
        name: __("systemmanagement").mqtt,
        target: '#mqtt',
        id: 'mqtt',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").faceperception,
        target: '#faceperception',
        id: 'faceperception',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").faceArg,
        target: '#faceArg',
        id: 'faceArg',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").quickapplication,
        target: '#quickapplication',
        id: 'quickapplication',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").bulletWeight,
        target: '#bulletWeight',
        id: 'bulletWeight',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").showcount,
        target: '#showcount',
        id: 'showcount',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").autoCreateModule,
        target: '#autoCreateModule',
        id: 'autoCreateModule',
        clsName: 'vlink',
        manageSystem: true
      },
      {
        name: __("systemmanagement").setTitle,
        target: '#setTitle',
        id: 'setTitle',
        clsName: 'vlink',
        manageSystem: true
      },
      {
        name: __("systemmanagement").setoverTime,
        target: '#setoverTime',
        id: 'setoverTime',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").setopenbatch,
        target: '#setopenbatch',
        id: 'setopenbatch',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").setstorageTime,
        target: '#setstorageTime',
        id: 'setstorageTime',
        clsName: 'vlink'
      },
      {
        name: __("systemmanagement").importUserCsv,
        target: '#importUserCsv',
        id: 'importUserCsv',
        clsName: 'vlink',
        manageSystem: true
      },
      {
        name: __("systemmanagement").ping,
        target: '#ping',
        id: 'ping',
        clsName: 'vlink',
        manageSystem: true
      },
      {
        name: __("systemmanagement").UUID,
        target: '#UUID',
        id: 'UUID',
        clsName: 'vlink',
        manageSystem: true
      },
      {
        name: '锁定系统设置',
        target: '#lockCabinetBox',
        id: 'lockCabinetBox',
        clsName: 'vlink'
      },
      {
        name: '浏览器下载设置',
        target: '#downloadIE',
        id: 'downloadIE',
        clsName: 'vlink'
      },
      {
        name: '视频地址下载',
        target: '#downloadVideo',
        id: 'downloadVideo',
        clsName: 'vlink'
      },
      {
        name: '柜机ID设置',
        target: '#cabinetId',
        id: 'cabinetId',
        clsName: 'vlink'
      },
      {
        name: '重启操作',
        target: '#restartCabientApplication',
        id: 'restartCabientApplication',
        clsName: 'vlink',
        manageSystem: true
      },
      {
        name: '日志设置',
        target: '#logging',
        id: 'logging',
        clsName: 'vlink',
        manageSystem: true
      }
    ];

    //判断帐号权限是否为manage-system
    if (!me.user.hasPermission('manage-system')) {
      tabNavArray = _.filter(tabNavArray, function (item) {
        return !item.manageSystem;
      });
    }

    $node.find('.tab-holder').tabNav(
      'show',
      tabNavArray,
      false
    ).$node.on('tabchanged', function(e, originalEvent){
      var $item = $(originalEvent.currentTarget);
      var id = $item.attr('id');
      me.$node.find('#sureUpdateButton').removeClass('hide');
      // 切换tab时，手动删除noty容器（粗暴的解决时间矫正造成的noty无法退出的bug）
      $('#noty_top_layout_container').remove();
      switch(id){
        case 'ip' :
          me.$node.pagestate('setState', 0);
          // me.setIpAddress();
          break;
        case  'time' :
          me.$node.pagestate('setState', 1);
          break;
        case  'box' :
          me.$node.pagestate('setState', 2);
          break;
        case  'externalEndpointWsdl' :
          me.$node.pagestate('setState', 3);
          break;
        case 'updateProgram' :
          me.$node.pagestate('setState', 4);
          me.$node.find('#sureUpdateButton').addClass('hide');
          break;
        case 'updateApplicationProgram':
          me.$node.pagestate('setState', 5);
          me.$node.find('#sureUpdateButton').addClass('hide');
          break;
        case 'restart' :
          me.$node.pagestate('setState', 6);
          break;
        case 'systemInfo':
          me.getAppVersion();
          me.checkTestcan();
          me.$node.pagestate('setState', 7);
          me.$node.find('#sureUpdateButton').addClass('hide');
          break;
        case 'fingerQuality' :
          me.$node.pagestate('setState', 8);
          break;
        case 'clusterSize':
          me.$node.pagestate('setState', 9);
          break;
        case 'controller':
          me.$node.pagestate('setState', 10);
          break;
        case 'mqtt':
          me.$node.pagestate('setState', 11);
          break;
        case 'faceperception':
          me.$node.pagestate('setState', 12);
          break;
        case 'faceArg':
          me.$node.pagestate('setState', 13);
          break;
        case 'quickapplication':
          me.$node.pagestate('setState', 14);
          break;
        case 'bulletWeight':
          me.$node.pagestate('setState', 15);
          break;
        case 'showcount':
          me.$node.pagestate('setState', 16);
          break;
        case 'autoCreateModule':
          me.$node.pagestate('setState', 17);
          break;
        case 'setTitle':
          me.$node.pagestate('setState', 18);
          break;
        case 'setoverTime':
          me.$node.pagestate('setState', 19);
          break;
        case 'setopenbatch':
          me.$node.pagestate('setState', 20);
          break;
        case 'setstorageTime':
          me.$node.pagestate('setState', 21);
          break;
        case 'importUserCsv':
          me.$node.pagestate('setState', 22);
          break;
        case 'ping':
          me.$node.pagestate('setState', 23);
          break;
        case 'UUID':
          me.$node.pagestate('setState', 24);
          break;
        case 'lockCabinetBox':
          me.$node.pagestate('setState', 25);
          break;
        case 'downloadIE':
          me.$node.pagestate('setState', 26);
          break;
        case 'downloadVideo':
          me.$node.pagestate('setState', 27);
          break;
        case 'cabinetId':
          me.$node.pagestate('setState', 28);
          break;
        case 'restartCabientApplication':
          me.$node.pagestate('setState', 29);
          break;
        case 'logging':
          me.$node.pagestate('setState', 30);
          break;
      }
    });

    me.$node.pagestate({
      namespace : metadata.NS,
      state: 0,
      /*
        0 list
        1 edit
      */
      states : {
        0 : [
          '.setting-ip'
        ],
        1 : [
          '.setting-time'
        ],
        2 : [
          '.setting-boxname'
        ],
        3 : [
          '.setting-externalendpointopen'
        ],
        4 : [
          '.setting-updateProgram'
        ],
        5 : [
          '.setting-updateApplicationProgram'
        ],
        6 : [
          '.setting-restart'
        ],
        7 : [
          '.setting-systemInfo'
        ],
        8 : [
          '.setting-fingerQuality'
        ],
        9 : [
          '.setting-clusterSize'
        ],
        10: [
          '.setting-controller'
        ],
        11: [
          '.setting-mqtt'
        ],
        12: [
          '.setting-faceperception'
        ],
        13: [
          '.setting-faceArg'
        ],
        14: [
          '.setting-quickapplication'
        ],
        15: [
          '.setting-bulletWeight'
        ],
        16: [
          '.setting-showcount'
        ],
        17: [
          '.setting-autoCreateModule'
        ],
        18: [
          '.setting-setTitle'
        ],
        19: [
          '.setting-setoverTime'
        ],
        20: [
          '.setting-setopenbatch'
        ],
        21: [
          '.setting-setstorageTime'
        ],
        22: [
          '.setting-importUserCsv'
        ],
        23: [
          '.setting-ping'
        ],
        24: [
          '.setting-resetUUID'
        ],
        25: [
          '.setting-lockCabinetBox'
        ],
        26: [
          '.setting-downloadIE'
        ],
        27: [
          '.setting-downloadVideo'
        ],
        28: [
          '.setting-cabinetId'
        ],
        29: [
          '.setting-restartCabientApplication'
        ],
        30: [
          '.setting-logging'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    $node.pagestate('setState', 0);

    var actions = [
      {
        name: '应用到所有柜机',
        target: function() {
          me.setAllAlarmConfig();
        },
        className: 'hide',
        id: 'alarmOpenBtn'
      },
      {
        name : '取消',
        target: function(){
          if($('body').hasClass('isSimpleapplication')){
            me.nav('/m/simpleapplication');
          }else{
            me.nav('/m/userhome');
          }
        }
      },
      {
        name : '确认修改',
        target: function(e){
          e.preventDefault();
          var $editform = $node.find('form');
          $editform.formwork('validate', me.getSubmitFields());
        },
        id: 'sureUpdateButton'
      }
    ];

    $node.find('.taskbar').taskbar('show', actions);

    me.getSettings();

    me.addKeyboard($node);
    cb();

    $node.find("#hardwareFile")
      .off('change')
      .on('change', function(e){
        me.$node.find('form').attr('action', 'updateFile');
        me.uploadUpdateFile();
      });

    $node.find('#logo_pic')
    .off('change')
    .on('change', function(e) {
      me.$node.find('form').attr('action', 'logo');
      me.uploadLogo();
    });

    $node.find('#userCsv')
    .off('change')
    .on('change', function(e) {
      me.$node.find('form').attr('action', 'userList');
      me.$node.find('.userCsv-file-button').addClass('disabled');
      
      me.importCsv();
    });

    $node.find('#pingBtn')
    .off('click')
    .on('click', function() {
      var $pingBtn = $(this);
      var ip = me.$node.find('#pingValue').val();
      if (!ip) {
        return noty({text: '请填写ip', type: 'error', layout: 'top', timeout: 1000});
      }
      $pingBtn.addClass('disabled');
      noty({text: '请等待结果', type: 'info', layout: 'top', timeout: 2000});
      me.server({
        url: '/system/test/ping?ip=' + ip
      })
      .done(function(res) {
        if (res && res.data) {
          var $div = $('<div />').html(res.data);
          me.$node.find('#mask').removeClass('hide').find('.mask_context .box').empty().append($div);
        }
      })
      .fail(function(res) {
        var responseJSON = res.responseJSON;
        var err = responseJSON && responseJSON.msg ? responseJSON.msg : (responseJSON.code ? responseJSON.code : '请求失败');
        noty({text: err, type: 'error', layout: 'top', timeout: 2000});
        if (responseJSON && responseJSON.data) {
          var $div = $('<div />').html(responseJSON.data);
          me.$node.find('#mask').removeClass('hide').find('.mask_context .box').empty().append($div);
        }
      })
      .always(function(){
        $pingBtn.removeClass('disabled');
      });
    });

    ;(function(){
      var PINGIP = [];
      $node.find('#ipVal')
      .off('click', '.ip_val')
      .on('click', '.ip_val', function(e) {
        var $this = $(this);
        var $pingInput = me.$node.find('#pingValue');
        var oldVal = $pingInput.val();
        var newVal = $this.text();
        var isClearBtn = $this.hasClass('clear');
        PINGIP = []
        _.each(oldVal.split('.'), function(item) {
          if (item) {
            PINGIP.push(item + '.');
          }
        });
        
        if (PINGIP.length < 4 && !isClearBtn) {
          if (PINGIP.length == 3) {
            newVal = newVal.slice(0, -1);
          }
          PINGIP.push(newVal);
          $pingInput.val(PINGIP.join(''));
        } else if (isClearBtn) {
          PINGIP.splice(PINGIP.length - 1, 1);
          $pingInput.val(PINGIP.join(''));
        }
      });
    })();

    $node.find('#updateProgramButton')
      .off('click')
      .on('click', function(){
        var filePath = $node.find('#hardwareFilePath').val(),
            startCanId = $node.find("#hardwareCanId").val(),
            endCanId = $node.find("#endHardwareCanId").val();
        if (!filePath) {
          return noty({text: '硬件更新所需要的文件不能为空！', type: 'error', layout: 'top', timeout: 2000});
        }
        me.continuousUpdate(startCanId, endCanId, filePath, $(this))
      });

    $node.find('#updateApplicationProgramButtonSpan')
      .off('click')
      .on('click', function(){
        var $this = $(this),
            url = $node.find('#update_app_url').val(),
            password = $node.find('#update_app_password').val(),
            data = {'url': url, 'password': password};
        if(!url){
          noty({text: '网址不能为空', type: 'error', layout: 'top', timeout: 3000 });
          return;
        }else if(!password){
          noty({text: '解压密码不能为空', type: 'error', layout: 'top', timeout: 3000});
          return;
        }
        me.updateApplicationProgram($this, data);
      });

    $node.find('#viewUpdateResultButton')
    .off('click')
    .on('click', function () {
      var key, list = '';
      var $mask = $node.find('#mask');
      $mask.removeClass('hide');
      for (var key in me.updateProgramResult ) {
        if (me.updateProgramResult.hasOwnProperty(key)) {
          list += '<div class="result_row"> CanId:' + key + ' 更新结果：<span class="color_red">' + me.updateProgramResult[key] + '</span></div>'
        }
      }
      $mask.find('.mask_context .box').empty().append(list);
    });

    // 重启操作
    $node.find('#restartApplication')
    .off('click')
    .on('click', function() {
      me.restartHandle('application');
    });

    $node.find('#restartCabinetBtn')
    .off('click')
    .on('click', function() {
      me.restartHandle('system');
    });

    // 重置UUID
    $node.find('#resetUUIDBtn')
    .off('click')
    .on('click', function() {
      me.handleRestUUID();
    });

    $node.find('#mask .mask_close')
    .off('click')
    .on('click', function () {
      $node.find('#mask').addClass('hide');
    })

    $node.find('#synchronizeSystemTime')
    .off('click')
    .on('click', function () {
      me.synchronizeSystemTime();
    });

    $node.find('#correctionBtn').off('click')
    .on('click', function() {
      var bulletNumber = $('#bulletNumber').val();
      var bulletCabinetModuleId = $('#bulletCabinetModuleId').val();

      var moduleId = $('#moduleId').val();


      if (!bulletCabinetModuleId) {
        return noty({text: '子弹抽屉号必须填写', type: 'error', layout: 'top', timeout: 3000});
      }
      if (!bulletNumber) {
        return noty({text: '子弹数必须填写', type: 'error', layout: 'top', timeout: 3000});
      }


      if (!moduleId) {
        return noty({text: '模块id不能为空!', type: 'error', layout: 'top', timeout: 3000});
      }

      me.calibrate(bulletCabinetModuleId, bulletNumber, moduleId);

    });

    $node.find('#openBulletModuleBtn').off('click')
    .on('click', function() {
      var bulletCabinetModuleId = $('#bulletCabinetModuleId').val();
      var moduleId = $('#moduleId').val();

      if (!bulletCabinetModuleId) {
        return noty({text: '子弹抽屉号必须填写', type: 'error', layout: 'top', timeout: 3000});
      }

      if (!moduleId) {
        return noty({text: '模块id不能为空!', type: 'error', layout: 'top', timeout: 3000});
      }

      me.server({
        url: '/cabinetmodule/directOpen?canId=' + bulletCabinetModuleId + '&moduleId=' + moduleId
      })
      .done(function() {
        noty({text: '开启成功', type: 'success', layout: 'topRight', timeout: 3000});
      })
      .fail(function() {
        noty({text: '开启失败!', type: 'error', layout: 'top', timeout: 3000});
      });
    });

    $node.find('#peeledBtn').off('click')
    .on('click', function() {
      var bulletCabinetModuleId = $('#bulletCabinetModuleId').val();

      var moduleId = $('#moduleId').val();

      if (!bulletCabinetModuleId) {
        return noty({text: '子弹抽屉号必须填写', type: 'error', layout: 'top', timeout: 3000});
      }

      if (!moduleId) {
        return noty({text: '模块id不能为空!', type: 'error', layout: 'top', timeout: 3000});
      }

      me.returnZero(bulletCabinetModuleId, moduleId);
    });

    $node.find('#autoCreateGunModuleBtn').off('click').on('click', function() {
      var typeId = $node.find('input#typeId').val(),
          moduleType = $node.find('input#moduleType').val(),
          canIdStartAt = $node.find('input#canIdStartAt').val(),
          capacity = $node.find('input#capacity').val(),
          moduleIdStartAt = $node.find('input#moduleIdStartAt').val(),
          moduleCounts = $node.find('input#moduleCounts').val(),
          canCounts = $node.find('input#canCounts').val(),
          $btn = $(this),
          query;

      if (!moduleType) {
        return noty({
          text: "模块类型不能为空！",
          type: "error",
          layout: "top",
          timeout: 3000
        });
      } else if (!typeId) {
        return noty({
          text: "存储类型不能为空！",
          type: "error",
          layout: "top",
          timeout: 3000
        });
      } else if (!canIdStartAt) {
        return noty({
          text: '起始canId不能为空!',
          type: 'error',
          layout: 'top',
          timeout: 3000
        });
      } else if (!moduleIdStartAt) {
        return noty({
          text: '起始模块id不能为空!',
          type: 'error',
          layout: 'top',
          timeout: 3000
        });
      } else if (!moduleCounts) {
        return noty({
          text: '模块数量不能为空!',
          type: 'error',
          layout: 'top',
          timeout: 3000
        });
      } else if (!canCounts) {
        return noty({
          text: 'can数量不能为空!',
          type: 'error',
          layout: 'top',
          timeout: 3000
        });
      }
      // 设置query
      query = 'typeId=' + typeId + '&moduleType=' + moduleType + '&canIdStartAt=' + canIdStartAt + '&moduleIdStartAt=' + moduleIdStartAt +
        '&moduleCounts=' + moduleCounts + '&canCounts=' + canCounts;

      if (moduleType === 'bullet') {
        if (!capacity) {
          return noty({
            text: "容量不能为空！",
            type: "error",
            layout: "top",
            timeout: 3000
          });
        }
        query += '&capacity=' + capacity;
      }

      $btn.addClass("disabled");
      me
        .server({
          url: "/cabinetmodule/ezcreate?"+ query
        })
        .done(function() {
          $btn.removeClass("disabled");
          noty({
            text: "生成模块生成",
            type: "success",
            layout: "topRight",
            timeout: 2000
          });
        })
        .fail(function() {
          noty({
            text: "操作失败",
            type: "error",
            layout: "top",
            timeout: 2000
          });
          $btn.removeClass("disabled");
        });
    });

  },
  returnZero: function(id, moduleId) {

    pubsub.unsubscribe('returnZero');
    pubsub.subscribe('returnZero', function(topic, value) {
      if (value.status === 1) {
        noty({text: value.msg, type: 'success', layout: 'topRight', timeout: 2000});
      } else {
        if (value && value.msg) {
          noty({text: value.msg, type: 'error', layout: 'top', timeout: 2000});
        } else {
          noty({text: '归零操作失败!', type: 'error', layout: 'top', timeout: 2000});
        }
      }
    });
    this.server({
      url: '/cabinetmodule/returnZero?canId=' + id + '&moduleId=' + moduleId
    })
    .done(function(data) {
      noty({text: '已发起归零请求, 请等待', type: 'info', layout: 'topRight', timeout: 3000});
    })
    .fail(function(error) {
      noty({text: '请求失败!', type: 'error', layout: 'top', timeout: 2000});
    });
  },
  calibrate: function(id, value, moduleId) {
    pubsub.unsubscribe('calibrate');
    pubsub.subscribe('calibrate', function(topic, value) {
      if (value.status === 1) {
        noty({text: value.msg, type: 'success', layout: 'topRight', timeout: 2000});
      } else {
        if (value && value.msg) {
          noty({text: value.msg, type: 'error', layout: 'top', timeout: 2000});
        } else {
          noty({text: '矫正操作失败!', type: 'error', layout: 'top', timeout: 2000});
        }
      }
    });

    this.server({
      url: '/cabinetmodule/calibrate?canId=' + id + '&value=' + value + '&moduleId=' + moduleId
    })
    .done(function(data) {
      noty({text: '已发起矫正请求,请等待', type: 'info', layout: 'topRight', timeout: 2000});
    })
    .fail(function(error) {
      noty({text: '请求失败!', type: 'error', layout: 'top', timeout: 2000});
    });
  },
  continuousUpdate: function (start, end, filePath, $buttonDOM) {
    var temp,
      data,
      me = this;
    // 对stat、end进行错误格式矫正
    start = start == null ? 0 : start;
    end = end === undefined ? 0 : end;
    (start < 0) && (start = -start);
    (end < 0) && (end = -end);
    start >>>= 0;
    end >>>= 0;
    if (start > end) {
      temp = start;
      start = end;
      end = temp;
    }
    me.updateProgramResult = {};
    $buttonDOM.text('正在更新').addClass('disabled');
    me.$node.find('#viewUpdateResult').addClass('hide');
    do {
      data = {"canId": end, "path": filePath};
      me.updateProgram(data, start, $buttonDOM)
      --end;
    } while (end >= start)
  },
  synchronizeSystemTime: function () {
    var me = this;
    me.server({
      url: '/system/mastertime',
      method: 'GET'
    })
    .done(function (data) {
      noty({text: '正在同步时间', type: 'success', layout: 'right', timeout: null});
    })
    .fail(function (error) {
      noty({text: '同步更新时间失败', type: 'error', layout: 'top', timeout: 2000});
    })
  },
  checkTestcan: function () {
    var $node = this.$node;
    var me = this;
    $node.find('#checkTestcanButton')
    .off('click')
    .on('click', function(){
      var $this = $(this);
      me.server({
        url: '/system/testcan',
        method: 'GET',
        timeout: 7000
      })
      .done(function (data) {
        if (data.states === 1) {
          $node.find('#appVersion .testcan_p').addClass('color_red')
          noty({text:'通信失败', type: 'error', layout: 'top'})
        } else {
          $node.find('#appVersion .testcan_p').removeClass('color_red');
          noty({text: '通信正常', type: 'success', layout: 'top'})
        }
      })
      .fail(function (err) {
        $node.find('#appVersion .testcan_p').addClass('color_red')
        noty({text:'通信失败', type: 'error', layout: 'top'})
      })
    })
  },
  updateApplicationProgram: function($btn, data){
    this.server({
      url: '/system/updatesoftware',
      data: data,
      method: 'post',
      beforeSend: function(){
        $btn.addClass('disabled').html('<h5>正在更新</h5>');
      }
    })
    .always(function(){
      $btn.removeClass('disabled').html('<h5>更新</h5>');
    })
    .done(function(data) {
      noty({text: data, type: 'success', layout: 'topRight', timeout: 4000})
    })
    .fail(function(error) {
      noty({text: '服务器出错', type: 'error', layout: 'top', timeout: 3000});
    })
  },
  uploadUpdateFile: function(){
    log.debug('uploadUpdateFile function')
    var $node = this.$node;
    var me = this;
    $node.find('form')
    .ajaxSubmit({
      url: '/system/uploadUpdateFile',
      success: function(data){
        $node.find('#hardwareFile').val('');
        if(data.filepath){
          $node.find('#hardwareFilePath').val(data.filepath);
          $node.find('#uploadResult').text('文件添加成功');
        }else{
          $node.find('#hardwareFilePath').val('');
          $node.find('#uploadResult').text('文件添加失败');
        }
      },
      error: function(data){
        if (data.status === 403) {
          noty({text: '登录失效，请重新登录', type: 'error', layout: 'top'})
          me.nav('/m/home')
        }
        $node.find('#hardwareFile').val('');
        log.debug(data, 'wow~~~, upload fail');
        $node.find('#hardwareFilePath').val('');
        $node.find("#uploadResult").text('文件添加失败');
      }
    });

  },
  importCsv: function() {
    var me = this;
    noty({text: '导入中..', type:'info', layout: 'topRight', timeout: 800});
    me.$node.find('form')
    .ajaxSubmit({
      url: '/system/importcsv',
      success: function(data) {
        me.$node.find('#userCsv').val('');
        noty({text: '导入成功', type: 'success', layout: 'topRight', timeout: 2000});
        me.$node.find('.userCsv-file-button').removeClass('disabled');
      },
      error: function() {
        me.$node.find('#userCsv').val('');
        noty({text: '导入失败', type: 'error', layout: 'top', timeout: 2000});
        me.$node.find('.userCsv-file-button').removeClass('disabled');
      }
    })
  },
  uploadLogo: function() {
    var me = this;
    me.$node.find('form')
    .ajaxSubmit({
      url: '/system/logo',
      success: function(data) {
        window.localStorage.setItem('logo', data.dataURI);
        me.$node.find('#logo_pic').val('');
        noty({text: '添加成功', type: 'success', layout: 'topRight', timeout: 2000});
      },
      error: function() {
        me.$node.find('#logo_pic').val('');
        noty({text: '添加失败', type: 'error', layout: 'top', timeout: 20000});
      }
    })
  },
  updateProgramResult: {},
  updateProgram: function(dataObject, start, $buttonDOM){
    var me = this;
    var currentCanId = dataObject.canId;
    me.server({
        url: '/system/update',
        method: 'post',
        data: dataObject
    })
    .done(function(data){
      if(data.state === 0){
        me.updateProgramResult[currentCanId] = 'yes'
      }else{
        me.updateProgramResult[currentCanId] = 'No'
      }
      if (dataObject.canId <= start) {
        $buttonDOM.text('更新').removeClass('disabled');
        noty({text: '更新完成，请查看结果', type: 'info', layout: 'topRight', timeout: 4000})
        me.$node.find('#viewUpdateResult').removeClass('hide');
      }
    })
    .fail(function(){
      if (dataObject.canId <= start) {
        $buttonDOM.text('更新').removeClass('disabled');
        noty({text: '更新完成，请查看结果', type: 'info', layout: 'topRight', timeout: 4000});
        me.$node.find('#viewUpdateResult').removeClass('hide');
      }
      me.updateProgramResult[currentCanId] = 'No'
    })
  },
  addKeyboard : function($node){
    var me = this;
    $node.find('input.has-keyboard').keypad('init', {
      type: 'IP'
    });
    $node.find('input.has-keyboard-type-http').keypad('init', {
      type: 'http'
    });
    $node.find('input.has-keyboard-normal').keypad('init', {

    })
  },
  getAppVersion: function(){
    var me = this;
    me.server({
      url: '/system/version',
      method: 'get'
    })
    .done(function(data){
      var app = data.app,
          tag = app.tag,
          commit = app.commit,
          SGSCom = data.SGSCom,
          buildTime = data.buildTime,
          $box = me.$node.find('#appVersion');
      $box.find('.app_version').text(tag);
      $box.find('.sgscom_version').text(SGSCom);
      $box.find('.commit_id').text(commit);
      $box.find('.build_time').text(buildTime);

    })
  },
  getSubmitFields : function(){
    var fields = [];

    var state = this.$node.pagestate('getState');

    switch(state){
      case 0 :
        fields = ['#ip', '#netmask', '#gateway', '#isAutoIp'];
        break;
      case 1 :
        fields = ['#time', '#syncMasterTime'];
        break;
      case 2 :
        fields = ['#boxname', '[name="isMaster"]', '#isApplicationMachine'];
        break;
      case 3 :
        fields = ['#externalEndpointWsdl'];
        break;
      case 4 :
        fields = ['#hardwareCanId'];
        break;
      case 5 :
        fields = ['#update_app_url', '#update_app_password'];
        break;
      case 6 :
        fields = ['#restartType', '#restartTime'];
        break;
      case 8 :
        fields = ['#enteringQuality', '#loadingQuality'];
        break;
      case 9 :
        fields = ['#clusterSize'];
        break;
      case 10 :
        fields = ['#gun', '#bullet'];
        break;
      case 11 :
        fields = ['#isMqttServer', '#mqttUrl', '#enableRemotePanel'];
        break;
      case 12:
        fields = ['#facePerception'];
        break;
      case 13:
        fields = ['#faceMaxRotateAngle', '#minLoginFaceSize', '#faceFuzzyThreshold', '#faceBrightThreshold', '#faceMatchThreshold'];
        break;
      case 14:
        fields = ['#quickApplication', '#disableSignature', '#adminSignature'];
        break;
      case 15:
        fields = [];
        break;
      case 16:
        fields = ['#showCount', '#includeLocalCabinet', '#showGateSwitch', '#enableCam', '#enableAlcohol', '#needMaintainCount', '#enableRemoteAlarm', '#enableFaceLog',
          '#enableApproveSign', '#enableFetchList'];
        break;
      case 17:
        fields = [];
        break;
      case 18:
        fields = ['#title1', '#title2'];
        break;
      case 19:
        fields = ['#enableOverTime'];
        break;
      case 20:
        fields = ['#openBatch', '#onlyFetch', '#adminCreateApp', '#enableABGun'];
        break;
      case 21:
        fields = ['#storageTime'];
        break;
      case 22:
        fields = [];
        break;
      case 23:
        fields = [];
        break;
      case 24:
        fields = [];
        break;
      case 25:
        fields = ['#lockCabinet'];
        break;
      case 26:
        fields = ['#ieDownloadUrl'];
        break;
      case 27:
        fields = ['#videosDownloadUrl'];
        break;
      case 28:
        fields = ['#productId'];
        break;
      case 29:
        fields = [];
        break;
      case 30:
        fields = ['#videoRecordType', '#reportLogTitle'];
        break;
    }
    return fields;
  },
  getSettings : function(){
    var me = this;
    var notyInst = null;

    this.server({
      url : [metadata.endpoint, 'settings'].join('/'),
      beforeSend : function(){
        notyInst = noty({text: '正在获取设置', type: 'info', layout: 'topRight', timeout: 3000});
      }
    })
    .done(function(data){
      var $editform = me.$node.find('form');
      var pairs = [];
      me.editings = data;
      _.each(data, function(rec){
        if(rec.key === 'isAutoIp' || rec.key === 'isMaster'){
          if(rec.value === 'false'){
            rec.value  = false;
          }else{
            rec.value = true;
          }
        }

        rec = _.pick(rec, ['key', 'value']);
        pairs.push(_.values(rec));
      });
      var formData = _.fromPairs(pairs);
      $editform.formwork('refresh', formData);
      noty({text: '获取设置成功', type: 'success', timeout:3000, layout: 'topRight'});
    })
    .fail(function(err){
      log.debug(err);
      noty({text: '获取设置失败', type: 'error', timeout: 3000, layout: 'top'});
    })
    .always(function(){
      notyInst.close();
    })
  },

  initFormwork: function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    me.formwork = $editform
      .formwork({
        namespace: metadata.NS, //use current comp's name as namespace
        fields: {
          "#ip": {
            name: "ip",
            init: function() {
              // $(this).inputmask({alias: 'ip', autoUnmask :true, placeholder: ''});
            },
            validate: function() {
              log.debug("Handling ip validate event");
              var isAutoIp = $node.find("#isAutoIp").is(":checked");
              if (!isAutoIp) {
                if ($(this).val() === "") {
                  log.debug("ip invalid");
                  return "IP地址不能为空";
                } else {
                  // $(this).inputmask('unmaskedvalue');
                  if (validator.isIP($(this).val())) return null;
                  else return "IP地址不合法";
                }
              }
            }
          },
          "#update_app_password": {
            name: "update_app_password"
          },
          "#hardwareCanId": {
            name: "hardwareCanId"
          },
          "#update_app_url": {
            name: "update_app_url"
          },
          "#syncMasterTime": {
            name: "syncMasterTime",
            refresh: function(value, data) {
              if (value === "true") {
                $(this)
                  .prop("checked", "checked")
                  .attr("checked", "checked");
              } else {
                $(this)
                  .prop("checked", null)
                  .attr("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#netmask": {
            name: "netmask",
            validate: function() {
              log.debug("Handling netmask validate event");
              var isAutoIp = $node.find("#isAutoIp").is(":checked");
              if (!isAutoIp) {
                if ($(this).val() === "") {
                  log.debug("netmask invalid");
                  return "子网掩码地址不能为空";
                } else {
                  return null;
                }
              }
            }
          },
          "#gun": {
            name: "gun",
            validate: function() {
              var val = $(this).val();
              if (!val) {
                return "控制数不能为空!";
              }
              return null;
            }
          },
          "#bullet": {
            name: "bullet",
            validate: function() {
              var val = $(this).val();
              if (!val) {
                return "控制数不能为空!";
              }
              return null;
            }
          },
          "#gateway": {
            name: "gateway",
            validate: function() {
              log.debug("Handling gateway validate event");
              var isAutoIp = $node.find("#isAutoIp").is(":checked");
              if (!isAutoIp) {
                if ($(this).val() === "") {
                  log.debug("gateway invalid");
                  return "默认网关地址不能为空";
                } else {
                  return null;
                }
              }
            }
          },
          '#productId': {
            name: 'productId',
            refresh: function(value, data) {
              if (value) {
                $(this).val(value);
              }
            },
            validate: function() {
              if ($(this).val() === '') {
                return '柜机ID不能为空';
              }
              return null;
            }
          },
          "#time": {
            name: "time",
            init: function() {
              var $me = $(this);
              var objID = $me.attr("id");
              var $modal = $('<div class="' + objID + '">')
                .appendTo($node)
                .flexmodal({ IsSureBtn: true })
                .on("shown.bs.modal" /*Bootstrap event*/, function(e) {
                  $node.find(".time-box").datetimepicker({
                    locale: "zh-CN",
                    format: "YYYY-MM-DD HH:mm",
                    sideBySide: true,
                    inline: true,
                    defaultDate: new Date()
                  });
                })
                .on("onOk", function() {
                  var timeValue = $modal.find(".time-box").data().date;
                  $me.val(timeValue);
                  $modal.flexmodal("modalHide");
                });
              $(this).on("click", function() {
                $modal.flexmodal("show", {
                  modalTitle: "请选择时间"
                });
              });
            },
            refresh: function(value, data) {
              if (!value) {
                value = new Date();
              }
              // $(this).data("DateTimePicker").date(moment(value).format('YYYY-MM-DD HH:mm'));
              $(this).val(moment(value).format("YYYY-MM-DD HH:mm"));
            },
            validate: function() {
              if ($(this).val() === "") {
                return "时间不能为空";
              }
            }
          },
          "#moduleTypeName": {
            name: "moduleTypeName",
            init: function() {
              me.typeIdURL = '/gunType?sort={"localId":"desc"}';
              var $modal = $("<div/>")
                .appendTo($node)
                .flexmodal()
                .on("shown.bs.modal" /*Bootstrap event*/, function(e) {
                  var $node = $(e.target);
                  var $list = $node
                    .find(".type-list")
                    .on("click", "li", function(e) {
                      var $node = $(e.currentTarget);
                      var type = $node.data("type");
                      var typeName = $node.data("name");
                      $modal.flexmodal("modalHide");

                      if (type === 'gun') {
                        me.typeIdURL = '/gunType?sort={"localId":"desc"}';
                      } else if (type === 'bullet') {
                        me.typeIdURL = '/bullettype?sort={"localId":"desc"}';
                      }

                      $editform.find("#typeIdName").val('');
                      $editform.find('#typeId').val('');
                      $editform.find('#typeIdNameClear').addClass('hide');

                      // 对应input填写数据
                      if (type) {
                        $editform.find("#moduleTypeName").val(typeName);
                        $editform.find("#moduleType").val(type);
                        $editform
                          .find("#moduleTypeNameClear")
                          .removeClass("hide");
                      }

                      // 根据类型展示还是隐藏模块
                      if (typeName === '枪支模块') {
                        $editform.find('.capacityBox').addClass('hide');
                      } else {
                        $editform.find('.capacityBox').removeClass('hide');
                      }
                    })
                    .on("afterUpdate", function() {});
                });
              $editform.on("click", "#moduleTypeNameClear", function (e) {
                e.preventDefault();
                $editform.find("#moduleTypeName").val(null);
                $editform.find("#moduleType").val(null);
                $editform.find("#moduleTypeNameClear").addClass("hide");
              });

              $(this).on("click", function() {
                $modal.flexmodal(
                  "show",
                  { modalTitle: "请选择存放的枪支类型" },
                  require("./moduleList.jade")
                );
              });
            }
          },
          '#canIdStartAt': {
            name: 'canIdStartAt',
            init: function() {
              $node.off('click').on('click', '#canIdStartAtClear', function (e) {
                e.preventDefault();
                $editform.find('#canIdStartAt').val('');
              })
            }
          },
          '#moduleIdStartAt': {
            name: 'moduleIdStartAt',
            init: function() {
              $node.off('click').on('click', '#moduleIdStartAtClear', function(e) {
                e.preventDefault();
                $editform.find('#moduleIdStartAt').val('');
              })
            }
          },
          '#moduleCounts': {
            name: 'moduleCounts',
            init: function () {
              $node.off('click').on('click', '#moduleCountsClear', function (e) {
                e.preventDefault();
                $editform.find('#moduleCounts').val('');
              })
            }
          },
          '#canCounts': {
            name: 'canCounts',
            init: function () {
              $node.off('click').on('click', '#canCountsClear', function (e) {
                e.preventDefault();
                $editform.find('#canCounts').val('');
              })
            }
          },
          '#capacity': {
            name: 'capacity',
            init: function() {
              $node.off('click').on('click', '#capacityClear', function (e) {
                e.preventDefault();
                $editform.find('#capacity').val('');
              })
            }
          },
          "#typeIdName": {
            name: "typeIdName",
            init: function() {
              var $modal = $("<div/>")
                .appendTo($node)
                .flexmodal()
                .on("shown.bs.modal" /*Bootstrap event*/, function(e) {
                  var $node = $(e.target);
                  var $list = $node
                    .find(".type-list")
                    .on("click", "li", function(e) {
                      var $node = $(e.currentTarget);
                      $modal.flexmodal("modalHide");
                      var type = $node.data("id");
                      var typeName = $node.data("name");
                      if (type) {
                        $editform.find("#typeIdName").val(typeName);
                        $editform.find("#typeId").val(type);
                        $editform
                          .find("#typeIdNameClear")
                          .removeClass("hide");
                      }
                    })
                    .on("afterUpdate", function() {})
                    .list({
                      source: {
                        url: me.typeIdURL
                      },
                      limit: 5,
                      innerTpl: require("./type.jade"), // A compiled jade template,
                      renderFn: null // How to render body
                    });
                  $list.list("show");
                });

              $node.on("click", "#typeIdNameClear", function(e) {
                e.preventDefault();
                $editform.find("#typeIdName").val(null);
                $editform.find("#typeId").val(null);
                $editform
                  .find("#typeIdNameClear")
                  .addClass("hide");
              });

              $(this).on("click", function() {
                $modal.flexmodal(
                  "show",
                  { modalTitle: "请选择存储类型" },
                  require("./typelist.jade")
                );
              });
            }
          },
          "#title1": {
            name: "title1",
            refresh: function(value, data) {
              $(this).val(value);
            }
          },
          "#title2": {
            name: "title2",
            refresh: function(value) {
              $(this).val(value);
            }
          },
          "#restartType": {
            name: "restartType",
            init: function() {
              var $me = $(this);
              var $modal = $("<div/>")
                .appendTo($node)
                .flexmodal()
                .on("shown.bs.modal" /*Bootstrap event*/, function(e) {
                  log.debug("Open Selection ");
                  var $node = $(e.target);
                  var $list = $node
                    .find(".type-list")
                    .empty()
                    .on("click", "li", function(e) {
                      var $node = $(e.currentTarget);
                      var data = $node.data("name");
                      $me.val(data);
                      $("#restartTime").removeClass("hide");
                      $("#restartTime").val("");
                      switch (data) {
                        case "按每月":
                          $(".restartItem1").removeClass("hide");
                          $(".restartItem2").addClass("hide");
                          $(".restartItem3").addClass("hide");
                          break;
                        case "按星期":
                          $(".restartItem1").addClass("hide");
                          $(".restartItem2").removeClass("hide");
                          $(".restartItem3").addClass("hide");
                          break;
                        case "按天":
                          $(".restartItem1").addClass("hide");
                          $(".restartItem2").addClass("hide");
                          $(".restartItem3").removeClass("hide");
                          break;
                      }
                      $modal.flexmodal("modalHide");
                    })
                    .list({
                      source: {
                        data: [
                          { name: "按每月" },
                          { name: "按星期" },
                          { name: "按天" }
                        ]
                      },
                      innerTpl: restartType, // A compiled jade template,
                      renderFn: null // How to render body
                    });
                  $list.list("show");
                  $modal.find(".inner-loading").addClass("hide");
                });
              $(this).on("click", function() {
                $modal.flexmodal(
                  "show",
                  {
                    modalTitle: "请选择类型"
                  },
                  require("./typelist.jade")
                );
              });
            },
            refresh: function(value) {
              $(this).val(value);
              switch (value) {
                case "按每月":
                  $("#restartTime").removeClass("hide");
                  $(".restartItem1").removeClass("hide");
                  $(".restartItem2").addClass("hide");
                  $(".restartItem3").addClass("hide");
                  break;
                case "按星期":
                  $("#restartTime").removeClass("hide");
                  $(".restartItem1").addClass("hide");
                  $(".restartItem2").removeClass("hide");
                  $(".restartItem3").addClass("hide");
                  break;
                case "按天":
                  $("#restartTime").removeClass("hide");
                  $(".restartItem1").addClass("hide");
                  $(".restartItem2").addClass("hide");
                  $(".restartItem3").removeClass("hide");
                  break;
              }
            }
          },
          "#restartTime": {
            name: "restartTime",
            init: function() {
              var $me = $(this);
              $(this).on("click", function() {
                var localType = $node.find("#restartType").val();
                var format = "YYYY-MM-DD HH:mm";
                switch (localType) {
                  case "按每月":
                    format = "YYYY-MM-DD HH:mm";
                    break;
                  case "按星期":
                    format = "YYYY-MM-DD E HH:mm";
                    break; //
                  case "按天":
                    format = "HH:mm";
                    break;
                }
                var $modal = $("<div/>")
                  .appendTo($node)
                  .flexmodal({ IsSureBtn: true })
                  .on("shown.bs.modal" /*Bootstrap event*/, function(e) {
                    $node.find(".time-box").datetimepicker({
                      locale: "zh-CN",
                      format: format,
                      sideBySide: true,
                      inline: true,
                      defaultDate: new Date()
                    });
                  })
                  .on("onOk", function() {
                    if (localType == "按每月") {
                      var monthtime = $modal.find(".time-box").data().date;
                      var mt = monthtime.split("-");
                      var timeValue = mt.slice(2);
                      $me.val(timeValue);
                      $modal.flexmodal("modalHide");
                    } else if (localType == "按星期") {
                      var weektime = $modal.find(".time-box").data().date;
                      var tv = weektime.split(" ");
                      tv.shift();
                      var timeValue = tv.join(" ");
                      $me.val(timeValue);
                      $modal.flexmodal("modalHide");
                    } else {
                      var timeValue = $modal.find(".time-box").data().date;
                      $me.val(timeValue);
                      $modal.flexmodal("modalHide");
                    }
                  });
                $modal.flexmodal("show", {
                  modalTitle: "请选择时间"
                });
              });
            }
          },
          "#boxname": {
            name: "boxname",
            validate: function() {
              var val = $(this).val();
              if (val === "") {
                return "名称不能为空";
              }
            }
          },
          "#externalEndpointWsdl": {
            name: "externalEndpointWsdl",
            validate: function() {
              var val = $(this).val();
              if (val === "") {
                return "接口地址不能为空";
              }
            }
          },
          '#ieDownloadUrl': {
            name: 'ieDownloadUrl',
            refresh: function (value, data) {
              if (value) {
                $(this).val(value);
              }
            },
            validate: function() {
              var val = $(this).val();
              if (val === '') {
                return '下载地址不能为空';
              }
            }
          },
          '#videosDownloadUrl': {
            name: 'videosDownloadUrl',
            refresh: function(value, data) {
              if (value) {
                $(this).val(value);
              }
            },
            validate: function() {
              var val = $(this).val();
              if (val === '') {
                return '下载地址不能为空';
              }
            }
          },
          "#minDutyTime": {
            name: "minDutyTime",
            validate: function() {
              var val = $(this).val();
              if (val === "") {
                return "小时数不能为空";
              }
              if (!validator.isInt(val, { min: 1, max: 99 })) {
                return "借出小时必须是整数，并且大于一个小时，小于99小时";
              }
              return null;
            }
          },
          "#isAutoIp": {
            name: "isAutoIp",
            init: function() {
              $(this)
                .off("click")
                .on("click", function() {
                  var $this = $(this);
                  if ($this.prop("checked") === true) {
                    me
                      .server({
                        url: "/system/ipAddress"
                      })
                      .done(function(data) {
                        log.debug(data);
                        var ip = data.address,
                          netmask = data.netmask;
                        $node
                          .find("input#ip")
                          .val(ip)
                          .css({
                            "pointer-events": "none",
                            backgroundColor: "#4c4267"
                          });
                        $node
                          .find("input#netmask")
                          .val(netmask)
                          .css({
                            "pointer-events": "none",
                            backgroundColor: "#4c4267"
                          });
                        $node
                          .find("input#gateway")
                          .val("")
                          .css({
                            "pointer-events": "none",
                            backgroundColor: "#4c4267"
                          });
                      });
                  } else {
                    $node
                      .find("input#ip")
                      .removeAttr("style")
                      .val("");
                    $node
                      .find("input#netmask")
                      .removeAttr("style")
                      .val("");
                    $node.find("input#gateway").removeAttr("style");
                  }
                });
            },
            refresh: function(value, data) {
              if (value === true) {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#isMqttServer": {
            name: "isMqttServer",
            init: function() {
              var $mqttUrlInput = $node.find(".mqttUrl_input");
              $node
                .find(".isMqttServer-checkbox")
                .off("click")
                .on("click", function() {
                  if ($node.find("#isMqttServer").prop("checked")) {
                    $mqttUrlInput.addClass("opacity0");
                  } else {
                    $mqttUrlInput.removeClass("opacity0");
                  }
                });
            },
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
                $node.find(".mqttUrl_input").addClass("opacity0");
              } else {
                $(this).prop("checked", null);
                $node.find(".mqttUrl_input").removeClass("opacity0");
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            },
            validate: function(value, data) {
              if (value) {
                $node.find("#mqttUrl").val("");
              }
            }
          },
          "#lockCabinet": {
            name: "lockCabinet",
            refresh: function (value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function (value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#mqttUrl": {
            name: "mqttUrl",
            refresh: function(value, data) {
              $(this).val(value);
            }
          },
          "#facePerception": {
            name: "facePerception",
            refresh: function(value, data) {
              var $this = $(this);
              if (value == "true") {
                $this.prop("checked", "checked");
              } else {
                $this.prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          '#enableFaceLog': {
            name: "enableFaceLog",
            val: function (value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            },
            refresh: function (value, data) {
              var $this = $(this);
              if (value == "true") {
                $this.prop("checked", "checked");
              } else {
                $this.prop("checked", null);
              }
            }
          },
          '#enableFetchList': {
            name: 'enableFetchList',
            val: function(value, data) {
              if ($(this).prop('checked')) {
                return true;
              }
              return false;
            },
            refresh: function(value, data) {
              var $this = $(this);
              if (value == 'true') {
                $this.prop('checked', 'checked');
              } else {
                $this.prop('checked', null);
              }
            }
          },
          '#enableApproveSign': {
            name: 'enableApproveSign',
            val: function(value, data) {
              if ($(this).prop('checked')) {
                return true;
              }
              return false;
            },
            refresh: function(value, data) {
              var $this = $(this);
              if (value == 'true') {
                $this.prop('checked', 'checked');
              } else {
                $this.prop('checked', null);
              }
            }
          },
          "#quickApplication": {
            name: "quickApplication",
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            },
            refresh: function(value, data) {
              var $this = $(this);
              if (value == "true") {
                $this.prop("checked", "checked");
              } else {
                $this.prop("checked", null);
              }
            }
          },
          "#enteringQuality": {
            name: "enteringQuality",
            refresh: function(value, data) {
              if (!value) {
                value = 20;
              }
              $(this).val(value);
            },
            validate: function() {
              var val = $(this).val();
              if (val === "") {
                return "登陆值不能为空";
              } else if (val < 20) {
                return "录入值最低值为20";
              } else if (val > 49) {
                return "录入值最大值为49";
              }
            }
          },
          "#loadingQuality": {
            name: "loadingQuality",
            refresh: function(value, data) {
              if (!value) {
                value = 9;
              }
              $(this).val(value);
            },
            validate: function() {
              var val = $(this).val();
              if (val === "") {
                return "登陆值不能为空";
              } else if (val < 9) {
                return "登陆值最低值为9";
              } else if (val > 49) {
                return "登陆值最大值为49";
              }
            }
          },
          "#clusterSize": {
            name: "clusterSize",
            refresh: function(value, data) {
              if (value) {
                $(this).val(value);
              }
            },
            validate: function() {
              var val = $(this).val();
              if (val === "") {
                return "集群数不能为空";
              }
              return null;
            }
          },
          '[name="isMaster"]': {
            name: "isMaster",
            refresh: function(value, data) {
              if (data.isMaster) {
                $editform
                  .find("#isMaster")
                  .prop("checked", "checked")
                  .attr("checked", "checked");
              } else {
                $editform
                  .find("#isNotMaster")
                  .prop("checked", "checked")
                  .attr("checked", "checked");
              }
            },
            validate: function() {
              if ($(this).val() === "") {
                log.debug("Status invalid");
                return "状态不能为空";
              } else {
                return null;
              }
            }
          },
          "#faceMaxRotateAngle": {
            name: "faceMaxRotateAngle",
            refresh: function(value, data) {
              if (value) {
                $(this).val(value);
              } else {
                $(this).val(15);
              }
            },
            validate: function() {
              var val = $(this).val();
              if (val <= 0 || val >= 45) {
                return "角度范围在 0 ~ 45 之间";
              }
            }
          },
          "#minLoginFaceSize": {
            name: "minLoginFaceSize",
            refresh: function(value, data) {
              if (value) {
                $(this).val(value);
              } else {
                $(this).val(150);
              }
            },
            validate: function() {
              var val = $(this).val();
              if (val <= 0 || val >= 1080) {
                return "最小人脸范围 0 ~ 1080";
              }
            }
          },
          "#faceFuzzyThreshold": {
            name: "faceFuzzyThreshold",
            refresh: function(value, data) {
              if (value) {
                $(this).val(value);
              } else {
                $(this).val(80);
              }
            },
            validate: function() {
              var val = $(this).val();
              if (val <= 10 || val >= 200) {
                return "清晰度范围 80 ~ 200";
              }
            }
          },
          "#faceBrightThreshold": {
            name: "faceBrightThreshold",
            refresh: function(value, data) {
              if (value) {
                $(this).val(value);
              } else {
                $(this).val(12);
              }
            },
            validate: function() {
              var val = $(this).val();
              if (val <= 0 || val >= 50) {
                return "人脸暗度范围 0 ~ 50";
              }
            }
          },
          "#faceMatchThreshold": {
            name: "faceMatchThreshold",
            refresh: function(value, data) {
              if (value) {
                $(this).val(value);
              } else {
                $(this).val(70);
              }
            },
            validate: function() {
              var val = $(this).val();
              if (val <= 50 || val >= 90) {
                return "人脸匹配度范围 50 ~ 90";
              }
            }
          },
          "#includeLocalCabinet": {
            name: "includeLocalCabinet",
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#showCount": {
            name: "showCount",
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          '#enableRemoteAlarm': {
            name: 'enableRemoteAlarm',
            refresh: function (value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function (value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#showGateSwitch": {
            name: "showGateSwitch",
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#enableCam": {
            name: "enableCam",
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#openBatch": {
            name: "openBatch",
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          '#enableABGun':  {
            name: 'enableABGun',
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }            
          },
          '#adminCreateApp': {
            name: 'adminCreateApp',
            refresh: function (value, data) {
                if (value === "true") {
                  $(this).prop("checked", "checked");
                } else {
                  $(this).prop("checked", null);
                }
              },
              val: function (value, data) {
                if ($(this).prop("checked")) {
                  return true;
                } else {
                  return false;
                }
              }
          },
          '#onlyFetch': {
            name: 'onlyFetch',
            refresh: function (value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function (value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#enableOverTime": {
            name: "enableOverTime"
          },
          "#enableRemotePanel": {
            name: "enableRemotePanel",
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#needMaintainCount": {
            name: "needMaintainCount",
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#enableAlcohol": {
            name: "enableAlcohol",
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          "#disableSignature": {
            name: "disableSignature",
            refresh: function(value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function(value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }
          },
          '#adminSignature': {
            name: 'adminSignature',
            refresh: function(value, data) {
              if (value === 'true') {
                $(this).prop('checked', 'checked');
              } else {
                $(this).prop('checked', null);
              }
            },
            val: function(value, data) {
              if ($(this).prop('checked')) {
                return true;
              } else {
                return false;
              }
            }
          },
          '#isApplicationMachine': {
            name: 'isApplicationMachine',
            refresh: function (value, data) {
              if (value === "true") {
                $(this).prop("checked", "checked");
              } else {
                $(this).prop("checked", null);
              }
            },
            val: function (value, data) {
              if ($(this).prop("checked")) {
                return true;
              } else {
                return false;
              }
            }       
          },
          "#alarmCheckedAll": {
            name: "alarmCheckedAll",
            init: function() {
              var $this = $(this);
              me.getAlarmConfig();
              $this.off("click").on("click", function() {
                if ($this.prop("checked")) {
                  $node.find(".alaramList input").prop("checked", true);
                } else {
                  $node.find(".alaramList input").prop("checked", false);
                }
              });
            }
          },
          "#applyToAll": {
            name: "applyToAllAction"
          },
          '#storageTime': {
            name: 'storageTime',
            validate: function() {
              var picValue = me.$node.find('#pic').val();
              var videoValue = me.$node.find('#video').val();
              if (!picValue) {
                return '图片存储时间不能为空';
              } else if (!videoValue) {
                return '视频存储时间不能为空';
              }
              console.log(!_.isNumber(+picValue), +videoValue);
              if (!_.isNumber(+picValue)) {
                return '图片存储天数必须为数值';
              } else if (!_.isNumber(+videoValue)) {
                return '视频存储天数必须为数值';
              } else {
                var newValue = {
                  pic: picValue,
                  video: videoValue
                }
                $(this).val(JSON.stringify(newValue));
              }
            }
          },
          '#reportLogTitle': {
            name: 'reportLogTitle',
            refresh: function(value, data) {
              $(this).val(value);
            },
            validate: function() {
              var val = $(this).val();
              if (!val) {
                return '下载日志抬头不能为空！';
              } else {
                return null;
              }
            }
          },
          '#videoRecordTypeText': {
            name: 'videoRecordTypeText',
            init: function() {
              var $me = $(this);
              var $modal = $("<div/>")
                .appendTo($node)
                .flexmodal()
                .on("shown.bs.modal" /*Bootstrap event*/, function(e) {
                  log.debug("Open Selection ");
                  var $node = $(e.target);
                  var $list = $node
                    .find(".type-list")
                    .empty()
                    .on("click", "li", function(e) {
                      var $node = $(e.currentTarget);
                      var data = $node.data("name");
                      var id = $node.data('id');
                      $me.val(data);
                      me.$node.find('#videoRecordType').val(id);
                      $modal.flexmodal("modalHide");
                    })
                    .list({
                      source: {
                        data: [
                          { name: "无", id: null },
                          { name: "图片", id: 'pic' },
                          { name: "视频", id: 'video' }
                        ]
                      },
                      innerTpl: require('./videoRecordType.jade'), // A compiled jade template,
                      renderFn: null // How to render body
                    });
                  $list.list("show");
                  $modal.find(".inner-loading").addClass("hide");
                });
              $(this).on("click", function() {
                $modal.flexmodal(
                  "show",
                  {
                    modalTitle: "请选择类型"
                  },
                  require("./typelist.jade")
                );
              });
            }
          },
          '#videoRecordType': {
            name: 'videoRecordType',
            refresh: function(value, data) {
              $(this).val(value);
              var $videoRecordTypeText = me.$node.find('#videoRecordTypeText');
              if (!value) {
                $videoRecordTypeText.val('无');
              } else if (value === 'pic') {
                $videoRecordTypeText.val('照片');
              } else if (value === 'video') {
                $videoRecordTypeText.val('视频');
              }
            }
          }
          //
        }
      })
      .on(metadata.NS + ".form.validate.valid", function(e) {
        log.debug("Handling form validate event valid");
        $editform.formwork("submit");
      })
      .on(metadata.NS + ".form.validate.error", function(e, errors) {
        log.debug("Handling form validate event error");
        noty({
          text: __("Something is wrong").replace("%s", errors.join(",")),
          type: "error",
          timeout: 3000
        });
      })
      .on(metadata.NS + ".form.submit", function(e, data) {
        var fields = me.getSubmitFields();
        if (fields[0] === "#gun") {
          me.fetchController(data, fields);
        } else {
          me.submit(data);
        }
      })
      .formwork("init");
  },
  fetchController: function (data, fields) {
    console.log('######### this is fetch controller############', fields, data)
    var me = this;
    var settings = _.pickBy(data, function(v, k){
      var has = _.some(fields, function(f){
        return f && (f.indexOf(k) >= 0);
      });
      return has;
    });

    me.server({
      url: '/system/modulecount',
      method: 'POST',
      data: settings
    })
    .done(function (data) {
      if(data.state === 0){
        noty({text: '更新成功', type: 'success', layout:'topRight', timeout: 3000});
      }else{
        noty({text: '更新失败', type: 'error', layout: 'top'});
      }
    })
    .fail(function () {
        noty({text: '修改设置失败', type: 'error', timeout:2000, layout: 'topRight'});
    })
  },
  submit : function(data){
    log.debug('Change New Settings', data);
    if(!data)return;
    var $node = this.$node;
    if(data.isAutoIp){
      delete data.ip;
      delete data.netmask;
      delete data.gateway;
    }
    var me = this;

    var fields = me.getSubmitFields();
    if(!fields.length){
      return;
    }
    var isChangeCabinet = fields[0].indexOf('boxname') > 0,
        isChangeTime = fields[0].indexOf('time') > 0,
        isUpdateApplication = fields[0].indexOf('update_app_url') > 0,
        isAlarmConfig = fields[0].indexOf('enableOverTime') > 0,
        isUpdateProgram = fields[0].indexOf('hardwareCanId') > 0;

    if (isAlarmConfig) {
      me.submitAlarmConfig();
      return;
    }

    if(isUpdateApplication || isUpdateProgram){
      noty({text: '点击更新按钮，进行更新无需保存！', type: 'success', timeout: 3000, layout: 'topRight'});
      return;
    }
    if(!!isChangeCabinet){
      var url = '/cabinet/updatesettings';
    }else{
      var url = [metadata.endpoint, 'updatesettings'].join('/');
    }

    var notyInst = null,
        settings = _(data).pickBy(function(v, k){
          var has = _.some(fields, function(f){
            return f && (f.indexOf(k) >= 0);
          });
          return has;
        }).map(
          function(value, key){
            return {key : key, value : value};
          }
        ).value();

    if(!settings || settings.length == 0)return;

    me.server({
      url: url,
      method: 'POST',
      data: { settings: settings },
      dataType: 'json',
      beforeSend : function(){
        var notyInst = null;
        if(!isChangeTime){
          notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
        }else{
          pubsub.publish('autologout.stop');
        }
        $node.find('#sureUpdateButton a').addClass('disabled');
      },
      timeout: 10000
    })
    .done(function(data){
      noty({text: '修改设置成功', type: 'success', timeout:null, layout: 'topRight'});
      me.closeNoty();
      me.getSystemSetData();
    })
    .fail(function(err){
      log.debug(err,'-------');
      noty({text: '修改设置失败', type: 'error', timeout:2000, layout: 'topRight'});
    })
    .always(function(){
      $node.find('#sureUpdateButton a').removeClass('disabled');
      if(isChangeTime){
        pubsub.publish('autologout.start');
      }
    })
  },
  getSystemSetData: function () {
    $.ajax({
      url: '/system/settings',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    .done(function(data) {
      var systemSetData = {};
      _.forEach(data, function(item) {
        if (item.value === 'true') {
          item.value = true
        } else if (item.value === 'false') {
          item.value = false
        }
        _.set(systemSetData, item.key, item.value);
      });
      window.localStorage.setItem('systemSetData', JSON.stringify(systemSetData));
    });
  },
  closeNoty: function () {
    var $node = this.$node;
    setTimeout(function () {
      $('#noty_topRight_layout_container').remove();
    }, 1000)
  },
  getAlarmConfig: function() {
    var me = this;
    me.server({
      url: '/system/alarmConfig',
      dataType: 'JSON'
    })
    .done(function(data){
      console.log(data, '获取报警设置成功');
      _.each(data, function(value, key) {
        me.checkedAlarmCheckbox(key, value)
      })
    })
    .fail(function() {
      console.log('获取报警设置失败')
    })
  },
  checkedAlarmCheckbox: function(key, value) {
    var $input = $('#' + key);
    console.log(key, value)
    if ($input.length) {
      if (key !== 'applyToAll') {
        if (value === 'true') {
          $input.prop('checked', true)
        } else {
          $input.prop('checked', false)
        }
      }
      
    }
  },
  setAllAlarmConfig: function() {
    var me = this;
    me.server({
      url: '/system/alarmConfig',
      method: 'post',
      data: {applyToAll: true}
    })
    .done(function(data) {
      var text = '';
      if (data && data.failed && data.failed.length) {
        text = '总数：' + data.total + ', 设置成功数量: ' + data.succeed.length + ', 设置失败数量：0, </br>失败柜机：';
        _.each(data.failed, function(item) {
          text += item + ', ';
        })
        noty({text: text, type: 'error', timeout:6000, layout: 'top'});
      } else if (data && data.succeed) {
        text = '总数：' + data.total + ', 设置成功数量: ' + data.succeed.length + ', 设置失败数量：0';
        noty({text: text, type: 'success', timeout:4000, layout: 'top'});
      } else {
        noty({text: '设置成功', type: 'success', timeout: 2000, layout: 'topRight'});
      }
      me.$node.find('#alarmOpenBtn').addClass('hide');
    })
    .fail(function(error) {
      if (error && error.responseJSON && error.responseJSON.message) {
        noty({text: error.responseJSON.message, type: 'error', timeout:2000, layout: 'top'});
      } else {
        noty({text: '修改设置失败', type: 'error', timeout:2000, layout: 'top'});
      }      
    })
  },
  restartHandle: function(type) {
    var me = this;
    this.server({
      url: '/system/restart?type=' + type
    })
    .done(function(data) {
      noty({text: '重启命令请求成功, 请等待一分钟！', type: 'success', layout: 'top', timeout: 2000});
      me.speak('restartApp');
      setTimeout(function() {
        window.location.href = '/m/home';
      }, 2000);
    })
    .fail(function(err) {
      if (err && err.responseJSON && err.responseJSON.error) {
        noty({
          text: err.responseJSON.error,
          type: 'error',
          layout: 'top',
          timeout: 2000
        });
      } else {
        noty({text: '操作失败', type: 'error', layout: 'top', timeout: 2000});
      }
    });
  },
  submitAlarmConfig: function() {
    var me = this;
    var inputList = me.$node.find('.alaramList input');
    var data = {};

    var applyToAll = me.$node.find('#applyToAll').prop('checked');
    data['applyToAll'] = applyToAll;
    inputList.each(function(index, item) {
      var $item = $(item),
          key = $item.attr('id');

      data[key] = $item.prop('checked');

    });
    
    me.server({
      url: '/system/alarmConfig',
      method: 'post',
      data: data
    })
    .done(function(data) {
      noty({text: '设置成功', type: 'success', timeout: 2000, layout: 'topRight'});
      me.$node.find('#alarmOpenBtn').removeClass('hide');
    })
    .fail(function(error) {
      noty({text: '修改设置失败', type: 'error', timeout:2000, layout: 'top'});
    })
  },
  handleRestUUID: function() {
    this.server({
      url: '/system/resetUUID'
    })
    .done(function() {
      noty({text: '重置成功', type: 'success', layout: 'topRight', timeout: 2000});
    })
    .fail(function(err) {
      var responseJSON = err && err.responseJSON;
      var error = responseJSON && responseJSON.msg ? responseJSON.msg : (responseJSON && responseJSON.code ? responseJSON.code : '重置UUID失败');
      noty({text: error, type: 'error', timeout: 2000, layout: 'top'});
    });
  },
}

_.extend(SystemManagement.prototype, prototype);
module.exports = SystemManagement;
/**
SystemManagement module end
*/
