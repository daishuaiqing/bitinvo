'use strict';

var returnListJade = require('./returnList.jade');

// 样式
var baseCss = require('../common/less/base.less');
var animateCss = require('animate.css');
var indexCss = require('./less/index.less');

// jade模板
var jade = require('./index.jade');
var homeJade = require('./home.jade');
var createdJade = require('./created.jade');
var authJade = require('./auth.jade');
var typeListCell = require('./typelistcell.jade');
var typeListJade = require('./typelist.jade');
var noApplication = require('./noApplication.jade');

// 组件
var pagestate = require('pagestate');
var formwork = require('formwork');
var vprocessbar = require('vprocessbar');
var taskbar = require('taskbar');
var pubsub = require('PubSubJS');
var keypad = require('keypad');
var noty = require('customnoty');
var Autocomplete = require('autocomplete-nasetech');
var simpleAppHeader = require('simpleappheader');
var loginform = require('loginform');
var server = require('common/server').server;
var user = require("common/usermanagement");
var countdown = require('countdown');
var flexModal = require('flexmodal');
var list = require('list');
var Message = require('common/message.js');
var AutoLogout = require('common/autologout.js');
var _ = require('lodash');
var standarLogin = require('standarLogin');

var usermanagement = require('common/usermanagement.js');

// 创建one machine实例
var OneMachine = function (reg) {
  reg.apply(this);
  usermanagement.signoutRedirect = '/m/onemachine'
  return this;
}

var metadata = {
  NS: 'onemachine',
  noAuth: true,
  endpoint: '/onemachine'
}

_.extend(OneMachine, metadata);

// 自定义OneMachine实例的prototype
var prototype = {
  init: function () {
    var me = this;
    if ($('html').hasClass('remote')){
      $('html').removeClass('remote').addClass('local');
    }
    me.stateStore = {};
    // 上一个页面的数据
    var previousAppData = me.getFlashbag();
    if (previousAppData) {
      try {
        me.PREVAPPDATA = JSON.parse(previousAppData);
        me.isMasterLocalCabine = me.PREVAPPDATA.isMasterLocalCabine;
        console.log(me.isMasterLocalCabine, '这里还是这么慢')
      } catch(e) {
        me.PREVAPPDATA = previousAppData
      }
    }
    this.getSettings();
    pubsub.unsubscribe('approvedApplication')
    pubsub.unsubscribe('prereturnApplication')
  },
  checkLocalIsMaster: function(fn) {
    var me = this;
    var applicantToken = me.getState('applicantToken');
    server({
      url: '/cabinet?where={"isLocal": true}',
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
        xhr.setRequestHeader('onemachine', true);
      }      
    })
    .done(function(res) {
      me.isMasterLocalCabine = res[0].isMaster;
      window.sessionStorage.setItem('isMasterLocalCabine', res[0].isMaster);
      me.setState('isMasterLocalCabine', me.isMasterLocalCabine);
      console.log('获取本地柜机信息', res);
      fn();
    })
    .fail(function(res){
      console.log('获取本地柜机信息失败', res)
      fn();
    });
  },
  show: function ($node, cb) {
    var me = this;

    // 插入index.jade 模板
    $node.append(jade());
    $node.find('.home_page').hide().append(homeJade(
      {
        badgeImg : require('../common/img/badge.png'),
        i18n: __("onemachine")
      }
    ));
    $node.find('.created_page').hide().append(createdJade());
    $node.find('.auth_page').hide().append(authJade());

    // 初始化三个页面(home、created、auth)
    me._pagestate();
    if (me.PREVAPPDATA && me.PREVAPPDATA.isSiteAuth) {
      me.setState('applicationType', me.PREVAPPDATA.jobType);
      me.setState('applicantToken', me.PREVAPPDATA.applicantToken);
      me.setState('appId', me.PREVAPPDATA.appId);
      me.setState('applicantId', me.PREVAPPDATA.applicantId);
      me.setState('loginApplicantAlias', me.PREVAPPDATA.loginApplicantAlias);
      me.setState('loginApplicantUsername', me.PREVAPPDATA.loginApplicantUsername);
      me.setState('isMasterLocalCabine', me.PREVAPPDATA.isMasterLocalCabine)
      me._pagestate(1);
      me._loadAuthPage(1);
    }

    // 添加createdPage添加一个头部
    $node.find('.page_header')
    .simpleAppHeader('show', function(){
      //点击返回按钮跳转到上一个app页面
      // me.destroyCountDown();
      // me.destroyFingrePrint();
      me.destroyStandarLogin();
      $node.pagestate('setState', 0);
      pubsub.unsubscribe('autologout.start');
    });

    me.listModal({
      url: '/applicationtypeforone',
      $btn: $node.find('.entry-button'),
      selectHandler: function ($currTarget) {
        var id = $currTarget.data('id');
        var name = $currTarget.data('name');
        var type = $currTarget.data('type');
        me.firstLoad();
        // 进去到身份验证页面
        $node.pagestate('setState', 1);
        me._loadAuthPage();
        console.log(id, name, type)
        // 保持工单信息
        me.setState('applicationTypeId', id);
        me.setState('applicationTypeName', name);
        me.setState('applicationType', type);
      }
    });

    $node.find('.return-button').off('click').on('click', function () {
      var $modal = $('<div><div/>').appendTo($node)
      .on('shown.bs.modal', function (e) {
        var $modalBox = $(e.target);
        var $list = $modalBox.find('.type-list')
        .off('click', 'li')
        .on('click', 'li', function (e) {
          me.firstLoad();
          $modal.flexmodal('modalHide');
          var $currentTarget = $(e.currentTarget);
          var type = $currentTarget.data('type');
          me.setState('applicationType', type);
          $node.pagestate('setState', 1);
          me._loadAuthPage();
        })
      });
      $modal.flexmodal('show',
        {
          modalTitle: '选择归还类型'
        },
        returnListJade
      );
    })

    // pubsub.publish('autologout.stop');
    // AutoLogout.remove();

    me.initWakeScreen();

    cb();
  },
  destroyStandarLogin: function() {
    var $module = this.$node.find('.right-major').find('.module');
    if ($module.length) {
      $module.standarLogin('destroy');
    }
  },
  destroy: function (cb) {
    cb();
  },
  // 实例私有方法
  _pagestate: function (defaultDate) {
    var me = this,
      $node = me.$node,
      defaultDate = defaultDate || 0;
    $node.pagestate({
      namespace: metadata.NS,
      state: 0,
      states: {
        0: [
          '.home_page'
        ],
        1: [
          '.created_page'
        ],
        2: [
          '.auth_page'
        ]
      }
    });

    $node.pagestate('setState', defaultDate);

  },
  firstLoad: function () {
    Message.initAsLocal();
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
  },
  _loadAuthPage: function (currentPos) {
    var me = this,
      $node = me.$node,
      currentStep = currentPos || 0,
      steps,
      goNextStep,
      goPreStep,
      leftMenuItems,
      exitFn,
      displayStep;

    steps = [
      {
        name: __("onemachine").steps.authentication,
        actions: [
          { name: '退出', target: function(){ exitFn() }}
        ],
        onShown: function (data) {
          me.isAuthLogin = false;

          // me.loadLoginMoule();
          me.initLoginModule();

          //添加键盘
          me.addKeyBoard();

          //添加帐号自动补全
          me.autocomplete();

          // 登录成功进行下一步
          $(me).off('userLoginSuccess').on('userLoginSuccess', function () {
            me.checkLocalIsMaster(function() {
              goNextStep();
            });
          });
        }
      },
      {
        name: __("onemachine").steps.appInfo,
        actions: [
          { name: '上一步', target: function(){ goPreStep() }},
          { name: '确认归还', id: 'sureReturnButton', className: 'hide', target: function (){ $node.triggerHandler('sureRetrunHandler') }},
          { name: '确认', id: 'sureInfoBtn', className: 'hide', target: function(){ $node.triggerHandler('sureInfoHandler') }}
        ],
        onShown: function (data) {
          var applicationType = me.getState('applicationType');
          var loadingJade = require('./loadingJade.jade');
          $node.find('.right-major').html(loadingJade());
          console.log('%s ####################### into step two, applicationType is:', applicationType);
          // 检测归还工单
          if (applicationType === 'returnGun' || applicationType === 'returnBullet') {
            me.checkAuthorization(applicationType)
            .done(function (data) {
              console.log('%s ################################ check return application', data);
              me.setState('applicationDetail', data.application.detail);
              var showInfo = me.getJobShowInfo(data),
                  html = require('./returnJade.jade')(showInfo);

              $node.find('.right-major').html(html);

              // 如果有工单显示确认归还按钮，并且开始监听是否点击
              $node.find('#sureReturnButton').removeClass('hide');
              $node.off('sureRetrunHandler')
              .on('sureRetrunHandler', function () {
                me.kioskReturn(data.application.id);
                me.peerKioskReturn(data.application.id, data.application.cabinet.id)
              });
            })
            .fail(function (error) {
              $node.find('#sureReturnButton').addClass('hide');
              var html = require('./noReturn.jade')();
              $node.find('.right-major').html(html);
            })
            return false;
          }

          $node.find('#sureReturnButton').addClass('hide');

          // 检测工单是否存在
          me.checkApplication(applicationType)
          .done(function (data) {
            // 获取柜机信息
            me.getCabintInfo(data.application.cabinet.id)
            .done(function (data) {
              var $successAppJade = require('./successApp.jade')(data);
              $node.find('.right-major').html($successAppJade);

              $node.off('sureInfoHandler')
              .on('sureInfoHandler', function () {
                goNextStep(data.application)
              });
            })
            .fail(function () {
              var $errorJade = require('./error.jade')({type: 'offline'});
              $node.find('.right-major').html($errorJade);
            })
          })
          .fail(function(error) {
            console.log('%s check application fail responseText #########%s', error);
            var errorText = null;
            try{
              errorText = JSON.parse(error.responseText);
            } catch(e) {
              errorText = error.responseText
            }
            // 没有工单,需要创建
            if (errorText.error) {
              var html = noApplication({text: errorText.error});
              $node.find('.right-major').html(html);
              $node.find('#apply-btn').off('click')
              .on('click', function () {
                if (applicationType !== 'storageGun' && applicationType !== 'storageBullet') {
                  if ((me.user.hasPermission('manage-cabinet') || me.user.hasPermission('view-app')) && !me.user.hasPermission('manage-system')) {
                    if ($(this).data('buttontype') === 'noJob') {
                      if (!me.isAdminCreatedApp()) {
                        return noty({text: '管理员无法创建工单', type: 'error', layout: 'top', timeout:2000});
                      }
                    }
                  }
                }
                me.changeRouteSetFlashBag('/m/onemachinecreated');
              });
            } else if (errorText.application && errorText.info) {
              // 检测是不是一体机工单
              me.checkApplicationOneMachine(errorText.application.id)
              .done(function (data) {
                // 工单存在但未授权
                if (!data.hasCapturedApplication) {
                  noty({text: '不是一体机工单', type: 'error', layout: 'top', timeout: 2000});
                  var $noOneMachineApp = require('./error.jade')({type: 'noOneMachineApp'});
                  $node.find('.right-major').html($noOneMachineApp);
                } else if (data.hasCapturedApplication && data.assetsId) {
                  console.log('errorText.application.cabinet', errorText.application.cabinet);
                  if (!errorText.application.cabinet) {
                    return noty({text: '请检查模块是否选择柜机', type: 'error', layout: 'top', timeout: 10000});
                  }
                  me.setState('peerId', errorText.application.cabinet.id);
                  // 是一体机工单并且已经拍照
                  me.setState('appId', errorText.application.id);
                  me.setState('applicationDetail', errorText.application.detail);

                  var showInfo = me.getJobShowInfo(errorText.application),
                      $html = require('./applicationInfo.jade')(showInfo);
                  $node.find('.right-major').html($html);
                  $node.find('#sureInfoBtn').removeClass('hide');
                  // 监听是否点击确认按钮
                  $node.off('sureInfoHandler')
                  .on('sureInfoHandler', function () {
                    goNextStep(data.application)
                  })
                  noty({text: errorText.info, type: 'success', layout: 'top', timeout: 2000});
                } else {
                  noty({text: '工单异常', type: 'error', layout: 'top', timeout: null});
                }
              })
              .fail(function (error) {
                var $errorJade = require('./error.jade');
                $node.find('.right-major').html($errorJade);
              });
            } else {
              // 无法连接主机的情况
              var $errorJade = require('./error.jade')({type: 'offline'});
              $node.find('.right-major').html($errorJade);
            }
          });
        }
      },
      {
        name: __("onemachine").steps.approve,
        actions: [
          { name: '上一步', target: function(){ goPreStep() }},
          { name: '退出', target: function(){ exitFn() }}
        ],
        onShown: function (data) {
          me.isAuthLogin = true;

          // me.adminVerify(data, goNextStep);
          me.initAdminLogin(data, goNextStep);

          //添加键盘
          me.addKeyBoard();

          //添加帐号自动补全
          me.autocomplete();

          $(me).off('userLoginSuccess').on('userLoginSuccess', function () {
            var adminUsername = me.getState('loginAdminUsername');
            var applicantUsername = me.getState('loginApplicantUsername');
            if (adminUsername === applicantUsername) {
              return noty({text: '工单不能进行自我授权', type: 'error', layout: 'top', timeout: 2000});
            }
            goNextStep();
          });
        }
      },
      {
        name: __("onemachine").steps.completed,
        actions: [
          { name: '退出', target: function(){ exitFn() }}
        ],
        onShown: function (data) {
          $node.triggerHandler('sureAuthandler');

          

          var $html = require('./authTip.jade');
          $node.find('.right-major').html($html);

          // 最后提交此次工单申请信息
          me.fetchRecordKioskLog();
          me.speak('end');
        }
      }
    ];

    goPreStep = function (data) {
      if (currentStep > 0) {
        currentStep -= 1;
        displayStep(data);
      }
    };

    goNextStep = function (data) {
      if (currentStep < steps.length) {
        currentStep += 1;
        displayStep(data);
      }
    };

    leftMenuItems = _.map(steps, function (step) {
      return { name: step.name, target: 'javascript:void(0)', id: step.id, className: step.className};
    });

    displayStep = function (data) {
      if (currentStep === steps.length) return;
      var step = steps[currentStep];
      $node.find('.leftmenu').vProcessBar('show', currentStep, leftMenuItems);
      $node.find('.taskbar').taskbar().taskbar('show', step.actions);
      $node.find('.right-major').empty();
      step.onShown(data, goNextStep);
    };

    // 初始化步骤
    displayStep();
    // 返回到首页
    exitFn = function () {
      $node.pagestate('setState', 0);
      // 清空数据状态
      me.stateStore = {};
      me.PREVAPPDATA = {};
      // me.destroyFingrePrint();
      // me.destroyCountDown();
      me.destroyStandarLogin();
      me.destroyAutocomplete();
      pubsub.unsubscribe('autologout.start');
    };
  },
  destroyAutocomplete: function () {
    if (this.$node.find('#username').length > 0) {
      this.$node.find('#username').Autocomplete('destroy');
    }
  },
  addKeyBoard: function () {
    this.$node.find('input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    });
  },
  autocomplete: function() {
    this.$node.find('#username').Autocomplete({
      url: '/user/autocomplete',
      limit: 5
    }).Autocomplete('show')
  },
  initLoginModule: function() {
    var me = this;
    var $node = me.$node;
    var $module = $node.find('.right-major');
    var isAuthLogin = me.isAuthLogin;

    $module.standarLogin('show', {
      isAdmin: false,
      fingerprint: {
        ajaxConfig: {
          url: '/fingerprint/auth'
        }
      },
      password: {
        isNoSession: true,
      }
    });

    $module
    .off('onPWDSubmit').on('onPWDSubmit', function(e, data) {
      me.userPasswordLogin(data);
    })
    .off('loginSuccess').on('loginSuccess', function(e, data) {
        if (isAuthLogin) {
          if (data.roles[0].permissions.length > 0) {
            me.setState('adminToken', data.token);
            me.setState('adminUserId', data.id);

            me.setState('loginAdminUsername', data.username);
            me.setState('loginAdminAlias', data.alias);

            noty({
              text: '管理员登录成功',
              type: 'success',
              layout: 'topRight',
              timeout: 1000
            });
            me.$node.off('sureAuthandler').on('sureAuthandler', function () {
              // 管理员登录成功，进行授权
              me.sureAuthFunction();
              me.sureAuthFunctionPeer();
            });

            $(me).triggerHandler('userLoginSuccess');

          } else {
            return noty({
              text: '您不是管理无法授权!',
              type: 'error',
              layout: 'top',
              timeout: 2000
            });
          }
        } else {
          me.setState('applicantToken', data.token);
          me.setState('applicantId', data.id);

          me.setState('loginApplicantUsername', data.username);
          me.setState('loginApplicantAlias', data.alias);

          $(me).triggerHandler('userLoginSuccess');
        }
    })
    .off('loginError').on('loginError', function(e, data) {

    });
  },
  getCabintInfo: function (id) {
    var d = $.Deferred();
    var applicantToken = this.getState('applicantToken');
    var url = '/cabinet?id=' + id;
    var isMasterLocalCabine = window.sessionStorage.getItem('isMasterLocalCabine');
    if (isMasterLocalCabine !== 'true') {
      url = '/master' + url;
    }
    server({
      url: url,
      method: 'get',
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function (data) {
      d.resolve(data);
    })
    .fail(function (error) {
      noty({text: '没有连接到主机', type: 'error', layout: 'top', timeout: 2000});
      d.reject(error);
    })

    return d;
  },
  loginPhotograph: function() {
    server({
      url: '/camera/capture',
      beforeSend: function (xhr) {
        xhr.setRequestHeader('asLocal', true);
      },
      method: 'GET'
    })
    .done(function(data){
      log.debug('login photograph success', data);
    })
    .fail(function(error){
      log.debug('login photograph fail', error);
    })
  },
  initAdminLogin: function (application, goNextStep) {
    var me = this;
    var $node = me.$node;
    var $module = $node.find('.right-major');

    console.log('工单信息: ', application);

    $module.standarLogin('show', {
      isAdmin: false,
      fingerprint: {
        ajaxConfig: {
          url: '/fingerprint/auth',
          data: {
            application: application,
          }
        }
      }
    });

    $module
    .off('loginSuccess').on('loginSuccess', function(e, data) {
      if (data.roles[0].permissions.length > 0) {
        me.setState('adminToken', data.token);
        me.setState('adminUserId', data.id);

        me.setState('loginAdminUsername', data.username);
        me.setState('loginAdminAlias', data.alias);

        noty({
          text: '管理员登录成功',
          type: 'success',
          layout: 'topRight',
          timeout: 1000
        });
        me.$node.off('sureAuthandler').on('sureAuthandler', function () {
          // 管理员登录成功，进行授权
          me.sureAuthFunction();
          me.sureAuthFunctionPeer();
        });

        $(me).triggerHandler('userLoginSuccess');

      } else {
        return noty({
          text: '您不是管理无法授权!',
          type: 'error',
          layout: 'top',
          timeout: 2000
        });
      }
    })
    .off('loginError').on('loginError', function(e, data) {

    });
  },
  listModal: function (options) {
    var url = options.url,
        fn = options.selectHandler,
        $emitButton = options.$btn,
        $node = this.$node,
        modalTitle = options.modalTitle || '请选择',
        $modal;
    if (!url || !$emitButton) return;
    $modal = $('<div/>').appendTo($node)
    .on('shown.bs.modal', function (e) {
      var $modalBox = $(e.target);
      var $list = $modalBox.find('.type-list').empty()
      .off('click', 'li')
      .on('click', 'li', function (e) {
        $modal.flexmodal('modalHide');
        var $currentTarget = $(e.currentTarget);
        (typeof fn === 'function') && fn($currentTarget);
      })
      .list({
        source: {
          url: url
        },
        limit: 5,
        innerTpl: typeListCell,
        renderFn: null
      });
      $list.list('show');
    });

    $emitButton
    .off('click')
    .on('click', function () {
      console.log('show modal')
      $modal.flexmodal('show',
        {
          modalTitle: modalTitle
        },
        typeListJade
      );
    });
  },
  // 修改工单状态
  sureAuthFunction: function(){
    var me = this,
        d = $.Deferred(),
        adminToken = me.getState('adminToken'),
        adminUserId = me.getState('adminUserId'),
        appId = me.getState('appId');
    var isMasterLocalCabine = window.sessionStorage.getItem('isMasterLocalCabine')
    var url = '/application/kioskApprove';

    if (isMasterLocalCabine !== 'true') {
      url = '/master/application/kioskApprove';
    }
    server({
      url: url,
      method: 'POST',
      data: {applicationId: appId, userId: adminUserId},
      beforeSend: function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(adminToken));
      }
    })
    .done(function(data){
      noty({text: '授权成功', type: 'success', layout: 'topRight', timeout: 1000});
      d.resolve(data);
    })
    .fail(function(error){
      var errorText = '授权失败';
      if (error && error.responseText) {
        errorText = error.responseText + ', 授权失败！';
      }
      noty({text: errorText, type: 'error', layout: 'topRight', timeout: 3000});
      me.$node.find('.authTips').text(errorText)
      d.reject(error);
    });
    return d;
  },
  sureAuthFunctionPeer: function () {
    var me = this,
        d = $.Deferred(),
        adminToken = me.getState('adminToken'),
        adminUserId = me.getState('adminUserId'),
        appId = me.getState('appId'),
        peerId = me.getState('peerId');

    // 检测是否需要用peer

    me.getCabintInfo(peerId)
    .done(function (cabinetInfo) {
      server({
        url: '/peer/' + peerId +'/application/kioskApprove',
        method: 'POST',
        data: {applicationId: appId, userId: adminUserId, targetCabinet: cabinetInfo},
        beforeSend: function(xhr){
          xhr.setRequestHeader("Authorization", 'Token ' + btoa(adminToken));
        }
      });
    })
  },
  checkApplicationUrlStore: function (type) {
    var url = null;
    var me = this;
    var isMasterLocalCabine = window.sessionStorage.getItem('isMasterLocalCabine');
    var prix = (isMasterLocalCabine !== 'true') ? '/master' : '';

    switch (type) {
      case 'storageGun':
        url = prix + '/application/storageCheck/gun?populate=applicant';
        break;
      case 'storageBullet':
        url = prix + '/application/storagecheck/bullet?populate=applicant';
        break;
      case 'gun':
        url = prix + '/application/check?populate=applicant';
        break;
      case 'bullet':
        url = prix + '/application/checkbullet?populate=applicant';
        break;
      case 'returnGun':
        url = prix + '/application/returnguncheck?populate=applicant';
        break;
      case 'returnBullet':
        url = prix + '/application/returnbulletcheck?populate=applicant';
        break;
      case 'maintain':
        url = prix + '/application/maintainCheck?populate=applicant';
        break;
    };
    return url;
  },
  //检测授权（还枪、子弹）
  checkAuthorization: function (type) {
    var d = $.Deferred(),
        me = this,
        url = me.checkApplicationUrlStore(type),
        method = 'GET',
        dataType = 'json',
        notyInst = null,
        applicantToken = me.getState('applicantToken');

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
      if(data && data.application && data.user){
        d.resolve(data);
      }else{
        d.reject(data);
      }
    })
    .fail(function(err){
      log.debug(err);
      if(err && err.responseJSON && err.responseJSON.error == '该枪锁堵转禁止操作'){
        noty({text: err.responseJSON.error, type: 'error', timeout:5000, layout: 'topRight'});
      }
      d.reject();
    });

    return d.promise();
  },
  checkApplication: function (type) {
    var d = $.Deferred(),
        me = this,
        url = me.checkApplicationUrlStore(type),
        method = 'GET',
        dataType = 'json',
        notyInst = null,
        applicantToken = me.getState('applicantToken');
    server({
      url: url,
      method: method,
      dataType: dataType,
      beforeSend : function(xhr){
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
        xhr.setRequestHeader('onemachine', true);
        notyInst = noty({text: '正在检查授权', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      log.debug(data);
      noty({text: '检测成功', type: 'success', timeout:2000, layout: 'topRight'});
      if(data && data.application && data.user){
        d.resolve(data);
      }else{
        d.reject(data);
      }
    })
    .fail(function(err){
      log.debug(err);
      d.reject(err);
    })
    .always(function(){
      notyInst.close();
    })
    return d.promise();
  },
  checkApplicationOneMachine: function (applicationId) {
    var d = $.Deferred();
    var me = this;
    server({
      url: '/application/hasCapturedApplication?applicationId=' + applicationId + '&v=' + new Date().getTime(),
      method: 'get',
      beforeSend: function (xhr) {
        var applicantToken = me.getState('applicantToken');
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function (data) {
      d.resolve(data);
    })
    .fail(function(error) {
      d.reject(error);
    });
    return d;
  },
  getJobShowInfo: function (data) {
    var jobType = this.getState('applicationType'),
        showInfo = {
          isHide : ''
        };
    switch (jobType) {
      case 'gun':
        showInfo.type = __('application').usingGun;
        break;
      case 'bullet':
        showInfo.type = __('application').getBullet;
        break;
      case 'storageGun':
        showInfo.type = __('application').storageGun;
        showInfo.isHide = 'hide';
        break;
      case 'storageBullet':
        showInfo.type = __('application').storageBullet;
        showInfo.isHide = 'hide';
        break;
      case 'emergency':
        showInfo.type = __('application').emergency;
        break;
      case 'returnGun':
        showInfo.type = __("onemachine").returnGun;
        break;
      case 'returnBullet':
        showInfo.type = __("onemachine").returnBullet;
        break;
      case 'maintain':
        showInfo.type = __("onemachine").maintain;
        break;
      case 'returnMaintain':
        showInfo.type = __('onemachine').returnMaintain;
        break;
    }

    if (data.num) {
      showInfo.num = data.num;
    }

    showInfo.detail = this.getState('applicationDetail');
    return showInfo;
  },
  fetchRecordKioskLog: function () {
    var me = this,
        adminUsername = me.getState('loginAdminUsername'),
        adminAlias = me.getState('loginAdminAlias'),
        adminId = me.getState('adminUserId'),

        applicantUsername = me.getState('loginApplicantUsername'),
        applicantAlias = me.getState('loginApplicantAlias'),

        applicationId = me.getState('appId'),

        username = applicantAlias || applicantUsername,
        adminname = adminAlias || adminUsername,
        data = {
          username: username,
          adminname: adminname,
          applicationId: applicationId,
          adminId: adminId
        };
    console.log('fetch record kiosk log ###############################', applicantAlias, applicantUsername)
    server({
      url: '/optlog/kioskLog',
      method: 'POST',
      data: data
    })
  },
  kioskReturn: function (id) {
    var me = this;
    var url = '/application/kioskReturn';
    var isMasterLocalCabine = window.sessionStorage.getItem('isMasterLocalCabine');
    
    if (isMasterLocalCabine !== isMasterLocalCabine) {
      url = '/master/application/kioskReturn';
    }
    server({
      url: url,
      method: 'POST',
      data: {applicationId: id},
      beforeSend: function (xhr) {
        var adminToken = me.getState('adminToken');
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(adminToken));
      }
    })
    .done(function (data) {
      noty({text: '已确定还枪, 请管理进行归还！', type: 'success', layout: 'topRight', tiemout: 3000});
      me.$node.pagestate('setState', 0);
      // 清空数据状态
      me.stateStore = {};
      me.PREVAPPDATA = {};
      // me.destroyFingrePrint();
      // me.destroyCountDown();
      me.destroyStandarLogin();
      me.destroyAutocomplete();
    })
    .fail(function (err) {
      console.log('kioskReturn ################# fail', err);
      noty({text: '操作失败请重试', type: 'error', layout: 'top', timeout: 2000});
    })
  },
  peerKioskReturn: function (id, cabinetId) {
    var me = this;
    server({
      url: '/peer/' + cabinetId + '/application/kioskReturn',
      method: 'POST',
      data: {applicationId: id},
      beforeSend: function (xhr) {
        var adminToken = me.getState('adminToken');
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(adminToken));
      }
    })
  },
  /*
    状态管理
  */
  setState: function (key, value) {
    this.stateStore[key] = value;
  },
  getState: function (key) {
    return this.stateStore[key];
  },
  changeRouteSetFlashBag: function (route) {
    var me = this;
    me.setState('jobType', me.getState('applicationType'));
    me.setFlashbag(me.stateStore);
    me.nav(route);
  },
  /** 获取系统设置settings
   * 获取成功会在this中存储settings
  */
  getSettings: function() {
    var me =this;
    me.settings = {};
    server({
      url: '/system/settings?v=' + new Date().getTime()
    })
    .done(function(data) {
      _.each(data, function(item) {
        me.settings[item.key] = item.value;
      });
      window.localStorage.setItem('systemSetData', me.settings);
    });
  },
  isAdminCreatedApp: function() {
    return this.settings['adminCreateApp'];
  }
};

// 扩展OneMachine的prototype
_.extend(OneMachine.prototype, prototype);
module.exports = OneMachine;
