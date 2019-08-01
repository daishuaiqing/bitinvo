'use strict';

module.exports = function AlarmMessage(sails){
  return{
    initialize: function(cb){
      sails.log.debug(' #### AlarmMessage Hook : Loaded #### ');
      const Redis = sails.services.redis;
      let check = function(){
        Redis.llenAsync('AlarmQueue')
        .then((data) => {
          if(data != 0){
            sails.log.debug(' #### AlarmMessage Hook : Something to Send #### ');
            return Redis.lpopAsync('AlarmQueue')
          }else{
            sails.log.silly(' #### AlarmMessage Hook : Nothing to Send #### ');
            return Promise.reject('Nothing to Send')
          }
        })
        .then((data) => {
          return Redis.hgetallAsync(data)
          .then((data) => {
            if(data){
              sails.services.sms.sendSMS(data.phone, data.content);
            }else{
              return Promise.reject('Nothing to Send')
            }
          })
        })
        .catch((err) => {
          if(err != 'Nothing to Send'){
            sails.log.error(err);
          }
        })
      }
      
      let alarmPolling = function () {
        Redis.llenAsync('AlarmMessage')
        .then((data) => {
          if(data != 0){
            sails.log.debug(' #### AlarmMessage Hook : Alarm exist #### ');
            return Redis.lindexAsync('AlarmMessage', 0)
          }else{
            sails.log.silly(' #### AlarmMessage Hook : Nothing to Send #### ');
            return Promise.reject('Nothing to Send')
          }
        })
        .then((data) => {
          try{
            data = JSON.parse(data);
            sails.services.message.alarm(data.msg, data.topic, data.channel);
          }catch(e){
            sails.log.error('#### AlarmMessageHook : alarmPolling error ####');
            sails.log.error(e);
          }
        })
        .catch((err) => {
          if(err != 'Nothing to Send'){
            sails.log.error(err);
          }
        })
      }
      let clean = function(){
        Promise.all([Redis.delAsync('AlarmMessage'), Redis.delAsync('AlarmQueue')])
        .then((data) => {
          sails.log.info('Startup clean redis success');
        })
        .catch((err) => {
          sails.log.error('Startup clean redis failed');
        })
      }
      sails.after(['lifted'], function() {
        clean();
        setInterval(check, 2000);
        setInterval(alarmPolling, 30000);
      });
      return cb();
    }
  }
}