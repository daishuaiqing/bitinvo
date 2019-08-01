'use strict';
/**
* ApplicationType.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    name : {
      type: 'string',
      required: true,
      unique: true
    },

    type: {
      type: 'string',
      enum: ['gun', 'bullet', 'emergency', 'storageGun', 'storageBullet', 'maintain'],
      defaultsTo: 'gun'
    },

    approverOption:{
      type: 'string',
      enum: [
      'single',  // 直接领导逐级调用
      'arbitary', // 任意选择人员
      'none' //不需要审核
      ],
      defaultsTo: 'single'
    },

    voteType:{
      type: 'string',
      enum: [
        'affirmative', // 任意一个通过就行
        'unanimous',  // 必须全部通过
        'consensus', // 多数通过就行
        'both'
      ],
      defaultsTo: 'affirmative'
    },

    approvers: {
      collection: 'user'
    },

    detail: {
      type: 'string'
    },

    remote : {
      type: 'boolean',
      defaultsTo: false
    },

    noAdminConfirm : {
      type: 'boolean',
      defaultsTo: false
    }
  },
  afterCreate: function(values, cb){
    ApplicationType.findOne({id: values.id}).populate('approvers')
    .then((local) => {
      local = local.toObject();
      if(!local){
        return cb();
      }
      if(local.approvers.length > 0){
        local.approvers = local.approvers.map((e) => {
          return e.id;
        });
      }
      sails.services.syncrole.Sync(local, 'applicationtype');
      //判断是否mqtt主机
      System.findOrCreate({key: 'isMqttServer'}).exec((err, sys) => {
        if(!err && sys && sys.value !== 'true'){
          sails.config.innerPubsub.emit('createApptype', {
            id : values.id,
            name : values.name,
            type : values.type,
            detail : values.detail
          });
        }
      })
      cb();
    })
    .catch((err) => {
      sails.log.error(err);
      cb();
    })
  },

  afterUpdate: function(values, cb){
    ApplicationType.findOne({id: values.id}).populate('approvers')
    .then((local) => {
      local = local.toObject();
      if(!local){
        return cb();
      }
      if(local.approvers.length > 0){
        let result = [];
        for(let e of local.approvers){
          result.push(e.id);
        };
        local.approvers = result;
      }
      sails.services.syncrole.Sync(local, 'applicationtype', 'update');
      //判断是否mqtt主机
      System.findOrCreate({key: 'isMqttServer'}).exec((err, sys) => {
        if(!err && sys && sys.value !== 'true'){
          sails.config.innerPubsub.emit('updateApptype', {
            id : values.id,
            name : values.name,
            type : values.type,
            detail : values.detail
          });
        }
      })
      cb();
    })
    .catch((err) => {
      sails.log.error(err);
      cb();
    })
  },
  afterDestroy: function(deleted, cb){
    if(deleted.length === 0 || !deleted) return cb();
    sails.config.innerPubsub.emit('deleteApptype', deleted[0].id)
    cb();
  },
};
