
var Passport = {
  attributes: {
    localId: {
      type: 'integer',
      primaryKey: true
    },
    id: {
      type: 'string',
    },
    protocol: { type: 'alphanumeric', required: true },
    password: { type: 'string', minLength: 6 },
    provider   : { type: 'alphanumericdashed' },
    identifier : { type: 'string' },
    tokens     : { type: 'json' },
    user: { model: 'User', required: true },
    needReset: {
      type: 'boolean',
      defaultsTo: true
    },
    version: {
      type: 'integer',
      defaultsTo: 0
    },
    chksum: {
      type: 'string'
    }
  }
};

module.exports = Passport;
