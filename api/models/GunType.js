/**
* GunType.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/
'use strict';
const uuid = require('node-uuid');

module.exports = {
  autoPK: false,

  attributes: {
    name: {
      type: 'string'
    },
    guns:{
      collection: 'gun',
      via : 'type'
    },
    bulletType : {
      model : 'bullettype'
    },
    detail:{
      type:'string'
    }
  },

  afterCreate: function(item,cb){
    sails.services.syncrole.Sync(item, 'GunType');
    cb();
  },

  afterUpdate: function(item, cb){
    sails.services.syncrole.Sync(item, 'GunType', 'update');
    cb();
  },
  
  afterDestroy: function(item, cb){
    sails.services.syncrole.Sync(item, 'GunType', 'destroy');
    cb();
  }
};