/**
PositionManagement module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");

var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");
var font = require('fontawesome/less/font-awesome.less');
var moment = require("moment");
var checkbox3 = require('checkbox3/dist/checkbox3.css');

var datepicker = require('datetimepicker');
var tagsinput = require('tagsinput');

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

var posCell = require('./poscell.jade');

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var server = require('common/server.js').server;

var keypad = require('keypad');

var searchbox = require('searchbox');

//定义类
var PositionManagement = function(reg){
  //注入到类里面
  reg.apply(this);
  log.info('PositionManagement has been created %s', this.getIId());
  return this;
}

//定义一些额外的信息
var metadata =  {
  NS : 'positionmanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/position'
}

_.extend(PositionManagement, metadata);

var prototype = {
  // 这个方法只会在初始化时调用
  init : function (){
    log.info('init PositionManagement entry');
    // 定义一个返回按钮的回调数组
    this.backBtnFnArray = [];
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  //每次显示的时候都会被调用一次
  show : function($node, cb){
    var me = this;
    //声明当前应用中， 两种状态
    me.$node.pagestate({
      namespace : metadata.NS,
      state: 0,
      /*
        0 list
        1 edit
      */
      states : {
        0 : [
          '.list-cont' //列表状态
        ],
        1 : [
          '.edit-cont' //编辑状态
        ],
        2 : [
          '.search-cont'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    //应用页面的初始化
    $node.append(jade({
      i18nButton: __('buttonText'),
      i18n: __('positionmanagement')
    }));

    //编辑表单初始化
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('positionmanagement'),
      i18nButton: __('buttonText')
    }));

    //初始化表单业务逻辑
    me.initFormwork();
    // 面包线
    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __('positionmanagement').userManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('positionmanagement').positionManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('positionmanagement').positionDetail,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    $node.pagestate('setState', 0);

    // put modules to frame
    $node.find('.posm-comp-clock').easyClock();
    // 设置返回按钮的默认回调
    me.backBtnFnArray.push(function () {
      me.nav('/m/userhome');
    })
    $node.find('.posm-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.posm-action-bar').actionBar('show');
    //左边菜单栏
    $node.find('.leftmenu')
    .on('vmenu.afterChange', function(e, previous, next, originalEvent){
      originalEvent.preventDefault();
      var id = next.attr('id');
      switch(id){
        case 'user-list' :
          _.delay(function(){me.nav('/m/usermanagement')}, 250);
          break;
        case 'dutyshift-list' :
           _.delay(function(){me.nav('/m/dutyshiftmanagement')}, 250);
          break;
        case 'role-list' :
           _.delay(function(){me.nav('/m/rolemanagement')}, 250);
          break;
        case 'pos-list' :
           _.delay(function(){me.nav('/m/positionmanagement')}, 250);
          break;
      }
    })
    .vMenu('show',
      3,
      [
        {
          name: __('usermanagement').userInfoManage,
          target: '#list',
          id: 'user-list',
          clsName: 'vlink'
        }, {
          name: __('usermanagement').dutyshiftmanagement,
          target: '#dutyshiftlist',
          id: 'dutyshift-list',
          clsName: 'vlink'
        }, {
          name: __('usermanagement').rolemanagement,
          target: '#rolelist',
          id: 'role-list',
          clsName: 'vlink'
        }, {
          name: __('usermanagement').positionmanagement,
          target: '#poslist',
          id: 'pos-list',
          clsName: 'vlink'
        }
      ],
      true//clickable
    );
    //Create paging
    $node.find('.paging-btn-box')
    .paging('show');

    /*
      初始化搜索组件
    */
    $node.find('.search-cont').searchbox('show', {
      url: '/position?populate=superior,subordinates',
      searchKey:'name',
      searchTip: '根据角色搜索',
      gridCell: gridCell,
      isBagData: true
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, appId, $node){
          //搜索结果点击进入某个gridllist详情
        me.editPos($node, appId);
      })
      .on('searchComponentDeleteGridlist', function(e, appId, $node) {
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
                me.deletePos($node, { id: appId });
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
            me.deletePos($node, {id: appId});
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
      me.editPos($node, appId);
      // 进入详情给返回按钮添加回调
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      })
    })
    .gridlist({
      source: {
        url : metadata.endpoint + '?populate=superior,subordinates'
      },
      data : {
        'sort': 'id ASC'
      },
      sort: JSON.stringify({
        "createdAt" : "DESC"
      }),
      innerTpl: function(data){
        var tplData = {data : data};
        _.merge(tplData, {moment : moment});
        return gridCell(tplData);
      }, // A compiled jade template,
      renderFn : null // How to render body
    })
    .on('afterUpdate', function(){

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
    .gridlist(
      'show'
    );

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
        search : function(){
          $node.pagestate('setState', 2);
          me.backBtnFnArray.push(function () {
            $node.pagestate('setState', 0);
          })
        },
        refresh : function(){
          log.debug('refresh');
          $node.find('.list-cont').gridlist('refresh');
        },
        returnToList : function(){
          $node.pagestate('setState', 0);
        },
        submitApp : function(){
          var $editform = $node.find('form');
          $editform.formwork('validate');
        },
        prev : function(){
          $node.find('.list-cont').gridlist('prev');
        },
        next : function(){
          $node.find('.list-cont').gridlist('next');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })


    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('.big-btn-cont'), ['waves-block']);
    // waves.init();

    this.addKeyboard($node);
    cb();
  },
  addKeyboard : function($node){
    $node.find('#name').keypad('init', {

    });
  },
  initFormwork: function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    me.formwork = $editform.formwork({
      namespace : metadata.NS, //use current comp's name as namespace
      fields : {
        '#name': {
          name: 'name',
          validate : function(){
            log.debug('Handling title validate event');
            if(($(this).val()).trim() === ''){
              log.debug('Title invalid');
              return '职位不能为空';
            }
            else{
                return null;
            }
          }
        },
        '#detail': {
          name: 'detail'
        },
        '#id': {
          name: 'id'
        },
        '#superiorText': {
          name: 'superiorText',
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
                log.debug($node);
                $modal.flexmodal('modalHide');
                var id = $node.data('id');
                var name = $node.data('name');
                if(id){
                  $editform.find('#superiorText').val(name);
                  $editform.find('#superior').val(id);
                  $editform.find('#superiorClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: function(){
                  return {
                    url : metadata.endpoint + '?populate=superior,subordinates'
                  }
                },
                data : function(){
                  if(me.editingObj){
                    return {
                      'where' : {"id":{"!": me.editingObj.id}}
                    }
                  }
                },
                limit: 5,
                innerTpl : posCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $node.on('click', '#superiorClearBtn', function(e){
              e.preventDefault();
              $editform.find('#superiorText').val(null);
              $editform.find('#superior').val(null);
              $editform.find('#superiorClearBtn').addClass('hide');
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
            if(data && data.superior){
              $(this).val(data.superior.name);
              $('#superiorClearBtn').removeClass('hide');
            }else{
              $editform.find('#superiorText').val(null);
              $editform.find('#superior').val(null);
              $('#superiorClearBtn').addClass('hide');
            }
          }
        },
        '#superior': {
          name : 'superior',
          refresh: function(value, data){
            if(data && data.superior)
              $(this).val(data.superior.id);
          }
        }
      }
    })
    .on(metadata.NS + '.form.validate.valid', function(e){
      log.debug('Handling form validate event valid');
      $editform.formwork('submit');
    })
    .on(metadata.NS + '.form.validate.error', function(e, errors){
      log.debug('Handling form validate event error');
      noty({text: __('Something is wrong').replace('%s', errors.join(',')), type: 'error', timeout:5000, layout: 'top'});
    })
    .on(metadata.NS + '.form.submit', function(e, data){
      log.debug(data);
      me.submitApp(data);
    })
    .formwork('init');
  },
  editPos : function($node, id){
    var $node = this.$node;
    var me = this;
    var notyInst = null;
    server({
      url : metadata.endpoint + '?populate=superior,subordinates',
      data: {id:id},
      beforeSend: function(){
        notyInst = noty({text: '加载..', layout: 'topRight'});
      }
    })
    .done(function(data){
      log.debug(data);
      var $editform = $node.find('form');
      me.editingObj = data;
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
  deletePos : function($node, data){
    log.debug('Delete New Application Type');
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
  submitApp : function(data){
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = '';
    var method = '';
    if(data.id){
      url = metadata.endpoint + '/' + data.id;
      method = 'PUT';
    }else{
      delete data.id;
      url = metadata.endpoint;
      method = 'POST';
    }
    var dataType = 'json';
    var notyInst = null;
    server({
      url: url,
      method: method,
      data : JSON.stringify(data),
      contentType : 'application/json',
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
      me.backBtnFnArray.splice(1);
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      log.debug(err);
      if(err.status === 400 && typeof err.responseJSON.message === 'string' && err.responseJSON.message.indexOf('already exists')){
        noty({text: '请不要添加重复的职位', type: 'error', timeout:5000});
      }else{
        noty({text: err.responseJSON.error, type: 'error', timeout:5000});
      }
    })
    .always(function(){
      notyInst.close();
    })
  }
}

_.extend(PositionManagement.prototype, prototype);
module.exports = PositionManagement;
/**
PositionManagement module end
*/
