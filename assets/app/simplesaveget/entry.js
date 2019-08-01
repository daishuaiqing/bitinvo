/*
  simpleapplicationget module 获取武器模块
*/
var indexTpl = require('./index.jade');
var server = require('common/server').server;
var vprocessbar = require('vprocessbar');
var taskbar = require('taskbar');
var simpleAppHeader = require('simpleappheader');
var pubsub = require('PubSubJS');
var loginForm = require('loginform');
var countdown = require('countdown');
var user = require("common/usermanagement");
var noty = require('customnoty');
var keypad = require('keypad');
var indexCss = require('./less/index.less');
var monitor = require('monitor');
var autoNext = require('autoNext');
var standarLogin = require('standarLogin');
// var i18n = require('locales/zh-CN.json');

var SimpleSaveGet = function (reg) {
  reg.apply(this);
  return this;
}

var metadata = {
  NS: 'simplesaveget',
  pub: [],
  endpoint: '/optlog'
}

_.extend(SimpleSaveGet, metadata);

var prototype = {
  init: function () {
    console.log('init simplesaveget entry');
    var me = this;
    //定义一个接收上一个app的数据对象
    var previousAppData = me.getFlashbag();
    if(previousAppData){
      if(!previousAppData.hasOwnProperty('topic')){
        previousAppData = JSON.stringify(previousAppData);
        sessionStorage.setItem('PREVAPPDATA', previousAppData);
      }
    }
    previousAppData = sessionStorage.getItem('PREVAPPDATA');
    previousAppData = JSON.parse(previousAppData);
    me.PREVAPPDATA = previousAppData;

    //定义一个传递给下一个app的数据对象
    me.NEXTAPPDATA = {
      "jobType": this.PREVAPPDATA.jobType,
      "applicantName": me.PREVAPPDATA.applicantName,
      "applicantToken": me.PREVAPPDATA.applicantToken,
      "applicantSuperior": null,
      "applicantId": me.PREVAPPDATA.applicantId,
      "appId": null,    //工单id,非直接授权需要
      "newApplicationInfo": {
        "flatType": null,
        "detail": null
      },
      "processList": [],
      "applicantUsername": me.PREVAPPDATA.applicantUsername,
      "applicantAllInfo": me.PREVAPPDATA.applicantAllInfo,
      "facePerception": me.PREVAPPDATA.facePerception

    }

    //定义一个存储当前状态的app对象
    me.CURRENTSTATE = {
      "loginType": null,
      "hasNetworking": false,         //默认为没有联网
      "jobState": null,
      "applicantToken": null,
      "isStopScan": true            //用来判断否要请求停止指纹扫描
    }

    // 检测是否要开启监控
    me.checkedWebCam();

  },
  show: function ($node, cb) {
    var me = this;

    $node.append(indexTpl());

    var isShowExitTips = false;
    // 用来记录是否为第一步
    me.isFirstStep = true;

    //添加头部组件
    $node.find('.simple-app_header')
    .simpleAppHeader('show', function(){
      if (me.isFirstStep) {
        me.changeRouteSetFlashBag("/m/simpleapplication");
        return;
      }

      if (isShowExitTips) return;
      isShowExitTips = true;

      //点击返回按钮跳转到上一个app页面
      noty({
        text: "返回将退出流程,是否继续?",
        type: "info",
        layout: "top",
        timeout: null,
        buttons: [
          {
            addClass: "btn btn-empty big",
            text: __('buttonText').sureBtn,
            onClick: function($noty) {
              me.changeRouteSetFlashBag("/m/simpleapplication");
              $noty.close();
            }
          },
          {
            addClass: "btn btn-empty big",
            text: __('buttonText').cancelBtn,
            onClick: function($noty) {
              $noty.close();
            }
          }
        ],
        callback: {
          onClose: function() {
            isShowExitTips = false;
          }
        }
      });
    });

    //加载取枪的步骤，判断是不是现场授权跳转过来的
    var isSiteAuth = me.getStateData('prev', 'isSiteAuth');
    if(isSiteAuth) {
      me.loadSaveGetModule(1)
    }else{
      me.loadSaveGetModule(0);
    }

    cb();
  },
  addKeyBoard: function () {
    this.$node.find('input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    });
  },
  loadSaveGetModule: function (currentStep) {
    var me = this,
        $node = me.$node,
        jobType = me.getStateData('prev', 'jobType');

    me.currentStep = currentStep || 0;
    me.steps = [
      {
        name: __('simplesaveget').steps.authentication,
        id: 'resetUserAuthTitle',
        actions: [],
        onShown: function ($node, next, application) {
          // me.loadLoginMoule();
          me.initLoginModule();
        }
      },
      {
        // 工单信息
        name: __('simplesaveget').steps.appInfo,
        actions: [
          { name: __('buttonText').nextBtn, target: function(){ $node.triggerHandler('triggerStepNext')}, className: 'hide', id: 'workOrderInfoButton' }
        ],
        onShown: function($node, next) {
          me.isFirstStep = false;
          me.$node.find('#signin').removeClass('disabled');
          // 进行人脸验证取消
          // me.faceStopscan();

          // 初始化监控
          if (me.getStateData('curr', 'isWebCam')) {
            me.$monitor = me.$node.find('.monitor-container');
            me.$monitor.monitor('init');
          }

          //检测是否联网模式
          me.checkHasNetwork(me.CURRENTSTATE);
          if(jobType === 'returnGun') {
            me.checkAuthorization()
            .done(function(data) {
              $node.find("#workOrderInfoButton").removeClass('hide');
              var showInfo = me.getJobShowInfo(data),
                  html = require('./returnJade.jade')({
                    info: showInfo,
                    i18n: __('checkedAppTips'),
                  });
              $node.find('.right-major').html(html);

              //检测点击下一个
              $node
              .off('triggerStepNext')
              .on('triggerStepNext', function() {
                //把data传递给下一步
                next(data);
              });
            })
            .fail(function (data) {
              var ip, cabinetName;
              console.log('########## This is checkout returnGun fail ################', data)
              // 是否是跨柜机工单
              var errorText = '';
              if (data && (typeof data.statusText !== 'undefined') && (data.statusText === 'timeout')) {
                var html = require('./timeout.jade')({
                  i18n: __('checkedAppTips')
                });
                $node.find('.right-major').html(html);
                return;
              }

              try {
                var errorObject = JSON.parse(data.responseText);
                errorText = errorObject.error
                ip = errorObject.ip;
                cabinetName = errorObject.name;
              } catch(e) {
                console.log('simpleasaveget at 178 json解析失败');
              }

              $node.find("#workOrderInfoButton").addClass('hide');
              var html = require('./noreturngun.jade')({
                ip: ip,
                cabinetName: cabinetName,
                text: errorText,
                i18n: __('checkedAppTips')
              });

              $node.find('.right-major').html(html);
              $node.find('#return-btn').on('click', function(){
                me.changeRouteSetFlashBag('/m/simpleapplication');
              });

            })
          }else if(jobType === 'returnBullet') {
            me.checkAuthorization()
            .done(function(data){
              $node.find("#workOrderInfoButton").removeClass('hide');
              var showInfo = me.getJobShowInfo(data),
                  html = require('./returnJade.jade')({
                    info: showInfo,
                    i18n: __('checkedAppTips'),
                  });

              $node.find('.right-major').html(html);

              //检测点击下一个
              $node
              .off('triggerStepNext')
              .on('triggerStepNext', function() {
                //把data传递给下一步
                next(data);
              });
            })
            .fail(function(data){
              var errorText = '', ip, cabinetName;
              // 处理超时的情况
              if (data && (typeof data.statusText !== 'undefined') && (data.statusText === 'timeout')) {
                var html = require('./timeout.jade')({
                });
                $node.find('.right-major').html(html);
                return;
              }

              try {
                var errorObject = JSON.parse(data.responseText);
                errorText = errorObject.error;
                ip = errorObject.ip;
                cabinetName = errorObject.name;
              } catch(e) {
                console.log('json解析失败');
              }

              $node.find("#workOrderInfoButton").addClass('hide');
              var html = require('./noreturngun.jade')({
                text: errorText,
                ip: ip,
                cabinetName: cabinetName,
                i18n: __('checkedAppTips')
              });
              $node.find('.right-major').html(html);
              $node.find('#return-btn').on('click', function(){
                me.changeRouteSetFlashBag('/m/simpleapplication');
              });

            });

          } else if (jobType === 'returnMaintain') {
            me.checkAuthorization()
            .done(function (data) {
              $node.find("#workOrderInfoButton").removeClass('hide');
              var isNeedMaintainCount = me.checkedNeedMaintainCount();

              // 如果不需要输入数量直接进入下一步
              if (!me.checkedNeedMaintainCount()) {
                next(data);
                me.returnMaintainGunNumber = null;
                return; 
              }

              var html = require('./returnMaintain.jade')({
                i18n: __('checkedAppTips')
              });

              $node.find('.right-major').html(html);

              me.addKeyBoard();
              //检测点击下一个
              $node
              .off('triggerStepNext')
              .on('triggerStepNext', function() {
                var value = $node.find('#returnGunNum').val();
                if (!value) {
                  return noty({text: '维护归还枪支数不能为空', type: 'error', layout: 'top', timeout: 2000});
                } else if ((Number.isNaN(Number(value)))) {
                  return noty({text: '请输入数值', type: 'error', layout: 'top', timeout: 2000})
                }

                // 记录openall需要的gun num
                me.returnMaintainGunNumber = value;
                //把data传递给下一步
                next(data);
              });
            })
            .fail(function (data) {
              if (data && (typeof data.statusText !== 'undefined') && (data.statusText === 'timeout')) {
                var html = require('./timeout.jade')({
                });
                $node.find('.right-major').html(html);
                return;
              }

              $node.find("#workOrderInfoButton").addClass('hide');
              var html = require('./noreturngun.jade')({
                text: "您没有需要还的维护枪",
                i18n: __('checkedAppTips')
              });
              $node.find('.right-major').html(html);
              $node.find('#return-btn').on('click', function(){
                me.changeRouteSetFlashBag('/m/simpleapplication');
              });
            })
          } else if (jobType === 'maintain') {
            me.maintainCheck()
            .done(function (data) {
              if (data && data.application && data.application.remote ) {
                if (data.application.remoteStatus === 'pending') {
                  // 远程领导未审核情况
                  $node.find('.right-major').html(require('./error.jade')({
                    error: __('checkedAppTips').remoteAdminNotReview
                  }));
                  return;
                }
                
                if (data.application.remoteStatus === 'rejected') {
                  // 远程领导拒绝的情况
                  $node.find('.right-major').html(require('./error.jade')({
                    error: __('checkedAppTips').remoteAdminReject
                  }));
                  return;
                }
              }

              $node.find('#workOrderInfoButton').removeClass('hide');
              var showInfo = me.getJobShowInfo(data);

              var html = require('./gridcell.jade')({
                info: showInfo,
                i18n: __('checkedAppTips')
              });
              $node.find('.right-major').html(html);

              $node
              .off('triggerStepNext')
              .on('triggerStepNext', function () {
                next(data);
              })
            })
            .fail(function (data) {
              var ip, cabinetName;
              if (data && (typeof data.statusText !== 'undefined') && (data.statusText === 'timeout')) {
                var html = require('./timeout.jade')({
                  i18n: __('checkedAppTips')
                });
                $node.find('.right-major').html(html);
                return;
              }
              //没有工单隐藏下一步
              $node.find("#workOrderInfoButton").addClass('hide');

              var jsonData = JSON.parse(data.responseText);
              //获取工单status，默认为没有工单。
              if (!jsonData.error) {
                type = jsonData.application.status;
                // 如果processList 的长度大于1，需要多人授权
                if (jsonData.application.processList && jsonData.application.processList.length > 1 && type !== 'rejected') {
                  type = 'pendingMore'
                }
                me.setStateData('next', 'processList', jsonData.application.processList);
              } else {
                type = 'noJob';
              }

              if (type === 'noJob') {
                if (jsonData.type === 'notLocalApplication') {
                  ip = jsonData.ip;
                  cabinetName = jsonData.name;
                  type = 'notLocalApplication';
                  me.speak('noApplicationCrossCabine');
                } else {
                  me.speak('noApplication');
                }
              } else if(type === 'rejected') {
                me.speak('applicationrejected');
              } else {
                me.speak('noApplicationReview');
              }

              //没有工单提示创建工单，并显示创建工单按钮
              var html = require('./noapplication.jade')({
                type: type,
                ip: ip,
                name: name,
                errorObject: jsonData,
                i18n: __('checkedAppTips')
              });
              $node.find('.right-major').html(html);
              ////点击创建工单按钮，跳转到simplecreateapplication
              $node.find('#apply-btn')
              .on('click', function(){
                // if (!(me.user.hasPermission('manage-cabinet') || me.user.hasPermission('view-app') || me.user.hasPermission('manage-system'))) {
                //   if ($(this).data('buttontype') === 'noJob') {
                //     return noty({text: '非管理员无法维护枪支', type: 'error', layout: 'top', timeout:2000});
                //   }
                // }
                var type = $(this).data('type');
                if(type === 'pending' || type === "pendingMore"){
                  //如果待审核的工单，则记录工单的id
                  me.setStateData('next', 'newApplicationInfo.detail', jsonData.application.detail);
                  me.setStateData('next', 'newApplicationInfo.flatType', jsonData.application.flatType);
                  me.setStateData('next', 'appId', jsonData.application.id);
                  me.changeRouteSetFlashBag('/m/simpleapplicationauth');
                }else if(type === 'noJob' || type === 'rejected'){
                  me.changeRouteSetFlashBag('/m/simplecreateapplication');
                }
              });

            });

          } else {
            //取枪子弹、存枪子弹工单检测
            me.checkedApplication()
            .done(function(data) {

              console.log('检测工单信息－－－　取操作:', data)
              if (data && data.application && data.application.remote ) {
                if (data.application.remoteStatus === 'pending') {
                  // 远程领导未审核情况
                  $node.find('.right-major').html(require('./error.jade')({
                    error: __('checkedAppTips').remoteAdminNotReview
                  }));
                  return;
                } else if (data.application.remoteStatus === 'rejected') {
                  // 远程领导拒绝的情况
                  $node.find('.right-major').html(require('./error.jade')({
                    error: __('checkedAppTips').remoteAdminReject
                  }));
                  return;
                }
              }

              // 审核通过的情况

              $node.find("#workOrderInfoButton").removeClass('hide');
              var showInfo = me.getJobShowInfo(data),
                  html = require('./gridcell.jade')({
                    info: showInfo,
                    i18n: __('checkedAppTips'),
                  });
              $node.find('.right-major').html(html);

              if (jobType === 'gun') {
                me.setStateData('curr', 'gunId', data.application.gun)
              }

              //检测点击下一个
              $node
              .off('triggerStepNext')
              .on('triggerStepNext', function() {
                //把data传递给下一步
                next(data);
              })
            })
            .fail(function(data) {
              var ip, cabinetName;
              // request timeout
              if (data && (typeof data.statusText !== 'undefined') && (data.statusText === 'timeout')) {
                var html = require('./timeout.jade')({
                  i18n: __('checkedAppTips')
                });
                $node.find('.right-major').html(html);
                return;
              }

              //没有工单隐藏下一步
              $node.find("#workOrderInfoButton").addClass('hide');

              var jsonData = JSON.parse(data.responseText);
              //获取工单status，默认为没有工单。
              if (!jsonData.error) {
                if (!jsonData.application) {
                  return noty({text: '服务器错误', type: 'error', layout: 'top', timeout: null});
                }
                type = jsonData.application.status;
                // 如果processList 的长度大于1，需要多人授权
                if (jsonData.application.processList && jsonData.application.processList.length > 1 && type !== 'rejected') {
                  type = 'pendingMore'
                }
                me.setStateData('next', 'processList', jsonData.application.processList);
              } else {
                type = 'noJob';
              }

              if (type === 'noJob') {
                if (jsonData.type === 'notLocalApplication'){
                  ip = jsonData.ip;
                  cabinetName = jsonData.name;
                  type = 'notLocalApplication';
                  me.speak('noApplicationCrossCabine');
                } else {
                  me.speak('noApplication');
                }
              } else if(type === 'rejected') {
                me.speak('applicationrejected');
              } else {
                me.speak('noApplicationReview');
              }
              //没有工单提示创建工单，并显示创建工单按钮
              var html = require('./noapplication.jade')({
                ip: ip,
                cabinetName: cabinetName,
                type: type,
                errorObject: jsonData,
                i18n: __('checkedAppTips')
              });
              $node.find('.right-major').html(html);
              ////点击创建工单按钮，跳转到simplecreateapplication
              $node.find('#apply-btn')
              .on('click', function(){
                log.debug('%### not application, go created application button ###########################%', jobType)
                if (jobType !== 'storageBullet' && jobType !== 'storageGun') {
                  
                  if ((me.user.hasPermission('manage-cabinet') || me.user.hasPermission('view-app')) && !me.user.hasPermission('manage-system')) {
                    if ($(this).data('buttontype') === 'noJob') {
                      // 判断系统设置是否开启了管理可以取枪的操作
                      if (!me.checkedIsAdminCreatedApp()) {
                        return noty({
                          text: __('checkedAppTips').adminNotCreatedApp,
                          type: 'error',
                          layout: 'top',
                          timeout: 2000
                        });
                      }
                    }
                  }
                }
                var type = $(this).data('type');
                if(type === 'pending' || type === "pendingMore"){
                  //如果待审核的工单，则记录工单的id
                  me.setStateData('next', 'newApplicationInfo.detail', jsonData.application.detail);
                  me.setStateData('next', 'newApplicationInfo.flatType', jsonData.application.flatType);
                  me.setStateData('next', 'appId', jsonData.application.id);
                  me.changeRouteSetFlashBag('/m/simpleapplicationauth');
                }else if(type === 'noJob' || type === 'rejected'){
                  me.changeRouteSetFlashBag('/m/simplecreateapplication');
                }
              });
            });

          }
        }
      },
      {
        name: (__('simplesaveget').steps.adminAuthorize),
        id: 'adminAuthorization',
        actions: [
          // { name:'取消', target: function(){ me.changeRouteSetFlashBag('/m/simpleapplication') } },
          {
            name: __('buttonText').prevBtn,
            target: function () {
              me.goPreStep()
            },
            className: 'step-go'
          }
        ],
        onShown: function($node, next, application){
  
          me.initAdminLoginModule(application, me.goNextStep);
          // me.adminVerify(data, me.goNextStep);
        }
      },
      {
        name: (__('simplesaveget').steps.getGun),
        id: 'changeableStep',
        actions: [
          {
            name: __('buttonText').openAccessControlDoor,
            target: function () {
              me.openOrgDoor()
            },
            className: 'hide',
            id: 'orgDoorBtn'
          },
          // { name: '关闭仓门', target: function(){ me.goNextStep();  } }
        ],
        onShown: function($node, next, application){
          var data = application,
              _type = me.getStateData('prev', 'jobType');
          me.doorEvent = pubsub.subscribe('system.message', function(topic, message){
            if(message.topic === "DoorEvent"){
              if(message.msg === "DoorOpened"){
                $('.taskbar .finish-btn').removeClass('hide');
                pubsub.unsubscribe(me.doorEvent);
              }
            }
          });
          console.log(me.checkedShowGateSwitch(), '###############开启门禁')
          if (me.checkedShowGateSwitch()) {
            // 自动开启门禁,如果失败了再显示开启门禁按钮
            me.openOrgDoor();
          }

          switch (_type) {
            case 'gun':
              me.successAuthorizedGetGun(data);
              break;
            case 'bullet':
              me.successAuthorizedGetBullet(data);
              break;
            case 'returnGun':
              me.successAuthorizedReturnGun(data);
              break;
            case 'returnBullet':
              me.successAuthorizedReturnBullet(data);
              break;
            case 'storageBullet':
              me.successAuthorizedSaveBullet(data);
              break;
            case 'storageGun':
              me.successAuthorizedSaveGun(data);
              break;
            case 'emergency':
              me.successAuthorizedEmergency(data);
              break;
            case 'maintain':
              me.successAuthorizedMaintain(data);
              break;
            case 'returnMaintain':
              me.successAuthorizedReturnMaintain(data);
              break;
          }

          // 弹出一个遮罩提示是否关门的提示框
          me.$node.find('.autoUpdateAppBox').autoNext('show')
          .off('error')
          .on('error', function() {
            console.log('####### 没有开门，保持工单状态 ########');
            me.changeRouteSetFlashBag('/m/simpleapplication');
          })
          .off('success')
          .on('success', function() {
            console.log('#### 开门成功，执行关闭仓门操作 ####');
            // me.goNextStep();
            me.markAppProcessed();
            if (_type === 'returnGun') {
              me.markGunStatus();
            }
            me.changeRouteSetFlashBag('/m/simpleapplication');
          });
        }
      }
    ];

    me.goPreStep = function(data){
      if(me.currentStep > 0){
        me.currentStep -= 1;
        me.displayStep(data);
      }
    };
    me.goNextStep = function(data){
      if(me.currentStep < me.steps.length){
        me.currentStep += 1;
        me.displayStep(data);
      }
    };

    var leftMenuItems = _.map(me.steps, function(step){
      if(step.id && (step.id === 'changeableStep')){
        step.name = me.changeApplicationStepText();
      }
      // 重新设置警员验证的title
      if (step.id && (step.id === 'resetUserAuthTitle')) {
        console.log('################# step.name', me.resetUserAuthTitle())
        step.name = me.resetUserAuthTitle();
      }
      return { name: step.name, target: 'javascript:void(0)', id: step.id};
    });

    me.displayStep = function(data){
      if(me.currentStep == me.steps.length) return;

      var step = me.steps[me.currentStep],
          jobType = me.getStateData('prev', 'jobType');
      $node.find('.leftmenu').vProcessBar('show', me.currentStep, leftMenuItems);

      $node.find('.taskbar').taskbar().taskbar('show', step.actions);
      $node.find('.right-major').empty();
      step.onShown($node, _.bind(me.goNextStep, me), data);
    }
    me.displayStep();
  },
  // 开启门禁
  openOrgDoor: function() {
    var me = this,
        username = me.getStateData('prev', 'applicantUsername') || me.getStateData('next', 'applicantUsername'),
        userId = me.getStateData('curr', 'applicantId') || me.getStateData('prev', 'applicantId'),
        alias = me.getStateData('prev', 'applicantName') || me.getStateData('next', 'applicantName'),
        applicantToken = me.getStateData('prev', 'applicantToken') || me.getStateData('curr', 'applicantToken');
    this.server({
      url: '/cabinetmodule/opengate',
      method: 'post',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
      },
      data: {
        username: username,
        userId: userId,
        alias: alias
      }
    })
    .done(function(data) {
      noty({text: '库房门已打开', type: 'success', layout: 'topRight', timeout: 3000});
    })
    .fail(function(error) {
      var errObj = null;
      $('#orgDoorBtn').removeClass('hide');
      if (error.responseText) {
        errObj = JSON.parse(error.responseText)
      } else {
        errObj = {error: '开启库房门失败'}
      }
      noty({text: errObj.error, type: 'error', layout: 'top', timeout: 3000});
    })
  },
  initAdminLoginModule: function(application, goNextStep) {
    var me = this;
    var $node = me.$node;
    var $module = $node.find('.right-major');
    var applicantToken = me.getStateData('prev', 'applicantToken') || me.getStateData('curr', 'applicantToken');

    $module.standarLogin('show', {
      isAdmin: true,
      face: {
        adminAjaxConfig: {
          url: '/application/adminauthbyFace',
          method: 'POST',
          data: application,
          beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
          }
        }
      },
      password: {
        adminAjaxConfig: {
          url: '/application/adminauth',
          method: 'POST',
          dataType: 'json',
          data: application,
          beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
          }
        }
      },
      fingerprint: {
        ajaxConfig: {
          url: '/application/adminauthbyfingerprint',
          method: 'post',
          dataType: 'json',
          data: application,
          beforeSend: function(xhr) {
            xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
          }
        }
      }
    });

    $module
    .off('loginSuccess').on('loginSuccess', function(e, data) {
      me.speak('admin_finger');
      // 如果登录成直接进入下一流程
      goNextStep(application);
    });
  },
  resetUserAuthTitle: function () {
    var type = this.getStateData('prev', 'jobType');
    var typeText = '';
    switch (type) {
      case 'gun':
        typeText = __('simplesaveget').steps.getGunUser;
        break;
      case 'returnGun':
        typeText = __('simplesaveget').steps.returnGunUser;
        break;
      case 'returnBullet':
        typeText = __('simplesaveget').steps.returnBulletUser;
        break;
      case 'bullet':
        typeText = __('simplesaveget').steps.getBulletUser;
        break;
      case 'storageGun':
        typeText = __('simplesaveget').steps.storageGunUser;
        break;
      case 'storageBullet':
        typeText = __('simplesaveget').steps.storageBulletUser;
        break;
      case 'emergency':
        typeText = __('simplesaveget').steps.emergencyOpenUser;
        break;
      case 'maintain':
        typeText = __('simplesaveget').steps.maintainUser;
        break;
      case 'returnMaintain':
        typeText = __('simplesaveget').steps.returnMaintainUser;
        break;
    }
    return typeText;
  },
  changeApplicationStepText: function(){
    var type = this.getStateData('prev', 'jobType');
    switch (type) {
      case 'gun':
        return __('appTypeText').gun;
      case 'bullet':
        return __('appTypeText').bullet;
      case 'returnBullet':
        return __('appTypeText').returnBullet;
      case 'returnGun':
        return __('appTypeText').returnGun;
      case 'storageGun':
        return __('appTypeText').storageGun;
      case 'storageBullet':
        return __('appTypeText').storageBullet;
      case 'emergency':
        return __('appTypeText').emergency;
      case 'maintain':
        return __('appTypeText').maintain;
      case 'returnMaintain':
        return __('appTypeText').returnMaintain;
    }

  },
  //获取工单显示信息
  getJobShowInfo: function (data) {
    var jobType = this.getStateData('prev', 'jobType'),
        showInfo = {
          isHide : ''
        };
    showInfo.cabinetName = data.application.cabinet.name;
    switch (jobType) {
      case 'gun':
        showInfo.type = '取枪';
        break;
      case 'bullet':
        showInfo.type = '取子弹';
        break;
      case 'storageGun':
        showInfo.type = '存枪';
        showInfo.isHide = 'hide';
        break;
      case 'storageBullet':
        showInfo.type = '存子弹';
        showInfo.isHide = 'hide';
        break;
      case 'emergency':
        showInfo.type = '紧急开启';
        break;
      case 'returnGun':
        showInfo.type = '还枪';
        break;
      case 'returnBullet':
        showInfo.type = '还子弹';
        break;
      case 'maintain':
        showInfo.type = '维护枪支';
        break;
      case 'returnMaintain':
        showInfo.type = '还维护枪支';
        break;
    }
    showInfo.detail = data.application.detail;
    
    if (data.application.num) {
      showInfo.num = data.application.num;
    }

    return showInfo;
  },
  //获取检测工单请求的URL
  getCheckedApplicationURl: function (){
    var url = null,
        jobType = this.getStateData('prev', 'jobType');
    switch (jobType) {
      case 'storageGun':
        url = '/application/storageCheck/gun?populate=applicant';
        break;
      case 'storageBullet':
        url = '/application/storagecheck/bullet?populate=applicant';
        break;
      case 'gun':
        url = '/application/check?populate=applicant';
        break;
      case 'bullet':
        url = '/application/checkbullet?populate=applicant';
        break;
      case 'returnGun':
        url = '/application/returnguncheck?populate=applicant';
        break;
      case 'returnBullet':
        url = '/application/returnbulletcheck?populate=applicant';
        break;
      case 'emergency':
        url = '/application/emergencycheck?populate=applicant';
        break;
      case 'maintain':
        url = '/application/maintainCheck?populate=applicant';
        break;
      case 'returnMaintain':
        url = '/application/returnmaintaincheck?populate=applicant';
        break;
    };
    return url + '&v=' + new Date().getTime();
  },
  destroyStandarLogin: function() {
    var $module = this.$node.find('.right-major');
    if ($module.length) {
      $module.standarLogin('destroy');
    }
  },
  // 新的登录模块
  initLoginModule: function() {
    var me = this;
    var $module = me.$node.find('.right-major');

    $module.standarLogin('show', {
      isAdmin: false,
      password: {
        isNoSession: true,
      },
      fingerprint: {
        ajaxConfig: {
          url: '/fingerprint/auth'
        }
      }
    });

    $module
    .off('loginSuccess').on('loginSuccess', function(e, data) {
      console.log('身份验证成功 => ', data);
        //指纹登录成功后，记录申请人的名字
        me.setStateData('next', 'applicantName', data.alias);
        me.setStateData('next', 'applicantUsername', data.username);
        me.setStateData('curr', 'applicantUsername', data.username);
        
        //记录申请人的token
        me.setStateData('next', 'applicantToken', data.token);
        //在当前状态页记录申请人的token
        me.setStateData('curr', 'applicantToken', data.token);


        //记录申请人的superior
        me.setStateData('next', 'applicantSuperior', data.superior);

        //记录申请人的id
        me.setStateData('next', 'applicantId', data.id);
        me.setStateData('curr', 'applicantId', data.id);
        
        // 记录申请人的所有信息
        me.setStateData('next', 'applicantAllInfo', data)
       
        //登录成功后跳转页面
        me.setloginSuccessLoadModule();
    })
    .off('loginError').on('loginError', function(e, data) {
      console.log('身份验证失败 =>');
    });
  },
  setloginSuccessLoadModule: function () {
    var me = this;
    //登录成功后进行拍照
    // me.loginPhotograph();
    me.goNextStep();
  },
  //检测取枪弹，存枪弹的工单
  checkedApplication: function () {
    var me = this,
        d = $.Deferred(),
        conf = null,
        url = me.getCheckedApplicationURl(),
        isSiteAuth = me.getStateData('prev', 'isSiteAuth'),
        applicantToken =  me.getStateData('curr', 'applicantToken') || me.getStateData('prev', 'applicantToken');

    //判断是否为现场授权，跳转过来的
      conf = {
        url: url,
        beforeSend: function (xhr) {
          xhr.setRequestHeader('onemachine', true);
          xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
        },
        timeout: 5000
      }
    server(conf)
    .done(function (data) {
      me.setStateData('curr', 'cabinetName', data.application.cabinet.name)
      me.setStateData('curr', 'cabinetId', data.application.cabinet.id);
      d.resolve(data);
    })
    .fail(function(data) {
      var responseJSON = data.responseJSON;
      if (!responseJSON.error) {
        if (responseJSON.application && responseJSON.application.processList === null) {
          me.remoteProcessList(responseJSON.application);
        }
      }
      d.reject(data);
    });
    return d.promise();
  },
  remoteProcessList: function(application) {
    var user = this.getStateData('next', 'applicantAllInfo');
    server({
      url: '/application/remoteProcessList',
      method: 'POST',
      data: {
        user: user,
        application: application
      }
    })
    .done(function(data) {
      var $applyBtn = $('#apply-btn');
      var oldText = $applyBtn.text();
      $applyBtn.addClass('disabled');
      $applyBtn.empty().append('<div class="loader">');

      pubsub.unsubscribe('processListCreated')
      pubsub.subscribe('processListCreated', function(topic, value) {
        if (value.status === 'fail') {
          noty({text: '审核人列表出错', type: 'error', layout: 'top', timeout: 3000});
        }
        $applyBtn.empty().html('<h2>' + oldText + '</h2>').removeClass('disabled');
      });

      setTimeout(function() {
        $applyBtn.removeClass('hide');
      }, 5000);

      console.log('This is API: /applicantion/remoteProcessList SUCCESS', data)
    })
    .fail(function(error) {
      console.log('This is API: /applicantion/remoteProcessList FAIL', error)
    })
  },
  maintainCheck: function () {
    var d = $.Deferred(),
        me = this,
        url = me.getCheckedApplicationURl(),
        method = 'GET',
        dataType = 'json',
        notyInst = null,
        applicantToken = me.getStateData('prev', 'applicantToken') || me.getStateData('curr', 'applicantToken');
    server({
      url: url,
      method: method,
      dataType: dataType,
      timeout: 4000,
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
        xhr.setRequestHeader('onemachine', true);
        noty({text: '正在检测授权', type: 'info', layout: 'topRight'});
      }
    }).done(function (data) {
      noty({text: '成功', type: 'success', layout: 'topRight', timeout:5000});
      me.setStateData('curr', 'cabinetId', data.application.cabinet.id);
      me.setStateData('curr', 'cabinetName', data.application.cabinet.name)
      if (data && data.application && data.user) {
        d.resolve(data)
      } else {
        d.reject(data)
      }
    })
    .fail(function (err) {
      log.debug(err);
      d.reject(err);
    })
    return d.promise();
  },
  //检测授权（还枪、子弹）
  checkAuthorization: function () {
    var d = $.Deferred(),
        me = this,
        url = me.getCheckedApplicationURl(),
        method = 'GET',
        dataType = 'json',
        notyInst = null,
        applicantToken = me.getStateData('prev', 'applicantToken') || me.getStateData('curr', 'applicantToken');

    server({
      url: url,
      method: method,
      dataType: dataType,
      timeout: 4000,
      beforeSend : function(xhr){
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
        xhr.setRequestHeader('onemachine', true);
        noty({text: '正在检查授权', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      noty({text: '成功', type: 'success', timeout:5000, layout: 'topRight'});
      if (data.application.cabinet) {
        me.setStateData('curr', 'cabinetId', data.application.cabinet.id);
        me.setStateData('curr', 'cabinetName', data.application.cabinet.name)
      } else {
        noty({text: '工单中没有柜机信息', type: 'error', layout: 'top', timeout: 3000});
      }
      if(data && data.application && data.user){
        d.resolve(data);
      }else{
        d.reject(data);
      }
    })
    .fail(function(err){
      log.debug(err);
      if(err && err.responseJSON.error == '该枪锁堵转禁止操作'){
        noty({text: err.responseJSON.error, type: 'error', timeout:5000, layout: 'topRight'});
      }
      d.reject(err);
    });

    return d.promise();
  },
  ////////////////////////////////////////////////成功后的操作
  successAuthorizedGetGun: function(data){
    var me = this,
        $node = me.$node,
        application = data.application,
        cabinet = application.cabinet;
      if(cabinet){
        me.open(application);
        me.speak('withdrawing');
        var module = {
          id: application.cabinetModule,
          type: application.flatType
        };

        //记录下module
        me.setStateData('curr', 'module', module);
        //记录下application
        me.setStateData('curr', 'application', data.application);
      }
      else{
        noty({text: '配枪没有枪位信息，请确认是否存入', type: 'error', layout: 'top', timeout:5000});
      }
  },
  successAuthorizedGetBullet: function(data){
    var me = this,
        $node = me.$node,
        application = data.application;
    me.speak('takeBullet');
    me.open(application);

    var module = {
      id: application.cabinetModule.id,
      type: application.flatType
    }

    //记录下module
    me.setStateData('curr', 'module', module);
    //记录下application
    me.setStateData('curr', 'application', application);
  },
  successAuthorizedReturnGun: function(data){
    var me = this,
        $node = me.$node
        application = data.application;

    if(application.gun){
      if(application.cabinet){
        me.open(application);
        //记录下application
        me.setStateData('curr', 'application', application);
      }
      else{
        noty({text: '无法获取枪支的枪位', type: 'error', layout: 'top', timeout:5000});
      }
    }else{
      var html = require('./nogun.jade');
      $node.find('.right-major').html(html);
      $node.on('click', '#cancel-gun-btn', function(){
        me.pagestate('setState', 0);
      });
    }
  },
  successAuthorizedReturnBullet: function(data){
    var me = this,
        $node = me.$node,
        application = data.application,
        cabinetModule = data.application.cabinetModule;

    if (cabinetModule) {
      me.open(application);
      //记录下application
      me.setStateData('curr', 'application', application);
    }else{
      noty({text: '无法获取仓位', type: 'error', layout: 'top', timeout:5000});
    }
  },
  successAuthorizedSaveGun: function(data){
    var me = this,
        $node = me.$node,
        html = null;
    me.doorEvent = pubsub.subscribe('system.message', function(topic, message){
      if(message.topic === "DoorEvent"){
        if(message.msg === "DoorOpened"){
          $('.taskbar .finish-btn').removeClass('hide');
          pubsub.unsubscribe(me.doorEvent);
        }
      }
    });
    me.openall(data);
    //记录下application
    me.setStateData('curr', 'application', data.application);
  },
  successAuthorizedSaveBullet: function(data){
    var me = this,
        $node = me.$node;
    me.openall(data);
    //记录下application
    me.setStateData('curr', 'application', data.application);
  },
  successAuthorizedEmergency: function(data){
    var me = this,
        $node = me.$node;
    me.openall(data);
    //记录下application
    me.setStateData('curr', 'application', data.application);
  },
  successAuthorizedMaintain: function (data) {
    var me = this,
      $node = me.$node;
    me.openall(data);
    me.setStateData('curr', 'application', data.application);
  },
  successAuthorizedReturnMaintain: function (data) {
    var me = this,
      $node = me.$node;
    me.openall(data);
    me.setStateData('curr', 'application', data.application);
  },
  //点击完成改变枪支的状态
  markGunStatus : function(){
    var me = this,
        application = me.getStateData('curr', 'application'),
        applicantToken = me.getStateData('prev', 'applicantToken') || me.getStateData('curr', 'applicantToken');
    if(application.gun){
      me.server({
        url: '/gun/in',
        method: 'POST',
        data : { gunId: application.gun },
        beforeSend: function (xhr) {
          xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
        }
      }) //authorizations of getting gun
      .done(function(data){
        log.debug(data);
        noty({text: '枪支状态已经更新', type: 'success', timeout:5000, layout: 'topRight'});
      })
      .fail(function(err){
        log.debug(err);
        me.showError('操作命令发送失败');
      });
    } else {
      noty({text: '没有枪支ID,枪支状态更改失败', type: 'error', layout: 'top', timeout: 3000});
    }
  },
  //点击完成改变工单状态
  markAppProcessed : function(){
    var me = this;
    var application = me.getStateData('curr', 'application');
    var type = me.getStateData('prev', 'jobType');
    var status = 'complete';

    if (type === 'gun' || type === 'bullet' || type === 'maintain') {
      status = 'processed';
    }

    me.server({
      url: '/application/status',
      method: 'PUT',
      data : { applicationId: application.id, status: status },
      beforeSend : function(xhr){
        xhr.setRequestHeader('onemachine', true);
      }
    }) //authorizations of getting gun
    .done(function(data){
      log.debug(data);
      noty({text: '申请状态已经更新', type: 'success', timeout:5000, layout: 'topRight'});
    })
    .fail(function(err){
      noty({text: '申请状态更改失败', type: 'error', timeout: 5000, layout: 'top'});
      log.debug(err);
    });
  },
  openall : function(application){
    log.debug('Opening Cabine Door and Module');
    var me = this,
        cabinetId = me.getStateData('curr', 'cabinetId'),
        method = '',
        url = '/peer/' + cabinetId + '/cabinetmodule/openall',
        method = 'POST',
        dataType = 'json',
        notyInst = null,
        isSiteAuth = me.getStateData('prev', 'isSiteAuth'),
        applicantToken = me.getStateData('prev', 'applicantToken') || me.getStateData('curr', 'applicantToken'),
        jobType = me.getStateData('prev', 'jobType'),
        localCabinetIsMaster = me.getStateData('curr', 'localCabinetIsMaster');

    // 如果不是master，则不用peer请求
    if (!localCabinetIsMaster) {
      url = '/cabinetmodule/openall';
    } else {
      console.log('@@@@@@@@@ application @@@@@@@@@', application)
      var _application = application;
      if (application && application.application) {
        _application = application.application;
      }
      if (_application && _application.cabinet && _application.cabinet.isMaster) {
        url = '/cabinetmodule/openall';
      }
    }

    if (me.getStateData('curr', 'isWebCam')) {
      me.$monitor.monitor('open', cabinetId);
    }

    // 如果工单类型为维护，还维护
    if (jobType === 'maintain') {
      application.maintain = 'get';
    } else if (jobType === 'returnMaintain') {
      application.maintain = 'save';
      application.num = me.returnMaintainGunNumber;
    }

    console.log('openall 请求的jobType～～～～', jobType);

    this.server({
      url: url,
      method: method,
      dataType: dataType,
      data : application,
      beforeSend : function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
        notyInst = noty({text: '发送操作命令中', type: 'info', layout: 'topRight', timeout:5000});
      }
    }).done(function(response){
      log.debug(response);
      me.pushOpenLog(application, 'openall');
      noty({text: '操作命令发送成功', type: 'success', timeout:5000, layout: 'topRight'});
    })
    .fail(function(err){
      log.debug(err);
      var errorObj;
      try {
        errorObj = JSON.parse(err.responseText);
      } catch (e) {
      }
      if (typeof errorObj.code !== 'undefined' && errorObj.code === 'NOUSER') {
        me.showError('获取警员信息失败, 请稍候再试')
      } else {
        me.showError('openAll操作命令发送失败');
      }
    })
    .always(function(){
      notyInst.close();
    })
  },
  open : function(application){
    log.debug('Opening Cabine Door and Module', application);
    var jobType = this.getStateData('prev', 'jobType');
    var me = this;
    if ((['gun', 'returnGun', 'returnBullet', 'bullet'].indexOf(jobType) > -1) && me.checkedOpenBatch()) {
      return me.openBatch(application);
    }

    var cabinetId = this.getStateData('curr', 'cabinetId'),
        moduleId = typeof application.cabinetModule === 'object' ? application.cabinetModule.id: application.cabinetModule,
        moduleType = application.flatType,
        moduleCanId = application.cabinetModule.canId,
        data = {
          moduleId: moduleId,
          moduleType : moduleType,
          moduleCanId : moduleCanId,
          action : jobType,
          applicationId : application.id
        },
        url = '',
        method = '',
        url = '/peer/' + cabinetId + '/cabinetmodule/open',
        method = 'POST',
        dataType = 'json',
        notyInst = null,
        isSiteAuth = me.getStateData('prev', 'isSiteAuth'),
        applicantToken = me.getStateData('prev', 'applicantToken') || me.getStateData('curr', 'applicantToken'),
        localCabinetIsMaster = me.getStateData('curr', 'localCabinetIsMaster');
    
    // 判断是否为位master
    if (!localCabinetIsMaster) {
      url = '/cabinetmodule/open';
    } else {
      var _application = application;
      if (application && application.application) {
        _application = application.application;
      }
      if (_application && _application.cabinet && _application.cabinet.isMaster) {
        url = '/cabinetmodule/open';
      }
    }

    if (me.getStateData('curr', 'isWebCam')) {
      me.$monitor.monitor('open', cabinetId);
    }

    switch (jobType) {
      case 'getGun':
      case 'gun':
        data.action = 'getGun'
        break;
      case 'bullet':
      case 'getBullet':
        data.action = 'getBullet'
        break;
      case 'returnGun':
        data.action = 'returnGun';
        break;
      default:
        data.action = jobType
    }

    server({
      url: url,
      method: method,
      dataType: dataType,
      data : data,
      beforeSend : function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
        notyInst = noty({text: '发送操作命令中', type: 'info', layout: 'topRight', timeout:5000});
      }
    }).done(function(response){
      log.debug(response);
      me.pushOpenLog(data, 'open')
      noty({text: '操作命令发送成功', type: 'success', timeout:5000, layout: 'topRight'});
    })
    .fail(function(err){
      log.debug(err);
      var errorObj;
      try {
        errorObj = JSON.parse(err.responseText);
      } catch (e) {
      }
      if (typeof errorObj.code !== 'undefined' && errorObj.code === 'NOUSER') {
        me.showError('获取警员信息失败, 请稍候再试')
      } else {
        me.showError('open操作命令发送失败');
      }
    })
    .always(function(){
      notyInst.close();
    })
  },
  openBatch: function(application) {
    var me = this,
        url,
        moduleId = typeof application.cabinetModule === 'object' ? application.cabinetModule.id: application.cabinetModule,
        moduleType = application.flatType,
        applicantToken = me.getStateData('prev', 'applicantToken') || me.getStateData('curr', 'applicantToken'),
        localCabinetIsMaster = me.getStateData('curr', 'localCabinetIsMaster'),
        cabinetId = me.getStateData('curr', 'cabinetId'),
        jobType = this.getStateData('prev', 'jobType'),
        data = {
          moduleType: moduleType,
          action: 'getGun',
          applicationId: application.id,
          gunList: application.gun,
          moduleId: application.cabinetModule
        };

    if (jobType === 'gun') {
      data.action = 'getGun';
    } else if (jobType === 'returnGun') {
      data.action = 'returnGun';
    } else if (jobType === 'bullet') {
      data.action = 'getBullet';
    }  else if (jobType === 'returnBullet') {
      data.action = 'returnBullet';
    }

    if (jobType === 'bullet' || jobType === 'returnBullet') {
      data.moduleList = application.cabinetModule;
    }

    if (!localCabinetIsMaster) {
      url = '/cabinetmodule/openBatch';
    } else {
      url = '/peer/' + cabinetId + '/cabinetmodule/openBatch';
      // 如果本机是master，并且取的柜机也是master
      var _application = application;
      if (application && application.application) {
        _application = application.application;
      }
      if (_application && _application.cabinet && _application.cabinet.isMaster) {
        url = '/cabinetmodule/openBatch';
      }
    }

    server({
      url: url,
      method: 'POST',
      data: data,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
        notyInst = noty({text: '发送操作命令中', type: 'info', layout: 'topRight', timeout:5000});
      }
    })
    .done(function(resonse) {
      me.pushOpenLog(data, 'openBatch');
      noty({text: '操作命令发送成功', type: 'success', timeout:5000, layout: 'topRight'});
    })
    .fail(function(err) {
      log.debug(err);
      var errorObj;
      try {
        errorObj = JSON.parse(err.responseText);
      } catch (e) {
      }
      if (typeof errorObj.code !== 'undefined' && errorObj.code === 'NOUSER') {
        me.showError('获取警员信息失败, 请稍候再试')
      } else {
        me.showError('open操作命令发送失败');
      }     
    });
  },
  pushOpenLog: function(data, type) {
    var cabinetName = this.getStateData('curr', 'cabinetName');
    var jobType = this.getStateData('prev', 'jobType');
    var newData = data;
    var num = data.application && data.application.num;
    var me = this;
    
    console.log(data, '############### application on pushOpenLog function ############')
    if (['storageGun', 'storageBullet', 'maintain', 'returnMaintain', 'emergency'].indexOf(jobType) > -1) {
      newData = {};
      newData.action = jobType;
      newData.applicationId = data.application.id;
      if (num) {
        newData.num = num;
      }
    }
    
    if (jobType === 'maintain') {
      newData.maintain = 'get';
    } else if (jobType === 'returnMaintain') {
      newData.maintain = 'save';
    }

    me.speak('cabinetDoorOpened');

    this.server({
      url: '/optlog/openLog',
      method: 'POST',
      data: _.merge(newData, {openType: type, cabinetName: cabinetName})
    })
  },
  checkHasNetwork: function (CURRENTSTATE) {
    var me = this;
    $.ajax({
      url : '/cabinet?populate=org&where={"isLocal": true}',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      beforeSend: function (xhr) {
        var applicantToken = me.getStateData('prev', 'applicantToken') || me.getStateData('curr', 'applicantToken');
        if(applicantToken){
          xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
        }
      }
    }, true)
    .done(function(data){
      if(!data.length){
        return;
      }
      var isMaster = data[0].isMaster;
      me.setStateData('curr', 'localCabinetIsMaster', isMaster);
      if(!isMaster){
        $.ajax({
          url: '/master/cabinet?populate=org',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        .done(function(){
          me.setStateData('curr', 'hasNetworking', true);
        })
        .fail(function(){
          me.setStateData('curr', 'hasNetworking', false);
        })
      }
    });
  },
  changeRouteSetFlashBag: function (route) {
    var me = this;
    var type = me.getStateData('prev', 'jobType');

    if (route === '/m/simplecreateapplication') {
      if (type === 'maintain') {
        if (!(me.user.hasPermission('manage-cabinet') || me.user.hasPermission('view-app') || me.user.hasPermission('manage-system'))) {
          return noty({text: '非管理员无法创建维护工单', type: 'error', layout: 'top', timeout: 2000});
        }
      } else {
        if ((me.user.hasPermission('manage-cabinet') || me.user.hasPermission('view-app')) && !me.user.hasPermission('manage-system')) {
          // 判断管理是否可以创建工单
          if (!me.checkedAdminCreatedApp()) {
            return noty({text: '管理员无法创建工单', type: 'error', layout: 'top', timeout: 2000}); 
          }
        }        
      }
    }

    me.setFlashbag(me.NEXTAPPDATA);
    me.nav(route);
  },
  checkedAdminCreatedApp: function () {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      setting = JSON.parse(setting);
      return setting.adminCreateApp;
    } else {
      return false;
    }
  },
  //添加登录拍照
  loginPhotograph: function() {
    server({
      url: '/camera/capture',
      method: 'GET'
    })
    .done(function(data){
      log.debug('login photograph success', data);
    })
    .fail(function(error){
      log.debug('login photograph fail', error);
    })
  },
  showError : function(err){
    noty({text: err, type: 'error', layout: 'top', timeout: 3000});
  },
  showNoty: function(type, text) {
    if (type === 'error') {
      noty({text: text, type: 'error', layout: 'top', timeout: 3000})
    } else {
      noty({text: text, type: 'success', layout: 'topRight', timeout: 3000})
    }
  },
  checkedWebCam: function() {
    var systemSetData = window.localStorage.getItem('systemSetData');
    var me = this;
    if (systemSetData) {
      systemSetData = JSON.parse(systemSetData);
      me.setStateData('curr', 'isWebCam', systemSetData.enableCam);
    } else {
      me.setStateData('curr', 'isWebCam', false);
    }
  },
  /*
    状态管理
  */
  setStateData: function (type, attr, value) {
    var me = this,
        obj = me.getStatePosition(type),
        dataObject = me[obj];
    _.set(dataObject, attr, value);
  },
  getStateData: function (type, attr) {
    var me = this,
        obj = me.getStatePosition(type),
        dataObject = me[obj];
    return _.get(dataObject, attr);
  },
  getStatePosition: function (type){
    switch (type) {
      case 'prev':
        return 'PREVAPPDATA';
      case 'curr':
        return 'CURRENTSTATE';
      case 'next':
        return 'NEXTAPPDATA';
    }
  },
  checkedIsAdminCreatedApp: function() {
    return this.getKeyFormSettings('adminCreateApp');
  },
  checkedOpenBatch: function() {
    return this.getKeyFormSettings('openBatch');
  },
  checkedShowGateSwitch: function() {
    return this.getKeyFormSettings('showGateSwitch');
  },
  checkedNeedMaintainCount: function() {
    return this.getKeyFormSettings('needMaintainCount'); 
  },
  /** 获取getSettings
   * @return {object} settings 系统设置的信息
  */
  getKeyFormSettings: function(key) {
    var setting = window.localStorage.getItem('systemSetData');
    var result = null;
    if (setting) {
      try {
        result = JSON.parse(setting);
      } catch(e) {
        result = null;
      }
    }
    if (result && key) {
      return result[key];
    }
    return false;
  },
  destroy: function(cb) {
    var me = this;

    me.destroyStandarLogin();
    $('#noty_topRight_layout_container').remove();
    if (me.getStateData('curr', 'isWebCam') && me.$monitor) {
      me.$monitor.monitor('close');
    }
    cb();
  }
}

_.extend(SimpleSaveGet.prototype, prototype);

module.exports = SimpleSaveGet;
