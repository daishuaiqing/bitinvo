/*
    Breadcrumbs Component Start
*/
'use strict';
var $ = require('jquery');

var ejp = require('easy-jq-plugin');

var tpl = require('./main.jade');
var less = require('./main.less');

var Breadcrumbs = function(element, conf) {
  // this would never change
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'breadcrumbs',
  events : {
    'AfterChanged' : 'breadcrumbs.pathchanged'
  }
};

var prototype = {
  /**
  @params items  [{name : 'menu1', target: 'javascript:void(0)'},...]
  @params defaultItem integer
  @params clickable
  */
  show : function(current, items, clickable){
    log.debug('Show breadcrumbs');
    var me = this;
    var html = tpl({
        defaultItem : current,
        items : items ? items : []
    });
    this.$node.html(html);
    if(clickable || (this.conf && this.conf.clickable)){
        this.$node.find('.breadcrumbs').on('click', 'li', function(e){
            var $curr = $(e.delegateTarget).find('.active').removeClass('active');
            var $next = $(e.currentTarget);
            $next.addClass('active');
            me.$node.trigger(metadata.events.AfterChanged);
        });
    }
    
    return this;
  }
};

module.exports = ejp.pluginize(Breadcrumbs, metadata, prototype);;

/**
    Breadcrumbs Component End
*/
