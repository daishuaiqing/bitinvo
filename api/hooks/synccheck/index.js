'use strict';
const SyncRepeaterInterval = 60 * 1000;//test;
const QueueWarning = 50;
const _ = require('lodash');
const co = require('co');

module.exports = function SyncCheck(sails){
  return {
    initialize:function(cb){
      let count = {};
      function CheckInterval(){
        sails.log.verbose(' #### SyncCheck Hook : Start Check #### ')
        System.findOne({key: 'connection'})
        .then((status) => {
          if(status && status.value != 'offline'){
            SyncQueue();
          }else{
            setTimeout(function(){
              CheckInterval();
            }, 30 * 1000);
          }
        })
      }
      function SyncQueue(){
        sails.log.verbose('#### SyncCheck Hook :Checking Sync Failed Application #### ');
        co(function* (){
          let num = yield Redis.scardAsync('SyncItem')
          if(num > 0){
            if(num >= QueueWarning){
              sails.log.debug('#### SyncCheck Hook :Sync Failed Queue Already Over Warning Number#### ')
            }
            sails.log.debug(`#### SyncCheck Hook :Sync Failed Queue Length is ${num}#### `)
          }else{
            sails.log.debug('No Sync Failed Item');
            return yield Promise.resolve('No Sync Failed Item');
          }
          let list = yield Redis.smembersAsync('SyncItem');
          for(let item of list){
            let json = JSON.parse(item),
            id = json.id,
            model = json.model,
            retry = json.retry,
            method = undefined;
            if(typeof json.method !== 'undefined'){
              method = json.method;
            }
            yield Redis.sremAsync('SyncItem', 0, item)
            sails.log.debug('remove Queue Success');
            model = _.toLower(model);
            let target;
            if(sails.services.syncrule[model]){
              target = yield sails.services.syncrule[model](id);
            }else{
              target = yield sails.models[_.lowerCase(model).replace(' ','')].findOne({id: id});
            }
            yield sails.services.utils.delay(200);
            if(target){
              target.retry = retry;
              sails.services.syncrole.Sync(target, model, method);
            }else{
              if(method === 'destroy'){
                sails.services.syncrole.Sync({id: json.id, retry: retry}, model, method);
              }
            }
          }
        })
        .catch((err) => {
          sails.log.error('#### SyncCheck Hook: Error ####');
          sails.log.error(err);
        })
        setTimeout(function(){
          SyncQueue();
        }, SyncRepeaterInterval);
      };

      sails.after(['lifted'], function(){
        setTimeout(function(){
          CheckInterval();
        }, 30*1000);
        sails.services.syncrole.initClass(); 
        sails.services.sync.checkCount();
      });
      cb();
    }
  }
}