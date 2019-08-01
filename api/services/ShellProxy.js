'use strict';
const net = require('net');

let connecting = false;
//连接监听
let shellProxy = net.createConnection({ port: 8124 }, () => {
  sails.log.verbose('connected to shell proxy success!');
  connecting = true;
});

const events = require('events');
const pubsub = new events.EventEmitter();

let msgId = 1;
const maxMsgId = 65535;
const genMsgId = () => {
  if (msgId < maxMsgId) {
    msgId++;
    return msgId;
  } else {
    msgId = 1;
  }
}

let timer = {};

shellProxy.on('data', (data) => {
  try {
    const result = data.toString().split('.');
    //1.savePic.success
    if (result.length === 3) {
      pubsub.emit(`${result[0]}_${result[1]}`, result[2]);
    }
  } catch (e) {
    sails.log.error(`#### ShellProxy : process result error`);
    sails.log.error(e);
  }
});

shellProxy.on('error', (err) => {
  if (err.toString() == 'Error: connect ECONNREFUSED 127.0.0.1:8124') {
    sails.log.error('Shell Proxy Server Didnot Start');
    sails.log.error('Reconnet After 5 minutes');
  } else {
    sails.log.error(err);
  }
  sails.log.debug('Remove Old Shell Proxy Connect Listener');
  shellProxy.removeAllListeners('connect');
  setTimeout(function () {
    shellProxy.connect({ port: 8124 }, () => {
      sails.log.verbose('Reconnected to shell proxy success!');
      connecting = true;
    });
  }, 5 * 60 * 1000);
});

shellProxy.on('end', () => {
  sails.log.verbose('disconnected from shell proxy');
});


exports.setOSTime = function (datetime) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    if (datetime) {
      shellProxy.write('setTime.' + datetime, 'utf8', () => {
        sails.log.debug('write date to shell proxy success');
      });
    } else {
      sails.log.error('datetime cannot be empty');
    }
  }
};
exports.setOSTimeByNtp = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('setInternetTime.', () => {
      sails.log.debug('write date to shell proxy success');
    });
  }
};
exports.eth0Restart = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('setAutoIp.', () => {
      sails.log.debug('write date to shell proxy success');
    });
  }
};
exports.updateSystem = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('updatesystem.', () => {
      sails.log.debug('write date to shell proxy success');
    });
  }
};
exports.setIp = function (Ip, Netmask, Gateway) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    if (Ip && Netmask) {
      shellProxy.write(`setIp.{"ip":\"${Ip}\","netmask":\"${Netmask}\","gateway":\"${Gateway}\"}`, 'utf8', () => {
        sails.log.debug('write ip to shell proxy success');
      });
    } else {
      sails.log.error('Ip or NetMask cannot be empty');
    }
  }
};

exports.systemRestart = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('restart.', () => {
      sails.log.debug('write date to shell proxy success');
    })
  }
}

exports.initRoute = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('initRoute.', () => {
      sails.log.debug('write cmd to shell proxy success');
    })
  }
}

exports.etcdDiscoverServer = function (ip) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`etcdDiscoverServer.{"ip":\"${ip}\"}`, 'utf8', () => {
      sails.log.debug('write name and ip to shell proxy success');
    })
  }
}

exports.etcdEnableAuth = function (password) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`etcdEnableAuth.{"password":\"${password}\"}`, 'utf8', () => {
      sails.log.debug('write password to shell proxy success');
    })
  }
}

exports.etcdMember = function (name, ip, discoverIp, token) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`etcdMember.{"name":\"${name}\","ip":\"${ip}\","discoverIp":\"${discoverIp}\","token":\"${token}\"}`, 'utf8', () => {
      sails.log.debug('write name and ip to shell proxy success');
    })
  }
}

exports.etcdGenToken = function (token, size) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`etcdGenToken.{"token":\"${token}\","size":\"${size}\"}`, 'utf8', () => {
      sails.log.debug('write token and size to shell proxy success');
    })
  }
}

exports.stopEtcd = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('stopEtcd.', () => {
      sails.log.debug('write cmd to shell proxy success');
    })
  }
}

exports.getMasterTime = function (masterIp) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`getMasterTime.{"masterIp":\"${masterIp}\"}`, 'utf8', () => {
      sails.log.debug('write cmd to shell proxy success');
    })
  }
}

exports.setNtpServer = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`setNtpServer.`, () => {
      sails.log.debug('write cmd to shell proxy success');
    })
  }
}

exports.lightUp = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`lightup.`, () => {
      sails.log.debug('write lightup cmd to shell proxy success');
    })
  }
}

exports.savePic = function (filename, type, cb) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    const msgId = genMsgId();
    sails.log.debug(` #### ShellProxy : send savePic cmd , msgId ${msgId}`);
    const now = new Date().getTime();
    pubsub.once(`${msgId}_savePic`, (rs) => {
      const duration = new Date().getTime() - now;
      sails.log.debug(` #### ShellProxy : receive savePic cmd , msgId : ${msgId}  result : ${rs}, spend ${duration} ms`);
      clearTimeout(timer[msgId]);
      if (rs == 'success') {
        return cb(null);
      } else {
        return cb('failed');
      }
    })
    timer[msgId] = setTimeout(() => {
      sails.log.debug(` #### ShellProxy : savePic cmd timeout, msgId : ${msgId}  spend 1000 ms`);
      pubsub.removeListener(`${msgId}_savePic`, () => {
        sails.log.debug(`#### ShellProxy : savePic timeout`);
      })
      return cb('timeout');
    }, 1000);
    shellProxy.write(`savePic.{"filename":\"${filename}\","type":\"${type}\","msgId":\"${msgId}\"}`, () => {
      sails.log.debug('write savePic cmd to shell proxy success');
    })
  }
}

exports.deletePic = function (filename, type) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`deleteFacePic.`, () => {
      sails.log.debug('write deleteFacePic cmd to shell proxy success');
    })
  }
}

exports.startCam = function (ip, port) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    if (ip) {
      shellProxy.write('startCam.' + ip + '.' + port, () => {
        sails.log.debug('write data to shell proxy success');
      });
    } else {
      sails.log.error('ip cannot be empty');
    }
  }
};

exports.stopCam = function (ip) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('stopCam.' + ip, () => {
      sails.log.debug('write data to shell proxy success');
    });
  }
};

exports.mkdir = function (path) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`mkdir.{"path":\"${path}\"}`, () => {
      sails.log.debug('write mkdir cmd to shell proxy success');
    })
  }
}

exports.mv = function (src, dist) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`mv.{"src":\"${src}\","dist":\"${dist}\"}`, () => {
      sails.log.debug('write mv cmd to shell proxy success');
    })
  }
}

exports.rm = function (file) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`rm.{"file":\"${file}\"}`, () => {
      sails.log.debug('write rm cmd to shell proxy success');
    })
  }
}

exports.setStorageTime = function (storageTime) {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write(`setStorageTime.{"pic":\"${storageTime.pic}\","video":\"${storageTime.video}\"}`, () => {
      sails.log.debug('write rm cmd to shell proxy success');
    })
  }
}

exports.shutdown = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('shutdown.', () => {
      sails.log.debug('write cmd to shell proxy success');
    })
  }
}

exports.resetUUID = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('resetUUID.', () => {
      sails.log.debug('write cmd to shell proxy success');
    })
  }
}

exports.restartApplication = function () {
  if (!connecting) {
    sails.log.error('Shell Proxy Server Didnot Start')
  } else {
    shellProxy.write('restartApp.', () => {
      sails.log.debug('write cmd to shell proxy success');
    })
  }
}