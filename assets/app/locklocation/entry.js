/**
  Locklocation module Start
**/
'use strict';

var animateCss = require('animate.css');

var jade = require('./index.jade');
var less = require('./less/index.less');
var pagestate = require('pagestate');
var vmenu = require('vmenu');
var grid = require('./grid.jade');
var css = require("common/less/base.less");
var backBtn = require('backbtn');
var actionBar = require('actionbar');
var noty = require('customnoty');
var keypad = require('keypad');

var LockLocation = function (reg){
  reg.apply(this);
  log.info('LockLocation has been created');
  return this;
}


var metadata = {
  NS: 'locklocation',
  pub: [],
  sub: [],
  endpoint: '/optlog'
}

_.extend(LockLocation, metadata);

var prototype = {
  init: function() {
    log.info('init locklocation entry')
  },
  destroy: function (cb) {
    $('#noty_topRight_layout_container').remove();
    cb();
  },
  show: function($node, cb) {
    var me = this;

    $node.append(jade({
      i18n: __('locklocation')
    }));

    $node.find('.appm-status-bar').backBtn('show', function(){me.nav('/m/userhome')});
    $node.find('.appm-action-bar').actionBar('show');

    //input添加键盘
    $node.find('input.has-keypad').keypad('init', {type: 'IP'});

    $node.find('.leftmenu')
    .on('vmenu.afterChange', function(e, previous, next, originalEvent) {
      originalEvent.preventDefault();
      var id = next.attr('id');
      switch (id) {
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
      3,
      [
        {name : '柜机列表', target: '#list', id: 'cab-list', clsName : 'vlink'},
        {name : '模块列表', target: '#modulelist', id: 'module-list', clsName : 'vlink'},
        {name : '日志列表', target: '#loglist', id: 'log-list', clsName : 'vlink'},
        {name : '锁位列表', target: '#locklocationlist', id: 'lock-location-list', clsName: 'vlink'}
      ],
      true
    );

    $node.on('click', '.btn', function(){
      var map = {
        locklocation: function(){
          //获取当前canId下的所有位置以grid显示页面
          me.showLockList();
          //给gridCell上面的按钮绑定点击事件
          me.BindclickLockCellButton();
        }
      }
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })

    cb();
  },
  showLockList: function() {
    var me = this,
        $node = me.$node,
        canId = $node.find('#canIdInput').val();
    if(!canId){
      noty({text: 'canId不能为空！', type: 'error', layout: 'top', timeout: '3000'});
      return;
    }
    $node.find('.list-cont').data('canId', canId);
    //mock
    var data = {status: ''};
    me.createLockList(data);
    ////////
    me.getLockListData(canId)
    .done(function(data) {
      me.createLockList(data);
    })
    .fail(function(error) {
      me.loadGridlistError('服务器出错！');
    });
  },
  loadGridlistError: function(text){
    var me = this,
        $node = me.$node,
        $no_data_tpl = require('./gridlist_no_data.jade')({"text": text}),
        $gridList = $("<div class='col-sm-12 grid-list'>");
    $gridList.append($no_data_tpl);
    this.$node.find('.list-cont .grid-list').remove();
    this.$node.find('.list-cont').append($gridList);
  },
  BindclickLockCellButton: function() {
    var me = this,
        $node = me.$node;
    $node.find(".list-cont")
    .off('click')
    .on('click', '.quick-btn', function(){
      var $this_parent = $(this).parents('.grid-list-cell'),
          currentGridState = $this_parent.data('state'),
          data = null;
      //点击切换状态按钮，先改ui再发起请求
      me.updateCurrentGridState(currentGridState, $this_parent);
      //记录在UI上的state改变后，再获取当前data并传入data发起修改状态请求
      data = me.getChangeStateData();
      me.toggleLockState(data);
    })
  },
  getChangeStateData: function() {
    var me = this,
        $node = me.$node,
        data = {"canId": null, "status":{}},
        canId = $node.find('.list-cont').data('canId');

    data.canId= canId;
    $node.find('.grid-list-cell').each(function(index, item){
      data.status['state' + (index + 1)] = $(this).data('state');
    });
    return data;
  },
  updateCurrentGridState: function(currentGridState, $box) {
    if(currentGridState){
      //改为禁用状态
      $box.data('state', 0).addClass('disabled');
      $box.find('.enable-btn').removeClass('hide');
      $box.find('.disable-btn').addClass('hide');
      $box.find('.user-name').text('当前状态:禁用');
    }else{
      //改为可用状态
      $box.data('state', 1).removeClass('disabled');
      $box.find('.enable-btn').addClass('hide');
      $box.find('.disable-btn').removeClass('hide');
      $box.find('.user-name').text('当前状态:可用');
    }
  },
  toggleLockState: function(data) {
    var me = this;
    me.server({
      url: '/cabinetmodule/disableModule',
      method: 'POST',
      data: data
    })
    .done(function(data) {

    })
    .fail(function(error){
      noty({text: '服务器出错', type: 'error', layout: 'top'});
    });
  },
  createLockList: function(data){
    if(!data || !data.status){
      this.loadGridlistError('没有数据');
      return;
    }else{
      this.$node.find('.list-cont .grid-list').remove();
    }

    var lockArray = data.status.split(','),
        gridList = $("<div class='col-sm-12 grid-list'>"),
        hasDataList = $('<div class="inner-list">'),
        $node = this.$node;
    for(var i = 0, len = lockArray.length; i < len; i++) {
      var currentValue = Number(lockArray[i]),
          currentStateText = null,
          currentStateClass = null,
          icon_01_State = null,
          icon_02_State = null;

      if(currentValue === 1){
        currentStateText = '可用';
        currentStateClass = '';
        icon_01_State = 'hide';
        icon_02_State = '';
      }else{
        currentStateText = '禁用';
        currentStateClass = 'disabled';
        icon_01_State = '';
        icon_02_State = 'hide';
      }
      hasDataList.append(grid({
        "index": i,
        "stateClass": currentStateClass,
        "stateText": currentStateText,
        "state" : currentValue,
        "icon_01_isHide" : icon_01_State,
        "icon_02_isHide" : icon_02_State
      }));
    }
    $node.find('.list-cont .inner-list').remove();
    gridList.append(hasDataList);
    $node.find('.list-cont').append(gridList);

  },
  getLockListData: function(canId) {
    var d = new $.Deferred();
    this.server({
      url: '/cabinetmodule/modulestatus',
      method: 'post',
      data: {"canId": canId}
    })
    .done(function(data){
      d.resolve(data);
    })
    .fail(function(error){
      d.reject(error);
    });
    return d;
  }
}

_.extend(LockLocation.prototype, prototype);
module.exports = LockLocation;
