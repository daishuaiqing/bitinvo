/**
* Org.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    name: {
      type: 'string',
      unique: true
    },
    detail: {
      type: 'string'
    },
    locLat: {
      type: 'string'
    },
    locLng: {
      type: 'string'
    },
    address: {
      type: 'string'
    },
    superior: {
      model: 'org'
    },
    cabinets : {
      collection : 'cabinet',
      via : 'org'
    },
    isLocal: {
      type: 'boolean',
      defaultsTo: false
    },
    host : {
      type: 'string'
    },
    port : {
      type: 'string'
    },
    historyUrl: {
      type: 'string'
    },
    isVerified: {
      type: 'boolean'
    },
    remoteToken : {
      type: 'string'
    },
    subordinations:{
      collection : 'org',
      via : 'superior'
    },
    users : {
      collection : 'user',
      via : 'org'
    },
    webcamUrl:{
      type: 'string'
    }
  },

  afterCreate: function(item, cb){
    sails.services.syncrole.Sync(item, 'Org');
    sails.services.org.handshake(item, 'create');
    cb();
  },

  afterUpdate: function(item, cb){
    sails.services.syncrole.Sync(item, 'Org');
    sails.services.org.handshake(item, 'update');
    cb();
  },
};
