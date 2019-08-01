'use strict';
var _ = require('lodash');

/**
 * sessionAuth
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 * @docs        :: http://sailsjs.org/#!documentation/policies
 */
module.exports = function(req, res, next) {
  // User is allowed, proceed to the next policy,
  // or if this is the last policy, the controller
  sails.log.debug('sessionAuth Check : begin');

  if (req.session.authenticated || req.authenticated) {
    sails.log.debug('sessionAuth Check: already has user in session');
    return next();
  }

  sails.log.debug('sessionAuth Check : fail ');
  res.status(403).json({ error: 'You are not permitted to perform this action.' });
};
