'use strict';

// 样式
var baseCss = require('../common/less/base.less');
var animateCss = require('animate.css');
var indexCss = require('./less/index.less');

// jade模板
var jade = require('./index.jade');
var gridCell = require('./gridcell.jade');

// 组件
var pagestate = require('pagestate');
var formwork = require('formwork');
var vprocessbar = require('vprocessbar');
var taskbar = require('taskbar');
var pubsub = require('PubSubJS');
var noty = require('customnoty');
var loginform = require('loginform');
var server = require('common/server').server;
var user = require("common/usermanagement");
var countdown = require('countdown');
var flexModal = require('flexmodal');
var list = require('list');
var Message = require('common/message.js');
var gridlist = require('gridlist');
var paging = require('paging');
var backBtn = require('backbtn');
var moment = require('moment');

var QuickDook = function (reg) {
  reg.apply(this);
  return this;
}

var metadata = {
  NS: 'quickdook',
  noAuth: true,
  endpoint: '/quickdook'
}

_.extend(QuickDook, metadata);

var prototype = {
  init: function () {
    var me = this;
    //定义一个存储当前状态的app对象
    me.CURRENTSTATE = {
      "applicantToken": null
    }
    me.approvedApplicationListData = [];
    me.getSettings();
  },
  show: function ($node, cb) {
    var me = this;
    $node.append(jade());
    $node.find('.appm-status-bar').backBtn('show', me.backBtnFnArray);
    me.loadProcess();

    cb();
  },
  loadProcess: function (currentStep) {
    var me = this,
        $node = me.$node;
    me.currentStep = currentStep || 0;
    me.steps = [
      {
        name: '工单列表',
        actions: [
          {name: '退出', target: function(){me.nav('/m/home')}}
        ],
        onShown: function ($node, next, data) {
          var $html = require('./gridlistJade.jade');
          $node.find('.right-major').html($html);

          me.getGridList($node);
          $node.find('.paging-btn-box')
          .paging('show');

          $node.find('.list-cont')
          .off('click', '.grid-list-cell')
          .on('click', '.grid-list-cell', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ index', $(e.currentTarget).data('index'))
            var data = me.approvedApplicationListData[$(e.currentTarget).data('index')];
            console.log('click grid list cell ########################################', data)
            if (data.remote && data.remoteStatus === 'pending') {
              return noty({text: '远程领导还未进行未授权', type: 'error', layout: 'top', timeout: 2000})
            } else if (data.remote && data.remoteStatus === 'rejected') {
              return noty({text: '远程领导已拒绝该工单申请', type: 'error', layout: 'top', timeout: 2000});
            }

            me.setStateData('curr', 'applicantToken', data.applicant.token);
            me.setStateData('curr', 'jobType', data.flatType);
            me.setStateData('curr', 'applicantId', data.applicant.id);
            me.setStateData('curr', 'username', data.applicant.username);
            me.setStateData('curr', 'alias', data.applicant.alias);
            me.application = data;

            next(data);
          });

        }
      },
      {
        name: '开门',
        id: 'changeableStep',
        actions: [
          { name: '开启库房门', target: function()  {
              me.openOrgDoor();
            },
            id: 'openOrgDoorButton'
          },
          {
            name: '开启柜机门', target: function() {
              var data = me.getStateData('curr', 'application');
              me.sureOpenCabinetDoor(data);
            },
            id: 'openCabinetDoorButton'
          }
        ],
        onShown: function ($node, next, data) {
          var isShowGateSwitch = me.getStateData('curr', 'showGateSwitch');
          console.log('isShowGateSwitch ###############################', isShowGateSwitch);
          if (!isShowGateSwitch) {
            $('#openOrgDoorButton').hide();
          } else {
            $('#openOrgDoorButton').show();
          }
          me.setStateData('curr', 'application', data);
          var $html = require('./appInfo.jade')(data);
          $node.find('.right-major').html($html);
        }
      },
      {
        name: '完成',
        actions: [
          {name: '退出', target: function(){ me.nav('/m/home')}}
        ],
        onShown: function($node, next, application){
          var html = require('./doorclosing.jade')(),
              jobType = me.getStateData('curr', 'jobType');
          $node.find('.right-major').html(html);

          me.speak('cabinetDoorOpened');

          me.markAppProcessed();

          if(jobType === 'returnGun'){
            me.markGunStatus();
          }
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
      return { name: step.name, target: 'javascript:void(0)', id: step.id};
    });

    me.displayStep = function(data){
      if(me.currentStep == me.steps.length) return;
      var step = me.steps[me.currentStep];
      $node.find('.leftmenu').vProcessBar('show', me.currentStep, leftMenuItems);
      $node.find('.taskbar').taskbar().taskbar('show', step.actions);
      $node.find('.right-major').empty();
      step.onShown($node, _.bind(me.goNextStep, me), data);
    }

    me.displayStep();
  },
  openOrgDoor: function() {
    var me = this,
        username = me.getStateData('curr', 'username'),
        applicantId = me.getStateData('curr', 'applicantId'),
        alias = me.getStateData('curr', 'alias');
    this.server({
      url: '/cabinetmodule/opengate',
      method: 'post',
      data: {
        username: username,
        userId: applicantId,
        alias: alias
      }
    })
    .done(function(data) {
      me.$node.find('#openOrgDoorButton').addClass('hide');
      me.checkDoorAllOpen();

      noty({text: '库房门已打开', type: 'success', layout: 'topRight', timeout: 3000});
    })
    .fail(function(error) {
      var errObj = null;
      if (error.responseText) {
        errObj = JSON.parse(error.responseText)
      } else {
        errObj = {error: '开启库房门失败'}
      }
      console.log(errObj, '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@')
      noty({text: errObj.error, type: 'error', layout: 'top', timeout: 3000});
    })
  },
  sureOpenCabinetDoor: function(data) {
    var me = this;
    var type = me.getStateData('curr', 'jobType');

    switch (type) {
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
  },
  destroy: function (cb) {
    cb();
  },
  checkDoorAllOpen: function() {
    var $node = this.$node;
    var showGateSwitch = this.getStateData('curr', 'showGateSwitch');
    if (showGateSwitch) {
      if ($node.find('#openOrgDoorButton').hasClass('hide') && $node.find('#openCabinetDoorButton').hasClass('hide')) {
        this.goNextStep();
      }
    } else {
      if ($node.find('#openCabinetDoorButton').hasClass('hide')) {
        this.goNextStep();
      }
    }
  },
  showError : function(err){
    noty({text: err, type: 'error', layout: 'top', timeout:2000});
  },
  getGridList: function($node){
    var me = this;
    me.approvedApplicationListData = [];
    $node.find('.list-cont')
    .gridlist({
      source: {
        url : '/application/approvedApplicationList',
        method: 'get'
      },
      sort: JSON.stringify({
        "createdAt" : "DESC"
      }),
      innerTpl: function(data){
        me.approvedApplicationListData.push(data);
        _.merge(data, {moment : moment});
        return gridCell(data);
      }, // A compiled jade template,
      renderFn : null // How to render body
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
          me.approvedApplicationListData = [];
          $node.find('.list-cont').gridlist('refresh');
        },
        next : function(){
          me.approvedApplicationListData = [];
          log.debug('next page');
          $node.find('.list-cont').gridlist('next');
        },
        prev : function(){
          me.approvedApplicationListData = [];
          log.debug('prev page');
          $node.find('.list-cont').gridlist('prev');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });

  },
  ////////////////////////////////////////////////成功后的操作
  successAuthorizedGetGun: function(data){
    var me = this,
        $node = me.$node;

    if (data) {
      if(data.cabinetModule){
        var cabinetModule = data.cabinetModule;

        me.speak('withdrawing');
        // cabinetModule 多个的情况，请求多枪开门 
        if (cabinetModule.length > 1) {
          me.openBatch(data.id, data.gun);
        } else {
          var module = data.cabinetModule[0];
          if (!module) {
            return noty({text: '没有模块信息', type: 'error', layout: 'top', timeout: 2000});
          }
          module.applicationId = data.id;
  
          me.open(module);
          //记录下module
          me.setStateData('curr', 'module', module);
        }

      } else {
        noty({text: '配枪没有枪位信息，请确认是否存入', type: 'error', layout: 'top', timeout:5000});
      }
    }else{
      noty({text: '无法获取枪支信息，请确认配枪和公用枪选择情况', type: 'error', layout: 'top', timeout:5000});
    }
  },
  successAuthorizedGetBullet: function(data){
    var me = this,
        $node = me.$node,
        module = data.cabinetModule[0];
    console.log('############# getBullet module =>', module);
    if (!module) {
      return noty({text: '没有模块信息', type: 'error', layout: 'top', timeout: 2000});
    }
    me.speak('takeBullet');
    me.open(module);
    //记录下module
    me.setStateData('curr', 'module', module);
  },
  successAuthorizedReturnGun: function(data){
    var me = this,
        $node = me.$node;
    if(data.gun){
      if(data.gun.cabinetModule && data.gun.cabinetModule.length > 0){
        var module = data.gun.cabinetModule[0];
        module.applicationId = data.application.id;

        me.speak('cabinetDoorOpened');
        me.open(module);
      } else {
        noty({text: '无法获取仓位', type: 'error', layout: 'top', timeout:5000});
      }
    }

  },
  successAuthorizedReturnBullet: function(data){
    var me = this,
        $node = me.$node;
    if (data.cabinetModule) {
      var module = data.cabinetModule[0];
      module.applicationId = data.application.id;
      console.log('return bullet =>', module);
      me.speak('cabinetDoorOpened');
      me.open(module);
    }else{
      noty({text: '无法获取仓位', type: 'error', layout: 'top', timeout:5000});
    }
  },
  successAuthorizedSaveGun: function(data){
    this.openall(data);
  },
  successAuthorizedSaveBullet: function(data){
    this.openall(data);
  },
  successAuthorizedEmergency: function(data){
    this.openall(data);
  },
  successAuthorizedMaintain: function (data) {
    this.openall(data);
  },
  successAuthorizedReturnMaintain: function (data) {
    this.openall(data);
  },


  //点击完成改变枪支的状态
  markGunStatus : function(){
    var me = this,
        application = me.getStateData('curr', 'application').application;
    if(application.actualGun){
      var url = '/gun/' + application.actualGun.id,
        data = {storageStatus : 'in'},
        method = 'PUT',
        dataType = 'json';
      me.server({
        url: url,
        method: method,
        data : data,
        dataType : dataType
      }) //authorizations of getting gun
      .done(function(data){
        log.debug(data);
        noty({text: '枪支状态已经更新', type: 'success', timeout:5000, layout: 'topRight'});
      })
      .fail(function(err){
        log.debug(err);
        me.showError('操作命令发送失败');
      });
    }
  },
  //点击完成改变工单状态
  markAppProcessed : function(){
    var application = this.getStateData('curr', 'application'),
        me = this,
        data = null,
        jobType = me.getStateData('curr', 'jobType');

    var url = '/application/processed/' + application.id;
    if(jobType === 'returnBullet' || jobType === 'returnGun' ||
      jobType === 'emergency' || jobType === 'storageGun' ||
      jobType === 'storageBullet' || jobType === 'returnMaintain'){
      data = {status: 'complete'};
    }else{
      var module = me.getStateData('curr', 'module');
      data = {status : 'processed', module : module};
    }
    
    me.server({
      url: url,
      method: 'PUT',
      data: data,
      dataType: 'json'
    }) //authorizations of getting gun
    .done(function(data){
      log.debug(data);
      noty({text: '申请状态已经更新', type: 'success', timeout:5000, layout: 'topRight'});
    })
    .fail(function(err){
      log.debug(err);
      me.showError('操作命令发送失败');
    });
  },
  openall : function(application){
    log.debug('Opening Cabine Door and Module');
    var me = this,
        url = '',
        method = '',
        url = '/cabinetmodule/openall',
        method = 'POST',
        dataType = 'json',
        notyInst = null,
        applicantToken = me.getStateData('curr', 'applicantToken'),
        jobType = me.getStateData('curr', 'jobType'),
        applicantId = me.getStateData('curr', 'applicantId'),
        alias = me.getStateData('curr', 'alias'),
        username = me.getStateData('curr', 'username');

    var dataObject = {application: application, username: username, userId: applicantId, alias: alias};

    this.server({
      url: url,
      method: method,
      dataType: dataType,
      data : dataObject,
      beforeSend : function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));

        notyInst = noty({text: '发送操作命令中', type: 'info', layout: 'topRight', timeout:5000});
      }
    }).done(function(data){
      log.debug(data);
      me.$node.find('#openCabinetDoorButton').addClass('hide');
      me.checkDoorAllOpen();
      me.pushOpenLog(dataObject, 'openall');
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
        me.showError('获取用户信息失败, 请稍候再试')
      } else {
        me.showError('openAll操作命令发送失败');
      }
    })
    .always(function(){
      notyInst.close();
    })
    return;
  },
  openBatch: function(applicationId, gun) {
    var me = this, action, data,
      jobType = me.getStateData('curr', 'jobType'),
      applicantToken = me.getStateData('curr', 'applicantToken');

    if (jobType === 'gun') {
      action = 'getGun'
    }

    data = {
      moduleType: jobType,
      action: action,
      applicationId: applicationId,
      gunList: gun
    }

    server({
      url: '/cabinetmodule/openBatch',
      method: 'POST',
      data: data,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
        noty({text: '发送操作命令中', type: 'info', layout: 'topRight', timeout:5000});
      }
    })
    .done(function() {
      me.$node.find('#openCabinetDoorButton').addClass('hide');
      me.checkDoorAllOpen();
      me.pushOpenLog(data, 'openBatch');
      noty({text: '操作命令发送成功', type: 'success', timeout:5000, layout: 'topRight'});
    })
    .fail(function(error) {
      noty({text: '多支取枪操作失败!', type: 'error', layout: 'top', timeout: 3000});
    });
  },
  open : function(module){
    log.debug('Opening Cabine Door and Module', 'module=>', module);

    var me = this,
        moduleId = module.id,
        moduleType = module.type,
        moduleCanId = module.canId,
        username = me.getStateData('curr', 'username'),
        applicantId = me.getStateData('curr', 'applicantId'),
        alias = me.getStateData('curr', 'alias'),
        jobType = me.getStateData('curr', 'jobType'),
        data = {
          moduleId: moduleId,
          moduleType : moduleType,
          moduleCanId : moduleCanId,
          action : null,
          applicationId : module.applicationId,
          username: username,
          userId: applicantId,
          alias:alias
        },
        url = '',
        method = '',
        url = '/cabinetmodule/open',
        method = 'POST',
        dataType = 'json',
        notyInst = null,
        applicantToken = me.getStateData('curr', 'applicantToken');

    switch (jobType) {
      case 'getGun':
      case 'gun':
        data.action = 'getGun'
        break;
      case 'bullet':
      case 'getBullet':
        data.action = 'getBullet'
        break;
      default:
        data.action = jobType
    }

    console.log(data, '###### ############# data ...');

    server({
      url: url,
      method: method,
      dataType: dataType,
      data : data,
      beforeSend : function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
        notyInst = noty({text: '发送操作命令中', type: 'info', layout: 'topRight', timeout:5000});
      }
    }).done(function(){
      me.$node.find('#openCabinetDoorButton').addClass('hide');
      me.checkDoorAllOpen();
      me.pushOpenLog(data, 'open');
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
        me.showError('获取用户信息失败, 请稍候再试')
      } else {
        me.showError('open操作命令发送失败');
      }
    })
    .always(function(){
      notyInst.close();
    })
    return;
  },
  
  pushOpenLog: function(data, type) {
    var me = this;
    var cabinetName = this.getLocalCabine();
    var newData = data;
    var num = data.application && data.application.num;
    var jobType = me.getStateData('curr', 'jobType');

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

    console.log('########这个是日志maintain=>', newData)

    this.server({
      url: '/optlog/openLog',
      method: 'POST',
      data: _.merge(newData, {openType: type, cabinetName: cabinetName})
    })
  },
  getSettings: function() {
    var me = this;
    server({
      url: '/system/settings'
    })
    .done(function(data) {
      var showGateSwitch = false;
      data.forEach(function(item, index) {
        if (item.key === 'showGateSwitch' && item.value === 'true') {
          showGateSwitch = true;
        } else {
          showGateSwitch = false;
        }
      });
      me.setStateData('curr', 'setting', data);
      me.setStateData('curr', 'showGateSwitch', showGateSwitch);
      console.log('获取系统设置信息成功:', data, showGateSwitch);
    })
    .fail(function(error) {
      console.log('获取系统设置信息失败:', error);
    })
  },
  getLocalCabine: function() {
    var setting = this.getStateData('curr', 'setting');
    if (setting) {
      var cabinetName = '';
      _.each(setting, function(item) {
        if (item.key === 'boxname') {
          cabinetName = item.value;
          return false;
        }
      });
      return cabinetName;
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
  }
}

_.extend(QuickDook.prototype, prototype);
module.exports = QuickDook;
