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

var vmenu = require('vmenu');

var taskbar = require('taskbar');
var backBtn = require('backbtn');

var gridlist = require('gridlist');
var paging = require('paging');

var list = require('list');

var gridCell = require('./gridcell.jade');
var typeListCell = require('./typelistcell.jade');
var orgCell = require('./orgcell.jade');

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

var searchbox = require('searchbox');

var pubsub = require('PubSubJS');

var CabinetManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('CabinetManagement has been created');
  return this;
}

var metadata =  {
  NS : 'cabinetmanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/cabinet'
}

_.extend(CabinetManagement, metadata);

var prototype = {
  init : function (){
    log.info('init CabinetManagement entry');
    var me = this;
    server({
      url : '/cabinet?populate=org&where={"isLocal": true}'
    }, true)
    .done(function(data){
      me.currentLocalCabinetIsMaster = data[0] && data[0].isMaster;
      me.currentLocalCabinetCode = data[0] && data[0].code;
    });
    me.backBtnFnArray = [];

    // 检测是否有监控设置按钮
    me.checkedWebCam();
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    this.offCalibrateResult();
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
          '.detaile-cont'
        ],
        3 : [
          '.search-cont'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // 初始化校正监听的结果
    me.onCalibrateResult();

    // create html frame
    $node.append(jade({
      i18nButton: __('buttonText'),
      i18n: __('cabinetmanagement')
    }));
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('cabinetmanagement')
    }));
    $node.find('.detaile-cont').hide().append(detailecell);

    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __('cabinetmanagement').cabinetManage,
          target: 'javascript:void(0)'
        },
        {
          name: __('cabinetmanagement').cabinetList,
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
    // 返回按钮添加默认的回调函数
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
      0,
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

    // 弹出组件关闭
    $node.find('#mask .mask_close')
    .on('click', function() {
      $node.find('#mask').addClass('hide');
    });

    //Create paging
    $node.find('.paging-btn-box')
    .paging('show');


      var url = metadata.endpoint + '?populate=org';
      me.getGridList(url);

      //创建搜索按钮
      $node.find('.search-cont').searchbox('show', {
        url: url,
        searchKey:'name',
        searchTip: __('cabinetmanagement').searchByCabinetName,
        gridCell: gridCell,
        //渲染数据的时候是否以data.id形式（取决gridCell）
        isBagData: true
      });

    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, AppId, $node){
          //搜索结果点击进入某个gridllist详情
        var cabinetCode = $node.data('code');
        var isLocal = Boolean($node.data('local'));
        var isMaster = Boolean($node.data('master'));
        me.detaileCab($node, AppId, cabinetCode, isLocal, isMaster);
      });

    $node.find('.list-cont')
    .on('click', '.delete-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      noty({text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
        timeout: null,
        buttons: [
          {
            addClass: 'btn btn-empty big',
            text: '确定',
            onClick: function ($noty) {
              me.deleteCabinet($node, appId);
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
    .on('click', '.calibrate-btn', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var code = $node.parents('.grid-list-cell').data('code');
      me.handleCalibrate('code', code, $node);
    })
    .on('click', '.approve-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Update Status to APPROVED app %s', appId);
      me.udpateCab($node, appId, {status: 'approved'});
    })
    .on('click', '.deny-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Update Status to DENY app %s', appId);
      me.udpateCab($node, appId, {status: 'rejected'});
    })
    .on('click', '.grid-list-cell', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      var cabinetCode = $node.data('code');
      var isLocal = Boolean($node.data('local'));
      var isMaster = Boolean($node.data('master'));
      var camIp = $node.data('camip');

      log.debug('Update Status to APPROVED app %s', appId);
      // me.editCab($node, appId);
      me.detaileCab($node, appId, cabinetCode, isLocal, isMaster);
      //进入详情页面， 给返回按钮添加回调函数
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      });

      // 记录选择的cabineId
      me.selectCabinetCode = cabinetCode;
      me.camIp = camIp;

      if (cabinetCode === me.currentLocalCabinetCode) {
        me.$node.find('#verifycabinet').addClass('hide');
      } else {
        me.$node.find('#verifycabinet').removeClass('hide');
      }
    });
    var actions = [
      {
        name : __('buttonText').cancelBtn,
        target: function(){
          $node.pagestate('setState', 0);
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
          log.debug('add');
          var $editform = $node.find('form');
          $editform.formwork('clear');
          $node.pagestate('setState', 1);
        },
        search: function(){
          $node.pagestate('setState', 3);
        },
        resetHost: function(){
          noty({text: '是否确定重置主机', type: 'info', layout: 'top',
            timeout: null,
            buttons: [
              {
                addClass: 'btn btn-empty big', text: '确定', onClick: function($noty) {
                  server({
                    url: '/cabinet/cleanconnect'
                  })
                  .done(function(){
                    noty({text: '重置成功', type: 'success', layout: 'topRight'});
                    $noty.close();
                    $node.find('.list-cont').gridlist('refresh');
                  })
                  .fail(function(error){
                    var errText = '重置主机请求失败';
                    var responseJSON = error && error.responseJSON || null;
                    if (responseJSON) {
                      responseJSON
                      errText = responseJSON.error ? responseJSON.error : (responseJSON.err ? responseJSON.err : '重置主机请求失败');
                    }
                    noty({text: errText, type: 'error', layout: 'top', timeout: 2000});
                  })
                }
              },
              {
                addClass: 'btn btn-empty big', text: '取消', onClick: function($noty) {
                  $noty.close();
                }
              }
            ]
          });
        },
        joined: function () {
          me.getBroadcastList(metadata.endpoint + '?populate=org');
          $node.find('.list-cont')
          .off('click', '.grid-list-cell')
          .on('click', '.grid-list-cell', function(e){
            e.preventDefault();
            e.stopPropagation();
            var $node = $(e.currentTarget);
            var appId = $node.data('id');
            var cabinetCode = $node.data('code');
            var isLocal = Boolean($node.data('local'));
            var isMaster = Boolean($node.data('master'));
            log.debug('Update Status to APPROVED app %s', appId);
            // me.editCab($node, appId);
            me.detaileCab($node, appId, cabinetCode, isLocal, isMaster);
            //进入详情页面， 给返回按钮添加回调函数
            me.backBtnFnArray.push(function () {
              me.$node.pagestate('setState', 0);
            });
            if (cabinetCode === me.currentLocalCabinetCode) {
              me.$node.find('#verifycabinet').addClass('hide');
            } else {
              me.$node.find('#verifycabinet').removeClass('hide');
            }
          });
        },
        incoming : function(){
          log.debug('incoming');
          me.getBroadcastList('/cabinet/getBroadcastList');
          $node.find('.list-cont')
          .off('click', '.grid-list-cell')
          .on('click', '.grid-list-cell', function(e){
            e.preventDefault();
            e.stopPropagation();
            var $node = $(e.currentTarget);
            log.debug($node.data());
            var cabinetCode = $node.data('code');
            var host = $node.data('host');
            var fullData = $node.data();
            me.previewCab($node, host, cabinetCode, fullData);
          });
        },
        checkedNetwork: function () {
          me.checkedNetwork();
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
        allCalibrate: function() {
          me.handleCalibrate('all', null, $(this));
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })

    me.renderViolationsLog();
    // waves.attach($node.find('.panel'), ['waves-block']);
    // waves.attach($node.find('.big-btn-cont'), ['waves-block']);
    // waves.init();
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
  getBroadcastList: function(target){
    var me = this;
    var $node = me.$node;
    $node.find('.list-cont')
    .gridlist('fetch', null, null, null, null, target, true);
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
        if (data && data.code === me.currentLocalCabinetCode){
          data.isLocal = true;
        }else{
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
  checkedNetwork: function () {
    this.server({
      url: '/cabinet/startCheck',
      method: 'GET'
    })
    .done(function (data) {
      noty({text: data, type: 'success', layout: 'topRight', timeout: '2000'});
    })
    .fail(function (error) {
      noty({text: '服务器出错', type: 'error', layout: 'top', timeout: '2000'});
    })
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
            log.debug('Handling detail validate event');
            if($(this).val() === ''){
              log.debug('Detail invalid');
              return '审核详情不能为空';
            }
            else{
              return null;
            }
          }
        },
        '#code': {
          name: 'code',
          validate : function(){
            log.debug('Handling detail validate event');
            if($(this).val() === ''){
              log.debug('Detail invalid');
              return '审核详情不能为空';
            }
            else{
              return null;
            }
          }
        },
        '#orgText': {
          name: 'orgText',
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
                  $editform.find('#orgText').val(name);
                  $editform.find('#org').val(id);
                  $editform.find('#orgClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/org' + '?populate=superior'
                },
                innerTpl : orgCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $node.on('click', '#orgClearBtn', function(e){
              e.preventDefault();
              $editform.find('#orgText').val(null);
              $editform.find('#org').val(null);
              $editform.find('#orgClearBtn').addClass('hide');
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle: __('cabinetmanagement').pleaseChooseOwnOrg
                },
                require('./typelist.jade')
              );
            });
          },
          refresh: function(value, data){
            if(data && data.org){
              $(this).val(data.org.name);
              $editform.find('#orgClearBtn').removeClass('hide');
            }else{
              $(this).val(null);
              $editform.find('#orgClearBtn').addClass('hide');
            }
          }
        },
        '#org': {
          name : 'org',
          refresh: function(value, data){
            if(data && data.org)
              $(this).val(data.org.id);
          }
        },
        '#info': {
          name: 'info'
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
      me.submitCab(data);
    })
    .formwork('init');
  },
  detaileCab : function($node, id, cabinetCode, isLocal, isMaster){
    var $node = this.$node;
    var me = this;
    $node.pagestate('setState', 2);
    $node.find('#log-table').datagrid('init', {
      url: isLocal && '/optlog' || (isMaster && '/master/optlog' ||'/peer/' + cabinetCode + "/optlog"),
      data: {sort:{ createdAt: 'DESC'}},
      columns: [
        { title: 'ID', data : 'localId'},
        { title: '日志', data : 'log'},
        { title: '用户名称', orderable : false,
          data : function ( row, type, val, meta ) {
            // 'sort', 'type' and undefined all just use the integer
            var createdBy =  (row.createdBy && row.createdBy.alias) ? row.createdBy.alias : row.createdBy;
            return createdBy ? createdBy : '无';
          }
        },
        { title: '操作时间', orderable : false,
          data : function ( row, type, val, meta ) {
            var createdAt = moment(row.createdAt).locale('zh-cn').calendar(null, {
              sameElse: 'LLL'
            });
            return createdAt ? createdAt : '-';
          }
        }
      ],
    });


    // 根据系统设置是否显示枪弹面板
    if (me.checkIsShowGunBulletCountPanel()) {

      server({
        url : isLocal && '/cabinetmodule/countgun' || ( isMaster && '/master/cabinetmodule/countgun' || '/peer/' + cabinetCode + '/cabinetmodule/countgun'),
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
        if (err.responseJSON) {
          noty({text: err.responseJSON.error, layout: 'top', timeout: 3000, type: 'error'});
        } else {
          noty({text: '服务器出错', layout: 'top', type: 'error', timeout: 3000});
        }
        $node.find('.gun-count-box').weaponsNumber('show', {tipc: "拥有枪支数", count: ""});
      });
      server({
        url : isLocal && '/cabinetmodule/countbullet' || ( isMaster && '/master/cabinetmodule/countbullet'  || '/peer/' + cabinetCode + '/cabinetmodule/countbullet'),
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

    } else {
      $node.find('.count-box').hide();
    }


    var actions = [
      {
        name : '取消',
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(1);
        }
      }
    ];

    if(me.currentLocalCabinetIsMaster){
      actions.push({
        id: 'verifycabinet',
        name : '授权',
        target: function(){
          server({
            url: '/cabinet/verifycabinet',
            data: {code: cabinetCode}
          })
          .done(function(data){
            noty({text: '授权成功', layout: 'topRight', timeout: 3000, type: 'success'});
            $node.find('.list-cont').gridlist('refresh');
            me.$node.pagestate('setState', 0);
          })
          .fail(function(err){
            if (err.status === 400) {
              var error = err.responseText;
              noty({text: error, layout: 'top', timeout: 3000, type: 'error'});
            } else {
              noty({text: '授权失败',layout: 'top', timeout: 3000, type: 'error'});
            }
          })
        }
      })
    }

 
      actions.push({
        id: 'webCamBtn',
        name: '添加监控地址',
        target: function() {
          me.showModulePanel();
        }
      })
    

    $node.find('.taskbar-user-detaile').taskbar('show', actions);
  },
  showModulePanel: function() {
    var $node = this.$node,
        me = this,
        $modal = $('<div id="MessageFlexmodal">').appendTo($node);
    $modal.flexmodal({
      IsSureBtn: true,
      innerTpl: require('./messageBox.jade'),
      // 配置modalBackdropRemove:true,禁止flexmodal点击背景隐藏
      modalBackdropRemove: true
    })
    .on('shown.bs.modal', function(e) {
      $modal.find('.init-keypad').keypad('init');
      $modal.find('.save-btn').text('设置');
      $modal.find('.camIP').val(me.camIp);
    })
    .on('hide.bs.modal', function(e) {
      $modal.find('.init-keypad').keypad('destroy');
      $modal.flexmodal('remove');
      $modal.remove()
    })
    .on('onOk', function() {
      var ip = $modal.find('.camIP').val();
      me.addCamIp(ip);
      $modal.flexmodal('modalHide');
    })
    .flexmodal('show', {
      modalTitle: '设置监控IP'
    });
  },

  addCamIp: function(ip) {
    var me = this;
    this.server({
      url: '/cabinet/' + me.selectCabinetCode,
      method: 'PUT',
      data: {
        'camIp': ip
      }
    })
    .done(function(data) {
      me.camIp = ip;
      noty({text: '设置监控IP成功', type: 'success', layout: 'topRight', timeout: 2000})
    })
    .fail(function(error) {
      noty({text: '设置监控IP失败', type: 'error', layout: 'top', timeout: 2000});
    });
  },
  checkedWebCam: function () {
    var me = this;
    me.server({
      url: '/system/settings'
    })
    .done(function(data) {
      _.forEach(data, function(item, index) {
        if (item.key === 'enableCam') {
          if (item.value === 'true') {
            me.isOpenWebCam = true;
          } else {
            me.isOpenWebCam = false;
          }
        }
      });
    })
    .fail(function() {
      me.isOpenWebCam = false;
    });
  },
  previewCab : function($node, host, cabinetCode, data){
    var $node = this.$node;
    var me = this;
    var showText = '是否要将识别码: ' + cabinetCode + ' <br>地址: ' + host + '的远程柜机加入网络';
    noty({text: showText, type: 'info', layout: 'top', timeout: 60 * 1000,
      buttons: [
        {
          addClass: 'btn btn-empty big', text: '确定', onClick: function($noty) {
            noty({text: '请求发送成功，请稍等', type: 'success',layout: 'topRight', timeout: 1000});
            server({
              url: '/cabinet/doHandshake',
              method: 'POST',
              data: data
            })
            .done(function(){
              noty({text: '添加成功', type: 'success', layout: 'topRight'});
              $noty.close();
              $node.find('.list-cont').gridlist('refresh');
            })
            .fail(function(data){
              if (data.status === 400) {
                var errorText = JSON.parse(data.responseText).error;
                noty({text: errorText, type: 'error',layout: 'topRight'});
              } else {
                noty({text: '服务器出错', type: 'error',layout: 'topRight'});
              }
            })
          }
        },
        {
          addClass: 'btn btn-empty big', text: '取消', onClick: function($noty) {
            $noty.close();
          }
        }
      ]
    });
   },
  editCab : function($node, id){
    var $node = this.$node;
    var notyInst = null;
    this.server({
      url : metadata.endpoint + '?populate=org',
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
    log.debug('Delete New Cabinet');
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
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      log.debug(err);
    })
    .always(function(){
      notyInst.close();
    })
  },
  deleteCabinet: function ($node, appId) {
    var me = this;
    this.server({
      url: '/cabinet/recieveClean',
      method: 'post',
      data: {id: appId}
    })
    .done(function(data) {
      var msg = data && (typeof data.msg !== 'undefined') && data.msg || '删除成功！';
      me.$node.find('.list-cont').gridlist('refresh');
      noty({text: msg, type: 'success', layout: 'topRight', timeout: '1000'});
    })
    .fail(function (err) {
      noty({text: '删除失败', type: 'error', layout: 'top'});
    })
  },
  checkIsShowGunBulletCountPanel: function() {
    var isShow = false;
    var systemSetData = window.localStorage.getItem('systemSetData');
    if (systemSetData) {
      systemSetData = JSON.parse(systemSetData);
      if (systemSetData && systemSetData.showCount) {
        isShow = true;
      } else {
        isShow = false;
      }
    };
    return isShow;
  },
  /**
   * 校正柜机状态函数
   * @param {string} type 校正的类型，有'code'=> 制定柜机, ‘all’ => 所有柜机。默认为all
   * @param {string} code 当type='code'的时候才需要使用
   * @param {node}   $btn 当前点击的按钮
  */
  handleCalibrate: function(type, code, $btn) {
    noty({text: '正在校正', type: 'info', layout: 'topRight', timeout: 1000});
    $btn.addClass('disabled');

    var url = '/cabinet/calibrate?target=all';
    if (type === 'code') {
      url = '/cabinet/calibrate?target=' + code;
    }
    this.server({
      url: url
    })
    .done(function(res) {
      var msg = res.msg;
      noty({text: msg, type: 'success', layout: 'topRight', timeout: 3000});
    })
    .fail(function(res) {
      var err = res.responseJSON;
      var errMsg = '校正失败';
      if (err) {
        errMsg = err.msg;
      }
      noty({text: errMsg, type: 'error', layout: 'top', timeout: 2000});
    }).always(function() {
      $btn.removeClass('disabled');
    });
  },
  /**
   * 校正所有柜机状态的时候，推送监听
   * topic => calibrate_msg_status
  */
  onCalibrateResult: function() {
    var me = this;
    this.offCalibrateResult();
    pubsub.subscribe('system.message', function (topic, data) {
      console.log('校正柜机在线状态的推送: ', data);
      if (data && data.topic !== 'calibrate_msg_status') return;

      var status = data.value.status;
      var classname = '';
      if (status === 'fail') {
        classname = 'error'
      } else if (status === 'success') {
        classname = "success";
      }
      var $currData = '<li class="' + classname + '">' + data.value.msg + '</li>';
      me.$node.find('#mask').removeClass('hide').find('.box').append($currData);
    });
  },
  offCalibrateResult: function() {
    pubsub.unsubscribe('calibrate_msg_status');
  },
}

_.extend(CabinetManagement.prototype, prototype);
module.exports = CabinetManagement;
/**
CabinetManagement module end
*/
