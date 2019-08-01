/**
*  Alarm Queue用来记录已经发生的警报， 并且记录是否已经关闭
*/
'use strict';

module.exports = {
  enqueue : function(alarm){
    const Redis = sails.services.redis;
    Redis.rpushAsync('AlarmQueue', 'Alarm:' + alarm)
    .then((data) => {
      sails.log.debug('Push AlarmQueue To AlarmQueue Success');
    }).catch((err) => {
      sails.log.error('Push AlarmQueue To AlarmQueue Failed');
    });
  },
  enqueneAlarmMessage : function (msg) {
    Redis.rpushAsync('AlarmMessage', msg)
    .then((data) => {
      sails.log.debug('#### Push AlarmMessage To AlarmQueue Success');
    }).catch((err) => {
      sails.log.error('Push AlarmMessage To AlarmQueue Failed');
    });
  },
  dequeue : function(){
    const Redis = sails.services.redis;
    Redis.delAsync('AlarmQueue')
    .then((data) => {
      sails.log.debug('#### Clean AlarmQueue Success');
    })
    .catch((err) => {
      sails.log.error('#### Clean AlarmQueue Success');
    });
    Redis.delAsync('AlarmMessage')
    .then((data) => {
      sails.log.debug('##### Clean AlarmMessage Success');
    })
    .catch((err) => {
      sails.log.error('##### Clean AlarmMessage Success');
    });
  },
  resolveAll : function(){

  }
}