/**
 * DoorLockRepairController
 *
 * @description :: Server-side logic for managing doorlockrepairs
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
const sm = sails.services.fifoclient.sendFifoMessage;
module.exports = {

  /**
   * `DoorLockRepairController.markDoorLockRepaired()`
   */
  markDoorLockRepaired: function (req, res) {
    let me = this;
    me.handler = function (message) {
      sails.log.debug(' ##### DoorLockRepairController:opration succeed #### ');
    }
    var onError = function (err) {
      sails.log.debug(' ##### DoorLockRepairController:onError #### ');
      sails.log.error(err);
    }
    const canId = req.query.canId;
    const positionId = req.query.positionId;
    if(canId && positionId){
      sm('markDoorLockRepaired', {
        canId,
        positionId
      },
        _.bind(me.handler, me),
        _.bind(onError, me)
      );
      sm('setGunLockState',
        {
          canId,
          positionId,
          state: 0
        },
        _.bind(me.handler, me),
        _.bind(onError, me)
      );
    }
    return res.json({ repaired: true });
  },

  cancleRepair: function (req, res) {
    return res.json({ cancled: true });
  }
};

