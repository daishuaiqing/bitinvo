/**
* Mqtt.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  attributes: {
    orgId : {
      type: 'string'
    },
    orgName : {
      type: 'string'
    },
    gunCount : {
      type : 'int'
    },
    bulletCount : {
      type : 'int'
    },
    online : {
      type : 'boolean',
      defaultsTo : false
    }
  }
};