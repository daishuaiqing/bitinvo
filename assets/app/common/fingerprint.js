/*
  Fingerprint Management
*/
'use strict';
var pubsub = require('PubSubJS');
var noty = require('customnoty');
var server = require('common/server').server;

var FingerprintManagement = function(){
  log.info('FingerprintManagement has been created');
  this.user = null;
}

_.extend(FingerprintManagement, {
  NS : 'FingerprintManagement',
  pub : {
    changed : 'fingerprintmanagement.changed'
  },
  sub : {
    signout : ['fingerprintmanagement.logout', 'user.logout']
  }
})
var prototype = {
  init : function(){
    return this;
  },
  showError : function(err){
    noty({text: err, type: 'error', layout: 'top', timeout:5000});
  },
  authFingerPrint: function(application, $html){
    var notyInst = null;
    var d = $.Deferred();
    var me = this;
    var url = '/application/adminauthbyfingerprint',
    dataType = 'json',
    method = 'POST';

    server({
      url: url,
      method: method,
      data : application,
      dataType : dataType,
      beforeSend: function(){
        notyInst = noty({text: '正在启动指纹扫描仪', type: 'info', layout: 'topRight'});
      }
    }).done(function(message){
      log.debug(' #### Start Auth by fingerprint #### ');
      notyInst.close();
      log.debug(message);
      pubsub.unsubscribe('FingerPrint_Status');
      pubsub.subscribe('FingerPrint_Status', function(topic, msg){
        if(msg.status === 1){
          noty({text: '预载入指纹比对失败，重新校验', type: 'info', layout: 'topRight', timeout: 1000})
        }else if(msg.status === 0){
          noty({text: '扫描成功，正在校验用户指纹', type: 'info', layout: 'topRight', timeout: 1000})
        }else if(msg.status === 4){
          noty({text: '扫描的指纹较差，请重新扫描', type: 'error', layout: 'topRight', timeout: 1000})
        }
      });
      if(!message){
        d.reject('No Fingerprint found');
      }

      notyInst = noty({text: '请扫描指纹', type: 'info', layout: 'topRight'});
      pubsub.unsubscribe('adminauthbyfingerprint');
      me.token = pubsub.subscribe('adminauthbyfingerprint', function(topic, message){
        log.debug(' #### Getgun : authFingreprintHandler - receive event topic %s, see message below ####', topic);
        log.debug(message);
        notyInst.close();
        pubsub.unsubscribe(me.token);
        pubsub.unsubscribe('FingerPrint_Status');
        pubsub.unsubscribe('adminauthbyfingerprint');
        if(message && message.status){
          var status = message.status;
          if(status === 'success'){
            d.resolve();
          }else{
            // me.showError('管理员授权失败');
            d.reject({error: message.info});
          }
        }
      });
    })
    .fail(function(err){
      log.debug(err);
      notyInst.close();
      pubsub.unsubscribe('FingerPrint_Status');
      pubsub.unsubscribe('adminauthbyfingerprint');
      // me.showError('管理员指纹授权失败');
      d.reject({error: '管理员授权失败'});
    });
    return d;
  },
  destroy : function(){
    return this;
  }
}

_.extend(FingerprintManagement.prototype, prototype);
module.exports = new FingerprintManagement();
/*
  Fingerprint Management
*/
