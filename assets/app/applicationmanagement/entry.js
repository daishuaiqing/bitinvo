/**
ApplicationManagement module Start
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

var gridlist = require('gridlist');

var paging = require('paging');

var list = require('list');

var gridCell = require('./gridcell.jade');
var typeListCell = require('./typelistcell.jade');
var bulletTypeCell = require('./bullettypecell.jade');

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var server = require('common/server.js').server;

var Promise = require("bluebird");

var searchbox = require('searchbox');

var keypad = require('keypad');

var simpleViewer = require('simpleViewer');
var jqueryForm = require('jquery-form');

var ApplicationManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('ApplicationManagement has been created');
  return this;
}

var metadata =  {
  NS : 'applicationmanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/application'
}

_.extend(ApplicationManagement, metadata);

var prototype = {
  init : function (){
    log.info('init ApplicationManagement entry');
    this.backBtnFnArray = [];
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb()
  },
  show : function($node, cb){
    var me = this;
    me.StartDate = null;
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
          '.edit-cont'
        ],
        2 : [
          '.search-cont'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(jade({
      i18n: __('applicationmanagement'),
      i18nButton: __('buttonText')
    }));

    
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('userapplicationmanagement').form
    }));
    
    me.$node.find('.applicationManagementForm')
    .off('click')
    .on('click', '.close_btn', function (e) {
      console.log('########### 点击了删除按钮 #############');
      noty({text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
        timeout: null,
        buttons: [
          {
            addClass: 'btn btn-empty big',
            text: '确定',
            onClick: function ($noty) {
              me.removePic($(e.currentTarget));
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
    });

    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __('applicationmanagement').appManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('applicationmanagement').appOverview,
          target: 'javascript:void(0)'
        },
        {
          name: __('applicationmanagement').appDetail,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    $node.pagestate('setState', 0);

    //返回按钮当前的回调元素，第一个为默认的回调主页面
    me.backBtnFnArray.push(
      function () {
        if($('body').hasClass('isSimpleapplication')){
          me.nav('/m/simpleapplication');
        }else{
          me.nav('/m/userhome');
        }
      }
    );
    // put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    $node.find('.appm-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.appm-action-bar').actionBar('show');

    $node.find('.leftmenu')
    .on('vmenu.afterChange', function(e, previous, next, originalEvent){
      originalEvent.preventDefault();
      var id = next.attr('id');
      switch(id){
        case 'app-list' :
          _.delay(function(){me.nav('/m/applicationmanagement')}, 250);
          break;
        case 'app-type-list' :
           _.delay(function(){me.nav('/m/applicationtypemanagement')}, 250);
          break;
        case 'approval-list' :
           _.delay(function(){me.nav('/m/approvalmanagement')}, 250);
          break;
      }
    })
    .vMenu('show',
      0,
      [
        {
          name: __('applicationmanagement').appOverview,
          target: '#list',
          id: 'app-list',
          clsName: 'vlink'
        },
        {
          name: __('applicationmanagement').appTypeManage,
          target: '#typelist',
          id: 'app-type-list',
          clsName: 'vlink'
        },
        {
          name: __('applicationmanagement').approver,
          target: '#approvallist',
          id: 'approval-list',
          clsName: 'vlink'
        }
      ],
      true//clickable
    );

//=========Create paging==========
    $node.find('.paging-btn-box')
    .paging('show');

    /*
      初始化搜索
    */
    $node.find('.search-cont').searchbox('show', {
      url: '/application/findWithApplicant?populate=applicant,type,application',
      searchKey:'applicant',
      searchTip: '根据用户名搜索',
      gridCell: gridCell,
      i18n: __('application'),
      isBagData: false,
      specialURL: true,
      updateSearchListHandle: function (data, dataLen, allLi) {
        for(var i = 0; i < dataLen; i++){
          var tipsKey = data[i].applicant.alias;
          var oli = '<li class="search-result-li" data-value="' + tipsKey +'">' + tipsKey + '</li>';
          allLi += oli;
        }
        return allLi;
      }
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, appId, $node){
          //搜索结果点击进入某个gridllist详情
        me.editApp($node, appId);
      })
      .on('searchComponentDeleteGridlist', function(e, appId, $node) {
        e.preventDefault();
        e.stopPropagation();
        log.debug('Delete application with id: %s', appId);
        me.sureDeletedNoty(function() {
          me.deleteApp($node, { id: appId });
        });
      });

    $node.find('.list-cont')
    .gridlist({
      source: {
        url : metadata.endpoint + '?populate=applicant,type'
      },
      sort: JSON.stringify({
        "createdAt" : "DESC"
      }),
      innerTpl: function(data){
        _.merge(data, {
          moment : moment,
          canViewApp : me.user.hasPermission('view-app'),
          i18n: __('application')
        });
        return gridCell(data);
      }, // A compiled jade template,
      renderFn : null // How to render body
    })
    .on('afterUpdate', function(){

    })
    .on('onNext', function(e, skip, total, limit){
      $node.find('.paging-btn-box')
      .paging('next', skip, total, limit)
    })
    .on('onPrev', function(e, skip, total, limit){
      $node.find('.paging-btn-box')
      .paging('prev', skip, total, limit)
    })
    .on('gridlist.afterTotalChange', function(event, total, limit, skip){
      log.debug('gridlise.afterTotalChange');
      $node.find('.paging-btn-box')
      .paging('refresh', skip, total, limit)
    })
    .gridlist(
      'show'
    );

    $node.find('.list-cont')
    .on('click', '.approve-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Update Status to APPROVED app %s', appId);
      me.updateApp($node, appId, {status: 'approved'});
    })
    .on('click', '.deny-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Update Status to DENY app %s', appId);
      me.updateApp($node, appId, {status: 'rejected'});
    })
    .on('click', '.delete-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Delete application with id %s', appId);
      me.sureDeletedNoty(function() {
        me.deleteApp($node, { id: appId });
      });
    })
    .on('click', '.grid-list-cell', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Update Status to APPROVED app %s', appId);
      // 进入详情
      me.editApp($node, appId);
      // 获取附件列表
      me.getCapture(appId);

      me.applicationId = appId;
      var name = $node.find('.user-name').text();
      me.$node.find('.breadcrumb .active').text(name + '申请详情');
      //进入详情的时候，插入一个返回的方法
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      })
      
      // 监听 input[type="file"] 改变
      me.cameraUpload(appId);
    });
    var actions = [
      {
        name: '删除',
        target: function() {
          me.sureDeletedNoty(function() {
            me.deleteApp(null, { id: me.applicationId });
          })
        }
      },
      {
        name: __('buttonText').cancelBtn,
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(1, 1);
        }
      },
      {
        id: 'addFileBtn',
        name: __('buttonText').addAnnexBtn,
        target: function() {
          var $input = me.$node.find('#input_file');
          $input.click();
        }
      },
      {
        name: __('buttonText').updateAppStatusBtn,
        target: function(e) {
          e.preventDefault();
          me.forceUpdateModuleShow();
        }
      }
    ];

    $node.find('.taskbar').taskbar('show', actions);
    me.initFormwork();

    $node.on('click', '.btn', function(){
      var map = {
        add : function(){
          log.debug('add');
          var $editform = $node.find('form');
          $editform.formwork('clear');
          $node.pagestate('setState', 1);
          $node.find('#start').val(moment(new Date().getTime() + 120000).format('YYYY-MM-DD HH:mm'));
          $node.find('#end').val(moment(new Date().getTime() + 600000).format('YYYY-MM-DD HH:mm'));
          me.StartDate = new Date();
        },
        search: function () {
          $node.pagestate('setState', 2);
          me.backBtnFnArray.push(function () {
            $node.pagestate('setState', 0);
          })
        },
        filter: function () {
          var target = '/application?populate=applicant,type&where={"status":"pending"}'
          $node.find('.list-cont')
          .gridlist('fetch', null, null, null, null, target, true);
        },
        all: function () {
          var target = '/application?populate=applicant,type'
          $node.find('.list-cont')
            .gridlist('fetch', null, null, null, null, target, true);
        },
        refresh : function(){
          log.debug('refresh');
          $node.find('.list-cont').gridlist('refresh');
        },
        returnToList : function(){
          $node.pagestate('setState', 0);
        },
        next : function(){
          log.debug('next page');
          $node.find('.list-cont').gridlist('next');
        },
        prev : function(){
          log.debug('prev page');
          $node.find('.list-cont').gridlist('prev');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })

    cb();
  },
  forceUpdateModuleShow: function () {
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
      me.forceUpdateInitKeypad($modal);
      $modal.find('.save-btn').text('验证');
    })
    .on('hide.bs.modal', function(e) {
      me.forceUpdateDestroyKeypad($modal);
      $modal.flexmodal('remove');
      $modal.remove()
    })
    .on('onOk', function() {
      var secret = $('#MessageFlexmodal').find('.password').val();
      var status = $('#MessageFlexmodal').find('[name="status"]:checked').val();
      me.forceUpdateAppStatus(secret, status);
      $modal.flexmodal('modalHide');
    })
    .flexmodal('show', {
      modalTitle: '身份验证'
    });
  },
  forceUpdateInitKeypad: function($modal) {
    $modal.find('.init-keypad').keypad('init');
  },
  forceUpdateDestroyKeypad: function($modal) {
    $modal.find('.init-keypad').keypad('destroy');
  },
  forceUpdateAppStatus: function(secret, status) {
    var me = this;
    server({
      url: '/application/updateApplicationStatus',
      method: 'POST',
      data: {
        applicationId: me.applicationId,
        status: status,
        secret: secret
      }
    })
    .done(function(data) {
      noty({text: '更新申请状态成功', type: 'success', layout: 'topRight', timeout: 2000});
    })
    .fail(function(error) {
      var errorObj;
      try {
        errorObj = JSON.parse(error.responseText);
      } catch(e) {
        errorObj = { error: '更新状态失败'}
      }
      noty({text: errorObj.error, type: 'error', layout: 'top', timeout: 2000});
    })
  },
  sureDeletedNoty: function(fn) {
    noty({text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
      timeout: null,
      buttons: [
        {
          addClass: 'btn btn-empty big',
          text: '确定',
          onClick: function ($noty) {
            // me.deleteApp($node, {id: appId});
            fn && fn();
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
  initFormwork: function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    me.formwork = $editform.formwork({
      namespace : metadata.NS, //use current comp's name as namespace
      fields : {
        '#applicant' : {
          name : 'applicant',
          exclude: true
        },
        '#start': {
          name: 'start',
          init: function(){
            var $me = $(this);
            var objID = $me.attr('id');
            $me.val(moment(new Date().getTime() + 120000).format('YYYY-MM-DD HH:mm'));
            var $modal = $('<div class="' + objID + '">').appendTo($node)
            .flexmodal({IsSureBtn: true})
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              if($me.val()){
                if(moment($me.val()) < moment(new Date())){
                  var defaultDate = moment(new Date(new Date().getTime() + 120001));
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
                    minDate: new Date(new Date().getTime() + 120000),
                    sideBySide: true,
                    inline: true
                  });
              }
            })
            .on('onOk', function(){
              var timeValue = $modal.find('.time-box').data().date;
              $me.val(timeValue);
              $modal.flexmodal('modalHide');
              moment(timeValue).format('YYYY-MM-DD HH:mm');
              me.StartDate = timeValue;
            });
          },
          refresh: function(value, data){
            $(this).val(moment(value).format('YYYY-MM-DD HH:mm'));
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('Get Gun Date Invalid');
              return '取枪日期不能为空';
            }else{
              return null;
            }
          }
        },
        '#end': {
          name: 'end',
          init: function(){
            var $me = $(this);
            var objID = $me.attr('id');
            $me.val(moment(new Date().getTime() + 600000).format('YYYY-MM-DD HH:mm'));
            var $modal = $('<div class="' + objID + '">').appendTo($node)
            .flexmodal({IsSureBtn: true})
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug($me.val())
              if($me.val()){
                if(moment($me.val()) < moment(new Date())){
                  var defaultDate = moment(new Date().getTime() + 600001);
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
              var timeValue = $modal.find('.time-box').data().date;
              var startDate = new Date(moment(me.StartDate).format('YYYY-MM-DD')).getTime();
              var endDate = new Date(moment(timeValue).format('YYYY-MM-DD')).getTime();

              if(startDate != endDate){
                noty({text: '不能创建隔天申请', type: 'error', layout: 'top', timeout: 800});
                return;
              }
              $me.val(timeValue);
              $modal.flexmodal('modalHide');
            });
          },
          refresh: function(value, data){
              // $(this).data("DateTimePicker").date(moment(value).format('YYYY-MM-DD HH:mm'));
              $(this).val(moment(value).format('YYYY-MM-DD HH:mm'));
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('Return Date invalid');
              return '还枪日期不能为空';
            }else{
              return null;
            }
          }
        },
        '#detail': {
          name: 'detail',
          init: function(){
            var $detail = $(this);
            $editform.find('.quick-note').on('click', function(e){
              e.preventDefault();
              $detail.val($(e.currentTarget).attr('name'));
            })
          },
          validate : function(){
            log.debug('Handling detail validate event');
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
          init : function(){

            var $modal = $('<div/>').appendTo($node)
            .flexmodal()
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug("Open Selection ");
              var $node = $(e.target);
              var $list = $node.find('.type-list').empty()
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget);
                $modal.flexmodal('modalHide');
                var id = $node.data('id');
                var name = $node.data('name');
                var type = $node.data('type');
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
                    break;
                    case 'bullet':
                    case 'both':
                      $editform.find('#numGroup').removeClass('hide');
                      //$('#bulletTypeGroup').removeClass('hide');
                      $editform.find('#bulletAppTypeGroup').removeClass('hide');
                      $editform.find('#privategun').attr("checked", "checked").prop("checked", "checked");
                    break;
                  }
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/applicationtype'
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
            });
          },
          //value is an object of application type
          refresh: function(value, data){
            if(data && data.type){
              $(this).val(data.type.name);
              $editform.find('#type').data('type', data.type.type);
              console.log('工单类型: ', data.type.type);
              switch (data.type.type){
                case 'storageGun':
                case 'emergency':
                case 'maintain':
                case 'returnMaintain':
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
          refresh: function(value, data){
            $(this).parents('.form-group').find(':checkbox').attr("checked", null).prop("checked", null);
            if (!data.type) {
              return;
            }
            if(data.type.type === 'gun'){
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
              var $node = $(e.target);
              var $list = $node.find('.type-list').empty()
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget);
                $modal.flexmodal('modalHide');
                var typeId = $node.data('id');
                var typeName = $node.data('name');
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
                  url : '/bullettype'
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
          },
          refresh: function(value, data){
            if(data.type === 'gun' || data.bulletAppType === 'privategun'){
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
            if (!data.type) return;
            if(data.type.type === 'gun' || data.bulletAppType === 'privategun'){
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
            log.debug($editform.find('#type').data('type'))
            log.debug($(this).val())
            var type = $editform.find('#type').data('type');
            if( (type === 'bullet') && $(this).val() === ''){
              log.debug('Number invalid');
              return '子弹数目不能为空';
            }else{
              return null;
            }
          }
        },
        '#id': {
          name: 'id'
        },
      }
    })
    .on(metadata.NS + '.form.validate.valid', function(e){
      log.debug('Handling form validate event valid');
      $editform.formwork('submit');
    })
    .on(metadata.NS + '.form.validate.error', function(e, errors){
      log.debug('Handling form validate event error');
      noty({text: __('Something is wrong').replace('%s', errors.join(',')), type: 'error', timeout:5000});
    })
    .on(metadata.NS + '.form.submit', function(e, data){
      log.debug(data);
      me.submitApp(data);
    })
    .formwork('init');
  },
  editApp : function($node, id){
    var me = this;
    var $node = this.$node;
    var notyInst = null;
      server({
        url : metadata.endpoint + '?populate=applicant,bulletType,type',
        data: {id:id},
        beforeSend: function(){
          notyInst = noty({text: '加载..', layout: 'topRight'});
        }
      })
      .done(function(data){
        me.StartDate = data.start;
        var $editform = $node.find('form');

        // 检测是否为取枪工单, 如果为取枪工单，根据gunId获取枪号
        if (data.gun) {
          me.getGunDetail(data.gun);
        } else {
          me.$node.find("#gunCodeFormGroup").addClass('hide');
          me.$node.find("#gunCode").val('');
        }

        $editform.formwork('refresh', data);
        $node.pagestate('setState', 1);
        me.$node.find('.file_list_box').simpleViewer('init');
        if (data.status !== 'pending') {
          me.$node.find('#addFileBtn').addClass('hide');
          me.$node.find('.file_list_box').addClass('not_pending');
        } 
      })
      .fail(function(err){
        log.debug(err);
      })
      .always(function(){
        notyInst.close();
      });
  },
  getGunDetail: function(id) {
    var me = this;
    server({
      url: '/gun/' + id,
      method: 'GET'
    })
    .done(function(data) {
      var code = data.code;
      me.$node.find("#gunCodeFormGroup").removeClass('hide');
      me.$node.find("#gunCode").val(code);
      console.log("########### 枪详情: ################", data);
    })
    .fail(function() {
      me.$node.find("#gunCodeFormGroup").addClass('hide');
      me.$node.find("#gunCode").val('');
    });
  },
  updateApp : function($node, id, data){
    log.debug('Update Application');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = metadata.endpoint + '/' + id,
      dataType = 'json';
    var notyInst = null;
    server({
      url: url,
      method: 'PUT',
      data: data,
      dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight', timeout: 800});
      }
    }).done(function(data){
      log.debug(data);
      noty({text: '修改成功', type: 'success', timeout:3000, layout: 'topRight'});
      $node.parents('.grid-list-cell').removeClass('status-new status-approved status-rejected status-pending').addClass('status-' + data.status);
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    })
  },
  deleteApp : function($node, data){
    log.debug('Delete New Application');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = metadata.endpoint,
      dataType = 'json';
    var notyInst = null;
    server({
      url: url,
      method: 'DELETE',
      data: data,
      dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      log.debug(data);
      noty({text: '删除成功', type: 'success', timeout:5000, layout: 'topRight'});
      if ($node) {
        $node.parents('.grid-list-cell-holder').remove();
      } else {
        me.$node.pagestate('setState', 0);
        me.backBtnFnArray.splice(1, 1);
      }
      me.$node.find('.list-cont').gridlist('refresh');
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    })
  },
  submitApp : function(data){
    log.debug('Create New Application');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = '';
    var method = '';
    if(data.id){
      url = metadata.endpoint + '/' + data.id;
      method = 'PUT';
    }else{
      url = metadata.endpoint;
      method = 'POST';
    }
    var dataType = 'json';
    var notyInst = null;
    server({
      url: url,
      method: method,
      data: data, //_(data).omitBy(_.isUndefined).omitBy(_.isNull).omitBy(_.isEmpty).omit('id').value(),
      dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight', timeout: 800});
      }
    }).done(function(data){
      log.debug(data);
      noty({text: '创建成功', type: 'success', timeout:3000, layout: 'topRight'});
      me.$node.find('.list-cont')
      .gridlist(
        'refresh'
      );
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      log.debug(err);
      if(err.status == 400){
        if(err.responseJSON && err.responseJSON.error){
          // if(err.responseJSON.error == 'duplicated application')
            //noty({text: '同一时段内已经有申请', type: 'error', timeout:5000});
          noty({text: err.responseJSON.error, type: 'error', timeout:5000});
        }else{
          noty({text: err, type: 'error', timeout:5000});
        }
      }else{
        noty({text: err, type: 'error', timeout:5000});
      }
    })
    .always(function(){
      notyInst.close();
    })
  },
  cameraUpload: function(id) {
    var me = this;
    var applicationId = id;

    me.$node.find('.file_input_box')
    .off('change', '#input_file')
    .on('change', '#input_file', function() {
      me.$node.find('form')
      .ajaxSubmit({
        url: '/camera/upload?applicationId=' + applicationId,
        success: function(data) {
          me.removeInputDOM();
          me.getCapture(applicationId);
          noty({text: '附件添加成功!', type: 'success', layout: 'topRight', timeout: 3000});
        },
        error: function(error) {
          noty({text:'附件添加失败!', type: 'error', layout: 'top', timeout: 3000});
          me.removeInputDOM();
        }
      })
    });
    
  },
  removeInputDOM: function () {
    var $input = this.$node.find('#input_file');
    var $clone = $input.clone();
    $input.remove();
    this.$node.find('.file_input_box').append($clone);
  },
  getCapture: function(id) {
    var me = this;
    server({
      url: '/applicationcaptured?where={"applicationId": "' + id + '"}&v=' + new Date().getTime(),
      method: 'get'
    })
    .done(function(data) {
      var $box = me.$node.find('.file_list_box').empty();
      console.log('application capture data: ', data);
      _.each(data, function(item) {
        me.createCapture(item.assetId, $box);
      });
    })
    .fail(function() {
      noty({text: '获取证件图片失败!', type: 'error', layout: 'top', timeout: 3000});
    });
  },
  createCapture: function(assetId, $box) {
    var me = this;
  
    var $fileBox = $('<div class="file_box"/>');
    var $img = $('<img src=""/>');
    var $closeBtn = $('<div class="close_btn"/>');
    var $icon = $('<div class="glyphicon glyphicon-trash"/>'); 
    $img.attr('src', '/asset/image/' + assetId);
    $fileBox.data('id', assetId);
    $fileBox.append($img).append($closeBtn.append($icon));

    $box.append($fileBox);
  },
  removePic: function($cell) {
    var $box = $cell.parent();
    var id = $box.data('id');
    var me = this;
    console.log($box, 'this #cell.parent()')
    $.ajax({
      url: '/asset/applicationAssets/' + id,
      type: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    .done(function() {
      noty({text: '删除成功!', type: 'success', layout: 'top', timeout: 3000});
      $box.remove();
    })
    .fail(function(){
      noty({text: '删除操作失败!', type: 'error', layout: 'top', timeout: 3000});
    });
  }  
}

_.extend(ApplicationManagement.prototype, prototype);
module.exports = ApplicationManagement;
/**
ApplicationManagement module end
*/
