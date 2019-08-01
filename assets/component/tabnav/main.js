/**
 * Tab Nav
 */
'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var item = require('./item.jade');
var less = require('./main.less');

var TabNav = function(element, conf) {
  // this would never change
  this.$node = $(element);
  this.conf = conf;
  this.innerTpl = conf.innerTpl ? conf.innerTpl : item;
  this.renderer = function(item){
    return this.innerTpl(item);
  };
  this.listSelector = '.tabnav-item';
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'tabNav',
  events : {}
};

var prototype = {
  show : function(items, innerTpl, renderer){
    log.debug('show tab navigation');
    var me = this;

    items = items ? items : [
      {name : 'Tab1', target: '#tab1', id: 'tab1', clsName : 'custom'},
      {name : 'Tab2', target: function(){console.log('this is call back')}, id: 'tab2', clsName : 'custom'}
    ];

    if(innerTpl){
      me.innerTpl = innerTpl;
    }

    if(renderer){
      me.renderer = renderer;
    }
    var html = tpl(items);

    var htmls = [];
    _.each(items, function(item, i){
      var mixed = _.merge({index : i }, item);
      var rendered = me.renderer(mixed);
      htmls.push(rendered);
    })
    var $tpl = $(tpl());
    $tpl.html(htmls.join(''));
    $tpl.find('li').first().addClass('active seperate-before');
    $tpl.on('click', 'li', function(e){
      e.preventDefault();
      var $item = $(e.currentTarget);
      $tpl.find('li').removeClass('active seperate-before');
      $item.addClass('active seperate-before');
      me.$node.trigger('tabchanged', e);
    })
    me.$node.html($tpl);
    return this;
  }
};

module.exports = ejp.pluginize(TabNav, metadata, prototype);
/**
 * Command Hub to machine
 */