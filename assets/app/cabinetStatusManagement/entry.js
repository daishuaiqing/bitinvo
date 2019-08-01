'use strict'

var Jade = require('./index.jade');
var Less = require('./less/index.less');
var detaile = require('./detaile.jade');

var breadcrumbs = require('breadcrumbs');
var vmenu = require('vmenu');
var gridlist = require('gridlist');
var paging = require('paging');
var gridCell = require('./gridCell.jade');
var moment = require('moment');
var taskbar = require('taskbar');
var backBtn = require('backbtn');
var actionBar = require('actionbar');
var pagestate = require('pagestate');
var noty = require('customnoty');


var CabinetStatusManagement = function(reg) {
  reg.apply(this);
  return this;
}

var metadata = {
  NS: 'CabinetStatusManagement',
  noAuth: false,
  pub: [],
  sub: []
}

_.extend(CabinetStatusManagement, metadata);

var prototype = {
  init: function() {
    this.backBtnFnArray = [];
  },
  show: function($node, cb) {
    var me = this;
    $node.append(Jade());
    $node.find('.detaile-cont').hide().append(detaile());

    // 生成面包屑
    $node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {name : '柜机状态管理', target: 'javascript:void(0)'},
        {name : '柜机列表', target: 'javascript:void(0)'},
        {name : '柜机状态详情', target: 'javascript:void(0)'}
      ],
      false
    );

    //生成左边导航栏
    $node.find('.leftmenu')
    .on('vmenu.afterChange', function(e, previous, next, originalEvent){
      originalEvent.preventDefault();
      var id = next.attr('id');
      switch(id){
        case 'app-list' :
          _.delay(function(){me.nav('/m/cabinetStatusManagement')}, 250);
        break;
      }
    })
    .vMenu('show',
      0,
      [
        {name : '柜机状态管理', target: '#list', id: 'app-list', clsName : 'vlink'}
      ],
      true//clickable
    );

    // 返回按钮添加默认的回调函数
    me.backBtnFnArray.push(function () {
      me.nav('/m/userhome');
    })

    $node.find('.appm-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.appm-action-bar').actionBar('show');

    // 获取柜机列表
    me.getGridList('/cabinet?populate=org');

    // 初始化分页组件
    $node.find('.paging-btn-box')
    .paging('show');

    // 监听bar上按钮的点击事件
    me.onBarClickButton();

    // 监听　list-cont 容器的点击事件
    me.onListContClickEvent();

    // 初始化pagestate
    me.initPagestate();

    cb();
  },
  onBarClickButton: function() {
    var me = this;
    var $node = me.$node;
    me.$node.on('click', '.btn', function() {
      var map = {
        refresh : function(){
          log.debug('refresh');
          $node.find('.list-cont').gridlist('refresh');
        },
        prev : function(){
          $node.find('.list-cont').gridlist('prev');
        },
        next : function(){
          $node.find('.list-cont').gridlist('next');
        }
      }
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    });
  },
  onListContClickEvent: function() {
    var me = this;
    var $node = me.$node;

    $node.find('.list-cont')
    .on('click', '.grid-list-cell', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var $this = $(e.currentTarget);
      var cabinetId = $this.data('code');
      var cabinetName = $this.data('name');
      me.cabinetId = cabinetId;
      me.cabinetName = cabinetName;
      me.detaileCab(cabinetId);

      // 给返回添加上一个路由
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      });

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
  initPagestate: function() {
    var me = this;
    var $node = me.$node;

    $node.pagestate({
      namespace: metadata.NS,
      state: 0,
      states: {
        0: [ '.list-cont' ],
        1: ['.edit-cont'],
        2: ['.detaile-cont']
      }
    });

    $node.pagestate('setState', 0);
  },
  detaileCab: function(cabinetId) {
    var me = this;
    var $node = me.$node;

    $node.pagestate('setState', 2);

    // 初始化底部导航
    var actions = [
      {
        name : '取消',
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(1);
        }
      },
      {
        name: '显示该柜机状态',
        target: function() {
          me.setCurrentCabinetStatus();
        }
      }
    ];
    $node.find('.taskbar-user-detaile').taskbar('show', actions);

    me.getCabinetStatus(cabinetId);

  },
  getCabinetStatus: function(cabinetId) {
    var me = this;
    me.server({
      url: '/system/systemStatus?cabinet=' + cabinetId
    })
    .done(function(data) {
      console.log('This is get cabinet status success:', data);
      me.createStatusModal(data);
    })
    .fail(function(err) {
      console.log('This is get cabinet status fail:', err);
      me.showNoty('error', err);
    })
  },
  showNoty: function(type, text) {
    var layout = type === 'error' ? 'top': 'topRight';
    noty({text: text, type: type, layout: layout, timeout: 3000});
  },
  createStatusModal: function(data) {
    console.log('## This is create status modal ###', data)
    var statusModuleJade = require('./statusModule.jade');
    // 记录是否为备用电
    var isAlternatePower = data.powerType && (data.powerType === 1) ? false : true;

    data.src = {
      temp: require('./img/humidity_filled.png'),
      hum: require('./img/temperature.png'),
      power: isAlternatePower ? require('./img/network_connected_1.png') : require('./img/network_disconnected.png')
    }
    data.isAlternatePower = isAlternatePower;
    data.temp = data.temp !== null ? data.temp + '℃': '没有数据';
    data.humi = data.humi !== null ? data.humi + '%': '没有数据';
    data.power = data.power !== null ? data.power: '没有数据';
    data.powerType = data.powerType !== null ? data.powerType: 1;
    data.cabinetName = this.cabinetName;
    this.$node.find('.moduleList').empty().append(statusModuleJade(data));
  },
  setCurrentCabinetStatus: function() {
    var me = this,
        data = {
          settings: [
            {
              key: 'focusCabinet',
              value: me.cabinetId
            }
          ]
        };

    me.server({
      url: '/system/updatesettings',
      method: 'POST',
      data: data
    })
    .done(function() {
      me.showNoty('success', '设置成功');
    })
    .fail(function(error) {
      me.showNoty('error', '设置失败');
    })
  }
}

_.extend(CabinetStatusManagement.prototype, prototype);

module.exports = CabinetStatusManagement;
