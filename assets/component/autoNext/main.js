'use strict';
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');

var AutoNext = function(element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version: '0.0.1',
  name: 'autoNext',
  events: {}
}

var prototype = {
  show: function(opt) {
    var me = this;
    var $node = me.$node;

    $node.show().html(tpl({
      i18n: __('autoUpdateAppBox')
    }));
    
    me.count = opt && opt.count || 60;
    this.countdown(me);

    $node.find('.completedBtn')
    .off('click')
    .on('click', function() {
      $node.trigger('success');
      me.hide();
    });
    $node.find('.keepBtn')
    .off('click')
    .on('click', function() {
      $node.trigger('error');
      me.hide();
    });
    return $node;
  },
  hide: function() {
    this.$node.hide();
  },
  countdown: function(me) {
    if (me.count <= 0) {
      clearTimeout(me.time);
      me.$node.trigger('success');
      me.$node.hide();
      return;
    }
    me.count = me.count - 1;
    me.render(me.count);
    me.time = setTimeout(function() {
      me.countdown(me);
    }, 1000);
  },
  render: function(count) {
    this.$node.find('.countdown').html(count);
  }
}

module.exports = ejp.pluginize(AutoNext, metadata, prototype);