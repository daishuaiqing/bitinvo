/**
 * RoleController
 *
 * @description :: Server-side logic for managing Roles
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  beforeSubmitCheckRoleName: function (req, res, next) {
    var roleName = req.body.name;
    Role.find({name : roleName}).then((data) => {
      if(data.length === 0){
        next();
      }else {
        return res.status(401).json({ error: sails.__('请不要添加重复的角色')});
      }
    })
  }
};
