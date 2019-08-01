/**
 * CabinetController
 *
 * @description :: Server-side logic for managing Cabinets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict';
var _ = require('lodash');
const BitinvoFifo = require('bitinvo-fifo');
const FIFO = BitinvoFifo.Fifo;
const sm = BitinvoFifo.FifoClient.sendFifoMessage;
const uuid = require('node-uuid');
const request = require('request');
const co = require('co');
const Client = require('../services/Redis');
const moment = require('moment');

let CAM_ID = 0
const genCamId = () => {
  if (CAM_ID > 65536) {
    CAM_ID = 0
  } else {
    CAM_ID++
  }
  return CAM_ID
}

var onComplete = function (data) {
  sails.log.debug(' ##### CabinetController:open:onComplete #### ');
  sails.log.debug(data);
}

var onError = function (err) {
  sails.log.debug(' ##### CabinetController:open:onError #### ');
  sails.log.error(err);
}

var leftDoorCanId = 0x5E;
var rightDoorCanId = 0x5F;
var leftDoorId = 0;
var rightDoorId = 1;

module.exports = {
  open: function (req, res, next) {
    sails.log.debug(' #### Start Open Cabinet Lock ####');


    var user = req.session.user ? req.session.user : req.user;
    var me = this;

    me.handler = function (message, log) {
      sails.log.debug(' ##### CabinetController:open:User name is %s #### ', user.alias);
      sails.log.debug(message);
      if (message) {
        if (me.openLeftDoorMessage.id == message.id || me.openRightDoorMessage.id == message.id) {
          sails.log.debug(' ##### CabinetController:open:Log the operation of door open %s #### ');
          var log = {
            object: 'cabinet',
            action: '开门',
            log: '开启左门成功',
            logType: 'normal',
            objectId: leftDoorId,
            createdBy: user.id,
            updatedBy: user.id
          };
          if (me.openLeftDoorMessage.id == message.id) {
            log.action = '开启右门成功';
            log.objectId = rightDoorId;
          }
          OptLog.create(log)
            .exec(function (err) {
              if (err) {
                sails.log.error(' #### AuthController:login  adding OptLog fails');
                sails.log.error(err);
              }
            });
          sails.services.message.local({ topic: message.name, value: message });
        }
      }
    }

    me.openLeftDoorMessage = sm('setDoorState',
      {
        canId: leftDoorCanId, doorId: leftDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_OPEN
      },
      _.bind(me.handler, me),
      _.bind(onError, me)
    );

    me.openRightDoorMessage = sm('setDoorState',
      {
        canId: rightDoorCanId, doorId: rightDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_OPEN
      },
      _.bind(me.handler, me),
      _.bind(onError, me)
    );

    res.ok({ info: 'open command sent' });
  },

  close: function (req, res, next) {
    sails.log.debug(' #### Start Close Cabinet Lock ####');

    var user = req.session.user ? req.session.user : req.user;
    var me = this;

    me.handler = function (message, log) {
      sails.log.debug(' ##### CabinetController:open:User name is %s #### ', user.alias);
      sails.log.debug(message);
      if (message) {
        if (me.openLeftDoorMessage.id == message.id || me.openRightDoorMessage.id == message.id) {
          sails.log.debug(' ##### CabinetController:open:Log the operation of door open %s #### ');
          sails.services.message.local({ topic: message.name, value: _.omit(message, 'data') });
        }
      }
    }

    me.closeLeftDoorMessage = sm('setDoorState',
      {
        canId: leftDoorCanId, doorId: leftDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_CLOSE
      },
      _.bind(me.handler, me),
      _.bind(onError, me)
    );
    me.closeRightDoorMessage = sm('setDoorState',
      {
        canId: rightDoorCanId, doorId: rightDoorId, state: FIFO.SGS_DOOR_OPERATE.DOOR_CLOSE
      },
      _.bind(me.handler, me),
      _.bind(onError, me)
    );

    res.ok({ info: 'close command sent' });
  },

  updatesettings(req, res, next) {
    let settings = req.body.settings;
    if (!settings) return res.badRequest('设置参数不能为空');
    sails.log.debug(' #### CabinetController:Update Local Cabinet Setting Start#### ');
    sails.log.info(settings);
    let option = {};
    for (let setting of settings) {
      if (setting.key == 'boxname') {
        option.name = setting.value;
        System.findOrCreate({ key: 'boxname' }, (err, suc) => {
          if (err) return sails.log.error(err);
          suc.value = setting.value;
          suc.save((err, suc) => {
            if (err) return sails.log.error(err);
            sails.log.debug(' #### CabinetController:Update System BoxName Success#### ')
          })
        })
      } else if (setting.key == 'isMaster') {
        option.isMaster = setting.value;
        if (setting.value === 'false') {
          sails.services.broadcast.clear();
        }
        System.findOrCreate({ key: 'isMaster' }, (err, suc) => {
          if (err) sails.log.error(err);
          suc.value = setting.value;
          if (setting.value === 'true') {
            sails.services.etcd.setMaster();
            sails.services.shellproxy.setNtpServer();
          } else {
            sails.services.etcd.setSlave();
          }
          suc.save((err, suc) => {
            if (err) return sails.log.error(err);
            sails.log.debug(' #### CabinetController:Update System isMaster Success#### ');
            setTimeout(function () {
              sails.services.syncrole.initClass();
            }, 2 * 1000);
          })
        })
      } else if (setting.key === 'isApplicationMachine') {
        System.findOrCreate({ key: 'isApplicationMachine' }, (err, suc) => {
          if (err) return sails.log.error(err);
          suc.value = setting.value;
          suc.save((err, suc) => {
            if (err) return sails.log.error(err);
            sails.log.debug(' #### CabinetController:Update System isApplicationMachine Success#### ')
          })
        })
      }
    }
    Cabinet.update({ code: sails.config.cabinet.id }, option)
      .then((data) => {
        sails.log.debug(' #### CabinetController:Update Local Cabinet Setting Success#### ')
        return res.ok(data);
      })
      .catch((err) => {
        sails.log.error(' #### CabinetController:Update Local Cabinet Setting Failed#### ')
        return res.serverError(err);
      })
  },
  /**
   * @api {get} /cabinet/verifyCabinet/:code 授权主机
   * @apiVersion 1.0.0
   * @apiName VerifyCabinet
   * @apiGroup Cabinet
   * 
   * @apiSuccess {String} success 成功
   * 
   * @apiError (Error 500) {String} error 没有虚拟用户
   * 
   * @apiError (Error 400) {String} error 无对应编号的柜机
   */
  verifyCabinet(req, res, next) {
    let code = req.query.code;
    if (code == sails.config.cabinet.id) {
      return res.badRequest({ error: '无法对自己授权' })
    }
    Cabinet.update({ code: code }, { isVerified: true })
      .then((targets) => {
        let target = targets[0];
        if (target) {
          //generator and send Token
          let Token = uuid.v4();
          let option = {
            url: `http://${target.host}:${target.port}/cabinet/verify/${sails.config.cabinet.id}`,
            method: 'POST',
            json: true,
            headers: {
              'authorization': 'Token ' + new Buffer(target.remoteToken).toString('base64')
            }
          };
          return User.update({ username: target.code }, { token: Token })
            .then((domainUsers) => {
              let domainUser = domainUsers[0];
              if (domainUser) {
                let item = {
                  remoteToken: domainUser.token
                };
                option.body = item;
                sails.log.info(option);
                request(option, (err, result) => {
                  if (err) {
                    sails.log.error(err);
                    return res.serverError(err);
                  } else {
                    sails.log.info(result.body);
                    if (result.statusCode == 200) {
                      // setTimeout(function(){
                      //   sails.services.syncrole.NewSync(target.code);
                      // }, 5 * 1000);
                      return res.ok(result.body);
                    } else {
                      return res.badRequest(result.body);
                    }
                  }
                })
              } else {
                return res.serverError({ error: '没有对应虚拟用户' });
              }
            });
        } else {
          return res.badRequest({ error: '无对应编号的柜机' });
        }
      })
      .catch((err) => {
        sails.log.error(err);
        return res.serverError({ error: err });
      })
  },

  verify(req, res, next) {
    let code = req.params.code;
    let remoteToken = req.body.remoteToken;
    if (!code) {
      return res.badRequest({ error: 'Invalid Code' });
    }
    co(function* () {
      let updated = yield Cabinet.update({ code: code }, { remoteToken: remoteToken });
      if (updated.length === 0) return yield Promise.reject('No Target');
      sails.services.syncrole.setMaster(updated[0]);
      return yield Promise.resolve();
    })
      .then((data) => {
        res.ok(data);
      })
      .catch((err) => {
        sails.log.error(err);
        res.serverError(err);
      })
  },
  /**
   * @api {get} /cabinet/cleanconnect 清除主机设置
   * @apiName cleanConnect 
   * @apiVersion 1.0.0
   * @apiGroup Cabinet
   * 
   * @apiSuccess {String} Success 成功
   * 
   * @apiError {String} err 错误提示
   * @apiError (Error 500) {String} msg 具体错误信息
   */
  cleanConnect(req, res, next) {
    let user = req.session.user;
    co(function* () {
      let self = yield Cabinet.findOne({ isLocal: true });
      if (!self.isMaster) {
        let master = yield Cabinet.findOne({ isMaster: true });
        if (!master || !master.remoteToken) {
          sails.log.error('没有连接主机或者未授权');
          return res.badRequest({ error: '没有连接主机或者未授权' });
        }
        let url = `http://${master.host}:${master.port}/cabinet/recieveClean`;
        let token = 'Token ' + new Buffer(master.remoteToken).toString('base64');
        try {
          yield sails.services.network.proxy(url, 'POST', { id: self.id }, token);
          sails.log.info('主机删除本机信息成功');
        } catch (err) {
          sails.log.error('向主机发出重置声明时异常');
          if (err.msg) { sails.log.error(msg) }
          else { sails.log.error(err) };
        }
      }
      let result = yield [
        Cabinet.destroy({ isLocal: false }),
        User.destroy({ isDummy: true, isLocal: false })
      ];
      if (self.isMaster) {
        //Master
        let del = yield Client.delAsync('broadcastList');
      } else {
        //Slave
        sails.services.broadcast.announce(self);
      }

      OptLog.create({
        object: 'user',
        objectId: user.id,
        action: '重置主机',
        actionType: 'reset_master',
        logData: { userId: user.id },
        log: `${user.alias} 重置主机`,
        logType: 'normal',
        createdBy: user.id,
        updatedBy: user.id
      }).exec((err, rs) => {
        if (err) {
          sails.log.error(`CabinetController: clean connection create optlog failed`);
          sails.log.error(err);
        } else {
          sails.log.debug(`CabinetController : ${user.alias} 重置主机`);
        }
      })

      sails.log.debug(' #### CabinetController:Clear Connect Status Success#### ')
      res.ok('清除成功');
    })
      .catch((err) => {
        sails.log.error(err);
        res.serverError({ err: "系统错误", msg: err.message });
      })
  },

  recieveClean(req, res, next) {
    co(function* () {
      let id = req.body.id;
      if (!id) {
        return res.badRequest({ error: '缺少参数' });
      }
      let self = yield Cabinet.findOne({ isLocal: true });
      if (self.code === id) {
        return res.badRequest({ error: '无法删除本地柜机的数据' });
      }
      let result = yield [
        Cabinet.destroy({ id: id, isLocal: false }),
        User.destroy({ username: id, isDummy: true })
      ];
      if (result[0].length > 0 && result[1].length > 0) {
        return res.ok({ msg: '删除成功' });
      } else {
        return res.ok({ msg: '对应数据不存在或已经被删除' });
      }
    })
      .catch((err) => {
        return res.serverError({ error: err });
      })
  },
  /**
   * @api {get} /cabinet/recieve 接收握手信息
   * @apiVersion 1.0.0
   * @apiName recieve
   * @apiGroup Cabinet
   */
  recieve(req, res) {
    sails.services.cabinet.recieveHandShake(req, res);
  },
  /**
   * @api {get} /cabinet/getBroadcastList 获取待加入柜机列表
   * @apiVersion 1.0.0
   * @apiName getBroadcastList 
   * @apiGroup Cabinet
   * 
   * @apiSuccess {Array} default 列表数组
   * 
   * @apiError (Error 500) {Error} default 错误信息
   */
  getBroadcastList(req, res) {
    co(function* () {
      let broadcastList = yield sails.services.discover.getDiscoverList(req);
      res.ok(broadcastList);
    })
      .catch((err) => {
        sails.log.error(err);
        res.serverError(err);
      })
  },

  doHandshake(req, res) {
    sails.services.cabinet.doHandshake(req, res);
  },
  /**
   * @api {get} /cabinet/refreshETCDCode 获取最新的ETCDCode 
   * @apiVersion 1.0.0
   * @apiName refreshETCDCode 
   * @apiGroup Cabinet
   * 
   * @apiSuccess {String} code 最新ETCD Code 
   * 
   * @apiError (Error 400) {String} error 主机的ETCD Code不存在
   * @apiError (Error 500) {Error} default 服务器错误信息
   */
  refreshETCDCode(req, res) {
    Cabinet.findOne({ isLocal: true })
      .then((selfCabinet) => {
        if (selfCabinet && selfCabinet.etcdCode) {
          res.ok({ code: selfCabinet.etcdCode });
        } else {
          res.badRequest({ error: '本机没有etcdcode' });
        }
      })
      .catch((err) => {
        sails.log.error(err);
        res.serverError(err);
      })
  },

  startCheck(req, res) {
    sails.services.cabinet.checkAlive();
    res.ok('开始检查，请稍后操作');
  },
  checkAlive(req, res) {
    let body = req.body;
    if (typeof body !== 'object') {
      sails.log.error('#### Error in CabinetController : CheckAlive ####');
      return res.badRequest({ error: '数据格式有误' });
    }
    if (!body.host || !body.code) {
      return res.badRequest({ error: '缺少数据' });
    }
    Cabinet.update({ code: body.code }, { host: body.host, port: body.port, isAlive: true })
      .then((data) => {
        if (data.length > 0) {
          sails.log.debug('Update Alive success');
          res.ok('alive');
        } else {
          sails.log.error('No target exist');
          res.badRequest({ error: '当前主机没有该机器信息' });
        }
      })
      .catch((err) => {
        sails.log.error(err);
        res.serverError({ error: err });
      })
  },

  filteredCabinet(req, res) {
    let skip = Number(req.query.skip) || 0;
    let limit = Number(req.query.limit) || 5;
    co(function* () {
      let type = req.query.type || 'bullet';
      let query = `select \
        *  \
        from cabinet  \
        order by name*1 asc;`
      let cabinets = yield sails.services.utils.promiseQuery(query);
      let result = [];
      for (let i in cabinets) {
        let cabinetmodules = yield CabinetModule.findOne({ cabinet: cabinets[i].code, type });
        if (cabinetmodules) result.push(cabinets[i]);
      }
      return Promise.resolve(result);
    }).then((data) => {
      if (req.headers.pagination !== 'true') {
        return res.ok(data.slice(skip, limit + skip));
      } else {
        return res.ok({
          total: data.length,
          skip: skip,
          limit: limit,
          data: data.slice(skip, limit + skip)
        })
      }
    }).catch((err) => {
      return res.serverError(err);
    })
  },

  webcam(req, res) {
    const status = req.body.status;
    const pubsub = sails.config.innerPubsub;
    const cabinetId = req.body.cabinetId;
    if (!status || !cabinetId) return res.serverError({ code: 'NOARGV', msg: 'need status and cabinetId' });
    const camId = genCamId()
    pubsub.once(`open_cam_cb_${camId}`, (data) => {
      if (data === 'success') return res.ok();
      return res.serverError({ code: 'CAMERROR', msg: data });
    })
    pubsub.emit(status === 'open' ? 'open_cam' : 'close_cam', cabinetId, camId);
    if (status !== 'open') return res.ok();
  },

  list: (req, res) => {
    const limit = Number(req.query.limit) || 20;
    const skip = Number(req.query.skip) || 0;

    const needLocal = req.query.needLocal || 'false';
    const pagination = req.headers.pagination;

    const queryAppend = needLocal === 'true' ? '' : `where isLocal = false`

    let query = `select \
      *  \
      from cabinet  \
      ${queryAppend} \
      order by name*1 asc, createdAt desc \
      limit ${skip}, ${limit};`

    let countQuery = `select count(*) as count from cabinet  ${queryAppend} \;`

    Cabinet.query(query, (err, rs) => {
      if (err) return res.serverError(err);
      if (rs && rs.length > 0) {
        Cabinet.query(countQuery, (err, count) => {
          if (err) return res.serverError(err);
          let result = pagination === 'true' ? {
            data: rs,
            total: count[0].count,
            filteredTotal: count[0].count,
            skip: skip,
            limit: limit
          } : rs;
          return res.ok(result);
        })
      } else {
        return res.ok({
          data: [],
          total: 0,
          filteredTotal: 0,
          skip: skip,
          limit: limit
        })
      }
    })
  },

  calibrate: (req, res) => {
    const path = '/gun/gunisisit';
    const target = req.query.target;
    Cabinet.findOne({ isLocal: true, isMaster: true }).exec((err, isMaster) => {
      if (err) {
        sails.log.error(`CabinetController : calibrate error`);
        sails.log.error(err);
        return res.serverError({ code: 'DB_ERROR', msg: '获取柜机信息失败' });
      }
      if (!isMaster) {
        return res.badRequest({ code: 'OPERATION_NOT_PERMITTED', msg: '非主机无法执行此操作' });
      }
      if (target === 'all') {
        //校准所有柜机
        Cabinet.find({ isLocal: false }).exec((err, cbs) => {
          if (err) {
            sails.log.error(`CabinetController : calibrate error`);
            sails.log.error(err);
            return res.serverError({ code: 'DB_ERROR', msg: '获取柜机信息失败' });
          }
          for (let i in cbs) {
            sails.services.network.proxy(`http://${cbs[i].host}:${cbs[i].port}${path}`, 'GET').then((data) => {
              sails.services.message.all({ name: cbs[i].name, ip: cbs[i].host, status: 'success', msg: `柜机${cbs[i].name}, ip: ${cbs[i].host}, 已开始校准` }, 'calibrate_msg_status', 'both');
            }).catch((e) => {
              sails.log.error('CabinetController : calibrate error');
              sails.log.error(e);
              sails.services.message.all({ name: cbs[i].name, ip: cbs[i].host, status: 'fail', msg: `柜机${cbs[i].name}, ip: ${cbs[i].host}, 校准失败, 请检查柜机在线状态` }, 'calibrate_msg_status', 'both');
            })
          }
          return res.ok({ code: 'success', msg: `开始校准所有柜机, 预计将于45秒内完成` });
        })
      } else {
        //校准单台柜机
        Cabinet.findOne({ code: target }).exec((err, cb) => {
          if (err || !cb) {
            sails.log.error(`CabinetController : calibrate error`);
            sails.log.error(err);
            return res.serverError({ code: 'DB_ERROR', msg: '获取柜机信息失败' });
          }
          sails.services.network.proxy(`http://${cb.host}:${cb.port}${path}`, 'GET').then((data) => {
            return res.ok({ code: 'success', msg: '开始校准, 预计将于30秒内完成' });
          }).catch((e) => {
            sails.log.error('CabinetController : calibrate error');
            sails.log.error(e);
            return res.serverError({ code: 'NETWORK_ERROR', msg: '连接失败, 请检查远程柜机是否在线' });
          })
        })
      }
    })
  },

  //获取关联子弹柜机列表
  associatedBulletsCabinets: (req, res) => {
    co(function* () {
      const gunType = req.query.gunType;
      const skip = Number(req.query.skip) || 0;
      const limit = Number(req.query.limit) || 10;
      const pagination = req.headers.pagination;

      if (!gunType) return yield Promise.reject({ msg: '缺少参数' });

      const _gunType = yield GunType.findOne({ id: gunType });
      if (!_gunType) return yield Promise.reject({ msg: '没有找到枪支类型' });

      const bulletType = _gunType.bulletType;

      const countSql = `select count(*) as count from \
                          (select cabinet as cabinetId from cabinetmodule \
                            where bulletType = '${bulletType}' group by cabinet) \
                          as cm left join cabinet as c \
                          on c.id=cm.cabinetId;`

      const total = yield sails.services.utils.promiseQuery(countSql);
      if (total[0].count === 0) {
        return yield Promise.resolve({
          total: 0,
          skip: skip,
          limit: limit,
          data: []
        })
      } else {
        const sql = `select * from \
          (select cabinet as cabinetId from cabinetmodule \
            where bulletType = '${bulletType}' group by cabinet) \
          as cm left join cabinet as c \
          on c.id=cm.cabinetId \
          order by c.name*1 asc , createdAt asc \
          limit ${skip}, ${limit};`

        const data = yield sails.services.utils.promiseQuery(sql);

        if (pagination == 'true') {
          return yield Promise.resolve({
            total: total[0].count,
            skip: skip,
            limit: limit,
            data: data
          })
        } else {
          return yield Promise.resolve(data)
        }
      }
    }).then((data) => {
      return res.ok(data);
    }).catch((e) => {
      sails.log.error(`#### CabinetController :  associatedBulletsCabinets #####`);
      return res.badRequest({ msg: e.msg ? e.msg : '内部错误' })
    })
  },

  //用户获取预验证码
  getPreVCode: (req, res) => {
    const date = moment().format('YYYYMMDDHH')
    const code = date * Math.PI
    return res.ok({ code: String(code).slice(0, 6) })
  }
};

