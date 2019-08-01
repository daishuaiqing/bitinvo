'use strict'
const pinyin_dict_notone = require('./pinyin_dict_notone.js');
module.exports = function input(sails){
  return {
    initialize: function(cb){
      const pubsub = sails.config.innerPubsub;
      function startUp(){
        sails.log.debug(`##### Input Hook : started ####`);
        let result = {};
        pubsub.on('input', (input, limit, skip) => {
          let totalArr = pinyin_dict_notone[input];
          if(totalArr) {
            let arr = totalArr.slice(skip, skip + limit);
            result = {
              words : arr,
              limit,
              skip,
              total : totalArr.length
            }
          }else{
            result = {
              words : [],
              limit,
              skip,
              total : 0
            }
          }
          sails.sockets.blast('words', result);
        })
      }
      sails.after(['lifted'], function() {
        startUp();
      });
      return cb();
    }
  }
}