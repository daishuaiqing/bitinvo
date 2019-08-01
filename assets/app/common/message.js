/**
* message.js common module Start
*/
'use strict';
var socketIOClient = require('socket.io-client');
var SailsIOClient = require('sails.io.js');
var pubsub = require('PubSubJS');
var noty = require('customnoty');
var psFactory = require('./pubsubfactory');

var Message = function(){
  log.info('Message has been created');
}

var metadata = {
  NS : 'Message',
  pub : {
  },
  sub : {
    subscribe : 'message.subscribe',
    unsubscribe: 'message.unsubscribe'
  }
}
_.extend(Message, metadata);

// if channel meet, return true
var checkChannel = function(msg){
  if(msg){
    // do not publish the message if it is not the channel we set
    if(msg.channel){
      if(msg.channel === 'both'){
        // do nothing
      }else if($('html').hasClass('remote')){
        if (msg.channel === 'remote') {
          var systemSettings = window.localStorage.getItem('systemSetData');
          if (systemSettings) {
            try {
              systemSettings = JSON.parse(systemSettings);
            } catch(e) {
              systemSettings = null;
            }
          }
          console.log(systemSettings.enableRemoteAlarm, typeof systemSettings.enableRemoteAlarm)
          if (systemSettings) {
            if (systemSettings.enableRemoteAlarm) {
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        }
      }else if($('html').hasClass('local')){
        if(msg.channel === 'remote')
          return true;
      }
    }
  }else{
    return false;
  }
  return true;
}
var prototype = {

  init : function(){
    log.debug('Message is intializing');
    var me = this;
    //use pubsub factory to generate pub sub
    psFactory(this, metadata);

    var io = this.io = SailsIOClient(socketIOClient);
    log.debug('Sails IO Client is OK');

    //io.sails.autoConnect = false;

    io.socket.on('connect', function onConnect () {
      log.info("Socket connected!");
      io.socket.get('/user/me', function serverResponded (body, JWR) {

        // JWR ==> "JSON WebSocket Response"
        // log.debug('Sails responded with: ', body);
        // log.debug('with headers: ', JWR.headers);
        // log.debug('and with status code: ', JWR.statusCode);

        // first argument `body` === `JWR.body`
        // (just for convenience, and to maintain familiar usage, a la `JQuery.get()`)
      });
      io.socket.get('/message/subscribe2local', function(body, JWR){});
      log.debug('Now Socket is connected ? ' + io.socket.isConnected());
    });

    // 如果在blast中指定event name 为notification, 那么这个就会被触发
    // io.socket.on('notification', function onConnect (msg) {
    //   log.debug("We got notification!");
    //   log.debug(msg);

    //   // do not publish the message if it is not the channel we set
    //   if(!checkChannel(msg)) return;

    //   if(msg.topic && msg.value){
    //     pubsub.publish('system.message.topic', msg.value);
    //   }else{
    //     pubsub.publish('system.message.text', msg);
    //   }
    // });

    io.socket.on('words', function onConnect(msg) {
      log.debug('We got pinyin', msg);
      var words = msg.words;
      pubsub.publish('words', words);
    });

    io.socket.on('calibrate_msg_status', function(msg) {
      console.log('校准推送', msg);
      pubsub.publish('calibrate_msg_status', msg);
    })

    io.socket.on('returnZero', function(msg) {
      log.debug('wo got returnZero', msg);
      pubsub.publish('returnZero', msg);
    });

    io.socket.on('calibrate', function(msg) {
      log.debug('wo got calibrate', msg);
      pubsub.publish('calibrate', msg);
    });

    io.socket.on('facePicStream', function(data) {
      log.debug('We got facePicStream');
      // var blob = new Blob([data], {'type': 'image\/bmp'});
      // var src = window.URL.createObjectURL(blob);

      pubsub.publish('facePicStream', data);

    });

    io.socket.on('camera_in_use', function(data) {
      console.log('######## 拍摄通知socket #############', data);
      var time = data && data.value && data.value.time;
      if (time) {
        noty({text: '正在登录请等待', type: 'info', layout: 'top', timeout: 2000 });
      }
    });

    io.socket.on('alarm', function onConnect (msg) {
      log.debug("We got alarm!");
      // do not publish the message if it is not the channel we set
      if(!checkChannel(msg)) return;
      pubsub.publish('system.error', msg);
    });

    io.socket.on('warning', function onConnect (msg) {
      log.debug("We got warning!");

      // do not publish the message if it is not the channel we set
      if(!checkChannel(msg)) return;

      pubsub.publish('system.warning', msg);
    });

    // 监听远程锁定推送
    io.socket.on('lockCabinet', function(msg) {
      console.log('############# socket on locakCabinet', msg);
      pubsub.publish('change.LockCabinetStatus', msg);
    });

    // 如果blast不指定event name, 那么会到这里来
    // 如果broacast 也会到这里来
    io.socket.on('message', function onConnect (msg) {
      log.debug("We got message!");
      log.debug(msg);
      console.log('socket on message', msg);
      // do not publish the message if it is not the channel we set
      if(!checkChannel(msg)) return;
      if(msg.topic && msg.value){//为了兼容之前的blast，所以保留这个分支
        pubsub.publish(msg.topic, msg.value);
      }else{
        if (msg && msg.topic === 'user.alarm') {
          console.log('not found topic msg: ############', msg)
          pubsub.publish('system.alarm', msg);
        } else if (msg && msg.topic === 'user.message') {
          pubsub.publish('system.message', msg);
        } else if (msg && msg.topic === 'generate_logs_progress') {
          pubsub.publish('generate_logs_progress', msg);
        } else if (msg && msg.topic === 'camera_in_use') {
          me.cameraInUseNoty(msg);
        }
        else {
          pubsub.publish('system.status', msg)
        }
      }
    });
    // console.log('Socket is connected ? ' + io.socket.isConnected());
    // io.sails.connect();
    return this;
  },
  // 全局处理 摄像头使用中
  cameraInUseNoty: function(data) {
    var time = data && data.value && data.value.time;
    if (time) {
      noty({text: '正在登录请等待', type: 'info', layout: 'top', timeout: 2000 });
    }   
  },
  send: function(){
    var io = this.io;
    io.socket.get('/user/me', function serverResponded (body, JWR) {
      // JWR ==> "JSON WebSocket Response"
      log.debug('Sails responded with: ', body);
      log.debug('with headers: ', JWR.headers);
      log.debug('and with status code: ', JWR.statusCode);

      // first argument `body` === `JWR.body`
      // (just for convenience, and to maintain familiar usage, a la `JQuery.get()`)
    });
    return this;
  },
  // subscrite to personal info for user
  subscribe : function(){
    var io = this.io;
    io.socket.get('/message/subscribe', function serverResponded (body, JWR) {
      // JWR ==> "JSON WebSocket Response"
      log.debug('Sails responded with: ', body);
      log.debug('with headers: ', JWR.headers);
      log.debug('and with status code: ', JWR.statusCode);

      // first argument `body` === `JWR.body`
      // (just for convenience, and to maintain familiar usage, a la `JQuery.get()`)
    });
  },
  subscribeAsLocal: function () {
    var io = this.io;
    io.socket.get('/message/subscribeAsLocal', function serverResponded(body, JWR) {
      log.debug('socket /message/subscribeAsLocal');
      log.debug('Sails responded with: ', body);
      log.debug('with headers: ', JWR.headers);
      log.debug('and with status code: ', JWR.statusCode);
    });
  },
  initAsLocal: function () {
    var me = this;
    var io = this.io;
    me.subscribeAsLocal();
    io.socket.on('disconnect', function () {
      me.subscribeAsLocal();
    })
  },
  // unsubscrite to personal info for user
  unsubscribe : function(){
    var io = this.io;
    io.socket.get('/message/unsubscribe', function serverResponded (body, JWR) {
      // JWR ==> "JSON WebSocket Response"
      log.debug('Sails responded with: ', body);
      log.debug('with headers: ', JWR.headers);
      log.debug('and with status code: ', JWR.statusCode);

      // first argument `body` === `JWR.body`
      // (just for convenience, and to maintain familiar usage, a la `JQuery.get()`)
    });
  },
  destroy : function(){
    return this;
  }
}

_.extend(Message.prototype, prototype);

module.exports = new Message();

/**
* message.js common module end
*/
