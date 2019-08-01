'use strict'
var Schedule = require('node-schedule');
const co = require('co');

module.exports = function systemRestart(sails) {
  return{
    initialize:function(cb){
      sails.log.info('#### System Restart Hook initialize #### ');
      sails.after(['lifted'], function(){
        setTimeout(function(){
          sails.services.systemrestart.setRestart();
        }, 5 * 1000);
      })
      return cb();
    }
  }
}
