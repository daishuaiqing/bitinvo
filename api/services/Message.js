'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const pubsub = sails.config.innerPubsub;
//最大的消息数id的起始，必须为1
var msgId = 1;
//最大的消息数， 如果超过这个数，将会重新生成
var maxMsgId = 65535;
var getMsgId = function(){
  if(msgId < maxMsgId){
    msgId++;
    return msgId;
  }else{
    msgId = 1;
  }
}
/**
  brocast/peer
  local/remote
  topic
*/
module.exports = {
  /**
    @params user 带有uid 的用户
    @params msg message text or object
    @params topic : alert 警报 , message : 信息
    @params channel : local只是发到柜机上, remote 只是发到非柜机上, both : 都发
  */
  send2 : function(user, msg, topic, channel, onConfirmAPI, onCancelAPI, onConfirmRedirect, onCancelRedirect, confirmText, cancelText, hiddenApi){
    if(user && user.id && msg){
      sails.log.debug(' #### Messge:send2 to user : %s', user.id);
      var id = user.id;
      topic = topic ? topic : 'user.message';
      channel = channel ? channel : 'local';
      sails.log.debug(' #### Messge:send2 to user : topic %s, channel %s', topic, channel);
      var msg = {msg: msg, topic : topic, channel : channel, 
        onConfirmAPI : onConfirmAPI, 
        onCancelAPI: onCancelAPI, 
        onConfirmRedirect: onConfirmRedirect,
        onCancelRedirect: onCancelRedirect,
        confirmText: confirmText,
        cancelText: cancelText,
        hiddenApi: hiddenApi
      };
      sails.sockets.broadcast(id, msg);
      sails.log.debug('Sending peer message');
      return msg;
    }else{
      return null;
    }
  },

  /**
   * 发送信息至本地房间
   * 
   */
  local : function(topic, value){
    sails.services.redis.get('localSocketId', function(err, data){
      if(err){
        sails.log.error('#### Message: localMessage get localSocketId failed #####');
        sails.log.error(err);
      }else{
        //sails.log.info('#### Message: localMessage get localSocketId success : %s ####', data);
        sails.sockets.broadcast(data, topic, value);
      }
    })
  },

  remote : function(msg, topic){
  },

  /**
    发送客户端消息
    msg 需要显示的文字信息
    topic [user.message, message, 或者其他] 如果设置user.message， 那么就会有弹出框提示，否则使用默认的message， 只有后台有提示
    channel : [local, remote, both] 本地显示， 远程显示，都显示
    onConfirmAPI :  前台用户点击确认之后的回调接口，是一个合法的url
    onCancelAPI : 前台用户点击取消之后的回调接口，是一个合法的url
    onConfirmRedirect: 点击确认之后是否需要刷新到指定的页面， 默认是不跳转,
    onCancelRedirect: 点击取消之后是否需要刷新到指定的页面， 默认是不跳转
    confirmText: 确认按钮上的文字，默认是确定
    cancelText: 取消按钮上的文字， 默认是取消
  */
  all : function(msg, topic, channel, onConfirmAPI, onCancelAPI, onConfirmRedirect, onCancelRedirect, confirmText, cancelText){
    sails.log.debug(' #### Messge:all send to all ');

    topic = topic ? topic : 'message';
    channel = channel ? channel : 'local';

    sails.log.debug(' #### Messge:all  topic %s, channel %s', topic, channel);

    var msg = {msg: msg, topic : topic, channel : channel, 
      onConfirmAPI : onConfirmAPI, 
      onCancelAPI: onCancelAPI, 
      onConfirmRedirect: onConfirmRedirect,
      onCancelRedirect: onCancelRedirect,
      confirmText: confirmText,
      cancelText: cancelText
    };

    sails.sockets.blast(msg);
  },

  alarm : function(msg, topic, channel){
    const Redis = sails.services.redis;
    sails.log.debug(' #### Messge:alarm send alarm ');

    topic = topic ? topic : 'message';
    channel = channel ? channel : 'both';

    sails.log.debug(' #### Messge:alarm  topic %s, channel %s', topic, channel);
    let content = msg;
    var msg = {msg: msg, topic : topic, channel : channel};
    sails.services.message.local('alarm', msg);
    sails.sockets.blast('alarm', msg);
    sails.services.alarmqueue.enqueneAlarmMessage(JSON.stringify(msg));
    sails.services.shellproxy.lightUp();
    Cabinet.findOne({isLocal: true}, (err, cabinet) => {
      if(err){
        sails.log.error(`#### Message Service : error ${err} ####`);
      }else{
        if(!cabinet.isMaster){
          pubsub.emit('alarm', msg.msg, topic, cabinet.name, cabinet.code);
        }
      }
    })
    
    sails.services.alarmqueue.enqueue(content);
    //需要同时远程报警
    if(msg)
      this.all((msg.msg ? msg.msg : '柜机报警'), 'user.alarm', 'remote');
  },

  warning : function(msg, topic, channel){
    sails.log.debug(' #### Messge:warning');

    topic = topic ? topic : 'message';
    channel = channel ? channel : 'both';

    sails.log.debug(' #### Messge:alarm  topic %s, channel %s', topic, channel);

    var msg = {msg: msg, topic : topic, channel : channel};

    sails.services.message.local('warning', msg);
  },
};
