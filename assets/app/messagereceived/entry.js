/**
Message Management module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");
var noty = require('customnoty');
var datepicker = require('datetimepicker');
var font = require('fontawesome/less/font-awesome.less');
var moment = require("moment");
// window.moment = moment;
var checkbox3 = require('checkbox3/dist/checkbox3.css');

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var jade = require("./index.jade");
var css = require("common/less/base.less");
// var i18n = require('locales/zh-CN.json');

require("./less/index.less");

var easyClock = require('easy-clock');

var statusBar = require('statusbar');

var actionBar = require('actionbar');

var backBtn = require('backbtn');

var vmenu = require('vmenu');

var taskbar = require('taskbar');

var gridlist = require('gridlist');
var paging = require('paging');

var gridCell = require('./gridcell.jade');
var contactListCell = require('./contactlistcell.jade');

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var list = require('list');

var searchbox = require('searchbox');

var MessageManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('MessageManagement has been created');
  return this;
}

var metadata =  {
  NS : 'messagemanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/message'
}

_.extend(MessageManagement, metadata);

var prototype = {
  init : function (){
    log.info('init MessageManagement entry');
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
    //============= create page state
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

    // ========= create main html section
    $node.append(jade({
      i18n: __("messagemanagement"),
      i18nButton: __("buttonText")
    }));

    // ========= create edit cont
    $node.find('.edit-cont').hide().append(edit({
      i18n: __("messagemanagement")
    }));

    // ========= create bread crumbs
    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __("messagemanagement").messageManage,
          target: 'javascript:void(0)'
        },
        {
          name: __("messagemanagement").sendingBox,
          target: 'javascript:void(0)'
        },
        {
          name: __("messagemanagement").messageDetail,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    $node.pagestate('setState', 0);

    //==========  put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    // 给返回按钮添加默认的回调函数
    me.backBtnFnArray.push(function () {
      me.nav('/m/userhome');
    })
    $node.find('.appm-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.appm-action-bar').actionBar('show');

    //========== Create Left menu ============
    $node.find('.leftmenu')
    .on('vmenu.afterChange', function(e, previous, next, originalEvent){
      originalEvent.preventDefault();
      var id = next.attr('id');
      switch(id){
        case 'send-list' :
          _.delay(function(){me.nav('/m/messagemanagement')}, 250);
          break;
        case 'received-list' :
          _.delay(function(){me.nav('/m/messagereceived')}, 250);
          break;
      }
    })
    .vMenu('show',
      1,
      [
        {
          name: __("messagemanagement").inbox,
          target: '',
          id: 'send-list',
          clsName: 'vlink'
        },
        {
          name: __("messagemanagement").sendingBox,
          target: '',
          id: 'received-list',
          clsName: 'vlink'
        },
      ],
      true//clickable
    );

    /*
      created serchbox
    */
    $node.find('.search-cont').searchbox('show', {
      url: '/message?populate=from,to',
      searchKey: 'detail',
      searchTip: __("messagemanagement").searchByContent,
      gridCell: gridCell,
      isBagData: false
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function (event, appId, $node) {
        //点击搜索结果进入详情
        var processId = $node.data('pid');
        me.viewApp($node, appId, processId);
      })
      .on('searchComponentUpdateGridlist', function(e, appId, $node) {
        e.preventDefault();
        e.stopPropagation();
        log.debug('Delete gun type with id %s', appId);
        noty({
          text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
          timeout: null,
          buttons: [
            {
              addClass: 'btn btn-empty big',
              text: '确定',
              onClick: function ($noty) {
                me.deleteGunType($node, { id: appId });
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


    //========== Create paging ===========
    $node.find('.paging-btn-box')
    .paging('show');
    //========== Create gridlit ============
      $node.find('.list-cont')
      .on('click', '.delete-btn', function(e){
        e.preventDefault();
        e.stopPropagation();
        var $node = $(e.currentTarget);
        var appId = $node.data('id');
        log.debug('Delete gun type with id %s', appId);
        noty({text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
          timeout: null,
          buttons: [
          {
            addClass: 'btn btn-empty big',
            text: '确定',
            onClick: function ($noty) {
              me.deleteGunType($node, {id: appId});
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
        var processId = $node.data('pid') ;
        log.debug('Update Status to APPROVED app %s', appId);
        me.viewApp($node, appId, processId);
        //进入详情页面添加，返回回调函数
        me.backBtnFnArray.push(function () {
          me.$node.pagestate('setState', 0);
        })
      })
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
          url : metadata.endpoint + '?populate=from,to'
        },
        where : {
          "from" : user.id
        },
        sort: JSON.stringify({
          "createdAt" : "desc"
        }),
        innerTpl: function(data){
          log.debug(data)
          _.merge(data, {moment : moment});
          return gridCell(data);
        }, // A compiled jade template,
        renderFn : null // How to render body
      })

      .on('afterUpdate', function(){
        log.debug('after update list');
      })
      .gridlist(
        'show'
      );
    //========== Create taskbar ============
    var actions = [
      {
        name : '返回',
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(1);
        }
      }
    ];

    $node.find('.taskbar').taskbar('show', actions);
    me.initFormwork();

    //========== Create action button bar ============
    $node.on('click', '.btn', function(){
      var map = {
        refresh : function(){
          log.debug('refresh');
          $node.find('.list-cont').gridlist('refresh');

        },
        search: function () {
          $node.pagestate('setState', 2);
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
        '#detail': {
          name: 'detail'
        },
        '#typeText': {
          name: 'typeText',
          exclude : true,
          //value is an object of application type
          refresh: function(value, data){
            if(data){
              if(data.createdAt){
                var timeStr = moment(data.createdAt).format('YYYY-MM-DD HH:mm');
                $(this).val(timeStr);
              }
            }else{
              $editform.find('#typeText').val(null);
            }
          }
        }
      }
    });

    me.formwork
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
      me.submitGunType(data);
    })
    .formwork('init');
  },
  viewApp : function($node, id, processId){
    var $node = this.$node;
    var me = this;
    var notyInst = null;
      $.ajax({
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        url : '/message',
        data: {id:id},
        beforeSend: function(){
          notyInst = noty({text: '加载..', layout: 'topRight'});
        }
      })
      .done(function(data){
        log.debug(data);
        me.viewing = processId;
        var $editform = $node.find('form');
        $editform.formwork('refresh', data);
        $node.pagestate('setState', 1);
      })
      .fail(function(err){
        log.debug(err);
        noty({text: '获取详情失败', type: 'error', timeout:5000});
      })
      .always(function(){
        notyInst.close();
      });
  },
  deleteGunType: function($node, data){
    log.debug('Delete Message');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = '/message',
      dataType = 'json';
    var notyInst = null;
    $.ajax({
      url: url,
      method: 'DELETE',
      data: data,
      dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在删除', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      log.debug(data);
      noty({text: '删除成功', type: 'success', timeout:5000, layout: 'topRight'});
      $node.parents('.grid-list-cell-holder').remove();
      me.$node.find('.list-cont').gridlist('refresh');
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    })
  },
  submitGunType : function(data){
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = '';
    var method = '';
    if(data.id){
      url = '/message/' + data.id;
      method = 'PUT';
    }else{
      url = '/message';
      method = 'POST';
    }
    var dataType = 'json';
    var notyInst = null;
    $.ajax({
      url: url,
      method: method,
      data: data,
      dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      log.debug(data);
      noty({text: '创建成功', type: 'success', timeout:5000, layout: 'topRight'});
      me.$node.find('.gun-type-list')
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
  },
  formConfig : function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    var config = {
      "namespace" : metadata.NS,
      "fields" : {
        '#id':{
          name: 'id'
        },
        '#name': {
          name: 'name',
          validate : function(){
            if($(this).val() === ''){
              log.debug('Name invalid');
              return '名称不能为空';
            }
            else{
              return null;
            }
          }
        },
        '#detail': {
          name: 'detail'
        },
        '#bulletType': {
          name: 'bulletType',
          refresh: function(value, data){
            if(data && data.type)
              $(this).val(data.type.id);
          }
        }
      }
    };
    return config;
  }
}

_.extend(MessageManagement.prototype, prototype);
module.exports = MessageManagement;
/**
Gun type Management module end
*/
