/**
* Asset.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    name: {
      type: 'string',
      required: true
    },
    path: {
      type: 'string',
      required: true
    },
    type: {
      type: 'string',
      required: true,
      enum: [
        'image',  //图
        'video', // 视讯
        'file'  //其他类型文件
      ]
    },
    status: {
      type: 'string',
      enum: [
        'new', // New 新创建的, 没有被转码的
        'recording', // 正在录像
        'converting', //Wip 正在转换中的
        'ready',  // ready to play 已经准备好可以播放的
        'fail',  // Fail 出现失败及exception的
        'notFound' //播放时未找到的
      ],
      defaultsTo: 'recording'
    },
    md5: {
      type: 'string'
    }
  },
  afterCreate: function (item, cb) {
    if (item.status === 'ready')
      sails.services.syncfile.assets('create', 'asset', {}, { name: item.name, path: item.path, type: item.type, status: item.status, md5: item.md5, id: item.id });
    cb();
  },

  afterUpdate: function (item, cb) {
    if (item.status === 'ready')
      sails.services.syncfile.assets('update', 'asset', { id: item.id }, { name: item.name, path: item.path, type: item.type, status: item.status, md5: item.md5 });
    cb();
  },

  afterDestroy: function (deleted, cb) {
    if (deleted.length === 0 || !deleted) return cb();
    sails.services.syncfile.assets('destroy', 'asset', { id: deleted[0].id }, {});
    cb();
  },
};

