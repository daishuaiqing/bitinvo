/**
Messagebox module start
*/
'use strict';

var animateCss = require("animate.css");
var waves = require("waves");
var wavecsss = require("waves/src/less/waves.less");

var ejp = require('easy-jq-plugin');
var i18n = require('locales/zh-CN.json');

var tpl = require('./main.jade');
var less = require('./main.less');


var MessageBox = function(element, conf){
  log.info('MessageBox has been created');
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version : '0.0.1',
  name : 'messagebox',
  events : {
    'confirm' : 'messagebox.confirm',
    'cancel' : 'messagebox.cancel'
  }
};

var prototype = {
  init : function (){
    log.info('init MessageBox Component');
  },
  show : function(data){
    var me = this;
    var $node = this.$node;
    data = data ? data : {};

    _.extend(data, {
      confirmBtnLabel : __('Confirm'),
      cancelBtnLabel : __('Cancel'),
      i18n : i18n
    });
    // create html frame
    $node
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
    .append(tpl(data));
    
    return this;
  }
}

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(MessageBox, metadata, prototype);
/**
Messagebox module End
*/
