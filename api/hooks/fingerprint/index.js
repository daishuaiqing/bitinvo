'use strict';

module.exports = function FingerPrintHook(sails) {
  sails.log.verbose('FingerPrintHook Loaded');
  return {

    initialize: function (cb) {
      sails.log.debug(' #### FingerPrintHook is initialized @1 #### ');
      sails.services.redis.set('fingerprintPreloaded', false, (err, rs) => {
        if (err) sails.log.error(err);
      })
      sails.after(['hook:orm:loaded', 'hook:fifo:loaded'], function () {
        sails.services.fingerprint.preloadBeforeVerify();
      });
      return cb();
    }
  }
}