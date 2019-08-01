'use strict';
// const interval = 60 * 60 * 1000;
const interval = 60 * 1000;//Test
const co = require('co');

module.exports = function ChksumCheck(sails){
  return {
    initialize: function(cb){
      sails.log.verbose('#### Chksum Check Hook is loaded ####');
      let me = this;
      me.timer = null;
      function check(){
        sails.log.verbose('#### Chksum Check Hook : Start once check ####');
        co(function* (){
          let models = [ 'user', 'fingerprint', 'passport' ];
          for(let model of models){
            sails.log.info(`#### Chksum Check Hook : Checking Model: ${model}`);
            let where = {};
            if(model === 'user'){ where = { isDummy: false, isLocal: false } };
            if(model === 'passport'){ where = { filter: false } };
            let arr = yield sails.models[model].find({where: where, limit: 1, sort: 'updatedAt DESC'});
            if(arr.length === 0){
              sails.log.error('#### Chksum Check Hook : DB is empty ####');
              continue;
            }
            let latest = arr[0];
            sails.services.fullsync.checkSync(model);
            yield sails.services.utils.delay(500);
          }
          return yield Promise.resolve();
        })
        .then((suc) => {
          sails.log.verbose('finish');
        })
        .catch((err) => {
          if(err.body){ sails.log.error(err.body) }
          else sails.log.error(err);
        })
      }
      sails.after(['lifted'], function(){
        // Cabinet.findOne({isLocal: true})
        // .then((self) => {
        //   if(self && self.isMaster){
        //     me.timer = setInterval(function(){
        //       check();
        //     }, interval);
        //   }
        // })
      });
      cb();
    }
  }
};