/**
 * MessageController
 *
 * @description :: Server-side logic for managing Messages
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
module.exports = {
  subscribe: function(req, res){
    sails.log.debug('User Start to subscribe to its own room');
    var user = req.user ? req.user : req.session.user;
    var i18n = req.__;

    if(!user){
      return res.forbidden({error: i18n('You are not authorized')});
    }
    if(user.status === 'deactive'){
      return res.forbidden({error: '您的账号未激活'});
    }

    if (req.isSocket && user){
      if(user.id){
        // use user's uid as room number, so it can subscribe the message send from others. 
        var roomName = user.id;
        sails.sockets.join(req, roomName, function(err) {
          sails.log.debug('Join log');
          if (err) {
            return res.serverError(err);
          }else{
            return res.ok({info : 'You have join room'});
          }
        });
      }else{
        res.ok(user);
      }
    }else{
       res.ok(user);
    }
  },
  send : function(req, res){
    sails.log.debug('Sending peer message');
    var content = req.query.text ? req.query.text : '';
    //need change frontside
    if(req.query.uid){
      var uid = req.query.uid;
      sails.sockets.broadcast(uid, {msg: content});
      res.ok({info: 'message sent to user ' + uid});
    }else{
      res.badRequest({error: 'Uid is required.'});
    }
  },
	noti : function(req, res){
    sails.log.debug('Sending system event message');
    var content = req.query.text ? req.query.text : '';
    sails.sockets.broadcast('system', {msg: content});
    res.ok({info: 'message sent.'});
  },
  blast : function(req, res){
    sails.log.debug('Sending blast');
    sails.services.message.local({msg: 'blast'});
    res.ok({info: 'blasted.'});
  },
  blastevent : function(req, res){
    sails.log.debug('Sending blast');
    var eventName = req.query.eventName ? req.query.eventName : 'message';
    var content = req.query.text ? req.query.text : '';
    sails.log.debug('Event %s is out', eventName);
    sails.services.message.local(eventName, {msg: content});
    res.ok({info: 'event blasted'});
  },
  subscribeToLocalRoom: function(req, res) {
    if (!req.isSocket) {
      return res.badRequest('no socket');
    }
    if(req.socket.handshake.headers.host.indexOf('localhost') !== -1){
      var socketId = sails.sockets.getId(req);
      sails.services.redis.set('localSocketId', socketId, function(err, rs){
        if(err){
          sails.log.error('#### MessageController: subscribeToLocalRoom set localSocketId failed #####');
          sails.log.error(err);
          return res.serverError();
        }
          sails.log.debug('#### MessageController: subscribeToLocalRoom set localSocketId success ####');
          return res.ok('join local room success')
      })
    }else{
      return res.badRequest('not local');
    }
  },
  subscribeAsLocal: function(req, res){
    if (!req.isSocket) {
      return res.badRequest('no socket');
    }
    var socketId = sails.sockets.getId(req);
    sails.services.redis.set('localSocketId', socketId, function(err, rs){
      if(err){
        sails.log.error('#### MessageController: subscribeAsLocal set localSocketId failed #####');
        sails.log.error(err);
        return res.serverError();
      }
      sails.log.debug('#### MessageController: subscribeAsLocal set localSocketId success ####');
      return res.ok('join local room success')
    })
  }
};

