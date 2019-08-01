'use strict';
const co = require('co');
/**
 * GunController
 *
 * @description :: Server-side logic for managing Guns
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
module.exports = {
  validation: function (req, res, next) {
    let gunId = req.query['gunId'];
    sails.services.validation.gunValidation(gunId)
      .then((id) => {
        if (id) {
          res.badRequest('该枪支已经入柜，枪仓号' + id);
        } else {
          res.ok('可以选择');
        }
      })
  },
  //更新枪位状态
  getGunIsisit: function (req, res, next) {
    sails.services.lock.getGunIsisit((err, msg) => {
      if (err) {
        sails.log.error('#### GunController : getGunIsisit error #####');
        sails.log.error(err);
        return res.serverError('获取枪位红外管状态失败');
      }
      if (msg.status == 1) {
        return res.serverError('更新指令执行失败');
      }
      return res.ok('更新信息发送成功');
    })
  },
  //获取公用枪
  publicGun: function (req, res) {
    co(function* () {
      let skip = req.query.skip || 0;
      let limit = req.query.limit || 6;
      let guns = yield Gun.find({ where: { isPublic: true, storageStatus: 'in', isDisabled: false, gunStatus: 'normal', isDeleted: false }, skip: skip, limit: limit, sort: 'updatedAt DESC' }).populate('cabinetModule');
      if (guns.length === 0) return yield Promise.reject('没有找到公用枪');
      let total = yield Gun.count({ isPublic: true, storageStatus: 'in', isDisabled: false, gunStatus: 'normal', isDeleted: false });
      let cabients = yield Cabinet.find();
      let localCabinet = yield Cabinet.findOne({ isLocal: true });
      let result = { total, skip, limit };
      let isMaster = false;
      for (let i in cabients) {
        if (cabients[i].isMaster && cabients[i].isLocal) {
          isMaster = true;
          break;
        }
      }
      if (isMaster) {
        result.data = GunService.matchCabinetName(guns, cabients, localCabinet);
        return yield Promise.resolve(result)
      } else {
        let user = req.session.user ? req.session.user : req.user;
        let masterCabinets = yield GunService.masterCabinetInfo(user)
        if (masterCabinets.length === 0) {
          result.data = GunService.matchCabinetName(guns, cabients, localCabinet);
        } else {
          result.data = GunService.matchCabinetName(guns, masterCabinets, localCabinet);
        }
        for (let i in result.data) {
          if (result.data[i].cabinetModule.length === 0) {
            result.data[i].cabinetModule = yield GunService.peerCabinetModuleInfo(result.data[i].UpdatedFrom, result.data[i].id);
          }
        }
        return yield Promise.resolve(result)
      }
    }).then((result) => {
      result.filteredTotal = result.total;
      return res.ok(result);
    }).catch((err) => {
      return res.serverError(err);
    })
  },

  //获取主机公用枪
  masterPublicGun: function (req, res) {
    co(function* () {
      let limit = Number(req.query.limit) || 6;
      let skip = Number(req.query.skip) || 0;
      let cabinetId = req.query.cabinetId;

      let queryCabinet = cabinetId ? `and cm.cabinet = '${cabinetId}'` : ``;

      let query = `select \
                   g.id,g.name, g.type, g.code, cm.gunLock, cm.id as cabinetmoduleId, cm.cabinet, c.name as cabinetName, c.host as cabinetIp \
                   from gun g \
                   left join cabinetmodule cm \
                   on cm.gun = g.id \
                   left join cabinet c\
                   on c.id = cm.cabinet\
                   where g.isPublic = true \
                   and g.storageStatus = 'in' \
                   and g.isDisabled = false \
                   and g.gunStatus = 'normal' \
                   and g.isDeleted = false \
                   and cm.id is not null \
                   ${queryCabinet} \
                   order by g.name*1 asc\
                   limit ${skip}, ${limit};`

      let countQuery = `select \
              count(*) as count\
              from gun g \
              left join cabinetmodule cm \
              on cm.gun = g.id \
              where g.isPublic = true \
              and g.storageStatus = 'in' \
              and g.isDisabled = false \
              and g.gunStatus = 'normal' \
              and cm.id is not null \
              ${queryCabinet} \
              and g.isDeleted = false \;`

      let cabinet = yield Cabinet.findOne({ isLocal: true });
      if (cabinet.isMaster === true) {
        sails.log.debug(`#### GunController : masterPublicGun local is Master ####`);

        let guns = yield GunService.gunQueryPromise(query);
        if (guns.length === 0) return yield Promise.resolve({
          data: [],
          total: 0,
          filteredTotal: 0,
          skip: skip,
          limit: limit
        });
        let total = yield GunService.gunQueryPromise(countQuery);
        let result = {
          data: guns,
          total: total[0].count,
          filteredTotal: total[0].count,
          skip: skip,
          limit: limit
        };
        return yield Promise.resolve(result)
      } else {
        sails.log.debug(`#### GunController : masterPublicGun not master ####`);
        return yield Promise.reject('本机不是主机');
      }
    }).then((guns) => {
      if (req.headers.pagination === 'true') {
        return res.ok(guns);
      } else {
        return res.ok(guns.data);
      }
    }).catch((err) => {
      return res.serverError(err);
    })

  },

  in: function (req, res) {
    if (!req.body.gunId) return res.serverError({ code: 'NOARGV' });
    const guns = req.body.gunId.split(',');
    for (let i in guns) {
      Gun.update({ id: guns[i] }, { storageStatus: 'in' }).exec((err, rs) => {
        if (err) sails.log.error(err);
      })
    }
    return res.ok('枪支状态更新成功');
  },

  create: function (req, res) {
    let data = sails.services.utils.replaceNull(req.body);
    co(function* () {
      const gun = yield Gun.create(data);
      if (data.associatedGun && data.associatedGun.length > 0) {
        yield Gun.update({ id: data.associatedGun }, { associatedGun: gun.id });
      }
    }).then((data) => {
      return res.ok();
    }).catch((err) => {
      sails.log.error(`#### GunController: create 内部错误`);
      sails.log.error(err);
      return res.serverError({ msg: '内部错误' });
    })
  },

  update: function (req, res) {
    const id = req.params.id;
    let data = sails.services.utils.replaceNull(req.body);
    delete data.id;
    co(function* () {
      const _gun = yield Gun.findOne({ id });
      //如果传入的枪支数据中包含关联枪
      if (data.associatedGun && data.associatedGun.length > 0) {
        if (_gun && (_gun.associatedGun !== data.associatedGun)) {
          //如果之前设置过关联枪, 而且前关联枪与新关联枪不同, 将前关联枪的关联项取消
          yield Gun.update({ id: _gun.associatedGun }, { associatedGun: '', associatedBulletModule: '' });
          //将新关联枪的关联项设置为本枪, 将关联枪的关联子弹模块信息修改为本枪关联子弹模块
          yield Gun.update({ id: data.associatedGun }, { associatedGun: id, associatedBulletModule: data.associatedBulletModule ? data.associatedBulletModule : '' });
        }
      } else {
        //如果传入的枪支数据中没有关联枪, 则只将前关联枪的关联项取消
        yield Gun.update({ associatedGun: id }, { associatedGun: '', associatedBulletModule: '' });
      }
      //如果传入的枪支数据关联子弹模块与之前的不同
      if (_gun && (data.associatedBulletModule !== _gun.associatedBulletModule)) {
        yield Gun.update({ id: _gun.associatedGun }, { associatedBulletModule: data.associatedBulletModule });
      }
      //更新本枪信息
      yield Gun.update({ id }, data);
    }).then((data) => {
      return res.ok();
    }).catch((err) => {
      sails.log.error(`#### GunController: update 内部错误`);
      sails.log.error(err);
      return res.serverError({ msg: '内部错误' });
    })
  },
  delete: function (req, res) {
    const id = req.body.id;
    co(function* () {
      const gun = yield Gun.findOne({ id });
      yield Gun.destroy({ id });
      yield CabinetModule.update({ gun: id }, { gun: '' });
      if (gun && gun.associatedGun)
        yield Gun.update({ id: gun.associatedGun }, { associatedGun: '' });
    }).then((data) => {
      return res.ok();
    }).catch((err) => {
      sails.log.error(`#### GunController: delete 内部错误`);
      sails.log.error(err);
      return res.serverError({ msg: '内部错误' });
    })
  },

  list: (req, res) => {
    const limit = Number(req.query.limit) || 20;
    const skip = Number(req.query.skip) || 0;

    const cabinetId = req.query.cabinetId;

    let queryCabinet = cabinetId ? `and cm.cabinet = '${cabinetId}'` : ``;

    let query = `select \
      g.id,g.name, g.type, g.code,g.cert,g.storageStatus, \
      cm.gunLock, cm.id as cabinetmoduleId, cm.cabinet, \
      c.name as cabinetName, c.host as cabinetIp, \
      t.name as typeName, \
      cma.id as asbId, cma.name as asbName, \
      ascb.name as asbCabinetName, ascb.id as asbCabinetId \
      from gun g \
      left join cabinetmodule cm \
      on cm.gun = g.id \
      left join cabinet c\
      on c.id = cm.cabinet\
      left join guntype t\
      on t.id = g.type\
      left join cabinetmodule cma \
      on cma.id = g.associatedBulletModule \
      left join cabinet ascb \
      on ascb.id=cma.cabinet \
      where g.isDeleted = false \
      ${queryCabinet} \
      order by g.name*1 asc\
      limit ${skip}, ${limit};`

    let countQuery = `select \
      count(*) as count\
      from gun g \
      left join cabinetmodule cm \
      on cm.gun = g.id \
      where g.isDeleted = false \
      ${queryCabinet} \;`

    Gun.query(query, (err, rs) => {
      if (err) return res.serverError(err);
      if (rs && rs.length > 0) {
        Gun.query(countQuery, (err, count) => {
          if (err) return res.serverError(err);
          let result = {
            data: rs,
            total: count[0].count,
            filteredTotal: count[0].count,
            skip: skip,
            limit: limit
          };
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

  //获取可以关联的枪支
  associateList: (req, res) => {
    const limit = Number(req.query.limit) || 10;
    const skip = Number(req.query.skip) || 0;
    const self = req.query.gunId;
    co(function* () {
      const gun = yield Gun.findOne({ id: self });
      if (!gun) return yield Promise.reject({ msg: '没有找到指定枪支' });
      //获取枪支所在柜机ID
      const cabinetId = gun.SyncFrom || gun.UpdatedFrom;
      const cabinetAddon = cabinetId ? `and (SyncFrom = '${cabinetId}' or UpdatedFrom = '${cabinetId}')` : '';
      const sql = `select * from gun where (associatedGun is null or associatedGun = '') and id !='${self}' ${cabinetAddon} order by name*1 asc limit ${skip}, ${limit}`;
      const count = `select count(*) as count from gun where (associatedGun is null or associatedGun = '') and id !='${self}' ${cabinetAddon}`;
      const total = yield GunService.gunQueryPromise(count);
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
      sails.log.error(`#### GunController: associateList 内部错误`);
      sails.log.error(err);
      return res.serverError({ msg: '内部错误' });
    })
  },

  //检测AB枪
  _checkAssociateGun: (req, res) => {
    const gunId = req.query.gunId;
    const cabinetId = req.query.cabinetId;
    co(function* () {
      if (!gunId || !cabinetId) return yield Promise.reject({ msg: '没有指定枪支和柜机' });
      const ABGunEnabled = yield GunService.ABGunEnabled();
      if (!ABGunEnabled) return yield Promise.resolve({ pass: true });
      const lastFetchGunId = yield sails.services.redis.hgetAsync('ABGun', cabinetId);
      if (!lastFetchGunId || lastFetchGunId == 'null') return yield Promise.resolve({ pass: true });
      const lastFetchGun = yield Gun.findOne({ id: lastFetchGunId });
      if (!lastFetchGun) return yield Promise.resolve({ pass: true });
      if (lastFetchGun.associatedGun === gunId) {
        return yield Promise.resolve({ pass: true });
      } else {
        const shouldFetchGun = yield Gun.findOne({ id: lastFetchGun.associatedGun });
        if (!shouldFetchGun) return yield Promise.resolve({ pass: true });
        return yield Promise.resolve({ pass: false, gun: shouldFetchGun });
      }
    }).then((data) => {
      return res.ok(data);
    }).catch((err) => {
      if (err.msg) return res.badRequest(err);
      sails.log.error(`#### GunController: checkAssociateGun 内部错误`);
      sails.log.error(err);
      return res.serverError({ msg: '内部错误' });
    })
  },

  initABGun: (req, res) => {
    sails.services.abgun.init()
    return res.ok()
  },

  checkAssociateGun: (req, res) => {
    const gunId = req.query.gunId
    sails.services.abgun.check(gunId).then(r => {
      if (!r.pass) {
        if (r.currentGunId) {
          Gun.findOne({ id: r.currentGunId }).exec((err, rs) => {
            if (err) {
              console.error(`GunController checkAssociateGun : getCurrneGun failed`)
              console.error(err)
              return res.serverError(err)
            } else if (!rs) {
              //没有获取到枪信息, 返回错误提示
              return res.ok({ pass: false, msg: '没有找到上一AB枪信息, 请检查枪支列表' })
            } else {
              return res.ok({ pass: false, gun: rs })
            }
          })
        } else {
          return res.ok(r)
        }
      } else {
        return res.ok(r)
      }
    }).catch(e => {
      return res.serverError(JSON.stringify(e))
    })
  }
};

