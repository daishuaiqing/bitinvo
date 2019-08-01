'use strict';

// const _ = require('lodash');
// const redisClient = require('./Redis');

module.exports = {
  externalEndpoint : 'http://localhost:1337',

  getMasterTime : function(cb){
    Cabinet.findOne({isMaster: true}).exec((err, master) => {
      if(err){
        sails.log.error(`#### SystemController getMasterTime error : ${err} ####`);
        return cb(err);
      }
      if(!master) return cb('没有找到主机');
      if(master.isLocal) return cb('同步失败: 同步对象是本机');
      sails.services.shellproxy.getMasterTime(master.host);
      return cb(null, '同步中...')
    })
  }
};