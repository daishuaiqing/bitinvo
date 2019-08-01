'use strict';

module.exports = function (req, res, next) {
  sails.log.debug('localAccess: Check Ip %s ', req.ip);
  if(req.headers.asLocal){
    req.isLocal = true;
  }
  if(req.ip){
    if(req.ip === '::1' || req.ip.indexOf('127.0.0.1') > -1){
      sails.log.debug('localAccess: req from local');

      req.isLocal = true;
      res.cookie('islocal', 1, { maxAge: 900000, httpOnly: false });
    }
  }
  next();
};
