/**
* Bullettype.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    name : {
      type: 'string',
      required: true
    },

    code: {
      type: 'string'
    },

    gunTypes: {
      collection : 'guntype',
      via: 'bulletType'
    },

    cabinetModule:{
      collection: 'cabinetmodule',
      via: 'bulletType'
    }
  },

  afterCreate: function(item, cb){
    sails.services.syncrole.Sync(item, 'BulletType');
    cb();
  },

  afterUpdate: function(item, cb){
    sails.services.syncrole.Sync(item, 'BulletType', 'update');
    cb();
  },
  afterDestroy: function(item, cb){
    sails.services.syncrole.Sync(item, 'BulletType', 'destroy');
    cb();
  },
};

