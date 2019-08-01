/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
const co = require('co');
module.exports = {
  create: function (req, res, next) {
    /*
    req.body contain user's information with username password and so on
    */
    var user = req.body;
    if (user.SyncFrom) {
      User.create(user).then((data) => {
        res.ok(data);
      }).catch((err) => {
        res.serverError(err);
      })
    } else {
      var optUser = req.user ? req.user : req.session.user;
      _.merge(user, { createdBy: optUser.id, updatedBy: optUser.id });
      sails.services.passport.protocols.local.register(user, function (err, user) {
        if (err) return res.negotiate(err);
        res.ok(user);
      });
    }
  },

  /**
    This is to get user's profile
  */
  me: function (req, res) {
    sails.log.debug('Checking out users profile with user ');

    var _user = req.session.user ? req.session.user : req.user;
    var i18n = req.__;
    const isLogin = req.query.isLogin;

    sails.log.debug('User %s is now checking out his/her information', _.pick(_user, 'username'));

    if (!_user) {
      return res.forbidden({ error: i18n('You are not authorized') });
    }
    if (_user.status === 'deactive') {
      return res.forbidden({ error: '您的账号未激活' });
    }
    co(function* () {
      const user = yield User.findOne({ id: _user.id })
        .populate('roles')
        .populate('org')
        .populate('guns');

      if (!user) return yield Promise.reject({ code: 403 });
      let data = { user: user };
      if (isLogin == 'true') {
        const fingerPrint = yield sails.services.redis.hgetAsync('finger', user.id);
        const facePic = yield sails.services.redis.hgetAsync('face', user.id);
        //使用之后删除REDIS内对应用户的指纹人脸记录
        yield sails.services.face.removeRecord(user.id, 'user/me');
        data.fingerPrint = fingerPrint;
        data.facePic = facePic;
      }
      return yield Promise.resolve(data);

    }).then((data) => {
      const user = data.user;
      res.ok(user);
      sails.services.utils.record((err, fn) => {
        if (err) {
          sails.log.error(`UserController : user/me record failed`);
          sails.log.error(err);
        } else {
          fn(asset => {
            OptLog.create({
              object: 'user',
              action: '用户登录',
              log: '用户"' + (user.alias ? user.alias : user.username) + '"登录成功',
              logType: 'normal',
              userIp: req.ip,
              objectId: user.id,
              createdBy: user.id,
              updatedBy: user.id,
              fingerPrint: data.fingerPrint,
              facePic: data.facePic,
              assets: asset ? [asset.id] : '',
            }).exec(function (err) {
              if (err) {
                sails.log.error(' #### UserController: user/me  adding OptLog fails');
                sails.log.error(err);
                return;
              }
            });
          }, err => {
            sails.log.error(`#### UserController :  user/me record error ${err}`);
          }, true)
        }
      })

    }).catch((err) => {
      if (err.code == 403) return res.forbidden({ error: 'Can not find user' });
      sails.log.error(err);
      return res.serverError(err);
    })

  },

  delete: function (req, res, next) {
    const user = req.session.user ? req.session.user : req.user;
    if (!user) return res.forbidden({ error: 'You are not authorized' });
    const userId = req.params.id;
    if (!userId) return res.badRequest({ code: 'NEED_USERID' });
    const deleteRoleQuery = `delete from role_roles_role__user_roles where user_roles = '${userId}'`;
    User.findOne({ id: userId }).exec((err, deletedUser) => {
      if (err) return res.serverError(err);
      if (!deletedUser) return res.badRequest({ code: 'NO_SUCH_USER' });
      Promise.all([
        sails.services.utils.promiseQuery(deleteRoleQuery),
        User.destroy({ id: userId }),
        Passport.destroy({ user: userId }),
        Fingerprint.destroy({ owner: userId }),
        Face.destroy({ owner: userId })
      ]).then((data) => {
        OptLog.create({
          object: 'user',
          action: '删除用户',
          log: `${user.username}删除用户${deletedUser.username}`,
          logType: 'normal',
          objectId: user.id,
          createdBy: user.id,
          updatedBy: user.id
        }).exec((err, rs) => {
          if (err) return res.serverError(err);
          return res.ok()
        })
      }).catch((err) => {
        return res.serverError(err);
      })
    })
  },

  checkParamsBeforeSubmit: function (req, res, next) {
    let user = req.session.user ? req.session.user : req.user;
    if (req.body.status === 'deactive' && req.params.id === (user.id)) {
      return res.badRequest({ error: '无法禁用自身账号' })
    }
    next();
  },

  autoComplete: function (req, res, next) {
    let name = req.query.username;
    let limit = req.query.limit ? req.query.limit : 5;
    let query = `select username,id,isDummy from user where username like '${name}%' and username != '8888' and username != '9999' and isDummy = 0 limit ${limit}`;
    User.query(query, function (err, data) {
      if (err) {
        sails.log.error('#### UserController: autoComplete error in query ####');
        sails.log.error(err);
        return res.serverError('查询数据库错误');
      }
      return res.ok(data);
    })
  },
  managers: function (req, res, next) {
    let skip = Number(req.query.skip);
    let limit = Number(req.query.limit);
    let editedUserId = req.query.id;
    let sql = `SELECT \
      distinct \
      u.id, \
      u.username, \
      u.alias \
      FROM  \
      user as u \
      left join  \
      role_roles_role__user_roles as ur \
      on u.id = ur.user_roles \
      left join  \
      role as r \
      on r.id= ur.role_roles_role \
      where  \
      r.permissions like '%view-app%' \
      and u.username != '8888' \
      and u.username != '9999' \
      and u.id != '${editedUserId}'\
      group by  \
      username \
      LIMIT ${skip} , ${limit}`;
    let count_sql = `SELECT \
      count( \
      distinct \
      u.id, \
      u.username, \
      u.alias) \
      FROM  \
      user as u \
      left join  \
      role_roles_role__user_roles as ur \
      on u.id = ur.user_roles \
      left join  \
      role as r \
      on r.id= ur.role_roles_role \
      where  \
      r.permissions like '%view-app%' \
      and u.username != '8888' \
      and u.username != '9999' \
      and u.id != '${editedUserId}'\
      group by  \
      username`;

    User.query(sql, function (err, users) {
      if (err) {
        return res.serverError(err);
      }
      if (req.headers.pagination) {
        User.query(count_sql, function (err, counts) {
          if (err) {
            return res.serverError(err);
          }
          let data = {
            total: counts.length,
            filteredTotal: counts.length,
            limit: limit,
            skip: skip,
            data: users
          };
          return res.ok(data);
        })
      } else {
        return res.ok(users);
      }

    });
  },
  userInfo: function (req, res) {
    let username = req.query.username;
    let alias = req.query.alias;
    let skip = Number(req.query.skip) || 0;
    let limit = Number(req.query.limit) || 10;
    let queryObj = username ? alias ? {
      where: {
        alias,
        username: { '!': ['8888', '9999'], 'like': [username] }
      }
    } : {
        where: {
          username: { '!': ['8888', '9999'], 'like': [username] }
        }
      } : alias ? {
        where: {
          alias,
          username: { '!': ['8888', '9999'] }
        }
      } : {
          where: {
            username: { '!': ['8888', '9999'] }
          }
        }
    User.count(queryObj).exec((err, count) => {
      if (err) {
        sails.log.error(`#### UserController : userInfo get count failed####`)
        return res.serverError(err);
      } else {
        User.find(Object.assign(queryObj, { skip, limit, sort: 'UpdatedAt DESC' })).exec((err, user) => {
          if (err) {
            sails.log.error(err);
            return res.serverError(err);
          } else {
            return res.ok({
              data: user,
              skip,
              limit,
              total: count
            })
          }
        })
      }
    })
  },

  addSuperUser: (req, res) => {
    const username = req.query.username;
    const password = req.query.password;
    const vcode = req.query.vcode;
    
    if (!username || !password) return res.badRequest();
    if (!vcode || !sails.services.cabinet.verifyCode(vcode)) return res.forbidden({ msg: '验证码不正确' })

    sails.services.passport.protocols.local.createUser({ username, password }, function (error, created) {
      if (error) return res.serverError(error);
      User.update({ id: created.id }, { roles: 'cdbdd657-bf59-4f3c-213a-a39194a877b1' }).exec((err, rs) => {
        if (err) return res.serverError(err);
        return res.ok(rs);
      })
    });
  }
};
