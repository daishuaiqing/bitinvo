/**
* CabinetModule.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/
const pubsub = sails.config.innerPubsub;
module.exports = {

  attributes: {
    type: {
      type: 'string',
      enum: ['gun', 'bullet']
    },
    capacity: {
      type: 'integer',
      min: 0
    },
    load: {
      type: 'integer'
    },
    cabinet: {
      model: 'cabinet'
    },
    /*
        state defined in fifo
        // Gun Lock State
        SGS_DOOR_STATE : {
          DOOR_STATE_SUCCESS                  : 0,
          DOOR_STATE_AUTO_OPEN                : 1,
          DOOR_STATE_AUTO_CLOSE               : 2,
          DOOR_STATE_BACKUP_OPEN              : 3,
          DOOR_STATE_BACKUP_CLOSE             : 4,
          DOOR_STATE_TIMEOUT                  : 5,
          DOOR_STATE_ERROR                    : 6
        },
      */
    lockState: {
      type: 'integer'
    },
    /*
      state defined in fifo
       SGS_GUN_STATE : {
        GUN_PRESENT                         : 0,
        GUN_NOT_PRESENT                     : 1
      },
    */
    gunState: {
      type: 'integer'
    },
    //标记枪锁堵转的枪位
    gunLock: {
      type: 'string',
      enum: ['normal', 'broken'],
      defaultsTo: 'normal'
    },
    gun: {
      model: 'gun'
    },
    gunType: {
      model: 'gunType'
    },
    bulletType: {
      model: 'bulletType'
    },
    moduleId: {
      type: 'integer'
    },
    name: {
      type: 'string'
    },
    canId: {
      type: 'integer'
    }
  },
  afterCreate: function (item, cb) {
    sails.services.syncrole.Sync(item, 'CabinetModule');
    cb();
  },

  afterUpdate: function (item, cb) {
    sails.services.syncrole.Sync(item, 'CabinetModule', 'update');
    pubsub.emit('reportAllCountNow');
    cb();
  },

  afterDestroy: function (item, cb) {
    sails.services.syncrole.Sync(item, 'CabinetModule', 'destroy');
    cb();
  },

};
