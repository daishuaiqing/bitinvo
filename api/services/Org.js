'use strict';
const co = require('co');
const uuid = require('node-uuid');
/**
 * 发送握手
 */
exports.handshake = (item, type) => {
  if(!item.host || !item.port){
    sails.log.info('#### Org Service: No Host/Port To HandShake ####');
  }
  co(function* (){
    if(type == 'update'){
      let url = `${item.host}:${item.port}`;
      if(url === item.historyUrl){
        sails.log.info('URL Not Change');
        return Promise.resolve('Nothing Change');
      }else{
        sails.log.info('URL Changed');
        yield Org.update({id: item.id}, {historyUrl: url});
      }
    }
    sails.log.debug('Ready To HandShake');
    let url = `http://${item.host}:${item.port}/org/handshake`;
    let localOrg = yield Org.findOne({isLocal: true}); 
    if(!localOrg) return yield Promise.reject('No Local Org Exist');
    let Token = uuid.v4();
    sails.log.debug(`New Token is ${Token}`);
    let user = yield User.findOne({username: item.id});
    if(!user){
      sails.log.debug(`Need Create New Dummy User For Org ${item.name}`);
      yield User.register({username: item.id, id: item.id, password: item.id, token: Token, isDummy: true});
    }else{
      sails.log.debug(`Need Update Dummy User For Org ${item.name}`);
      let updated = yield User.update({username: item.id, isDummy: true}, {token: Token});
      if(updated.length === 0) { return yield Promise.reject('No User Updated'); };
    }
    delete localOrg.remoteToken;
    localOrg.isLocal = false;
    let body = {
      org: localOrg,
      token: Token
    }
    return yield sails.services.network.proxy(url, 'POST', body);
  })
  .then((res) => {
    sails.log.silly(res.body);
  })
  .catch((err) => {
    sails.log.error(err);
  })
}

/**
 * 接受握手
 */
exports.handshakeRecieve = (req, res) => {
  let org = req.body.org;
  let token = req.body.token;
  if(!org || !token) return res.badRequest({error: 'Empty Arguments'});
  sails.log.info(org);
  let id = org.id;
  sails.log.info(typeof org);
  co(function* (){
    let target = yield [Org.findOne({id: id}), User.findOne({id: id, isDummy: true})];
    if(target){
      //Already Exists,Do Update
      sails.log.debug('Already Exist Org, Update Token');
      let updated = yield Org.update({id: id}, {remoteToken: token});
      let msg = `机构:${org.name}请求更新连接情况`;
      sails.services.message.all(msg, 'user.message', 'local', `/org/manageHandShake/${id}/accept`, `/org/manageHandShake/${id}/deny`);
      res.ok();
    }else{
      //New HandShake Org Incoming,Save It's Token, Show a dialog
      sails.log.verbose('New HandShake Item');
      yield [Org.create(org), User.register({id: id, username: id, password: id, isDummy: true})]
      let msg = `机构:${org.name}请求建立连接`;
      sails.services.message.all(msg, 'user.message', 'local', `/org/manageHandShake/${id}/accept`, `/org/manageHandShake/${id}/deny`);
      res.ok();
    }
  })
  .catch((err) => {
    sails.log.error(err);
  })
}
/**
 * 同意握手
 */
exports.manageHandShake = (id, result) => {
  sails.log.info('HandShake Result is '); 
  co(function* (){
    if(result === 'accept'){
      let dummyUser = yield User.findOne({id: id, isDummy: true})
      let targetOrg = yield Org.findOne({id: id});
      if(!dummyUser || !targetOrg) return yield Promise.reject('Target Not Exist');
      if(!targetOrg.remoteToken) return yield Promise.reject('Target Not Given Remote Token');
      let token = uuid.v4();
      yield User.update({id: id, isDummy: true}, {token: token}); 
      let url = `http://${targetOrg.host}:${targetOrg.port}/org/manageToken`;
      let body = { token: token, id: id };
      let remoteToken = 'Token ' + new Buffer(targetOrg.remoteToken).toString('base64');
      yield sails.services.network.proxy(url, 'PUT', body, remoteToken);
    }else{
      return yield Promise.reject('Update Deny');
    }
  })
  .catch((err) => {
    sails.log.error(err);
  })
}

/**
 * 接收Token
 */
exports.saveToken = (req, res) => {
  sails.log.info('Recieve Save Token Request');
  let token = req.body.token;
  let targetId = req.body.id;
  if(!token || !targetId){ return res.badRequest({error: 'No Arguments'})};
  co(function* (){
    let target = yield [Org.findOne({id: targetId}), User.findOne({id: targetId, isDummy: true})];
    if(!target[0] || !target[1]){
      return yield Promise.reject('No Target Exist');
    }
    let name = target[0].name;
    sails.log.info(`Recieve Token From ${name}`)
    let updated = yield Org.update({id: targetId}, {remoteToken: token});
    if(updated.length > 0){
      return yield Promise.resolve('Success');
    }else{
      return yield Promise.reject('No Target Updated');
    }
  })
  .then((suc) => {
    res.ok(suc);
  })
  .catch((err) => {
    if(typeof err === 'string'){
      sails.log.error(err);
      return res.badRequest({error: err});
    }else{
      sails.log.error(err);
      return res.serverError({error: err});
    }
  })
}

exports.sendTotalCount = () => {
  let sql = `select sum(gunCount) as gunCounts, sum(bulletCount) as bulletCounts from mqtt;`;
  Mqtt.query(sql, (err, rs) => {
    if(err){
      sails.log.error(err);
    }else{
      sails.services.message.local({
        topic : 'totalCount',
        value : {
          gunCount: rs[0].gunCounts,
          bulletCount: rs[0].bulletCounts
        }
      })  
    }
  })
} 