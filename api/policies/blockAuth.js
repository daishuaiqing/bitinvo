'use strict';

module.exports = function (req, res, next) {
  let user = req.session.user ? req.session.user : req.user;
  if (!user) {
    next();
  } else if (user.isBlock != undefined && user.isBlock == true) {
    sails.log.debug('#### blockAUth : user has been blocked ');
    return res.status(403).json({ error: '用户已被禁止操作' });
  } else {
    //尚未明确柜机判断条件，所以先默认读取第一台柜机
    Cabinet.find()
      .then((data) => {
        if (!data || data.length === 0) {
          //尚未初始化柜机
          DefaultData.InitCabinet();
          next();
        } else {
          let cabinet = data[0];
          if (cabinet.isBlock) {
            sails.log.debug('#### blockAUth : cabinet has been blocked ');
            return res.status(403).json({ error: '该柜机已被禁止操作' });
          } else {
            next();
          }
        }
      })
  }
};
