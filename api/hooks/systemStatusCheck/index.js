/*
*
* SystemStatusHook Start
*/

'use strict';

const _ = require('lodash');
const Promise = require("bluebird");
const FIFO = require('bitinvo-fifo').Fifo;

var checkInterval = sails.config.cabinetSettings.systemStatusCheckInterval;//24 * 60 * 60 * 1000;
var alcohoStateCheckInterval = sails.config.cabinetSettings.alcohoStateCheckInterval;
var smsStateCheckInterval = sails.config.cabinetSettings.smsStateCheckInterval;
var onError = function (err) {
  sails.log.error(' ##### SystemStatusHook :onError #### ');
  sails.log.error(err);
}

var createOptLog = function (data) {
  OptLog.create(data)
    .exec(function (err) {
      if (err) {
        sails.log.error(' #### SystemStatusHook :createOptLog  adding OptLog fails');
        sails.log.error(err);
      }
    });
}

module.exports = function SystemStatusHook(sails) {
  sails.log.silly('SystemStatusHook Loaded');
  return {
    initialize: function (cb) {
      sails.log.debug(' #### SystemStatusHook is initialized @1 #### ');
      const pubsub = sails.config.innerPubsub;
      var sm = sails.services.fifoclient.sendFifoMessage;
      var messageSrv = sails.services.message;
      var me = this;
      var userId = sails.config.systemOptId;
      const NeverMore = sails.services.nevermore;
      const level1 = 8;
      const level2 = 80;

      //掉电报警只报一次， 这个标志位用来记录是否已经报警过， 如果报警了，就不要再出发报警。掉电之后上电才重置这个标志位
      var isPowerStateAlarmSent = false;
      //低电量报警只报一次， 这个标志位用来记录是否已经报警过， 如果报警了，就不要再出发报警。 充满之后才重置这个标志位
      var isPowerLowAlarmSent = false;

      me.handler = function (message, log) {
        sails.log.silly(' ##### SystemStatusHook:Handler #### ');
        sails.log.silly(message);

        if (message && log) {
          sails.log.silly(' #####  SystemStatusHook: Loop into the return fifo parsed data  @@@@ 3 #### ');
          sails.log.silly(message);
          // the params we pass to sails.services.fifoclient.sendFifoMessage
          var params = log.params;
          sails.log.silly(' #####  SystemStatusHook: cache log  @@@@ 3.1 #### ');
          sails.log.silly(params);

          if (message.name === 'SGS_MESSAGE_GET_POWER_STATE') {
            sails.log.silly(' #####  ModuleStatusCheckHook:handler - Entering SGS_MESSAGE_GET_POWER_STATE  @@@@ 5 #### ');
            let _powerType = message.type.toString();
            let _powerValue = message.soc.toString();
            pubsub.emit('power', _powerValue);
            sails.services.redis.hset(sails.config.cabinet.id, 'power', _powerValue, (err, rs) => {
              if (err) sails.log.error(err);
            })
            pubsub.emit('powerType', _powerType);
            sails.services.redis.hset(sails.config.cabinet.id, 'powerType', _powerType, (err, rs) => {
              if (err) sails.log.error(err);
            })
            sails.services.redis.get('focusCabinet', (err, cabinet) => {
              if (err) {
                sails.log.error(`##### systemStatusCheckHook : power get focusCabinet error ${err} ####`)
              } else if (!cabinet) {
                messageSrv.all([_powerType, _powerValue], 'powerType', 'both');
              } else {
                sails.services.redis.hget(cabinet, 'power', (err, power) => {
                  if (err) sails.log.error(err);
                  sails.services.redis.hget(cabinet, 'powerType', (err, powerType) => {
                    if (err) sails.log.error(err);
                    messageSrv.all([powerType, power], 'powerType', 'both');
                  })
                })
              }
            })
            if (_powerValue != null
              && typeof _powerValue != 'undefined'
              && _powerValue < 5
              && _powerType === FIFO.SGS_POWER_STATE.SGS_POWER_STATE_USING_BACKUP) {
              if (!NeverMore.check('power_low')) {
                messageSrv.alarm('备用电源报警, 电量低', 'powerType', 'local');
                NeverMore.block('power_low');
                //关机
                sails.services.shellproxy.shutdown();
              }

              createOptLog({
                object: 'system',
                action: '备用电源报警',
                log: '备用电源报警, 电量过低, 当前电量' + _powerValue,
                logType: 'warning',
                objectId: -1,
                createdBy: userId,
                updatedBy: userId
              });
            } else if (_powerValue > 5) {
              NeverMore.unlock('power_low');
            }

            if (_powerType != null
              && (typeof _powerType != 'undefined')
              && _powerType === FIFO.SGS_POWER_STATE.SGS_POWER_STATE_USING_BACKUP) {
              if (!NeverMore.check('power_off')) {
                messageSrv.alarm('备用电源报警', 'powerType', 'local');
                sm('setAlertState', {
                  canId: 253,
                  type: 0,
                  state: 0
                });
                NeverMore.block('power_off');
              }

              createOptLog({
                object: 'system',
                action: '备用电源报警',
                logType: 'warning',
                log: '备用电源报警',
                objectId: -1,
                createdBy: userId,
                updatedBy: userId
              });
            } else if (_powerType != null
              && (typeof _powerType != 'undefined')
              && _powerType === FIFO.SGS_POWER_STATE.SGS_POWER_STATE_USING_AC) {
              NeverMore.unlock('power_off');
            }
          } else if (message.name === 'SGS_MESSAGE_GET_TEMPERATURE_STATE') {
            sails.log.silly(' #####  ModuleStatusCheckHook:handler - Entering SGS_MESSAGE_GET_TEMPERATURE_STATE @@@@ 6 #### ');
            let _temperature = message.soc.toString();
            pubsub.emit('temp', _temperature);
            sails.services.redis.hset(sails.config.cabinet.id, 'temp', _temperature, (err, rs) => {
              if (err) sails.log.error(err);
            })
            sails.services.redis.get('focusCabinet', (err, cabinet) => {
              if (err) {
                sails.log.error(`##### systemStatusCheckHook : temperature get focusCabinet error ${err} ####`)
              } else if (!cabinet) {
                messageSrv.all(_temperature, 'temperature', 'both');
              } else {
                sails.services.redis.hget(cabinet, 'temp', (err, temp) => {
                  if (err) sails.log.error(err);
                  messageSrv.all(temp, 'temperature', 'both');
                })
              }
            })



            if (_temperature && (_temperature > 65 || _temperature < -15)) {

              messageSrv.alarm('温度报警, 温度超出范围', 'temperature', 'local');
              sm('setAlertState', {
                canId: 253,
                type: 0,
                state: 0
              });
              createOptLog({
                object: 'system',
                action: '湿度报警',
                log: '温度报警, 温度超出范围, 当前温度' + _temperature,
                logType: 'warning',
                objectId: -1,
                createdBy: userId,
                updatedBy: userId
              });
            }
          } else if (message.name === 'SGS_MESSAGE_GET_HUMIDITY_STATE') {
            sails.log.silly(' #####  ModuleStatusCheckHook:handler - Entering SGS_MESSAGE_GET_HUMIDITY_STATE  @@@@ 6 #### ');
            let _humidity = message.soc.toString();
            pubsub.emit('humi', _humidity);
            sails.services.redis.hset(sails.config.cabinet.id, 'humi', _humidity, (err, rs) => {
              if (err) sails.log.error(err);
            })
            sails.services.redis.get('focusCabinet', (err, cabinet) => {
              if (err) {
                sails.log.error(`##### systemStatusCheckHook : power get focusCabinet error ${err} ####`)
              } else if (!cabinet) {
                messageSrv.all(_humidity, 'humidity', 'both');
              } else {
                sails.services.redis.hget(cabinet, 'humi', (err, humi) => {
                  if (err) sails.log.error(err);
                  messageSrv.all(humi, 'humidity', 'both');
                })
              }
            })

            if (_humidity && _humidity > 75) {
              if (!NeverMore.check('humidity')) {
                messageSrv.warning('湿度警告, 湿度大于75%', 'humidity', 'local');
                NeverMore.block('humidity');
              }
              createOptLog({
                object: 'system',
                action: '湿度警告',
                log: '湿度' + _humidity + '%, 大于70%',
                logType: 'warning',
                objectId: -1,
                createdBy: userId,
                updatedBy: userId
              });
            } else if (_humidity && _humidity < 75) {
              NeverMore.unlock('humidity');
            }
          } else if (message.name === 'SGS_MESSAGE_GET_ALCOHO') {
            sails.log.silly(' #####  ModuleStatusCheckHook:handler - Entering SGS_MESSAGE_GET_ALCOHO_LEVEL  @@@@ 6 #### ');
            let density = parseInt(message.density) * 220 / 1000 / 16; //220转化为mg/100mL , 16去除误差

            if (density > level1 && density < level2) {
              sails.log.debug('当前检测酒精超标-饮酒');
              sails.services.message.alarm('酒精检测超过饮酒标准报警，建议不要取枪', 'alcohoalarm', 'local');
            } else if (density > level2) {
              sails.log.debug('当前检测酒精超标-醉酒');
              sails.services.message.alarm('酒精检测超过醉酒标准报警，建议不要取枪', 'alcohoalarm', 'local');
            };

            messageSrv.all(density, 'alcoho', 'both');

          } else if (message.name === 'SGS_MESSAGE_GET_CSQ') {
            sails.log.silly(' #####  ModuleStatusCheckHook:handler - Entering SGS_MESSAGE_GET_SMS_DEVICE_STATUS  @@@@ 6 #### ');
            const csq = message.status;
            if (csq && csq == 0) {
              messageSrv.alarm('短信猫无信号', 'signal', 'local');
              sails.services.alarm.alert('signal');
            }
            messageSrv.all(csq, 'SMSDevice', 'both');
          }
        }
      }

      me.timer = null;
      me.alcohoTimer = null;

      function check() {
        me.timer = setTimeout(function () {
          sails.log.silly('Checking Temperature and Humidity');
          setTimeout(function () {
            sm('getTemperatureState',
              {
                canId: 253
              },
              _.bind(me.handler, me),
              _.bind(onError, me)
            );
          }, 0);
          setTimeout(function () {
            sm('getHumidityState',
              {
                canId: 253
              },
              _.bind(me.handler, me),
              _.bind(onError, me)
            );
          }, 500);
          setTimeout(function () {
            sm('getPowerState',
              {
                canId: 253
              },
              _.bind(me.handler, me),
              _.bind(onError, me)
            );
          }, 1000);
          check();
        }, checkInterval);
      }

      function alcohoCheck() {
        System.findOne({ key: 'enableAlcohol' }).exec((err, rs) => {
          if (err) {
            sails.log.error(err)
          } else if (rs && rs.value === 'true') {
            me.alcohoTimer = setTimeout(function () {
              sm('getAlcohoState',
                {
                  canId: 253
                },
                _.bind(me.handler, me),
                _.bind(onError, me)
              );
              alcohoCheck();
            }, alcohoStateCheckInterval)
          }
        })
      }

      function smsCheck() {
        me.smsTimer = setTimeout(function () {
          sm('getSMSDeviceStatus',
            {},
            _.bind(me.handler, me),
            _.bind(onError, me)
          );
          sails.services.sms.getSMSDeviceStatus();
          smsCheck()
        }, smsStateCheckInterval)
      }

      sails.after(['lifted'], function () {
        // Finish initializing custom hook
        setTimeout(function () { //在真机上如果不延时的话， 会出现访问数据库超时的错误
          check();
          alcohoCheck();
          smsCheck()
        }, 2000);
      });

      sails.after(['lowered'], function () {
        sails.log.silly(' ####  SystemStatusHook:  Server is lowered, Module Checking hook is going to shutdown @ 1 #### ');
        //close file
        server.close();
        //clean timer
        clearTimeout(me.timer);
        clearTimeout(me.alcohoTimer);
        clearTimeout(me.smsTimer);
      });
      return cb();
    }
  }
}
/**
* SystemStatusHook End
*/
