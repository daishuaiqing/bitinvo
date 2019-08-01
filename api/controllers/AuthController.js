/**
 * Authentication Controller
 */
'use strict'
module.exports = {
  /**
   * Log out a user and return them to the homepage
   *
   * Passport exposes a logout() function on req (also aliased as logOut()) that
   * can be called from any route handler which needs to terminate a login
   * session. Invoking logout() will remove the req.user property and clear the
   * login session (if any).
   *
   * For more information on logging out users in Passport.js, check out:
   * http://passportjs.org/guide/logout/
   *
   * @param {Object} req
   * @param {Object} res
   */
  logout: function (req, res) {
    // log out passport
    req.logout();
    var user = req.user ? req.user : req.session.user;
    if (!user) {
      sails.log.warn(' #### AuthController:logout No user in current session');
      return res.ok({ info: 'No user logout' });
    }

    sails.log.debug('User  %s is loging out', user ? _.pick(user, 'username') : 'unknown');
    delete req.user;
    delete req.session.user;
    req.session.authenticated = false;

    OptLog.create({
      object: 'user',
      action: '用户登出系统',
      log: '登出成功',
      logType: 'normal',
      objectId: user.id,
      createdBy: user.id,
      updatedBy: user.id
    })
      .exec(function (err) {
        if (err) {
          sails.log.error(' #### AuthController:logout  adding OptLog fails');
          sails.log.error(err);
        }
      });
    if (user) {
      if (user.id) {
        // user's id as room number to subscribe messages, when user logged out, this should be clean
        var roomName = user.id;
        sails.sockets.leaveAll(roomName, function (err) {
          if (err) {
            return res.serverError(err);
          }
          return res.ok('You are now logout');
        });
      }
    }
  },

  signup: function (req, res) {
    sails.log.debug('User is signing up');
    let operator = req.session.user;
    if (!operator) return res.serverError('需要超级管理员权限')
    User.findOne({ id: operator.id }).populate('roles').exec((err, rs) => {
      if (err) return res.serverError('需要超级管理员权限');
      if (rs.roles[0].name !== '超级管理员') {
        return res.serverError('需要超级管理员权限');
      } else {
        var user = req.body;
        if (!user) {
          res.badRequest({ error: 'User signup infomation can not be null' });
          return;
        }
        if (!user.password) {
          res.badRequest({ error: 'User password can not be null' });
          return;
        }
        if (!user.username) {
          res.badRequest({ error: 'User username can not be null' });
          return;
        }
        User.findOne({ username: user.username }).then((data) => {
          if (data) {
            return res.status(401).json({ error: sails.__('用户名重复') });
          } else {
            _.merge(user, { createdBy: sails.config.systemOptId, updatedBy: sails.config.systemOptId, userIp: req.ip });
            sails.services.passport.protocols.local.register(user, function (err, user) {
              if (err)
                return res.negotiate(err);
              OptLog.create({
                object: 'user',
                action: '用户注册',
                log: `${operator.username}创建用户${user.username}`,
                logType: 'normal',
                objectId: operator.id,
                userIp: req.ip,
                createdBy: operator.id,
                updatedBy: operator.id
              })
                .exec(function (err) {
                  if (err) {
                    sails.log.error(' #### AuthController:signup  adding OptLog fails');
                    sails.log.error(err);
                    return;
                  }
                });
              res.ok(user);
            });
          }
        }).catch((err) => {
          sails.log.error('#### AuthController : signup validateUserName failed');
          sails.log.error(err);
        })
      }
    })
  },

  login: function (req, res) {
    sails.log.debug('logging In');

    var user = req.session.user ? req.session.user : req.user;

    sails.log.debug('User %s is now checking out his/her information', _.pick(user, 'username'));

    if (!user) {
      OptLog.create({
        object: 'user',
        action: '用户登录',
        log: '用户登录失败，找不到这个用户',
        logType: 'error',
        userIp: req.ip,
        createdBy: -2,
        updatedBy: -2
      })
        .exec(function (err) {
          sails.log.error(' #### AuthController:login  adding OptLog fails');
          sails.log.error(err);
        });
      return res.forbidden({ error: 'You are not authorized' });
    }
    if (user.status === 'deactive') {
      OptLog.create({
        object: 'user',
        action: '用户登录',
        log: '用户登录失败，用户"' + user.username + '"没有激活',
        logType: 'error',
        objectId: user.id,
        createdBy: user.id,
        updatedBy: user.id
      })
        .exec(function (err) {
          if (err) {
            sails.log.error(' #### AuthController:login  adding OptLog fails');
            sails.log.error(err);
            return;
          }
        });
      return res.forbidden({ error: '您的账号还没有激活' });
    }
    if (user.disablePasswdLogin === 'yes') {
      OptLog.create({
        object: 'user',
        action: '用户登录',
        log: '用户登录失败，用户"' + user.username + '"已禁止密码登录',
        logType: 'error',
        objectId: user.id,
        createdBy: user.id,
        updatedBy: user.id
      })
        .exec(function (err) {
          if (err) {
            sails.log.error(' #### AuthController:login  adding OptLog fails');
            sails.log.error(err);
            return;
          }
        });
      return res.forbidden({ error: '您的账号已被禁止使用密码登录' });
    }

    User.findOne({ id: user.id })
      .populate('roles')
      .populate('org')
      .exec(function (err, user) {
        if (err) {
          sails.log.error(' #### AuthController:login Login fails ####');
          sails.log.error(err);
          return;
        }

        //使用之后删除REDIS内对应用户的指纹人脸记录
        // sails.services.redis.hdel('finger', user.id, (err) => {
        //   if (err) sails.log.error(err);
        // });
        // sails.services.redis.hdelAsync('face', user.id, (err) => {
        //   if (err) sails.log.error(err);
        // });
        sails.services.face.removeRecord(user.id, 'auth').then(() => {
        })

        sails.services.utils.record((err, fn) => {
          if (err) {
            sails.log.error(`AuthController : apply utils record failed`);
            sails.log.error(err);
          } else {
            fn(asset => {
              OptLog.create({
                object: 'user',
                action: '用户登录',
                log: '用户"' + user.username + '"登录成功',
                logType: 'normal',
                userIp: req.ip,
                objectId: user.id,
                createdBy: user.id,
                updatedBy: user.id,
                assets: asset ? [asset.id] : '',
              }).exec(function (err) {
                if (err) {
                  sails.log.error(' #### AuthController:login  adding OptLog fails');
                  sails.log.error(err);
                  return;
                }
              });
            }, err => {
              sails.log.error(`Auth : record error ${err}`);
            }, true)
          }
        })

        return res.ok(user);
      });
  },

  reset: function (req, res) {
    var user = req.session.user ? req.session.user : req.user;
    var password = req.body.password;
    var newpassword = req.body.newpassword;
    if (!user || !password || !newpassword) return res.forbidden('请正确输入原密码以及新密码');
    if (password === newpassword) {
      return res.badRequest('new password can not be the same as old one');
    };
    Passport.findOne({
      protocol: 'local',
      user: user.id
    }, function (err, passport) {
      if (err) {
        sails.log.error(' #### AuthenticationController:Reset fail due to error ####');
        return res.serverError(err);
      }

      if (!passport) {
        sails.log.error(' #### AuthenticationController:Reset fail, no passport found ####');
        return res.serverError('no passport found');
      }
      else {
        passport.validatePassword(password, function (err, valid) {
          if (err) {
            sails.log.error(' #### AuthenticationController:Reset fail due to password compare error ####');
            return res.serverError('Can not match account and password');
          }
          if (valid) {// true for valid
            passport.password = newpassword;
            passport.updatedBy = user.id;
            passport.updatedAt = new Date();
            passport.save(function (err) {
              if (err) {
                sails.log.error(' #### AuthenticationController:Reset fail to update password ####');
                return res.serverError('Can not update account and password');
              }
              //force logout
              req.logout();
              OptLog.create({
                object: 'passport',
                action: '用户修改密码',
                log: '用户"' + user.username + '"修改密码成功',
                logType: 'normal',
                userIp: req.ip,
                objectId: user.id,
                createdBy: user.id,
                updatedBy: user.id
              })
                .exec(function (err) {
                  if (err) {
                    sails.log.error(' #### AuthController:reset adding OptLog fails');
                    sails.log.error(err);
                    return;
                  }
                });
              return res.ok({ info: 'success' });
            });
          } else {
            return res.badRequest('原密码错误！');
          }
        })
      }
    });
  },
  //还原密码为初始密码
  restore: (req, res) => {
    let username = req.body.username;
    let newpassword = Math.random().toString().substr(2, 6);
    User.findOne({
      username: username
    }, function (err, user) {
      if (err) {
        sails.log.error('#### AuthController : restore find user error ####')
        return res.serverError(err);
      }
      if (!user) {
        sails.log.error('#### AuthController : restore no user ####');
        return res.badRequest('没有找到该用户')
      }
      Passport.findOne({
        protocol: 'local',
        user: user.id
      }, function (err, passport) {
        if (err) {
          sails.log.error(' #### AuthController:restore fail due to error ####');
          return res.serverError(err);
        }
        else if (!passport) {
          sails.log.error('#### AuthController:restore no passport found ####');
          return res.serverError('没有找到对应的记录')
        } else {
          passport.password = newpassword;
          passport.updatedBy = user.id;
          passport.updatedAt = new Date();
          passport.save(function (err) {
            if (err) {
              sails.log.error(' #### AuthController:restore fail to restore password ####');
              return res.serverError('Can not update account and password');
            }
            //force logout
            req.logout();
            OptLog.create({
              object: 'passport',
              action: '管理员重置密码',
              log: '用户"' + user.username + '"重置密码成功',
              logType: 'normal',
              userIp: req.ip,
              objectId: user.id,
              createdBy: user.id,
              updatedBy: user.id
            })
              .exec(function (err) {
                if (err) {
                  sails.log.error(' #### AuthController:restore adding OptLog fails');
                  sails.log.error(err);
                  return;
                }
              });
            return res.ok({ newpassword: newpassword });
          });
        }
      });
    })
  },

  /**
   * Disconnect a passport from a user
   *
   * @param {Object} req
   * @param {Object} res
   */
  disconnect: function (req, res) {
    sails.services.passport.disconnect(req, res);
  }
};
