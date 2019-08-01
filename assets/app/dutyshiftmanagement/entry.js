/**
DutyShiftManagement module Start
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
var i18n = require('locales/zh-CN.json');

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

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var server = require("common/server.js").server;

var fullcalendar = require('fullcalendar/dist/fullcalendar.js')
require('fullcalendar/dist/fullcalendar.css')

var DutyShiftManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('DutyShiftManagement has been created');
  return this;
}

var metadata =  {
  NS : 'dutyshiftmanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/dutyshift'
}

_.extend(DutyShiftManagement, metadata);

var prototype = {
  init : function (){
    log.info('init DutyShiftManagement entry');
    this.isSecondLoadFullcalendar = false;
    //backBtn组件的回调参数
    this.backBtnFnArray = [];
    this.fullcalendarLimit = 6;
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
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(jade({
      i18n: __('usermanagement')
    }));
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('dutyshiftmanagement'),
      i18nButton: __('buttonText')
    }));

    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {
          name: __('dutyshiftmanagement').userList,
          target: 'javascript:void(0)'
        },
        {
          name: __('dutyshiftmanagement').dutyshiftmanagement,
          target: 'javascript:void(0)'
        },
        {
          name: __('dutyshiftmanagement').dutyshiftUserDetail,
          target: 'javascript:void(0)'
        }
      ],
      false
    );

    $node.pagestate('setState', 0);

    // put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    // 设置默认的返回按钮回调
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
      1,
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

    $node.find('.list-cont')
    .gridlist({
      source: {
        url : metadata.endpoint + '?populate=user',
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
    // .gridlist(
    //   'show'
    // );

    $node.find('.list-cont')
    .on('click', '.approve-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Update Status to APPROVED app %s', appId);
      me.updateShift($node, appId, {status: 'approved'});
    })
    .on('click', '.delete-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Delete application with id %s', appId);
      me.deleteShift($node, {id: appId});
    })
    .on('click', '.grid-list-cell', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Update Status to APPROVED app %s', appId);
      me.editShift($node, appId);
    });
    var actions = [
      {
        name: __('buttonText').removeBtn,
        target: function () {
          $node.triggerHandler('deleteShift');
        },
        id: 'actionsRemoveButton'
      },
      {
        name : __('buttonText').cancelBtn,
        target: function(){
          $node.pagestate('setState', 0);
          me.backBtnFnArray.splice(me.backBtnFnArray.length - 1, 1);
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
          me.startTime = null;
          me.endTime = null;
          var $editform = $node.find('form');
          $editform.formwork('clear');
          $node.pagestate('setState', 1);
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
    me.getFullcalendarData()
  },
  getFullcalendarData: function () {
    var me = this;
    var next_6_day = moment().add(me.fullcalendarLimit, 'days').format('YYYY-MM-DD');
    var prev_6_day = moment().subtract(me.fullcalendarLimit, 'days').format('YYY-MM-DD');
    this.server({
      url: metadata.endpoint + '?populate=user&where={"start":{">=":"' + prev_6_day + '","<=":"' + next_6_day + '"}}',
      method: 'GET'
    })
    .done(function (data) {
      var newData = []
      _.map(data, function (item) {
        var newItem = {}
        newItem.title = '值班人员：' + item.user.alias
        newItem.start = moment(item.start)
        newItem.end = moment(item.end)
        newItem.id = item.id
        newItem.color = '#5f4c9d'
        newData.push(newItem)
      })
      if (me.isSecondLoadFullcalendar) {
        me.initFullcalendar(newData)
        me.secondLoadFullcalendar(newData)
      } else {
        me.initFullcalendar(newData)
        me.isSecondLoadFullcalendar = true;
      }
    })
    .fail(function (err) {
      console.log(err)
    })
  },
  secondLoadFullcalendar: function (data) {
    var $node = this.$node;
    var newItem = {};
    newItem.start = moment(data.start)
    newItem.end = moment(data.end)
    newItem.id = data.id
    newItem.color = '#5f4c9d'
    server({
      url: '/user?where={"id": "'+ data.user +'"}'
    })
    .done(function(data){
      newItem.title = '值班人员：' + data[0].alias;
      $node.find('#calendar').fullCalendar('renderEvent', newItem)
    })

  },
  initFullcalendar: function (data) {
    var me = this,
        $node = me.$node;
		me.$node.find('#calendar').fullCalendar({
      monthNames: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
      monthNamesShort: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
      dayNames: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      dayNamesShort: ['日', '一', '二', '三', '四', '五', '六'],
      buttonText: {
          today: "今天",
          month: "月",
          week: "周",
          day: "日"
      },

      dataFormat: 'yy--mm--dd',
      hourMini: 5,
      hourMax: 23,
      hourGrid: 3,
      minuteGrid: 15,
      timeText: '时间',
      hourText: '时',
      minuteText: '分',
      timeOnlyTitle: '选择时间',

      eventLimit: 3,
      defaultView: 'agendaWeek',
      firstDay: 0,
      locale: 'zh-CN',
      allDayText: "全天",
      timeFormat: 'HH:mm',
      duration: {
        days: 1,
        hours: 23,
        minutes:59
      },
      slotLabelFormat: 'hh:mm a',
      views: {
        agenda: {
          eventLimit: 3
        },
        week: {
          titleFormat: 'YYYY年MMMM月DD日'
        },
        day: {
          titleFormat: 'HH:mm'
        }
      },
      header: {
				left: 'prev,next today',
				center: 'title',
				right: 'agendaWeek,agendaDay'
			},
			editable: false,
			events: data,
      eventClick: function (calEvent, jsEvent, view) {
        var id = calEvent.id;
        me.editShift($node, id);
        me.$node.find('#actionsRemoveButton').removeClass('hide');
        me.$node
        .off('deleteShift')
        .on('deleteShift', function () {
          me.deleteShift(me.$node, {id: id}, calEvent)
        });

        // 进入详情页面，给返回按钮添加新的回调
        me.backBtnFnArray.push(function () {
          me.$node.pagestate('setState', 0);
        });
      },
      dayClick: function (date, allDay, jsEvent, view) {
        var currTime = new Date().getTime();
        var clickTime = new Date(date._d).getTime();
        var currDate =  new Date(currTime).getDate();
        var clickDate = new Date(clickTime).getDate();
        if (clickTime < currTime && currDate !== clickDate) {
          noty({text: '过去时间，不能添加值班人', type: 'error', layout: 'topRight'});
          return;
        }
        me.$node.find('#actionsRemoveButton').addClass('hide');
        var $editform = $node.find('form');
        $editform.formwork('clear');
        var data = {
          start: date,
          end: date
        }
        $editform.formwork('refresh', data);
        $node.pagestate('setState', 1);

        // 进入详情页面，给返回按钮添加新的回调
        me.backBtnFnArray.push(function () {
          me.$node.pagestate('setState', 0);
        });
      }
		});
    $('button.fc-prev-button').click( function () {
      me.clickArrowHandler();
    });
    $('button.fc-next-button').click(function(){
      me.clickArrowHandler();
    });
  },
  clickArrowHandler: function () {
    var _moment = $('#calendar').fullCalendar('getDate'),
        _startTime = _moment.format('YYYY-MM-DD'),
        _endTime = _moment.add(7, 'days').format('YYYY-MM-DD'),
        me = this;
    me.server({
      url: metadata.endpoint + '?populate=user&where={"start":{">=":"' + _startTime + '","<=":"' + _endTime + '"}}',
      method: 'GET'
    })
    .done(function (data) {
      var newData = []
      _.map(data, function (item) {
        var newItem = {}
        newItem.title = '值班人员：' + item.user.alias
        newItem.start = moment(item.start)
        newItem.end = moment(item.end)
        newItem.id = item.id
        newItem.color = '#5f4c9d'
        newData.push(newItem)
      })
      me.$node.find('#calendar').fullCalendar('renderEvents', newData)
    })
  },
  initFormwork: function(){
    var me = this;
    var $node = me.$node;
    var $editform = $node.find('form');
    var minDate = moment(new Date()).format('YYYY-MM-DD');
    me.formwork = $editform.formwork({
      namespace : metadata.NS, //use current comp's name as namespace
      fields : {
        '#start': {
          name: 'start',
          init: function(){
            var $me = $(this);
            var objID = $me.attr('id');
            var $modal = $('<div class="' + objID + '">').appendTo($node)
            .flexmodal({IsSureBtn: true})
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              if($me.val()){
                if(moment($me.val()) < moment(new Date())){
                  var defaultDate = moment(new Date(new Date().getTime() + 120001));
                }else{
                  var defaultDate = moment($me.val());
                }
                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    minDate: new Date(),
                    sideBySide: true,
                    inline: true,
                    defaultDate: defaultDate
                  });
              }else{
                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    minDate: new Date(),
                    sideBySide: true,
                    inline: true
                  });
              }
            })
            .on('onOk', function(){
              var timeValue = $modal.find('.time-box').data().date;
              if(me.endTime && moment(timeValue) > moment(me.endTime)){
                noty({text: '开始时间不能大于结束时间', type: 'error', layout: 'top', timeout: '3000'});
                return;
              }else if(moment(timeValue) < moment(new Date())){
                noty({text: '当前时间不能小于结束时间', type: 'error', layout: 'top'});
                return;
              }
              $me.val(timeValue);
              $modal.flexmodal('modalHide');
              me.startTime = timeValue;
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
          },
          validate : function(){
            var thisTime = moment(new Date($(this).val()));
            var currTime = moment(new Date());
            if(thisTime === ''){
              log.debug('Get Gun Date Invalid');
              return '值班开始日期不能为空';
            }else if(thisTime < moment(new Date())){
              return '开始时间不能小于当前时间';
            }else{
              return null;
            }
          }
        },
        '#end': {
          name: 'end',
          init: function(){
            var $me = $(this);
            var objID = $me.attr('id');
            var $modal = $('<div class="' + objID + '">').appendTo($node)
            .flexmodal({IsSureBtn: true})
            .on('shown.bs.modal'/*Bootstrap event*/, function(e){
              log.debug($me.val())
              if($me.val()){
                if(moment($me.val()) < moment(new Date())){
                  var defaultDate = moment(new Date(new Date().getTime() + 600001));
                }else{
                  var defaultDate = moment($me.val());
                }
                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    sideBySide: true,
                    inline: true,
                    defaultDate: defaultDate
                  });
              }else{
                $node.find('.time-box').datetimepicker({
                    locale: 'zh-CN',
                    format: 'YYYY-MM-DD HH:mm',
                    minDate: new Date(),
                    sideBySide: true,
                    inline: true
                  });
              }
            })
            .on('onOk', function(){
              var timeValue = $modal.find('.time-box').data().date;
              if( me.startTime && moment(me.startTime) > moment(timeValue)){
                noty({text: '结束时间不能小于开始时间', type: 'error', layout: 'top', timeout: '3000'});
                return;
              }
              $me.val(timeValue);
              $modal.flexmodal('modalHide');
              me.endTime = timeValue;
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
          },
          validate : function(){
            var startTime = moment(me.startTime);
            var thisTime = moment(new Date($(this).val()));
            if(thisTime === ''){
              log.debug('Return Date invalid');
              return '值班结束日期不能为空';
            }else if(thisTime < startTime){
              return '结束时间不能小于开始时间'
            }else{
              return null;
            }
          }
        },
        '#userText': {
          name: 'userText',
          exclude : true,
          validate: function(){
            if($(this).val() === ''){
              return '值班人员不能为空'
            }
          },
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
                  $editform.find('#userText').val(name);
                  $editform.find('#user').val(id);
                  $editform.find('#userClearBtn').removeClass('hide');
                }
              })
              .on('afterUpdate', function(){

              })
              .list({
                source: {
                  url : '/applicationtype/approvers?filterUserArray=[]'
                },
                limit: 5,
                innerTpl: typeListCell, // A compiled jade template,
                renderFn : null // How to render body
              });
              $list.list('show');
            });

            $node.on('click', '#userClearBtn', function(e){
              e.preventDefault();
              $editform.find('#userText').val(null);
              $editform.find('#user').val(null);
              $editform.find('#userClearBtn').addClass('hide');
            });

            $(this).on('click', function(){
              $modal
              .flexmodal('show',
                {
                  modalTitle : '请选择值班人员'
                },
                require('./typelist.jade')
              );
            });
          },
          refresh: function(value, data){
            if(data && data.user){
              $(this).val(data.user.alias ? data.user.alias : data.user.username);
              $('#userClearBtn').removeClass('hide');
            }else{
              $(this).val(null);
              $('#userClearBtn').addClass('hide');
            }
          }
        },
        '#user': {
          name : 'user',
          refresh: function(value, data){
            if(data && data.user)
              $(this).val(data.user.id);
          }
        },
        '#name' : {
          name : 'name',
          validate : function(value, data){
            if($(this).val() === ''){
              log.debug('Name invalid');
              return '值班人不能为空';
            }else{
              return null;
            }
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
      me.submitApp(data);
    })
    .formwork('init');
  },
  editShift : function($node, id){
    var $node = this.$node;
    var notyInst = null;
      server({
        url : metadata.endpoint + '?populate=user',
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
  updateShift : function($node, id, data){
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
  deleteShift : function($node, data, allData){
    log.debug('Delete New Application');
    log.debug(data);
    if(!data) return;
    if (allData.start < new Date()) {
      noty({text: '开始时间为过去时间，不允许删除！', type: 'error'});
      return;
    }
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
      me.nav('/m/dutyshiftmanagement');
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
    if (data.end === data.start) {
      noty({text: '开始时间和结束时间不能相同', type: 'error', layout: 'top'});
      return;
    } else if (data.end < data.start) {
      noty({text: '结束时间不能小于开始时间', type: 'error', layout: 'top'});
      return;
    }
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
      data: data, //_(data).omitBy(_.isUndefined).omitBy(_.isNull).omitBy(_.isEmpty).omit('id').value(),
      dataType: dataType,
      beforeSend : function(){
        notyInst = noty({text: '正在保存', type: 'info', layout: 'topRight'});
      }
    }).done(function(data){
      noty({text: '创建成功', type: 'success', timeout:5000, layout: 'topRight'});
      me.$node.find('.list-cont')
      .gridlist(
        'refresh'
      );
      //添加成功后会自动返回该页面，清除上一个返回的回调
      me.backBtnFnArray.splice(me.backBtnFnArray.length - 1, 1);
      //更新值班表
      me.secondLoadFullcalendar(data)
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      if(err.status == 400){
        if(err.responseJSON && err.responseJSON.error){
          noty({text: err.responseJSON .error, type: 'error', timeout:5000});
        }
      }
    })
    .always(function(){
      notyInst.close();
    })
  }
}

_.extend(DutyShiftManagement.prototype, prototype);
module.exports = DutyShiftManagement;
/**
DutyShiftManagement module end
*/
