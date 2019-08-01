/*
*
* fifodataPush Hook Start
*/
'use strict';
const Promise = require('bluebird');
const _ = require('lodash');
const FifoServer = require('bitinvo-fifo').FifoServer;

module.exports = function fifoDataPush(sails) {
  sails.log.silly('Fifo Data Push Hook Loaded');
  return {
    initialize: function (cb) {
      sails.log.debug(' #### fifoDataPushHook is initialized @1 #### ');

      var me = this;
      const server = FifoServer;
      var cache = {};
      //Open Door Generator
      function* CloseDoorStep() {
        yield 'DoorStateChange';
        yield 'DoorHandStateChange';
        return 'DoorMotorStateChange';
      };
      function* OpenDoorStep() {
        yield 'DoorMotorStateChange';
        yield 'DoorHandStateChange';
        return 'DoorStateChange';
      };
      var openDoor = OpenDoorStep();
      var closeDoor = CloseDoorStep();


      //Send Log
      var sendLog = function (logData) {
        OptLog.create(logData)
          .exec(function (err, data) {
            if (err) {
              sails.log.error('###Create Log Failed###')
              sails.log.error(err);
            } else {
              sails.log.verbose('###Create Log Success###');
            }
          });
      };

      var clear = function () {
        cache = {};
        openDoor = OpenDoorStep();
        closeDoor = CloseDoorStep();
      };

      /**
      * 监听推送emit上来的事件并进行数据库处理
      */
      var pushHandler = function (rawData, parsed) {
        sails.log.verbose('###Server:Get New Push Message###');
        sails.log.silly(parsed);
        parsed.map((e) => {
          //可能返回一个Push信息，一个get信息 , 必须检查isPush, 这个在发fifodata的时候的bug， 已经解决
          if (!e.isPush) return;
          if (typeof e.msgTypeId === 'undefined') return;
          let msgType = e.msgTypeId.split('.');
          let logData = {};
          if (msgType[0] == 'gun') {
            sails.log.verbose('###Got Gun Message###')
            CabinetModule.findOne({
              type: 'gun',
              canId: e.canId,
              moduleId: e.positionId
            }).populate('cabinet')
              .then(function (data) {
                if (data) {
                  if (msgType[1] && msgType[1] == 'cabinet') {
                    //枪锁开启状态
                    logData = {
                      object: 'cabinet',
                      objectId: data.id,
                      action: '枪柜锁定状态变更',
                      log: '枪柜锁定状态:{操作前:' + data.lockState + ',操作后:' + e.isOpen + '}',
                      logType: 'normal',
                      cabinet: data.cabinet.id,
                      org: data.cabinet.org
                    };
                    data.lockState = e.isOpen;
                    data.updatedAt = new Date();
                    data.UpdatedFrom = sails.config.cabinet.id
                    data.save(function (err, suc) {
                      if (err) {
                        Promise.reject(err)
                      } else if (suc) {
                        Promise.resolve()
                      }
                    })
                  } else {
                    /**
                     * 枪位枪支是否在位
                     * 0是在位1是不在位
                     */
                    e.isIn = e.isIn ? 0 : 1;
                    //gun isIn
                    logData = {
                      object: 'gun',
                      objectId: data.id,
                      action: '枪在位状态变更',
                      log: '枪在位状态:{操作前:' + data.load + ',操作后:' + e.isIn + '}',
                      logType: 'normal',
                      cabinet: data.cabinet.id,
                      org: data.cabinet.org
                    };
                    data.load = e.isIn;
                    data.UpdatedFrom = sails.config.cabinet.id;
                    Gun.update({ id: data.gun }, { storageStatus: data.load ? 'in' : 'out' }).exec((err, rs) => {
                      if (err) sails.log.error(err);
                    })
                    data.updatedAt = new Date();
                    sails.services.lock.updateLock(data.id, e.isIn);
                    data.save(function (err, suc) {
                      if (err) {
                        Promise.reject(err)
                      } else if (suc) {
                        Promise.resolve({
                          countChanged: true,
                          type: 'gun'
                        });
                      }
                    });
                  }
                } else {
                  sails.log.error('###No such info###')
                  return Promise.reject('No Such Data')
                }
              }).then(function (data) {
                return OptLog.create(logData)
              }).then(function (data) {
                sails.log.verbose('###Create Log Success###')
                let rs = [{ load: '', capacity: '' }];
                let sql = "select sum(`load`) as `load` from cabinetmodule where type ='gun' group by type";
                let capacitySql = "select sum(`capacity`) as `capacity` from cabinetmodule where type='gun'";
                sails.log.verbose('###Got Gun capacity and load###');
                CabinetModule.query(sql, function (err, load) {
                  if (err) {
                    sails.log.error(err);
                  }
                  CabinetModule.query(capacitySql, (err, capacity) => {
                    if (err) {
                      sails.log.error(err);
                    }
                    rs[0].load = load[0] ? load[0].load : null;
                    rs[0].capacity = capacity[0] ? capacity[0].capacity : null;
                    sails.log.debug(rs);
                    sails.services.message.all(rs, 'allCount', 'both');
                  })
                });
              }).catch(function (err) {
                sails.log.error(err);
              })
          } else if (msgType[0] == 'bullet') {
            // //bullet
            // sails.log.verbose('###Got Bullet Message###')
            // CabinetModule.findOne({
            //   type: 'bullet',
            //   canId: e.canId
            // }).populate('cabinet')
            //   .then(function (data) {
            //     if (data) {
            //       if (msgType[1] && msgType[1] == 'cabinet') {
            //         //Bullet lockState
            //         logData = {
            //           object: 'cabinet',
            //           objectId: data.id,
            //           action: '子弹柜锁定状态变更',
            //           log: '子弹柜锁定状态:{操作前:' + data.lockState + ',操作后:' + e.isOpen + '}',
            //           logType: 'normal',
            //           cabinet: data.cabinet.id,
            //           org: data.cabinet.org
            //         };
            //         data.lockState = e.isOpen;
            //         data.updatedAt = new Date();
            //         data.save(function (err, suc) {
            //           if (err) {
            //             Promise.reject(err)
            //           } else if (suc) {
            //             Promise.resolve()
            //           }
            //         })
            //       } else {
            //         //Bullet Number
            //         logData = {
            //           object: 'bullet',
            //           objectId: data.id,
            //           action: '子弹数量变更',
            //           log: '子弹数量:{操作前:' + data.load + ',操作后:' + e.number + '}',
            //           logType: 'normal',
            //           cabinet: data.cabinet.id,
            //           org: data.cabinet.org
            //         };
            //         data.load = e.number;
            //         data.updatedAt = new Date();
            //         data.save(function (err, suc) {
            //           if (err) {
            //             Promise.reject(err)
            //           } else if (suc) {
            //             Promise.resolve({
            //               countChanged: true,
            //               type: 'bullet'
            //             })
            //           }
            //         })
            //       }
            //     } else {
            //       sails.log.error('###No such info###')
            //       return Promise.reject('No Such Data')
            //     }
            //   }).then(function (data) {
            //     if (data && data.countChanged) {
            //       sails.services.cabinet.count(data.type, (err, count) => {
            //         if (!err && count.length > 0) {
            //           sails.config.innerPubsub.emit('count', data.type, count[0].load);
            //         } else {
            //           sails.log.error(err);
            //         }
            //       });
            //     }
            //     return OptLog.create(logData)
            //   }).then(function (data) {
            //     sails.log.verbose('###Create Log Success###')
            //   }).catch(function (err) {
            //     sails.log.error(err);
            //   })
          } else if (msgType[0] == 'cabinet') {
            sails.log.verbose('###Got Door Message###')
            sails.log.info(e);
            if (msgType[1] && msgType[1] == 'door') {
              DoorState.findOne({
                DoorId: e.doorId
              })
                .then(function (data) {
                  if (data) {
                    return data;
                  } else {
                    return DoorState.create({ DoorId: e.doorId, DoorState: 1, DoorHandState: 1, DoorMotorState: 1 });
                  }
                })
                .then(function (data) {
                  //Door
                  if (!cache.DoorId) { _.assign(cache, data) };
                  if (cache.DoorState == 1 && cache.DoorHandState == 1 && cache.DoorMotorState == 1) {
                    //Open
                    if (e.typeId == 30) {
                      let generator = openDoor.next();
                      sails.log.debug(generator);
                      if (generator.value == 'DoorStateChange' && generator.done) {
                        sails.log.verbose('Generator Complete,Start Update');
                        return DoorState.update({ DoorId: e.doorId }, { DoorState: 0, DoorHandState: 0, DoorMotorState: 0 })
                          .then((data) => {
                            sails.log.debug('OpenSuccess');
                            logData = {
                              object: 'bullet',
                              objectId: data.id,//for test
                              log: '开门'
                            };
                            sendLog(logData);
                            sails.services.message.all('DoorOpened', 'DoorEvent', 'local');
                            cache = {};
                            openDoor = OpenDoorStep();
                          });
                      } else {
                        openDoor = OpenDoorStep();
                        return Promise.reject('StateError');
                      };
                    } else if (e.typeId == 31) {
                      let generator = openDoor.next();
                      sails.log.debug(generator);
                      if (generator.value != 'DoorHandStateChange') {
                        openDoor = OpenDoorStep();
                        return Promise.reject('StateError');
                      };
                    } else if (e.typeId == 32 && e.motorStatus === 0) {
                      let generator = openDoor.next();
                      sails.log.debug(generator);
                      if (generator.value != 'DoorMotorStateChange') {
                        openDoor = OpenDoorStep();
                        return Promise.reject('StateError');
                      };
                    };
                  } else if (cache.DoorState == 0 && cache.DoorHandState == 0 && cache.DoorMotorState == 0) {
                    //Close
                    if (e.typeId == 30) {
                      let generator = closeDoor.next();
                      sails.log.debug(generator);
                      if (generator.value != 'DoorStateChange' && generator.done) {
                        closeDoor = CloseDoorStep();
                        return Promise.reject('StateError');
                      };
                    } else if (e.typeId == 31) {
                      let generator = closeDoor.next();
                      sails.log.debug(generator);
                      if (generator.value != 'DoorHandStateChange') {
                        closeDoor = CloseDoorStep();
                        return Promise.reject('StateError');
                      };
                    } else if (e.typeId == 32 && e.motorStatus === 0) {
                      let generator = closeDoor.next();
                      sails.log.debug(generator);
                      if (generator.value == 'DoorMotorStateChange' && generator.done) {
                        sails.log.verbose('Generator Complete,Start Update');
                        return DoorState.update({ DoorId: e.doorId }, { DoorState: 1, DoorHandState: 1, DoorMotorState: 1 })
                          .then((data) => {
                            sails.log.debug('Close Success');
                            logData = {
                              object: 'bullet',
                              objectId: data.id,//for test
                              log: '关门'
                            };
                            sendLog(logData);
                            sails.services.message.all('DoorClosed', 'DoorEvent', 'local');
                            cache = {};
                            closeDoor = CloseDoorStep();
                          });
                      } else {
                        closeDoor = CloseDoorStep();
                        return Promise.reject('StateError');
                      };
                    };
                  } else {
                    sails.log.debug('State Error');
                    clear();
                  }
                })
                .catch(function (err) {
                  sails.log.error(err);
                  clear();
                });
            }
          } else if (msgType[0] === 'isitdata') {
            sails.log.debug('#### Got Gun Isitdata Message ####');
            sails.log.debug('#### This is gun isit Msg ####');
            sails.log.debug(`#### gun count is ${e.count} ####`);
            //fug 是否更新每条枪支和模块信息
            sails.services.redis.get('force_update_gun', (err, fug) => {
              if (err) {
                sails.log.error('Fifodatapush Hook Error');
                sails.log.error(err);
              } else {
                Cabinet.findOne({ isLocal: true }).exec((err, cb) => {
                  if (err) {
                    sails.log.error(err);
                  } else {
                    for (let i in e.guns) {
                      //加入延时, 防止短时间内产生大量网络请求
                      setTimeout(() => {
                        //!canId默认从126开始
                        CabinetModule.findOne({ canId: 126 + Number(i), cabinet: cb.code }).exec((err, cm) => {
                          if (cm) {
                            //更新枪支信息
                            Gun.findOne({ id: cm.gun }).exec((err, gun) => {
                              if (err) {
                                sails.log.error(err)
                              } else if (gun && fug === 'true') {
                                Gun.update({ id: cm.gun }, { storageStatus: e.guns[i] ? 'out' : 'in' }).exec((err, rs) => {
                                  if (err) sails.log.error(err);
                                })
                              } else if (gun && gun.storageStatus !== (e.guns[i] ? 'out' : 'in')) {
                                Gun.update({ id: cm.gun }, { storageStatus: e.guns[i] ? 'out' : 'in' }).exec((err, rs) => {
                                  if (err) sails.log.error(err);
                                })
                              }
                            })
                            //更新模块信息
                            //SGSCom返回的信息中, 1代表没有枪, 0代表有枪, 所以数据库和SGSCom数值相等代表实际不相等
                            if (fug === 'true') {
                              CabinetModule.update({ canId: 126 + Number(i), cabinet: cb.code }, { load: e.guns[i] ? 0 : 1, UpdatedFrom: sails.config.cabinet.id }).exec((err, rs) => {
                                if (!err) sails.log.debug(`#### fifodatapush hook : get gun isitdata and update Module ${126 + Number(i)} 's load as ${e.guns[i] ? 0 : 1} ####`)
                              })
                            } else if (cm.load !== (e.guns[i] ? 0 : 1)) {
                              CabinetModule.update({ canId: 126 + Number(i), cabinet: cb.code }, { load: e.guns[i] ? 0 : 1, UpdatedFrom: sails.config.cabinet.id }).exec((err, rs) => {
                                if (!err) sails.log.debug(`#### fifodatapush hook : get gun isitdata and update Module ${126 + Number(i)} 's load as ${e.guns[i] ? 0 : 1} ####`)
                              })
                            }
                          }
                        })
                      }, 100 * i)
                    }
                  }
                })
              }
            })
          }
        })
      };

      //暂时监听fifodataPush
      //需要等到 orm准备好之后再去启动监听， 否则数据库可能更新不进去
      sails.after(['hook:orm:loaded', 'hook:fifo:loaded'], function () {
        // Finish initializing custom hook
        setTimeout(function () { //在真机上如果不延时的话， 会出现访问数据库超时的错误
          server.on('fifodataPush', _.bind(pushHandler, me));
        }, 2000);
      });

      return cb();
    }
  };
};
