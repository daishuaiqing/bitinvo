'use strict';
const Promise = require('bluebird');
const net = require('net');
const fs = require('fs');
const cp = require('child_process');

module.exports = function InitData(sails) {
  sails.log.verbose('Init Data Hook Loaded');
  return {
    initialize: function (cb) {
      sails.log.debug(' #### InitData hook is initialized @1 #### ');
      const pubsub = sails.config.innerPubsub;
      //检查管道文件是否存在
      (function () {
        fs.stat('/tmp/sgs_output_fifo', (err, stats) => {
          if (err) {
            sails.log.error('Output File not exists: ' + err);
            cp.exec('mkfifo /tmp/sgs_output_fifo', (err, stdOut, stdErr) => {
              if (err) {
                sails.log.error('error:' + err);
              } else {
                sails.log.debug('Output Fifo Created')
              }
            })
          } else if (stats.isFIFO()) {
            sails.log.verbose('Output Fifo exists');
          };
        });
        fs.stat('/tmp/sgs_input_fifo', (err, stats) => {
          if (err) {
            sails.log.error('Input File not exists: ' + err);
            cp.exec('mkfifo /tmp/sgs_input_fifo', (err, stdOut, stdErr) => {
              if (err) {
                sails.log.error('error:' + err);
              } else {
                sails.log.debug('Input Fifo Created')
              }
            })
          } else if (stats.isFIFO()) {
            sails.log.verbose('Input Fifo exists');
          };
        });
      })()

      function InitSystemConfig() {
        System.findOrCreate({ key: 'ip' }).exec((err, data) => {
          if (data && data.value) {
            sails.services.systemconfig.setIp(data.value);
          } else {
            sails.log.debug('DB no Ip to Config')
            ShellProxy.eth0Restart();
          }
        });
        sails.services.systemconfig.getRTCTime();
        pubsub.on('stopStream', () => {
          sails.services.redis.set('stopStream', 'false', (err) => {
            if (err) sails.log.error(err);
          })
        })
      };
      function InitSystemProductId() {
        sails.log.debug(' #### Init System ProductId #### ');
        System.findOrCreate({ key: 'productId' }).exec((err, data) => { //1051文档中说明需要的11位ID
          if (err) {
            sails.log.debug('error occured setting productId!');
            sails.log.error(err);
            return;
          }
          if (data && !data.value) {
            sails.services.systemconfig.setProductId();
          } else {
            sails.log.debug('ProductId has been set');
          }
        });
      };

      function CheckLocalInfo() {
        return new Promise((resolve, reject) => {
          CabinetNetworkService.getNetworkInfo(function (err, ip) {
            if (err) reject(err);
            resolve(ip.address);
          })
        })
          .then((ip) => {
            let option = {
              host: ip,
              port: sails.config.port
            };
            return Cabinet.update({ code: sails.config.cabinet.id }, option);
          })
          .then((updateTarget) => {
            sails.log.debug(' #### InitData Hook : Update Local Cabinet Success #### ')
          })
          .catch((err) => {
            sails.log.error(err);
            setTimeout(function () {
              CheckLocalInfo();
            }, 15 * 1000);
          })
      }

      function InitRoute() {
        sails.services.shellproxy.initRoute();
      }

      function InitNtpServer() {
        System.findOne({ key: 'isMaster' }).exec((err, master) => {
          if (err) {
            sails.log.error(`#### InitData Hook: error ${err}####`)
          } else if (master && master.value == 'true') {
            sails.services.shellproxy.setNtpServer();
          }
        })
      }
      function InitFocusCabinetSetting() {
        System.findOne({ key: 'focusCabinet' }).exec((err, rs) => {
          if (err) {
            sails.log.error(err)
          } else if (rs && rs.value) {
            sails.services.redis.set('focusCabinet', rs.value, (err, rs) => {
              if (err) sails.log.error(err);
            })
          }
        })
      }
      function CleanFaceAndFinger() {
        sails.services.redis.del('face', (err) => {
          if (err) sails.log.error(err);
        });
        sails.services.redis.del('finger', (err) => {
          if (err) sails.log.error(err);
        });
        sails.services.redis.set('onAir', 0, (err, rs) => {
          if (err) sails.log.error(err);
        })
      }
      function InitFaceSetting() {
        Promise.all([
          System.findOne({ key: 'faceMaxRotateAngle' }),
          System.findOne({ key: 'faceFuzzyThreshold' }),
          System.findOne({ key: 'faceBrightThreshold' }),
          System.findOne({ key: 'minLoginFaceSize' }),
          System.findOne({ key: 'faceMatchThreshold' })
        ])
          .then((data) => {
            for (let i in data) {
              if (data[i]) setFaceArg(data[i].key, data[i].value);
            }
          })
          .catch((err) => {
            sails.log.error(err);
          })
      }
      function setFaceArg(type, value) {
        switch (type) {
          case 'faceMaxRotateAngle':
            type = 'setFaceRotateAngle';
            break;
          case 'faceFuzzyThreshold':
            type = 'setFaceFuzzyThreshold';
            break;
          case 'faceBrightThreshold':
            type = 'setFaceBrightThreshold';
            break;
          case 'minLoginFaceSize':
            type = 'setFaceMinLoginSize';
            break;
          case 'faceMatchThreshold':
            type = 'setFaceMatchThreshold';
            break;
        }
        sails.services.fifoclient.sendFifoMessage(
          type,
          { value: value },
          function (message) {
            if (message) {
              sails.log.debug(message);
              return;
            }
          },
          function (err) {
            sails.log.error(err);
          }
        );
      }
      function InitABGun() {
        sails.services.abgun.init()
      }
      sails.on('lifted', function () {
        // Finish initializing custom hook
        DefaultData.Init();
        DefaultData.InitCabinet();
        InitSystemConfig();
        InitSystemProductId();
        CheckLocalInfo();
        InitRoute();
        InitNtpServer();
        InitFaceSetting();
        InitFocusCabinetSetting();
        CleanFaceAndFinger();
        InitABGun();
      });
      return cb();
    }
  }
}
