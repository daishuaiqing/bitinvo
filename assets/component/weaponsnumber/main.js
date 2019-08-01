'use strict';

var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var _ = require('lodash');

var WeaponsNumber = function(element, conf){
  log.info('WeaponsNumber has been created');
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version : '0.0.1',
  name: 'weaponsNumber'
}

var prototype = {
  init: function(){
    return this;
  },
  show: function(opts){
    var me = this;
    var $tpl = $(tpl());
    var count = Number(opts && opts.count || 0);
    var tipc = opts && opts.tipc || '';
    var lastCount = null;
    if(count >= 1000 && count < 10000){
      var remainder = (count/100)%10;
      var floorNum = _.floor(count/1000, 2);
      var Num = count/1000;
      if(remainder !== 0 && Num > floorNum){
        lastCount = _.floor(count/1000, 2) + '<span class="per_unit">千+</span>';
      }else if(remainder !== 0 && Num === floorNum){
        lastCount = _.floor(count/1000, 2) + '<span class="per_unit">千</span>';
      }else if(remainder === 0 && Num === floorNum){
        lastCount = count/1000 + '<span class="per_unit">千</span>';
        log.debug(lastCount)
      }
    }else if(count >= 10000){
      var remainder = (count/1000)%100;
      var floorNum = _.floor(count/10000, 2);
      var Num = count/10000;
      if(remainder !== 0 && Num > floorNum){
        lastCount = _.floor(count/10000, 2) + '<span class="per_unit">万+</span>';
      }else if(remainder !== 0 && Num === floorNum){
        lastCount = _.floor(count/10000, 2) + '<span class="per_unit">万</span>';
      }else if(remainder === 0 && Num === floorNum){
        lastCount = count/10000 + '<span class="per_unit">万</span>';
        log.debug(lastCount)
      }
    }else{
      lastCount = count;
    }
    $tpl.find('.number-text').html(lastCount);
    $tpl.find('.description-text').text(tipc);
    me.$node.html($tpl);
    return this;
  }
}

module.exports = ejp.pluginize(WeaponsNumber, metadata, prototype);
