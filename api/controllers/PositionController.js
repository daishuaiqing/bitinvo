/**
 * PositionController
 *
 * @description :: Server-side logic for managing Positions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  beforeSubmitCheckPositionName: function (req, res, next) {
    var positionName = req.body.name;
    Position.find({name : positionName}).then((data) => {
      if(data.length === 0){
        next();
      }else {
        return res.status(401).json({ error: sails.__('请不要添加重复的职位')});
      }
    })
  }
};
