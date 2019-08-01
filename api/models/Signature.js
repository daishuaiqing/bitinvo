/**
* Signature.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  attributes: {
    signature: {
      type: 'text'
    },
    user: {
      model: 'user'
    },
    application: {
      model: 'application'
    }
  },
  afterCreate: function (item, cb) {
    sails.services.syncfile.assets('create', 'signature', {}, { signature: item.signature, user: item.user, application: item.application, id: item.id });
    cb();
  },

  afterUpdate: function (item, cb) {
    sails.services.syncfile.assets('update', 'signature', { id: item.id }, { signature: item.signature, user: item.user, application: item.application });
    cb();
  },

  afterDestroy: function (deleted, cb) {
    if (deleted.length === 0 || !deleted) return cb();
    sails.services.syncfile.assets('destroy', 'signature', { id: deleted[0].id }, {});
    cb();
  },
};