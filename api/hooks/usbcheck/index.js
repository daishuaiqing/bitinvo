/*
*
* USB Check Hook Start
*/

'use strict';

const _ = require('lodash');
// const usb = require('usb');

var onError = function(err){
  sails.log.error(' ##### USB Device Check Hook :onError #### ');
  sails.log.error(err);
}

var createOptLog = function(data){
  OptLog.create(data)
  .exec(function(err){
    if(err){
      sails.log.error(' ####  USB Device Check Hook :create  adding OptLog fails');
      sails.log.error(err);
    }
  });
}

module.exports = function USBDeviceCheck(sails) {
  sails.log.silly('USB Device Check Hook Loaded');
  return {
    initialize: function(cb) {
      sails.log.debug(' #### USB Device Check Hook is initialized @1 #### ');
      var me = this;
      var userId = sails.config.systemOptId;
      return cb();

      // currently 当前的头机不支持这个use 插件 ， 由于 libusb 无法安装。
      sails.after(['lifted'], function() {
        // Finish initializing custom hook
        setTimeout(function() { //在真机上如果不延时的话， 会出现访问数据库超时的错误
          let list = usb.getDeviceList();
          sails.log.verbose('USB device listed');
          sails.log.verbose(list);
          usb
          .on('attach', function(device) { 
            sails.log.verbose('USB device attached');
            sails.log.verbose(device);
            createOptLog({
              object: 'usb',
              action: 'USB接入',
              log: 'USB设备接入',
              logType: 'normal',
              objectId: null,
              createdBy : userId,
              updatedBy : userId
            })
          })
          .on('detach', function(device) { 
            sails.log.verbose('USB device detach');
            sails.log.verbose(device);
            createOptLog({
              object: 'usb',
              action: 'USB拔出',
              log: 'USB设备拔出',
              logType: 'normal',
              objectId: null,
              createdBy : userId,
              updatedBy : userId
            })
          });
        }, 2000);
      });

      sails.after(['lowered'], function () {
        sails.log.silly(' ####  USB Device Check Hook:  Server is lowered, Module Checking hook is going to shutdown @ 1 #### ');
        //close file
        server.close();
        //clean timer
        clearTimeout(me.timer);
      });
      return cb();
    }
  }
}
/**
* USB Device Check Hook End
*/
