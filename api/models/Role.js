/**
* Role.js
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
    permissions: {
      /*
        default 所有用户都有
        view-app可以查看/审核授权
        manage-cabinet可以管理柜机
        view-report可以 查看报表， 在前台写入
        manage-system 管理系统升级 硬件更新等
      */
      type: 'array'
    },
    users : {
      collection: 'user'
    }
  },

  afterCreate: function(item, cb){
    sails.services.syncrole.Sync(item, 'Role');
    cb();
  },

  afterUpdate: function(item, cb){
    sails.services.syncrole.Sync(item, 'Role', 'update');
    cb();
  },
  afterDestroy: function(item, cb){
    sails.services.syncrole.Sync(item, 'Role', 'destroy');
    cb();
  },
};
