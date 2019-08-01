'use strict';

var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var _ = require('lodash');

var DifferentDevice = function(element, conf){
  log.info('DifferentDevice has been created');
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version : '0.0.1',
  name: 'differentDevice'
}

var prototype = {
  init: function(){
    log.debug('differentDevice component init');
    return this;
  },
  show: function(){
    var $node = this.$node;
    var btnArray = this.conf.btnArray || [{name: 'all', text: '全部柜机'}, {name: 'local', text: "本地柜机"}];
    var $tpl = $(tpl());
    _.map(btnArray, function(n){
      var newButton = "<button class='btn btn-default-device' name='" + n.name + "'><h4>" + n.text + "</h4></button>";
      $tpl.append(newButton);
    })
    $tpl.find('.btn-default-device:first-child').addClass('on');
    $node.append($tpl);
    $node.find('.different-device-component')
    .on('click', '.btn-default-device', function(){
      $(this).addClass('on').siblings().removeClass('on');
    });
    return this;
  }
}

module.exports = ejp.pluginize(DifferentDevice, metadata, prototype);
