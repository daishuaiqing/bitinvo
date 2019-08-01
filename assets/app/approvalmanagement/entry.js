/**
Approval Management module Start
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

var view = require('./view.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var server = require("common/server.js").server;

var searchbox = require('searchbox');

var JSMpeg = require('./jsmpeg.min.js');

var videoJade = require('./video.jade');

var ApprovalManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('ApprovalManagement has been created');
  return this;
}

var metadata =  {
  NS : 'approvalmanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/applicationprocess'
}

_.extend(ApprovalManagement, metadata);

var prototype = {
  init : function (){
    log.info('init ApprovalManagement entry');
    this.backBtnFnArray = [];
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  show : function($node, cb){
    var me = this;
    var user = me.user.getUser();
    user.done(function(user){
      me.start($node, cb, user);
    })
    .fail(function(){
      cb && cb();
      me.nav('/m/login');
    });
  },
  start : function($node, cb, user){
    var me = this;
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
        2: [
          '.search-cont'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(jade({
      i18nButton: __('buttonText'),
      i18n: __("applicationmanagement")
    }));
    $node.find('.edit-cont').hide().append(view({
      i18n: __('userapplicationmanagement').form
    }));

    $node.find('.videoBox').append(videoJade());

    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __('applicationmanagement').appManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('applicationmanagement').approver,
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

    // put modules to frame
    $node.find('.appm-comp-clock').easyClock();

    // 添加一个默认的返回回调
    me.backBtnFnArray.push(function () {
      if($('body').hasClass('isSimpleapplication')){
        me.nav('/m/simpleapplication');
      }else{
        me.nav('/m/userhome');
      }
    })
    $node.find('.appm-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.appm-action-bar').actionBar('show');

    $node.find('.leftmenu')
    .on('vmenu.afterChange', function(e, previous, next, originalEvent){
      originalEvent.preventDefault();
      var id = next.attr('id');
      switch(id){
        case 'app-list' :
          me.nav('/m/applicationmanagement');
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
      2,
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

    //create paging
    $node.find('.paging-btn-box')
    .paging('show');

    /*
    *   初始化数据搜索组件
    */
    $node.find('.search-cont').searchbox('show', {
      url:'/applicationprocess/findWithApplicant?populate=applicant,type,application&time=' + moment(new Date()) +'&than=bigger',
      searchKey:'applicant',
      searchTip: '根据用户名搜索',
      gridCell: gridCell,
      i18n: __('application'),
      isBagData: false,
      specialURL: true,
      updateSearchListHandle: function (data, dataLen, allLi) {
        for(var i = 0; i < dataLen; i++){
          var tipsKey = data[i].applicant.alias;
          var oli = '<li class="search-result-li" data-value="' + tipsKey + '">' + tipsKey + '</li>';
          allLi += oli;
        }
        return allLi;
      }
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, appId, $node){
          //搜索结果点击进入某个gridllist详情
          var processId = $node.data('pid');
          me.viewApp($node, appId, processId);
      })
      .on('searchComponentDeleteGridlist', function (e, appId, $node) {
        e.preventDefault();
        e.stopPropagation();
        log.debug('Delete application with id %s', appId);
        noty({
          text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
          timeout: null,
          buttons: [
            {
              addClass: 'btn btn-empty big',
              text: '确定',
              onClick: function ($noty) {
                me.deleteApp($node, { id: appId });
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


    $node.find('.list-cont')
    .on('onNext', function(e, skip, total, limit){
      $node.find('.paging-btn-box')
      .paging('next', skip, total, limit);
    })
    .on('onPrev', function(e, skip, total, limit){
      $node.find('.paging-btn-box')
      .paging('prev', skip, total, limit);
    })
    .on('gridlist.afterTotalChange', function(event, total, limit, skip){
      $node.find('.paging-btn-box')
      .paging('refresh', skip, total, limit);
    })
    .gridlist({
      source: {
        url : metadata.endpoint + '/findWithTotal?populate=applicant,type,application&time=' + moment(new Date()) +'&than=bigger'
      },
      innerTpl: function(data){
        console.log(data.status)
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
    .gridlist(
      'show'
    );

    $node.find('.list-cont')
    .on('click', '.approve-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      var applicant = $node.parents('.grid-list-cell').data('applicant');
      if (applicant === user.username) {
        return noty({text: '工单不能进行自我操作', type: 'error', layout: 'top', timeout: '2000'});
      }
      log.debug('Update Status to APPROVED app %s', appId);
      me.updateApp($node, appId, {status: 'approved'});
    })
    .on('click', '.deny-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      var applicant = $node.parents('.grid-list-cell').data('applicant');
      if (applicant === user.username) {
        return noty({text: '工单不能进行自我操作', type: 'error', layout: 'top', timeout: '2000'});
      }
      log.debug('Update Status to DENY app %s', appId);
      me.updateApp($node, appId, {status: 'rejected'});
    })
    .on('click', '.delete-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Delete application with id %s', appId);
      noty({text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
        timeout: null,
        buttons: [
        {
          addClass: 'btn btn-empty big',
          text: '确定',
          onClick: function ($noty) {
            me.deleteApp($node, {id: appId});
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
    })
    .on('click', '.grid-list-cell', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      var processId = $node.data('pid');
      log.debug('Update Status to APPROVED app %s', appId);
      var applicant = $node.data('applicant');
      var applicantIsUs = false;
      if (applicant === user.username) {
        applicantIsUs = true;
      }
      var status = $node.data('status');
      var appStatus = $node.data('appstatus');

      var cabinetId = $node.data('cabinetid');
      me.currentApplicationCabinetId = cabinetId;
      me.viewApp($node, appId, processId, applicantIsUs, status, appStatus);
      var name = $node.find('.user-name').text();
      me.$node.find('.breadcrumb .active').text(name + '工单详情');

      // 进入详情页面，添加返回按钮回调
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      })
    });

    me.initFormwork();

    $node.find('.actions-bar').on('click', '.btn', function(){
      var map = {
        refresh : function(){
          log.debug('refresh');
          $node.find('.list-cont').gridlist('refresh');
        },
        returnToList : function(){
          $node.pagestate('setState', 0);
        },
        search : function(){
          $node.pagestate('setState', 2);
          me.backBtnFnArray.push(function () {
            $node.pagestate('setState', 0);
          })
        },
        next : function(){
          log.debug('next page');
          $node.find('.list-cont').gridlist('next');
        },
        prev : function(){
          log.debug('prev page');
          $node.find('.list-cont').gridlist('prev');
        },
        newList : function(){
          log.debug('newList');
          $node.find('.btn[name="newList"]').addClass('on').siblings().removeClass('on');
          var url =  metadata.endpoint + '/findWithTotal?populate=applicant,type,application&time=' + moment(new Date()) +'&than=bigger';
          $node.find('.list-cont').gridlist('fetch', null, null, null, null, url, true);
          $node.trigger('onNewList');
        },
        expirationList : function(){
          log.debug('expirationList');
          $node.find('.btn[name="expirationList"]').addClass('on').siblings().removeClass('on');
          var url =  metadata.endpoint + '/findWithTotal?populate=applicant,type,application&time=' + moment(new Date()) +'&than=smaller';
          $node.find('.list-cont').gridlist('fetch', null, null, null, null, url, true);
          $node.trigger('onExpirationList');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });
    // $node.on('onNewList', function(){
    //   var time = setTimeout(function(){
    //     $node.find('.list-cont').gridlist('refresh');
    //     clearTimeout(time);
    //   },200)
    // })
    // .on('onExpirationList', function(){
    //   var time = setTimeout(function(){
    //     $node.find('.list-cont').gridlist('refresh');
    //     clearTimeout(time);
    //   },200)
    // })


    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('.big-btn-cont'), ['waves-block']);
    // waves.init();

    cb();
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
          refresh: function(value, data){
            $(this).val(moment(value).format('YYYY-MM-DD HH:mm'));
          }
        },
        '#end': {
          name: 'end',
          refresh: function(value, data){
            $(this).val(moment(value).format('YYYY-MM-DD HH:mm'));
          }
        },
        '#detail': {
          name: 'detail'
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
              }
            }else{
              $editform.find('#typeText').val(null);
              $editform.find('#type').val(null);
              $editform.find('#type').data('type', null);
              $editform.find('#typeClearBtn').addClass('hide');
            }
          }
        },
        '[name="bulletAppType"]': {
          name: 'bulletAppType',
          refresh: function(value, data){
            $(this).parents('.form-group').find(':checkbox').attr("checked", null).prop("checked", null);
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
          }
        },
        '#bulletTypeText': {
          name: 'bulletTypeText',
          exclude : true,
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
            if(data.type.type === 'gun' || data.bulletAppType === 'privategun'){
              $(this).val(null);
              return;
            }
            if(data && data.bulletType)
              $(this).val(data.bulletType.id);
          }
        },
        '#num' : {
          name : 'num'
        },
        '#id': {
          name: 'id'
        }
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
  viewApp : function($node, id, processId, applicantIsUs, status, appStatus){
    var $node = this.$node;
    var me =  this;
    var notyInst = null;
      server({
        url : '/application?populate=applicant,bulletType,type',
        data: {id:id},
        beforeSend: function(){
          notyInst = noty({text: '加载..', layout: 'topRight'});
        }
      })
      .done(function(data){
        log.debug(data.status, 'This status 工单状态');

        //这里是判断 详情页下面按钮
        if (data.status && data.status !== 'pending') {
          var actions = [
            {
              name : '取消',
              target: function(){
                $node.pagestate('setState', 0);
                me.backBtnFnArray.splice(1);
              }
            },
            {
              name: '查看现场视频',
              target: function () {
                if (me.viewing) {
                  me.openVideo();
                }
              }
            }
          ];
        }else{
          var actions = [
            {
              name : __('buttonText').cancelBtn,
              target: function(){
                $node.pagestate('setState', 0);
                me.backBtnFnArray.splice(1);
              }
            },
            {
              name: __('buttonText').rejectBtn,
              id: '_rejectedButton',
              target: function(){
                if(me.viewing){
                  me.updateApp($node, me.viewing, {status: 'rejected'});
                }
              }
            },
            {
              name: __('buttonText').approvalBtn,
              id: '_authorizedButton',
              target: function(){
                if(me.viewing){
                  me.updateApp($node, me.viewing, {status: 'approved'});
                }
              }
            },
            {
              name: '查看现场视频',
              target: function () {
                if (me.viewing) {
                  me.openVideo();
                }
              }
            }
          ];
        }
        $node.find('.taskbar').taskbar('show', actions);
        me.viewing = processId;
        var $editform = $node.find('form');
        $editform.formwork('refresh', data);
        $node.pagestate('setState', 1);

        var appStatusList = ['approve', 'reject', 'complete', 'processed'];
        if (applicantIsUs || (appStatusList.indexOf(appStatus) > -1)) {
          $node.find('#_rejectedButton').addClass('hide');
          $node.find('#_authorizedButton').addClass('hide');
        }
      })
      .fail(function(err){
        log.debug(err);
        noty({text: '获取详情失败', type: 'error', timeout:5000});
      })
      .always(function(){
        notyInst.close();
      });
  },
  // 初始化视频直播
  openVideo: function() {
    var me = this;
    var cabinetId = me.currentApplicationCabinetId;
    
    if (me.openVideo.isOpen) return;
    me.openVideo.isOpen = true;

    noty({text: '正在打开现场视频， 请等待', type:'info', layout: 'topRight', timeout: 3000});

    me.openFFMPEG(cabinetId, 'open')
    .done(function(data) {
      me.$node.find('.videoBox').removeClass('hide');
      me.initVideo();
    })
    .fail(function(err) {
      var errorr = err && err.responseJSON && err.responseJSON.msg;
      me.openVideo.isOpen = null;
      noty({
        text: errorr,
        type: 'error',
        layout: 'top',
        timeout: 2000
      });
    });

    // 初始化视屏
    me.$node
    .find('.closeBtn')
    .off('click')
    .on('click', function() {
      me.$node.find('.videoBox').addClass('hide');
      me.destroyVideo(cabinetId);
      me.openVideo.isOpen = null;
    });
  },
  initVideo: function() {
    var ip = window.location.host.split(':')[0];
    var me = this;
    var url = 'ws://' + ip + ':8082';
    var canvas = document.getElementById('video-canvas');
    var player = new JSMpeg.Player(url, {
      canvas: canvas,
    });
    me.player = player;
  },
  destroyVideo: function (cabinetId) {
    var me = this;
    me.openFFMPEG(cabinetId, 'close');
    me.player.destroy();
    me.player = null;
  },
  getWS: function(cabinetId) {
    return server({
      url: '/cabinet?where={"id":"' + cabinetId + '"}'
    })
  },
  openFFMPEG: function(cabinetId, status) {
    return server({
      url: '/cabinet/webcam',
      method: 'put',
      data: {
        cabinetId: cabinetId,
        status: status
      }
    })
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
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      if(data.status === 'rejected'){
        noty({text: '您拒绝了此申请', type: 'success', timeout:5000, layout: 'topRight'});
      }else{
        noty({text: '修改成功', type: 'success', timeout:5000, layout: 'topRight'});
      }
      me.$node.find('.list-cont')
      .gridlist(
        'refresh'
      );
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      log.debug(err);
      noty({text: '更新失败', type: 'error', timeout:5000});
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
      $node.parents('.grid-list-cell-holder').remove();
    })
    .fail(function(err){
      log.debug(err);
      noty({text: '删除失败', type: 'error', timeout:5000});
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
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      log.debug(data);
      noty({text: '创建成功', type: 'success', timeout:5000, layout: 'topRight'});
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
          if(err.responseJSON.error == 'duplicated application')
            noty({text: '同一时段内已经有申请', type: 'error', timeout:5000});
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
  }
}

_.extend(ApprovalManagement.prototype, prototype);
module.exports = ApprovalManagement;
/**
ApprovalManagement module end
*/
