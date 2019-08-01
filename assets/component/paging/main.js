/**
 * Tab Nav
 */
'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var CSS = require('./main.less');

var Page = function(element, conf) {
  // this would never change
  this.$node = $(element);
  this.conf  = conf;
  this.pageNum = 1;
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'paging',
  events : {}
};

var prototype = {
  show : function(){
    log.debug('paging show');
    this.$node.append(tpl);
    return this;
  },
  refresh : function(skip, total, limit){
    var skip  = Number(skip);
    var total = Number(total);
    var limit = Number(limit);
    var me = this;
    if(total <= limit){
      me.$node.find('.btn[name="prev"]').addClass('btn-disabled');
      me.$node.find('.btn[name="next"]').addClass('btn-disabled');
      if (skip !== 0) {
        me.$node.find('.btn[name="prev"]').removeClass('btn-disabled');
      }
    }else if(skip === 0){
      log.debug(skip)
      me.$node.find("[name='prev']").addClass('btn-disabled');
      me.$node.find("[name='next']").removeClass('btn-disabled');
    }else if(total <= me.pageNum * limit){
      me.$node.find("[name='next']").addClass('btn-disabled');
      me.$node.find("[name='prev']").removeClass('btn-disabled');
    }else{
      me.$node.find("[name='next']").removeClass('btn-disabled');
      me.$node.find("[name='prev']").removeClass('btn-disabled');
    }
    if(total === limit * (me.pageNum - 1) && me.pageNum > total / limit){
      me.$node.trigger('CurrentPageNotData');
    }
    return this;
  },
  next : function(skip, total, limit){
    var skip  = Number(skip);
    var total = Number(total);
    var limit = Number(limit);
    var pageNum = Math.ceil((skip+limit)/limit+1),
        me = this,
        isLast = (skip + limit*2 >= total);
    this.pageNum = pageNum;
    this.$node.find('.page-number').text(pageNum);
    if(isLast) {
      me.$node.find("[name='next']").addClass('btn-disabled');
    }
    me.$node.find("[name='prev']").removeClass('btn-disabled');
    return this;
  },
  prev : function(skip, total, limit){
    var skip  = Number(skip);
    var total = Number(total);
    var limit = Number(limit);
    var pageNum = Math.ceil((skip+limit)/limit-1);
    this.pageNum = pageNum;
    this.$node.find('.page-number').text(pageNum);
    return this;
  }
};

module.exports = ejp.pluginize(Page, metadata, prototype);
/**
 * Command Hub to machine
 */
