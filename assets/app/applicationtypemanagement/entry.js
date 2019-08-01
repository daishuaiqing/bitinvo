/**
ApplicationTypeManagement module Start
*/
'use strict';

var bootstrap = require("bootstrap-webpack!../common/bootstrap.config.js");

var animateCss = require("animate.css");

var waves = require("waves");
var wavecsss = require("waves/src/less/waves.less");
var font = require('fontawesome/less/font-awesome.less');
var moment = require("moment");
var checkbox3 = require('checkbox3/dist/checkbox3.css');
var datepicker = require('datetimepicker');
var tagsinput = require('tagsinput');


var jade = require("./index.jade");
var css = require("common/less/base.less");

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

var approverCell = require('./approvercell.jade');

var edit = require('./edit.jade');

var formwork = require('formwork');

var pagestate = require('pagestate');

var breadcrumbs = require('breadcrumbs');

var flexModal = require('flexmodal');

var Promise = require("bluebird");

var server = require("common/server.js").server;

var searchbox = require('searchbox');

var ApplicationTypeManagement = function(reg){
  //inject method getIId, inject nav, push,leave
  reg.apply(this);
  log.info('ApplicationTypeManagement has been created %s', this.getIId());
  return this;
}

var metadata =  {
  NS : 'applicationtypemanagement',
  pub : [

  ],
  sub : [],
  endpoint : '/applicationtype'
}

_.extend(ApplicationTypeManagement, metadata);

var prototype = {
  init : function (){
    log.info('init ApplicationTypeManagement entry');
    //初始化一个返回按钮的回调数组
    this.backBtnFnArray = [];
  },
  destroy: function (cb) {
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
          '.search-cont'
        ]
      }
    })
    .on('state.change.after', function(e, status){

    });

    // create html frame
    $node.append(jade({
      i18nButton: __('buttonText'),
      i18n: __('applicationmanagement')
    }));
    $node.find('.edit-cont').hide().append(edit({
      i18n: __('applicationtypemanagement').form
    }));

    me.initFormwork();

    me.$node.find('.breadcrumbs-cont').breadcrumbs('show',
      2,
      [
        {name : '申请管理', target: 'javascript:void(0)'},
        {name : '申请类型管理', target: 'javascript:void(0)'},
        {name : '类型详情', target: 'javascript:void(0)'}
      ],
      false
    );

    $node.pagestate('setState', 0);

    // put modules to frame
    $node.find('.appm-comp-clock').easyClock();
    //给返回按钮添加一个默认的回调
    me.backBtnFnArray.push(function () {
      if($('body').hasClass('isSimpleapplication')){
        me.nav('/m/simpleapplication');
      }else{
        me.nav('/m/userhome');
      }
    })
    $node.find('.appm-status-bar').backBtn('show', me.backBtnFnArray);
    $node.find('.appm-action-bar').actionBar('show');

    $node.find('.leftmenu')
    .on('vmenu.afterChange', function(e, previous, next, originalEvent){
      originalEvent.preventDefault();
      var id = next.attr('id');
      switch(id){
        case 'app-list' :
          _.delay(function(){me.nav('/m/applicationmanagement')}, 250);
          break;
        case 'app-type-list' :
          _.delay(function(){me.nav('/m/applicationtypemanagement')}, 250);
          break;
        case 'approval-list' :
           _.delay(function(){me.nav('/m/approvalmanagement')}, 250);
          break;
      }
    })
    .vMenu('show',
      1,
      [
        {name : '申请总览', target: '#list', id: 'app-list', clsName : 'vlink'},
        {name : '申请类型管理', target: '#typelist', id: 'app-type-list', clsName : 'vlink'},
        {name : '授权', target: '#approvallist', id: 'approval-list', clsName : 'vlink'}
      ],
      true//clickable
    );
    //create paging
    $node.find('.paging-btn-box')
    .paging('show');

    /*
      初始化数据搜索组件
    */
    $node.find('.search-cont').searchbox('show', {
      url: '/applicationtype',
      searchKey:'name',
      searchTip: '根据类型搜索',
      gridCell: gridCell,
      i18n: __('applicationtypemanagement'),
      isBagData: false
    });
    $node.find('.search-cont')
      .on('searchComponentUpdateGridlist', function(event, appId, $node){
          //搜索结果点击进入某个gridllist详情
        me.editAppType($node, appId);
      })
      .on('searchComponentDeleteGridlist', function(e, appId, $node) {
        e.preventDefault();
        e.stopPropagation();
        noty({
          text: '正在进行删除操作，是否继续？', type: 'info', layout: 'top',
          timeout: null,
          buttons: [
            {
              addClass: 'btn btn-empty big',
              text: '确定',
              onClick: function ($noty) {
                me.deleteAppType($node, { id: appId });
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
              me.deleteAppType($node, {id: appId});
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
      me.editAppType($node, appId);
      // 进入详情页面添加返回回调
      me.backBtnFnArray.push(function () {
        me.$node.pagestate('setState', 0);
      })
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
        url : metadata.endpoint,
        data: 'data'
      },
      sort: JSON.stringify({
        "createdAt" : "DESC"
      }),
      innerTpl: function(data){
        _.merge(data, {
          moment : moment,
          i18n: __('applicationtypemanagement')
        });
        return gridCell(data);
      }, // A compiled jade template,
      renderFn : null // How to render body
    })
    .on('afterUpdate', function(){

    })
    .gridlist(
      'show'
    );


    var $modal = $('<div/>').appendTo($node)
    .flexmodal()
    .on('shown.bs.modal'/*Bootstrap event*/, function(e){
      log.debug("Open Selection");
      var $target = $(e.target);
      var $list = $target.find('.type-list').empty()
      .on('click', 'li', function(e){
        var $item = $(e.currentTarget);
        $modal.flexmodal('modalHide');
        var id = $item.data('id');
        var alias = $item.data('alias');
        if(id){
          $node.find('#approvers').tagsinput('add',
            {
              "value":id,
              "text": alias
            }
          )
          $node.find('#approvers').tagsinput('refresh');
        }
      })
      .on('afterUpdate', function(){

      })
      .list({
        source: {
          url : metadata.endpoint + '/approvers?' + 'filterUserArray=' + me.filterUserArray
        },
        innerTpl: approverCell, // A compiled jade template,
        renderFn : null // How to render body
      });
      $list.list('show');
    });

    $node.find('#approvers').tagsinput({
      maxTags: 10,
      tagClass: function(item) {
        // switch (item.searchType) {
          // case 'name'   : return 'label label-primary';
          // case 'uid'  : return 'label label-danger label-important';
          // case 'status': return 'label label-success';
          // case 'businessName': return 'label label-success';
        // case 'Africa'   : return 'label label-default';
        // case 'Asia'     : return 'label label-warning';
          // default :
            return 'approver-item';
        // }
      },
      itemValue: 'value',
      itemText: 'text',
      freeInput: false
    });
    $node.on('click', '#addApprover', function(){
      me.filterUserArray = JSON.stringify($node.find('#approvers').val());
      $modal
      .flexmodal('show',
        {
          modalTitle : '请选择审核人员'
        },
        require('./typelist.jade')
      );
    });

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
          log.debug('prev page');
          $node.find('.list-cont').gridlist('prev');
        },
        next : function(){
          log.debug('next page');
          $node.find('.list-cont').gridlist('next');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    })


    waves.attach($node.find('.panel'), ['waves-block']);
    waves.attach($node.find('.big-btn-cont'), ['waves-block']);
    waves.init();

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
              return '审核名称不能为空';
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
        '[name="type"]': {
          name: 'type',
          init : function(){
            return this;
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
              log.debug('Type invalid');
              return '不能为空';
            }else{
              return null;
            }
          }
        },
        '#approvers' : {
          name: 'approvers',
          init: function(){

          },
          refresh : function(value, originalData){
            var $tags = $node.find('#approvers');
            $tags.tagsinput('removeAll');
            if(originalData.approverOption == 'single'){
              return;
            }
            var approvers = originalData.approvers;
            if(approvers && approvers.length > 0){
              _.each(approvers, function(approver){
                $tags.tagsinput('add', {
                  value : approver.id,
                  text : approver.alias
                })
              });
            }
          },
          reset : function(){
            var $tags = $node.find('#approvers');
            $tags.tagsinput('removeAll');
            $(this).parents('#approversGroup').addClass('hide');
          },
          validate : function(value, newData){
            if(_.isEmpty($(this).val())  && newData.approverOption === 'arbitary'){
              log.debug('Approver invalid');
              return '还没有指定审核人， 请添加';
            }else{
              return null;
            }
          },
          val : function(value, originalData){
            var $approverOption = $editform.find('[name="approverOption"]:checked');
            if( $approverOption.val() !== 'arbitary'){
              return [];
            }
            return $(this).val();
          }
        },
        '[name="approverOption"]': {
          name: 'approverOption',
          init : function(){
            $(this).on('click', function(e){
              if($(this).prop("checked")){
                var value = $(this).val();
                switch (value){
                  case 'single':
                  case 'none':
                    $editform.find('#voteTypeGroup').addClass('hide');
                    $editform.find('#approversGroup').addClass('hide');
                    $editform.find('#approversGroup').find('#approvers').tagsinput('removeAll');
                    $editform.find('[name="voteType"]').attr("checked", null).prop("checked", null);
                  break;
                  case 'arbitary':
                    $editform.find('#voteTypeGroup').removeClass('hide');
                    $editform.find('#approversGroup').removeClass('hide');
                    $editform.find('#affirmative').attr("checked", "checked").prop("checked", "checked");
                  break;
                }
              }
            });
            return this;
          },
          refresh: function(value, data){
            $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
            if(value){
              $('#' + value).attr("checked", 'checked').prop("checked", "checked");
              switch (value){
                case 'single':
                case 'none':
                  $editform.find('#voteTypeGroup').addClass('hide');
                  $editform.find('#approversGroup').addClass('hide');
                  $editform.find('#approversGroup').find('#approvers').tagsinput('removeAll');
                  $editform.find('[name="voteType"]').attr("checked", null).prop("checked", null);
                break;
                case 'arbitary':
                  $editform.find('#voteTypeGroup').removeClass('hide');
                  $editform.find('#approversGroup').removeClass('hide');
                  $editform.find('#affirmative').attr("checked", "checked").prop("checked", "checked");
                break;
              }
            }else{
              $(this).first().attr("checked", 'checked').prop("checked", "checked");
            }
          },
          validate : function(value, newData){
            if(!$(this).is(':checked') || $(this).val() === ''){
              log.debug('approverOption invalid');
              return '审核方式不能为空';
            }else{
              return null;
            }
          }
        },
        '#remote': {
          name: 'remote',
          refresh: function(value, data) {
            if (value) {
              $(this).prop('checked', 'checked');
            } else {
              $(this).prop('checked', null);
            }
          },
          val: function(value, data) {
            if($(this).prop('checked')){
              return true;
            }else{
              return false;
            }
          },
        },
        '[name="voteType"]': {
          name: 'voteType',
          init : function(){
            return this;
          },
          reset : function(){
            $(this).parents('#voteTypeGroup').addClass('hide');
          },
          refresh: function(value, data){
            $(this).parents('.form-group').find(':radio').attr("checked", null).prop("checked", null);
            $(this).attr("checked", 'checked').prop("checked", "checked");
            if(value){
              $('#' + value).attr("checked", 'checked').prop("checked", "checked");
            }
          },
          validate : function(value, data){
            if($('[name="approverOption"]').is(':checked')){
              if( data.approverOption === 'arbitary' && !$(this).is(':checked') || $(this).val() === ''){
                log.debug('Type invalid');
                return '决策方式不能为空';
              }else{
                return null;
              }
            }
            else{
              return null;
            }
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
      noty({text: __('Something is wrong').replace('%s', errors.join(',')), type: 'error', timeout:5000});
    })
    .on(metadata.NS + '.form.submit', function(e, data){

      me.submitApp(data);
    })
    .formwork('init');
  },
  editAppType : function($node, id){
    var $node = this.$node;
    var notyInst = null;
    server({
      url : metadata.endpoint + '?populate=approvers',
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
  deleteAppType : function($node, data){
    log.debug('Delete New Application Type');

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

    if (data.voteType === 'both' && data.approvers.length < 2) {
      return noty({text: '任意两人通过，审核人员至少要两个', type: 'error', layout: 'top', timeout: 2000});
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

      noty({text: '创建成功', type: 'success', timeout:5000, layout: 'topRight'});
      me.$node.find('.list-cont')
      .gridlist(
        'refresh'
      );
      me.backBtnFnArray.splice(1);
      me.$node.pagestate('setState', 0);
    })
    .fail(function(err){
      log.debug(err, 'error');
      if(err.responseText){
        var error = JSON.parse(err.responseText).error;
        noty({text: error, type: 'error', timeout:5000});
        return;
      }
      noty({text: err.responJSON.error, type: 'error', timeout:5000});
    })
    .always(function(){
      notyInst.close();
    })
  }
}

_.extend(ApplicationTypeManagement.prototype, prototype);
module.exports = ApplicationTypeManagement;
/**
ApplicationTypeManagement module end
*/
