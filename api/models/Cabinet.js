/**
* Cabinet.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  attributes: {
    name: {
      type: 'string'
    },
    code: {
      type: 'string'
    },

    etcdCode: {
      type: 'string'
    },

    identification: {
      type: 'string'
    },

    host: {
      type: 'ip'
    },

    port: {
      type: 'integer'
    },

    info: { // key value extra info
      type: 'json'
    },

    org: {
      model: 'org'
    },

    remoteToken: {
      type: 'string'
    },

    tokenExpire: {
      type: 'datetime'
    },

    clusterId: {
      type: 'string'
    },

    camIp: {
      type: 'string'
    },

    isMaster: {
      type: 'boolean',
      defaultsTo: false
    },

    isAlive: {
      type: 'boolean',
      defaultsTo: false
    },

    isVerified: {
      type: 'boolean',
      defaultsTo: false
    },

    isLocal: {
      type: 'boolean',
      defaultsTo: false
    },

    isBlock: {
      type: 'boolean',
      defaultsTo: false
    }
  },

};
