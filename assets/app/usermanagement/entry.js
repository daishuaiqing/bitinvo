/**
User management module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");

var animateCss = require("animate.css");

// var waves = require("waves");
// var wavecsss = require("waves/src/less/waves.less");

var checkbox3 = require('checkbox3/dist/checkbox3.css');
var font = require('fontawesome/less/font-awesome.less');
var datepicker = require('datetimepicker');
var jade = require("./index.jade");
var css = require("../common/less/base.less");
var i18n = require('locales/zh-CN.json');

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

var typeList = require('./typelist.jade');

var gridCell = require('./gridcell.jade');

var typeListCell = require('./typelistcell.jade');

var superiorListCell = require('./superiorlistcell.jade');

var posCell = require('./poscell.jade');

var edit = require('./edit.jade');

var userInfoDetaile = require('./userInfoDetaile.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var server = require('common/server.js').server;

var weaponsnumber = require('weaponsnumber');

var dg = require("datagrid");

var violationslog = require('violationslog');
var identitycheck = require('identitycheck');

var keypad = require('keypad');

var searchbox = require('searchbox');

var UserManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('UserManagement has been created %s', this.getIId());
  return this;
}

var metadata =  {
  NS : 'usermanagement',
  pub : [

  ],
  sub : [],
  endpoint: '/user'
}

var prototype = {
  init : function (){
      log.info('init UserManagement entry');
      this.currentStep = 0;
      var me = this;
      me.backBtnFnArray = [];
      // 记录老的alias
      me.oldAlias = null;
  },
  destroy: function(cb){
    this.$node.find('#open-id-card-plugin').identityCheck('destroy');
    this.$node.find('.has-keyboard').keypad('destroy');
    $('#noty_topRight_layout_container').remove();
    $('object').remove();
    cb()
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
          '.user-info'
        ],
        3 : [
          '.search-cont'
        ]
      }
    })

    // .on('state.change.after', function(e, status){
    //
    // });

    // create html frame
    $node.append(jade({
      i18nButton: __('buttonText'),
      i18n: __('usermanagement')
    }));
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('usermanagement').form,
      i18nButton: __('buttonText')
    }));
    $node.find('.user-info').hide().append(userInfoDetaile);

    me.$node.find('.breadcrumbs-one_cont').breadcrumbs('show',
      2,
      [
        {
          name: __('usermanagement').userManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('usermanagement').userInfoManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('usermanagement').userLog,
          target: 'javascript:void(0)'
        }
      ],
      false
    );
    me.$node.find('.breadcrumbs-two_cont').breadcrumbs('show',
      2,
      [
        {
          name: __('usermanagement').userManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('usermanagement').userInfoManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('usermanagement').userInfoDetaile,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    // put modules to frame
    $node.find('.usermanagement-comp-clock').easyClock();
    // 插入一个默认的返回函数
    me.backBtnFnArray.push(function () {
      me.nav('/m/userhome');
    });
    $node.find('.usermanagement-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.usermanagement-action-bar').actionBar('show');

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
      0,
      [
        {
          name: __('usermanagement').userInfoManage,
          target: '#list',
          id: 'user-list',
          clsName: 'vlink'
        },
        {
          name: __('usermanagement').dutyshiftmanagement,
          target: '#dutyshiftlist',
          id: 'dutyshift-list',
          clsName: 'vlink'
        },
        {
          name: __('usermanagement').rolemanagement,
          target: '#rolelist',
          id: 'role-list',
          clsName: 'vlink'
        },
        {
          name: __('usermanagement').positionmanagement,
          target: '#poslist',
          id: 'pos-list',
          clsName: 'vlink'
        }
      ],
      true//clickable
    );

    /*
    * create search-cont××××××××××××××××××××××××××
    */
    var isSuperAdmin = me.checkedSuperAdmin();

    $node.find('.search-cont').searchbox('show', {
      url: '/user?populate=roles,guns',
      gridCell : gridCell,
      gridCellData: {
        isSuperAdmin: isSuperAdmin
      },
      searchTip: '根据用户名搜索',
      searchKey:'username',
      searchUsername: true
    });
    $node.find('.search-cont')
      .on('searchComponentDisable', function(event, userId, $node){
        me.updateApp($node, userId, {status: 'deactive'});
      })
      .on('searchComponentDeleteGridlist', function(e, userId, $node) {
        
        e.preventDefault();
        e.stopPropagation();
        me.adminAuth(function () {
          me.server({
            url: '/user/' + userId,
            method: 'DELETE'
          })
            .done(function () {
              $node.parents('.grid-list-cell-holder').remove();
              noty({ text: '删除成功', type: 'success', layout: 'top', timeout: 3000 });
            })
            .fail(function () {
              noty({ text: '删除操作失败', type: 'error', layout: 'top', timeout: 3000 });
            })
        })
      })
      .on('searchComponentEnable', function(event, userId, $node){
        me.updateApp($node, userId, {status: 'deactive'});
      })
      .on("searchComponentUpdateGridlist", function(event, userId, $node){
        me.userInfoDetaile(userId);
      });

    console.log(this.user, isSuperAdmin, '######## 当前用户的权限 ########');

    var girdlistURL = metadata.endpoint + '?populate=roles,guns&where={"isDummy": false, "username": {"!": ["8888","9999"]}}';

    // // 超级管理员可见创建用户
    if (!isSuperAdmin) {
      me.$node.find('button[name="add"]').addClass('hide');
      me.$node.find('#roleText').attr('readonly','readonly').addClass('read-only');
      me.$node.find("#roleText").siblings('#roleClearBtn').remove();
    } else {
      // 显示8888 9999
      girdlistURL = metadata.endpoint + '?populate=roles,guns&where={"isDummy": false}';
    }

    //Create paging
    $node.find('.paging-btn-box')
    .paging('show');


    $node.find('.list-cont')
    .gridlist({
      source: {
        url: girdlistURL,
        data: 'data'
      },
      sort: JSON.stringify({
        "createdAt" : "DESC"
      }),
      innerTpl: function(data){
        _.merge(data, {moment : moment, isSuperAdmin: isSuperAdmin});
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
      $node.find('.paging-btn-box')
      .paging('refresh', skip, total, limit);
    })
    .gridlist(
      'show'
    );

    $node.find('.list-cont')
    .on('click', '.disable-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var userId = $(this).parents('.grid-list-cell').data('id');
      log.debug('Delete User with id %s', userId);
      me.updateApp($node, userId, {status: 'deactive'});
    })
    .on('click', '.edit-button', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var userId = $(this).parents('.grid-list-cell').data('id');
      me.editUser($node, userId);
    })
    .on('click', '.enable-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var userId = $(this).parents('.grid-list-cell').data('id');
      log.debug('Delete User with id %s', userId);
      me.updateApp($node, userId, {status: 'active'});
    })
    .on('click', '.remove-button', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var userId = $(this).parents('.grid-list-cell').data('id');
      me.adminAuth(function() {
        me.server({
          url: '/user/' + userId,
          method: 'DELETE'
        })
        .done(function() {
          me.$node.find('.list-cont').gridlist('refresh');
          noty({text: '删除成功', type: 'success', layout: 'top', timeout: 3000});
        })
        .fail(function(){
          noty({text: '删除操作失败', type: 'error', layout: 'top', timeout: 3000});
        })
      })
    })
    .on('click', '.grid-list-cell', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var userId = $node.data('id');
      log.debug('Update Status to APPROVED app %s', userId);

      // me.editUser($node, userId);
      me.userInfoDetaile(userId);

      var name = $node.find('.user-name').text();
      me.$node.find('.breadcrumbs-one_cont .active').text(name + '人员日志');
      // 进入了人员日志详情，添加返回回调
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      })
    });
    var actions = [
      {
        name: '重置密码',
        target: function(e){
          e.preventDefault();
          me.adminAuth(function() {
            var username = $node.find('#username').val();
            me.resetPassword(username);
          });
        },
        id: 'resetPassword_button'
      },
      {
        name : '取消',
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(1);
        }
      },
      {
        id: 'addBtn',
        name : '添加',
        target: function(e){
          e.preventDefault();
          // me.$node.find('#addBtn').addClass('disabled');
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
          var $editform = $node.find('form');
          $editform.formwork('clear');
          $node.pagestate('setState', 1);
          $node.find('#resetPassword_button').addClass('hide');
          me.backBtnFnArray.push(function () {
            $node.pagestate('setState', 0);
          })
        },
        search: function(){
          $node.pagestate('setState', 3);
          me.backBtnFnArray.push(function () {
            $node.pagestate('setState', 0);
          })
        },
        refresh : function(){
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
    // $node.pagestate('setState', 0);
    $node.pagestate('init')
    $node.find('#open-id-card-plugin')
    .on('getIdCardInfoSuccess', function(event, userIdCardInfo){
      noty({text: '扫描成功', type: 'success', layout: 'topRight', timeout:3000});
      $node.find('#identityNumber').val(userIdCardInfo.certNumber);
    })
    .on('getIdCardInfoError', function(event, error){
      noty({text: error, type: 'error', layout: 'top', timeout:3000});
    })
    .identityCheck('show');

    $node.find('.has-keypad').keypad('init', {
      type: 'IP',
      showPosition: 'left'
    });
    $node.find('.has-keypad-all').keypad('init', {
      PinYinID: 'alias'
    });

    cb();
  },
  resetPassword: function(username){
    server({
      url: '/auth/restore',
      method: 'POST',
      data: {"username": username}
    })
    .done(function(data){
      if(data.newpassword){
        noty({text: '密码重置成功！重置后的密码是:' + data.newpassword, type:'success', layout: 'top', timeout: 7000});
      }else{
        noty({text: '重置失败请重试', type: 'error', layout: 'top'});
      }
    })
    .fail(function(data){
      if(data.status === 400){
        noty({text: data, type: 'error', layout: 'top'});
      }else{
        noty({text: '服务器出错', type: 'error', layout: 'top'});
      }
    })
  },
  initFormwork: function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    me.formwork = $editform.formwork({
      namespace : metadata.NS, //use current comp's name as namespace
      fields : {
        '#roleText': {
          name: 'roleText',
          exclude : true,
          init : function(){
            var renderFn = function(item, innerTpl){
              item.title = '角色名称';
              return innerTpl(item)
            }
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
                if(id){
                  $editform.find('#roleText').val(name);
                  $editform.find('#roles').val(id);
                  $editform.find('#roleClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/role?where={"name": {"!": "超级管理员"}}'
                },
                limit: 5,
                innerTpl: typeListCell, // A compiled jade template,
                renderFn : renderFn// How to render body
              });
              $list.list('show', null, null, renderFn);
            });

            $node.on('click', '#roleClearBtn', function(e){
              e.preventDefault();
              $editform.find('#roleText').val(null);
              $editform.find('#roles').val(null);
              $editform.find('#roleClearBtn').addClass('hide');
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择类型'
                },
                typeList
              );
            });
          },
          refresh: function(value, data){
            if(data && data.roles && data.roles.length > 0){
              var roleNames = _.map(data.roles, function(r){
                return r.name;
              })
              $(this).val(roleNames.join());
              $editform.find('#roleClearBtn').removeClass('hide');
            }else{
              $(this).val(null);
              $editform.find('#roleClearBtn').addClass('hide');
            }
          }
        },
        '#roles': {
          name: 'roles',
          refresh: function(value, data){
            if(data && data.roles){
              var roleIds = _.map(data.roles, function(r){
                return r.id;
              })
              $(this).val(roleIds.join());
            }
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('Type invalid');
              return '类型不能为空';
            }else{
              return null;
            }
          },
          val : function(orginalValue, data){
            if($(this).val()){
              return [$(this).val()];
            }else{
              return null;
            }
          }
        },
        '#gunText': {
          name: 'gunText',
          exclude : true,
          init : function(){
            var  renderFn = function(item, innerTpl){
              item.title = '枪械名称';
              return innerTpl(item)
            }; // How to render body
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
                if(id){
                  $editform.find('#gunText').val(name);
                  $editform.find('#guns').val(id);
                  $editform.find('#gunClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/gun?where={"isPublic":false,"user":null}'
                },
                limit: 5,
                innerTpl: typeListCell, // A compiled jade template,
                renderFn : renderFn
              });
              $list.list('show', null, null, renderFn);
            });

            $node.on('click', '#gunClearBtn', function(e){
              e.preventDefault();
              var gunId = $node.find('#guns').val();
              server({
                url: '/gun/' + gunId + '?user=null',
                type: "PUT"
              })
              .done(function(){
                $editform.find('#gunText').val(null);
                $editform.find('#guns').val(null);
                $editform.find('#gunClearBtn').addClass('hide');
              })
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择类型'
                },
                typeList
              );
            });
          },
          refresh: function(value, data){
            if(data && data.guns && data.guns.length > 0){
              var names = _.map(data.guns, function(r){
                return r.name;
              })
              $(this).val(names.join());
              $editform.find('#gunClearBtn').removeClass('hide');
            }else{
              $(this).val(null);
              $editform.find('#gunClearBtn').addClass('hide');
            }
          }
        },
        '#guns': {
          name: 'guns',
          refresh: function(value, data){
            if(data && data.guns){
              var ids = _.map(data.guns, function(r){
                return r.id;
              })
              $(this).val(ids.join());
            }
          },
          val : function(orginalValue, data){
            if($(this).val()){
              return [$(this).val()];
            }else{
              return null;
            }
          }
        },
        '#positionText': {
          name: 'positionText',
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
                if(id){
                  $editform.find('#positionText').val(name);
                  $editform.find('#position').val(id);
                  $editform.find('#positionClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/position'
                },
                limit: 5,
                innerTpl: posCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $node.on('click', '#positionClearBtn', function(e){
              e.preventDefault();
              $editform.find('#positionText').val(null);
              $editform.find('#position').val(null);
              $editform.find('#positionClearBtn').addClass('hide');
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择类型'
                },
                typeList
              );
            });
          },
          refresh: function(value, data){
            if(data && data.position){
              $(this).val(data.position.name);
              $editform.find('#positionClearBtn').removeClass('hide');
            }else{
              $(this).val(null);
              $editform.find('#positionClearBtn').addClass('hide');
            }
          }
        },
        '#position': {
          name: 'position',
          validate: function(){
            if(!$(this).val()){
              return '职位不能为空';
            }
          },
          refresh: function(value, data){
            if(data && data.position){
              $(this).val(data.position.id);
            }else{
              $(this).val(null);
            }
          }
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
                source: {
                  url : '/user/managers?id=' + (me.editingObj && me.editingObj.id)
                },
                limit: 5,
                innerTpl: superiorListCell, // A compiled jade template,
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
                  modalTitle : '请选择当前用户的上级领导'
                },
                typeList
              );
            });
          },
          refresh: function(value, data){
            if(data && data.superior){
              $(this).val(data.superior.alias ? data.superior.alias : data.superior.username);
              $('#superiorClearBtn').removeClass('hide');
            }else{
              $(this).val(null);
              $('#superiorClearBtn').addClass('hide');
            }
          }
        },
        '#superior': {
          name : 'superior',
          refresh: function(value, data){
            if(data && data.superior && data.superior.id)
              $(this).val(data.superior.id);
          }
        },
        '#username' : {
          name : 'username',
          refresh : function(value){
            $(this).val(value);
            $editform.find('#usernameText').text(value);
          },
          validate: function(){
            var $me = $(this);
            var userName = $me.val();
            var reg = /^[a-zA-Z0-9]\w{3,15}$/ig;
            if(!reg.test(userName)){
              return '用户名必须由数字或字母大于4位的字符';
            }else{
              return null;
            }
          }
        },
        '#alias': {
          name: 'alias',
          refresh: function(value, data) {
            $(this).val(value);
            me.oldAlias = value;
          }
        },
        '#disablePasswdLogin': {
          name: 'disablePasswdLogin',
          refresh: function(value, data){
            // 禁止密码登录
            if(value === 'yes'){
              $(this).prop('checked', 'checked').attr('checked', 'checked');
            }else {
              $(this).prop('checked', null).attr('checked', null);
            }
          },
          val : function(value, data){
            if($(this).prop('checked')){
              return 'yes';
            }else{
              return 'no';
            }
          }
        },
        '#email': {
          name: 'email'
        },
        '#age': {
          name: 'age',
          validate: function(){
            var $me = $(this);
            var age = Number($me.val());
            if($me.val()){
              if(!(age > 0 && age < 120)){
                return '请输入合理的年龄';
              }else{
                return null;
              }
            }else{
              return '请输入年龄';
            }
          }
        },
        '#phone' : {
          name: 'phone',
          validate : function(){
            var phone = $(this).val();
            if(!phone){
              return "请填写手机号码";
            }
          },
          refresh : function(value){
            $(this).val(value);
            $editform.find('#phone').text(value);
          }
        },
        '[name="sex"]': {
          name: 'sex',
          init : function(){
            $(this).on('click', function(e){
              $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
              $(this).attr("checked", 'checked').prop("checked", "checked");
            });
          },
          refresh: function(value, data){
            $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
            $(this).attr("checked", 'checked').prop("checked", "checked");
            if(value == 'M'){
              $('#male').attr("checked", 'checked').prop("checked", "checked");
            }
            else{
              $('#female').attr("checked", 'checked').prop("checked", "checked");
            }
          }
        },
        '[name="status"]': {
          name: 'status',
          init : function(){
            $(this).on('click', function(e){
              $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
              $(this).attr("checked", 'checked').prop("checked", "checked");
            });
          },
          refresh: function(value, data){
            $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
            $(this).attr("checked", 'checked').prop("checked", "checked");
            if(value){
              $('#' + value).attr("checked", 'checked').prop("checked", "checked");
            }
          }
        },
        '#id': {
          name: 'id'
        },
        '#identityNumber':{
          name: 'identityNumber',
          validate: function(){
            if(!$(this).val()){
              return '请输入证件号码';
            }
          }
        }
      }
    })
    .on(metadata.NS + '.form.validate.valid', function(e){
      log.debug('Handling form validate event valid');
      me.speak('another_admin_auth');
      me.adminAuth(function() {
        var $loginPanle = $('#login_panle');
        if($loginPanle.length > 0) {
          $loginPanle.remove();
        }
        $editform.formwork('submit');
      });
    })
    .on(metadata.NS + '.form.validate.error', function(e, errors){
      log.debug('Handling form validate event error');
      noty({text: __('Something is wrong').replace('%s', errors.join(',')), type: 'error', timeout:5000, layout: 'top'});
    })
    .on(metadata.NS + '.form.submit', function(e, data){
      me.submitUser(data);
    })
    .formwork('init');
  },
  userInfoDetaile: function(userId){
    var $node = this.$node;
    var me = this;
    $node.pagestate('setState', 2);
    $node.find('#log-table').datagrid('init', {
      url:"/optlog",
      data: {"ObjectId": userId},
      order: [[ 0, 'desc' ]],
      columns: [
        { title: 'ID', data : 'localId', width: '12%', orderable : false},
        { title: '日志', data : 'log', orderable: false},
        { title: '操作时间',
          data : function ( row, type, val, meta ) {
            var createdAt = moment(row.createdAt).locale('zh-cn').calendar(null, {
              sameElse: 'LLL'
            });
            return createdAt ? createdAt : '-';
          }
        }
      ],
    });


    if (me.checkIsShowGunBulletCountPanel()) {
      server({
        url : '/application/count?where={"status":"complete","flatType":"gun","applicant":"' + userId + '"}'
      }).done(function(gunCount){
        $node.find('.gun-count-box').weaponsNumber('show', {
          tipc: __('usermanagement').usingGunCount,
          count: gunCount.count
        });
      });

      server({
        url: '/application/count?where={"status":"complete", "flatType":"bullet", "applicant":"' + userId +'"}'
      }).done(function(bulletCount){
        $node.find('.bullet-count-box').weaponsNumber('show', {
          tipc: __('usermanagement').usingBulletCount,
          count: bulletCount.count
        });
      });
    } else {
      $node.find('.count-box').hide();
    }



    var actions = [
      {
        name : __('buttonText').cancelBtn,
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(me.backBtnFnArray.length - 1, 1);
        }
      },
      {
        name: __('usermanagement').lookUserInfo,
        target: function(e){
          me.editUser($node, userId);
          // 如果不是超级管理员就不显示密码修改
          if (!me.user.hasPermission('manage-system')) {
            $node.find('#resetPassword_button').addClass('hide');
            $node.find('.disable-passwd_login__box').addClass('hide');
          } else {
            $node.find('#resetPassword_button').removeClass('hide');
            $node.find('.disable-passwd_login__box').removeClass('hide');
          }
          //进入人员详情返回按钮，添加回调。
          me.backBtnFnArray.push(function () {
            me.userInfoDetaile(userId);
          })
        }
      }
    ];
    $node.find('.taskbar-user-detaile').taskbar('show', actions);

    ///加载违规操作组件
    me.renderViolationsLog(userId);

  },
  renderViolationsLog: function(userId) {
    this.$node.find('.violations-log-box').violationsLog({
        limit : 3
    }).violationsLog('show', {
      warningUrl: '/optlog?sort%5BlocalId%5D=DESC&where={"createdBy":"' + userId + '","logType":"warning"}' ,
      errorUrl: '/optlog?sort%5BlocalId%5D=DESC&where={"createdBy":"' + userId + '","logType":"error"}'
    });
  },
  editUser : function($node, id){
    var $node = this.$node;
    var me = this;
    var notyInst = null;
      server({
        url : metadata.endpoint + '?populate=roles,guns,position,superior',
        data: {id:id},
        beforeSend: function(){
          notyInst = noty({text: '加载..', layout: 'topRight'});
        }
      })
      .done(function(data){
        //为了防止上级领导选项框中出现同样的人
        me.editingObj = data;
        var $editform = $node.find('form');
        $editform.formwork('refresh', data);
        $node.pagestate('setState', 1);
      })
      .fail(function(err){
        log.debug('usermanagement editUser error', err);
      })
      .always(function(){
        notyInst.close();
      });
  },
  updateApp: function($node, id, data){
    log.debug('Update Application');
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
      noty({text: '修改成功', type: 'success', timeout:5000, layout: 'topRight'});
      me.$node.find('.list-cont')
      .gridlist(
        'refresh'
      );
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      if(err.responseJSON.error){
        noty({text: err.responseJSON.error, type: 'error', timeout:3000});
        me.$node.find('.list-cont')
        .gridlist(
          'refresh'
        );
        me.$node.pagestate('setState', 0);
      }else{
        noty({text: '更新失败', type: 'error', timeout:5000});
      }
    })
    .always(function(){
      notyInst.close();
    })
  },
  deleteUser : function($node, data){
    log.debug('Delete New user ');
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
      noty({text: '删除成功', type: 'success', timeout:5000, layout: 'topRight'});
      $node.parents('.grid-list-cell-holder').remove();
      me.$node.find('.list-cont').gridlist('refresh');
    })
    .fail(function(err){
      log.debug('usermanagement deleteUser error', err);
    })
    .always(function(){
      notyInst.close();
    })
  },
  checkAliasIsChange: function(data) {
    var me = this;
    if (me.oldAlias !== data.alias) {
      server({
        url: '/pinyin/updateuser?alias=' + data.alias
      })
      .fail(function(error) {
        console.log('This is request API:/pinyin/updateuser  fail', error)
      })
    }
  },
  checkIsShowGunBulletCountPanel: function() {
    var isShow = false;
    var systemSetData = window.localStorage.getItem('systemSetData');
    if (systemSetData) {
      try {
        systemSetData = JSON.parse(systemSetData);
        if (systemSetData && systemSetData.showCount) {
          isShow = true;
        } else {
          isShow = false;
        }
      } catch(e) {
        isShow = false;
      }
    };
    return isShow;
  },  
  submitUser : function(data){
    log.debug('Create New user ');
    if(!data) return;
    var me = this;
    var url = '';
    var method = '';
    var newUserData = {};
    if(data.id){
      url = metadata.endpoint + '/' + data.id;
      method = 'PUT';
    }else{
      // url = me.localCabinetIsMaster && metadata.endpoint || '/master' + metadata.endpoint + '/' + data.id;
      _.extend(newUserData, data);
      if(!newUserData.superior){
        delete newUserData.superior;
      }
      delete newUserData.id;
      data = newUserData;
      data.password = '123456';
      url = '/auth/signup';
      method = 'POST';
    }
    var notyInst = null;

    // me.checkAliasIsChange(data);

    server({
      url: url,
      method: method,
      data: data,
      beforeSend : function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    }).done(function(response){
      if(!data.id){
        noty({text: '创建成功', type: 'success', timeout: 2000, layout: 'topRight'});
        noty({text: '默认密码:123456', type: 'success', timeout:6000, layout: 'top'});
      }else{
        noty({text: '更改成功', type: 'success', timeout: 2000, layout: 'topRight'});
      }
      me.$node.find('.list-cont')
      .gridlist(
        'refresh'
      );
      me.backBtnFnArray.splice(1);
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      var error = null;
      if (err.status === 401) {
        error = JSON.parse(err.responseText).error;
        noty({text: error, type: 'error', timeout:1000, layout:'top'});
      } else {
        noty({text: err, type: 'error', layout:'top',  timeout: 1000});
      }
    })
    .always(function(){
      notyInst.close();
    })
  },
  adminAuth: function(cb) {
    var me = this;
    var $modal = $('<div id="login_panle"/>').appendTo(me.$node);
    $modal.flexmodal(
      {
        innerTpl: require('./adminLogin.jade'),
        modalBackdropRemove: true
      }
    )
    .off('shown.bs.modal')
    .on('shown.bs.modal'/*Bootstrap event*/, function(e){
      $modal.find('.modal-content').addClass('offset_100');
      $modal.find('.has-keyboard').keypad('init', {
        type: 'login_number',
        showPosition: 'left'
      });
      $modal.find('.login-btn')
      .off('click')
      .on('click', function() {
        var username = $modal.find('#username').val();
        var password = $modal.find('#password').val();
        me.adminlogin(username, password, function(data) {
          var roles = data.roles[0];
          var permissions = roles.permissions;
          var isSuccess = false;
          var adminId = data.id;
          _.each(permissions, function(item) {
            if (item === 'manage-system') {
              isSuccess = true;
              return true;
            }
          });

          if (isSuccess) {
            me.user.getUser()
            .done(function(currentUserInfo) {
              if (currentUserInfo.id === adminId) {
                noty({text: '不能给自己授权', type: 'error', layout: 'top', timeout: 3000});
              } else {
                noty({text: '验证成功', type: 'success', layout: 'topRight', timeout: 3000});
                $modal.flexmodal('modalHide');
                $modal.flexmodal('remove');
                $modal.remove();
                cb && (typeof cb === 'function') && cb();
              }
            })
            .fail(function() {
              noty({text: '获取当前用户信息失败!', type: 'error', layout: 'top', timeout: 3000});
            });

          } else {
            me.$node.find('#addBtn').removeClass('disabled');
            noty({text: '您不是超级管理员, 无法通过验证', type: 'error', layout: 'top', timeout: 3000});
          }
          
        });
      });
    })
    .off('hide.bs.modal')
    .on('hide.bs.modal', function(e) {
      $modal.find('.modal-content').removeClass('offset_100');
      $modal.find('.has-keyboard').keypad('destroy');
      me.$node.find('#addBtn').removeClass('disabled');
    });
    
    $modal.flexmodal('show', {
      modalTitle: '超级管理员验证'
    });   
  },
  adminlogin: function(username, password, fn) {
    var me = this,
        base64 = btoa(username + ":" + password),
        basicAuth = "Basic " + base64;
    $.ajax({
      url: '/auth/login',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      dataType: 'json',
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", basicAuth);
        xhr.setRequestHeader('userinfo', 'true');
      }
    })
    .done(function(data) {
      fn && (typeof fn === 'function') && fn(data);
    })
    .fail(function(err) {
      console.log('登录失败', err);
      if(err.status === 403){
        me.speak('login_fail');
        // print error;
        noty({text: err.responseJSON.error, type: 'error', layout: 'top', timeout:5000});
      }else{
        // print error;
        if(err && err.responseJSON)
          noty({text: err.responseJSON.error, type: 'error', layout: 'top', timeout:5000});
        else
          noty({text: '未知错误', type: 'error', layout: 'top', timeout:5000});
      }
    });
  },
  checkedSuperAdmin: function() {
    return this.user.hasPermission('manage-system');
  }
}

_.extend(UserManagement, metadata);
_.extend(UserManagement.prototype, prototype);
module.exports = UserManagement;
/**
User management module end
*/
