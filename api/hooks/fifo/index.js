/*
*
* FifoHook Hook Start
*/

'use strict';

var _ = require('lodash');
const FifoServer = require('bitinvo-fifo').FifoServer;

module.exports = function FifoHook(sails) {
  sails.log.verbose('Fifo Loaded');
  return {
    initialize: function(cb) {
      sails.log.debug(' #### Fifo Hook is initialized @1 #### ');
      
      var timer = null;
      var server = FifoServer;
      
      // server.on('fifodata', function(rawData, parsed){
      //   sails.log.debug(' #####  Get FiFO event, Fifo Server Call back start @@@@ 1 #### ');
      //   sails.log.debug(' #####  Print Raw data below @@@@ 2 #### ');
      //   sails.log.debug(rawData);
      //   _.each(parsed, function(message){
      //     sails.log.debug(' #####  Loop into the return fifo parsed data  @@@@ 3 #### ');
      //     sails.log.debug(message);
      //     if(message){
      //       // see service/ipc/fifo.js for name's definition
      //       // send to client who is listen on 'message' event
      //       // sails.services.message.local({topic : message.name, value : message});
      //     }
      //   });
      // });

      function read(){
        timer = setTimeout(function() {
          sails.log.verbose('Restart fifo read');
          server.readFifo(read);
        }, 100);
        // experiment on timmer , before using unref, the timer will keep the proceess running from being killed :(
        //timer.unref();
      }

      sails.after(['lowered'], function () {
        sails.log.debug(' #### Server is lowered, FIFO hook is going to shutdown @ 1 #### ');
        //close file
        server.close();
        //clean timer
        clearTimeout(timer); 
      });
      //auto start

      sails.after(['lifted'], function() {
        // Finish initializing custom hook
        read();
      });
      
      return cb();
    }
  }
}
/**
* FifoHook Hook End
*/