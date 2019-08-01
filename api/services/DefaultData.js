'use strict';
const fs = require('fs');
const Promise = require('bluebird');
const uuid = require('node-uuid');

let DefaultData = JSON.parse(fs.readFileSync(__dirname+'/defaultData.json'));
// function* InitStep(){
//   yield step1;
//   yield step2;
//   yield step3;
// }
// var step = InitStep();

module.exports = {
  Init: function(){
    sails.log.verbose('Ready To Check Init');
    Role.find({limit: 1})
    .then((data) => {
      //检查并添加默认权限
      if(data.length == 0){
        sails.log.debug('Need Init Role');
        return Promise.all([
          Role.create(DefaultData.Role[0]),
          Role.create(DefaultData.Role[1]),
          Role.create(DefaultData.Role[2]),
          Role.create(DefaultData.Role[3]),
          Role.create(DefaultData.Role[4])
        ])
      }else{
        sails.log.debug('Role OK');
        return Promise.resolve('Role OK');
      }
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init Role Finsh');
      };
      return GunType.find({limit: 1})
      .then((data) => {
        if(data.length == 0){
          sails.log.debug('Need Init GunType');
          let gunTypeArr = DefaultData.GunType;
          let PromiseArr = [];
          for(let gun of gunTypeArr){
            PromiseArr.push(GunType.create(gun));
          };
          return Promise.all(PromiseArr);
        }else{
          sails.log.debug('GunType OK');
          return Promise.resolve('GunType OK');
        }
      })
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init GunType Finsh');
      };
      return Bullettype.find({limit: 1})
      .then((data) => {
        if(data.length == 0){
          sails.log.debug('Need Init BulletType');
          let bulletTypeArr = DefaultData.BulletType;
          let PromiseArr = [];
          for(let bullet of bulletTypeArr){
            PromiseArr.push(Bullettype.create(bullet));
          };
          return Promise.all(PromiseArr);
        }else{
          sails.log.debug('BulletType OK');
          return Promise.resolve('BulletType OK');
        }
      })
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init BulletType Finsh');
      };
      return ApplicationType.find({limit:1})
      .then((data) => {
        if(data.length == 0){
          sails.log.debug('Need Init Default ApplicationType');
          let applicationTypeArr = DefaultData.ApplicationType;
          let PromiseArr = [];
          for(let applicationType of applicationTypeArr){
            PromiseArr.push(ApplicationType.create(applicationType));
          };
          return Promise.all(PromiseArr);
        }else{
          sails.log.debug('ApplicationType Ok');
          return Promise.resolve('ApplicationType OK');
        }
      })
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init ApplicationType Finsh');
      };
      return User.find({limit: 1})
      .then((data) => {
        if(data.length == 0){
          sails.log.debug('Need Init Default Admin');
          let user = DefaultData.User;
          return new Promise(function (resolve, reject) {
            sails.services.passport.protocols.local.createUser(user, function (error, created) {
              if (error) return reject(error);
              resolve(created);
            });
          });
        }else{
          sails.log.debug('User Ok');
          return Promise.resolve('User OK');
        }
      })
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init User Finish,Start Init His/Her Role');
        let userid = data.id;
        return User.update({id:userid}, {roles: 'acbdd657-af59-4f0c-9d32-ab9794a877b1'});
      }else{
        sails.log.verbose('Init Complete');
      };
    })
    //初始化超级管理员
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init Admin\'s Role Finish');
      };
      return User.find({username: '8888'})
      .then((data) => {
        if(data.length == 0){
          sails.log.debug('Need Init Default Super User');
          let user = DefaultData.SuperUser;
          return new Promise(function (resolve, reject) {
            sails.services.passport.protocols.local.createUser(user, function (error, created) {
              if (error) return reject(error);
              resolve(created);
            });
          });
        }else{
          sails.log.debug('Super User Ok');
          return Promise.resolve('Super User OK');
        }
      })
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init Super User Finish,Start Init His/Her Role');
        let userid = data.id;
        return User.update({id:userid}, {roles: 'cdbdd657-bf59-4f3c-213a-a39194a877b1'});
      }else{
        sails.log.verbose('Init Complete');
      };
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init SuperUser0 Finish');
      };
      return User.find({username: '9999'})
      .then((data) => {
        if(data.length == 0){
          sails.log.debug('Need Init Default Super User1');
          let user = DefaultData.SuperUser1;
          return new Promise(function (resolve, reject) {
            sails.services.passport.protocols.local.createUser(user, function (error, created) {
              if (error) return reject(error);
              resolve(created);
            });
          });
        }else{
          sails.log.debug('Super User1 Ok');
          return Promise.resolve('Super User1 OK');
        }
      })
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init Super User Finish,Start Init His/Her Role');
        let userid = data.id;
        return User.update({id:userid}, {roles: 'cdbdd657-bf59-4f3c-213a-a39194a877b1'});
      }else{
        sails.log.verbose('Init Complete');
      };
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init Super User\'s Role Finish');
      }
      return Position.find({limit: 1})
      .then((data) => {
        if(data.length == 0){
          sails.log.debug('Need Init Default Position');
          let postion = DefaultData.Position;
          return Position.create(postion);
        }else{
          sails.log.debug('Position Ok');
          return Promise.resolve('Position OK')
        }
      })
    })
    .then((data) => {
      if(typeof data == 'object'){
        sails.log.debug('Init Position Finish');
      }
      sails.log.verbose('Init Complete');
    })
    .catch((err) => {
      sails.log.error(err);
    })
  },
  Reset: function(){
    sails.log.verbose('Ready To Reset');
    return Role.destroy({})
    .then(() => {
      sails.log.debug('Clean Role Success');
      return Promise.all([
        Role.create(DefaultData.Role[0]),
        Role.create(DefaultData.Role[1]),
        Role.create(DefaultData.Role[2]),
        Role.create(DefaultData.Role[3]),
        Role.create(DefaultData.Role[4])
      ])
    })
    .then((data) => {
      sails.log.debug('Reset Role Finsh');
      return GunType.destroy({})
      .then((data) => {
        sails.log.debug('Clean GunType Success');
        let gunTypeArr = DefaultData.GunType;
        let PromiseArr = [];
        for(let gun of gunTypeArr){
          PromiseArr.push(GunType.create(gun));
        };
        return Promise.all(PromiseArr);
      })
    })
    .then((data) => {
      sails.log.debug('Reset GunType Finsh');
      return Bullettype.destroy({})
      .then((data) => {
        let gunTypeArr = DefaultData.BulletType;
        let PromiseArr = [];
        for(let gun of gunTypeArr){
          PromiseArr.push(Bullettype.create(gun));
        };
        return Promise.all(PromiseArr);
      })
    })
    .then((data) => {
      sails.log.debug('Reset BulletType Finsh');
      return Promise.resolve('Reset Complete');
    })
  },
  InitCabinet: function(){
    sails.log.debug('Start Check Default Cabinet');
    Cabinet.find({limit: 1})
    .then((data) => {
      if(data.length == 0){
        //Init Default Cabinet
        return System.findOne({key: 'ip'})
        .then((data) => {
          let cabinet = {};
          if(data && data.value != null){
            cabinet = {
              id: sails.config.cabinet.id,
              name: '本地柜机',
              code: sails.config.cabinet.id,
              host: data.value,
              port: sails.config.port,
              isLocal: true
            }
            return Cabinet.create(cabinet)
          }else{
            return new Promise((resolve, reject) => {
              cabinet = {
                id: sails.config.cabinet.id,
                name: '本地柜机',
                code: sails.config.cabinet.id,
                host:  '0.0.0.0',
                port: sails.config.port,
                isLocal: true
              }
              resolve(Cabinet.create(cabinet));
            })
          }
        })
      };
    })
    .then((data) => {
      sails.log.debug('create default Cabinet Success');
    })
    .catch((err) => {
      sails.log.error(err);
    });
  }
}
