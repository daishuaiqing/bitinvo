'use strict'
const interval = 10 * 1000 //每10s检测工单

module.exports = function approvedApplication(sails) {
  return {
    initialize: function (cb) {
      function scanAppcation() {
        sails.log.verbose('Checking Approved Application');
        sails.services.application.publishList();
        setTimeout(function () {
          scanAppcation();
        }, interval);
      };

      sails.after(['lifted'], function () {
        // Finish initializing custom hook
        scanAppcation();
      });
      return cb();
    }
  }
}