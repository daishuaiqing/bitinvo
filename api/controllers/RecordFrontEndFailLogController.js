'use strict'

module.exports = {
  recordLog: function (req, res) {
    let message = req.body.message;
    let stack = req.body.stack;
    sails.log.error('## this is front-end fails log.message: ', message)
    sails.log.error('## This is front-end fails log.stack: ', stack)
    return res.ok();
  }
}
