/**
 * MessageController
 *
 * @description :: Server-side logic for managing Messages
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var message = require('./MessageController.js');
var req = require('request');
module.exports = {
  //TODO
  // data: function(req, res){
  //   sails.log.debug('Got data from fifo');
  //   var data = req.body;
  //   if(data && _.isArray(data)){
  //     _.each(data, function(d){
  //       var msgName = d.name;
  //       var msgValue = d.value;
  //       message.fifo({name: msgName, value: msgValue});
  //     })
  //     res.ok();
  //   }
  //   else{
  //     res.badRequest();
  //   }
  // },
  // send : function(req, res){
  //   sails.log.debug('Sending data to fifo');
  //   var content = req.query.text ? req.query.text : '';
  //   if(req.query.uid){
  //     var uid = req.query.uid;
  //     sails.sockets.broadcast(uid, {msg: content});
  //     res.ok();
  //   }else{
  //     res.badRequest();
  //   }
  // }
};
