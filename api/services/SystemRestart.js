'use strict'
const Schedule = require('node-schedule');
const co = require('co');
let me = this;
me.schedule = null;

exports.setRestart = () => {
  sails.log.debug('---set restart time---');
  co(function* (){
    let type = yield System.findOne({key: 'restartType'});
    let time = yield System.findOne({key: 'restartTime'});
    sails.log.debug('#### get the restartTime and restartType ####');
    if(!time && !type){
      let dateTime = sails.config.cabinetSettings.restartTime;
      return yield Promise.resolve(dateTime);
    }
    return sails.services.systemconfig.parseRestart(type.value, time.value); 
  })
  .then((dateTime) => {
    sails.log.debug(dateTime,'----This time to send restart message----');//调试
    var rule = new Schedule.RecurrenceRule();
    for(let key in dateTime){
      rule[key] = parseInt(dateTime[key]);
    }
    me.schedule = Schedule.scheduleJob(rule, function(){
      sails.services.systemconfig.sendRestartInfo();
    });
  })
  .catch((err) => {
    sails.log.error(err);
  })
}