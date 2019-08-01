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

  }
};