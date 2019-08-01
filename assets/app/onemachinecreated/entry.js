/*
  onemachinecreated module
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
var font = require('fontawesome/less/font-awesome.less');
var jqueryForm = require('jquery-form');

var gunList = require('./gunlist.jade');
var bulletTypeCell = require('./bullettypecell.jade');
var typeListCell = require('./typelistcell.jade');
var indexTpl = require('./index.jade');
var cabinetList = require('./cabinetList.jade');

var indeCss = require('./less/index.less');
var captureApplication = require('captureApplication');
var simpleViewer = require('simpleViewer');

var OneMachineCreated = function (reg) {
  reg.apply(this);
  log.info('SimpleCreateApplication has been created');
  return this;
}

var metadata = {
  NS  : 'onemachinecreated',
  pub : [],
  sub : [],
  noAuth: true,
  endpoint: '/optlog'
}

_.extend(OneMachineCreated, metadata);

var prototype = {
  init: function () {
    log.info('init OneMachineCreated entry');
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
      "isSiteAuth": false,
      'loginApplicantAlias': me.PREVAPPDATA.loginApplicantAlias,
      'loginApplicantUsername': me.PREVAPPDATA.loginApplicantUsername,
      'isMasterLocalCabine': me.PREVAPPDATA.isMasterLocalCabine
    }

    console.log('柜机是否为master', me.PREVAPPDATA.isMasterLocalCabine)

    //定义一个存储当前app状态的对象,目前所有的值都会在下面程序中改变
    me.CURRENTSTATE = {
      "createJobType": "gun",          //创建工单的类型，默认为gun
      "isJobNeedGridList" : false,    //是否取枪工单
      "hasNetworking": false,         //默认为没有联网
      "storageJobType": null,         //存储的类型
      "userHasGun": false,            //用户是否有枪
      "userGunId": null,               //用户枪的Id
      "localCabinetIsMaster": true,
      "newApplicationInfo": {
        "detail": null
      },
      "localCabinetCode": null
    }
    me.CAMERAUPLOAD_ASSETID = {};
    //检测是否联网模式
    me.checkHasNetwork(this.CURRENTSTATE);
  },
  destroy: function (cb) {
    var me = this;
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  show: function ($node, cb) {
    var me = this,
        $node = me.$node;

    //index.jade挂载到$node下
    $node.append(indexTpl());

    //插入创建工单模板
    $node.find('.simple-app_main').append(require('./edit.jade'));

    //添加头部组件
    $node.find('.simple-app_header')
    .simpleAppHeader('show', function(){
      //点击返回按钮跳转到上一个app页面
      me.changeRouteSetFlashBag('/m/onemachine');
    });

    //检测用户是否有枪,来决定UI流程。
    me.checkUserHasGun();

    //加载流程UI
    me.loadCreateApplication();

    //初始化initFormwork
    me.initFormwork();
    //
    var data = {
      applicationTypeId: me.getStateData('prev', 'applicationTypeId'),
      name: me.getStateData('prev', 'applicationTypeName'),
      type: me.getStateData('prev', 'applicationType')
    }
    $node.find('.simple-app_main form').formwork('refresh', data);

    //添加屏幕唤醒
    me.initWakeScreen();
    cb();
  },
  initWakeScreen: function () {
    var me = this;

    var throttled = _.throttle(me.wakeScreen, 6000, { 'trailing': false });

    $(document)
    .off('click')
    .on('click', throttled)
  },
  wakeScreen: function () {
    server({
      url: '/system/wakeup',
      method: 'get'
    });
  },
  loadCreateApplication: function () {
    var me = this,
        $node = me.$node,
        $editform = $node.find('.simple-app_main form');

    //设置当前的step为0
    me.currentStep = 0;
    this.steps = [
      {
        name: '选择申请类型',
        actions: [
          { name: '下一步', target: _.bindKey(me, 'goNextStep')}
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
        name: '选择公用枪',
        id: 'publicStep',
        actions: [
          {name:"", target:function(){}, className: 'pager-box hide', id: 'js-pager-box'},
          {name: '选择柜机', target: function (){}, id: 'getCabinetListButton', className: 'hide'},
          {name: '上一步', target: function(){me.goPreStep()}},
          {name : '取消', target: function(){ me.changeRouteSetFlashBag('/m/onemachine') } }
        ],
        onShown: function($node, next) {
          //获取当前选择的工单是否为枪
          me.showCabinetSelect();
          var isJobNeedGridList = me.getStateData('curr', 'isJobNeedGridList'),
              storageJobType = me.getStateData('curr', 'storageJobType'),
              //如果没有工单类型，默认为存储工单的类型！！！！！！！！！！！！！！！！！！！！！！！
              jobType = me.getStateData('prev', 'jobType') || storageJobType;
          console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ isJobNeedGridList', isJobNeedGridList)
          if(!isJobNeedGridList) {
            next();
          }else{
            //判断是取公用枪，还是存武器（存武器的时候要选择柜机）
            if(jobType === 'storageBullet' || jobType === 'storageGun' || jobType === 'bullet') {
              me.speak('selectCabinet')
              me.setCreateAppStepShowContent(2);
              me.getGridList($node, next, 'cabinet');
            }else{
              if(me.userHasGun){
                $node.find('#share-gun-id').val(me.userGunId);
                $node.find('#share-gun-cabinet-module').val(null);
                next();
              }else{
                me.setCreateAppStepShowContent(2);
                $('#getCabinetListButton').removeClass('hide');
                // 获取公用枪列表
                me.speak('selectGun')
                me.getGridList($node, next, 'gun');
              }
            }
          }
        }
      },
      {
        name: '选择申请时间',
        actions: [
          {name : '上一步', target: _.bindKey(me, 'goPreStep'), id: 'last-prev-btn'},
          {name : '取消', target: function(){ me.changeRouteSetFlashBag('/m/onemachine')}},
          {name : '创建申请', target: function(){me.goNextStep();}, id: 'createdApplicationButton'}
        ],
        onShown: function($node, next) {
          //切换到选择时间的页面
          me.setCreateAppStepShowContent(3);
          me.getOrgId();
          //检测用户是否有枪，有枪的时候隐藏上一步按钮
          var userHasGun = me.getStateData('curr', 'userHasGun'),
              isJobNeedGridList = me.getStateData('curr', 'isJobNeedGridList');
          if(userHasGun || !isJobNeedGridList) {
            $node.find('#last-prev-btn').addClass('hide');
          }
          me.speak('sureEndTime');
        },
        onNext: function (next) {
          var check = function(event, errors){
            $editform.off(metadata.NS + '.form.validate.valid', check);
            $editform.off(metadata.NS + '.form.validate.error', check);
            if(errors){
              me.showError(errors.join(', '));
            }else{
              $editform.one(metadata.NS + '.form.submit', function(e, data){
                //创建工单
                $('#createdApplicationButton').addClass('disabled')
                me.submitApp(data)
                .done(function(data){
                  $('#createdApplicationButton').removeClass('disabled')
                  noty({text: '创建成功', type: 'success', timeout:5000, layout: 'topRight'});
                  next();
                })
                .fail(function(err){
                  $('#createdApplicationButton').removeClass('disabled');
                  try {
                    var errText = JSON.parse(err.responseText).error;
                    noty({text: errText, type: 'error', layout: 'top', timeout: 4000});
                  } catch(e) {
                    if (err.status === 400) {
                      noty({text: '创建失败:' + err.responseJSON.error, type: 'error', timeout:5000});
                    }
                    else {
                      noty({text: '创建失败', type: 'error', timeout:5000});
                    }
                  }
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
        name: '扫描书面授权',
        actions: [
          {
            name: '添加附件完成', target: function () {
              me.$node.find('.captureApplication_cp__box').empty();
              me.setStateData('next', 'isSiteAuth', true);
              me.goNextStep();
            },
            id: 'sureCreatedApplicationInfoButton',
            className: 'hide'
          },
          {
            name: '本地附件上传', target: function() {
              var $input = me.$node.find('#input_file');
              $input.click();
            }
          }
        ],
        onShown: function ($node, next) {
          var appId = me.getStateData('next', 'appId');
          var applicantToken = me.getStateData('prev', 'applicantToken');

          // 绑定input[type="file"] onchange
          me.cameraUpload();

          me.setCreateAppStepShowContent(4);
          me.$node.find('.captureApplication_cp__box')
          .off('startCapture')
          .on('startCapture', function() {
            me.$node.find('.appcation-img_tips').addClass('hide');
            me.$node.find('#appcationImg').addClass('hide');
          })          
          .off('captureSuccess')
          .on('captureSuccess', function(event, imgSrc) {
            me.$node.find('#sureCreatedApplicationInfoButton').removeClass('hide');
            me.$node.find('#appcationImg').attr('src', imgSrc).removeClass('hide');
          })
          .off('captureError')
          .on('captureError', function() {
            me.$node.find('.appcation-img_tips').removeClass('hide');
            me.$node.find('#appcationImg').addClass('hide');
          })
          .off('not_found_file')
          .on('not_found_file', function() {
            me.$node.find('#sureCreatedApplicationInfoButton').addClass('hide');
          })
          .captureApplication('init', {
            appId: appId,
            token: applicantToken
          });

          // 注册查看图片的组件
          me.$node.find('.captureApplication_cp__box').simpleViewer('init');
        }
      },
      {
        name: '完成',
        actions: [
          {name: '完成', target: function(){
            me.changeRouteSetFlashBag('/m/onemachine');
            }
          }
        ],
        onShown: function ($node, next) {
          var storageJobType = me.getStateData('curr', 'storageJobType'),
              //如果没有工单类型，默认为存储工单的类型！！！！！！！！！！！！！！！！！！！！！！！
              jobType = me.getStateData('prev', 'jobType') || storageJobType,
              bulletInfo = me.getStateData('curr', 'bulletInfo');

          //取子弹的时候显示，子弹信息
          if(jobType === 'bullet' && bulletInfo) {
            var takebullet = require('./takebullet.jade')({
              cabinetmodule: bulletInfo
            });
            $node.find('.create-application-bullet-last-info-box').removeClass('hide').html(takebullet)
            .next().addClass('hide');
          }else{
            me.setCreateAppStepShowContent(5);
          }
        }
      }
    ];

    var jobType = me.getStateData('prev', 'jobType');

    if(jobType === 'emergency' || jobType === 'maintain') {
      me.steps.splice(1, 1)
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
      if(step.id && step.id === 'publicStep'){
        step.name = me.setStepText();
      }
      return { name: step.name, target: 'javascript:void(0)', id: step.id, className: step.className};
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
    if(applicationtype === 'gun'){
      return '请选择公用枪';
    }else if(applicationtype === 'storageBullet' || applicationtype === 'storageGun' || applicationtype === 'bullet'){
      return '请选择柜机';
    }else{
      return '跳过这一步骤';
    }
  },
  showCabinetSelect: function () {
    var me = this;
    var $node = me.$node;
    var localCabinetIsMaster = me.getStateData('curr', 'localCabinetIsMaster');
    var prix = localCabinetIsMaster ? '' : '/master';

    me.listModal({
      url: prix + '/cabinet/filteredCabinet?type=gun',
      $btn: $node.find('#getCabinetListButton'),
      selectHandler: function ($currTarget) {
        var id = $currTarget.data('id');
        console.log('%s this is select cabinet id ####################', id)
        var url = prix + '/gun/masterpublicgun?cabinetId=' + id;

        $node.find('.share-guns-list')
        .gridlist('fetch', null, null, null, null, url, true);

      }
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
        require('./typelist.jade')
      );
    });
  },
  getGridList: function ($node, next, type) {
    var me = this,
        url = null,
        jobType = me.getStateData('prev', 'jobType') || me.getStateData('curr', 'storageJobType'),
        applicantToken = me.getStateData('prev', 'applicantToken'),
        localCabinetIsMaster = me.getStateData('curr', 'localCabinetIsMaster'),
        prix = localCabinetIsMaster ? '': '/master';
    if(type === 'cabinet') {
      if (jobType === 'storageGun') {
        url =  prix + '/cabinet/filteredCabinet?type=gun';
      } else if (jobType === 'storageBullet' || jobType === 'bullet') {
        url = prix + '/cabinet/filteredCabinet?type=bullet';
      }
    }else{
      url = prix + '/gun/masterpublicgun';
    }

    $node.find('.share-guns-list')
    .gridlist({
      source: {
        url: url
      },
      noSessionNeedToken: applicantToken,
      limit: 12,
      innerTpl: function (data) {
        if(type === 'gun'){
          _.merge(data, {moment : moment});
          return gunList(data);
        }

        data = {data: data};
        _.merge(data, {moment : moment});
        return cabinetList(data);
      },
      renderFn: null
    })
    .gridlist(
      'show'
    );

    //添加分类按钮
    var $pagerBox = $('#js-pager-box');
    $pagerBox.removeClass('hide').empty().paging('show');

    //给分页按添加click事件
    $pagerBox.on('click', '.btn', function(){
      var map = {
        next : function(){
          $node.find('.share-guns-list').gridlist('next');
        },
        prev : function(){
          $node.find('.share-guns-list').gridlist('prev');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });

    //绑定grid-list-cell点击事件
    $node.find('.share-guns-list')
    .off('click')
    .on('click', '.grid-list-cell', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var jobType = me.getStateData('prev', 'jobType') || me.getStateData('curr', 'storageJobType'),
          $cell = $(e.currentTarget);
      // 记录点击的cabinet
      me.selectCabinetInfo = $cell.data('cabinetinfo');
      if(jobType === 'gun') {
        var gunId = $cell.data('id'),
            cabinetId = $cell.data('cabinet'),
            gunCabinetModule = $cell.data('cabinetmoduleid');
        if(!_.isNil(gunCabinetModule)){
          $pagerBox.addClass('hide');
          $node.find('#cabinet').val(cabinetId);
          $node.find('#share-gun-id').val(gunId);
          $node.find('#share-gun-cabinet-module').val(gunCabinetModule);
          next();
        }else{
          noty({text: '无法获取枪支位置', type: 'error', layout: 'topRight'});
        }
      }else if(jobType === 'storageBullet' || jobType === 'storageGun' || jobType === 'bullet'){
        var cabinet = $cell.data('cabinet');
        $pagerBox.addClass('hide');
        $node.find('#cabinet').val(cabinet);
        next();
      }
    })
    .on('onNext', function(e, skip, total, limit){
      $pagerBox.paging('next', skip, total, limit);
    })
    .on('onPrev', function(e, skip, total, limit){
      $pagerBox.paging('prev', skip, total, limit);
    })
    .on('gridlist.afterTotalChange', function(event, total, limit, skip){
      if(total <= 0){
        $('.taskbar .finish-btn').addClass('hide');
      }
      $pagerBox.paging('refresh', skip, total, limit);
    });

  },
  setCreateAppStepShowContent: function(step){
    var allStep = [".slide-1", ".slide-2", ".slide-3", ".slide-4", ".slide-5"],
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
            // $(this).val(moment(new Date()).format('YYYY-MM-DD HH:mm'));
          },
          validate : function(value, data){
            if($(this).val() === ''){
              log.debug('Get Gun Date Invalid');
              return '取枪日期不能为空';
            }else{
              var start = new Date($(this).val());
              console.log('开始时间@@@@@@@@@@@@@@@@@@@@@', typeof start, $(this).val())
              console.log(_.isDate(start))
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
            // $(this).val(moment(Date.now() + 30000).format('YYYY-MM-DD HH:mm'));
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
            if(data && data.applicationTypeId){
              $(this).val(data.applicationTypeId);
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
                listComponentUrl = '/applicationtype' + '?where={"type":"' + getType + '"}';
              }else{
                listComponentUrl = '/applicationtypeforone';
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
                      //更新工单类型是否需要列表
                      me.setStateData('curr', 'isJobNeedGridList', true);

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

                      //存子弹也需要选择柜机，所有直接和存取为一个类型
                      me.setStateData('curr', 'isJobNeedGridList', true);
                      me.setStateData('curr', 'storageJobType', 'storageBullet');

                    break;
                    case 'storageGun':
                      $editform.find('#numGroup').addClass('hide');
                      $editform.find('#bulletTypeGroup').addClass('hide');
                      $editform.find('#bulletAppTypeGroup').addClass('hide');
                      $editform.find('#bulletType').val(null);
                      $editform.find('#num').val(null);
                      $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);

                      me.setStateData('curr', 'isJobNeedGridList', true);
                      me.setStateData('curr', 'storageJobType', 'storageGun');

                    break;
                    case 'bullet':
                    case 'both':
                      if(!me.getStateData('curr', 'userHasGun')){
                        $editform.find('#numGroup').removeClass('hide');
                        $editform.find('#bulletAppTypeGroup').removeClass('hide');
                        $editform.find('#bulletTypeGroup').removeClass('hide');
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
                      if (type === 'bullet') {
                        me.setStateData('curr', 'isJobNeedGridList', true);
                      } else {
                        me.setStateData('curr', 'isJobNeedGridList', false);
                      }

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
              $(this).val(data.name);
              $editform.find('#type').data('type', data.type);
              switch (data.type){
                case 'gun':
                  $editform.find('#numGroup').addClass('hide');
                  $editform.find('#bulletTypeGroup').addClass('hide');
                  $editform.find('#bulletAppTypeGroup').addClass('hide');
                  $editform.find('#bulletType').val(null);
                  $editform.find('#num').val(null);
                  $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);
                  //更新工单类型是否需要列表
                  me.setStateData('curr', 'isJobNeedGridList', true);

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

                  //存子弹也需要选择柜机，所有直接和存取为一个类型
                  me.setStateData('curr', 'isJobNeedGridList', true);
                  me.setStateData('curr', 'storageJobType', 'storageBullet');

                break;
                case 'storageGun':
                  $editform.find('#numGroup').addClass('hide');
                  $editform.find('#bulletTypeGroup').addClass('hide');
                  $editform.find('#bulletAppTypeGroup').addClass('hide');
                  $editform.find('#bulletType').val(null);
                  $editform.find('#num').val(null);
                  $editform.find('[name="bulletAppType"]').attr("checked", null).prop("checked", null);

                  me.setStateData('curr', 'isJobNeedGridList', true);
                  me.setStateData('curr', 'storageJobType', 'storageGun');

                break;
                case 'bullet':
                case 'both':
                  if(!me.getStateData('curr', 'userHasGun')){
                    $editform.find('#numGroup').removeClass('hide');
                    $editform.find('#bulletAppTypeGroup').removeClass('hide');
                    $editform.find('#bulletTypeGroup').removeClass('hide');
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
                  if (data.type === 'bullet') {
                    me.setStateData('curr', 'isJobNeedGridList', true);
                  } else {
                    me.setStateData('curr', 'isJobNeedGridList', false);
                  }

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
            if(data.type && (data.type === 'gun' || data.type.type === 'emergency')){
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
            if(data.type === 'gun' || data.type  === 'emergency' || data.bulletAppType === 'privategun'){
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
              if(validator.isInt($(this).val(), {min : 1, max : 640}))
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
      url : '/cabinet?populate=org&where={"isLocal": true}',
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
        me.setStateData('curr', 'hasNetworking', true);
      }
    });
  },
  submitApp: function (data) {
    if(!data) return;
    var d = $.Deferred(),
        me = this,
        url = '',
        method = null,
        dataType = 'json',
        jobType = me.getStateData('prev', 'jobType'),
        hasNetworking = me.getStateData('curr', 'hasNetworking'),
        applicantId = me.getStateData('prev', 'applicantId'),
        applicantToken = me.getStateData('prev', 'applicantToken'),
        localCabinetIsMaster = me.getStateData('curr', 'localCabinetIsMaster'),
        prix = localCabinetIsMaster ? '': '/master';
    //判断如果工单类型为存枪或存子弹，则删除柜机模块信息
    if (jobType === 'storageBullet' || jobType === 'storageGun') {
      delete data.cabinetModule;
    } else if (jobType === 'bullet'){
      me.setStateData('curr', 'newApplicationInfo.detail', data.detail);
    } else if (jobType === 'maintain') {
      data.cabinet = me.getStateData('curr', 'localCabinetCode');
    }
    //判断data.id是否存在，存在则为修改或者提交新的工单
    if(data.id){
      method = 'PUT';
      url = (!hasNetworking && '/application') || prix + '/application/' + data.id;
    }else{
      method = 'POST',
      url = prix + '/application';

      // if (jobType === 'bullet') {
      //   if (!me.selectCabinetInfo.isMaster) {
      //     data.targetCabinet = me.selectCabinetInfo;
      //     url = '/peer/' + me.selectCabinetInfo.id + '/application';
      //   } else {
      //     url = prix + '/application';
      //   }
      // }

      //提交新工单的时候，删除id或者会出错
      delete data.id;
    }

    data.user = {id: applicantId};

    data.org = me.localOrgId;

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
      //创建成功的时候记录需传递给下一个app的数据
      me.recordNextAppNeedData(data);
      //创建工单成功语音提示
      me.speak('establishSuccess');
      d.resolve(data);
    })
    .fail(function (err) {
      d.reject(err);
    })
    return d;
  },
  bindCaptureApplication: function ($node, retry) {
    var me = this;
    var id = me.getStateData('next', 'appId');
    server({
      url: '/camera/captureapplication',
      beforeSend: function (xhr) {
        xhr.setRequestHeader('asLocal', true);
      },
      method: 'post',
      data: { applicationId: id, retry: retry}
    })
    .done(function (data) {
      noty({text: '正在扫描中......', type: 'success', layout: 'topRight', timeout: 4000});
      pubsub.unsubscribe('ApplicationCapture');
      pubsub.subscribe('ApplicationCapture', function (topic, message) {
        if (message.status === 'success') {
          me.$node.find('#capturePicLoader').addClass('hide');
          noty({text: '扫描成功', type: 'success', layout: 'topRight', timeout: 2000});
          //拍照成功后，获取图片img
          var imgSrc = '/asset/image/' + message.imageId;

          $node.find('#appcationImg').removeClass('hide').attr('src', imgSrc);
          // 拍照成功后显示创建工单按钮
          $node.find('#sureCreatedApplicationInfoButton').removeClass('hide');
        }
        pubsub.unsubscribe('ApplicationCapture');
      });
    })
    .fail(function (error) {
      noty({text: '扫描失败,请重试', type: 'error', layout: 'top', timeout: 1000});
    })
    .always(function () {
      me.$node.find('#captureApplicationButton h2').text('重新扫描');
    })
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
  getOrgId: function() {
    var me = this;
    var localCabinetIsMaster = me.getStateData('curr', 'localCabinetIsMaster');
    var prix = localCabinetIsMaster ? '' : '/master';   
    server({
      url: prix + '/org?isLocal=1'
    })
    .done(function(data){
      me.localOrgId = data && data.length && data[0].id
    })
    .fail(function() {
      noty({text: '获取机构id失败', type: 'error', layout: 'top', timeout: 2000});
    })
  },
  /**
   * 提交本地附件
  */
  cameraUpload: function() {
    var me = this;
    var applicationId = me.getStateData('next', 'appId');
    var $form = me.$node.find('#js-createApplication');
    
    me.$node.find('.file_input_box')
    .off('change', '#input_file')
    .on('change', '#input_file', function () {
      $form
      .ajaxSubmit({
        url: '/camera/upload?applicationId=' + applicationId,
        success: function() {
          noty({text: '附件添加成功!', type: 'success', layout: 'topRight', timeout: 3000});
          if (me.$node.find('#sureCreatedApplicationInfoButton').hasClass('hide')) {
            me.$node.find('#sureCreatedApplicationInfoButton').removeClass('hide');
          }
          // $input.val('');
          me.removeInputDOM();
           // 展示图片
          me.getCameraUpload(applicationId);
        },
        error: function(error) {
          noty({text:'附件添加失败!', type: 'error', layout: 'top', timeout: 3000});
          // $input.val('');
          me.removeInputDOM();
        }
      });
    });

    // $form.submit(function() {
    //   alert('submit');

    //   return false;
    // });
  },
  // 删除input[type="file"],再插入解决change相同内容不触发问题
  removeInputDOM: function() {
    var $input = this.$node.find('#input_file');
    var $clone = $input.clone();
    $input.remove();
    this.$node.find('.file_input_box').append($clone);
  },
  getCameraUpload: function(appId) {
    var me = this;
    var applicantToken = me.getStateData('prev', 'applicantToken');
    this.server({
      url: '/applicationcaptured?where={"applicationId":"'+ appId +'"}&v=' + new Date().getTime(),
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function(res) {
      _.each(res, function(item) {
        if (!me.CAMERAUPLOAD_ASSETID[item.assetId]) {
          me.CAMERAUPLOAD_ASSETID[item.assetId] = item.assetId;
          me.successCreatedPic(item);
        }
      });
    })
    .fail(function(res) {
      console.log('获取上传的图片失败', res);
    });  
  }, 
  successCreatedPic: function (value) {
    var $img = $('<img />')
    var $li = $('<li class="section-box" />');
    var $btn = $('<div class="retry-btn"/>');
    var imageId = value.assetId;
    var imgSrc;

    if (imageId) {
      imgSrc = '/asset/image/' + imageId;
      $li.data('imageId', imageId);
    }

    $btn.text('删除');
    $img.attr('src', imgSrc);
    $li.append($btn).data('id', imageId);
    this.$node.find('.add-capture_btn').before($li.append($img));
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
  }
}

_.extend(OneMachineCreated.prototype, prototype);

module.exports = OneMachineCreated;
