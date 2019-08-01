/**
 * IdCardController
 *
 * @description :: Server-side logic for managing idcards
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
module.exports = {
  getUserId : function(req, res){
    User.findOne({identityNumber: req.body.identityNumber}).then((data) => {
      if(!data){
        sails.log.debug('#### IdCardController : getUserId user not found');
        return res.status(401).json({ error: sails.__('尚未录入此证件')});
      }else{
        sails.log.debug('#### IdCardController : getUserId user found');
        let user = {
          username : data.username
        };
        res.ok(user);
      }
    }).catch((err) => {
      sails.log.error('#### IdCardController : getUserId error occured');
      return res.badRequest(err);
    })
  }
};

