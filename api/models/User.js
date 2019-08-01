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
    username : {
      type: 'string',
      required: true,
      unique: true
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
      model : 'user'
    },

    subordinates :{
      collection: 'user',
      via: 'superior'
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

    isLocal:{
      type: 'boolean',
      defaultsTo: false
    },

    disablePasswdLogin: {
      type: 'string'
    },

    device: {// associated deviced
      model: 'cabinet'
    },

    fingerprints: {
      collection: 'fingerprint',
      via: 'owner'
    },

    info: { // key value extra info
      type: 'json'
    },

    roles: {
      collection: 'role'
    },

    position:{
      model: 'position'
    },

    activeConnections: {
      type: 'array'
    },

    passports: {
      collection: 'passport',
      via: 'user'
    },

    guns :{
      collection: 'gun',
      via: 'user'
    },

    token:{
      type: 'string'
    },

    org: {
      model: 'org'
    },

    isBlock: {
      type: 'boolean',
      defaultsTo: false
    },

    version: {
      type: 'integer',
      defaultsTo: 1
    },
    chksum: {
      type: 'string'
    },

    isAdmin : function(){
      if(this.roles && this.roles.length > 0){
        var isAdmin = false;
        isAdmin = _.some(this.roles, function(role){
          if(role.permissions && role.permissions.length > 0){
            return _.some(role.permissions, function(p){
              return p === "view-app" || p ==='manage-cabinet'|| p ==='manage-system'
            });
          }
        });
        return isAdmin;
      }
    },

    isSuperAdmin : function(){
      if(this.roles && this.roles.length > 0){
        var isSuperAdmin = false;
        isSuperAdmin = _.some(this.roles, function(role){
          if(role.permissions && role.permissions.length > 0){
            return _.some(role.permissions, function(p){
              return p ==='manage-system'
            });
          }
        });
        return isSuperAdmin;
      }
    },

    toJSON: function() {
      var obj = this.toObject();
      delete obj.password;
      return obj;
    }
  },

  afterCreate: function(item, cb){
    if(!item.isDummy && !item.isLocal){
      sails.services.syncrule.user(item.id)
      .then((data) => {
        sails.services.syncrole.Sync(data, 'user');
        cb();
      })
      .catch((err) => {
        cb();
      })
      //判断是否mqtt主机
      System.findOrCreate({key: 'isMqttServer'}).exec((err, sys) => {
        if(!err && sys && sys.value !== 'true'){
          sails.config.innerPubsub.emit('createUser', {
            id : item.id,
            username : item.username,
            identityNumber : item.identityNumber,
            alias : item.alias,
            phone : item.phone,
            sex : item.sex,
            age : item.age,
            type : item.type,
          });
        }
      })
    }else{
      cb();
    }
  },
  
  afterUpdate: function(item, cb){
    if(!item.isDummy && !item.isLocal){
      sails.services.syncrule.user(item.id)
      .then((data) => {
        sails.services.syncrole.Sync(data, 'user', 'update');
        cb();
      })
      .catch((err) => {
        cb();
      })
      //判断是否mqtt主机
      System.findOrCreate({key: 'isMqttServer'}).exec((err, sys) => {
        if(!err && sys && sys.value !== 'true'){
          sails.config.innerPubsub.emit('updateUser', {
            id : item.id,
            username : item.username,
            identityNumber : item.identityNumber,
            alias : item.alias,
            phone : item.phone,
            sex : item.sex,
            age : item.age,
            type : item.type,
          });
        }
      })
    }else{
      cb();
    }
  },
  afterDestroy: function(item, cb){
    if(item.length === 0){
      return cb();
    }
    if(item[0].isDummy || item[0].isLocal){
      return cb();
    }
    sails.services.syncrole.Sync(item, 'user', 'destroy');
    //判断是否mqtt主机
    System.findOrCreate({key: 'isMqttServer'}).exec((err, sys) => {
      if(!err && sys && sys.value !== 'true'){
        sails.config.innerPubsub.emit('deleteUser', item.id);
      }
    })
    cb();
  },

  beforeCreate: function (values, cb) {
    if(!values.alias){
      values.alias = values.username;
    }
    if(values.isDummy || values.isLocal){
      return cb();
    }
    User.find({isDummy: true}).limit(1)
    .then((data) => {
      if(data.length === 0){
        return cb();
      }
      let obj = data[0].toObject();
      obj.token = null;
      obj.isDummy = false;
      let record = Object.assign({}, obj, values);
      let newChksum = sails.services.syncrole.pureSign(record);
      values.chksum = newChksum;
      sails.log.info(`user new chksum is ${newChksum}`);
      cb();
    })
  },
  beforeUpdate: function (values, cb) {
    if(values.isDummy || values.isLocal){
      return cb();
    }
    if(values.activeConnections && !values.id){
      return cb();
    }
    User.find({id: values.id}).limit(1)
    .then((data) => {
      if(data.length === 0){
        return cb();
      }
      let obj = data[0].toObject();
      let record = Object.assign({}, obj, values);
      let newChksum = sails.services.syncrole.pureSign(record);
      values.chksum = newChksum;
      sails.log.info(`user update chksum is ${newChksum}`);
      cb();
    })
  },
  /**
   * Register a new User with a passport
   */
  register: function (user) {
    return new Promise(function (resolve, reject) {
      sails.services.passport.protocols.local.createUser(user, function (error, created) {
        if (error) return reject(error);
        resolve(created);
      });
    });
  }
};
