'use strict'
module.exports = {

  attributes: {
    applicationId: {
      type: 'string',
      required: true
    },
    assetId: {
      type: 'string',
      required: true
    }
  },
  afterCreate: function (item, cb) {
    sails.services.syncfile.assets('create', 'applicationcaptured', {}, { applicationId: item.applicationId, assetId: item.assetId, id: item.id });
    cb();
  },

  afterUpdate: function (item, cb) {
    sails.services.syncfile.assets('update', 'applicationcaptured', { id: item.id }, { applicationId: item.applicationId, assetId: item.assetId });
    cb();
  },

  afterDestroy: function (deleted, cb) {
    if (deleted.length === 0 || !deleted) return cb();
    sails.services.syncfile.assets('destroy', 'applicationcaptured', { id: deleted[0].id }, {});
    cb();
  },
}