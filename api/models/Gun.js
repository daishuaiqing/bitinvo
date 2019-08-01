/**
* Gun.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/
'use restrict';

var _ = require('lodash');
const uuid = require('node-uuid');

module.exports = {
  autoPK: false,
  attributes: {
    name: {
      type: 'string'
    },

    code: {
      type: 'string'
    },

    type: {
      model: 'guntype'
    },

    associatedGun: {
      model: 'gun'
    },

    associatedBulletModule: {
      model: 'cabinetmodule'
    },

    isPublic: {
      type: 'boolean',
      defaultsTo: false
    },

    isDisabled: {
      type: 'boolean',
      defaultsTo: true
    },

    user: {
      model: 'user'
    },

    notes: {
      type: 'string'
    },

    cert: {
      type: 'string'
    },

    cabinetModule: {
      collection: 'cabinetmodule',
      via: 'gun'
    },

    lastMaintainDate: {
      type: 'date',
      defaultsTo: function () {
        return new Date();
      }
    },

    maintainInterval: {
      type: 'integer',
      defaultsTo: 100
    },

    storageStatus: {
      type: 'string',
      enum: ['in', 'out', 'awaitin'],//'枪支状态0-待入柜 1-已入柜  2-已出柜, 3 维护中',
      defaultsTo: 'awaitin'
    },

    gunStatus: {
      type: 'string',
      enum: ['lost', 'scrapped', 'normal'],
      defaultsTo: 'normal'
    },

    toJSON: function () {
      var obj = this.toObject();
      obj = _.omit(obj, ['createdBy', 'updatedBy', 'createdAt', 'updatedAt', 'userIp']);

      return obj;
    }
  },

  afterCreate: function (item, cb) {
    sails.services.syncrole.Sync(item, 'Gun');
    cb();
  },

  afterUpdate: function (item, cb) {
    sails.services.syncrole.Sync(item, 'Gun', 'update');
    cb();
  },
  afterDestroy: function (item, cb) {
    sails.services.syncrole.Sync(item, 'Gun', 'destroy');
    cb();
  },
};
