/**
 * CabinetModuleController
 *
 * @description :: Server-side logic for managing Cabinetmodules
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict';
const BitinvoFifo = require('bitinvo-fifo');
const co = require('co');
var FIFO = BitinvoFifo.Fifo;
var sm = BitinvoFifo.FifoClient.sendFifoMessage;
var lockSrv = sails.services.lock;
const csv = require('csvtojson');
const moment = require('moment');

const weighResult = ['设置成功', '设置失败', '抽屉未关', '数量超出限制, 最大值999', '超重'];

var onComplete = function (data) {
  sails.log.debug(' ##### CabinetModuleController:open:onComplete #### ');
  sails.log.debug(data);
}

var onError = function (err) {
  sails.log.debug(' ##### CabinetModuleController:open:onError #### ');
  sails.log.error(err);
}

var createOptLog = function (data) {
  co(function* () {
    if (data.object === 'user' && data.objectId && !data.noFaceAndFinger) {
      data.fingerPrint = yield sails.services.redis.hgetAsync('finger', data.objectId);
      data.facePic = yield sails.services.redis.hgetAsync('face', data.objectId);

      //使用之后删除REDIS内对应用户的指纹人脸记录
      // yield sails.services.redis.hdelAsync('finger', data.objectId);
      // yield sails.services.redis.hdelAsync('face', data.objectId);
      yield sails.services.face.removeRecord(data.objectId, 'cabinetmodule');

      let signature = yield Signature.findOne({ 'application': data.applicationId, user: data.objectId });
      if (signature) data.signature = signature.id;
    }
    return yield Promise.resolve(data);
  }).then((data) => {
    OptLog.create(data)
      .exec(function (err) {
        if (err) {
          sails.log.error(' #### CabinetModuleController  adding OptLog fails');
          sails.log.error(err);
        }
      });
  }).catch((err) => {
    sails.log.error(err);
  })
}


module.exports = {
  list: (req, res) => {
    co(function* () {
      const type = req.query.type;
      let countSql = null, sql = null;
      const skip = Number(req.query.skip) || 0;
      const limit = Number(req.query.limit) || 10;
      const cabinetId = req.query.cabinetId;
      const isLocal = req.query.isLocal == 'true' ? true : false;
      let where = isLocal ? `where cm.cabinet='${sails.config.cabinet.id}'` : cabinetId ? `where cm.cabinet='${cabinetId}'` : '';
      if (type == 'gun') {
        where = where.length > 0 ? where + ` and cm.type='gun'` : ` where cm.type='gun'`;
      } else if (type == 'bullet') {
        const bulletType = req.query.bulletType;
        const queryAppend = bulletType ? ` and bulletType='${bulletType}'` : '';
        where = where.length > 0 ? where + ` and cm.type='bullet' ${queryAppend}` : ` where cm.type='bullet' ${queryAppend}`;
      }

      countSql = `select count(*) as count from cabinetmodule as cm ${where};`
      sql = `select cm.id as cmId,\
                    cm.type as cmType,\
                    cm.capacity as cmCapacity,\
                    cm.load as cmLoad,\
                    cm.moduleId as cmModuleId,\
                    cm.name as cmName,\
                    cm.canId as cmCanId,\
                    cm.gunLock as gunLock,\
                    b.id as bId,\
                    b.name as bName,\
                    b.code as bCode,\
                    g.id as gId,\
                    g.name as gName,\
                    g.code as gCode,\
                    g.cert as gCert,\
                    g.associatedGun as gAssociatedGun,\
                    c.id as cId,\
                    c.name as cName,\
                    c.host as cHost,\
                    c.isMaster as cIsMaster \
                    from cabinetmodule as cm \
                    left join gun as g \
                    on g.id = cm.gun \
                    left join cabinet as c \
                    on c.id = cm.cabinet \
                    left join bullettype as b \
                    on b.id = cm.bulletType \
                    ${where} \
                    order by cm.name*1 asc, cm.createdAt asc limit ${skip}, ${limit}`;
      if (!countSql) return yield Promise.reject({ msg: '没有指定查询类型' });
      const total = yield GunService.gunQueryPromise(countSql);
      const pagination = req.headers.pagination;
      if (total[0].count === 0)
        return yield Promise.resolve(pagination == 'true' ? {
          total: 0,
          data: [],
          skip,
          limit
        } : [])
      const data = yield GunService.gunQueryPromise(sql);
      return yield Promise.resolve(pagination == 'true' ? {
        total: total[0].count,
        data,
        skip,
        limit
      } : data)
    }).then((result) => {
      return res.ok(result);
    }).catch((err) => {
      if (err.msg) return res.badRequest(err);
      sails.log.error(`#### CabinetModuleController: list 内部错误`);
      sails.log.error(err);
      return res.serverError({ msg: '内部错误' });
    })
  },

  countbullet: function (req, res, next) {
    sails.services.cabinet.count('bullet', (err, rs) => {
      if (err) return res.serverError(err);
      return res.ok(rs);
    })
  },
  countgun: function (req, res, next) {
    sails.services.cabinet.count('gun', (err, rs) => {
      if (err) return res.serverError(err);
      return res.ok(rs);
    })
  },
  open: function (req, res, next) {
    sails.log.debug(' #### Start Open Module Lock ####');
    var user = req.session.user ? req.session.user : req.user;
    if (!user || !user.alias) {
      user = {
        alias: req.body.alias || req.body.username || 'unknownuser',
        id: req.body.userId || 'null'
      }
    }
    var me = this;

    // var leftDoorCanId = 0x5E;
    // var rightDoorCanId = 0x5F;
    // var leftDoorId = 0;
    // var rightDoorId = 1;

    var moduleId = req.body.moduleId;
    var moduleType = req.body.moduleType;
    var moduleCanId = req.body.moduleCanId;
    var gunAction = req.body.action;
    var applicationId = req.body.applicationId;
    if (moduleCanId) {
      var appData = {
        applicationId: applicationId,
        moduleCanId: moduleCanId
      };

      MessageExchange.uploadOpenMsg(appData, 0);
    }

    me.handler = function (message) {
      sails.log.debug(' ##### CabinetModuleController:open:User name is %s #### ', user.alias);
      sails.log.debug(message);
      if (message) {
        if (me.openModuleMessage.id == message.id
        ) {
          sails.log.debug(' ##### CabinetModuleController:open:Log the operation of door open %s #### ');
          sails.services.message.local({ topic: message.name, value: _.omit(message, 'data') });
        }
      }
    }

    // me.openLeftDoorMessage = sm('setDoorState',
    //   {
    //     canId: leftDoorCanId, doorId: leftDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_OPEN
    //   },
    //   _.bind(me.handler, me),
    //   _.bind(onError, me)
    // );
    // me.openRightDoorMessage = sm('setDoorState',
    //   {
    //     canId: rightDoorCanId, doorId: rightDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_OPEN
    //   },
    //   _.bind(me.handler, me),
    //   _.bind(onError, me)
    // );

    CabinetModule.findOne({ id: moduleId }, (err, cm) => {
      if (err) {
        sails.log.error(`#### CabinetModuleController : openCabinet error ${err}`)
      } else if (cm) {
        openCabinet(cm.canId, cm.moduleId);

        //记录AB枪使用情况
        // if (cm.type === 'gun' && gunAction === 'getGun') {
        //   GunService.ABGunEnabled().then((ABGunEnabled) => {
        //     if (ABGunEnabled) {
        //       GunService.recordABGun(sails.config.cabinet.id, cm.gun).then((data) => {
        //         sails.log.verbose(`#### CabinetModuleController : open 记录AB枪`)
        //       }).catch((e) => {
        //         sails.log.error(e);
        //       })
        //     }
        //   }).catch((e) => {
        //     sails.log.error(`#### CabinetModuleController : open 获取AB枪启用状态失败`)
        //     sails.log.error(e);
        //   })
        // }
      } else {
        sails.log.error(`#### CabinetModuleController : no cabinetmodule found #####`);
      }
    })

    function openCabinet(moduleCanId, moduleId) {
      // var log = '';
      if (moduleType === 'gun') {
        // if (gunAction === 'getGun') {
        //   log = user.alias + '取枪操作, 位置: ' + moduleCanId;
        // } else if (gunAction === 'returnGun') {
        //   log = user.alias + '还枪操作, 位置: ' + moduleCanId;
        // }
        me.openModuleMessage = sm('setGunLockState',
          {
            canId: moduleCanId, moduleId: moduleId ? moduleId : 0, state: FIFO.SGS_GUN_LOCK_OPERATE.GUN_LOCK_OPEN
          },
          _.bind(me.handler, me),
          _.bind(onError, me)
        );
      } else if (moduleType === 'bullet') {
        // if (gunAction === 'getBullet') {
        //   log = user.alias + '取子弹操作, 位置:' + moduleCanId;
        // } else if (gunAction === 'returnBullet') {
        //   log = user.alias + '还子弹操作, 位置:' + moduleCanId;
        // }
        me.openModuleMessage = sm('setBulletLockState',
          {
            canId: moduleCanId, moduleId: moduleId ? moduleId : 0, state: FIFO.SGS_BULLET_LOCK_OPERATE.BULLET_LOCK_OPEN
          },
          _.bind(me.handler, me),
          _.bind(onError, me)
        );
      }
      // if (user.alias !== 'unknownuser') {
      //   createOptLog({
      //     object: 'user',
      //     action: '开门操作',
      //     log: log,
      //     logType: 'normal',
      //     objectId: user.id,
      //     createdBy: user.id,
      //     updatedBy: user.id,
      //     gunAction: gunAction,
      //     applicationId: applicationId
      //   });
      // }
    }

    res.ok({ info: 'open command sent' });
  },

  openall: function (req, res, next) {
    let user = req.session.user ? req.session.user : req.user;
    if (!user || !user.alias) {
      user = {
        alias: req.body.alias || req.body.username || 'unknownuser',
        id: req.body.userId || 'null'
      }
    }
    let maintain = req.body.maintain;
    let num = req.body.num;

    // let action = maintain ? maintain === 'get' ? `维护取枪操作` : `维护还枪操作` : '紧急全部开门操作';
    // let log = maintain ? maintain === 'get' ? `维护取枪操作, 共取出${num}支枪` : `维护还枪操作, 共存入${num}支枪` : '紧急全部开门操作';
    sails.log.debug(req.body.application)
    if (maintain) {
      Cabinet.findOne({ isLocal: true }).exec((err, cabinet) => {
        if (err) return sails.log.error(`#### CabinetModuleController : openall maintain get cabinet id failed ####`)
        if (maintain === 'get') {
          Application.findOne({ id: req.body.application.id }).exec((err, application) => {
            if (!err && application) {
              Maintain.create({
                cabinet: cabinet.id,
                application: req.body.application.id,
                count: Number(application.num) * -1
              })
            }
          })
        } else {
          Maintain.create({
            cabinet: cabinet.id,
            application: req.body.application.id,
            count: Number(num)
          })
        }
      })
    }
    var appMsg = {
      applicationId: req.body.application.id,
      moduleCanId: 0 //应急开启没有canId
    }
    MessageExchange.uploadOpenMsg(appMsg, 0);
    Application.findOne({ id: req.body.application.id }).exec((err, app) => {
      if (err) return res.serverError(err);
      if (!app) return res.badRequest({ code: 'NO_SUCH_APPLICATION' });
      switch (app.flatType) {
        case 'storageGun':
          lockSrv.openall(1);
          break;
        case 'storageBullet':
          lockSrv.openall(2);
          break;
        default:
          lockSrv.openall(3);
      }
      // if (user.alias !== 'unknownuser') {
      //   createOptLog({
      //     object: 'user',
      //     action: action,
      //     log: user.alias + log,
      //     logType: 'normal',
      //     objectId: user.id,
      //     createdBy: user.id,
      //     updatedBy: user.id,
      //     applicationId: req.body.application.id
      //   });
      // }
      res.ok({ info: '正在开锁' });
    })
  },

  disableModule: (req, res) => {
    let canId = [req.body.canId];
    let status = req.body.status;
    let state = [];
    _.each(status, (v) => {
      state.push(v);
    });
    this.handler = (message) => {
      sails.log.debug('#### CabinetModuleController : disableModule success ####');
      return res.ok('disableModule success');
    };
    this.onError = (err) => {
      sails.log.error('#### CabinetModuleController : disableModule error ####');
      sails.log.error(err);
      return res.serverError('disableModule error')
    }
    sm('setLockDisable', { canId: canId, status: state },
      _.bind(this.handler, this),
      _.bind(this.onError, this)
    );
  },

  moduleStatus: (req, res) => {
    let canId = [req.body.canId];
    this.handler = (message) => {
      sails.log.debug('#### CabinetModuleController : moduleStatus get success####');
      delete message.id;
      delete message.typeId;
      delete message.name;
      delete message.msgTypeId;
      let rs = [];
      _.each(message, (v) => {
        rs.push(v === 255 ? 1 : v);
      })
      return res.ok({ status: rs.toString() });
    };
    this.onError = (err) => {
      sails.log.error('#### CabinetModuleController : moduleStatus error####');
      sails.log.error(err);
      return res.serverError(err);
    }
    sm('getLockDisable', canId,
      _.bind(this.handler, this),
      _.bind(this.onError, this)
    )
  },

  moduleType: (req, res) => {
    let type = {
      gun: false,
      bullet: false
    }
    CabinetModule.find().exec((err, rs) => {
      if (err) {
        sails.log.error('#### CabinetModuleController : moduleType error ####');
        sails.log.error(err);
        return res.serverError(err);
      }
      for (let i in rs) {
        if (rs[i].type == 'gun') {
          type.gun = true;
        } else if (rs[i].type == 'bullet') {
          type.bullet = true;
        }
      }
      return res.ok(type);
    })
  },

  //所有枪锁堵塞修复后 手动将损坏状态改为正常状态
  gunLockRepair: (req, res) => {
    CabinetModule.update({ type: 'gun' }, { gunLock: 'normal' })
      .exec((err, data) => {
        if (err) {
          sails.log.error('#### CabinetModuleController : gunLockRepair error ####')
          return res.serverError(err);
        }
        if (data) {
          sails.log.info('#### CabinetModuleController : gunLockRepair success ####');
          return res.ok('枪锁状态更新成功');
        }
      })
  },

  //获取枪支弹药基础信息
  info: (req, res) => {
    let skip = Number(req.query.skip) || 0;
    let limit = Number(req.query.limit) || 10;
    let type = req.query.type;
    if (type === 'gun') {
      Gun.find({
        limit,
        skip,
        sort: 'UpdatedAt desc'
      }).populate('type').exec((err, gun) => {
        if (err) return res.serverError(err);
        Gun.count().exec((err, count) => {
          if (err) return res.serverError(err);
          return res.ok({
            data: gun,
            limit,
            skip,
            total: count
          })
        })
      })
    } else if (type === 'bullet') {
      CabinetModule.find({
        type,
        limit,
        skip,
        sort: 'UpdatedAt desc'
      }).populate('bulletType').exec((err, cm) => {
        if (err) return res.serverError(err);
        CabinetModule.count({ type }).exec((err, count) => {
          if (err) return res.serverError(err)
          return res.ok({
            data: cm,
            limit,
            skip,
            total: count
          })
        })
      })
    } else {
      return res.badRequest({ code: 'UNKNOWNOPTION', error: 'invalid type' })
    }
  },

  //开启枪库大门
  openGate: (req, res) => {
    sails.log.debug('#### CabinetMoudleController : start open gate####');
    let me = this;

    let user = req.session.user ? req.session.user : req.user;
    if (!user || !user.alias) {
      user = {
        alias: req.body.alias || req.body.username || 'unknownuser',
        id: req.body.userId || 'null'
      }
    }

    me.handler = function (message) {
      sails.log.debug(' ##### CabinetModuleController:open gate User name is %s #### ', user.alias);
      sails.log.debug(message);
      sails.log.debug(' ##### CabinetModuleController:open:Log the operation of door open %s #### ');
      sails.services.message.local({ topic: message.name, value: _.omit(message, 'data') });
    }

    me.openGate = sm('openGate',
      {
        value: 0
      },
      _.bind(me.handler, me),
      _.bind(onError, me)
    );
    if (user.alias !== 'unknownuser') {
      createOptLog({
        object: 'user',
        action: '开门操作',
        log: `${user.alias} 打开库房门`,
        logType: 'normal',
        objectId: user.id,
        createdBy: user.id,
        updatedBy: user.id,
        noFaceAndFinger: true
      });
    }
    return res.ok('fifo msg sent');
  },

  //归零
  returnZero: (req, res) => {
    let me = this;
    const canId = req.query.canId;

    const moduleId = req.query.moduleId;
    me.returnZero = sm('weighBullet',
      {
        canId: canId,
        moduleId: moduleId,
        type: 1,
        value: 0
      },
      function (data) {
        sails.services.message.local({ topic: 'returnZero', value: { status: data.status, msg: weighResult[data.status - 1] } });
      },
      _.bind(onError, me)
    );
    return res.ok('fifo msg sent');
  },

  //校准
  calibrate: (req, res) => {
    const canId = req.query.canId;
    const moduleId = req.query.moduleId;
    const value = Number(req.query.value);
    let me = this;
    if (!value) return res.badRequest({ code: 'NEED_VALUE' });
    me.calibrate = sm('weighBullet',
      {
        canId: canId,
        moduleId: moduleId,
        type: 2,
        value: value
      },
      function (data) {
        sails.services.message.local({ topic: 'calibrate', value: { status: data.status, msg: weighResult[data.status - 1] } });
      },
      _.bind(onError, me)
    );
    return res.ok('fifo msg sent');
  },

  //校准开门
  directOpen: (req, res) => {
    const canId = req.query.canId;
    let me = this;
    const moduleId = req.query.moduleId;
    const leftDoorCanId = 0x5E;
    const rightDoorCanId = 0x5F;
    const leftDoorId = 0;
    const rightDoorId = 1;
    me.handler = function (message) {
      sails.log.debug(' ##### CabinetModuleController:openDirct#### ');
      sails.log.debug(message);
      if (message) {
        if (me.openModuleMessage.id == message.id
        ) {
          sails.log.debug(' ##### CabinetModuleController:openDirct:Log the operation of door open %s #### ');
          sails.services.message.local({ topic: message.name, value: _.omit(message, 'data') });
        }
      }
    }

    // me.openLeftDoorMessage = sm('setDoorState',
    //   {
    //     canId: leftDoorCanId, doorId: leftDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_OPEN
    //   },
    //   _.bind(me.handler, me),
    //   _.bind(onError, me)
    // );
    // me.openRightDoorMessage = sm('setDoorState',
    //   {
    //     canId: rightDoorCanId, doorId: rightDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_OPEN
    //   },
    //   _.bind(me.handler, me),
    //   _.bind(onError, me)
    // );
    me.openModuleMessage = sm('setBulletLockState',
      {
        canId: canId, moduleId: moduleId ? moduleId : 0, state: FIFO.SGS_BULLET_LOCK_OPERATE.BULLET_LOCK_OPEN
      },
      _.bind(me.handler, me),
      _.bind(onError, me)
    );

    return res.ok('fifo msg sent');
  },

  ezCreate(req, res) {
    const method = req.method;
    switch (method) {
      case 'GET': {
        const typeId = req.query.typeId;
        const moduleType = req.query.moduleType;
        const canIdStartAt = Number(req.query.canIdStartAt);
        const moduleIdStartAt = Number(req.query.moduleIdStartAt);
        const moduleCounts = Number(req.query.moduleCounts);
        const canCounts = Number(req.query.canCounts);
        if (!typeId || !moduleType || !Number.isInteger(canIdStartAt) || !Number.isInteger(moduleIdStartAt) || !Number.isInteger(moduleCounts) || !Number.isInteger(canCounts))
          return res.serverError({ code: 'NOARGV', msg: '参数不正确' });
        const cabinetId = sails.config.cabinet.id;
        if (moduleType === 'gun') {
          co(function* () {
            let index = 1;
            for (let i = 0; i < canCounts; i++) {
              for (let n = 0; n < moduleCounts; n++) {
                const gun = yield Gun.create({
                  name: index,
                  code: index,
                  cert: index,
                  type: typeId,
                  lastMaintainDate: moment().format('YYYY-MM-DD HH:mm'),
                  maintainInterval: '90',
                  storageStatus: 'in',
                  gunStatus: 'normal',
                  isDisabled: false,
                  isPublic: true,
                });
                yield CabinetModule.create({
                  moduleId: n + moduleIdStartAt,
                  canId: i + canIdStartAt,
                  cabinet: cabinetId,
                  gunType: typeId,
                  bulletType: '',
                  gun: gun.id,
                  type: 'gun',
                  capacity: 1,
                  name: index,
                })
                index++;
              }
            }
          }).then((data) => {
            return res.ok();
          })
            .catch((e) => {
              sails.log.error(e);
              return res.serverError(e);
            })
        } else if (moduleType === 'bullet') {
          co(function* () {
            const capacity = req.query.capacity;
            let index = 1;
            for (let i = 0; i < canCounts; i++) {
              for (let n = 0; n < moduleCounts; n++) {
                yield CabinetModule.create({
                  moduleId: n + moduleIdStartAt,
                  canId: i + canIdStartAt,
                  cabinet: cabinetId,
                  bulletType: typeId,
                  type: 'bullet',
                  capacity: capacity,
                  load: capacity,
                  name: index,
                })
                index++;
              }
            }
          }).then((data) => {
            return res.ok();
          })
            .catch((e) => {
              sails.log.error(e);
              return res.serverError(e);
            })
        } else {
          return res.badRequest({ code: 'NO_SUCH_TYPE', msg: 'moduleType must be gun or bullet' })
        }
        break;
      }
      case 'POST': {
        //根据上传的表格创建模块和枪支
        let distPath = '/tmp';
        req.file('gun').upload({
          // don't allow the total upload size to exceed ~10MB
          maxBytes: 10000000,
          dirname: distPath
        }, function (err, uploadedFile) {
          if (err) {
            sails.log.error('#### SystemController : uploadUpdateFile upload error ####');
            sails.log.error(err);
            return res.serverError(err);
          }
          // If no files were uploaded, respond with an error.
          if (uploadedFile.length === 0) {
            sails.log.debug('#### SystemController : uploadUpdateFile No file was uploaded ####');
            return res.badRequest('No file was uploaded');
          }
          let filePath = uploadedFile[0].fd;
          Cabinet.findOne({ isLocal: true }).exec((err, cabinet) => {
            if (err) {
              return res.serverError(err);
            } else if (cabinet) {
              csv()
                .fromFile(filePath)
                .on('json', (jsonObj) => {
                  let gunModule = {
                    moduleId: 1,
                    cabinet: cabinet.code,
                    gunType: 'ac150de4-251b-4f62-a28c-54ffbf198210',
                    bulletType: '',
                    type: 'gun',
                    capacity: 1,
                  };
                  let gun = {
                    type: 'ac150de4-251b-4f62-a28c-54ffbf198210', //97防爆枪
                    lastMaintainDate: moment().format('YYYY-MM-DD HH:mm'),
                    maintainInterval: '180',
                    storageStatus: 'in',
                    gunStatus: 'normal',
                    isDisabled: false,
                    isPublic: true,
                  };
                  gun.cert = jsonObj['枪证号'];
                  gun.code = jsonObj['枪号'];
                  gun.name = jsonObj['编号'];
                  gun.notes = jsonObj['备注'];
                  if (Number(gun.name > 0)) {
                    Gun.create(gun).exec((err, gun) => {
                      if (err) {
                        return sails.log.error(err);
                      } else {
                        gunModule.gun = gun.id;
                        gunModule.name = jsonObj['编号'];
                        gunModule.canId = Number(jsonObj['编号']) + 125;
                        CabinetModule.create(gunModule).exec((err, cb) => {
                          if (err) return sails.log.error(err);
                        })
                      }
                    })
                  }
                })
                .on('done', (error) => {
                  sails.log.debug('import gun and module finished');
                  return res.ok({ code: 'SUCCESS', msg: '枪支信息导入成功' });
                })
            } else {
              return res.serverError({ code: 'NOCABINET', msg: '本地柜机未初始化' });
            }
          })
        });
      }
    }

  },

  openBatch: (req, res) => {
    sails.log.debug(' #### Start batch Open Module Lock ####');
    var user = req.session.user ? req.session.user : req.user;
    if (!user || !user.alias) {
      user = {
        alias: req.body.alias || req.body.username || 'unknownuser',
        id: req.body.userId || 'null'
      }
    }
    var me = this;

    const leftDoorCanId = 0x5E;
    const rightDoorCanId = 0x5F;
    const leftDoorId = 0;
    const rightDoorId = 1;

    const moduleType = req.body.moduleType;
    const gunAction = req.body.action;
    const applicationId = req.body.applicationId;
    const gunList = req.body.gunList;
    const moduleList = req.body.moduleList;

    MessageExchange.uploadOpenMsg({ applicationId }, 0);

    me.handler = function (message) {
      sails.log.debug(' ##### CabinetModuleController:openBatch:User name is %s #### ', user.alias);
      sails.log.debug(message);
      if (message) {
        if (me.openModuleMessage.id == message.id
        ) {
          sails.log.debug(' ##### CabinetModuleController:openBatch:Log the operation of door open %s #### ');
          sails.services.message.local({ topic: message.name, value: _.omit(message, 'data') });
        }
      }
    }

    // me.openLeftDoorMessage = sm('setDoorState',
    //   {
    //     canId: leftDoorCanId, doorId: leftDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_OPEN
    //   },
    //   _.bind(me.handler, me),
    //   _.bind(onError, me)
    // );
    // me.openRightDoorMessage = sm('setDoorState',
    //   {
    //     canId: rightDoorCanId, doorId: rightDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_OPEN
    //   },
    //   _.bind(me.handler, me),
    //   _.bind(onError, me)
    // );

    if (moduleType === 'gun') {
      if (!gunList) res.badRequest({ msg: '缺少参数 gunList' });
      const guns = gunList.split(',');
      //记录AB枪使用情况
      // if (gunAction === 'getGun') {
      //   GunService.ABGunEnabled().then((ABGunEnabled) => {
      //     if (ABGunEnabled) {
      //       GunService.recordABGun(sails.config.cabinet.id, guns[0]).then((data) => {
      //         sails.log.verbose(`#### CabinetModuleController : openbatch 记录AB枪`)
      //       }).catch((e) => {
      //         sails.log.error(e);
      //       })
      //     }
      //   }).catch((e) => {
      //     sails.log.error(`#### CabinetModuleController : openbatch 获取AB枪启用状态失败`)
      //     sails.log.error(e);
      //   })
      // }

      for (let i in guns) {
        setTimeout(function () {
          CabinetModule.findOne({ gun: guns[i] }).exec((err, rs) => {
            if (err) {
              sails.log.error(`#### CabinetModuleController : openbatch error ####`);
              sails.log.error(err)
            } else if (rs && rs.canId) {
              openCabinet(rs.canId, rs.name, rs.moduleId);
            }
          })
        }, 500 * i)
      }
    } else if (moduleType === 'bullet') {
      if (!moduleList) res.badRequest({ msg: '缺少参数 moduleList' });
      const modules = moduleList.split(',');
      for (let i in modules) {
        setTimeout(function () {
          CabinetModule.findOne({ id: modules[i] }).exec((err, rs) => {
            if (err) {
              sails.log.error(`#### CabinetModuleController : openbatch error ####`);
              sails.log.error(err)
            } else if (rs && rs.canId) {
              openCabinet(rs.canId, rs.name, rs.moduleId);
            }
          })
        }, 500 * i)
      }
    }

    function openCabinet(moduleCanId, name, moduleId) {
      sails.log.debug(`#### CabinetModuleController : open can -> ${moduleCanId} moduleId -> ${moduleId} name -> ${name} ####`);
      var log = '';
      if (moduleType === 'gun') {
        if (gunAction === 'getGun') {
          log = user.alias + '取枪操作, 位置: ' + name;
        } else if (gunAction === 'returnGun') {
          log = user.alias + '还枪操作, 位置: ' + name;
        } else if (gunAction === 'storageGun') {
          log = user.alias + '存枪操作, 位置: ' + name;
        }
        me.openModuleMessage = sm('setGunLockState',
          {
            canId: moduleCanId, moduleId: moduleId ? moduleId : 1, state: FIFO.SGS_GUN_LOCK_OPERATE.GUN_LOCK_OPEN
          },
          _.bind(me.handler, me),
          _.bind(onError, me)
        );
      } else if (moduleType === 'bullet') {
        if (gunAction === 'getBullet') {
          log = user.alias + '取弹操作, 位置:' + name;
        } else if (gunAction === 'returnBullet') {
          log = user.alias + '还弹操作, 位置:' + name;
        } else if (gunAction === 'storageBullet') {
          log = user.alias + '存弹操作, 位置:' + name;
        }
        //默认弹仓moduleId为0
        me.openModuleMessage = sm('setBulletLockState',
          {
            canId: moduleCanId, moduleId: moduleId ? moduleId : 0, state: FIFO.SGS_BULLET_LOCK_OPERATE.BULLET_LOCK_OPEN
          },
          _.bind(me.handler, me),
          _.bind(onError, me)
        );
      }
    }

    res.ok({ info: 'open command sent' });
  },

  update: (req, res) => {
    const id = req.params.id;
    let data = sails.services.utils.replaceNull(req.body);
    delete data.id;
    CabinetModule.findOne({ id }).exec((err, cm) => {
      if (err) {
        sails.log.error(`#### CabinetModuleController: update find cabinetmodule failed :${err} ####`)
        return res.serverError(err);
      }
      if (cm) {
        const gunId = cm.gun;
        data.UpdatedFrom = sails.config.cabinet.id
        CabinetModule.update({ id }, data).exec((err, rs) => {
          if (err) {
            sails.log.error(`#### CabinetModuleController: update  cabinetmodule failed :${err} ####`)
            return res.serverError(err);
          }
          if (!data.gun) {
            Gun.update({ id: gunId }, { storageStatus: 'awaitin' }).exec((err, rs) => {
              if (err) sails.log.error(`#### CabinetModuleController: update gun failed :${err} ####`)
            })
          }
          return res.ok(rs)
        })
      } else {
        return res.serverError({ code: 'NOSUCHMODULE' })
      }
    })
  },

  delete: (req, res) => {
    const id = req.body.id;
    CabinetModule.findOne({ id }).exec((err, cm) => {
      if (err) {
        sails.log.error(`#### CabinetModuleController: delete :find cabinetmodule failed :${err} ####`)
        return res.serverError(err);
      }
      if (cm) {
        const gunId = cm.gun;
        CabinetModule.destroy({ id }).exec((err, rs) => {
          if (err) {
            sails.log.error(`#### CabinetModuleController: delete  cabinetmodule failed :${err} ####`)
            return res.serverError(err);
          }
          Gun.update({ id: gunId }, { storageStatus: 'awaitin' }).exec((err, rs) => {
            if (err) sails.log.error(`#### CabinetModuleController: delete gun failed :${err} ####`)
          })
          return res.ok(rs)
        })
      } else {
        return res.serverError({ code: 'NOSUCHMODULE' })
      }
    })
  },

  //获取关联子弹模块列表
  associatedBulletsModules: (req, res) => {
    co(function* () {
      const gunType = req.query.gunType;
      const cabinet = req.query.cabinet;

      if (!gunType || !cabinet) return yield Promise.reject({ msg: '缺少参数' });

      const _gunType = yield GunType.findOne({ id: gunType });
      if (!_gunType) return yield Promise.reject({ msg: '没有找到枪支类型' });

      const bulletType = _gunType.bulletType;

      const skip = Number(req.query.skip) || 0;
      const limit = Number(req.query.limit) || 10;
      const pagination = req.headers.pagination;

      const total = yield CabinetModule.count({ bulletType: bulletType, cabinet: cabinet });
      if (total === 0) return yield Promise.resolve({
        total: 0,
        skip: skip,
        limit: limit,
        data: []
      })

      const sql = `select cm.id as id, cm.name as name, \
                    bt.name as bulletTypeName, \
                    cm.capacity as capacity, cm.load as 'load' from cabinetmodule as cm \
                    left join bullettype as bt \
                    on bt.id = cm.bulletType \
                    where bulletType='${bulletType}' and cabinet='${cabinet}' \
                    order by cm.name*1 asc , cm.createdAt asc \
                    limit ${skip}, ${limit};`

      const data = yield sails.services.utils.promiseQuery(sql);

      const moduleIds = data.map(d => `"${d.id}"`);

      const bindSql = `select g.name as gName, \
                      c.name as cName, g.associatedBulletModule from gun as g \
                      left join cabinet as c \
                      on c.id = g.SyncFrom \
                      where g.associatedBulletModule in (${moduleIds.join(',')})`;

      const bindedGuns = yield sails.services.utils.promiseQuery(bindSql);

      const localCabinet = yield Cabinet.findOne({ id: sails.config.cabinet.id });

      for (let i in bindedGuns) {
        if (bindedGuns[i].gName && !bindedGuns[i].cName) {
          bindedGuns[i].cName = localCabinet.name;
        }
      }

      let bindedGunsObj = {};
      for (let i in bindedGuns) {
        if (bindedGunsObj[bindedGuns[i].associatedBulletModule]) {
          bindedGunsObj[bindedGuns[i].associatedBulletModule].push(bindedGuns[i]);
        } else {
          bindedGunsObj[bindedGuns[i].associatedBulletModule] = [bindedGuns[i]];
        }
      }

      for (let i in data) {
        data[i].bindInfo = bindedGunsObj[data[i].id];
      }

      if (pagination == 'true') {
        return yield Promise.resolve({
          total: total,
          skip: skip,
          limit: limit,
          data: data
        })
      } else {
        return yield Promise.resolve(data)
      }

    }).then((data) => {
      return res.ok(data);
    }).catch((e) => {
      sails.log.error(`#### CabinetModuleController :  associatedBulletsModules #####`);
      sails.log.error(e)
      return res.badRequest({ msg: e.msg ? e.msg : '内部错误' });
    })
  },

  //开启工单中选择的关联子弹模块
  openAssociatedBulletModule: (req, res) => {
    co(function* () {
      const cabinetModuleId = req.body.cabinetModuleId;
      const userId = req.body.applicantId;
      const applicationId = req.body.applicationId;
      const isReturn = req.body.isReturn;

      const user = yield User.findOne({ id: userId });
      if (!user) return yield Promise.reject({ msg: '没有找到指定用户' });
      const token = 'Token ' + new Buffer(user.token).toString('base64');

      if (isReturn == 'true') {
        const logs = yield OptLog.find({ object: 'bullet', objectId: applicationId });
        for (let index = 0; index < logs.length; index++) {
          let log = logs[index];
          if (log.logData && log.logData.cabinetModule) {
            setTimeout(() => {
              const cabinetModuleId = log.logData.cabinetModule;
              CabinetModule.findOne({ id: cabinetModuleId }).exec((err, cm) => {
                if (!cm || err) {
                  sails.log.error(`#### CabinetModuleController : openAssocatedBulletModules query cm failed`);
                  sails.log.error(err);
                } else {
                  Cabinet.findOne({ id: cm.cabinet }).exec((err, cabinet) => {
                    if (!cabinet || err) {
                      sails.log.error(`#### CabinetModuleController : openAssocatedBulletModules query cabinet failed`);
                      sails.log.error(err);
                    }
                    const requestPath = `http://${cabinet.host}:1337/cabinetmodule/open`;
                    sails.services.network.proxy(requestPath, 'POST', {
                      alias: user.alias,
                      userId: user.id,
                      username: user.username,
                      moduleId: cm.id,
                      moduleType: 'bullet',
                      moduleCanId: cm.canId,
                      gunAction: 'returnBullet',
                      applicantId: applicationId
                    }, token).then((data) => {
                      sails.log.debug(`CabinetMOduleController : request open bullet result `)
                    }).catch((e) => {
                      sails.log.error(`#### CabinetModuleController : openAssocatedBulletModules request open failed`);
                      sails.log.error(e)
                    })
                  })
                }
              })
            }, index * 300);
          }
        }
        return yield Promise.resolve({ msg: '已发送开启命令' });
      } else {
        const cm = yield CabinetModule.findOne({ id: cabinetModuleId });
        if (!cm) return yield Promise.reject({ msg: '没有找到指定模块' })

        const cabinet = yield Cabinet.findOne({ id: cm.cabinet });
        if (!cabinet) return yield Promise.reject({ msg: '没有知道指定柜机' });

        const requestPath = `http://${cabinet.host}:1337/cabinetmodule/open`;
        const response = yield sails.services.network.proxy(requestPath, 'POST', {
          alias: user.alias,
          userId: user.id,
          username: user.username,
          moduleId: cm.id,
          moduleType: 'bullet',
          moduleCanId: cm.canId,
          gunAction: 'getBullet',
          applicantId: applicationId
        }, token);

        yield OptLog.create({
          object: 'bullet',
          objectId: applicationId,
          action: '开启关联弹仓',
          log: `${user.alias || user.username} 取枪开启关联弹仓, 弹仓位于柜机 ${cabinet.name}, 名称 : ${cm.name}`,
          logData: { cabinetModule: cm.id },
          logType: 'normal',
          createdBy: user.id,
          updatedBy: user.id
        })

        return Promise.resolve({ statusCode: response.statusCode });

      }

    }).then((data) => {
      sails.log.debug(`#### CabinetModuleController : openAssocatedBulletModules msg sent`)
      sails.log.debug(data);
      return res.ok(data);
    }).catch((e) => {
      sails.log.error(`#### CabinetModuleController : openAssocatedBulletModules request open failed`);
      sails.log.error(e)
      return res.serverError({ msg: e.msg ? e.msg : '内部错误' });
    })
  },

  //开启模块设置中已关联子弹模块
  openSetAssociatedBulletModule: (req, res) => {
    co(function* () {
      const userId = req.body.applicantId;
      const applicationId = req.body.applicationId;

      const user = yield User.findOne({ id: userId });
      if (!user) return yield Promise.reject({ msg: '没有找到指定用户' });
      const token = 'Token ' + new Buffer(user.token).toString('base64');

      const application = yield Application.findOne({ id: applicationId });
      let moduleInfo = [];
      if (application.gun) {
        const gunArr = application.gun.split(',');
        const guns = yield Gun.find({ id: gunArr });
        const associatedBulletsModulesArr = guns.map(gun => gun.associatedBulletModule);
        const uniModules = sails.services.utils.uniArr(associatedBulletsModulesArr);

        sails.log.debug(` #### CabinetmOduleController : openSet`)
        sails.log.debug(` #### uniModules : ${uniModules}`)

        if (uniModules.length > 0) {
          let ids = ''
          for (let i in uniModules) {
            ids += `"${uniModules[i]}"`
          }

          const sql = `select c.name as cabinetName, cm.name as cmName from cabinetmodule as cm \
          left join cabinet as c \
          on c.id = cm.cabinet \
          where cm.id in (${ids})`;

          moduleInfo = yield sails.services.utils.promiseQuery(sql);
        }

        for (let i in uniModules) {
          setTimeout(() => {
            const cabinetModuleId = uniModules[i];
            CabinetModule.findOne({ id: cabinetModuleId }).exec((err, cm) => {
              if (!cm || err) {
                sails.log.error(`#### CabinetModuleController : openAssocatedBulletModules query cm failed`);
                sails.log.error(err);
              } else {
                Cabinet.findOne({ id: cm.cabinet }).exec((err, cabinet) => {
                  if (!cabinet || err) {
                    sails.log.error(`#### CabinetModuleController : openAssocatedBulletModules query cabinet failed`);
                    sails.log.error(err);
                  }
                  const requestPath = `http://${cabinet.host}:1337/cabinetmodule/open`;
                  sails.services.network.proxy(requestPath, 'POST', {
                    alias: user.alias,
                    userId: user.id,
                    username: user.username,
                    moduleId: cm.id,
                    moduleType: 'bullet',
                    moduleCanId: cm.canId,
                    gunAction: 'returnBullet',
                    applicantId: applicationId
                  }, token).then((data) => {
                    sails.log.debug(`CabinetMOduleController : request open bullet result `)
                    sails.log.debug(`CabinetMOduleController : request remote open status code   ${data.statusCode}`)
                  }).catch((e) => {
                    sails.log.error(`#### CabinetModuleController : openAssocatedBulletModules request open failed`);
                    sails.log.error(e)
                  })
                })
              }
            })
          }, i * 300);
        }
      }

      return yield Promise.resolve(moduleInfo);

    }).then((data) => {
      sails.log.debug(`#### CabinetModuleController : openAssocatedBulletModules msg sent`)
      sails.log.debug(data);
      return res.ok(data);
    }).catch((e) => {
      sails.log.error(`#### CabinetModuleController : openAssocatedBulletModules request open failed`);
      sails.log.error(e)
      return res.serverError({ msg: e.msg ? e.msg : '内部错误' });
    })
  },

  //手动记录AB枪
  recordABGun: (req, res) => {
    const gunId = req.body.gunId
    const cabinetId = req.body.cabinetId
    sails.log.verbose(`#### CabinetModuleController : recordABGun 记录AB枪 gun ${gunId} 状态 out`)
    sails.services.abgun.set(gunId, 'out')
    return res.ok({ code: 0 })
    GunService.recordABGun(cabinetId, gunId).then((data) => {
      sails.log.verbose(`#### CabinetModuleController : recordABGun 记录AB枪 cabinet ${cabinetId} gun ${gunId}`)
      return res.ok({ code: 0 })
    }).catch((e) => {
      sails.log.error(e);
      return res.serverError({ data: e })
    })
  }
};
