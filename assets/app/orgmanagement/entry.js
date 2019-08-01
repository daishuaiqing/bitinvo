/**
OrgManagement module Start
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

var vmenu = require('vmenu');

var taskbar = require('taskbar');
var backBtn = require('backbtn');

var gridlist = require('gridlist');
var paging = require('paging');

var list = require('list');

var gridCell = require('./gridcell.jade');
var typeListCell = require('./typelistcell.jade');
var orgCell = require('./orgcell.jade');
var differentdevice = require('differentdevice');

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var detailecell = require("./detailecell.jade");

var weaponsnumber = require('weaponsnumber');

var dg = require("datagrid");

var violationslog = require('violationslog');

var server = require('common/server.js').server;
var keypad = require('keypad');

var searchbox = require('searchbox');

var OrgManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('OrgManagement has been created');
  return this;
}

var metadata =  {
  NS : 'orgmanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/cabinet',
  secondEndpoint : '/org'
}

_.extend(OrgManagement, metadata);

var prototype = {
  init : function (){
    var me = this;
    log.info('init OrgManagement entry');
    // 定义一个返回按钮的回调数组
    me.backBtnFnArray = [];
    server({
      url : '/cabinet?populate=org&where={"isLocal": true}'
    }, true)
    .done(function(data){
      me.currentLocalCabinetIsMaster = data[0] && data[0].isMaster;
      me.currentLocalCabinetCode = data[0] && data[0].code;
    })
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
        ],
        3 : [
          '.detaile-cont'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(jade({
      i18nButton: __('buttonText')
    }));
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('orgmanagement').form,
      i18nButton: __('buttonText')
    }));
    $node.find('.detaile-cont').hide().append(detailecell);

    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __('orgmanagement').orgManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('orgmanagement').orgoverview,
          target: 'javascript:void(0)'
        },
        {
          name: __('orgmanagement').orgDetail,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    $node.pagestate('setState', 0);

    // put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    // 添加默认的返回按钮回调
    me.backBtnFnArray.push(function () {
      me.nav('/m/userhome');
    })
    $node.find('.appm-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.appm-action-bar').actionBar('show');

    $node.find('.leftmenu')
    .on('vmenu.afterChange', function(e, previous, next, originalEvent){
      originalEvent.preventDefault();
      var id = next.attr('id');
      switch(id){
        case 'app-list' :
          _.delay(function(){me.nav('/m/orgmanagement')}, 250);
        break;
        // case 'org-list' :
        //   _.delay(function(){me.nav('/m/orgdetail')}, 250);
        // break;
        // case 'app-type-list' :
        //    _.delay(function(){me.nav('/m/applicationtypemanagement')}, 250);
        //   break;
      }
    })
    .vMenu('show',
      0,
      [
        {
          name: __('orgmanagement').orgOverview,
          target: '#list',
          id: 'app-list',
          clsName: 'vlink'
        },
        // {name : '部门详情', target: '#orgdetail', id: 'org-list', clsName : 'vlink'},
        // {name : '申请类型管理', target: '#typelist', id: 'app-type-list', clsName : 'vlink'}
      ],
      true//clickable
    );

    /*
    * create search-cont
    */
    $node.find('.search-cont').searchbox('show', {
      url: '/org?populate=superior',
      searchKey:'name',
      gridCell : gridCell,
      isBagData: true,
      searchTip: __('orgmanagement').orgSearch
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, appId, $node){
          //搜索结果点击进入某个gridllist详情
        me.edit($node, appId);
      })
      .on('searchComponentDeleteGridlist', function(e, appId, $node){
        //搜索结果删除某个gridlist
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
                me.delete($node, { id: appId });
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



    //Create paging
    $node.find('.paging-btn-box')
    .paging('show');

    var url = metadata.secondEndpoint + '?populate=superior';
    me.getGridList(url);

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
            me.delete($node, {id: appId});
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
      var cabinetCode = $node.data('code');
      var isLocal = Boolean($node.data('local'));
      var isMaster = Boolean($node.data('master'));
      log.debug('Update Status to APPROVED app %s', appId);
      me.detaileCab($node, appId, cabinetCode, isLocal, isMaster);

      // 进入详情，添加返回按钮的回调函数
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      })
    });
    var actions = [
      {
        name : __('buttonText').cancelBtn,
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(1);
        }
      },
      {
        name : __('buttonText').addBtn,
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
          if(!me.currentLocalCabinetIsMaster){
            noty({text: '请用主机进行操作', layout: 'topRight', timeout: '3000', type: 'error'})
            return;
          }
          var $editform = $node.find('form');
          $editform.formwork('clear');
          $node.pagestate('setState', 1);
          $node.find('#resetPassword_button').addClass('hide');
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
        submitCab : function(){
          var $editform = $node.find('form');
          $editform.formwork('validate');
        },
        prev : function(){
          $node.find('.list-cont').gridlist('prev');
        },
        next : function(){
          $node.find('.list-cont').gridlist('next');
        },
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })

    me.renderViolationsLog();
    $node.find('.has-keypad').keypad('init', {
      type: 'IP'
    });
    $node.find('.has-keypad-all').keypad('init');
    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('.big-btn-cont'), ['waves-block']);
    // waves.init();
    //  $node.find('.different-device-box').differentDevice({
    //   'btnArray' : [
    //     {name : 'local', text: '本机构'},
    //     {name : 'specified', text: '指定机构'}
    //   ]
    // }).differentDevice('show');
    cb();
  },
  renderViolationsLog: function(userId) {
    this.$node.find('.violations-log-box').violationsLog({
        limit : 3
    }).violationsLog('show', {
      warningUrl: '/optlog?sort%5BlocalId%5D=DESC&where={"logType":"warning"}' ,
      errorUrl: '/optlog?sort%5BlocalId%5D=DESC&where={"logType":"error"}'
    });
  },
  getGridList: function(url){
    var me = this;
    var $node = me.$node;
    $node.find('.list-cont')
    .gridlist({
      source: {
        url : url,
        data: 'data'
      },
      sort: JSON.stringify({
        "createdAt" : "DESC"
      }),
      innerTpl: function(data){
        if(data.code === me.currentLocalCabinetCode){
          // data.name = "本地柜机";
          data.isLocal = true;
        }else{
          // data.name = "远程柜机";
          data.isLocal = false;
        }
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
      .paging('next', skip ,total, limit);
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
  },
  initFormwork: function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    me.formwork = $editform.formwork({
      namespace : metadata.NS, //use current comp's name as namespace
      fields : {
        '#name' : {
          name : 'name',
          validate: function(){
            if(_.trim($(this).val()) === ''){
              return '部门名称不能为空'
            }else{
              return null;
            }
          }
        },
        '#host': {
          name: 'host'
        },
        '#port': {
          name: 'port'
        },
        '#isLocal' : {
          name: 'isLocal',
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
        '#detail': {
          name: 'detail'
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
                  $('#superiorClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : metadata.secondEndpoint + '?populate=superior&sort={"createdAt":"DESC"}'
                },
                limit: 5,
                innerTpl : orgCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $node.on('click', '#superiorClearBtn', function(e){
              e.preventDefault();
              var $btn = $(e.currentTarget);
              $editform.find('#superiorText').val(null);
              $editform.find('#superior').val(null);
              $('#superiorClearBtn').addClass('hide');
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
      me.submit(data);
    })
    .formwork('init');
  },
  detaileCab : function($node, id, cabinetCode, isLocal, isMaster){
    var $node = this.$node;
    var me = this;
    server({
      url : '/remote/org/'.concat(id).concat('/org/').concat(id),
    })
    .done(function(data){
      log.debug("get usertoken");
      $node.pagestate('setState', 3);
      $node.find('#log-table').datagrid('init', {
        url:'/remote/org/'.concat(id).concat('/optlog'),
        data: {sort:{ createdAt: 'DESC'}},
        columns: [
          { title: 'ID', data : 'localId'},
          { title: '日志', data : 'log'},
          { title: '用户名称',
            data : function ( row, type, val, meta ) {
              // 'sort', 'type' and undefined all just use the integer
              var createdBy =  (row.createdBy && row.createdBy.alias) ? row.createdBy.alias : row.createdBy;
              return createdBy ? createdBy : '无';
            }
          },
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

      server({
        url : '/remote/org/' + id + '/cabinetmodule/countgun',
      }).done(function(gunCount){
        log.debug("###get gun count", typeof gunCount)
        if(Array.isArray(gunCount) && gunCount.length === 0){
          var gunCount = 0;
        }else{
          var gunCount = gunCount[0].load;
        }
        $node.find('.gun-count-box').weaponsNumber('show', {tipc: "拥有枪支数", count: gunCount});
      })
      .fail(function(err){
        noty({text: err.responseJSON.error,layout: 'top', timeout: 3000, type: 'error'});
        $node.find('.gun-count-box').weaponsNumber('show', {tipc: "拥有枪支数", count: ""});
      });
      server({
        url : '/remote/org/' + id + '/cabinetmodule/countbullet',
      }).done(function(bulletCount){
        if(Array.isArray(bulletCount) && bulletCount.length === 0){
          var bulletCount = 0;
        }else{
          var bulletCount = bulletCount[0].load;
        }
        $node.find('.bullet-count-box').weaponsNumber('show', {tipc: "拥有子弹数", count: bulletCount });
      })
      .fail(function(){
        $node.find('.bullet-count-box').weaponsNumber('show', {tipc: "拥有子弹数", count: "" });
      });
    })
    .fail(function(err){
      var text = '访问远程机构出现错误';
      if(err.responseJSON.error == 'No Avaliable Token'){
        text = '访问的远程柜机没有授权';
      }else if(err.responseJSON.error == 'No Avaliable Target'){
        text = '访问的远程柜机没有设置主机和端口';
      }
      noty({text: text,layout: 'top', timeout: 3000, type: 'error'});
      me.edit($node, id);
    })



    var actions = [
      {
        name : '取消',
        target: function(){
          $node.pagestate('setState', 0);
        }
      },
      {
        name : '机构信息',
        target: function(e){
          me.edit($node, id);
          $node.find('#resetPassword_button').removeClass('hide');
        }
      }
    ];

    $node.find('.taskbar-user-detaile').taskbar('show', actions);
  },
  edit : function($node, id){
    var $node = this.$node;
    var notyInst = null;
      server({
        url : metadata.secondEndpoint + '?populate=superior',
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
  delete : function($node, data){
    log.debug('Delete New Application');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = metadata.secondEndpoint,
      dataType = 'json';
    var notyInst = null;
    var id = data.id;

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
      server({
        url: '/remote/org/'+ id +'/org/unbound'
      }).done(function(data){
        log.debug('delete token success');
      });
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    })
  },
  submit : function(data){
    log.debug('Submit Org');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = '';
    var method = '';
    if(data.id){
      url = metadata.secondEndpoint + '/' + data.id;
      method = 'PUT';
    }else{
      delete data.id;
      url = metadata.secondEndpoint;
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
    })
    .done(function(data){
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
        noty({text: '请不要添加重复的部门', type: 'error', timeout:5000});
      }else{
        noty({text: err.responseJSON.error, type: 'error', timeout:5000});
      }
    })
    .always(function(){
      notyInst.close();
    })
  }
}

_.extend(OrgManagement.prototype, prototype);
module.exports = OrgManagement;
/**
OrgManagement module end
*/
