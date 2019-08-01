module.exports = {

  attributes: {
    localId: {
      type: 'integer',
      primaryKey: true
    },
    id: {
      type: 'string',
    },
    data: {
      type: 'binary'
    },
    owner: {
      type: 'string'
    },
    used: {
      type: 'integer',
      defaultsTo: 0
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