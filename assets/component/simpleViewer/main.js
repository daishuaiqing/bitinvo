'use strict';

var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var CSS = require('./main.less');

var SimpleViewer = function(element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version: '0.0.1',
  name: 'simpleViewer'
};

var prototype = {
  init: function() {
    console.log('初始化　simpleViewer')
    var me = this;
    var $node = me.$node;

    $node.off('click')
    .on('click', 'img', function(e) {
      console.log('click target img:', e);
      var $curr = $(e.target);     
      me.showPictureList($curr);
    });
    $node.on('click', function(e) {
      console.log(e.target)
    });
    return this;
  },
  showPictureList: function($curr) {
    var me = this;
    var $simpleViewerBox = $('#simpleViewerBox');
    if (!$simpleViewerBox.length) {
      $('body').append(tpl);
      $simpleViewerBox = $('#simpleViewerBox').show();
    } else {
      $simpleViewerBox.show();
    }
    me.$simpleViewerBox = $simpleViewerBox;

    var $img = $simpleViewerBox.find('.currentPic');
    var curr_src = $curr.attr('src');
    var curr_index = me.$node.find('img').index($curr) + 1;
    console.log($curr,'当前点击pic->index->src:', curr_index, curr_src);
    $(document).off('resize').on('resize', function() {
      me.setPicMaxSize($img);
    });
    me.setPicMaxSize($img);
    
    $img.attr('src', curr_src).addClass('show');
    $img.data('index', curr_index);
    me.onBtnClick();

    // 针对屏幕初始话图片大小
    var $window = $(window);
    var initSizeW = $window.width() * 0.8;
    var initSizeH = $window.height() * 0.8; 
    $img.width(initSizeW);
    $img.height(initSizeH);
    // 记录图片原来的大小
    me.currImgW = initSizeW;
    me.currImgH = initSizeH;
  },
  setPicMaxSize: function($img) {
    var $window = $(window);
    var w = $window.width;
    var h = $window.height;

    var maxH = h - 160;
    var maxW = w;
    $img.css({
      'maxWidth': maxW,
      'maxHeight': maxH
    });
  },
  onBtnClick: function() {
    var me = this;
    me.$simpleViewerBox
    .off('click')
    .on('click', 'span', function(e) {
      var $this = $(e.currentTarget);
      var id = $this.attr("id");
      switch(id) {
        case 'viewer_close-btn':
          me.close();
          break;
        case 'viewer_increaseSize-btn':
          me.increaseSize();
          break;
        case 'viewer_decreaseSize-btn':
          me.decreaseSize();
          break;
        case 'viewer_left-btn':
          me.prev();
          break;
        case 'viewer_right-btn':
          me.next();
          break;
        case 'viewer_reversal-btn':
          me.reversal();
          break;
        case 'viewer_restore-btn':
          me.restore();
          break;
      }
    });
  },
  close: function() {
    var me = this;
    me.restore();
    me.$simpleViewerBox.find('.currentPic').removeClass('show');
    setTimeout(function() {
      me.$simpleViewerBox.hide();
    },300);
  },
  percentage: 100,
  increaseSize: function() {
    var me = this;
    var $img = me.$simpleViewerBox.find('.currentPic');
    me.percentage = me.percentage + 5;
    var newWidth = me.currImgW * (me.percentage / 100);
    var newHeight = me.currImgH * (me.percentage / 100);
    $img.css({
      width: newWidth,
      height: newHeight
    });
    me.showPercentage();
    console.log(me.percentage);
  },
  decreaseSize: function() {
    
    var me = this;
    var $img = me.$simpleViewerBox.find('.currentPic');
    
    me.percentage = me.percentage - 5;
    var newWidth = me.currImgW * (me.percentage / 100);
    var newHeight = me.currImgH * (me.percentage / 100);
    console.log(newWidth, newHeight, 'new width height')
    $img.css({
      width: newWidth,
      height: newHeight
    });
    me.showPercentage();
    console.log(me.percentage);
  },
  showPercentage: function() {
    var text = this.percentage + '%';
    var $percentageBox = this.$simpleViewerBox.find('.percentage_box');
    $percentageBox.removeClass('hide').text(text);
    setTimeout(function() {
      $percentageBox.addClass('hide');
    }, 300);
  },
  restore: function() {
    var me = this;
    var $img = me.$simpleViewerBox.find('.currentPic');

    $img.css({
      width: me.currImgW,
      height: me.currImgH,
      transform: 'rotate(0deg)'
    });
    
    me.percentage = 100;
    
    $img.removeAttr('style');
    $img.css({
      width: me.currImgW,
      height: me.currImgH
    });
  },
  reversal: function() {
    var me = this;
    var $img = me.$simpleViewerBox.find('.currentPic');
    var degValue = parseInt($img.data('degValue')) + 90;
    if (degValue !== degValue) {
      degValue = 90;
    }
    $img.css({
      transform: 'rotate(' + degValue + 'deg)'
    });
    $img.data('degValue', degValue);
  },
  next: function() {
    var me = this;
    var $img = me.$simpleViewerBox.find('.currentPic');
    var currIndex = $img.data('index');
    var len = me.$node.find('img').length;
    var nextIndex = currIndex + 1;

    if (nextIndex > len) return;
    me.restore();
    me.updateCurrImg(nextIndex, $img);

  },
  prev: function() {
    var me = this;
    var $img = me.$simpleViewerBox.find('.currentPic');
    var currIndex = $img.data('index');
    var prevIndex = currIndex - 1;
      
    console.log('prev get pic', prevIndex)
    if (prevIndex < 1) return ;
    me.restore();
    me.updateCurrImg(prevIndex, $img);
  
  },
  updateCurrImg: function(index, $img) {
    var me = this;
    console.log(me.$node.find('img'), index-1)
    var newSrc = me.$node.find('img').eq(index-1).attr('src');
    console.log('新的图片', newSrc)
    $img.removeClass('show').attr('src', newSrc);

    setTimeout(function() {
      $img.addClass('show').data('index', index);
    },300);
  }
};

module.exports = ejp.pluginize(SimpleViewer, metadata, prototype);