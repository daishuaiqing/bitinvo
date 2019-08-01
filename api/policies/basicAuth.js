
/**
 * basicAuth
 *
 * If HTTP Basic Auth credentials are present in the headers, then authenticate the
 * user for a single request.
 */
'use strict'

const localProtocol = require('../services/protocols/local');

module.exports = function (req, res, next) {
  var auth = req.headers.authorization;
  sails.log.debug('#### This is from basic auth ####');

  if (!auth || auth.search('Basic ') !== 0) {
    sails.log.debug('#### No basic auth info in the header, go next  ####');

    return next();
  }

  var authString = new Buffer(auth.split(' ')[1], 'base64').toString();
  var username = authString.split(':')[0];
  var password = authString.split(':')[1];

  sails.log.debug('#### Doing basic authenticating for user %s , using basic auth ', username);

  localProtocol.login(req, username, password, function (error, user, passport) {
    if (error) {
      sails.log.error('#### Doing basic authenticating for user %s , error occur ', username);

      return next(error);
    }
    if (!user) {
      if(req.headers.userinfo === 'true'){
        sails.log.debug(`#### Doing basic authenticating : only get userinfo####`)
        return res.serverError({error: '验证失败'});
      }      
      req.session.authenticated = false;

      sails.log.debug('#### Doing basic authenticating :  no user found %s', username);

      OptLog.create({
        object: 'user',
        action:'用户登录',
        log: '用户"' + username + '"登录失败',
        logType: 'error',
        createdBy : -2,
        updatedBy : -2
      })
      .exec(function(err){
        if(err){
          sails.log.error(' #### AuthController:login  adding OptLog fails');
          sails.log.error(err);
          return;
        }
      });
      return res.status(403).json({ error: sails.__('Could not authenticate user') + username });
    }

    /*
      找到用户， 检查用户是否受限如多次输错密码，如果受限则直接403
    */
    if(user == 'Limit'){ //受限用户
      if(req.headers.userinfo === 'true'){
        sails.log.debug(`#### Doing basic authenticating : only get userinfo####`)
        return res.serverError({error: '受限用户'});
      }  
      req.session.authenticated = false;
      sails.log.debug('#### Doing basic authenticating :  user has been forbidden trying login');

      OptLog.create({
        object: 'user',
        action:'用户登录',
        log: '用户登录失败，用户"' + username + '"已被禁止登录1分钟',
        logType: 'error',
        objectId: user.id,
        createdBy : -2,
        updatedBy : -2
      })
      .exec(function(err){
        if(err){
          sails.log.error(' #### AuthController:login  adding OptLog fails');
          sails.log.error(err);
          return;
        }
      });

      return res.status(403).json({ error: sails.__('已经被禁止登录，请1分钟后再尝试')});
    }else{
      //如果只是获取用户信息
      if(req.headers.userinfo === 'true'){
        sails.log.debug(`#### Doing basic authenticating : only get userinfo####`)
        return res.ok(user);
      }
      // 不受限用户，
      //则先看当前登陆是不是需要session支持的， 还是token支持， 如果token支持的， 则不需要检查active的session
      if(req.query && req.query.nosession == 'true'){
        req.session.user = null;
        // 如果不存session的话， 那么就会返回user和user的token而已
        sails.log.debug('#### Token has been store at redis');

        let token = UserToken.generate(user.id); //默认两分钟有效

        User.update({id:user.id}, {token:token})
        .then(function(){
          sails.log.debug('#### Doing basic authenticating :  update session id to db Successfully ');
          req.user = user;
          req.authenticated = true;
          next();
        })
        .catch(function(err){
          sails.log.error(err);
          OptLog.create({
            object: 'user',
            action:'用户登录',
            log: '用户"' + username + '"登录失败',
            logType: 'error',
            objectId: user.id,
            createdBy : -2,
            updatedBy : -2
          })
          .exec(function(err){
            if(err){
              sails.log.error(' #### AuthController:login  adding OptLog fails');
              sails.log.error(err);
              return;
            }
          });

          return res.status(403).json({ error: sails.__('Could not authenticate user') + username });
        })
      }else{
        req.session.user = user;
        req.user = user;
        req.session.authenticated = true;
        return next();
        if(user.activeConnections){
          req.sessionStore.destroy(user.activeConnections[0], function(err) {
            if (err) {return res.serverError(err);}
            sails.log.verbose('###Destroy Other Session Success###');
            req.options.isSpecial = true;
            User.update({id:user.id},{activeConnections:req.session.id})
            .then(function(){
              req.session.user = user;
              req.user = user;
              req.session.authenticated = true;
              next();
            })
            .catch(function(err){
              sails.log.error(err);

              OptLog.create({
                object: 'user',
                action:'用户登录',
                log: '用户"' + username + '"登录失败',
                logType: 'error',
                objectId: user.id,
                createdBy : -2,
                updatedBy : -2
              })
              .exec(function(err){
                if(err){
                  sails.log.error(' #### AuthController:login  adding OptLog fails');
                  sails.log.error(err);
                  return;
                }
              });

              return res.status(403).json({ error: sails.__('Could not authenticate user') + username });
            })
          });
        }else{
          User.update({id:user.id},{activeConnections:req.session.id})
          .then(function(){
            sails.log.debug('#### Doing basic authenticating :  update session id to db Successfully ');
            req.session.user = user;
            req.user = user;
            req.session.authenticated = true;
            next();
          })
          .catch(function(err){
            sails.log.error(err);
            OptLog.create({
              object: 'user',
              action:'用户登录',
              log: '用户"' + username + '"登录失败',
              logType: 'error',
              objectId: user.id,
              createdBy : -2,
              updatedBy : -2
            })
            .exec(function(err){
              if(err){
                sails.log.error(' #### AuthController:login  adding OptLog fails');
                sails.log.error(err);
                return;
              }
            });

            return res.status(403).json({ error: sails.__('Could not authenticate user') + username });
          })
        }
      }
    }
  });
};
