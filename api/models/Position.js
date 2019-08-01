/**
* Position.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    name: {
      type: 'string',
      unique: true
    },
    superior: {
      model: 'position'
    },
    subordinates: {
      collection: 'position',
      via: 'superior'
    },
    level: {
      type : 'integer'
    },
    users :{
      collection : 'user',
      via: 'position'
    }
  }
};
