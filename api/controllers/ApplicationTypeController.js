/**
 * ApplicationTypeController
 *
 * @description :: Server-side logic for managing Applicationtypes
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
const find = require('../blueprints/find.js');

module.exports = {

  find : function(req, res){
    let allowAll = true;
    //允许所有人访问
    return find(req, res, allowAll);
  },

	approvers : function(req, res, next){
    let skip = Number(req.query.skip);
    let limit = Number(req.query.limit);
    let filterUserArray = req.query.filterUserArray;
    let notInUsers = (filterUserArray && filterUserArray !== `[]`) ? `(${filterUserArray.slice(1, filterUserArray.length - 1)})` : `('')`;
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
      and not u.id in ${notInUsers} \
      group by  \
      username \
      LIMIT ${skip}, ${limit}`;
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
      and not u.id in ${notInUsers} \
      group by  \
      username`;

    User.query(sql, function(err, users) {
      if(err){
        return res.serverError(err);
      }
      if(req.headers.pagination){
        User.query(count_sql, function (err, counts) {
          if(err){
            return res.serverError(err);
          }
          let data = {
            total : counts.length,
            filteredTotal : counts.length,
            limit : limit,
            skip : skip,
            data : users
          };
        return res.ok(data);
        })
      }else{
        return res.ok(users);
      }
      
  });
},

applicationTypeForOne: function(req, res){
  let limit = Number(req.query.limit) || 5;
  let skip = Number(req.query.skip) || 0;
  ApplicationType.find(
    {where : {
      type : {"!" : ['maintain', 'emergency']}
    },
    limit : limit,
    skip : skip
    }
  ).exec((err, appType) => {
    if(err) return res.serverError(err);
    if(req.headers.pagination !== 'true'){
      return res.ok(appType);
    }
    ApplicationType.count({where : {
      type : {"!" : ['maintain', 'emergency']}
    }}).exec((err, count) => {
      return res.ok({
        total : count,
        skip: skip,
        limit: limit,
        data : appType
      });
    })
  })
},

beforeSubmitCheckApplicationTypeName:function (req, res, next) {
  let applicationTypeName = req.body.name;
  ApplicationType.find({name : applicationTypeName}).then((data) => {
    if(data.length === 0){
      next();
    }else {
      res.badRequest({error:'重复的类型名称！'});
    }
  })
  }
};
