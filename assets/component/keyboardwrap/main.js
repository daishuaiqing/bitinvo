'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
require('./main.less');
require('keyboard/dist/css/keyboard.min.css');
require('keyboard/dist/css/keyboard-dark.min.css');
var kb = require('keyboard/js/jquery.keyboard.js');
require('./language.js');
var audio = require('common/audio.js').init();

var KeyboardWrap = function(element, conf) {
  // this would never change
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'keyboardWrap',
  events : {}
};

var prototype = {
  init : function(config){
    log.info(' KeyboardWrap Start');
    this.addKeyboard(this.$node, config);
    return this;
  },
  addKeyboard : function($node, config){
    log.info(' KeyboardWrap: addKeyboard');
    // dont show keyboard at other media
    if($('html').hasClass('remote'))
      return;
    var me = this;
    var customLayout = {
      'normal': [
        '1 2 3 4 5 6 7 8 9 0 {bksp}',
        'q w e r t y u i o p {cancel}',
        '{shift} a s d f g h j k l {confirm}',
        'z x c v b n m . {prev} {next}'
      ],
      'shift': [
        '1 2 3 4 5 6 7 8 9 0 {bksp}',
        'Q W E R T Y U I O P {cancel}',
        '{shift} A S D F G H J K L {confirm}',
        'Z X C V B N M . {prev} {next}'
      ]
    };
    if(config.type && config.type === 'number'){
      customLayout = {
        'normal': [
          '1 2 3 4 5 6 7 8 9 0 . {bksp} {cancel}'
        ]
      }
    }

    $.extend($.keyboard.keyaction, {
      confirm: function(e, keyboard, el){
        _.each(config.navEvents, function(fn, key){
          fn && fn();
        });
      }
    });

    $node.keyboard({
      language  : 'zh',
      // lockInput    : true,
      usePreview   : false,
      autoAccept   : true,
      userClosed   : false,
      tabNavigation: true,
      keyBinding: 'touchend',
      // Auto-accept content even if the user presses escape
      // (only works if `autoAccept` is `true`)
      autoAcceptOnEsc : true,
      visible: function(e, keyboard, el) {
        // if(!config.disableNav)
        //   me.addNav(keyboard, config.navEvents, config.appendTo, config.appendToType);
      },
      display: {
        'prev' : '前一项',
        'next' : '后一项',
        'confirm' : '确定'
      },
      beforeVisible : config.beforeVisible,
      beforeClose: config.beforeClose,
      appendTo : config.appendTo,
      layout : 'custom',
      enterNavigation: false,
      customLayout : customLayout,
      // change : function(e, keyboard, el){
      //   $(e.currentTarget).addClass('animated pulse').on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
      //     $(e.currentTarget).removeClass('animated pulse');
      //   });
      //   // $(el).addClass('animated pulse');
      //   audio.play('click');
      // }
    });
  }
};

module.exports = ejp.pluginize(KeyboardWrap, metadata, prototype);
