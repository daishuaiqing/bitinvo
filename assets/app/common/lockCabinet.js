var pubsub = require('PubSubJS');

var LockCabinet = function() {
  console.log('构建全局锁定模块');
  this.LockCabinetPage = require('../LockCabinetPage/index.js');
}

LockCabinet.prototype = {
  init: function(audio) {
    var me = this;
    me.speak = function (soundId, prevSound) {
      audio.play(soundId, prevSound);
    }
    me.$mountDOM = $('.lockWindow');

    // 监听路由切换，检测settings.lockCabinet和settings.remoteLockCabinet
    pubsub.subscribe('sub.lockCabinet', function(msg, data) {
      var remoteLockCabinet = data && data.remoteLockCabinet || null;
      var lockCabinet = data && data.lockCabinet || null;
      
      if (remoteLockCabinet || lockCabinet) {
        // 模块自己检测是本地还是远程
        me.openLockModule(data);
      } else {
        me.closeLockModule();
      }
    });

    // 监听远程推送，锁定柜机
    pubsub.subscribe('change.LockCabinetStatus', function(topic, msg) {
      var data = JSON.parse(msg);
      var lockType = data.lockType;
      var status = data.status;

      if (lockType === 'remote') {
        if (status === 'true') {
          me.openLockModule({
            remoteLockCabinet: true
          });
        } else {
          me.closeLockModule();
        }
      } else {
        if (status === 'true') {
          me.openLockModule({
            remoteLockCabinet: false
          })
        } else {
          me.closeLockModule();
        }
      }
    });
  },
  isExistLockCabinetModule: function() {
    return this.$mountDOM.children().length > 0;
  },
  openLockModule: function(data) {
    var me = this;
    if (me.isExistLockCabinetModule()) {
      me.LockCabinetPage.update(data);
    } else {
      me.LockCabinetPage.show(data, this.$mountDOM, me.speak, function() {
        me.$mountDOM.removeClass('hide');
      });
    }
  },
  closeLockModule: function() {
    var me = this;

    // 如果不存在，则直接结束
    if (!me.isExistLockCabinetModule()) return;

    if (typeof me.LockCabinetPage.destory === 'function') {
      me.LockCabinetPage.destory(function () {
        me.$mountDOM.addClass('hide').empty();
      });
    } else {
      me.$mountDOM.addClass('hide').empty();
    }
  }
}

module.exports = new LockCabinet();