/**
 * MonitController
 *
 * @description :: Server-side logic for managing monits
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
const messageSrv = sails.services.message;

module.exports = {
	setDiskState : function (req, res) {
    messageSrv.all(req.query.state, 'disk', 'both');
    return res.ok();
  }
};

