/**
List module start
*/
'use strict';

var _ = require('lodash');
var animateCss = require("animate.css");

var ejp = require('easy-jq-plugin');
var i18n = require('locales/zh-CN.json');
var noty = require('customnoty');

var tpl = require('./main.jade');
var cell = require('./cell.jade');
var less = require('./main.less');
var paginationjs = require('paginationjs');
var server = require('common/server.js').server;
/**
 * 初始化 参数在Source这个Object中
 * @param source.url (String) 请求路径，传入时将会请求后填充列表
 * @param source.data (Array)
 * @param innerTpl 使用的模板页
 * @param renderFn 渲染Function
 */
var List = function(element, conf){
  log.info('List has been created');
  this.$node = $(element);
  this.conf = conf;
  this.updating = false;
  this.results = {};
  this.filters = {};
  this.lastItems = [];
  this.currentPage = 1;
  this.currentLimit = conf.limit || 5;
  this.sourceURL = conf.source.url || '';
  this.sourceData = conf.source.data || [];
  this.currentPageNumber = 1;
  this.noSessionNeedToken = conf.source.noSessionNeedToken || false;
  this.skip = 0;
  this.innerTpl = conf.innerTpl ? conf.innerTpl : cell;
  this.renderer = conf.renderFn ? conf.renderFn :  function(item, innerTpl){
    if(innerTpl){
      return innerTpl(item);
    }else{
      return item;
    }
  };

  this.listSelector = '.list-placeholder';

  return this;
}

var metadata = {
  version : '0.0.1',
  name : 'list',
  events : {
    'afterTotalChange' : 'list.afterTotalChange',
    'cancel' : 'list.cancel',
    'onError': 'list.cancel'
  }
};

var prototype = {
  init : function (){
    log.info('init List Component');
  },
  //
  show : function(data, innerTpl, renderer){
    var me = this;
    var $node = this.$node;
    data = data ? data : {};
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
    $node
    .off('click', '.action-btn')
    .on('click', '.action-btn', function(e){
      e.preventDefault();
      var id = $(this).attr('id');

      switch(id) {
          case 'cancel':
            $node.trigger(metadata.events.cancel);
            break;
          case 'confirm':
            $node.trigger(metadata.events.confirm);
            break;
          default:
            break;
      }
    })
    .off('click', '.prev-btn')
    .on('click', '.prev-btn', function(e){
      me.prev();
    })
    .off('click', '.next-btn')
    .on('click', '.next-btn', function(e){
      me.next();
    })
    .append(tpl(data));
    if(!me.conf.source.url && me.conf.source.data && me.conf.source.data.length > 0){
      //Local Render, Use For Restart
      var data = me.conf.source.data;
      var $ls = me.$node.find(me.listSelector);
      var htmls = [];
      _.each(data, function(r){
        htmls.push(me.renderer(r, me.innerTpl));
      })
      $ls.html(htmls.join(''));
    }else{
      this.fetch();
    }
    return this;
  },
  fetch : function(items, page, limit, skip, where, sort){
    log.debug('############list fetch ########')
    var $node = this.$node,
        me = this,
    limit = _.isNil(limit) ? me.currentLimit : limit,
    skip = _.isNil(skip) ? me.skip : skip,
    where = _.isNil(where) ? me.where : where,
    sort = _.isNil(sort) ? me.sort : sort;
    if(!me.conf || !me.conf.source){
      throw new Error('No Source for list');
    }

    // Return if other request is wip
    if(me.updating)return;

    me.items = items ? items : [];
    me.page = page ? page : 1;

    me.limit = limit ? limit : me.currentLimit;

    me.filters = {};

    var $ls = me.$node.find(me.listSelector);

    //cosntruct filters
    _.each(items, function(item){
        filters[item.searchType] = '%'+item.originValue+'%';
    })

    var isAppend = true;
    if(me.currentPage < page){
        isAppend = true;
        me.currentPage = page;
    }else if (me.currentPage > page){
        isAppend = false;
        me.results = {};
        me.currentPage = page;
    }else{// equal
        if(me.currentPage !== 1){
            return;
        }else{
            isAppend = false;
        }
    }

    var defaultParams = {
      where : where,
      skip  : skip,
      limit : limit,
      sort  : sort
    }

    var params = _.isFunction(me.conf.data) ? me.conf.data() : me.conf.data;//'/promotion/list/json';
    var url = _.isFunction(me.conf.source) ? me.conf.source().url : me.conf.source.url;

    params = _.merge(params, defaultParams);

    var enablePagination = _.isNil(this.total) ? true : false;
    // var params = {
    //     filters : me.filters,
    //     fields: [],
    //     sorts:{"id":"DESC"},
    //     page: me.page,
    //     limit: me.limit
    // }
    var notyInst = null;
    me.updating = true;
    server({
        url: url,
        data : params,
        beforeSend : function(xhr){
          if(me.noSessionNeedToken){
            xhr.setRequestHeader("Authorization", 'Token ' + btoa(me.noSessionNeedToken));
          }
          $node.find('.error-report').addClass('hide');
          noty({text: '加载更多..', layout: 'topRight', timeout: 1000});
        }
    }, enablePagination)
    .done(function(rs, pagination) {
      if(pagination){
        var _paginationTotal = Number(pagination.total);
        var _paginationLimit = Number(pagination.limit);

        me.total = _paginationTotal;
        me.totalPages = Math.ceil(_paginationTotal / _paginationLimit);
        if(_paginationTotal <= _paginationLimit){
          $node.find('.pager-btn-box').addClass('hide');
        }else{
          $node.find('.pager-btn-box').removeClass('hide');
        }
      }

      if(rs){
        var total = rs.length;

        $(this).trigger(metadata.events.afterTotalChange, [total]);

        if(total == 0){
          $('.not-data').removeClass('hide');
        }else{
          $('.not-data').addClass('hide');
        }
        if(total > me.page * me.limit){
            //$('#promotion-list-more').show();
        }else{
            //$('#promotion-list-more').hide();
        }

        // template method of yourself
        var htmls = [];
        _.each(rs, function(r){
          me.results[r.id] = r;
          htmls.push(me.renderer(r, me.innerTpl));
        })
        if(isAppend){
          $ls.append(htmls.join(''));
        }else{
          $ls.html(htmls.join(''));
        }

      }
    })
    .fail(function(error){
      $node.find('.error-report').removeClass('hide').find('h1.error').text('发生了错误');
      $node.find('.pager-btn-box').addClass('hide');
      $node.trigger('onError');
    })
    .always(function(){
        $node.find('.inner-loading').addClass('hide');
        // notyInst.close();
        me.updating = false;
    })
  },
  next: function(){
    var me = this,
      total = me.total;
    me.$node.find('.prev-btn').removeClass('disabled');
    me.currentPageNumber ++;
    if(me.currentPageNumber <= me.totalPages){
      if(me.currentPageNumber === me.totalPages){
        me.$node.find('.next-btn').addClass('disabled');
      }
      me.skip += me.limit;
      me.fetch();
    }else{
      me.pageNum--;
      me.$node.find('.next-btn').addClass('disabled');
    }
  },
  prev: function(){
    var me = this,
        total = me.total;
    me.$node.find('.next-btn').removeClass('disabled');
    me.currentPageNumber--;
    if(me.currentPageNumber >= 1){
      if(me.currentPageNumber === 1){
        me.$node.find('.prev-btn').addClass('disabled');
      }
      me.skip -= me.limit;
      me.fetch();
    }else{
      me.$node.find('.prev-btn').addClass('disabled');
    }
  },
  refresh : function(){
    this.fetch();
  }
}

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(List, metadata, prototype);
/**
List module End
*/
