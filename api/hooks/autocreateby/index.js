/**
* autoCreatedByHook Hook Start
*/

'use strict';

var uuid = require('node-uuid');

var _ = require('lodash');

var installModelOwnership =  function(sails) {
  sails.log.verbose('Install Model Ownership');
  
  if (sails.config.models.autoCreatedBy === false) return;

  var models = sails.models;
  _.each(models, function(model, key){
    if (model.autoCreatedBy === false) return;
    _.defaults(model, {
      autoPK: false
    });
    _.defaults(model.attributes, {
      id:{
        type: 'string',
        // required: true,
        primaryKey: true,
        defaultsTo: function() {
          return uuid.v4();
        }
      },
      localId:{
        type: 'integer',
        autoIncrement: true
      },
      isDeleted : {
        type : 'boolean',
        defaultsTo: false
      },
      userIp: {
        type: 'ip'
      },
      createdBy: {
        model: 'user',
        index: true
      },
      updatedBy: {
        model: 'user',
        index: true
      },
      SyncFrom: {
        type: 'string',
      },
      UpdatedFrom: {
        type: 'string',
      },
    })
  })
}

module.exports = function autoCreatedByHook(sails) {
  sails.log.verbose('autoCreatedByHook Loaded');
  return {

    initialize: function(cb) {
      sails.log.debug(' #### autoCreatedByHook is initialized @1 #### ');
      
      installModelOwnership(sails);

      // Finish initializing custom hook
      // Then call cb()
      return cb();
    }
  }
}
/**
* autoCreatedByHook Hook End
*/