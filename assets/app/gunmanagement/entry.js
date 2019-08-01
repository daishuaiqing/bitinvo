/**
Gun Management module Start
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

var list = require('list');

var gridCell = require('./gridcell.jade');

var typeListCell = require('./typelistcell.jade');
var cabinetListCell = require('./cabinetlist.jade');
var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var server = require('common/server.js').server;

var keypad = require('keypad');

var searchbox = require('searchbox');

var GunManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('GunManagement has been created');
  return this;
}

var metadata =  {
  NS : 'gunmanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/gun'
}

_.extend(GunManagement, metadata);

var prototype = {
  init : function (){
    log.info('init GunManagement entry');
    this.backBtnFnArray = [];
    this.Global = {};
  },
  destroy: function(cb){
    sessionStorage.removeItem('detailData');
    $('#noty_topRight_layout_container').remove();
    this.$node.find('.has-keyboard').keypad('destroy');
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
    .off('state.change.after')
    .on('state.change.after', function (e, curr) {
    });

    // ========= create main html section
    $node.append(jade({
      i18n: __("gunmanagement"),
      i18nButton: __("buttonText")
    }));

    // ========= create search-cont

    $node.find('.search-cont').searchbox('show', {
      url: '/gun?populate=type',
      searchKey:'name',
      searchTip: __('gunmanagement').searchByGun,
      gridCell : gridCell
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, AppId, $node){
          //搜索结果点击进入某个gridllist详情
        var cabinetName = $cell.data('cabinetname');
        var asbname = $cell.data('asbname');
        var typeId = $cell.data('type');
        me.ASSOCIATED_BULLET_MODULE_ON_CABINET_NAME = cabinetName;
        me.ASSOCIATED_BULLET_MODULE_NAME = asbname;
        me.GUNTYPE = typeId;
        me.GUNID = AppId;
        me.editCab(AppId);
      })
      .on('searchComponentDeleteGridlist', function(event, AppId, $node){
        //搜索结果删除某个gridlist
        me.deleteGun($node, {id: AppId});
      });


    // ========= create edit cont
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('gunmanagement'),
      i18nButton: __('buttonText')
    }));

    // ========= create bread crumbs
    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __('gunmanagement').gunManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('gunmanagement').gunList,
          target: 'javascript:void(0)'
        },
        {
          name: __('gunmanagement').gunDetail,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    $node.pagestate('setState', 0);

    //==========  put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    // 添加返回按钮默认的回调
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
        case 'gun-list' :
          me.nav('/m/gunmanagement');
          $node.pagestate('setState', 0);
          break;
        case 'gun-type-list' :
          _.delay(function(){me.nav('/m/guntypemanagement')}, 300);
          break;
      }
    })
    .vMenu('show',
      0,
      [
        {
          name: __('gunmanagement').gunList,
          target: '#list',
          id: 'gun-list',
          clsName: 'vlink'
        },
         {
           name: __('gunmanagement').gunTypeManage,
           target: '#typelist',
           id: 'gun-type-list',
           clsName: 'vlink'
         }
      ],
      true//clickable
    );

    //Create paging
    $node.find('.paging-btn-box')
    .paging('show');

    //========== Create gridlit ============
    $node.find('.gun-list')
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
            me.deleteGun($node, {id: appId});
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
      var $cell = $(e.currentTarget);
      var id = $cell.data('id');
      var typeId = $cell.data('type');
      var cabinetName = $cell.data('cabinetname');
      var asbname = $cell.data('asbname');

      me.ASSOCIATED_BULLET_MODULE_ON_CABINET_NAME = cabinetName;
      me.ASSOCIATED_BULLET_MODULE_NAME = asbname;
      me.GUNTYPE = typeId;
      me.GUNID = id;
      me.editCab(id);
      //进入详情页，添加返回按钮的回调函数
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      })
    })
    .on('afterUpdate', function(){
      log.debug('after update list');
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
        url : '/gun/list'
      },
      dataHandler: function(data) {
        _.map(data, function(item) {
          var oldValue = item.name;
          var newValue = Number(item.name);
          if (_.isNaN(newValue)) {
            newValue = oldValue;
          }
          item.name = newValue;
          return item;
        });
        data.sort(function(a, b){
          return a.name - b.name;
        });
        return data;
      },
      innerTpl: function(data){
        _.merge(data, {
          moment : moment,
          i18n: __('gunmanagement')
        });
        return gridCell(data);
      }, // A compiled jade template,
      renderFn : null // How to render body
    })
    .gridlist(
      'show'
    );

    //========== Create taskbar ============
    var actions = [
      {
        name : __('buttonText').cancelBtn,
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(1);
        }
      },
      {
        id: 'addBtn',
        name : __('buttonText').addBtn,
        target: function(e){
          e.preventDefault();
          if (!me.getLocalCabinetInfo()) {
            return noty({text: '非主机不可编辑', type: 'info', layout: 'top', timeout: 3000});
          }
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
          sessionStorage.setItem('detailData','add');
          $editform.find('.radio3').removeClass('disabled');
          $editform.find('.associatedGunBox').addClass('hide');
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
        getCabinet: function() {
          me.renderCabinetList(function(cabinetObject) {
            var cabinetId = cabinetObject.id;
            var url = '/gun/list?cabinetId=' + cabinetId;
            // 记录选择的估计
            me.Global.selectedCabinet = cabinetId;
            $node.find('.gun-list').gridlist('fetch', null, null, null, null, url, true);
          })
        },
        refresh : function(){
          log.debug('refresh');
          $node.find('.gun-list').gridlist('refresh');
        },
        prev : function(){
          $node.find('.gun-list').gridlist('prev');
        },
        next : function(){
          $node.find('.gun-list').gridlist('next');
        },
        resetAB: function() {
          me.resetAB();
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })


    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('.big-btn-cont'), ['waves-block']);
    // waves.init();

    me.addKeyboard($node);

    cb();
  },
  resetAB: function() {
    var me = this;
    server({
      url: '/gun/initABGun'
    })
    .done(function() {
      noty({
        text: '重置AB枪状态成功',
        type: 'success',
        layout: 'topRight',
        timeout: 2000
      });
    })
    .fail(function(e) {
      noty({
        text: '重置AB枪状态失败',
        type: 'error',
        layout: 'top',
        timeout: 2000
      });
    });
  },
  getLocalCabinetInfo: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      setting = JSON.parse(setting);
      return setting.isMaster;
    } else {
      return false;
    }
  },
  renderCabinetList: function(callback) {
    var $node = this.$node;
    var $modal = $('<div/>').appendTo($node);
      $modal.flexmodal()
      .on('show.bs.modal', function(e) {
        var $targetNode = $(e.target);
        var $list = $targetNode.find('.type-list')
          .on('click', 'li', function(e) {
            var $target = $(e.currentTarget);
            var cabinetId = $target.data('cabinet');
            var name = $target.data('name');

            callback && callback({
              id: cabinetId,
              name: name
            });
            $modal.flexmodal('modalHide');
          })
          .list({
            source: {
              url: '/cabinet/list?needLocal=true'
            },
            innerTpl: function(data) {
              return cabinetListCell(data);
            },
            renderFn: null
          });
          $list.list('show');
      });
      $modal.flexmodal('show',
        {
          modalTitle: '请选择柜机'
        },
        require('./typelist.jade')
      );
  },
  renderBulletModule: function(cabinetId, callback) {
    var $node = this.$node;
    var $modal = $('<div/>').appendTo($node);
    var me = this;
    me.curr_bullet_module_data = [];

    $modal.flexmodal()
    .on('hide.bs.modal', function() {
      me.curr_bullet_module_data = [];
    })
    .on('show.bs.modal', function(e) {
      var $targetNode = $(e.target);
      var $list = $targetNode.find('.type-list')
      .on('click', 'li', function(e) {
        var $target = $(e.currentTarget);
        callback && callback($target);
        $modal.flexmodal('modalHide');
      })
      .on('click', '.more-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $target = $(e.currentTarget);
        var id = $target.data('id');
        var data = [];

        _.each(me.curr_bullet_module_data, function(item, index) {
          if (item.id === id) {
            if (item.bindInfo) {
              data = item.bindInfo;
            }
          }
        });
        me.renderSomeBindInfo(data);
      })
      .list({
        source: {
          url: '/cabinetmodule/associatedBulletsModules?cabinet=' + cabinetId + '&gunType=' + me.GUNTYPE
        },
        innerTpl: function(data) {
          // 记录当前渲染的模块数据
          me.curr_bullet_module_data.push(data);
          return require('./bulletModule.jade')(data);
        },
        renderFn: null
      });
      $list.list('show');
    });
    $modal.flexmodal('show', {
      modalTitle: '请关联弹仓'
    }, require('./typelist.jade'))
  },
  renderSomeBindInfo: function(data) {
    var $node = this.$node;
    var $modal = $("<div class='tb' />").appendTo($node);
    var me = this;
    
    

    $modal.flexmodal()
    .on('show.bs.modal', function(e) {
      $modal.find('.modal-dialog').width(800);
      var $nodeBox = $modal.find('.type-list');
      var ul = '';
      var li = '';
      _.each(data, function(item) {
        li += '<li style="padding:10px 0;">' + '柜机:' + item.cName + ' / ' + '枪支:' + item.gName + '</li>';
      });
      ul = '<ul>' + li + '</ul>';
      $nodeBox.html(ul);
      // $modal.flexmodal('modalHide');
    });
    $modal.flexmodal('show', {
      modalTitle: '关联模块信息'
    }, require('./typelist.jade'))
  },
  addKeyboard : function($node){
    var me = this;
    $node.find('input.has-keyboard-number').keypad('init', {
      type: 'IP'
    });
    $node.find('input.has-keyboard-all').keypad('init');
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
      log.debug('#############sumit data', data);
      me.submitGun(data);
    })
    .formwork('init');
  },
  editCab : function(AppId){
    var $node = this.$node;
    var notyInst = null;
    server({
      url: metadata.endpoint + '?populate=type,cabinetModule,associatedGun',
      data: {id : AppId},
      beforeSend: function(){
        notyInst = noty({text: '加载..', layout: 'topRight'});
      }
    })
    .done(function(data){
      log.debug(data);
      var $editform = $node.find('form'),
        hasGun = '';
      _.isNull(data.user) ? hasGun = 'noGun' : hasGun = data.user;
      sessionStorage.setItem('detailData', hasGun);
      $editform.formwork('refresh', data);
      $node.pagestate('setState', 1);
      if (data.cabinetModule.length > 0) {
        $node.find('.storage-status_radio__group .radio3').addClass('disabled');
      }
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    });
  },
  deleteGun : function($node, data){
    log.debug('Delete New Gun');
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
      // dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      log.debug(data);
      noty({text: '删除成功', type: 'success', timeout:5000, layout: 'topRight'});
      $node.parents('.grid-list-cell-holder').remove();
      me.$node.find('.gun-list').gridlist('refresh');
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    })
  },
  submitGun : function(data){
    log.debug('Create New Gun');
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
      data: _(data)
        // .omitBy(_.isUndefined)
        // .omitBy(_.isNull)
        // .omitBy(function(v){return !_.isBoolean(v) && _.isEmpty(v);})
        .omit('id').value(),
      // dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    }).done(function(){
      var msg = data.id ? '更新成功' : '创建成功';
      noty({text: msg, type: 'success', timeout:5000, layout: 'topRight'});
      me.$node.find('.gun-list')
      .gridlist(
        'refresh'
      );
      me.backBtnFnArray.splice(1);
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      console.log('提交失败', err);
    })
    .always(function(){
      notyInst.close();
    })
  },
  formatAssociatedBulletModule: function() {
    var me = this;
    var cabinetName = me.ASSOCIATED_BULLET_MODULE_ON_CABINET_NAME;
    var moduleName = me.ASSOCIATED_BULLET_MODULE_NAME;

    return '柜机: ' + (cabinetName ? cabinetName: '-') + ' / 模块: ' + (moduleName ? moduleName : '-');
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
              log.debug('Title invalid');
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
            if($(this).val() === ''){
              log.debug('Code invalid');
              return '枪支编号不能为空';
            }else{
              return null;
            }
          }
        },
        '#cert': {
          name: 'cert',
          validate: function () {
            if ($(this).val() === '') {
              return '枪证不能为空';
            } else {
              null;
            }
          }
        },
        '#associatedGunText': {
          name: 'associatedGunText',
          exclude: true,
          init : function(){
            var $clearBtn = $editform.find('#associatedGunTextClearBtn');
            var $modal = $('<div/>').appendTo($node)
            .flexmodal()
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug("Open Selection ");
              var $node = $(e.target);
              var $list = $node.find('.type-list').empty().off()
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget);
                $modal.flexmodal('modalHide');
                var typeId = $node.data('id');
                var typeName = $node.data('name');
                if(typeId){
                  $editform.find('#associatedGunText').val(typeName);
                  $editform.find('#associatedGun').val(typeId);
                  $clearBtn.removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url: '/gun/associateList?gunId=' + me.GUNID + '&cabinet=' + (me.Global ? me.Global.selectedCabinet: null)
                },
                limit: 5,
                innerTpl: require('./typelistcell_2.jade'), // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $clearBtn.off('click')
            .on('click', function () {
              $editform.find('#associatedGunText').val('');
              $editform.find('#associatedGun').val('');
              $(this).addClass('hide');
            })

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择关联枪支'
                },
                require('./typelist.jade')
              );
            });
          },
          refresh: function(value, data) {

            me.$node.find('.associatedGunBox').removeClass('hide');
         
            if (data && data.associatedGun) {
              $(this).val(data.associatedGun.name);
              $editform.find('#associatedGunTextClearBtn').removeClass('hide');
            } else {
              $(this).val('');
              $editform.find('#associatedGunTextClearBtn').addClass('hide')
            }
          },
          val: function() {
            var val = $(this).val() || '';
            return val;
          }
        },
        '#associatedGun': {
          name: 'associatedGun',
          refresh: function(value, data) {
            if (data && data.associatedGun) {
              $(this).val(data.associatedGun.id);
            }  else {
              $(this).val('');
            }
          },
          val: function (value, data) {
            if ($(this).val()) {
              return $(this).val();
            } else {
              return null;
            }
          }
        },
        '#associatedBulletModuleText': {
          name: 'associatedBulletModuleText',
          exclude: true,
          init: function() {
            $(this).off('click').on('click', function() {
              me.renderCabinetList(function (cabinet) {
                var cabinetId = cabinet.id;
                me.ASSOCIATED_BULLET_MODULE_ON_CABINET_NAME = cabinet.name;
                me.renderBulletModule(cabinetId, function($target) {
                  var bulletModuleId = $target.data('id');
                  var bulletName = $target.data('name');
                  me.ASSOCIATED_BULLET_MODULE_NAME = bulletName;
                  var text = me.formatAssociatedBulletModule();
                  me.$node.find('#associatedBulletModuleText').val(text);
                  me.$node.find('#associatedBulletModule').val(bulletModuleId);
                  me.$node.find('#associatedBulletModuleTextClearBtn').removeClass('hide');
                });
              });
            });
            me.$node.find('#associatedBulletModuleTextClearBtn')
            .off('click')
            .on('click', function() {
              me.$node.find('#associatedBulletModuleText').val('');
              me.$node.find('#associatedBulletModule').val('');
            });
          }
        },
        '#associatedBulletModule': {
          name: 'associatedBulletModule',
          refresh: function(value, data) {
            var id = value;
            if (id) {
              var text = me.formatAssociatedBulletModule();
              me.$node.find('#associatedBulletModuleText').val(text);
              me.$node.find('#associatedBulletModule').val(id);
              me.$node.find('#associatedBulletModuleTextClearBtn').removeClass('hide');
            } else {
              me.$node.find('#associatedBulletModule').val('');
              me.$node.find('#associatedBulletModuleText').val('');
              me.$node.find('#associatedBulletModuleTextClearBtn').addClass('hide');
            }
          }
        },
        '#typeText': {
          name: 'typeText',
          exclude : true,
          init : function(){
            var $clearBtn = $editform.find('#typeTextClearBtn');
            var $modal = $('<div/>').appendTo($node)
            .flexmodal()
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug("Open Selection ");
              var $node = $(e.target);
              var $list = $node.find('.type-list').empty().off()
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget);
                log.debug($node);
                $modal.flexmodal('modalHide');
                var typeId = $node.data('id');
                var typeName = $node.data('name');
                if(typeId){
                  $editform.find('#typeText').val(typeName);
                  $editform.find('#type').val(typeId);
                  $clearBtn.removeClass('hide');
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
            });

            $clearBtn.off('click')
            .on('click', function () {
              $editform.find('#typeText').val('');
              $editform.find('#type').val('');
              $(this).addClass('hide');
            })

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
            if(data && data.type) {
              $(this).val(data.type.name);
              $editform.find('#typeTextClearBtn').removeClass('hide');
            } else {
              $editform.find('#typeTextClearBtn').addClass('hide')
            }
          }
        },
        '#type': {
          name: 'type',
          validate : function(){
            if($(this).val() === ''){
              log.debug('Type invalid');
              return '类型不能为空';
            }else{
              return null;
            }
          },
          refresh: function(value, data){
            if(data && data.type)
              $(this).val(data.type.id);
          },
          val : function(value, data){
            if($(this).val()){
              return $(this).val();
            }else{
              return null;
            }
          }
        },
        '#lastMaintainDate': {
          name: 'lastMaintainDate',
          init: function(){
            var $me = $(this);
            var objID = $me.attr('id');
            var $clearButton = $editform.find('#lastMaintainDateClearBtn');
            var $modal = $('<div class="' + objID + '">').appendTo($node)
            .flexmodal({IsSureBtn: true})
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug($me.val())
              if($me.val()){
                var defaultDate = moment($me.val());
                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    sideBySide: true,
                    inline: true,
                    maxDate: new Date(),
                    defaultDate: defaultDate
                  });
              }else{
                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    sideBySide: true,
                    inline: true,
                    maxDate: new Date(),
                    defaultDate: new Date()
                  });
              }
            })
            .on('onOk', function(){
              var timeValue = $modal.find('.time-box').data().date;
              $me.val(timeValue);
              $modal.flexmodal('modalHide');
              $clearButton.removeClass('hide');
            });

            $clearButton
            .off('click')
            .on('click', function () {
              $('#lastMaintainDate').val('');
              $(this).addClass('hide');
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
            $editform.find('#lastMaintainDateClearBtn').removeClass('hide');
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('Type invalid');
              return '上次保养日期不能为空';
            }else{
              return null;
            }
          }
        },
        '#maintainInterval': {
          name: 'maintainInterval',
          validate : function(){
            var $meVal = $(this).val();
            if($meVal === ''){
              log.debug('Type invalid');
              return '保养周期不能为空';
            }else if(Number($meVal) <= 0){
              return '保养周期不合理';
            }else if(isNaN(Number($meVal))){
              return '保养周期必须为数值';
            }else if(Number($meVal) % 1 !== 0){
              return '保养周期必须为正整数';
            }else{
              return null;
            }
          }
        },
        '[name="storageStatus"]': {
          name: 'storageStatus',
          init : function(){
            $(this).on('click', function(e){
              console.log('kkkk')
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
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('Status invalid');
              return '状态不能为空';
            }else{
              return null;
            }
          }
        },
        '[name="gunStatus"]': {
          name: 'gunStatus',
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
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('Status invalid');
              return '状态不能为空';
            }else{
              return null;
            }
          }
        },
        '#isDisabled' : {
          name: 'isDisabled',
          refresh: function(value, data){
              if(value){
                $(this).prop('checked', 'checked').attr('checked', 'checked');
              }else{
                $(this).prop('checked', null).attr('checked', null);
              }
          },
          val : function(value, data){
            if($(this).prop('checked')){
              return true;
            }else{
              return false;
            }
          }
        },
        '#isPublic': {
          name: 'isPublic',
          refresh: function(value, data){
              if(value){
                $(this).prop('checked', 'checked').attr('checked', 'checked');
              }else{
                $(this).prop('checked', null).attr('checked', null);
              }
          },
          validate : function(){
            var detailData = sessionStorage.getItem('detailData');
            if($(this).val() === ''){
              log.debug('Status invalid');
              return '状态不能为空';
            }else if(!(detailData === 'add' || detailData === 'noGun') && $(this).prop('checked') == true){
              log.debug('This Gun Has Been Private Gun');
              return '该枪已分配，无法作为公用枪';
            }else{
              return null;
            }
          },
          val : function(value, data){
            if($(this).prop('checked')){
              return true;
            }else{
              return false;
            }
          }
        },
        '#notes': {
          name: 'notes',
          validate : function(){
            return null;
          }
        }
      }
    };
    return config;
  }
}

_.extend(GunManagement.prototype, prototype);
module.exports = GunManagement;
/**
Gun Management module end
*/
