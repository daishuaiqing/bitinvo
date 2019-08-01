/**
 * PinyinController
 *
 * @description :: Server-side logic for managing pinyins
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
const pubsub = sails.config.innerPubsub;
module.exports = {
  input : function(req,  res){
    let input = req.query.input ? req.query.input : 'a';
    let limit = Number(req.query.limit) || 5;
    let skip = Number(req.query.skip) || 0;
    pubsub.emit('input', input, limit, skip);
    return res.ok();
  }
};

