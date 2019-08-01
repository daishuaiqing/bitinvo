/**
 * Token base
 *
 * If HTTP Basic Auth credentials are present in the headers, then authenticate the
 * user for a single request.
 */
'use strict';
module.exports = function (req, res, next) {
  sails.log.debug(' #### Token authenticating Start #### ');
  var auth = req.headers.authorization;
  if (!auth || auth.search('Token ') !== 0) {
    sails.log.debug('tokenAuth Check : fail for no token found');

    return next();
  }
  var token = new Buffer(auth.split(' ')[1], 'base64').toString();

  sails.log.debug(' ####tokenAuth: Token authenticating : token = %s #### ' , token);

  sails.log.debug('####tokenAuth: Authenticating: using basic auth: %s', req.url);

  let creteria = {token : token};

  sails.log.debug('####tokenAuth:Try getting user from redis first');
  Redis.getAsync(token) //先从redis中找token，如果没有话，再去数据库表找
  .then(
    (userId)=>{
      sails.log.debug('####tokenAuth: get user info from redis');
      if(userId){
        sails.log.debug('####tokenAuth: we have user id as %s', userId);
        creteria = {id: userId};
      }else{
        sails.log.debug('####tokenAuth: we  dont have user id, user token instead');
        creteria = {token : token};
      }

      sails.log.debug('####tokenAuth: search database');

      User.findOne(creteria)
      .exec(function(err, user){
        sails.log.debug('####tokenAuth: call back of db query');

        if (err) {
          sails.log.debug(' #### Token authenticating fails #### ');
          sails.log.debug(err);

          req.session.authenticated = false;
          return res.status(403).json({ error: sails.__('Could not authenticate user') });
        }
        if(req.headers.realuser){
          User.findOne({id: req.headers.realuser})
          .exec((err, realUser) => {
            if(err){
              req.session.user = user;
              req.user = user;
              req.session.authenticated = true;
              next();
            }else{
              if(realUser){
                req.session.user = realUser;
                req.user = realUser;
                req.session.authenticated = true;
                next();
              }else{
                req.session.user = user;
                req.user = user;
                req.session.authenticated = true;
                next();
              }

            }
          })
        }else{
          if(req.query && req.query.nosession == 'true'){
            req.session.user = null;
            req.session.authenticated = false;
          }else{
            req.session.user = user;
            req.session.authenticated = true;
          }
          req.user = user;
          req.authenticated = true;

          next();
        }
      });
    }
  );
};
