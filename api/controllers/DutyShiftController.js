/**
 * DutyShiftController
 *
 * @description :: Server-side logic for managing Dutyshifts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
module.exports = {
  dutyTimeValidate : function(req, res, next){
    let user = req.body.user;
    let start = req.body.start;
    let end = req.body.end;
    let id = req.body.id;
    DutyShift.findOne({
      user : user,
      or: [
        {start: {'<=': start}, end: {'>': start}},
        {start: {'>=': start, '<': end}}
        ]
    }).exec(function(err, rs){
      if(err){
        sails.log.error('#### DutyShiftController : dutyTimeValidate error ####');
        sails.log.error(err);
        return res.serverError({error: '添加值班人员失败, 请重试'});
      }
      sails.log.debug(rs);
      if(!rs){
        next();
      }else if(rs.id === id){
        next();
      }else{
        return res.badRequest({error: '此时间段已添加该人员值班'});
      }
    })
  }
};

