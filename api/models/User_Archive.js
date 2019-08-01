'use strict';
/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/
var _ = require('lodash');

module.exports = {
  attributes: {
    localId: {
      type: 'integer',
      primaryKey: true
    },
    id: {
      type: 'string',
    },
    username : {
      type: 'string',
      required: true
    },
    identityNumber : {
      type: 'string'
    },
    alias: {
      type: 'string'
    },

    aliasSpell: {
      type: 'string'
    },

    phone: {
      type: 'string'
    },

    email :{
      type: 'string'
    },

    sex: {
      type: 'string',
      enum: ['M', 'F'],
      defaultsTo: 'M'
    },

    superior: {
      type: 'string'
    },

    age: {
      type: 'integer'
    },

    type: {
      type: 'string'
    },

    status: {
      type: 'string',
      enum: ['active', 'deactive'], // whether user is activated , default to deactivated, user can not login if deactivated
      defaultsTo: 'active'
    },

    details : {
      type: 'string'
    },

    isDummy: { // it can be dummy user, which is for other device to login
      type: 'boolean',
      defaultsTo: false
    },

    device: {// associated deviced
      type: 'string'
    },


    info: { // key value extra info
      type: 'json'
    },

    position:{
      type: 'string'
    },

    activeConnections: {
      type: 'array'
    },

    passports: {
      type: 'string'
    },

    guns :{
      type: 'string'
    },

    token:{
      type: 'string'
    },

    org: {
      type: 'string'
    },

    isBlock: {
      type: 'boolean',
      defaultsTo: false
    },

    version: {
      type: 'integer',
      defaultsTo: 0
    },
    chksum: {
      type: 'string'
    },

    toJSON: function() {
      var obj = this.toObject();
      delete obj.password;
      return obj;
    }
  },
};
