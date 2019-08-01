/**
RoleManagement module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");
var animateCss = require("animate.css");

var font = require('fontawesome/less/font-awesome.less');
// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");
var jade = require("./index.jade");
var css = require("common/less/base.less");
// var i18n = require('locales/zh-CN.json');
var checkbox3 = require('checkbox3/dist/checkbox3.css');
require("./less/index.less");

var noty = require('customnoty');
var moment = require('moment');
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

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var Promise = require("bluebird");

var server = require('common/server.js').server;

var searchbox = require('searchbox');

var RoleManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('RoleManagement has been created');
  return this;
}

var metadata =  {
  NS : 'rolemanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/role'
}

_.extend(RoleManagement, metadata);

var prototype = {
  init : function (){
    log.info('init RoleManagement entry');
    var me = this;
    //定义一个返回按钮回调的数组
    me.backBtnFnArray = [];
    server({
      url : '/remote/checkremotemaster'
    }, true)
    .done(function(data){
      if(!data.hasRemoteMaster){
        me.currentCabinetIsMaster = true;
      }else{
        me.currentCabinetIsMaster = false;
      }
      me.currentLocalCabinetCode = data.localCabinetCode;
    });
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  show : function($node, cb){
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
        2 : [
          '.search-cont'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(jade());
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('rolemanagement')
    }));
    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __('rolemanagement').userManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('rolemanagement').roleManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('rolemanagement').roleDetail,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    $node.pagestate('setState', 0);

    // put modules to frame
    $node.find('.role-comp-clock').easyClock();
    // 返回按钮添加默认的回调
    me.backBtnFnArray.push(function () {
      me.nav('/m/userhome');
    })
    $node.find('.role-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.role-action-bar').actionBar('show');

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
      2,
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
      created searchbox component
    */
    $node.find('.search-cont').searchbox('show', {
      url: '/role',
      searchKey:'name',
      searchTip: '根据角色搜索',
      gridCell: gridCell,
      isBagData: false
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, appId, $node){
          //搜索结果点击进入某个gridllist详情
        me.editApp($node, appId);
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
    .gridlist({
      source: {
        url : metadata.endpoint,
        data: 'data'
      },
      where: {'name': {'!': '超级管理员'}},
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
      log.debug('afterTotalChange');
      $node.find('.paging-btn-box')
      .paging('refresh', skip, total, limit);
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
      log.debug('Update Status to APPROVED app %s', appId);
      me.editApp($node, appId);

      // 进入了角色详情，给返回按钮添加回调
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      });
    });
    var actions = [
      {
        name : '取消',
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(me.backBtnFnArray.length - 1, 1);
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

    cb();
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
            if($(this).val() === ''){
              log.debug('Title invalid');
              return '角色名称不能为空';
            }
            else{
                return null;
            }
          }
        },
        '[name="permissions"]': {
          name: 'permissions',
          init : function(){
            // $(this).on('click', function(e){
            //   $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
            //   $(this).attr("checked", 'checked').prop("checked", "checked");
            // });
          },
          refresh: function(value, data){
            console.log(value);
            $(this).each(function(){
              var valAttr = $(this).attr('value');
              if(_.indexOf(value, valAttr) >= 0){
                $(this).prop('checked', 'checked').attr("checked", 'checked');
              }else{
                $(this).prop('checked', null).attr("checked", null);
              }
            });
          },
          validate : function(){
            // if($(this).val() === ''){
            //   log.debug('Type invalid');
            //   return '状态不能为空';
            // }else{
            //   return null;
            // }
          },
          val : function(value, data){
            var values = [];
            $(this).each(function(){
              if($(this).prop('checked')){
                var val = $(this).val();
                values.push(val);
              }
            });
            return values;
          }
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
      noty({text: __('Something is wrong').replace('%s', errors.join(',')), type: 'error', timeout:5000, layout:'top'});
    })
    .on(metadata.NS + '.form.submit', function(e, data){
      log.debug(data);
      me.submitApp(data);
    })
    .formwork('init');
  },
  editApp : function($node, id){
    var $node = this.$node;
    var notyInst = null;
      server({
        url : metadata.endpoint,
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
      log.debug(data);
      noty({text: '修改成功', type: 'success', timeout:5000, layout: 'topRight'});
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
    log.debug('Create New Application');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = '';
    var method = '';
    if(data.id){
      data.permissions = data.permissions.length > 0 ? data.permissions : null;
      url = me.currentCabinetIsMaster && metadata.endpoint + '/' + data.id || '/master' + metadata.endpoint + '/' + data.id;
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
      data: data,
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
        noty({text: '请不要添加重复的角色', type: 'error', timeout:5000});
      }else{
        noty({text: err.responseJSON.error, type: 'error', timeout:5000});
      }
    })
    .always(function(){
      notyInst.close();
    })
  }
}

_.extend(RoleManagement.prototype, prototype);
module.exports = RoleManagement;
/**
RoleManagement module end
*/
