/**
CabinetManagement module Start
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

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var keypad = require('keypad');

var differentdevice = require('differentdevice');

var searchbox = require('searchbox');
var bulletImg = require('./img/bullet.png');
var gunImg = require('./img/gun.png');

var CabinetManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('CabinetManagement has been created');
  return this;
}

var metadata =  {
  NS : 'modulemanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/cabinetmodule'
}

_.extend(CabinetManagement, metadata);

var prototype = {
  init : function (){
    log.info('init CabinetManagement entry');
    var me = this;
    me.backBtnFnArray = [];
    me.server({
      url : '/remote/checkremotemaster'
    }, true)
    .done(function(data){
      if(!data.hasRemoteMaster){
        me.listComponentUrl = '/cabinet/list?needLocal=true';
        me.currentCabinetIsMaster = true;
      }else{
        me.listComponentUrl = '/master/cabinet/list?needLocal=true';
        me.currentCabinetIsMaster = false;
      }
      me.currentLocalCabinetCode = data.localCabinetCode;
    })

  },
  destroy: function(cb){
    this.$node.find('.has-keyboard').keypad('destroy');
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
    $node.append(jade({
      i18n: __('cabinetmanagement'),
      i18nButton: __('buttonText')
    }));
    $node.find('.edit-cont').hide().append(edit({
      i18n: __("modulemanagement"),
      i18nForm: __("modulemanagement").form,
      i18nButton: __("buttonText")
    }));

    //创建搜索按钮
    $node.find('.search-cont').searchbox('show', {
      url: '/cabinetmodule?populate=cabinet,gun',
      searchKey:'name',
      searchTip: __('modulemanagement').searchByModuleName
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, AppId, $node){
          //搜索结果点击进入某个gridllist详情
        me.editCab($node, AppId);
      })
      .on('searchComponentDeleteGridlist', function(event, AppId, $node){
        //搜索结果删除某个gridlist
        me.deleteCab($node, {id: AppId});
      });


    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __('cabinetmanagement').cabinetManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('cabinetmanagement').moduleList,
          target: 'javascript:void(0)'
        },
        {
          name: __('cabinetmanagement').cabinetDetail,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    $node.pagestate('setState', 0);

    // put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    // 给返回按钮添加默认的回调函数
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
        case 'cab-list' :
          _.delay(function(){me.nav('/m/cabinetmanagement')}, 250);
          break;
        case 'module-list' :
          _.delay(function(){me.nav('/m/modulemanagement')}, 250);
          break;
        case 'log-list' :
          _.delay(function(){me.nav('/m/logmanagement')}, 250);
          break;
        case 'lock-location-list':
          _.delay(function(){me.nav('/m/locklocation')}, 250);
          break;
      }
    })
    .vMenu('show',
      1,
      [
        {
          name: __('cabinetmanagement').cabinetList,
          target: '#list',
          id: 'cab-list',
          clsName: 'vlink'
        },
        {
          name: __('cabinetmanagement').moduleList,
          target: '#modulelist',
          id: 'module-list',
          clsName: 'vlink'
        },
        {
          name: __('cabinetmanagement').logList,
          target: '#loglist',
          id: 'log-list',
          clsName: 'vlink'
        },
        {
          name: __('cabinetmanagement').lockPositionList,
          target: '#locklocationlist',
          id: 'lock-location-list',
          clsName: 'vlink'
        }
      ],
      true//clickable
    );

    //Create paging
    $node.find('.paging-btn-box')
    .paging('show');

    $node.find('.list-cont')
    .gridlist({
      source: {
        url: '/cabinetmodule/list?isLocal=true'
      },
      // sort: JSON.stringify({
      //   "localId": "ASC"
      // }),
      innerTpl: function(data){
        if (data.cmType === 'gun') {
          data.imgUrl = gunImg
        } else {
          data.imgUrl = bulletImg
        }
        _.merge(data, {
          moment : moment,
          i18n: __('modulemanagement')
        });
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
            me.deleteCab($node, {id: appId});
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
      me.editCab($node, appId);
      // 进入详情页面，给返回按钮添加回调函数
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
        search: function(){
          log.debug('go search page');
          $node.pagestate('setState', 2);
          me.backBtnFnArray.push(function () {
            me.$node.pagestate('setState', 0);
          })
        },
        add : function(){
          log.debug('add');
          var $editform = $node.find('form');
          $editform.formwork('clear');
          $node.pagestate('setState', 1);
          $('#gunmodule').prop('checked', 'checked');
          $node.find('#cabinetClearBtn').addClass('hide');
          $node.find('#bulletTypeClearBtn').addClass('hide');
          //进去添加模块，初始化input显示
          $editform.find('#bulletTypeText').parent().addClass('hide');
          $editform.find('#capacity').val(1).parent().addClass('hide');
          $editform.find('#load').val(1).parent().addClass('hide');
          $editform.find('#gunTypeText').parent().removeClass('hide');
          $editform.find('#gunText').parent().removeClass('hide');

          me.backBtnFnArray.push(function () {
            me.$node.pagestate('setState', 0);
          })
        },
        repair: function(){
          log.debug('gunLock repaired');
          me.repairgunLock();
        },
        refresh : function(){
          log.debug('refresh');
          noty({text: '距上一次刷新，需等待20秒!', type: 'info', layout: 'top',
            timeout: null,
            buttons: [
              {
                addClass: 'btn btn-empty big',
                text: '确定',
                onClick: function ($noty) {
                  me.checkGunIsSit();
                  $node.find('.list-cont').gridlist('refresh');
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
          // me.checkGunIsSit();
          // $node.find('.list-cont').gridlist('refresh');
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
        all : function(){
          // if(me.currentCabinetIsMaster){
          //   var url =  metadata.endpoint + '?populate=cabinet,gun';
          // }else{
          //   var url = '/master'+ metadata.endpoint + '?populate=cabinet,gun';
          // }
          var url = '/cabinetmodule/list?type=all';

          $node.find('.list-cont')
          .off('onError')
          .on('onError', function(){
            noty({text: '联网失败无法访问远程柜机', type: 'error', layout: 'topRight', timeout: '3000'})
          })
          .gridlist('fetch', null, null, null, null, url, true)
        },
        local : function(){
          var url = '/cabinetmodule/list?type=all&isLocal=true'
          $node.find('.list-cont').gridlist('fetch', null, null, null, null, url, true);
        },
        specified : function(){
          var $modal = $('<div/>').appendTo($node)
          .flexmodal()
          .on('shown.bs.modal'/*Bootstrap event*/, function(e){
            log.debug("click specified");
            var $targetNode = $(e.target);
            var $list = $targetNode.find('.type-list')
            .on('click', 'li', function(e){
              var $currentLi = $(e.target);
              var $me = $(this);
              var cabinetCode = $me.data('code');
              var isLocal = Boolean($me.data('local'));
              var isMaster = Boolean($me.data('master'));
              var typeId = $currentLi.data('id');

              // var url = isLocal && metadata.endpoint + '?populate=cabinet,gun' || (isMaster && '/master' + metadata.endpoint
              //     + '?populate=cabinet,gun' || '/peer/' + cabinetCode + metadata.endpoint + '?populate=cabinet,gun');
              var url;
              if (isLocal) {
                url = '/cabinetmodule/list?type=all&isLocal=true';
              } else {
                url = '/cabinetmodule/list?type=all&isLocal=false&cabinetId=' + cabinetCode;
              }
              $node.find('.list-cont').gridlist('fetch', null, null, null, null, url, true);
              $modal.flexmodal('modalHide');
            })
            .list({
              source: {
                url : me.listComponentUrl
              },
              innerTpl: function(data){
                if(data.code === me.currentLocalCabinetCode){
                  data.isLocal = true;
                }else{
                  data.isLocal = false;
                }
                return typeListCell(data)
              }, // A compiled jade template,
              renderFn : null // How to render body
            });
            $list.off('onError')
            .on('onError', function(){
              noty({text: '联网失败无法访问远程柜机', type: 'error', layout: 'topRight', timeout: '3000'});
            })
            .list('show')
          });
          $modal
          .flexmodal('show',
            {
              modalTitle : '请选择挂载机柜'
            },
              require('./typelist.jade')
          );


        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })


    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('.big-btn-cont'), ['waves-block']);
    // waves.init();
    this.addKeyboard($node);
    $node.find('.different-device-box').differentDevice({
      'btnArray' : [
        {name : 'local', text: '本地'},
        {name : 'all', text: '全部'},
        {name : 'specified', text: '指定'}
      ]
    }).differentDevice('show');
    cb();
  },
  addKeyboard : function($node){
    // dont show keyboard at other media
    $node.find('.form .has-keyboard').keypad('init', {
      type: "number"
    });
    $node.find('.form #name').keypad('init');
  },
  checkGunIsSit: function () {
    this.server({
      url: '/gun/gunisisit',
      method: 'GET'
    })
    .done(function(){
      noty({text: '请刷新列表查看存量', type: 'success', layout: 'topRight'})
    })
  },
  repairgunLock: function(){
    this.server({
      url: '/cabinetmodule/gunlockrepair'
    })
    .done(function(){
      noty({text: '确认枪锁修复', type: 'success', layout: 'topRight'})
    })
  },
  initFormwork: function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    me.formwork = $editform.formwork({
      namespace : metadata.NS, //use current comp's name as namespace
      fields : {
        '#moduleId' : {
          name : 'moduleId',
          refresh: function(value, data){
            if(data){
              $(this).val(data.moduleId);
            }
          }
        },
        '#cabinetText': {
          name: 'cabinetText',
          exclude : true,
          init : function(){
            var $modal = $('<div/>').appendTo($node)
            .flexmodal()
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug("Open Selection ");
              var $node = $(e.target);
              var $list = $node.find('.type-list')
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget);
                $modal.flexmodal('modalHide');
                var typeId = $node.data('id');
                var typeName = $node.data('name');

                if(typeId){
                  $editform.find('#cabinetText').val(typeName);
                  $editform.find('#cabinet').val(typeId);
                  $editform.find('#cabinetClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/cabinet/list?needLocal=true'
                },
                limit: 5,
                innerTpl: function(data){
                  if(data.code === me.currentLocalCabinetCode){
                    data.isLocal = true;
                  }else{
                    data.isLocal = false;
                  }
                  return typeListCell(data)
                }, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $node.on('click', '#cabinetClearBtn', function(e){
              e.preventDefault();
              $editform.find('#cabinetText').val(null);
              $editform.find('#cabinet').val(null);
              $editform.find('#cabinetClearBtn').addClass('hide');
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择挂载机柜'
                },
                require('./typelist.jade')
              );
            });

          },
          refresh: function(value, data){
            if(data && data.cabinet)
              $(this).val(data.cabinet.name);
          }
        },
        '#cabinet': {
          name: 'cabinet',
          refresh: function(value, data){
            if(data && data.cabinet){
              $(this).val(data.cabinet.id);
            }
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('cabinet invalid');
              return '柜机不能为空';
            }else{
              return null;
            }
          }
        },
        '#gunTypeText': {
          name: 'gunTypeText',
          exclude : true,
          init : function(){
            var $modal = $('<div/>').appendTo($node)
            .flexmodal()
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug("Open Selection ");
              var $node = $(e.target);
              var $list = $node.find('.type-list')
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget);
                $modal.flexmodal('modalHide');
                var typeId = $node.data('id');
                var typeName = $node.data('name');
                if(typeId){
                  $editform.find('#gunTypeText').val(typeName);
                  $editform.find('#gunType').val(typeId);
                  $editform.find('#gunTypeClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/gunType?sort={"localId":"desc"}'
                },
                limit: 5,
                innerTpl: typeListCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

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
                  modalTitle : '请选择存放的枪支类型'
                },
                require('./typelist.jade')
              );
            });
          },
          refresh: function(value, data){
            if(data && data.gunType){
              $(this).val(data.gunType.name);
              $editform.find('#gunTypeClearBtn').removeClass('hide');
            }else{
              $(this).val(null);
              $editform.find('#gunTypeClearBtn').addClass('hide');
            }
          }
        },
        '#gunType': {
          name: 'gunType',
          refresh: function(value, data){
            if(data && data.gunType)
              $(this).val(data.gunType.id);
            else
              $(this).val(null);
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
              var $list = $node.find('.type-list')
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
                  url : '/bullettype?sort={"localId":"desc"}'
                },
                limit: 5,
                innerTpl: typeListCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $node.on('click', '#bulletTypeClearBtn', function(e){
              e.preventDefault();
              $editform.find('#bulletTypeText').val(null);
              $editform.find('#bulletType').val(null);
              $editform.find('#bulletTypeClearBtn').addClass('hide');
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择存放的子弹类型'
                },
                require('./typelist.jade')
              );
            });
          },
          refresh: function(value, data){
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
          name: 'bulletType',
          refresh: function(value, data){
            if(data && data.bulletType){
              $(this).val(data.bulletType.id);
            }else{
              $(this).val(null);
            }
          }
        },
        '#gunText': {
          name: 'gunText',
          exclude : true,
          init : function(){
            var $modal = $('<div/>').appendTo($node)
            .flexmodal()
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug("Open Selection ");
              var $node = $(e.target);
              var $list = $node.find('.type-list')
              .on('click', 'li', function(e){
                var $node = $(e.currentTarget);
                $modal.flexmodal('modalHide');
                var typeId = $node.data('id');
                var typeName = $node.data('name');
                var gunType = $node.data('type').id;
                var cabinetGunType = $editform.find('#gunType')[0].value;
                //checkgun then
                if(typeId){
                  me.server({url : '/gun/validation?gunId='+typeId})
                  .done(function(data){
                    if(cabinetGunType && gunType != cabinetGunType){
                      noty({text: '模块枪支种类与选择枪支不服', type: 'error', timeout:1000, layout: 'topRight'});
                    }else{
                      $editform.find('#gunText').val(typeName);
                      $editform.find('#gun').val(typeId);
                      $editform.find('#gunClearBtn').removeClass('hide');
                    };
                  })
                  .fail(function(err){
                    log.debug(err);
                    noty({text: '枪支已入柜', type: 'error', timeout:1000, layout: 'topRight'});
                  });
                }

              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/gun?populate=type&sort={"localId":"desc"}&where={"storageStatus":{"!":"in"}}'
                },
                limit: 5,
                innerTpl: typeListCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $node.on('click', '#gunClearBtn', function(e){
              e.preventDefault();
              $editform.find('#gunText').val(null);
              $editform.find('#gun').val(null);
              $editform.find('#gunClearBtn').addClass('hide');
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择存放枪支'
                },
                require('./typelist.jade')
              );
            });
          },
          refresh: function(value, data){
            if(data && data.gun){
              $(this).val(data.gun.name);
              $editform.find('#gunClearBtn').removeClass('hide');
            }else{
              $(this).val(null);
              $editform.find('#gunClearBtn').addClass('hide');
            }
          }
        },
        '#gun': {
          name: 'gun',
          refresh: function(value, data){
            if(data && data.gun)
              $(this).val(data.gun.id);
            else
              $(this).val(null);
          }
        },
        '[name="type"]': {
          name: 'type',
          init : function(){
            $(this).on('click', function(e){
              var $me = $(this);
              var value = $me.val();
              switch (value) {
                case 'gun':
                  $editform.find('#bulletTypeText').parent().addClass('hide');
                  $editform.find('#capacity').val(1).parent().addClass('hide');
                  $editform.find('#load').val(1).parent().addClass('hide');
                  $editform.find('#gunTypeText').parent().removeClass('hide');
                  $editform.find('#gunText').parent().removeClass('hide');
                  break;
                case 'bullet':
                  $editform.find('#gunTypeText').parent().addClass('hide');
                  $editform.find('#gunText').parent().addClass('hide');
                  $editform.find('#bulletTypeText').parent().removeClass('hide');
                  $editform.find('#capacity').parent().removeClass('hide');
                  $editform.find('#load').parent().removeClass('hide');
                default:

              }
              $me.parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
              $me.attr("checked", 'checked').prop("checked", "checked");
            });
          },
          refresh: function(value, data){
            $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
            $(this).attr("checked", 'checked').prop("checked", "checked");
            if(value){
              $('#' + value + "module").attr("checked", 'checked').prop("checked", "checked");
              switch (value) {
                case 'gun':
                  $editform.find('#bulletTypeText').parent().addClass('hide');
                  $editform.find('#capacity').val(1).parent().addClass('hide');
                  $editform.find('#load').val(1).parent().addClass('hide');
                  
                  $editform.find('#gunTypeText').parent().removeClass('hide');
                  $editform.find('#gunText').parent().removeClass('hide');
                  break;
                case 'bullet':
                  $editform.find('#gunTypeText').parent().addClass('hide');
                  $editform.find('#gunText').parent().addClass('hide');
                  $editform.find('#bulletTypeText').parent().removeClass('hide');
                  $editform.find('#capacity').parent().removeClass('hide');
                  $editform.find('#load').parent().removeClass('hide');
                default:

              }
            }
          },
          validate : function(){
            if($(this).val() === ''){
              log.debug('Type invalid');
              return '种类不能为空';
            }else{
              return null;
            }
          }
        },
        '#capacity': {
          name: 'capacity',
          validate: function(){
            var $me = $(this);
            if($me.val() === ''){
              return '容量不能为空';
            } else {
              return null;
            }
          },
          refresh: function(value, data){
            if(data){
              $(this).val(data.capacity);
            }
          }
        },
        '#load': {
          name: 'load',
          validate: function(){
            var $me = $(this);
            if($me.val() === ''){
              return '存量不能为空';
            } else {
              return null;
            }
          },
          refresh: function(value, data){
            if(data){
              $(this).val(data.load);
            }
          }
        },
        '#canId': {
          name: 'canId',
          refresh: function(value, data){
            if(data){
              $(this).val(data.canId);
            }
          }
        },
        '#name': {
          name: 'name'
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
      log.debug('form submit', data);
      me.submitCab(data);
    })
    .formwork('init');
  },
  editCab : function($node, id){
    var $node = this.$node;
    var notyInst = null;
    var me = this;
    me.server({
      url : metadata.endpoint + '?populate=cabinet,type,gunType,bulletType,gun',
      data: {id:id},
      beforeSend: function(){
        notyInst = noty({text: '加载..', layout: 'topRight'});
      }
    })
    .done(function(data){
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
  udpateCab : function($node, id, data){
    log.debug('Update Cabinet');
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = metadata.endpoint + '/' + id,
      dataType = 'json';
    var notyInst = null;
    me.server({
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
  deleteCab : function($node, data){
    log.debug(data);
    if(!data) return;
    var me = this;
    var url = metadata.endpoint,
      dataType = 'json';
    var notyInst = null;
    me.server({
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
  submitCab : function(data){
    log.debug('Create New Cabinet');
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
    me.server({
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
    })
    .always(function(){
      notyInst.close();
    })
    me.updateGunState(data.gun, {storageStatus: 'in'});
  },
  updateGunState: function(id,data){
    log.debug('Update Gun State')
    log.debug(id, data);
    var me = this;
    var url = '/gun/' + id;
    var method = 'PUT';
    var dataType = 'json';
    me.server({
      url: url,
      method: method,
      data: data
    }).done(function(){
      log.debug('updateGunState Success');
    }).fail(function(err){
      log.debug(err);
    })
  }
}

_.extend(CabinetManagement.prototype, prototype);
module.exports = CabinetManagement;
/**
CabinetManagement module end
*/
