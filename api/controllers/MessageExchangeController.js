/**
 * MessageExchangeController
 *
 * @description :: Server-side logic for managing Messageexchanges
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
module.exports = {
  testOpenMsg: function (req, res) {
    MessageExchange.testUploadOpen();
    res.end();
  },

  testAlarmMsg: function (req, res) {
    MessageExchange.testUploadAlarm();
    res.end();
  }
};

