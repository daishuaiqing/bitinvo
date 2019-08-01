/**
Bullet Type Management module Start
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

var vmenu = require('vmenu');

var taskbar = require('taskbar');
var backBtn = require('backbtn');

var gridlist = require('gridlist');

var paging = require('paging');

var gridCell = require('./gridcell.jade');
var typeListCell = require('./typelistcell.jade');

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var list = require('list');

var server = require("common/server.js").server;

var searchbox = require('searchbox');

var BulletTypeManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('BulletTypeManagement has been created');
  return this;
}

var metadata =  {
  NS : 'bullettypemanagement',
  pub : [

  ],
  sub : []
}

_.extend(BulletTypeManagement, metadata);

var prototype = {
  init : function (){
    log.info('init BulletTypeManagement entry');
    var me = this;
    me.backBtnFnArray = [];
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  show : function($node, cb){
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
      i18n: __('bullettypemanagement'),
      i18nButton: __('buttonText')
    }));

    // ========= create edit cont
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('bullettypemanagement')
    }));

    // ========= create bread crumbs
    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        { name: __('bullettypemanagement').bulletManage, target: 'javascript:void(0)'},
        { name: __('bullettypemanagement').bulletTypeManage, target: 'javascript:void(0)'},
        { name: __('bullettypemanagement').bulletDetailEdit, target: 'javascript:void(0)'}
      ],
      false
    );

    // $node.pagestate('setState', 0);

    //==========  put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    // 给返回按钮回调添加默认的回调函数
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
        case 'bullet-list' :
          _.delay(function(){ me.nav('/m/bullettypemanagement');}, 300);
          break;
        case 'bullet-type-list' :
          $node.pagestate('setState', 0);
          break;
      }
    })
    .vMenu('show',
      0,
      [
        { name: __('bullettypemanagement').bulletTypeManage, target: '#typelist', id: 'bullet-type-list', clsName : 'vlink'}
      ],
      true//clickable
    );

    /*
      Create searchbox
    */
    $node.find('.search-cont').hide().searchbox('show', {
      url: '/bullettype',
      searchKey:'name',
      searchTip: __('bullettypemanagement').searchByBulletName,
      gridCell : gridCell
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, AppId, $node){
          //搜索结果点击进入某个gridllist详情
        me.editBulletType(AppId);
      })
      .on('searchComponentDeleteGridlist', function(event, AppId, $node){
        //搜索结果删除某个gridlist
        me.deleteBulletType($node, {id: AppId});
      });


    //=========== Create paging ================
    $node.find('.paging-btn-box')
    .paging('show');
    //========== Create gridlit ============
    $node.find('.bullet-type-list')
    .on('click', '.delete-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Delete bullet type with id %s', appId);
      noty({text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
        timeout: null,
        buttons: [
        {
          addClass: 'btn btn-empty big',
          text: '确定',
          onClick: function ($noty) {
            me.deleteBulletType($node, {id: appId});
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
      var $cell = $(e.currentTarget);
      var id = $cell.data('id');
      me.editBulletType(id);
      //进入详情页面，给返回按钮添加回调函数
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
        url : '/bullettype',
        data: 'data'
      },
      sort: JSON.stringify({
        "createdAt" : "DESC"
      }),
      innerTpl: function(data){
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
        name : '取消',
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(1);
        }
      },
      {
        name : '添加',
        target: function(e){
          e.preventDefault();
          var $editform = $node.find('form');
          $editform.formwork('validate');
        }
      }
    ];

    $node.find('.taskbar').taskbar('show', actions);
    me.initFormwork();

    //========== Create action button bar ============
    $node.on('click', '.btn', function(){
      var map = {
        add : function(){
          log.debug('add');
          var $editform = $node.find('form');
          $editform.formwork('clear');
          $node.pagestate('setState', 1);
          me.backBtnFnArray.push(function () {
            $node.pagestate('setState', 0);
          })
        },
        search: function(){
          $node.pagestate('setState', 2);
          me.backBtnFnArray.push(function () {
            $node.pagestate('setState', 0);
          })
        },
        refresh : function(){
          log.debug('refresh');
          $node.find('.bullet-type-list').gridlist('refresh');

        },
        prev : function(){
          $node.find('.bullet-type-list').gridlist('prev');
        },
        next : function(){
          $node.find('.bullet-type-list').gridlist('next');
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

    me.formwork = $editform.formwork(me.formConfig());

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
      me.submitBulletType(data);
    })
    .formwork('init');
  },
  editBulletType: function(id){
    var $node = this.$node;
    var notyInst = null;
    server({
      url : '/bullettype?populate=gunTypes',
      data: {id:id},
      beforeSend: function(){
        notyInst = noty({text: '加载..', layout: 'topRight'});
      }
    })
    .done(function(data){
      log.debug(data);
      var $editform = $node.find('form');
      $editform.formwork('refresh', data);
      $node.pagestate('setState', 1);
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    });
  },
  deleteBulletType: function($node, data){
    log.debug('Delete Bullet Type');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = '/bullettype',
      dataType = 'json';
    var notyInst = null;
    server({
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
      me.$node.find('.bullet-type-list').gridlist('refresh');
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    })
  },
  submitBulletType : function(data){
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = '';
    var method = '';
    if(data.id){
      url = '/bullettype/' + data.id;
      method = 'PUT';
    }else{
      delete data.id;
      url = '/bullettype?populate=gunTypes';
      method = 'POST';
    }
    var dataType = 'json';
    var notyInst = null;
    server({
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
      me.$node.find('.bullet-type-list')
      .gridlist(
        'refresh'
      );
      me.backBtnFnArray.splice(1);
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
            if(_.trim($(this).val()) === ''){
              log.debug('Name invalid');
              return '名称不能为空';
            }
            else{
              return null;
            }
          }
        },
        '#code': {
          name: 'code',
          validate : function(){
            if(_.trim($(this).val()) === ''){
              return __('bullettypemanagement').bulletTypeCodeNotBeEmpty;
            }else{
              return null;
            }
          }
        },
        '#gunTypes': {
          name: 'gunTypes',
          refresh: function(value, data){
            if(data && data.gunType)
              $(this).val(data.gunType.id);
          }
        },
        '#gunTypeText': {
          name: 'gunTypeText',
          exclude : true,
          init : function(){
            var $modal = $('<div/>').appendTo($node)
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug("Open Selection");
              var $node = $(e.target);
              var $list = $node.find('.type-list')
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget);
                log.debug($node);
                $modal.flexmodal('modalHide');
                var typeId = $node.data('id');
                var typeName = $node.data('name');
                if(typeId){
                  $editform.find('#gunTypeText').val(typeName);
                  $editform.find('#gunTypes').val(typeId);
                  $editform.find('#gunTypeClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/guntype'
                },
                limit: 5,
                innerTpl: typeListCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            })
            .flexmodal();

            $node.on('click', '#gunTypeClearBtn', function(e){
              e.preventDefault();
              $editform.find('#gunTypeText').val(null);
              $editform.find('#gunType').val(null);
              $editform.find('#gunTypeClearBtn').addClass('hide');
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle: __('bullettypemanagement').pleaseSelectedBulletType
                },
                require('./typelist.jade')
              );
            });
          },
          refresh: function(value, data){
            if(data && data.gunTypes && data.gunTypes.length > 0){
              $(this).val(data.gunTypes[0].name);
              $('#gunTypeClearBtn').removeClass('hide');
            }else{
              $editform.find('#gunTypeText').val(null);
              $editform.find('#gunType').val(null);
              $('#gunTypeClearBtn').addClass('hide');
            }
          }
        }
      }
    };
    return config;
  }
}

_.extend(BulletTypeManagement.prototype, prototype);
module.exports = BulletTypeManagement;
/**
Bullet type Management module end
*/
