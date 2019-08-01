/*
  SimpleapplicationAuth module
*/
'use strict';

var indexTpl = require('./index.jade');
var indexLess = require('./less/index.less');

var animateCss = require("animate.css");
var noty = require('customnoty');
var keypad = require('keypad');
var countdown = require('countdown');
var loginForm = require('loginform');
var taskbar = require('taskbar');
var vprocessbar = require('vprocessbar');
var server = require('common/server.js').server;
var pubsub = require('PubSubJS');
var simpleAppHeader = require('simpleappheader');
var user = require("common/usermanagement");
var Autocomplete = require('autocomplete-nasetech');
var writingBoard = require('writingBoard');
var standarLogin = require('standarLogin');

var SimpleApplicationAuth = function (reg) {
  reg.apply(this);
  log.info('SimpleApplicationAuth has been created');
  return this;
}

var metadata = {
  NS: 'simpleapplicationauth',
  pub: [],
  endpoint: '/optlog'
}

_.extend(SimpleApplicationAuth, metadata);

var prototype = {
  init: function(){
    console.info('init simpleApplicationAuth entry');
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
    //定义传递给下个app的数据对象
    me.NEXTAPPDATA = {
      "isSiteAuth": true,
      "jobType": me.PREVAPPDATA.jobType,
      "applicantToken": me.PREVAPPDATA.applicantToken,
      "applicantId": me.PREVAPPDATA.applicantId,
      "applicantName": me.PREVAPPDATA.applicantName,
      "applicantUsername": me.PREVAPPDATA.applicantUsername,
      "applicantAllInfo": me.PREVAPPDATA.applicantAllInfo,
      "facePerception": me.PREVAPPDATA.facePerception

    }

    //定义一个当前app状态的对象
    me.CURRENTSTATE = {
      "approver": null,
      "adminToken": null,
      "isStopScan": true,          //是否发起停止指纹扫描
      "adminId": null,
      "loginName": null
    }

    // 定义判断是否有proocess list 的标识
    me.getProcessListNum = 1;
    me.getProcessListIsSuccess = false;
    me.initWakeScreen();
    me.checkedEnableApproveSign();
  },
  show: function($node, cb){
    var me = this;
    $node.append(indexTpl());

    //添加头部组件
    $node.find('.simple-app_header')
    .simpleAppHeader('show', function(){
      //点击返回按钮跳转到上一个app页面
      me.changeRouteSetFlashBag('/m/simpleapplication');
    });

    //加载授权流程
    me.loadApplicationAuthorizedPage();

    cb();
  },
  getProcessList: function () {
    var me = this;
    var appId = me.getStateData('prev', 'appId'),
    applicantToken = me.getStateData('prev', 'applicantToken');
    me.server({
      url: '/applicationprocess?populate=applicant,applicatioin,approver&where={"application":"' + appId + '"}',
      method: 'get',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
      }
    })
    .done(function (data) {
      if (data.length > 0) {
        me.getProcessListIsSuccess = true;
      }
      if (me.getProcessListIsSuccess) {
        me.getProcessListNum = 0;
        return me.updateProcessListUI(data);
      } else if (me.getProcessListNum < 10) {
        if (me.getProcessListNum === 5) {
          noty({text: '正在获取审核人信息，请等待！', type: 'info', layout: 'top', timeout: 3000});
        }

        me.getProcessListNum ++;

        if (me.getProcessListNum === 10 && !me.getProcessListIsSuccess) {
          me.getProcessList = null;
          return noty({text: '没有获取到审核人，请检测工单总览列表是否有该工单', type: 'error', layout: 'top', timeout: 6000});
        }
        me.getProcessList();
      }
    })
  },
  updateProcessListUI: function (processList) {
    var $text = "",
        me = this,
        len = processList.length,
        statusText = null;
    if (!len) {
      return;
    }
    // 记录审核人列表
    if (!me._authorizeLeadershipList) {
      me._authorizeLeadershipList = processList;
    }
    processList.forEach(function (item, index) {
      if (item.status !== 'approved') {
        if (index < len - 1 ) {
          if (item.approver) {
            $text += item.approver.alias + '、' ;
          }
        } else {
          if (item.approver) {
            $text += item.approver.alias;
          }
        }
      }
    });
    $text = '管理员' + $text + '请进行授权';
    this.processListNoty = noty({text: $text, type: 'info', layout: 'top', timeout: null});
  },
  destroyAutocomplete: function () {
    this.$node.find('#username').Autocomplete('destroy');
  },
  autocomplete: function() {
    this.$node.find('#username').Autocomplete({
      url: '/user/autocomplete',
      limit: 5
    }).Autocomplete('show')
  },
  addKeyBoard: function () {
    this.$node.find('input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    });
  },
  //添加授权流程
  loadApplicationAuthorizedPage: function () {
    var me = this,
        $node = me.$node,
        currentStep = 0,
        _steps = null;

    _steps = [
      {
        name: __('simpleApplicationAuth').steps.leaderApproval,
        id: 'two_Admin',
        actions: [
          { name: __('buttonText').cancelBtn, target: function(){ me.nav('/m/simpleapplication') }}
        ],
        onShown: function($node, next){
          //获取该工单授权领导列表
          me.getProcessList();

          // me.loadLoginModule('createApplication');
          me.initLoginModule();

          //监听用户是否登录成功
          $node
          .off('LoginSuccess')
          .on('LoginSuccess', function(event, data){
            me.speak('account_signin_success');
            next();
          })
        }
      },
      {
        id: 'enableApproveSign',
        name: __('simpleApplicationAuth').steps.signature,
        actions: [
          {
            name: __('buttonText').cancelBtn,
            target: function () {
              me.nav('/m/simpleapplication')
            }
          },
          {
            name: __('buttonText').prevBtn,
            target: function () {
              goPreStep()
            },
            className: 'step-go'
          },
          {
            name: __('buttonText').sureSignature,
            target: function () {
              me.sendSignature(goNextStep);
            }
          }
        ],
        onShown: function($node, next) {
          me.signatureDataUrl = null;
          $node.find('.right-major')
          .off('saveSignature')
          .on('saveSignature', function(event, dataUrl) {
            if (!dataUrl) {
              return noty({text: '签名板不能为空', type: 'error', layout: 'top', timeout: 3000});
            }
            me.signatureDataUrl = dataUrl;
            noty({text: '保存成功', type: 'success', layout: 'topRight', timeout: 2000});
          })
          .off('clearSignature')
          .on('clearSignature', function() {
            me.signatureDataUrl = null;
          })
          .empty().writingBoard('show');
        }
      },
      {
        name: __('simpleApplicationAuth').steps.sureApproval,
        actions: [
          {
            name: __('buttonText').prevBtn,
            target: function () {
              goPreStep()
            },
            className: 'step-go'
          },
          {
            name: __('buttonText').cancelBtn,
            target: function () {
              me.nav('/m/simpleapplication')
            }
          },
          {
            name: __('buttonText').rejectBtn,
            id: 'rejectedBtn',
            className: 'hide',
            target: function () {
              me.$node.find('#rejectedBtn').addClass('disabled');
              me.warnMessage('是否确定拒绝操作？', function() {
                me.sureAuthFunction('rejected')
                .done(function() {
                  noty({text: '您已成功拒绝该工单', type: 'success', layout: 'topRight', timeout: 3000});
                  me.changeRouteSetFlashBag('/m/simpleapplication');
                })
              });
            }
          },
          {
            name: __('buttonText').approvalBtn,
            target: function () {
            me.$node.find('#sureAuthButton').addClass('disabled');
            me.sureAuthFunction('approved')
            .done(function(){
              //点击确认授权，提示授权成功
              me.speak('confirmAuthorize');
              me.changeRouteSetFlashBag('/m/simplesaveget');
            })
          }, className: 'hide immediately-authorized-button', id: 'sureAuthButton'}
        ],
        onShown: function($node, next){
          me.$node.find('#processList').empty();
          var appId = me.getStateData('prev', 'appId'),                              //获取工单id
            //  applicantSuperior = me.getStateData('curr', 'applicantSuperior'),      //获取申请人的上级领导
              applicantId = me.getStateData('prev', 'applicantId'),                  //获取申请人的ID
              adminToken = me.getStateData('curr', 'adminToken'),
              adminId = me.getStateData('curr', 'adminId'),
              jobType = me.getStateData('prev', 'jobType');
          var url = '/applicationprocess?where={"applicant":"' + applicantId + '",'
                  + '"approver":' + '"' + adminId + '",' + '"application":'+ '"' + appId  + '"'+ '}';

          server({
            url: url,
            method: 'get',
            beforeSend: function(xhr){
              xhr.setRequestHeader("Authorization", 'Token ' + btoa(adminToken));
            }
          })
          .done(function(data){
            //记录刚创建的工单信息
            if(!data.length){
              var html = require('./noAuthPage.jade')();
              $node.find('.right-major').empty().html(html);
            }else{
              var type = me.getStateData('prev', 'newApplicationInfo.flatType'),
                  typeText = null;

              switch (type) {
                case 'gun':
                  typeText = __('appTypeText').gun;
                  break;
                case 'bullet':
                  typeText = __('appTypeText').bullet;
                  break;
                case 'emergency':
                  typeText = __('appTypeText').emergency;
                  break;
                case 'storageGun':
                  typeText = __('appTypeText').storageGun;
                  break;
                case 'storageBullet':
                  typeText = __('appTypeText').storageBullet;
                  break;
                case 'maintain':
                  typeText = __('appTypeText').maintain;
                  break;
              }

              //记录授权人的id
              me.setStateData('curr', 'approver', data[0].id);

              if(data[0].id){
                var userName = me.getStateData('prev', 'applicantName'),
                    detail = me.getStateData('prev', 'newApplicationInfo.detail'),
                    jobType = me.getStateData('prev', 'jobType'),
                    loginName = me.getStateData('curr', 'loginName'),
                    applicantUsername = me.getStateData('prev', 'applicantUsername'),
                    isHide = '';
                if(jobType === 'storageGun' || jobType === 'storageBullet'){
                  isHide = 'hide';
                }
                var statusText = null;
                if (data[0].status === 'approved') {
                  statusText = '已授权';
                } else {
                  statusText = '未授权';
                  me.$node.find('#sureAuthButton').removeClass('hide');
                  me.$node.find('#rejectedBtn').removeClass('hide');
                }
                // 如果申请人的alias不存在就显示username
                if (!userName) {
                  userName = applicantUsername;
                }
                html = require('./sureAuth.jade')({
                  typeText: typeText,
                  userName: userName,
                  detail: detail,
                  loginName: loginName,
                  statusText: statusText,
                  isHide: isHide
                });
              }else{
                var html = require('./noAuthPage.jade')();
              }
              $node.find('.right-major').empty().html(html);

              //显示授权工单信息后，进行语言提示
              me.speak('orderAuthorizeSuccess');
            }
          })
          .fail(function(){
            console.log('server fails')
          })
        }
      }
    ];

    var goPreStep = function(data){
      if(currentStep > 0){
        currentStep -= 1;
        displayStep(data);
      }

    };
    var goNextStep = function(data){
      if(currentStep < _steps.length){
        currentStep += 1;
        displayStep(data);
      }
    };

    _steps = _.filter(_steps, function(step) {
      if (step.id && step.id === 'enableApproveSign') {
        if (!me.getStateData('curr', 'enableApproveSign')) {
          return false;
        }
      }
      return true;
    });

    var leftMenuItems = _.map(_steps, function(step){
      return { name: step.name, target: 'javascript:void(0)', id: step.id};
    });

    var displayStep = function(data){
      if(currentStep == _steps.length) return;
      var step = _steps[currentStep];
      $node.find('.leftmenu').vProcessBar('show', currentStep, leftMenuItems);
      var jobType = me.getStateData('prev', 'jobType');
      if((jobType === 'returnGun' || jobType === 'returnBullet') &&  step.id === 'adminAuthorization'){
        step.actions.splice(1);
      }
      $node.find('.taskbar').taskbar().taskbar('show', step.actions);
      $node.find('.right-major').empty();
      step.onShown($node, _.bind(goNextStep, me), data);
    }
    displayStep();
  },
  sendSignature: function(goNextStep) {
    var me = this,
        user = me.getStateData('curr', 'adminId'),
        application = me.getStateData('prev', 'appId'),
        adminToken = me.getStateData('curr', 'adminToken'),
        signature = me.signatureDataUrl;
    if (!signature) {
      return noty({text: '请求签名后点击保存按钮', type: 'error', layout: 'top', timeout: 3000});
    }
    me.server({
      url: '/signature/save',
      method: 'post',
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(adminToken));
      },
      data: {
        user: user,
        signature: signature,
        application: application
      }
    })
    .done(function() {
      goNextStep();
    })
    .fail(function(error) {
      console.log('This is sendSignature fail', error);
      noty({text: '确认签名操作失败', type: 'error', layout: 'top', timeout: 3000});
    })
  },
  destroyStandarLogin: function() {
    var $module = this.$node.find('.right-major');
    if ($module.length) {
      $module.standarLogin('destroy');
    }
  },
  initLoginModule: function() {
    var me = this;
    var $node = me.$node;
    var $module = $node.find('.right-major');
    
    // 这里只是用普通登录方式，所以isAdmin用false
    $module.standarLogin('show', {
      isAdmin: false,
      password: {
        isNoSession: true
      },
      fingerprint: {
        ajaxConfig: {
          url: '/fingerprint/auth'
        }
      }
    });

    $module
    .off('loginSuccess').on('loginSuccess', function (e, data) {
      console.log('####### 工单审核管理员登录成功 ######', data);
      
      var applicantName = me.getStateData('prev', 'applicantName');
      var isLeader = false;
      
      if (data.alias === applicantName) {
          me.speak('notmeauth');
          noty({
            text: '工单不能进行自我授权！',
            type: 'error',
            layout: 'top',
            timeout: 3000
          });
        // 清除登录按钮禁用
        $module.trigger('removeDisabled');
        return false;
      }
      if (me._authorizeLeadershipList) {
        _.each(me._authorizeLeadershipList, function(item) {
          if (item.approver.username === data.username) {
            isLeader = true;
          }
        });

        if (!isLeader) {
          me.speak('notApplicationAuthPeople');
          $module.trigger('removeDisabled')
          return noty({text: '您不是该工单的审核领导', type: 'error', layout: 'top', timeout: 3000});
        }
        me.loginSuccessHandle(data);
      } else {
        me.loginSuccessHandle(data);
      } 
    });
  },
  loginSuccessHandle: function (data) {
    var me = this;
    //登录成后记录下管理员token
    me.setStateData('curr', 'adminToken', data.token);
    me.setStateData('curr', 'adminId', data.id);
    //如果为上级领导就抛出一个登录成功的事件
    me.$node.triggerHandler('LoginSuccess', data);
  },
  sureAuthFunction: function(status){
    var me = this,
        d = $.Deferred(),
        adminToken = me.getStateData('curr', 'adminToken'),
        approver = me.getStateData('curr', 'approver');
    server({
      url: '/applicationprocess/' + approver,
      method: 'PUT',
      data: {status: status},
      beforeSend: function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(adminToken));
      }
    })
    .done(function(data){
      if(data.id === approver){
        d.resolve(data);
      } else {
        d.reject()
      }
    })
    .fail(function(error){
      noty({text: '授权操作失败', type: 'error', layout: 'topRight'});
    })
    .always(function() {
      me.$node.find('#sureAuthButton').removeClass('disabled');
      me.$node.find('#rejectedBtn').removeClass('disabled');
    });
    return d;
  },
  changeRouteSetFlashBag: function(route){
    var me = this;
    me.setFlashbag(me.NEXTAPPDATA);
    me.nav(route);
  },
  showNoty: function(type, text) {
    if (type === 'error') {
      noty({text: text, type: 'error', layout: 'top', timeout: 3000})
    } else {
      noty({text: text, type: 'success', layout: 'topRight', timeout: 3000})
    }
  },
  checkedEnableApproveSign: function() {
    var systemSetData = window.localStorage.getItem('systemSetData');
    var me = this;
    if (systemSetData) {
      systemSetData = JSON.parse(systemSetData);
      me.setStateData('curr', 'enableApproveSign', systemSetData.enableApproveSign);
    } else {
      me.setStateData('curr', 'enableApproveSign', false);
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
        dataObject = this[obj];
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
  destroy: function(cb) {
    var me = this;
    
    me.destroyStandarLogin();

    try{
      $('#noty_topRight_layout_container').remove();
      $('#noty_top_layout_container').remove();
      me.$node.find('#processList').empty();
      me.processListNoty.close();
    }catch(e) {
      console.log(e)
    }
    cb();
  },
  wakeScreen: function () {
    server({
      url: '/system/wakeup',
      method: 'get'
    });
  },
  initWakeScreen: function () {
    var me = this;

    var throttled = _.throttle(me.wakeScreen, 6000, { 'trailing': false });

    $(document)
    .off('click')
    .on('click', throttled)
  }
}

_.extend(SimpleApplicationAuth.prototype, prototype);
module.exports = SimpleApplicationAuth;
