'use strict';

var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var pagination = require('paginationjs');
var server = require('common/server.js').server;
var moment = require('moment');


var violationslog = function(element, conf){
  log.info('violationsLog has been created');
  this.$node = $(element);
  this.conf = conf;
  this.limit = conf.limit || 3;                     //一页显示的信息条数
  return this;
}

var metadata = {
  version : '0.0.1',
  name: 'violationsLog'
}

var prototype = {
  init: function(){
    return this;
  },
  show: function(options){
    var me = this,
        $node = me.$node,
        $tpl = $(tpl());
    me.errorUrl = options.errorUrl;
    me.warningUrl = options.warningUrl;
    me.url = me.warningUrl;
    $node.html($tpl);
    //定义分页
    me.skip = 0;
    me.currentPage = 1;   //当前为第几页，默认为第一页
    me.total = me.limit;  //默认me.total 为me.limit
    //第一次进行渲染
    me.renderFn();

    //监听页数切换按钮的click事件
    $node.off('click').on('click', '.btn', function(e) {
      var $target = $(e.target),
          id = $target.attr('id');
      switch (id) {
        case 'prev-button':
          if(me.currentPage <= 1) {
            return;
          }
          me.currentPage --;
          me.skip -= me.limit;
          me.renderFn();
          break;
        case 'next-button':
          if(me.currentPage >= me.pagination) {
            return;
          }

          me.currentPage ++;
          me.skip += me.limit;
          me.renderFn();
          break;
        case 'error-button':
          me.url = me.errorUrl;
          me.renderFn();
          $node.find('#waring-button').removeClass('action');
          $node.find('#error-button').addClass('action');
          break;
        case 'waring-button':
          me.url = me.warningUrl;
          me.renderFn();
          $node.find('#waring-button').addClass('action');
          $node.find('#error-button').removeClass('action');
          break;
      }

    });

    return this;
  },
  setCurrentPage: function() {
    var me = this,
        $node = me.$node;
    $node.find('.page-number .page').text(me.currentPage);
  },
  renderFn: function() {
    var me = this,
        $node = me.$node,
        url = me.url + '&limit=' + me.limit + '&skip=' + me.skip;

    me.getData(url, true)
    .done(function(data, pagination) {
      var $template = me.getTemplate(data);

      $node.find(".violations-content").html($template);
      if(pagination){
        me.total = pagination.total;
        me.pagination = Math.ceil(me.total / me.limit);
        $node.find('.page-number .all-page').text(me.pagination);
      }

      me.setCurrentPage();
    })
    .fail(function(error) {
      console.log(error);
    })
  },
  getTemplate: function(data) {
    var $ul = $(document.createElement('ul'));
    var dataObj = data;
    var li = "";

    //在没有数据的时候返回
    if(!dataObj) {
      li = "<li>当前没有违规操作</li>";
      $ul.append(li);
      return $ul;
    }

    //有数据的时候
    for(var i = 0, len = dataObj.length; i < len; i++) {
      var time = moment(dataObj[i].createdAt ).format('YYYY-MM-DD HH:mm');
      var title = dataObj[i].log.replace(' ', '');
      li += "<li><span class='span-left' title=" + title + ">" + dataObj[i].log +"</span><span class='time'>" + time + "</span></li>";
    }

    return $ul.append($(li));
  },
  getData: function(url, hasTotal) {
    var me = this,
        d = new $.Deferred();
    server({
      url: url
    }, hasTotal)
    .done(function(data, pagination) {
      d.resolve(data, pagination);
    })
    .fail(function(error) {
      d.reject(error);
    });
    return d;
  }
}

module.exports = ejp.pluginize(violationslog, metadata, prototype);
