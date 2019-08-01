/**
UserApplicationManagement module Start
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

var Promise = require("bluebird");

var server = require('common/server.js').server;

var UserApplicationManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('UserApplicationManagement has been created');
  return this;
}

var metadata =  {
  NS : 'userapplicationmanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/application'
}

_.extend(UserApplicationManagement, metadata);

var prototype = {
  init : function (){
    log.info('init UserApplicationManagement entry');
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
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(jade({
      i18n: __('userapplicationmanagement'),
      i18nButton: __('buttonText')
    }));
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('userapplicationmanagement').form
    }));

    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      1,
      [
        {
          name: __('userapplicationmanagement').myApplication,
          target: 'javascript:void(0)'
        },
        {
          name: __('userapplicationmanagement').applicationDetail,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    $node.pagestate('setState', 0);

    // put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    // 添加一个默认返回按钮回调函数
    me.backBtnFnArray.push(function () {
      me.nav('/m/userhome');
    })
    $node.find('.appm-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.appm-action-bar').actionBar('show');

    //Create paging
    $node.find('.paging-btn-box')
    .paging('show');

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
        url : metadata.endpoint + '?populate=applicant,type&sort[createdAt]=DESC&where={"applicant":"' + user.id + '", "isDeleted" : false}'
      },
      innerTpl: function(data){
        _.merge(data, {
            moment : moment, canViewApp : me.user.hasPermission('view-app'),
            i18n: __('application')
          }
        );
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
    .on('click', '.delete-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $btn = $(e.currentTarget);
      var appId = $btn.data('id');
      noty({text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
        timeout: null,
        buttons: [
        {
          addClass: 'btn btn-empty big',
          text: '确定',
          onClick: function ($noty) {
            me.cancelApp($node, appId);
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
    .on('click', '.go-btn', function(e){
      var btnType = $(this).data('type');
      log.debug('####userapplicationmanagement go-btn click', btnType)
      e.preventDefault();
      e.stopPropagation();
      if(btnType && btnType === 'gun'){
        me.nav('/m/getgun');
      }else if(btnType && btnType === 'bullet'){
        me.nav('/m/getbullet');
      }else if(btnType && btnType === 'both'){
        me.nav('/m/getall');
      }else if(btnType && btnType === 'emergency'){
        me.nav('/m/getall');
      }
    })
    .on('click', '.grid-list-cell', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      me.viewApp($node, appId);
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      })
    });

    var actions = [
      {
        name : __('buttonText').backBtn,
        target: function(e){
          e.preventDefault();
          me.$node.pagestate('setState', 0);
          me.backBtnFnArray.splice(1);
        }
      },
      {
        name : __('buttonText').cancelApplication,
        target: function(e){
          e.preventDefault();
          if(me.editingObj){
            if(me.editingObj.status === 'new' || me.editingObj.status === 'pending'){
              me.cancelApp($node, me.editingObj.id);
            }
            else
              noty({text: '只有正在审核的申请可以被取消', type: 'error', timeout:5000});
          }
        }
      }
    ];

    $node.find('.taskbar').taskbar('show', actions);
    me.initFormwork();

    $node.on('click', '.btn', function(){
      var map = {
        add : function(){
          log.debug('add');
          if ((me.user.hasPermission('manage-cabinet') || me.user.hasPermission('view-app')) && !me.user.hasPermission('manage-system')) {
            me.nav('/m/createapplication?getType=maintain');
          } else {
            me.nav('/m/createapplication');
          }
        },
        refresh : function(){
          log.debug('refresh');
          $node.find('.list-cont').gridlist('refresh');
        },
        search: function () {
          $node.pagestate('setState', 2);
        },
        returnToList : function(){
          $node.pagestate('setState', 0);
        },
        prev : function(){
          log.debug('prev page');
          $node.find('.list-cont').gridlist('prev');
        },
        next : function(){
          log.debug('next page');
          $node.find('.list-cont').gridlist('next');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })

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
  viewApp : function($node, id){
    var $node = this.$node;
    var me = this;
    var notyInst = null;
      server({
        url : metadata.endpoint + '?populate=applicant,bulletType,type&where={"isDeleted" : false}',
        data: {id:id},
        beforeSend: function(){
          notyInst = noty({text: '加载..', layout: 'topRight'});
        }
      })
      .done(function(data){
        me.editingObj = data;
        var $editform = $node.find('form');
        $editform.formwork('refresh', data);
        me.backBtnFnArray.splice(1);
        $node.pagestate('setState', 1);
      })
      .fail(function(err){
        log.debug(err);
      })
      .always(function(){
        notyInst.close();
      });
  },
  cancelApp : function($node, id){
    log.debug('Update Application to is delete');
    var me = this;
    var url = metadata.endpoint + '/cancel',
      dataType = 'json';
    var notyInst = null;
    server({
      url: url,
      method: 'POST',
      data: {id : id},
      dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在删除', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      log.debug('CancelFinish',data);
      noty({text: '删除成功', type: 'success', timeout:5000, layout: 'topRight'});
      $node.find('.list-cont')
      .gridlist(
        'refresh'
      );
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    })
  }
}

_.extend(UserApplicationManagement.prototype, prototype);
module.exports = UserApplicationManagement;
/**
UserApplicationManagement module end
*/
