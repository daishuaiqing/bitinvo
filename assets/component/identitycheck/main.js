'use strict';
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var IdentityCheck = function(element, conf){
  this.$node = $(element);
  this.pluginObj = $(tpl()).get(0);
  return this;
}

var metadata = {
  vsersion : '0.0.1',
  name : 'identityCheck'
}

var prototype = {
  init : function(conf){
    return this;
  },
  show: function(){
    var me = this;
    var $node = me.$node;
    $('body').append(tpl());

    if($('html').hasClass('remote')){
      if(me.connectIdCardPlugin()){
        if(me.getIdCardPluginStatus()){
          $node.removeClass('hide')
        }
      }
    }
    $node.on('click', function(){
      me.readCert();
    })
  },
  connectIdCardPlugin : function(){
    log.debug('connectIdCardPlugin', this.pluginObj)
    if(!this.pluginObj.hasOwnProperty('connect')){
      return;
    }
    var ret = this.pluginObj.connect();
    var connectStatus = eval("(" + ret + ")");
    log.debug('connectIdCardPlugin responseJSON', connectStatus.resultFlag);
    if(connectStatus.resultFlag === 0){
      return true;
    }else{
      log.debug(connectStatus.errorMsg);
      return false;
    }
  },
  getIdCardPluginStatus : function(){
    if(!this.pluginObj.hasOwnProperty('getStatus')){
      return;
    }
  	var ret = this.pluginObj.getStatus();
    var getStatus = eval("(" + ret + ")");
    if(getStatus.resultFlag === 0 && getStatus.status === 0){

      return true;
    }else{
      log.debug(getStatus.errorMsg)
      return false;
    }
  },
  readCert : function(){
    log.debug('read ID card info')
    if(!this.pluginObj.hasOwnProperty('readCert')){
      return;
    }
    var me = this;
    var ret = this.pluginObj.readCert();
    var readIdCardInfo = eval("(" + ret + ")");
    log.debug('current on readCert function, ID card info', readIdCardInfo);
    if(readIdCardInfo.resultFlag === 0){
      me.$node.trigger('getIdCardInfoSuccess', [readIdCardInfo.resultContent]);
      return readIdCardInfo.resultContent;
    }else{
      me.$node.trigger('getIdCardInfoError', [readIdCardInfo.errorMsg]);
      log.debug(readIdCardInfo.errorMsg)
    }
  },
  destroy: function(){
    if(!this.pluginObj.hasOwnProperty('disconnect')){
      return;
    }
    log.debug('#identityCheck component destory');
  	var ret = this.pluginObj.disconnect();
    var disconnectStatus = eval("(" + ret + ")");
    if(disconnectStatus.resultFlag === 0){
      log.debug(disconnectStatus);
      return true;
    }else{
      log.debug(disconnectStatus.errorMsg);
      return false;
    }
  }

}

module.exports = ejp.pluginize(IdentityCheck, metadata, prototype);
