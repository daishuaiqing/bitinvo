'use strict'

var indexJade = require('./index.jade');
var animateCss = require("animate.css");
var noty = require('customnoty');
var keypad = require('keypad');
var countdown = require('countdown');
var loginForm = require('loginform');
var taskbar = require('taskbar');
var vprocessbar = require('vprocessbar');
var server = require('common/server.js').server;
var Autocomplete = require('autocomplete-nasetech');
var simpleAppHeader = require('simpleappheader');
var gridlist = require('gridlist');
var paging = require('paging');
var moment = require('moment');
var gridCell= require('./gridCell.jade');
var pubsub = require('PubSubJS');
var user = require("common/usermanagement");
var backBtn = require('backbtn');
var IndexLess = require('./less/index.less');
var usermanagement = require('common/usermanagement.js');

var KanbanAuth = function(reg) {
  reg.apply(this);
  return this;
}

_.extend(KanbanAuth, {
  NS : 'KanbanAuth',
  noAuth: true,
  pub : [
  ],
  sub : []
});

var prototype = {
  init: function() {
    // 定义一个保存待审核列表的数组
    this.applicationList = [];
    // 定一个审核人数组
    this.processList = [];
    usermanagement.signoutRedirect = '/m/Kanban';
    pubsub.unsubscribe('system.message');
  },
  show: function($node, cb) {
    var me = this;
    $node.append(indexJade());

    //添加头部组件
    $node.find('#backBtn').backBtn('show', function(){
      me.nav('/m/Kanban');
    });

    me.initProcessCode();
    cb();
  },
  initProcessCode: function() {
    var me = this,
      $node= me.$node;
    me.currentStep = 0;

    me.steps = [
      {
        name: '待审核列表',
        actions: [
          { name: '取消', target: function(){ me.nav('/m/Kanban')}}
        ],
        onShown: function($node, next) {
          if ($('#noty_topRight_layout_container').length) {
            $('#noty_top_layout_container').remove();
          }
          var $html = require('./gridlist.jade');
          $node.find('.right-major').html($html);

          me.getWaitProcessList();
          $node.find('.paging-btn-box')
          .paging('show');

          $node.find('.list-cont')
          .off('click', '.grid-list-cell')
          .on('click', '.grid-list-cell', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var data = me.applicationList[$(e.currentTarget).data('index')],
                processLen;
            // 记录当前点击工单信息
            me.currentApplication = data;
            //记录当前点击的审核人列表
            me.processList = data.processList ? data.processList : [];
            // 记录工单的id
            me.applicationId = data.id;

            if (!data.applicant) {
              return noty({text: '该工单没有申请人信息，不能进行操作', type: 'error', layout: 'top', timeout: 3000});
            }
            // 申请人Id
            me.applicantId = data.applicant.id;

            processLen = me.processList.length;
            if (processLen <= 0) {
              return noty({text: '该类型工单没有审核人', type: 'error', layout: 'top', timeout: 2000});
            }


            me.prevProcessAdmin = [];

            me.showProcessList(me.processList);

            next(data);
          });
        }
      },
      {
        name: '审核人身份验证',
        actions: [
          { name: '取消', target: function(){ me.nav('/m/Kanban')} },
          { name: '上一步', target: function(){
            console.log($('#noty_top_layout_container').length)
              if ($('#noty_top_layout_container').length) {
                $('#noty_top_layout_container').remove();
              }
              me.removeCoutnDown();
              me.removeFingrePrint();
              me.goPreStep();
            }
          }
        ],
        onShown: function($node, next, data) {
          me.speak('processAuth');
          me.initAdminLoginModule();

          // 多人审核跳转跳转过来
          if (!data) {
            me.showProcessList(me.processList);
          }

          me.$node.off('loginSuccessTrigger').on('loginSuccessTrigger', function(){
            next();
          });
        }
      },
      {
        name: '进行代理审核',
        actions: [
          { name: '取消', target: function(){ me.nav('/m/Kanban')} },
          { name: '上一步', target: function(){ me.goPreStep()}},
          { name: '拒绝', target: function()  {
              me.warnMessage('拒绝工单操作是否继续？', _.bindKey(me, 'sureAuth', 'rejected'))
            },
            id: 'rejectBtn',
            className: 'hide'
          },
          { name: '授权', target: function() {
              me.$node.find('#processBtn').addClass('disabled');
              console.log('############## click 授权 button ##################')
              me.sureAuth('approved')
            },
            id: 'processBtn',
            className: 'hide'
          }
        ],
        onShown: function($node, next) {
          if ($('#noty_topRight_layout_container').length) {
            $('#noty_top_layout_container').remove();
          }

          // 获取授权需要的approverId
          me.getApproverId($node);

          var applicationInfo = me.currentApplication;
          _.merge(applicationInfo, { moment: moment});
          me.showReviewDetail(applicationInfo);
        }
      },
      {
        name: '完成',
        actions: [
          { name: '退出', target: function() { me.nav('/m/Kanban') } },
          { name: '返回待审核列表', target: function() { me.goIndexStep(0)}}
        ],
        onShown: function($node, next, data) {
          var $html;
          if (data === 'rejected') {
            $html = require('./end.jade')({
              status: '该领导已拒绝工单申请'
            });
          } else if(data === 'approved') {
            $html = require('./end.jade')({
              status: '该领导同意工单申请'
            });
          }
          $node.find('.right-major').html($html);
        }
      }
    ];

    me.goPreStep = function(data) {
      if (me.currentStep > 0) {
        me.currentStep -= 1;
        displayStep(data);
      }
    }

    me.goNextStep = function(data) {
      if (me.currentStep < me.steps.length) {
        me.currentStep += 1;
        displayStep(data);
      }
    }

    me.goIndexStep = function(index) {
      if (index >= 0 && index <= me.steps.length) {
        me.currentStep = index;
        displayStep();
      }
    }

    var leftMenuItems = _.map(me.steps, function(step) {
      return { name: step.name, target: 'javascript:void(0)', id: step.id};
    });

    var displayStep = function(data) {
      if (me.currentStep == me.steps.length) return;
      var step = me.steps[me.currentStep];
      $node.find('.leftmenu').vProcessBar('show', me.currentStep, leftMenuItems);
      $node.find('.taskbar').taskbar().taskbar('show', step.actions);
      $node.find('.right-major').empty();
      step.onShown($node, _.bind(me.goNextStep, me), data);
    }

    displayStep();
  },
  showProcessList: function(list) {
    var processLen,
        me = this,
        newList = [],
        lasteArray = [],
        processPeopleList = '';

    if (me.prevProcessAdmin.length > 0) {
      _.each(list, function(item, index) {
        if (me.prevProcessAdmin.indexOf(item.id) === -1) {
          newList.push(item);
        }
      })
    } else {
      newList = list;
    }

    _.each(newList, function(item, index) {
      if (item.status !== 'approved') {
        lasteArray.push(item);
      }
    })

    processLen = lasteArray.length;
    _.each(lasteArray, function(item, index) {
      if (index < processLen - 1) {
        processPeopleList += item.alias + '、';
      } else {
        processPeopleList += item.alias
      }
    });
    processPeopleList = '审核人：' + processPeopleList;
    noty({text: processPeopleList, type: 'info', layout: 'top', timeout: null});
  },
  initKeypad: function($node) {
    $node.find('input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    });
  },
  reviewApplication: function(status) {
    var me = this,
        data,
        status = status,
        url = '/application/remoteApprove',
        userId = me.userId,
        applicationId = me.applicationId;

    data = {
      userId: userId,
      applicationId: applicationId,
      status: status
    }

    server({
      url: url,
      method: 'POST',
      data: data
    })
    .done(function(data) {
      console.log('This is update remote approve status success callback', data)
      console.log('远程remote approve 审核成功，进行goNextStep')
      noty({text: '更新远程申请状态成功', type: 'success', layout: 'topRight', timeout: 2000});
    })
    .fail(function(error) {
      console.log('This is update remote approve status error callback', error)
      var errObject;
      try {
        errObject = JSON.parse(error.responseText);
      } catch (e) {
        errObject = error.responseText.indexOf('非') > -1 ? error.responseText : '更新远程申请状态失败';
      }
      if (typeof errObject.code !== 'undefined' && errObject.code === 'INVALIDSECRET') {
        noty({text: errObject.error, type: 'error', layout: 'top', timeout: 2000});
      } else {
        noty({text: errObject, type: 'error', layout: 'top', timeout: 2000});
      }
    });
  },
  receiveSuccessHandler: function(status) {
    var me = this,
        token = me.userToken,
        applicationId = me.applicationId;
    server({
      url: '/application?where={"id": "' + applicationId + '"}',
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(token));
      }
    })
    .done(function(data) {
      console.log('checked application status resolve', data)
      var status = data[0].status;
      if (status === 'pending') {
        me.warnMessage('多人审核工单，是否继续进行审核', function() {
          console.log('准备跳转到--->审核人身份验证')
          me.goIndexStep(1);
        });
      } else {
        me.reviewApplication(status);
      }
    })
  },
  showReviewDetail: function(data) {
    var me = this,
        $node = me.$node,
        $html = require('./remoteApprove.jade')(data);
    $node.find('.right-major').html($html);
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
  getApproverId: function ($node) {
    var me = this,
        applicantId = me.applicantId,
        adminId = me.userId,
        appId = me.applicationId,
        adminToken = me.userToken;

    var url = '/applicationprocess?where={"applicant":"' + applicantId + '",'
            + '"approver":' + '"' + adminId + '",' + '"application":'+ '"' + appId  + '"'+ '}';

    server({
      url: url,
      method: 'get',
      beforeSend: function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(adminToken));
      }
    })
    .done(function(data) {
      if (!data || data && data.length === 0) {
        return noty({text: '该领导待授权列表没有这个工单', type: 'error', layout: 'top', timeout: 3000});
      }
      me.adminApproverId = data[0].id;
      // adminApproverId 获取成功后显示授权按钮
      $node.find('#rejectBtn').removeClass('hide');
      $node.find('#processBtn').removeClass('hide');
    })
    .fail(function(error) {
      noty({text: '获取授权凭证失败', type: 'error', layout: 'top', timeout: 3000});
    })
  },
  // 本地授权流程
  sureAuth: function (status) {
    var me = this,
        adminToken = me.userToken,
        approverId = me.adminApproverId;
    server({
      url: '/applicationprocess/' + approverId,
      method: 'PUT',
      data: {status: status},
      beforeSend: function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(adminToken));
      }
    })
    .done(function(data) {
      if(data.id === approverId){
        noty({text: '审核操作成功', type: 'success', layout: 'topRight', timeout: 2000});
        // 领导授权成功,添加userId帮助过滤
        me.prevProcessAdmin.push(me.userId);
        console.log('确定授权准备跳转到完成')
        me.goNextStep(status);
        me.receiveSuccessHandler(status);
      }
    })
    .fail(function() {
      noty({text: '审核操作失败', type: 'error', layout: 'top', timeout: 3000})
    })
    .always(function() {
      me.$node.find('#processBtn').removeClass('hide');
    })
  },
  getWaitProcessList: function() {
    var me = this,
        $node = me.$node;
    me.applicationList = [];
    $node.find('.list-cont')
    .gridlist({
      source: {
        url : '/application/remotePendingApplicationList',
        method: 'get'
      },
      innerTpl: function(data) {
        // 在applicationList数组中添加data
        me.applicationList.push(data);
        _.merge(data, { moment: moment});
        return gridCell(data)
      },
      renderFn: null
    })
    .on('onNext', function(e, skip, total, limit){
      $node.find('.paging-btn-box')
      .paging('next', skip ,total, limit);
    })
    .on('onPrev', function(e, skip, total, limit){
      $node.find('.paging-btn-box')
      .paging('prev', skip, total, limit);
    })
    .on('gridlist.afterTotalChange', function(event, total, limit, skip){
      $node.find('.paging-btn-box')
      .paging('refresh', skip, total, limit);
    })
    .gridlist(
      'show'
    );

    $node.off('click')
    .on('click', '.btn', function(){
      var map = {
        refresh : function(){
          log.debug('refresh');
          me.applicationList = [];
          $node.find('.list-cont').gridlist('refresh');
        },
        next : function(){
          me.applicationList = [];
          log.debug('next page');
          $node.find('.list-cont').gridlist('next');
        },
        prev : function(){
          me.applicationList = [];
          log.debug('prev page');
          $node.find('.list-cont').gridlist('prev');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })

  },
  autocomplete: function($node) {
    $node.find('#username').Autocomplete({
      url: '/user/autocomplete',
      limit: 5
    }).Autocomplete('show')
  },
  initAdminLoginModule: function() {
    var me = this,
        $node = me.$node,
        $html = $('<div class="col-md-offset-3 col-md-6 clearfix pull-middle-center">');

    $html.loginform({
      openFinger: function() {
        me.fingerPrintLogin($html);
      }
    }).loginform('show');

    me.initKeypad($html);
    me.autocomplete($html);

    $node.find('.right-major').html($html);

    $html.off('loginform.submit')
    .on('loginform.submit', function(e, data) {
      $html.find('#signin').addClass('disabled');
      me.accessNumberLogin(data);
    })
    // .on('onClose', function() {
    //
    // })
    .on('onPasswordLogin', function() {
      me.removeCoutnDown();
      me.removeFingrePrint();
    })
    .on('onRestartPrints', function() {
      $html.find('#restart-prints').addClass('hidden');
      me.fingerPrintLogin($html);
    });

    // 默认为指扫描登录模式
    me.fingerPrintLogin($html);
  },
  accessNumberLogin: function(userInfo) {
    var username = userInfo.username,
        password = userInfo.password,
        me = this,
        nosessionUrl = '/auth/login?nosession=true';

    user.signin(
      username,
      password,
      function(data) {
        me.speak('account_signin_success');
        me.$node.find('#signin').removeClass('disabled');
        // 添加登录成功后的操作
        me.userToken = data.token;
        me.loginSuccessHandle(data);
      },
      function(err) {
        me.$node.find('#signin').removeClass('disabled')
        if (err.status === 403) {
          me.speak('login_fail');
          noty({text: err.responseJSON.error, type: 'error', layout: 'top', timeout:1000});
        } else {
          if(err && err.responseJSON){
            noty({text: err.responseJSON.error, type: 'error', layout: 'top', timeout: 1000});
          }
        }
      },
      nosessionUrl
    )
  },
  loginSuccessHandle: function(data) {
    var me = this;
    var isProcess = false;
    console.log('####################################This is login success response', data)

    _.each(me.processList, function(item, index) {
      if (item.id === data.id) {
        isProcess = true;
        return false;
      }
    });

    if (!isProcess) {
      return noty({text: '您不是该工单的审核人', type: 'error', layout: 'top', timeout: 3000});
    }

    if (me.prevProcessAdmin && me.prevProcessAdmin.indexOf(data.id) > -1) {
      return noty({text: '请不要重复授权', type: 'error', layout: 'top', timeout: 3000});
    }

    me.userId = data.id;
    //记录审核人的id
    noty({text: '验证成功', type: 'success', layout: 'topRight', timeout: 2000});
    this.$node.triggerHandler('loginSuccessTrigger');
  },
  fingerPrintLogin: function($html) {
    var me = this,
        url = '/fingerprint/auth';
    server({
      url: url
    })
    .done(function() {
      me.countDown();
      pubsub.unsubscribe('FingerPrint_Status');
      pubsub.subscribe('FingerPrint_Status', function(topic,msg) {
        switch (msg.status) {
          case 0:
            me.fingerprintStatus($html, true, '扫描成功，正在校验用户指纹');
            break;
          case 1:
            me.fingerprintStatus($html, false, '预载入指纹比对失败，重新校验');
            break;
          case 4:
            me.fingerprintStatus($html, false, '扫描的指纹较差，请重新扫描');
            break;
        }
      });

      pubsub.subscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT', _.bindKey(me, 'authFingreprintHandler'));
    })
    .fail(function(err) {
      pubsub.unsubscribe('FingerPrint_Status');
      if (err && err.responseJSON && err.responseJSON.error) {
        noty({text: err.responseJSON.error, type: 'error', layout: 'topRight', timeout:2000});
      }
    })

  },
  authFingreprintHandler: function(topic, message) {
    var me = this,
        $node = me.$node,
        user = null;
    me.removeCoutnDown();
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT');
    pubsub.unsubscribe('FingerPrint_Status');

    user = message.user;
    if (user) {
      me.user.getUserByToken(user.token)
      .done(function(data) {
        me.speak('scan_success');
        console.log('这里是指纹登录后用getuserByToken验证成功后的返回', data)
        // 登录成功后的回调函数
        me.userToken = user.token;
        me.loginSuccessHandle(data);
      })
      .fail(function(err) {
        var errorResponseText = JSON.parse(err.responseText);
        noty({text: errorResponseText.error, type: 'error', layout: 'topRight', timeout:2000});
        me.speak('scan_fail');
      })
    } else {
      $node.find('#restart-prints').removeClass('hidden');
      noty({text: message.error, type: 'error', layout: 'top', timeout: 2000});
      this.speak('scan_fail');
    }
  },
  fingerprintStatus: function($html, isSuccess, text) {
    if (isSuccess) {
      noty({text: text, type: 'info', layout: 'topRight', timeout: 1000})
      $html.loginform('canvasPic', '/fingerprint/fingerPic?' + new Date().getTime(), false, true);
    } else {
      noty({text: text, type: 'error', layout: 'topRight', timeout: 1000})
      $html.loginform('canvasPic', '/fingerprint/fingerPic?' + new Date().getTime(), false, false);
    }
  },
  removeFingrePrint: function() {
    pubsub.unsubscribe('FingerPrint_Status');
    pubsub.unsubscribe('SGS_MESSAGE_AUTHEN_PRELOAD_FINGERPRINT');

    server({
      url: '/fingerprint/stopScan'
    });

  },
  countDown: function() {
    var me = this,
        $node = me.$node;
    $node.find('.countdown-box').removeClass('hide')
    .countdown('show', 15, function() {
      me.removeCoutnDown();
      me.removeFingrePrint();
      noty({text: '指纹扫描超时,请重试！', type: 'error', layout: 'top', timeout: 1000});
      $node.find('#restart-prints').removeClass('hidden');
    })
  },
  removeCoutnDown: function() {
    var me = this,
        $node = me.$node,
        $DOM = $node && $node.find('.countdown-box');
    if ($DOM && $DOM.length) {
      $DOM.addClass('hide').countdown('destroy');
    }
  },
  routeEnter: function(route) {
    this.setFlashbag(null);
    this.nav(route);
  },
  destroy: function(cb) {
    if ($('#noty_top_layout_container').length) {
      $('#noty_top_layout_container').remove();
    }
    this.removeCoutnDown();
    cb();
  }
}

_.extend(KanbanAuth.prototype, prototype);

module.exports = KanbanAuth
