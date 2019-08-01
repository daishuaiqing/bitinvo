/**
GridList module start
*/
'use strict';

var _ = require('lodash');
var validate = require('validator-js');
var animateCss = require("animate.css");

var ejp = require('easy-jq-plugin');
var i18n = require('locales/zh-CN.json');

var tpl = require('./main.jade');
var cell = require('./gridcell.jade');
var less = require('./main.less');
var noty = require('customnoty');

var server = require('common/server.js').server;

var GridList = function(element, conf){
  log.info('GridList has been created');
  var me = this;
  this.$node = $(element);
  this.conf = conf;
  this.updating = false;
  this.where = _.isNil(conf.where) ? {} : conf.where;
  this.total = _.isNil(conf.total) ? null : conf.total;
  this.sort = _.isNil(conf.sort) ? {} : conf.sort;
  this.skip = _.isNil(conf.skip) ? 0 : conf.skip;
  this.currentPage = _.isNil(conf.currentPage) ? 1 : conf.currentPage;
  this.limit = _.isNil(conf.limit) ? 9 : conf.limit;
  this.dataHandler = conf.dataHandler ? conf.dataHandler: null;
  this.innerTpl = conf.innerTpl ? conf.innerTpl : cell;

  this.renderer = conf.renderFn ? conf.renderFn :  function(item, innerTpl){
    if(innerTpl){
      return innerTpl(item);
    }else{
      return item;
    }
  };
  this.listSelector = '.inner-list';
  this.noSessionNeedToken = _.isNil(conf.noSessionNeedToken) ? false : conf.noSessionNeedToken;
  return this;
}

var metadata = {
  version : '0.0.1',
  name : 'gridlist',
  events : {
    'afterTotalChange' : 'gridlist.afterTotalChange',
    'cancel' : 'gridlist.cancel',
    'detaileDate': 'gridlist.detaileDate',
    'onError': 'gridlist.onError'
  }
};

var prototype = {

  init : function (){
    log.info('init GridList Component');
  },
  /**
    @params data data to show in the grid list
    @params innerTpl custom template for cell
    @params renderer determin how to render the tpl
  */
  show : function(data, innerTpl, renderer){
    var me = this;
    var $node = this.$node,
    data = _.isNil(data) ? {} : data;

    if(innerTpl){
      me.innerTpl = innerTpl;
    }

    if(renderer){
      me.renderer = renderer;
    }

    _.extend(data, {
      confirmBtnLabel : __('Confirm'),
      cancelBtnLabel : __('Cancel'),
      i18n : i18n
    });

    // create html frame
    if($node.find('.grid-list').length < 1){
      $node
      .append(tpl(data));
    }

    var $list = $node.find('.grid-list');
    this.fetch(data.where, data.sort, data.skip, data.limit);

    return this;
  },
  fetch : function(where, sort, skip, limit, url, deleteTotal){
    var $node = this.$node,
      me = this,
      limit = _.isNil(limit) ? this.limit : limit,
      skip = _.isNil(skip) ? this.skip : skip,
      where = _.isNil(where) ? this.where : where,
      sort = _.isNil(sort) ? this.sort : sort;
    if(!me.conf || !me.conf.source){
      throw new Error('No Source for grid list');
    }

    // Return if other request is wip
    if(me.updating)return;

    var $ls = me.$node.find(me.listSelector);
    if(!_.isNil(url)){
       me.conf.source.url = url;
    }
    var url = _.isFunction(me.conf.source) ? me.conf.source().url : me.conf.source.url;
    var notyInst = null;
    if(deleteTotal){
      this.total = null;
    }
    var enablePagination = _.isNil(this.total) ? true : false;
    server({
      url: url,
      data : {
        where : where,
        sort : sort,
        skip : skip,
        limit : limit
      },
      beforeSend : function(xhr){
        me.updating = true;
        $node.find('.error-report').addClass('hide');
        noty({text: '加载更多..', layout: 'topRight', timeout: 1000 });
        if(me.noSessionNeedToken) {
          xhr.setRequestHeader("Authorization", 'Token ' + btoa(me.noSessionNeedToken));
        }
      }
    }, enablePagination)
    .done(function(rs, pagination) {
      $node.find('.inner-loading').addClass('hide');
      if(pagination){
        me.total = pagination.total;
        $node.trigger(metadata.events.afterTotalChange, [pagination.total, pagination.limit, pagination.skip]);
      }
      me.limit = limit;
      me.skip = skip;
      me.where = where;
      me.sort = sort;

      me.currentPage++;
      if(rs){
        if(!_.isNil(rs.total)){
          var total = rs.data.length;
          rs = rs.data;        
        }else{
          var total = rs.length;
        }
        if(total > 0){
          $node.find('.no-data').addClass('hide');
        }else{
          $node.find('.no-data').removeClass('hide');
        }
        
        if (me.dataHandler) {
          rs = me.dataHandler(rs);
        }
        
        var htmls = [];
        _.each(rs, function(r, index){
          _.merge(r, {index : index});
          htmls.push(me.renderer(r, me.innerTpl));
        })
        $ls.html(htmls.join(''));
      }
    })
    .fail(function(error){
      var $noData = $node.find('.no-data');
      $node.find('.inner-loading').addClass('hide');
      $node.trigger('onError');
      $node.find('.inner-list').empty();
      if (!$noData.hasClass('hide')) {
        $noData.addClass('hide');
      }
      if (typeof error.responseText === 'string') {
        if (error.responseText.indexOf('"error":') > -1) {
          var errorText = JSON.parse(error.responseText).error;
          $node.find('.error-report').removeClass('hide').find('h1.error').text(errorText);
        } else {
          if (error.responseText.indexOf('Error occured while trying to proxy to:') > -1) {
            $node.find('.error-report').removeClass('hide').find('h1.error').text('服务器还未完全启动');
          } else {
            if (error.responseText.indexOf('"msg"') > -1) {
              var errorText = JSON.parse(error.responseText).msg;
              $node.find('.error-report').removeClass('hide').find('h1.error').text(errorText);
            } else {
              $node.find('.error-report').removeClass('hide').find('h1.error').text(error.responseText);
            }
          }
        }
      } else {
        $node.find('.error-report').removeClass('hide').find('h1.error').text('发生了错误');
      }
    })
    .always(function(){
      // notyInst.close();
      me.updating = false;
    })
  },
  next : function(){
    if( (this.skip + this.limit) <= this.total){
      this.fetch(null, null, this.skip + this.limit);
    }
    this.$node.trigger('onNext', [this.skip, this.total, this.limit]);
  },
  prev : function(){
    if(this.skip > this.limit){
      this.fetch(null, null, this.skip - this.limit, null, null, true);
    }else{
      this.fetch(null, null, 0, null, null, true);
    }
    this.$node.trigger('onPrev',[this.skip, this.total, this.limit]);
  },
  goto : function(page){
    this.fetch(null, page * this.limit);
  },
  refresh : function(){
    this.total = null;
    this.fetch();
  }
}

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(GridList, metadata, prototype);
/**
GridList module End
*/
