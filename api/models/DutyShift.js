/**
* DutyShift.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    start: {
      type: 'datetime'
    },
    end: {
      type: 'datetime'
    },
    user: {
      model: 'user'
    },
    org :{
      model : 'org'
    }
  },

  afterCreate: function(item, cb){
    sails.services.syncrole.Sync(item, 'DutyShift');
    cb();
  },
  afterUpdate: function(item, cb){
    sails.services.syncrole.Sync(item, 'DutyShift', 'update');
    cb();
  },
  afterCreate: function(item, cb){
    sails.services.syncrole.Sync(item, 'DutyShift', 'destroy');
    cb();
  }
};

