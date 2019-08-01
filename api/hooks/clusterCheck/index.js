'use strict'
const uuid = require('node-uuid');
const checkInterval = 2 * 60 * 1000;
const co = require('co');
const Redis = require('../../services/Redis');

module.exports = function ClusterCheck(sails) {
  return {
    initialize: function (cb) {
      sails.log.debug('#### ClusterCheck Hook: Loaded ####');
      let interval = null;
      function check() {
        co(function* () {
          let length = yield Redis.scardAsync('broadcastList');
          if (length === 0) {
            return yield Promise.resolve('No cabinet');
          }
          //Notice user that new cabinet wanna join
          // 去掉待确认提示
          // sails.services.message.all('有待确认的柜机组网请求', 'user.message', 'both');
        })
          .catch((err) => {
            sails.log.error(err);
          })
      }
      function checkAlive() {
        setInterval(function () {
          sails.services.cabinet.checkAlive();
        }, 90 * 1000)
      }
      sails.after('lifted', function () {
        setTimeout(function () {
          co(function* () {
            const hasMasterConfig = yield System.findOne({ key: 'isMaster' });
            if (hasMasterConfig && hasMasterConfig.value !== null) {
              let localCabinet = yield Cabinet.findOne({ isLocal: true });
              if (!localCabinet) {
                DefaultData.InitCabinet();
              } else if (localCabinet.isMaster) {
                setTimeout(function () {
                  sails.services.cabinet.checkAlive();
                }, 15 * 1000);
                checkAlive();
                //As Master
                sails.services.etcd.startMaster(localCabinet);
                //Start listening
                sails.services.broadcast.announce(localCabinet);
                setInterval(check, checkInterval);
              } else {
                //As slave
                sails.services.discover.checkCluster(localCabinet);
              }
            }
          })
            .catch((err) => {
              sails.log.error(err);
            })
        }, 10 * 1000);
      });
      return cb();
    }
  }
}

