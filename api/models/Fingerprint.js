'use strict';
/**
* Fingerprint.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    data: {
      type: 'binary'
    },
    owner: {
      model: 'user'
    },
    used: {
      type: 'integer',
      defaultsTo: 0
    },
    version: {
      type: 'integer',
      defaultsTo: 1
    },
    chksum: {
      type: 'string'
    }

  },
  beforeCreate: function(item, cb){
    let newChksum = sails.services.syncrole.pureSign(item, 'fingerprint');
    item.chksum = newChksum;
    cb();
  },
  afterCreate: function(item, cb){
    Fingerprint.findOne({id: item.id})
    .then((data) => {
      if(data){
        sails.services.fingerprint.preloadAppend(data.owner, data.id, data.data);
        sails.services.syncrole.Sync(data, 'fingerprint');
        cb();
      }else{
        cb();
      }
    })
    .catch((err) => {
      cb(err);
    })
  },

  afterDestroy: function(item, cb){
    sails.services.syncrole.Sync(item, 'fingerprint', 'destroy');
    cb();
  }
};