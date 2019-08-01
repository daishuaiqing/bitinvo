/**
search module start
*/
'use strict';

var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var gridCell = require('./gridlist.jade');
var keypad = require('keypad');


var SearchBox = function(element, conf){
  log.info('SearchBox has been created');
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version : '0.0.1',
  name : 'searchbox'
};

var prototype = {
  init : function (){
    log.info('init SearchBox Component');
  },
  show : function(options){
    var me = this;
    var $node = this.$node;
    var url = options.url;
    var searchKey = options.searchKey;
    var isShowSearchList = false;
    var searchTip = options.searchTip || '';

    me.updateSearchListHandle = options.updateSearchListHandle;
    me.gridCell = options.gridCell || gridCell;
    me.gridCellData = options.gridCellData || {};
    me.tipsKey = options.tipsKey || options.searchKey;
    //为了控制外面传入的gridlist模板以data.id形式渲染数据
    me.isBagData = options.isBagData || false;
    me.noData = options.noData || null;
    //自定义的特殊URL
    me.specialURL = options.specialURL || false;
    me.searchUsername = options.searchUsername || false;
    me.i18n = options.i18n || {};
    // create html frame
    $node
    .append(tpl());

    //添加搜索字段提示
    $node.find('#search-input').attr('placeholder', searchTip);

    $node.find('#search-input').keypad('init');

    var $input = $node.find("#search-input");
    // 输入的时候进行模糊搜索
    $input.on('keyup', function(){
      if (me.specialURL) return;
      var searchUrl = me.getUrl($input, url, searchKey);
      var promise = me.getSearchData(searchUrl)
      promise.done(function(data){
        // 模糊搜索提示改变UI
        me.updateSearchList(data);
      })
      .fail(function(){
        log.debug('获取数据失败')
      })

    });
    //点击按钮对input的value进行搜索#########################################
    $node.find('#search-button')
      .on('click', function(){
        var searchString = $input.val();
        if (!searchString) {
          me.updateSearchListCont([], false);
          return;
        }
        //添加历史记录
        me.setHistory(searchString);
        var searchUrl = me.getUrl($input, url, searchKey);
        var promise = me.getSearchData(searchUrl);
        promise.done(function(data){
          //更新该gridlist列表
          if(me.specialURL){
            data = data.data
          }
          me.updateSearchListCont(data);
        })
        .fail(function(){
          var data = []
          me.updateSearchListCont(data);
        })
        //进行最终的搜索

      });

    $node.find('#search-input').focus(function(){
      if (me.specialURL) return;
      $node.find('.search-tips-cont').removeClass('hide');
    });

    //点击的进行准确搜索
    $('body').on('click', function(e){
      var $target = $(e.target);
      if($target.attr('id') === 'search-input'){
        if(!$target.val()){
          var defaultData = me.getInitialValue();
          if(defaultData){
            me.updateSearchList(defaultData, true);
          }
        }
      }else if($target.attr('class') === 'search-result-li'){
        var data = $target.data('value');
        // 获取提示的key赋值给input的value
        $input.val(data);
        $node.find('.search-tips-cont').addClass('hide');
      }else{
        $node.find('.search-tips-cont').addClass('hide');
      }

    })
    .off('kekpadComponentUpdateTexts')
    //监听虚拟键盘插入值的事件
    .on('kekpadComponentUpdateTexts', function(){
      if (me.specialURL) return;
      var searchUrl = me.getUrl($input, url, searchKey);
      var promise = me.getSearchData(searchUrl)
      promise.done(function(data){
        // 模糊搜索提示改变UI
        me.updateSearchList(data);
      })
      .fail(function(){
        log.debug('获取数据失败')
      })
    });

    $node.find('.search-list-cont')
    .on('click', '.delete-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Delete application with id %s', appId);
      $node.trigger("searchComponentDeleteGridlist", [appId, $node]);
    })
    .on('click', '.enable-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var userId = $(this).parents('.grid-list-cell').data('id');
      $node.find('.is-enable-btn').addClass('hide');
      $node.find('.is-disable-btn').removeClass('hide');
      $node.trigger("searchComponentEnable", [userId, $node]);
    })
    .on('click', '.disable-btn', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var userId = $(this).parents('.grid-list-cell').data('id');
      $node.find('.is-enable-btn').removeClass('hide');
      $node.find('.is-disable-btn').addClass('hide');
      $node.trigger("searchComponentDisable", [userId, $node]);
    })
    .on('click', '.grid-list-cell', function(e){
      e.preventDefault();
      e.stopPropagation();
      var $node = $(e.currentTarget);
      var appId = $node.data('id');
      log.debug('Update Status to APPROVED app %s', appId);
      $node.trigger("searchComponentUpdateGridlist", [appId, $node]);
    });


    return this;

  },
  getUrl: function($input, url, searchKey){
    var inputValue = $input.val();
    var hasQuestion = url.indexOf('?');
    var searchUrl = "";
    var me = this;

    if (me.specialURL) {
      if (hasQuestion) {
        searchUrl = url + '&' + searchKey + '=' + inputValue;
      } else {
        searchUrl = url + '?' + searchKey + '=' + inputValue;
      }
      return searchUrl;
    }

    if(me.noData){
      if(hasQuestion){
        searchUrl = url + '&where={' + me.noData[0] +  inputValue + me.noData[1] + '}&limit=9';
      }else{
        searchUrl = url + '?where={' + me.noData[0] +  inputValue + me.noData[1] + '}&limit=9';
      }
    }else{
      if(hasQuestion > 0){
        searchUrl = url + '&where={"' + searchKey +'":{"contains":"'  + inputValue + '"}}&limit=9';   //必须把key、value用引号引起来
      }else{
        searchUrl = url + '?where={"' + searchKey +'":{"contains":"'  + inputValue + '"}}&limit=9';
      }
    }
    if (me.searchUsername) {
      searchUrl= url + '&where={"' + searchKey +'":{"contains":"'  + inputValue + '", "!":"8888"},"isDummy":"false"}&limit=9';
    }
    return searchUrl;
  },
  /*
    以gridlist的方式列出最多9条搜索结果
  */
  updateSearchListCont: function(data){
    var $node = this.$node;
    var me = this;
    var $gridlistBox = $("<div class='grid-list'></div>");
    var dataLen = data.length;
    var jadeData = {};

    //$gridlistBox.empty();
    if(!dataLen) {
      var noContent = '<div class="col-sm-6 col-md-offset-2 mrgT60"><h1 class="text-center">找不到您需要的数据！</h1></div>'
      $gridlistBox.append(noContent);
    } else {
      for(var i = 0; i < dataLen; i++){
        data[i].index = i;
        if(me.isBagData){
          var jadeData = { data: data[i] };
          jadeData = _.merge(jadeData, {
            i18n: me.i18n
          }, me.gridCellData);
          $gridlistBox.append(me.gridCell(jadeData));
        }else{
          jadeData = _.merge(data[i], {
            i18n: me.i18n
          }, me.gridCellData);
          $gridlistBox.append(me.gridCell(jadeData));
        }
      }
    }
    $node.find('.search-list-cont').empty().append($gridlistBox);
  },
  getInitialValue: function(){
    var historySearch = null;
    if(localStorage.getItem('SEARCH_HISTORY')){
      historySearch = localStorage.getItem('SEARCH_HISTORY').split(',');
      return historySearch;
    }else{
      return null;
    }
  },
  setHistory: function(searchString){
    //创建一个存历史搜索记录的localStorage
    var ArrayHistory = [];
    if(!localStorage.getItem('SEARCH_HISTORY')){
      localStorage.setItem('SEARCH_HISTORY', '历史记录');
    }else{
      ArrayHistory = localStorage.getItem('SEARCH_HISTORY').split(',');
      if(ArrayHistory.length > 10){
        localStorage.removeItem('SEARCH_HISTORY');
        ArrayHistory = [];
      }
    }

    var len = ArrayHistory.length;
    var isAdd = 0;
    if(len){
      for(var i = 0; i < len; i++){
        if(ArrayHistory[i] === searchString){
          isAdd++;
        }
      }
    }
    if(!isAdd){
      var search_history_value = localStorage.getItem('SEARCH_HISTORY');
      var historySearchInfo = search_history_value ? search_history_value + ',' + searchString : searchString
      localStorage.setItem('SEARCH_HISTORY', historySearchInfo);
    }
  },
  updateSearchList: function(data, isDefaultData){
    if (this.specialURL) {
      data = data.data
    }
    //判断是否是历史记录
    var isDefault = isDefaultData || false;
    var me = this;
    var $node = me.$node;
    var $historyList = $node.find('.search-result-list');
    var $newList = $node.find('.new-search-list-box');
    var $searchList = $node.find('.search-tips-cont');
    var allLi = '';
    var dataLen = data.length;

    if(!dataLen) {
      allLi = '<li class="search-result-li">没匹配的数据</li>';
      $searchList.empty().append($(allLi));
      return;
    }

    if(isDefault){
      for(var i = 0; i < dataLen; i++){
        var oli = '<li class="search-result-li" data-value="' + data[i] + '">' + data[i] + '</li>';
        allLi += oli;
      }
    }else{
      if(me.specialURL){
        allLi = me.updateSearchListHandle(data, dataLen, allLi);
      }else {
        for(var i = 0; i < dataLen; i++){
          var tipsKey = data[i][me.tipsKey];
          var oli = '<li class="search-result-li" data-value="' + tipsKey + '">' + tipsKey + '</li>';
          allLi += oli;
        }
      }
    }
    $searchList.empty().append($(allLi));
  },
  getSearchData: function(url){
    var promise = $.ajax({
        url: url,
        type: 'get',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
    })
    return promise;
  }
}

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(SearchBox, metadata, prototype);
/**
Messagebox module End
*/
