/*
*
* SystemAlarmHook Start
*/
'use strict';
const _ = require('lodash');
const Promise = require("bluebird");
const queryString = require('querystring');
const doorRepairUrl = '/doorLockRepair';

const BitinvoFifo = require('bitinvo-fifo');
const FifoClient = BitinvoFifo.FifoClient;
const FifoServer = BitinvoFifo.FifoServer;
const FIFO = BitinvoFifo.Fifo;

var onError = function (err) {
  sails.log.error(' ##### SystemAlarmHook :onError #### ');
  sails.log.error(err);
}

var createOptLog = function (data) {
  MessageExchange.uploadAlarmMsg(data);
  OptLog.create(data)
    .exec(function (err) {
      if (err) {
        sails.log.error(' #### SystemAlarmHook :createOptLog  adding OptLog fails');
        sails.log.error(err);
      }
    });
}

var alert = function (name) {
  sails.services.alarm.alert(name);
}

let me = this;

module.exports = function SystemAlarm(sails) {
  sails.log.silly('SystemAlarmHook Loaded');
  return {
    initialize: function (cb) {
      sails.log.debug(' #### SystemAlarmHook is initialized @1 #### ');
      var sm = FifoClient.sendFifoMessage;
      var messageSrv = sails.services.message;
      const Redis = sails.services.Redis;
      const cabinetId = sails.config.cabinet.id;
      var server = FifoServer;
      var me = this;
      var userId = sails.config.systemOptId;

      var handler = function (rawData, parseds) {
        sails.log.silly(' ##### SystemAlarmHook:Handler #### ');
        sails.log.silly(parseds);
        _.each(parseds, function (parsed) {
          if (parsed) {
            let name = parsed.name;
            let doorId = parsed.doorId;
            let doorName = '';
            if (doorId) {
              switch (doorId) {
                case 1:
                  doorName = '左门';
                  break;
                case 2:
                  doorName = '右门';
                  break;
              }
            }
            Cabinet.findOne({ id: cabinetId }).exec((err, cabinet) => {
              if (err) {
                sails.log.error(`#### SYSALARM : error`);
                sails.log.error(err);
              } else if (cabinet) {
                const cName = cabinet.name;
                switch (name) {
                  case 'SGS_MESSAGE_ALARM_DOOR_CLOSE_OUTTIMER': // 门超时未关
                    messageSrv.alarm(`${doorName}柜门超时未锁闭报警`, 'doorCloseTimeOut', 'local');
                    alert(name);
                    createOptLog({
                      object: 'alarm',
                      action: '柜门超时未锁闭报警',
                      log: `柜机 ${cName} ${doorName}柜门超时未锁闭`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_ALARM_HAND_CLOSE': // 把手关
                    messageSrv.alarm(`${doorName}手动关门报警`, 'doorCloseTimeOut', 'local');
                    alert(name);
                    createOptLog({
                      object: 'alarm',
                      action: '手动关门报警',
                      log: `柜机 ${cName} ${doorName}手动关门报警`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_ALARM_BULLET_CLOSE_OUTTIMER': // 子弹门超时未关
                    messageSrv.alarm('子弹门超时未锁闭报警', 'bulletDoorCloseTimeOut', 'local');
                    alert(name);
                    createOptLog({
                      object: 'alarm',
                      action: '子弹仓门超时未关报警',
                      log: `柜机 ${cName} 子弹仓门超时未关`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_ALARM_ILLE_DOOR_OPEN': // 非法开门报警
                    MessageExchange.uploadOpenMsg({}, 1);
                    messageSrv.alarm('非正常开启柜门报警', 'illegalDoorOpened', 'local');
                    alert(name);
                    createOptLog({
                      object: 'alarm',
                      action: '非正常开启柜门报警',
                      log: `柜机 ${cName} 非正常开启柜门`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_ALARM_VIBRATION': // 震动
                    messageSrv.alarm('柜体异常震动报警', 'shaking', 'local');
                    alert(name);
                    createOptLog({
                      object: 'alarm',
                      action: '柜体异常震动报警',
                      log: `柜机 ${cName} 柜体异常震动`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_ALARM_LOCKE_OPEN_DOOR': // 钥匙手动开门报警
                    MessageExchange.uploadOpenMsg({}, 1);
                    messageSrv.alarm(`备用方式开启柜门${doorName}报警`, 'mannualOpenDoor', 'local');
                    alert(name);
                    createOptLog({
                      object: 'alarm',
                      action: '备用方式开启柜门报警',
                      log: `柜机 ${cName} 备用方式开启柜门${doorName}`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_ALARM_LOW_POWER': // 低电量报警
                    messageSrv.alarm('智能柜断电报警', 'lowpower', 'local');
                    alert(name);
                    me.handler = function (message) {
                      messageSrv.all([message.type.toString(), message.soc.toString()], 'powerType', 'both');
                    }
                    sm('getPowerState',
                      {
                        canId: 253
                      },
                      _.bind(me.handler, me),
                      _.bind(onError, me)
                    );
                    createOptLog({
                      object: 'alarm',
                      action: '智能柜断电报警',
                      log: `柜机 ${cName} 智能柜断电`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_ALARM_LOCK_OPEN_BULLET': // 钥匙手动开子弹锁报警
                    messageSrv.alarm('备用方式开子弹锁报警', 'mannualOpenBulletDoor', 'local');
                    alert(name);
                    createOptLog({
                      object: 'alarm',
                      action: '备用方式开子弹锁报警',
                      log: `柜机 ${cName} 备用方式开子弹锁报警`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_ALARM_LOCK_OPEN_GUN': // 钥匙手动开枪锁报警
                    messageSrv.alarm('备用方式开枪锁报警', 'mannualOpenGunDoor', 'local');
                    alert(name);
                    createOptLog({
                      object: 'alarm',
                      action: '备用方开枪锁报警',
                      log: `柜机 ${cName} 备用方开枪锁报警`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_LOCK_JAMMED': // 枪锁卡死警报
                    var confirmPath = [doorRepairUrl, 'markDoorLockRepaired?'].join('/');
                    var queryStr = queryString.stringify({ canId: parseds[0].canId, positionId: parseds[0].positionId });
                    var confirmAPI = [confirmPath, queryStr].join('');
                    var cancleAPI = [doorRepairUrl, 'cancleRepair'].join('/');
                    let jammedCanId = parseds[0].canId;
                    let jammedPositionId = parseds[0].positionId;
                    messageSrv.all(`CanId: ${jammedCanId}, PosId: ${jammedPositionId} 枪锁卡死, 请将枪支正确放入后，点击确认`, 'user.message', 'local', confirmAPI,
                      cancleAPI, false, false);
                    createOptLog({
                      object: 'alarm',
                      action: '枪锁卡死报警',
                      log: `柜机 ${cName} 枪锁卡死报警`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_LOCK_OPEN_JAMMED': // 枪锁堵转报警
                    let CanId = parseds[0].canId;
                    let moduleId = parseds[0].positionId;
                    CabinetModule.update({ canId: CanId, moduleId: moduleId }, { gunLock: 'broken', UpdatedFrom: sails.config.cabinet.id })
                      .exec((err, update) => {
                        if (err) {
                          sails.log.error(err);
                        }
                      });
                    messageSrv.all(`${parseds[0].canId}号枪锁${parseds[0].positionId}号枪位堵塞,需要修理请将枪支正确放入后,点击确认`, 'user.message', 'local', false, false);
                    createOptLog({
                      object: 'alarm',
                      action: '枪锁堵转报警',
                      log: `柜机 ${cName} 枪锁堵转报警`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_DOOR_JAMMED': // 门锁卡死警报
                    var confirmPath = [doorRepairUrl, 'markDoorLockRepaired?'].join('/');
                    var queryStr = queryString.stringify({ canId: parseds[0].canId, positionId: parseds[0].positionId });
                    var confirmAPI = [confirmPath, queryStr].join('');
                    var cancleAPI = [doorRepairUrl, 'cancleRepair'].join('/');
                    switch (parsed.positionId) {
                      case '1':
                        doorName = '左门';
                        break;
                      case '2':
                        doorName = '右门';
                        break;
                    }
                    messageSrv.all(`${doorName}门锁卡死, 重新关门后点击确认`, 'user.message', 'local', confirmAPI,
                      cancleAPI, false, false);
                    createOptLog({
                      object: 'alarm',
                      action: '门锁卡死报警',
                      log: `柜机 ${cName} ${doorName}门锁卡死报警`,
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                  case 'SGS_MESSAGE_HEARTBEAT_ERR': //心跳包报警
                    var canId = parseds[0].canId;
                    messageSrv.all('ID: ' + canId + ' 通讯失败', 'user.message', 'both');
                    createOptLog({
                      object: 'alarm',
                      action: '枪锁心跳包报警',
                      log: `柜机 ${cName} ` + '枪锁主控板: ' + canId + ' 通讯失败',
                      logType: 'warning',
                      objectId: null,
                      cabient: cabinetId,
                      createdBy: userId,
                      updatedBy: userId
                    });
                    break;
                }
              }
            })
          } else {
            sails.log.error(' ##### SystemAlarmHook:Handler #### ');
          }
        })
      }


      sails.after(['lifted'], function () {
        // Finish initializing custom hook
        setTimeout(function () { //在真机上如果不延时的话， 会出现访问数据库超时的错误
          server.on('fifodataPush', _.bind(handler, me));
        }, 2000);
      });

      sails.after(['lowered'], function () {
        sails.log.silly(' ####  SystemAlarmHook:  Server is lowered, Module Checking hook is going to shutdown @ 1 #### ');
        //close file
        server.close();
      });

      return cb();
    }
  }
}
/**
* SystemAlarmHook End
*/
