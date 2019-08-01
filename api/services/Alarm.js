'use strict'
const BitinvoFifo = require('bitinvo-fifo');
const request = require('request');
const sm = BitinvoFifo.FifoClient.sendFifoMessage;

const list = {
  SGS_MESSAGE_ALARM_DOOR_CLOSE_OUTTIMER: 'doorCloseTimeOut',
  SGS_MESSAGE_ALARM_HAND_CLOSE: 'mannualCloseDoor',
  SGS_MESSAGE_ALARM_BULLET_CLOSE_OUTTIMER: 'bulletDoorCloseTimeOut',
  SGS_MESSAGE_ALARM_ILLE_DOOR_OPEN: 'illegalDoorOpened',
  SGS_MESSAGE_ALARM_VIBRATION: 'shaking',
  SGS_MESSAGE_ALARM_LOCKE_OPEN_DOOR: 'mannualOpenDoor',
  SGS_MESSAGE_ALARM_LOW_POWER: 'lowpower',
  SGS_MESSAGE_ALARM_LOCK_OPEN_BULLET: 'mannualOpenBulletDoor',
  SGS_MESSAGE_ALARM_LOCK_OPEN_GUN: 'mannualOpenGunDoor',
  disconnect: 'disconnect',
  power: 'power',
  temperature: 'temperature',
  humidity: 'humidity',
  applicationOvertime: 'applicationOvertime'
}
module.exports = {
  alert: (name) => {
    name = list[name];
    System.findOne({ key: 'alarmConfig' }).exec((err, ac) => {
      if (err) {
        sails.log.error(err);
      } else if (ac && ac.value) {
        let config = {};
        try {
          config = JSON.parse(ac.value);
        } catch (e) {
          sails.log.error(e);
        }
        if (config[name] === 'true') {
          sm('setAlertState', {
            canId: 253,
            type: 0,
            state: 0
          });
        }
      }
    })
  },
  config: (name, cb) => {
    name = list[name];
    System.findOne({ key: 'alarmConfig' }).exec((err, ac) => {
      if (err) return cb(err);
      if (ac && ac.value) {
        let config = {};
        try {
          config = JSON.parse(ac.value);
        } catch (e) {
          return cb(e);
        }
        return cb(null, config[name]);
      } else {
        return cb(null, 'false');
      }
    })
  },
  apply: (config, cb) => {
    Cabinet.find({ isLocal: { '!': true } }).exec((err, cabinets) => {
      if (err) return cb(err);
      if (!cabinets || cabinets.length === 0) return cb('NO_CABINET_FOUND');
      let promiseArr = [];
      try {
        config = JSON.parse(config)
      } catch (e) {
        return cb(e);
      }
      for (let i in cabinets) {
        promiseArr.push(
          new Promise((resolve, reject) => {
            request({
              url : `http://${cabinets[i].host}:${cabinets[i].port}/system/alarmConfig`,
              method : 'POST',
              body : config,
              json: true,
              timeout: 10 * 1000
            }, (err, res) => {
              if(err) reject(err);
              resolve(res);
            })
          })
          .then((res) => {
            if(typeof res.body === 'object'){
              return Promise.resolve(res);
            }else if(typeof res.body === 'string'){
              try{
                res.body = JSON.parse(res.body);
                return Promise.resolve(res);
              }catch(err){
                sails.log.silly('Body is not JSON, return default');
                return Promise.resolve(res);
              }
            }
          })
        )
      }
      Promise.all(promiseArr).then((data) => {
        let result = {
          succeed: [],
          failed: []
        };
        for(let i in data){
          if(data[i].statusCode === 200){
            result.succeed.push(data[i].request.uri.hostname)
          }else{
            result.failed.push(data[i].request.uri.hostname)
          }
        }
        result.total = data.length;
        cb(null, result)
      }).catch((e) => {
        cb(e)
      })
    })
  }
}
