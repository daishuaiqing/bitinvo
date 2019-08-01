'use strict';
const co = require('co');

const onComplete = function (data) {
  sails.log.debug(' ##### Lock Service:openAll:Step Compel #### ');
  sails.log.debug(data);
}
const onError = function (err) {
  sails.log.debug(' ##### Lock Service:openAll:onError #### ');
  sails.log.error(err);
}

module.exports = {
  openall: function (type) {
    sails.log.debug(' ##### Lock Service:openAll  #### ');

    const sm = sails.services.fifoclient.sendFifoMessage;
    //select distinct canId from cabinetmodule order by canId;
    sm('openAll', { type: type }, onComplete, onError);
  },
  updateLock: (cabinetModuleId, lockState) => {
    co(function* () {
      let target = yield Application.findOne({ cabinetModule: cabinetModuleId, status: 'incomplete' });
      if (target) {
        if (lockState == 0) {
          try {
            sails.log.info('Target Gun Actually Return');
            return yield Application.update({ id: target.id }, { status: 'complete' });
          } catch (err) {
            sails.log.error('DB Error In UpdateLock: Return');
            return yield Promise.reject(err);
          }
        } else if (lockState == 1) {
          try {
            sails.log.info('Target Gun Not Actually Return');
            return yield Application.update({ id: target.id }, { status: 'processed' });
          } catch (err) {
            sails.log.error('DB Error In UpdateLock: Un Return');
            return yield Promise.reject(err);
          }
        }
      } else {
        let check = yield Application.findOne({ cabinetModule: cabinetModuleId, status: 'processed' });
        if (check) {
          return yield Promise.reject('工单信息未完成');
        } else {
          return yield Promise.reject('该枪位没有对应工单');
        }
      }
    })
      .then((data) => {
        sails.log.info('Target Gun Update status Success');
      })
      .catch((err) => {
        sails.log.error('Error In UpdateLock');
        sails.log.error(err);
      })
  },
  getGunIsisit: function (callback) {
    sails.log.debug('#### LockService : getGunIsisit ####');
    sails.services.redis.setex('force_update_gun', 300, 'true', (err, rs) => {
      if (err) {
        sails.log.error('Lock Service Error');
        sails.log.error(err);
      } else {
        const sm = sails.services.fifoclient.sendFifoMessage;
        sm('getGunIsisit', {}, function (msg) {
          sails.log.debug('#### LockService : getGunIsisit fifo sent success ####');
          callback(0, msg);
        }, function (err) {
          callback(err);
        });
      }
    })
  },

  testCanStates: function (callback) {
    sails.log.debug('#### LockService : testCanStates ####');
    const sm = sails.services.fifoclient.sendFifoMessage;
    sm('testCanStates', {}, function (message) {
      let msg = {
        states: message.states
      };
      callback(0, msg);
    }, function (err) {
      callback(err);
    });
  }
};
