/*
  SimpleCreateApplication module
  this.method： { nextRoute : '包装me.nav,在路由之前，执行setFlashbag设置下个app所需要的数据对象' }
*/

var animateCss = require('animate.css');
var font = require('fontawesome/less/font-awesome.less');
var checkbox3 = require('checkbox3/dist/checkbox3.css');
var noty = require('customnoty');
var keypad = require('keypad');
var flexModal = require('flexmodal');
var list = require('list');
var pubsub = require('PubSubJS');
var pagestate = require('pagestate');
var gridlist = require('gridlist');
var paging = require('paging');
var datepicker = require('datetimepicker');
var validator = require('validator-js');
var formwork = require('formwork');
var moment = require('moment');
var taskbar = require('taskbar');
var vprocessbar = require('vprocessbar');
var server = require('common/server.js').server;
var gridlist = require('gridlist');
var simpleAppHeader = require('simpleappheader');

var gunList = require('./gunlist.jade');
var bulletTypeCell = require('./bullettypecell.jade');
var bulletModuleList = require('./bulletModuleList.jade');
var typeListCell = require('./typelistcell.jade');
var indexTpl = require('./index.jade');
var cabinetList = require('./cabinetList.jade');
// var i18n = require('locales/zh-CN.json');
var indeCss = require('./less/index.less');

var SimpleCreateApplication = function (reg) {
  reg.apply(this);
  log.info('SimpleCreateApplication has been created');
  return this;
}

var metadata = {
  NS  : 'simplecreateapplication',
  pub : [],
  sub : [],
  endpoint: '/optlog'
}

_.extend(SimpleCreateApplication, metadata);

var prototype = {
  init: function () {
    log.info('init simplecreateapplication entry');
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


    //定义传递给下一个app的数据对象
    me.NEXTAPPDATA = {
      "moduleName": metadata.NS,     //当前模块的名字
      "bulletInfo": null,
      "newApplicationInfo": {
        "detail": null,
        "flatType": null
      },
      "appId": null,
      "applicantName": me.PREVAPPDATA.applicantName,
      "applicantSuperior": me.PREVAPPDATA.applicantSuperior,
      "applicantId": me.PREVAPPDATA.applicantId,
      "applicantToken": me.PREVAPPDATA.applicantToken,
      "jobType": me.PREVAPPDATA.jobType,
      "applicantUsername": me.PREVAPPDATA.applicantUsername,
      "facePerception": me.PREVAPPDATA.facePerception
    }

    //定义一个存储当前app状态的对象,目前所有的值都会在下面程序中改变
    me.CURRENTSTATE = {
      "createJobType": "gun",          //创建工单的类型，默认为gun
      "hasNetworking": false,         //默认为没有联网
      "storageJobType": null,         //存储的类型
      "userHasGun": false,            //用户是否有枪
      "userGunId": null,               //用户枪的Id
      "localCabinetIsMaster": true,
      "newApplicationInfo": {
        "detail": null
      },
      "localCabinetCode": null,
      "createdAppCabinetCode": null
    }

    //检测是否联网模式
    me.checkHasNetwork(this.CURRENTSTATE);

  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  show: function ($node, cb) {
    var me = this,
        $node = me.$node;
    //index.jade挂载到$node下
    $node.append(indexTpl());

    //插入创建工单模板
    $node.find('.simple-app_main').append(require('./edit.jade')({
      i18n: __('simpleCreateApplication').form
    }));

    //添加头部组件
    $node.find('.simple-app_header')
    .simpleAppHeader('show', function(){
      //点击返回按钮跳转到上一个app页面
      me.changeRouteSetFlashBag('/m/simpleapplication');
    });

    //检测用户是否有枪,来决定UI流程。
    me.checkUserHasGun();

    //加载流程UI
    me.loadCreateApplication();

    //初始化initFormwork
    me.initFormwork();

    cb();
  },
  loadCreateApplication: function () {
    var me = this,
        $node = me.$node,
        $editform = $node.find('.simple-app_main form');
    //设置当前的step为0
    me.currentStep = 0;
    this.steps = [
      {
        name: __('simpleCreateApplication').steps.selectedAppType,
        actions: [
          { name: __('buttonText').nextBtn, target: _.bindKey(me, 'goNextStep')}
        ],
        onShown: function ($node, next) {
          me.setCreateAppStepShowContent(1);
        },
        onNext: function (next) {
          var check = function (event, errors) {
            $editform.off(metadata.NS + '.form.validate.valid', check);
            $editform.off(metadata.NS + '.form.validate.error', check);

            if (errors) {
              me.showError(errors.join(', '));
            } else {
              next();
            }
          }
          $editform.one(metadata.NS + '.form.validate.valid', check)
          .one(metadata.NS + '.form.validate.error', check);
          $editform.formwork('validate', ['#type', '#bulletType', '#num']);
        }
      },
      {
        name: __('simpleCreateApplication').steps.selectedCabinet,
        id: 'publicStep',
        actions: [
          { name: '', target:function(){}, className: 'pager-box hide', id: 'js-pager-box' },
          {
            name: __('buttonText').cancelBtn,
            target: function () {
              me.changeRouteSetFlashBag('/m/simpleapplication')
            }
          },
          {
            name: __('buttonText').prevBtn,
            target: function () {
              me.goPreStep()
            }
          }
        ],
        onShown: function($node, next) {
          //获取当前选择的工单是否为枪
          var storageJobType = me.getStateData('curr', 'storageJobType'),
              //如果没有工单类型，默认为存储工单的类型！！！！！！！！！！！！！！！！！！！！！！！
              jobType = me.getStateData('prev', 'jobType') || storageJobType;

            me.setCreateAppStepShowContent(2);
            me.getGridList($node, next, 'cabinet', $node.find('.cabinet-list'));
        }
      },
      {
        name: __('simpleCreateApplication').steps.selectedGun,
        id: 'publicGun',
        actions: [
          { name: '', target: function(){}, className: 'pager-box hide', id: 'js-pager-box' },
          {
            name: __('buttonText').cancelBtn,
            target: function () {
              me.changeRouteSetFlashBag('/m/simpleapplication')
            }
          },
          {
            name: __('buttonText').prevBtn,
            target: function () {
              me.goPreStep()
            }
          },
          {
            name: __('buttonText').nextBtn,
            target: _.bindKey(me, 'goNextStep'),
            className: 'hide',
            id: 'selectGunsNextBtn'
          }
        ],
        onShown: function($node, next) {
          if (me.userHasGun) {
            $node.find('#share-gun-id').val(me.userGunId);
            $node.find('#share-gun-cabinet-module').val(null);
            next();
          } else {
            me.setCreateAppStepShowContent(2);
            me.getGridList($node, next, 'gun', $node.find('.gun-list'));
          }
        }
      },
      {
        name: __('simpleCreateApplication').steps.selectedBullet,
        id: 'bulletRoom',
        actions: [
          { name: '', target: function () { }, className: 'pager-box hide', id: 'js-pager-box' },
          {
            name: __('buttonText').cancelBtn,
            target: function () {
              me.changeRouteSetFlashBag('/m/simpleapplication')
            }
          },
          {
            name: __('buttonText').prevBtn,
            target: function () {
              me.goPreStep()
            }
          },
          {
            name: __('buttonText').nextBtn,
            target: function () {
              me.goNextStep()
            },
            className: 'hide',
            id: 'selectBulletModuleBtn'
          }
        ],
        onShown: function($node, next) {
          me.setCreateAppStepShowContent(2);
          me.getGridList($node, next, 'bullet', $node.find('.bullet-room-list'));
        }
      },
      {
        name: __('simpleCreateApplication').steps.selectedAppDate,
        actions: [
          {
            name: __('buttonText').cancelBtn,
            target: function () {
              me.changeRouteSetFlashBag('/m/simpleapplication')
            }
          },
          {
            name: __('buttonText').prevBtn,
            target: _.bindKey(me, 'goPreStep'),
            id: 'last-prev-btn'
          },
          {
            name: __('buttonText').createdAppBtn,
            id: 'createApplicationButton',
            target: function () {
              me.goNextStep();
            }
          }
        ],
        onShown: function($node, next) {
          //切换到选择时间的页面
          me.setCreateAppStepShowContent(3);
          //检测用户是否有枪，有枪的时候隐藏上一步按钮
          var userHasGun = me.getStateData('curr', 'userHasGun'),
              isJobNeedGridList = me.getStateData('curr', 'isJobNeedGridList');
          if(userHasGun || !isJobNeedGridList) {
            $node.find('#last-prev-btn').addClass('hide');
          }
        },
        onNext: function (next) {
          var check = function(event, errors){
            $editform.off(metadata.NS + '.form.validate.valid', check);
            $editform.off(metadata.NS + '.form.validate.error', check);
            if(errors){
              me.showError(errors.join(', '));
            }else{
              $editform.one(metadata.NS + '.form.submit', function(e, data){
                $('#createApplicationButton').addClass('disabled');
                //创建工单
                me.submitApp(data)
                .done(function(data){
                  noty({text: '创建成功', type: 'success', timeout:5000, layout: 'topRight'});
                  $('#createApplicationButton').removeClass('disabled');
                  console.log('####### 创建工单成功 ################', data)
                  if (data.cabinet) {
                    me.setStateData('curr', 'createdAppCabinetCode', data.cabinet);
                  }

                  next();
                })
                .fail(function(err){
                  console.log('% this is create application error', err)
                  $('#createApplicationButton').removeClass('disabled');
                  if(err && err.responseJSON)
                    noty({text: '创建失败:' + err.responseJSON.error, type: 'error', layout: 'top', timeout:5000});
                  else
                    noty({text: '创建失败', type: 'error', timeout:5000, layout: 'top'});
                })
              })
              $editform.formwork('submit');

            }
          }

          $editform.one(metadata.NS + '.form.validate.valid', check)
          .one(metadata.NS + '.form.validate.error', check);

          $editform.formwork('validate', ['#start', '#end', '#detail']);
        }
      },
      {
        name: __('simpleCreateApplication').steps.completed,
        actions: [
          {
            name: __('buttonText').goHomeBtn,
            target: function () {
            me.changeRouteSetFlashBag('/m/simpleapplication');
            }
          },
          {
            name: __('buttonText').nowAuthorizationBtn, target: function () {
              me.changeRouteSetFlashBag('/m/simpleapplicationauth');
            },
            className: 'immediately-authorized-button'
          }
        ],
        onShown: function ($node, next) {
          var jobType = me.getStateData('prev', 'jobType'),
              bulletInfo = me.getStateData('curr', 'bulletInfo'),
              localCabinetCode = me.getStateData('curr', 'localCabinetCode'),
              createdAppCabinetCode = me.getStateData('curr', 'createdAppCabinetCode');

          // 工单创建成功, 文字展示
          $('.createdSuccessTips').text(__('simpleCreateApplication').appCreatedSuccess);
          me.setCreateAppStepShowContent(4);
          //取子弹的时候显示，子弹信息
          // if(jobType === 'bullet' && bulletInfo.userIp !== '::ffff:127.0.0.1') {
          //   var takebullet = require('./takebullet.jade')({
          //     cabinetmodule: bulletInfo,
          //     i18n: i18n
          //   });
          //   $node.find('.create-application-bullet-last-info-box').removeClass('hide').html(takebullet).next().addClass('hide');
          // }else{
          //   me.setCreateAppStepShowContent(4);
          // }

        }
      }
    ];

    var jobType = me.getStateData('prev', 'jobType');

    if (jobType === 'gun') {
      me.steps.splice(3, 1);
    } else if (jobType === 'bullet') {
      me.steps.splice(2, 1);
    } else {
      me.steps.splice(2, 2);
    }

    this.goPreStep = function (data) {
      if(me.currentStep > 0) {
        var cursor = -1;
        me.displayStep(data, cursor);
      }
    }
    this.goNextStep = function (data) {
      if(me.currentStep < me.steps.length) {
        var cursor = 1;
        me.displayStep(data, cursor);
      }
    }

    var leftMenuItems = _.map(me.steps, function(step){
      return { name: step.name, target: 'javascript:void(0)', id: step.id};
    });

    this.displayStep = function(data, cursor){
      var targetStepIndex = me.currentStep + ( typeof cursor !== 'undefined' && cursor != null ? cursor : 0);
      if(targetStepIndex >= me.steps.length || targetStepIndex < 0) return;

      var step = me.steps[targetStepIndex];
      var prevStep = (targetStepIndex >= 0) ? me.steps[targetStepIndex - 1] : null;
      if(prevStep && prevStep.onNext){
        prevStep.onNext(function(){
          me.currentStep = targetStepIndex;
          $node.find('.leftmenu-create').vProcessBar('show', me.currentStep, leftMenuItems);
          $node.find('.taskbar-create').taskbar('show', step.actions);
          step.onShown($node.find('.right-major-create'), _.bind(me.goNextStep, me), _.bind(me.goPreStep, me), data);
        })
      }else{
        me.currentStep = targetStepIndex;
        $node.find('.leftmenu-create').vProcessBar('show', me.currentStep, leftMenuItems);
        $node.find('.taskbar-create').taskbar('show', step.actions);
        step.onShown($node.find('.right-major-create'), _.bind(me.goNextStep, me), _.bind(me.goPreStep, me), data);
      }
    }

    me.displayStep();
    me.addKeyboard();

  },
  addKeyboard: function () {
    this.$node.find('#num').keypad('init', {
      type: 'IP'
    });
  },
  setStepText : function(){
    var applicationtype = this.getStateData('prev', 'jobType');
    if (applicationtype === 'gun') {
      return '请选择公用枪';
    } else {
      return '请选择柜机';
    }
  },
  getGridList: function ($node, next, type, $listBox) {
    var me = this,
        url = null,
        limit = 9,
        hasNetworking = me.checkHasNetwork(),
        applicantToken = me.getStateData('prev', 'applicantToken'),
        localCabinetIsMaster = me.getStateData('curr', 'localCabinetIsMaster'),
        localCabinetCode = me.getStateData('curr', 'localCabinetCode');
    switch (type) {
      case 'gun':
        if (!localCabinetIsMaster) {
          url = '/master/gun/masterpublicgun?cabinetId=' + me.selectCabinetId
        } else {
          url = '/gun/masterpublicgun?cabinetId=' + me.selectCabinetId
        }
        limit = 20;
        break;
      case 'cabinet':
        if (me.checkedIncludeLocalCabinet()) {
          if (!localCabinetIsMaster) {
            url = '/cabinet?populate=cabinet&sort={"createdAt":"ASC"}&where={"isMaster":false}';
          } else {
            url = '/cabinet?populate=cabinet&sort={"createdAt":"ASC"}';
          }
        } else {
          if (!localCabinetIsMaster) {
            url = '/cabinet?populate=cabinet&sort={"createdAt":"ASC"}&where={"isLocal": false, "isMaster": false}';
          } else {
            url = '/cabinet?populate=cabinet&sort={"createdAt":"ASC"}&where={"isLocal": false}';
          }
        }
        break;
      case 'bullet':
        var bulletTypeId = me.$node.find('#bulletType').val();
        var selectedCabinetIsMaster = me.getStateData('curr', 'selectedCabinetIsMaster');

        
        if (me.selectCabinetId === localCabinetCode) {
          // url = '/cabinetmodule?populate=bulletType,cabinet&sort={"canId":"ASC"}';
          url = '/cabinetmodule/list?type=bullet&cabinetId=' + me.selectCabinetId + '&isLocal=true';
        } else {
          // if (selectedCabinetIsMaster) {
          //   url = '/master/cabinetmodule?populate=bulletType,cabinet&t&sort={"canId":"ASC"}'
          // } else {
          //   url = '/peer/' + me.selectCabinetId + '/cabinetmodule?populate=bulletType,cabinet&sort={"canId":"ASC"}';
          // }
          url = '/cabinetmodule/list?type=bullet&cabinetId=' + me.selectCabinetId + '&isLocal=false';
        }

        if (!me.checkedOpenBatch()) {
          url = url + '&bulletType=' + bulletTypeId;
          // url = url + '&where={"bulletType": "' + bulletTypeId + '","cabinet":"' + me.selectCabinetId + '", "type": "bullet"}';
        } else {
          // url = url + '&where={"cabinet":"' + me.selectCabinetId + '", "type":"bullet"}'
        }
        break;
    }

    if ($listBox.data('loadedGridlist')) {
      $listBox.gridlist('fetch', null, null, null, null, url, true);
    }

    $listBox.data('loadedGridlist', true);
    // 清空兄弟元素的内容
    $listBox.removeClass('hide').siblings().addClass('hide');

    $listBox
    .gridlist({
      source: {
        url: url
      },
      noSessionNeedToken: applicantToken,
      limit: limit,
      innerTpl: function (data) {
        if(type === 'gun'){
          return gunList(data);
        } else if (type === 'bullet') {
          return bulletModuleList(data);
        } else {
          _.merge(data, {moment : moment});
          return cabinetList(data);
        }
      },
      renderFn: null
    })
    .gridlist(
      'show'
    );

    //添加分页按钮
    var $pagerBox = $('#js-pager-box');
    $pagerBox.removeClass('hide').empty().paging('show');

    //给分页按添加click事件
    $pagerBox.on('click', '.btn', function(){
      var map = {
        next : function(){
          $listBox.gridlist('next');
        },
        prev : function(){
          $listBox.gridlist('prev');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });

    //绑定grid-list-cell点击事件
    $listBox
    .off('click')
    .on('click', '.grid-list-cell', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var $cell = $(e.currentTarget);
      if (type === 'gun') {
        // 清空子弹选择
        me.selectedCabinetBulletModule = [];
        var gunId = $cell.data('id'),
            gunCabinetModule = $cell.data('cabinetmoduleid');
        if(!_.isNil(gunCabinetModule)){
          var isSelectSomeGun = me.checkedOpenBatch();
          if (isSelectSomeGun) {
            me.selectGunMethod($cell);
          } else {
            $pagerBox.addClass('hide');
            $node.find('#share-gun-id').val(gunId);
            $node.find('#share-gun-cabinet-module').val(gunCabinetModule);
            if (me.checkedABGunMode()) {
              me.resquestCheckAssociateGun(gunId, me.selectCabinetId)
              .done(function(data) {
                if (data && data.pass) {
                  next();
                } else {
                  if (data && data.gun) {
                    me.showNoty('error', '请取上一工单的关联枪' + data.gun.name);
                  } else {
                    me.showNoty('error', '上一工单没有关联枪支');
                  }
                }
              })
              .fail(function(error) {
                var err = error && error.responseJSON && error.responseJSON.msg;
                me.showNoty('error', err);
              });
            } else {
              next();
            }
          }
        }else{
          noty({text: '无法获取枪支位置', type: 'error', layout: 'topRight'});
        }
      } else if (type === 'bullet') {
        // 清空存储的枪支
        me.selectedGun = [];
        me.selectedGunCabinetModule = [];
        
        var bulletModuleId = $cell.data('id');
        var isSelectSome = me.checkedOpenBatch();
        if (isSelectSome) {
          // 批量取子弹
          me.selectBulletMethod($cell);
        } else {
          $pagerBox.addClass('hide');
          me.setStateData('curr', 'bulletModuleId', bulletModuleId);
          $node.find('#bulletModuleId').val(bulletModuleId);
          $node.find('#share-gun-cabinet-module').val(bulletModuleId);
          next();
        }
      } else if (type === 'cabinet') {
        var cabinet = $cell.data('cabinet');
        var selectedCabinetIsMaster = $cell.data('ismaster');

        // 清空枪支选择
        me.selectedGun = [];
        me.selectedGunCabinetModule = [];
        // 清空子弹选择
        me.selectedCabinetBulletModule = [];

        $pagerBox.addClass('hide');
        $node.find('#cabinet').val(cabinet);
        me.setStateData('curr', 'cabinetId', cabinet);
        me.setStateData('curr', 'selectedCabinetIsMaster', selectedCabinetIsMaster);
        me.selectCabinetId = cabinet;
        next();
      }
    })
    .on('onNext', function(e, skip, total, limit){
      $pagerBox.paging('next', skip, total, limit);
      me.showSelectedGun();
      me.showSelectedBulletCabinet();
    })
    .on('onPrev', function(e, skip, total, limit){
      $pagerBox.paging('prev', skip, total, limit);
      me.showSelectedGun();
      me.showSelectedBulletCabinet();
    })
    .on('gridlist.afterTotalChange', function(event, total, limit, skip){
      if(total <= 0){
        $('.taskbar .finish-btn').addClass('hide');
      }
      $pagerBox.paging('refresh', skip, total, limit);
    });

    $listBox
    .off('click', '.eye-btn')
    .on('click', '.eye-btn', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var target = $(e.target);
      var gridlist = target.parents('.gun_grid_cell');
      var $some_content = gridlist.find('.some_content').clone();
      var $model = $('<div/>').appendTo($('body'));
      $model.flexmodal()
      .on('shown.bs.modal', function(e) {
        $model.find('#gunDetaile').html($some_content);
      })
      $model.flexmodal('show', {
        modalTitle: '枪支详情'
      }, require('./gunDetaile.jade'))
    });
  },
  showSelectedGun: function() {
    var me = this;
    if (!me.selectedGun && !me.selectedGun.length) return;
    setTimeout(function() {
      _.each(me.selectedGun, function(item) {
        var $item = $('#'+item);
        if ($item.length) {
          $item.addClass('selectedItem');
        }
      })
    }, 400)
  },
  showSelectedBulletCabinet: function() {
    var me = this;
    if (!me.selectedCabinetBulletModule && !me.selectedCabinetBulletModule.length) return;
    setTimeout(function() {
      _.each(me.selectedCabinetBulletModule, function(item) {
        var $item = $('#' + item);
        if ($item.length) {
          $item.addClass('selectedItem');
        }
      });
    }, 400);
  },
  resquestCheckAssociateGun: function (gunId, cabinetId) {
    var me = this;
    var def = $.Deferred();
    var applicantToken = me.getStateData('prev', 'applicantToken');
    server({
        url: '/gun/checkAssociateGun?gunId=' + gunId + '&cabinetId=' + cabinetId,
        beforeSend: function (xhr) {
          xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
        }
      })
      .done(function (data) {
        def.resolve(data);
      })
      .fail(function (error) {
        def.reject(error);
      });
    return def;
  },
  selectGunMethod: function($cell) {
    var me = this;
    var gunId = $cell.data('id');
    var gunCabinetModule = $cell.data('cabinetmoduleid');
    
    me.$node.find('#selectGunsNextBtn').removeClass('hide');
    
    if (!me.selectedGun) me.selectedGun = []; 
    if (!me.selectedGunCabinetModule) me.selectedGunCabinetModule = [];

    if ($cell.hasClass('selectedItem')) {
      $cell.removeClass('selectedItem');
      me.selectedGun.splice(me.selectedGun.indexOf(gunId), 1);
      me.selectedGunCabinetModule.splice(me.selectedGunCabinetModule.indexOf(gunCabinetModule), 1);
      if (me.selectedGun.length === 0) {
        me.$node.find('#selectGunsNextBtn').addClass('hide');
      }
    } else {
      $cell.addClass('selectedItem');
      me.selectedGun.push(gunId);
      me.selectedGunCabinetModule.push(gunCabinetModule);
    }
    me.$node.find('#share-gun-id').val(me.selectedGun);
    me.$node.find('#share-gun-cabinet-module').val(me.selectedGunCabinetModule);    
    console.log(me.selectedGun, me.selectedGunCabinetModule);
  },
  selectBulletMethod: function($cell) {
    var me = this;
    var bulletId = $cell.data('id');

    if (!me.selectedCabinetBulletModule) me.selectedCabinetBulletModule = [];
    
    if ($cell.hasClass('selectedItem')) {
      $cell.removeClass('selectedItem');
      me.selectedCabinetBulletModule.splice(me.selectedCabinetBulletModule.indexOf(bulletId), 1);
      // 判断选中的长度，来决定是否展示下一个按钮
    } else {
      $cell.addClass('selectedItem');
      me.selectedCabinetBulletModule.push(bulletId);
    }
    if (!me.selectedCabinetBulletModule.length) {
      me.$node.find('#selectBulletModuleBtn').addClass('hide');
    } else {
      me.$node.find('#selectBulletModuleBtn').removeClass('hide');
    }
     me.$node.find('#share-gun-cabinet-module').val(me.selectedCabinetBulletModule);
  },
  setCreateAppStepShowContent: function(step){
    var allStep = [".slide-1", ".slide-2", ".slide-3", ".slide-4"],
        $node = this.$node,
        $jsCreateApplication = $node.find('#js-createApplication'),
        i = 0,
        len = allStep.length,
        step_box = null;
    for( i; i < len; i++){
      step_box = $jsCreateApplication.find(allStep[i]);
      if(!step_box.hasClass('hide')){
        step_box.addClass('hide');
      }
    }
    $jsCreateApplication.find(allStep[step - 1 ]).removeClass('hide');
  },
  initFormwork: function () {
    var me = this,
        $node = me.$node,
        $editform = $node.find('.simple-app_main form'),
        startDate = null;
    me.formwork = $editform.formwork({
      namespace: metadata.NS,
      fields: {
        '#applicant' : {
          name : 'applicant',
          exclude: true
        },
        '#share-gun-id' : {
          name : 'gun'
        },
        '#cabinet' :{
          name: 'cabinet'
        },
        '#bulletModuleId': {
          name: 'bulletModuleId'
        },
        '#share-gun-cabinet-module' : {
          name : 'cabinetModule'
        },
        '#start': {
          name: 'start',
          init: function () {
            var $me = $(this),
                objID = $me.attr('id'),
                $modal = null;
            $me.val(moment(new Date().getTime() + 60000).format('YYYY-MM-DD HH:mm'));
            startDate = new Date();
            $modal = $('<div class="' + objID + '">').appendTo($node)
            .flexmodal({IsSureBtn: true})
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              if($me.val()){
                if(moment($me.val()) < moment(new Date())){
                  var defaultDate = moment(new Date().getTime() + 1200000);
                }else{
                  var defaultDate = moment($me.val());
                }

                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    minDate: new Date(),
                    sideBySide: true,
                    inline: true,
                    defaultDate: defaultDate
                  });
              }else{
                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    minDate: new Date().getTime() + 60000,
                    sideBySide: true,
                    inline: true
                  });
              }
            })
            .on('onOk', function(){
              var timeValue = $modal.find('.time-box').data().date;
              $me.val(timeValue);
              $modal.flexmodal('modalHide');
              startDate = timeValue;
            });
            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择时间'
                }
              );
            });
          },
          refresh: function (value, data) {
            $(this).val(moment(value).format('YYYY-MM-DD HH:mm'));
          },
          validate : function(value, data){
            if($(this).val() === ''){
              log.debug('Get Gun Date Invalid');
              return '取枪日期不能为空';
            }else{
              var start = new Date($(this).val());
              if(!_.isDate(start)){
                return '开始日期格式不正确';
              };
              var _startDate = new Date(start);
              if(_startDate){
                if(_startDate < (new Date() - 300000))
                  return '开始日期不能小于当前时间';
                return null;
              }
              else
                return '开始日期格式不正确';
            }
          }
        },
        '#end': {
          name: 'end',
          init: function(){
            var $me = $(this),
                objID = $me.attr('id'),
                $modal = null;
            $me.val(moment(new Date().getTime() + 600000).format('YYYY-MM-DD HH:mm'));
            $modal = $('<div class="' + objID + '">').appendTo($node)
            .flexmodal({IsSureBtn: true})
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug($me.val())
              if($me.val()){
                if(moment($me.val()) < moment(new Date())){
                  var defaultDate = moment(new Date().getTime() + 120000);
                }else{
                  var defaultDate = moment($me.val());
                }
                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    minDate: new Date(),
                    sideBySide: true,
                    inline: true,
                    defaultDate: defaultDate
                  });
              }else{
                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    minDate: new Date().getTime() + 600000,
                    sideBySide: true,
                    inline: true
                  });
              }
            })
            .on('onOk', function(){
              var timeValue = $modal.find('.time-box').data().date,
                  _startDate = new Date(moment(startDate).format('YYYY-MM-DD')).getTime(),
                  endDate = new Date(moment(timeValue).format('YYYY-MM-DD')).getTime();

              // if(_startDate != endDate){
              //   me.speak('applicationTimeErr')
              //   noty({text: '结束时间和开始时间必须在同一天', type: 'error', layout: 'top', timeout: 800});
              //   return;
              // }
              $me.val(timeValue);
              $modal.flexmodal('modalHide');
            });
            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择时间'
                }
              );
            });
          },
          refresh: function(value, data){
            $(this).val(moment(value).format('YYYY-MM-DD HH:mm'));
          },
          validate : function(value, data){
            if($(this).val() === ''){
              log.debug('Return Date invalid');
              return '还枪日期不能为空';
            }else{
              var end = new Date($(this).val());
              if(!_.isDate(end))
                return '日期格式不正确';

              var endDate = new Date(end);
              if(endDate){
                if(endDate < new Date())
                  return '结束日期不能小于当前时间';

                var start = new Date(data.start);
                if(_.isDate(start)){
                  var startDate = new Date(start);
                  if(startDate >= endDate)
                    return '结束日期不能小于或等于开始时间';
                }
                return null;
              }
              else{
                return '还枪日期不能为空';
              }
            }
          }
        },
        '#detail': {
          name: 'detail',
          init: function(){
            var $detail = $(this);
            var detail = [];
            $editform.find('.task_detaile_box')
            .off('.click')
            .on('click', '.btn' , function(e){
              var $target = $(e.target);
              var currText = $target.text();
              if ($target.hasClass('action')) {
                // 删除
                _.each(detail, function(item, index) {
                  if (item === currText) {
                    detail.splice(index, 1);
                    return false;
                  }
                });               
                $target.removeClass('action');
              } else {
                // 添加
                $target.addClass('action');
                detail.push(currText);
              }
              $detail.val(detail.join(','));
            })
          },
          validate : function(){
            log.debug('Handling detail validate event');
            var jobType = me.getStateData('prev', 'jobType');
            if($(this).val() === ''){
              log.debug('Detail invalid');
              return '审核详情不能为空';
            }
            else{
              return null;
            }

          }
        },
        '#type': {
          name: 'type',
          path : 'type',
          refresh: function(value, data){
            if(data && data.type){
              $(this).val(data.type.id);
            }else{
              $(this).val(null);
            }
          },
          validate : function(value){
            log.debug('Handling detail validate event');
            if(!value || value == '' ){
              log.debug('type invalid');
              me.speak('chooseType');
              return '类型不能为空';
            }
            else{
              return null;
            }
          }
        },
        '#typeText': {
          name: 'typeText',
          exclude : true,
          init : function () {
            var $modal = $('<div/>').appendTo($node)
            .flexmodal()
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              /////////弹出再去获取类型进行过滤
              var getType = me.getStateData('prev', 'jobType'),
                  listComponentUrl = null;
              if(getType){
                listComponentUrl = '/applicationtype?where={"type":"' + getType + '", "approverOption":{"!":"none"}}';
              }else{
                listComponentUrl = '/applicationtype?where={"approverOption":{"!":"none"}}';
              }

              var $node = $(e.target),
                  $list = $node.find('.type-list').empty()
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget),
                    id = $node.data('id'),
                    name = $node.data('name'),
                    type = $node.data('type');
                $modal.flexmodal('modalHide');
                if(id && type){
                  $editform.find('#typeText').val(name);
                  $editform.find('#type').val(id);
                  $editform.find('#type').data('type', type);
                  $editform.find('#typeClearBtn').removeClass('hide');
                  switch (type){
                    case 'gun':
                      $editform.find('#numGroup').addClass('hide');
                      $editform.find('#bulletTypeGroup').addClass('hide');
                      $editform.find('#bulletAppTypeGroup').addClass('hide');
                      $editform.find('#bulletType').val(null);
                      $editform.find('#num').val(null);
                      $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);

                      //设置存储类型为gun
                      me.setStateData('curr', 'storageJobType', 'gun');

                    break;
                    case 'storageBullet':
                      $editform.find('#numGroup').removeClass('hide');
                      $editform.find('#bulletTypeGroup').addClass('hide');
                      $editform.find('#bulletAppTypeGroup').addClass('hide');
                      $editform.find('#bulletType').val(null);
                      $editform.find('#num').val(null);
                      $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);

                      me.setStateData('curr', 'storageJobType', 'storageBullet');

                    break;
                    case 'storageGun':
                      $editform.find('#numGroup').addClass('hide');
                      $editform.find('#bulletTypeGroup').addClass('hide');
                      $editform.find('#bulletAppTypeGroup').addClass('hide');
                      $editform.find('#bulletType').val(null);
                      $editform.find('#num').val(null);
                      $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);

                      me.setStateData('curr', 'storageJobType', 'storageGun');

                    break;
                    case 'bullet':
                    case 'both':
                      if(!me.getStateData('curr', 'userHasGun')){
                        $editform.find('#numGroup').removeClass('hide');
                        // 检测是否可以多取子弹
                        if (!me.checkedOpenBatch()) {
                          $editform.find('#bulletAppTypeGroup').removeClass('hide');
                          $editform.find('#bulletTypeGroup').removeClass('hide');
                        }
                        $editform.find('#spotBulletType').addClass('hide');
                        $editform.find('#specific').attr("checked", "checked").prop("checked", "checked");
                      }else{
                        $editform.find('#share-gun-id').val(me.getStateData('curr', 'userGunId'));
                        $editform.find('#numGroup').removeClass('hide');
                        //$('#bulletTypeGroup').removeClass('hide');
                        $editform.find('#bulletAppTypeGroup').removeClass('hide');
                        $editform.find('#privategun').attr("checked", "checked").prop("checked", "checked");
                        me.setStateData('curr', 'isSeicalPurpose', true);
                      }
                    break;
                    case 'emergency':
                      $editform.find('#numGroup').addClass('hide');
                      $editform.find('#bulletTypeGroup').addClass('hide');
                      $editform.find('#bulletAppTypeGroup').addClass('hide');
                      $editform.find('#bulletType').val(null);
                      $editform.find('#num').val(null);
                      $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);

                      break;

                    case 'maintain':

                      if (me.checkedNeedMaintainCount()) {
                        $editform.find('#numGroup').removeClass('hide').find('label').text('维护枪支数');
                      }
                      
                      $editform.find('#bulletTypeGroup').addClass('hide');
                      $editform.find('#bulletAppTypeGroup').addClass('hide');
                      $editform.find('#bulletType').val(null);
                      $editform.find('#num').val(null);
                      $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);

                      break;
                  }
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : listComponentUrl,
                  noSessionNeedToken: me.getStateData('prev', 'applicantToken')
                },
                limit: 5,
                innerTpl: typeListCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');

            });

            $node.on('click', '#typeClearBtn', function(e){
              e.preventDefault();
              $editform.find('#typeText').val(null);
              $editform.find('#type').val(null);
              $editform.find('#typeClearBtn').addClass('hide');

              $editform.find('#numGroup').addClass('hide');
              $editform.find('#bulletTypeGroup').addClass('hide');
              $editform.find('#bulletAppTypeGroup').addClass('hide');
              $editform.find('#bulletType').val(null);
              $editform.find('#num').val(null);
              $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);
              $editform.find('#numGroup').addClass('hide');
              //$('#bulletTypeGroup').removeClass('hide');
              $editform.find('#bulletAppTypeGroup').addClass('hide');
              $editform.find('#privategun').attr("checked", "checked").prop("checked", "checked");
              me.setStateData('curr', 'isSeicalPurpose', true);
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择类型'
                },
                require('./typelist.jade')
              );
            });

          },
          //value is an object of application type
          refresh: function(value, data){
            if(data && data.type){
              $(this).val(data.type.name);
              $editform.find('#type').data('type', data.type.type);
              switch (data.type.type){
                case 'gun':
                  $editform.find('#numGroup').addClass('hide');
                  $editform.find('#bulletTypeGroup').addClass('hide');
                  $editform.find('#bulletAppTypeGroup').addClass('hide');
                  $editform.find('#bulletType').val(null);
                  $editform.find('#num').val(null);
                  $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);
                break;
                case 'bullet':
                case 'both':
                  $editform.find('#numGroup').removeClass('hide');
                  //$('#bulletTypeGroup').removeClass('hide').val(null);
                  $editform.find('#bulletAppTypeGroup').removeClass('hide');
                break;
                case 'emergency':
                  $editform.find('#numGroup').addClass('hide');
                  $editform.find('#bulletTypeGroup').addClass('hide');
                  $editform.find('#bulletAppTypeGroup').addClass('hide');
                  $editform.find('#bulletType').val(null);
                  $editform.find('#num').val(null);
                  $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);
                break;
              }
            }else{
              $editform.find('#typeText').val(null);
              $editform.find('#type').val(null);
              $editform.find('#type').data('type', null);
              $editform.find('#typeClearBtn').addClass('hide');
            }
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('Type invalid');
              return '状态不能为空';
            }else{
              return null;
            }
          }
        },
        '[name="bulletAppType"]': {
          name: 'bulletAppType',
          init : function(){
            $(this).on('click', function(e){
              if($(this).prop("checked")){
                var value = $(this).val();
                switch (value){
                  case 'privategun':
                    $('#bulletTypeGroup').addClass('hide').val(null);
                    //选择专用子弹的时候，记录一个当前状态
                    me.setStateData('curr', 'isSeicalPurpose', true);
                  break;
                  case 'specific':
                    $('#bulletTypeGroup').removeClass('hide').val(null);
                    me.setStateData('curr', 'isSeicalPurpose', false);
                  break;
                }
              }
            });
          },
          refresh: function(value, data){
            $(this).parents('.form-group').find(':checkbox').attr("checked", null).prop("checked", null);
            if(data.type && (data.type.type === 'gun' || data.type.type === 'emergency')){
              return;
            }
            if(value){
              $('#' + value).attr("checked", 'checked').prop("checked", "checked");
              switch (value){
                case 'privategun':
                  $('#bulletTypeGroup').addClass('hide').val(null);
                break;
                case 'specific':
                  $('#bulletTypeGroup').removeClass('hide').val(null);
                break;
              }
            }
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('Type invalid');
              return '状态不能为空';
            }else{
              return null;
            }
          }
        },
        '#bulletTypeText': {
          name: 'bulletTypeText',
          exclude : true,
          init : function(){
            var $modal = $('<div/>').appendTo($node)
            .flexmodal()
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug("Open Selection ");
              var $node = $(e.target),
                  $list = $node.find('.type-list').empty()
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget),
                    typeId = $node.data('id'),
                    typeName = $node.data('name');
                $modal.flexmodal('modalHide');
                if(typeId){
                  $editform.find('#bulletTypeText').val(typeName);
                  $editform.find('#bulletType').val(typeId);
                  $editform.find('#bulletTypeClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/bullettype',
                  noSessionNeedToken: me.getStateData('prev', 'applicantToken')
                },
                innerTpl: bulletTypeCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $node.on('click', '#bulletTypeClearBtn', function(e){
              e.preventDefault();
              $editform.find('#bulletTypeText').val(null);
              $editform.find('#bulletType').val(null);
              $editform.find('#num').val(null);
              $editform.find('#bulletTypeClearBtn').addClass('hide');
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择类型'
                },
                require('./typelist.jade')
              );
            });
          },
          refresh: function(value, data){
            if(data.type === null){
              return;
            }
            if(data.type === 'gun' || data.type === 'emergency' || data.bulletAppType === 'privategun'){
              $('#bulletTypeGroup').addClass('hide').find('#bulletTypeText, #bulletType').val(null);
              return;
            }
            if(data && data.bulletType){
              $(this).val(data.bulletType.name);
              $editform.find('#bulletTypeClearBtn').removeClass('hide');
            }else{
              $(this).val(null);
              $editform.find('#bulletTypeClearBtn').addClass('hide');
            }

          }
        },
        '#bulletType': {
          name : 'bulletType',
          refresh: function(value, data){
            if(data.type === null){
              return;
            }
            if(data.type.type === 'gun' || data.type.type  === 'emergency' || data.bulletAppType === 'privategun'){
              $(this).val(null);
              return;
            }
            if(data && data.bulletType)
              $(this).val(data.bulletType.id);
          }
        },
        '#num' : {
          name : 'num',
          validate : function(value, data, originalData){
            if (!me.checkedNeedMaintainCount()) return;
            // 在每次更新的时候已经存了type 在element type 上面
            var type = $editform.find('#type').data('type');
            if(!(type === 'bullet' || type === 'maintain' || type === 'storageBullet')) return null;
            if(!$(this).val()){
              log.debug('Number invalid');
              if (type === 'maintain') {
                return '维护枪支数不能为空';
              } else {
                me.speak('bulletNumberNull');
                return '子弹数目不能为空';
              }
            }else{
              var _val = +$(this).val();
              if(_val === _val)
                return null;
              else
                return '请输入大于0, 小于640的整数';
            }
          }
        },
        '#id': {
          name: 'id'
        }
      }
    })
    .formwork('init');
  },
  checkUserHasGun: function () {
    var me = this,
        applicantToken = me.getStateData('prev', 'applicantToken');
    server({
      url: '/user/me',
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function(users) {
      if(users.guns.length > 0) {
        me.setStateData('curr', 'userHasGun', true);
        me.setStateData('curr', 'userGunId', users.guns[0].id);
      }else{
        me.setStateData('curr', 'userHasGun', false);
      }
    })
  },
  checkHasNetwork: function (CURRENTSTATE) {
    var me = this,
        applicantToken = me.getStateData('prev', 'applicantToken');
    $.ajax({
      url : '/cabinet?where={"isLocal": true}',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    }, true)
    .done(function(data){
      if(!data.length){
        return;
      }
      var isMaster = data[0].isMaster;
      var localCabinetCode = data[0].code;
      me.setStateData('curr', 'localCabinetCode', localCabinetCode);
      me.setStateData('curr', 'localCabinetIsMaster', isMaster);
      // 获取OrgId
      me.getOrgId(isMaster);
      if(!isMaster){
        $.ajax({
          url: '/master/cabinet?populate=org',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
          }
        })
        .done(function(){
          me.setStateData('curr', 'hasNetworking', true);
        })
        .fail(function(){
          me.setStateData('curr', 'hasNetworking', false);
        })
      } else {
        me.setStateData('curr', 'hasNetworking', false);
      }
    });
  },
  submitApp: function (data) {
    if(!data) return;
    $('#createdAppBtn').addClass('disabled');
    var d = $.Deferred(),
        me = this,
        url = '',
        method = null,
        dataType = 'json',
        jobType = me.getStateData('prev', 'jobType'),
        hasNetworking = me.getStateData('curr', 'hasNetworking'),
        cabinetId = me.getStateData('curr', 'cabinetId'),
        applicantToken = me.getStateData('prev', 'applicantToken');

    //判断如果工单类型为存枪或存子弹，则删除柜机模块信息
    if (jobType === 'bullet'){
      me.setStateData('curr', 'newApplicationInfo.detail', data.detail);
    }
    //判断data.id是否存在，存在则为修改或者提交新的工单
    if(data.id){
      method = 'PUT';
      url = '/application/' + data.id;
    }else{
      method = 'POST',
      url = '/application?populate="applicationtype"';
      //提交新工单的时候，删除id或者会出错
      delete data.id;
    }
    if (me.localOrgId) {
      //添加机构id
      data.org = me.localOrgId;
    } else {
      d.reject();
      noty({text: '没有获取到机构的Id', type: 'error', layout: 'top', timeout: 2000});
      return d;
    }

    server({
      url: url,
      method: method,
      data: data,
      dataType: dataType,
      beforeSend: function (xhr) {
        noty({text: '正在保存', type: 'info', layout: 'topRight', timeout: 1000});
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function (data) {
      $('#createdAppBtn').removeClass('disabled');
      //创建成功的时候记录需传递给下一个app的数据
      me.recordNextAppNeedData(data);
      //创建工单成功语音提示
      me.speak('establishSuccess');
      d.resolve(data);
    })
    .fail(function (err) {
      $('#createdAppBtn').removeClass('disabled');
      d.reject(err);
    })
    return d;
  },
  //创建工单成功，记录下一个app需要的数据
  recordNextAppNeedData: function(data){
    var me = this,
        jobType = me.getStateData('prev', 'jobType');
    if(jobType === 'bullet') {
      //如果工单为子弹类型，在当前状态对象中记录子弹工单信息，在其创建成功中展示
      me.setStateData('curr', 'bulletInfo', data.targetModule);
      me.setStateData('next', 'newApplicationInfo.detail', data.application.detail);
      me.setStateData('next', 'newApplicationInfo.flatType', data.application.flatType);
      me.setStateData('next', 'appId', data.application.id);
    }else{
      me.setStateData('next', 'newApplicationInfo.detail', data.detail);
      me.setStateData('next', 'newApplicationInfo.flatType', data.flatType);
      me.setStateData('next', 'appId', data.id);
    }
  },
  showError : function(err){
    noty({text: err, type: 'error', layout: 'top', timeout:5000});
  },
  changeRouteSetFlashBag: function (route) {
    var me = this;
    me.setFlashbag(me.NEXTAPPDATA);
    me.nav(route);
  },
  getOrgId: function(isMaster) {
    var me = this,
        url,
        applicantToken = me.getStateData('prev', 'applicantToken');
    console.log('getOrgId function ##################################  isMaster', isMaster)
    if (isMaster) {
      url = '/org?isLocal=1'
    } else {
      url = '/master/org?isLocal=1'
    }
    server({
      url: url,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function(data) {
      console.log('get Org id Fn success ###################', data)
      me.localOrgId = data && data.length && data[0].id
    })
    .fail(function(error) {
      noty({text: '获取机构ID失败', type: 'error', layout: 'top', timeout: 2000});
    })
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
  checkedIncludeLocalCabinet: function() {
    var isShow = false;
    var systemSetData = window.localStorage.getItem('systemSetData');
    if (systemSetData) {
      systemSetData = JSON.parse(systemSetData);
      if (systemSetData && systemSetData.includeLocalCabinet) {
        isShow = true;
      } else {
        isShow = false;
      }
    };
    return isShow;
  },
  checkedABGunMode: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      setting = JSON.parse(setting);
      return setting.enableABGun;
    } else {
      return false;
    }
  },
  checkedOpenBatch: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      setting = JSON.parse(setting);
      return setting.openBatch;
    } else {
      return false;
    }
  },
  checkedNeedMaintainCount: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      setting = JSON.parse(setting);
      return setting.needMaintainCount;
    } else {
      return false;
    }    
  },
  showNoty: function(type, message) {
    if (type === 'success') {
      noty({text: message, type: 'success', layout: 'topRight', timeout: 2000});
    } else if (type === 'error') {
      noty({text: message, type: 'error', layout: 'top', timeout: 2000});
    }
  }
}

_.extend(SimpleCreateApplication.prototype, prototype);

module.exports = SimpleCreateApplication;
