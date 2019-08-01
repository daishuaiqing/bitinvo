'use strict';
const dgram = require('dgram');
const co = require('co');
const _ = require('lodash');
const Redis = require('../services/Redis');

let me = this;
const MULTICAST_ADDRESS = '224.0.0.235';
const MULTICAST_PORT = 60547;
me.server = null;
me.Stop = false;
me.Open = false;
me.isMaster = false;
me.loop = null;

exports.announce = function(cabinetInfo) {
	if(me.server !== null && me.loop !== null){
		close();
	}
	me.server = dgram.createSocket({type: 'udp4', reuseAddr: true, toString: function () { return 'udp4' }});
	let sendInfo = {
		id: cabinetInfo.id,
		name: cabinetInfo.name,
		code: cabinetInfo.code,
		host: cabinetInfo.host,
		port: cabinetInfo.port,
		isMaster: cabinetInfo.isMaster,
	}
	let jsonInfo = JSON.stringify(sendInfo), loopTimer;
  const send = function(msg) {
		let msgBuffer = new Buffer(msg);
		me.server.send(msgBuffer, 0, msgBuffer.length, MULTICAST_PORT, MULTICAST_ADDRESS);
	};

  const start = function() {
		me.loop = setInterval(function(){
			send(jsonInfo);
		}, 10 * 1000);
	};

	me.server.bind(MULTICAST_PORT);
  
  function addMembershipWhileNetworkAvailable(){
    CabinetNetworkService.getNetworkInfo((err, ip) => {
      if(err){
        me.timer = setTimeout(addMembershipWhileNetworkAvailable, 10 * 1000)
      }else{
        clearTimeout(me.timer);
        sails.log.info('#### BroadCast Service Start Listening ####')
        me.server.addMembership(MULTICAST_ADDRESS);
      }
    })
  }

	me.server.on('listening', function() {
    addMembershipWhileNetworkAvailable();
	});

	me.server.on('message', function(message, rinfo) {
		let obj = {};
		let jsonStr = message.toString();
		try{
			obj = JSON.parse(jsonStr);
		}catch(err){
			sails.log.error(err.message);
			return;
		}
		if(obj.isMaster){
			sails.log.silly('isMaster');
			return;
		}
		if(obj.id === sails.config.cabinet.id){
			sails.log.silly('isLocal');
			return;
		}
		// Cabinet Work
		if(cabinetInfo.isMaster){
			me.addToQueue(jsonStr, obj.id)	
		}
	})

  me.server.on('error', function(err){
    sails.log.error(err);
  })
  start();
};

me.addToQueue = function(jsonStr, id){
	co(function* (){
		let checkDB = yield Cabinet.findOne({code: id});
		if(checkDB){
			return yield Promise.resolve('Exist');
		}
		let searchQuery = `*${id}*`;
		let checkExist = yield Redis.sscanAsync('broadcastList', 100, 'match', searchQuery);
		if(checkExist[1].length > 0){
			//Exist
			let old = checkExist[1][0];
			if(jsonStr == old){
				return yield Promise.resolve('Exist');
			}
			let deleted = yield Redis.sremAsync('broadcastList', old);
      if(deleted === 1){
        sails.log.verbose('Delete cabinet from redis queue successed');
				yield Redis.saddAsync('broadcastList', jsonStr);
				sails.log.debug('Add to queue');
      }else if(deleted === 0){
        sails.log.verbose('Delete cabinet from redis queue failed');
      }
		}else{
			//New cabinet
			yield Redis.saddAsync('broadcastList', jsonStr);
			sails.log.debug('Add to queue');
		}
	})
	.catch((err) => {
		sails.log.error(' %%%% Broadcast Service: Error in add to queue %%%% ');
		sails.log.error(err);
	})
};

const close = () => {
  sails.log.verbose('#### BroadCast Service Shutdown ####');
	me.Stop = true;
  me.server.close();
	clearInterval(me.loop);
	me.server = null;
	me.loop = null;
}
exports.close = close;

exports.clear = () => {
  Redis.delAsync('broadcastList')
	.then((data) => {
		sails.log.verbose('Clear broadcastList success');
	})
	.catch((err) => {
		sails.log.error(err);
	})
}

exports.open = () => {
  sails.log.verbose('#### BroadCast Service Set Stop False ####');
  me.Open = true;
}