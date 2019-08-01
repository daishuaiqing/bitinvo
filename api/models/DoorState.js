/**
* DoorState.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    DoorId : {
      type: 'string',
    },
    DoorState : {
      type: 'integer'
    },
    DoorHandState : {
      type: 'integer'
    },
    DoorMotorState : {
      type: 'integer'
    }
  }
};
