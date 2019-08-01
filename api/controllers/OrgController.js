'use strict'
/**
 * OrgController
 *
 * @description :: Server-side logic for managing Orgs
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const co = require('co');
const pubsub = sails.config.innerPubsub;
module.exports = {
  validation: function (req, res, next) {
    sails.services.validation.orgValidation()
      .then((data) => {
        sails.log.info(data);
        if (!data) {
          res.ok('允许加入空上级部门的机构');
        } else {
          res.badRequest('已有根机构，禁止加入空上级部门的机构');
        }
      })
      .catch((err) => {
        res.status(500).end();
      })
  },
  beforeSubmitCheckOrgName: function (req, res, next) {
    var orgName = req.body.name;
    Org.findOne({ isLocal: true })
      .then((local) => {
        if (local) return Promise.reject('已经有本地机构存在，不允许重复添加');
        return Org.find({ name: orgName });
      })
      .then((data) => {
        if (data.length === 0) {
          next();
        } else {
          return Promise.reject('请不要添加重复的部门')
        }
      })
      .catch((err) => {
        return res.status(401).json({ error: err });
      })
  },
  beforeUpdateCheckLocal: (req, res, next) => {
    let id = req.body.id;
    Org.findOne({ isLocal: true })
      .then((local) => {
        if (!local) return res.serverError({ code: 'NOLOCALORG', error: '没有找到本地机构' });
        if (local.id !== id) return res.status(401).json({ error: '已经有本地机构存在，不允许重复添加' });
        else next();
      })
  },
  /**
   * Recieve Handshake
   * @param orgInfo
   */
  handShake: (req, res) => {
    sails.log.info('New Request For HandShake');
    sails.services.org.handshakeRecieve(req, res);
  },
  /**
   * Manage HandShake
   * @param id
   * @param result
   */
  manageHandShake: (req, res) => {
    let result = req.params.result;
    let id = req.params.id;
    sails.services.org.manageHandShake(id, result);
    res.ok();
  },
  /**
   * Token Manage
   * @method delete or put
   */
  manageToken: (req, res) => {
    let method = req.method;
    if (method == 'DELETE') {
      sails.services.org.deleteToken(req, res);
    } else if (method == 'PUT') {
      sails.services.org.saveToken(req, res);
    }
  },

  orgList: (req, res) => {
    let limit = Number(req.query.limit) || 6;
    let skip = Number(req.query.skip) || 0;
    co(function* () {
      let orgs = yield Mqtt.find({
        limit: limit,
        skip: skip,
        sort: 'orgName ASC'
      });
      if (orgs && orgs.length > 0) {
        let totalOrgs = yield Mqtt.find();
        let totalGunCounts = 0;
        let totalBulletCounts = 0;
        for (let i in totalOrgs) {
          totalGunCounts += Number(totalOrgs[i].gunCount);
          totalBulletCounts += Number(totalOrgs[i].bulletCount);
        }
        for (let i in orgs) {
          const lockCabinet = yield sails.services.redis.hgetAsync('lockCabinet', orgs[i].id);
          orgs[i].lockCabinet = lockCabinet === 'true' ? true : false;
        }
        return Promise.resolve({
          data: orgs,
          totalGunCounts,
          totalBulletCounts,
          limit,
          skip,
          total: totalOrgs.length
        })
      } else if (orgs.length === 0) {
        return Promise.resolve({
          data: [],
          totalBulletCounts: 0,
          totalGunCounts: 0,
          limit,
          skip,
          total: 0
        })
      }
    }).then((data) => {
      return res.ok(data);
    }).catch((err) => {
      return res.serverError(err);
    })

  },

  webcamUrl: (req, res) => {
    if (req.method === 'PUT') {
      Org.update({ id: req.params.id }, { webcamUrl: req.body.webcamUrl }).exec((err, rs) => {
        if (err) return res.serverError(err);
        return res.ok()
      })
    } else if (req.method === 'GET') {
      Org.findOne({ id: req.query.id }).exec((err, rs) => {
        if (err) return res.serverError(err)
        return res.ok({ webcamUrl: rs ? rs.webcamUrl : '' });
      })
    } else {
      return res.serverError({ code: 'UNKNOWNMETHOD', error: '未识别的方法' })
    }
  },

  deleteOrg: (req, res) => {
    let id = req.params.id;
    Mqtt.destroy({ id: id }).exec((err, rs) => {
      if (err) return res.serverError(err);
      Org.destroy({ id: id }).exec((err, rs) => {
        if (err) return res.serverError(err);
        return res.ok();
      })
    })
  },

  lockCabinet: (req, res) => {
    const id = req.body.id;
    const status = req.body.status;
    if (!id) return res.badRequest({ msg: '需要机构ID' });
    pubsub.emit('lockOrg', id, status);
    sails.services.redis.hset('lockCabinet', id, status, (err, rs) => {
      if (err) {
        sails.log.error(err);
        return res.serverError({ msg: '设置锁柜状态失败' })
      }
      return res.ok();
    });
  }
};
