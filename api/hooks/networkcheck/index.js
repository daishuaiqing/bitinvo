/*
*
* Network Check Hook Start
*/

'use strict';

const _ = require('lodash');
const Promise = require("bluebird");
const FIFO = require('bitinvo-fifo').Fifo;
const OFFLINE = 'offline';
const ONLINE = 'online';

var checkInterval = sails.config.cabinetSettings.networkCheckInterval;
var setTimeDelay = 60 * 1000; //1min

var onError = function (err) {
  sails.log.error(' ##### Network Check Hook :onError #### ');
  sails.log.error(err);
}

var createOptLog = function (data) {
  OptLog.create(data)
    .exec(function (err) {
      if (err) {
        sails.log.error(' ####  Network Check Hook :create  adding OptLog fails');
        sails.log.error(err);
      }
    });
}

let setIpAfterReconnected = function () {
  sails.log.debug(' #### Network Check Hook: setIpAfterReconnected #### ');
  System.findOrCreate({ key: 'isAutoIp' }).exec((err, data) => {
    if (!data) {
      sails.log.error('#### Network Check Hook: not dhcp#### ');
    } else if (data && data.value !== 'true') {
      System.findOne({ key: 'ip' }).exec((err, data) => {
        if (data) {
          sails.log.debug(' #### Network Check Hook: set static ip #### ');
          sails.services.systemconfig.setIp(data.value);
        } else {
          sails.log.error('#### Network Check Hook: setIpAfterReconnected failed#### ');
          sails.log.error('no ip config in DB ');
        }
      });
    } else {
      sails.log.error('#### Network Check Hook: set dhcp#### ');
      ShellProxy.eth0Restart();
    }
  });
}

module.exports = function NetworkCheck(sails) {
  sails.log.silly('Network Check Hook Loaded');
  return {
    initialize: function (cb) {
      sails.log.debug(' #### Network Check Hook is initialized @1 #### ');
      var me = this;

      var sm = sails.services.fifoclient.sendFifoMessage;
      var message = sails.services.message;

      me.timer = null;

      function update(status) {
        System.findOrCreate({ 'key': 'connection' })
          .exec(function (err, sys) {
            if (err || !sys) {
              sails.log.error(' ##### Network Check Hook:handler error ##### ');
              sails.log.error(err);
              return;
            }
            sys.value = status;
            sys.save(function (err) {
              if (err) {
                sails.log.error(' #####Network Check Hook:handler update fails ##### ');
                sails.log.error(err);
              }
              var userId = sails.config.systemOptId;
              var action = status === OFFLINE ? '掉线' : '上线';
              var log = status === OFFLINE ? '网络失去连接' : '网络恢复连接';
              // createOptLog({
              //   object: 'system',
              //   action: action,
              //   log: log,
              //   logType: 'normal',
              //   objectId: sys.id,
              //   createdBy: userId,
              //   updatedBy: userId
              // });
              return;
            });
          });
      }

      me.connected = false;

      function check() {
        sails.log.silly(' #### Network Check Hook started : checking #### ');

        me.timer = setTimeout(function () {
          sails.log.silly('Checking Network');
          CabinetNetworkService.getNetworkInfo(function (err, ip) {
            if (err) {
              setIpAfterReconnected();
              if (me.connected) {
                sails.log.error('Checking Network: Can not connect');
                sails.log.error(err);
                me.connected = false;
                message.all('offline', 'connection', 'local');
                message.alarm('断网报警', 'connection', 'local');
                sails.services.alarm.alert('disconnect');
                update(OFFLINE);
              } else {
                sails.log.error(err);
              }
              return;
            } else if (ip) {
              if (!me.connected) {
                me.connected = true;
                message.all('online', 'connection', 'local');
                updateCabinet(ip);
                update(ONLINE);
              }
            }
          })
          check();
        }, checkInterval);
      }
      function syncTime() {
        CabinetNetworkService.getNetworkInfo(function (err, ip) {
          if (err) {
            return;
          } else if (ip) {
            System.findOrCreate({ key: 'isMaster' }).exec((err, master) => {
              if (!master || master.value == 'false') {
                System.findOrCreate({ key: 'syncMasterTime' }).exec((err, rs) => {
                  if (!rs) {
                    setTimeout(function () {
                      ShellProxy.setOSTimeByNtp();
                    }, setTimeDelay)
                  } else if (rs.value == 'true') {
                    setTimeout(function () {
                      sails.services.settings.getMasterTime((err, rs) => {
                        if (err) {
                          sails.log.error(`#### networkCheckHook error : ${err} ####`);
                        }
                      });
                    }, setTimeDelay)
                  }
                })
              }
            })
          }
        })
      }

      function updateCabinet(ip) {
        Cabinet.update({ code: sails.config.cabinet.id }, { host: ip.address }).exec((err, suc) => { if (err) sails.log.error(err) });
      };
      sails.after(['lifted'], function () {
        // Finish initializing custom hook
        setTimeout(function () { //在真机上如果不延时的话， 会出现访问数据库超时的错误
          check();
        }, 2000);
        syncTime();
        setInterval(syncTime, sails.config.cabinetSettings.ntpSyncInterval);
      });

      sails.after(['lowered'], function () {
        sails.log.silly(' ####  Network Check Hook:  Server is lowered, Module Checking hook is going to shutdown @ 1 #### ');
        //close file
        server.close();
        //clean timer
        clearTimeout(me.timer);
      });
      return cb();
    }
  }
}
/**
* Network Check Hook End
*/
