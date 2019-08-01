'use strict';
document.body.addEventListener('touchstart', function () {});  
var attachFastClick = require('fastclick');
console.log(attachFastClick, 'This is attach fast click')
attachFastClick.attach(document.body, {
  touchBoundary: 200
});

var layout = require('./layout.js').init();
var message = require('./message.js').init();
var audio = require('./audio.js').init();
var router = require('./router.js').init();
var logout = require('./autologout.js').init();
var usermanagement = require('./usermanagement.js').init();
var director = require('./director.js').init(router, layout, message, audio, usermanagement);
var pubsub = require('PubSubJS');
var buildContext = require('./context.js');
var error = require('./error.js');

router.start();

// 全局锁定模块
var LockCabinet = require('./lockCabinet').init(audio);

log.info('Base components are initialized');