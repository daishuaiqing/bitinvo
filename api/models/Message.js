/**
* Message.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    from: {
      model: 'user'
    },
    to: {
      model: 'user'
    },
    detail: {
      type: 'string'
    },
    isRead: {
      type: 'boolean',
      defaultsTo: false
    },
    refModel: {
      type: 'string' // define what kind of model it is refer to 
    },
    refId: {
      type: 'integer'
    }
  },
  
  afterCreate: function(item, cb){
    sails.services.syncrole.Sync(item, 'Message', 'update');
    cb();
  }
};

