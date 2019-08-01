'use strict';
const cp = require('child_process');
const net = require('net');
const os = require('os');
const getNetWorkCard = () => {
  const ncs = os.networkInterfaces()
  let _nc = null
  for (let key in ncs) {
    if (!ncs[key][0].internal) {
      _nc = key
      break
    }
  }
  if (!_nc) {
    return os.release() === '4.15.0-39-generic' ? 'enp2s0' : 'eth0'
  } else {
    return _nc
  }
}

//监听主服务，独立为一个文件用Root用户跑起来就可以了,Sails应用会自己尝试去连接，失败了1分钟重试
const server = net.createServer((c) => {
  // 'connection' listener
  console.log('client connected');
  c.on('end', () => {
    console.log('client disconnected');
  });
  c.on('data', (data) => {
    let parsed = data.toString().split('.');
    let type = parsed[0];
    if (type == 'setIp') {
      //Set OS Ip
      try {
        parsed.shift();
        parsed = parsed.join('.');
        let obj = JSON.parse(parsed);
        console.log(obj);
        let ip = obj.ip;
        let netmask = obj.netmask;
        let gateway = obj.gateway;
        let network = ' ';
        if (typeof gateway === 'string') {
          let networkarr = gateway.split('.');
          networkarr.pop();
          networkarr.push('0');
          network = networkarr.join('.');
        }
        let str = `ifconfig ${getNetWorkCard()} ` + ip + ' netmask ' + netmask + ' up';
        console.log(str);
        let setStr = 'route add default gw ' + gateway;
        let static_ip_conf = './scripts/ip_conf/ip_conf.sh static '
          + ip + ' '
          + netmask + ' '
          + gateway + ' '
          + network
        cp.exec(static_ip_conf, (err, stdOut) => {
          if (err) {
            console.error(err);
            console.error('execute interfaces edit error');
            c.write('configFailed');
          } else {
            console.log(stdOut);
          }
        })
        cp.exec(str, (err, stdOut) => {
          if (err) {
            console.error(err);
            console.error('set IP error');
            c.write('updateFailed');
          } else {
            console.log(stdOut);
            console.log('set IP Success,Next set default gw');
            cp.exec(setStr, (err, stdOut) => {
              console.log('set Gateway Success');
              c.write('updateSuccess');
              console.log(stdOut);
            });
          }
        });
      } catch (err) {
        console.error(err);
        console.error('invalid ip');
      }
    } else if (type == 'setTime') {
      //Set OS Time
      console.log(parsed);
      let date = new Date(parsed[1]).toISOString();
      let cmd = `./scripts/set_time.sh "${date}"`
      try {
        cp.exec(cmd, (err, stdOut) => {
          if (err) {
            console.error(err);
            console.error('set time error');
            c.write('updateFailed');
          } else {
            console.log(stdOut);
          }
        })
      } catch (err) {
        console.error(err);
        console.error('invalid datetime');
      }
    } else if (type == 'setInternetTime') {
      //Set Internet Time
      console.log(parsed);
      try {
        let ntp = 'ntpdate 1.cn.pool.ntp.org';
        let stopNtpService = 'service ntp stop';
        cp.exec(stopNtpService, (err, stdOut) => {
          if (err) console.error(err);
          cp.exec(ntp, (err, stdOut) => {
            if (err) {
              console.error(err);
              console.error('set internet time error');
              c.write('updateFailed');
            } else {
              c.write('updateSuccess');
            }
          })
        })
      } catch (err) {
        console.error(err);
        console.error('invalid ntp address');
      }
    } else if (type == 'getMasterTime') {
      //get master time
      try {
        parsed.shift();
        parsed = parsed.join('.');
        let obj = JSON.parse(parsed);
        console.log(obj);
        let masterIp = obj.masterIp;
        let stopNtpService = 'service ntp stop';
        let ntpdate = `ntpdate ${masterIp}`;
        cp.exec(stopNtpService, (err, stdOut) => {
          if (err) console.error(err);
          cp.exec(ntpdate, (err, stdOut) => {
            if (err) {
              console.error(err);
              console.error('get master time failed');
              c.write('getMasterTime failed');
            }
            console.log(stdOut);
          })
        })
      } catch (err) {
        console.error(err);
        console.error('invalid ntp address');
      }
    } else if (type == 'setNtpServer') {
      try {
        let installNtp = './scripts/ntp/setNtpServer.sh'
        cp.exec(installNtp, (err, stdOut) => {
          if (err) {
            console.error(err)
          } else {
            console.log(stdOut);
          }
        })
      } catch (err) {
        console.error(err);
        console.error('set ntp server failed');
      }
    } else if (type == 'setAutoIp') {
      console.log('setAutoIp received, ignore');
      // console.log(parsed);
      // try {
      //   let dhcp_r = 'dhclient -r';
      //   let dhcp = 'dhclient';
      //   let route_224 = 'route add -net 224.0.0.0 netmask 224.0.0.0 eth0';
      //   let dhcp_ip_conf = './scripts/ip_conf/ip_conf.sh dhcp'
      //   cp.exec(dhcp_ip_conf, (err, stdOut) => {
      //     if(err){
      //       console.error(err);
      //       console.error('execute dhcp config failed');
      //       c.write('dhcpconfig error');
      //     }else{
      //       console.log(stdOut);
      //     }
      //   })
      //   cp.exec(dhcp_r, (err, stdOut_down) => {
      //     if(err){
      //       console.error(err);
      //       console.error('dhclient release error');
      //       c.write('dhclient release error');
      //     }else{
      //       console.log(stdOut_down)
      //       cp.exec(dhcp, (err, stdOut_up) => {
      //         if(err){
      //           console.error(err);
      //           console.error('dhcp error');
      //           c.write('dhcp error');
      //         }else{
      //           console.log(stdOut_up);
      //           cp.exec(route_224, (err, stdOut_route) => {
      //             if(err){
      //               console.error(err);
      //               console.error('add route error');
      //               c.write('add route error');
      //             }else{
      //               console.log(stdOut_route)
      //             }                 
      //           })
      //         }
      //       })
      //     }
      //   })
      // } catch (err) {
      //   console.error(err);
      //   console.error('set auto ip failed');
      // }
    } else if (type == 'initRoute') {
      let route_cmd = `route add -net 224.0.0.0 netmask 224.0.0.0 ${getNetWorkCard()}`;
      cp.exec(route_cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('init route error');
          c.write('initRoute Failed');
        } else {
          c.write('initRoute Success');
          console.log(stdOut);
        }
      });
    } else if (type == 'restart') {
      console.log(parsed);
      let sync = 'sync';
      let rst = 'reboot';//测试命令
      cp.exec(sync, (err, stdOut) => {
        if (err) {
          console.error(err);
        } else {
          cp.exec(sync, (err, stdOut) => {
            if (err) {
              console.error(err);
            } else {
              cp.exec(sync, (err, stdOut) => {
                if (err) {
                  console.error(err);
                } else {
                  cp.exec(rst, (err, stdOut) => {
                    if (err) {
                      console.error(err);
                    } else {
                      c.write('restartSuccess');
                      console.log(stdOut);
                    }
                  })
                }
              })
            }
          })
        }
      });
    } else if (type === 'updatesystem') {
      let cmd = './scripts/update_system.sh';
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('execute update script failed');
          c.write('updatesystem error');
        } else {
          console.log(stdOut);
        }
      })
    } else if (type === 'etcdDiscoverServer') {
      parsed.shift();
      parsed = parsed.join('.');
      let obj = JSON.parse(parsed);
      let ip = obj.ip;
      let cmd = ['./scripts/etcds/etcd_discover_server.sh', ip].join(' ');
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('start etcd server failed');
          c.write('start etcd server failed');
        } else {
          console.log(stdOut);
        }
      })
    } else if (type === 'etcdGenToken') {
      parsed.shift();
      parsed = parsed.join('.');
      let obj = JSON.parse(parsed);
      let token = obj.token;
      let size = obj.size;
      let cmd = `curl -X PUT http://127.0.0.1:8379/v2/keys/discovery/${token}/_config/size -d value=${size}`;
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('start etcd generate token failed');
          c.write('start etcd generate token failed');
        } else {
          console.log(stdOut);
        }
      })
    } else if (type === 'etcdMember') {
      parsed.shift();
      parsed = parsed.join('.');
      let obj = JSON.parse(parsed);
      let name = obj.name;
      let ip = obj.ip;
      let discoverIp = obj.discoverIp;
      let token = obj.token;
      let cmd = ['./scripts/etcds/etcd_member.sh', name, ip, discoverIp, token].join(' ');
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('start etcd member failed');
          c.write('start etcd member failed');
        } else {
          console.log(stdOut);
        }
      })
    } else if (type === 'etcdEnableAuth') {
      parsed.shift();
      parsed = parsed.join('.');
      let obj = JSON.parse(parsed);
      let password = obj.password;
      let userInfo = `'{"user":"root","password":"${password}"}'`;
      let cmd = ['./scripts/etcds/etcd_enable_auth.sh', userInfo, password].join(' ');
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('start etcd auth failed');
          c.write('start etcd auth failed');
        } else {
          console.log(stdOut);
        }
      })
    } else if (type === 'stopEtcd') {
      let cmd = 'killall etcd -9';
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('stop etcd failed');
          c.write('stop etcd failed');
        } else {
          console.log(stdOut);
        }
      })
    } else if (type === 'lightup') {
      let cmd = `su ubuntu -c "/bin/bash ./scripts/lightup.sh"`;
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('lightup failed');
          c.write('lightup failed');
        } else {
          console.log(stdOut);
        }
      })
    } else if (type === 'startCam') {
      //start cam
      let ip = [parsed[1], parsed[2], parsed[3], parsed[4]].join('.');
      let port = parsed[5]
      // 海康
      let cmd = `ffmpeg -i rtsp://admin:bitinvo2017@${ip}:554 -f mpegts -codec:v mpeg1video -bf 0 -r 30 -s 640x480 -loglevel panic http://localhost:${port}`
      // 大华
      // let cmd = `ffmpeg -i 'rtsp://admin:admin@${ip}:554/cam/realmonitor?channel=1&subtype=0' -f mpegts -codec:v mpeg1video -bf 0 -r 30 -s 640x480 -loglevel panic http://localhost:${port}`
      try {
        cp.exec(cmd, (err, stdOut) => {
          if (err) {
            console.error(err);
            console.error('start cam err');
          } else {
            console.log(stdOut);
          }
        })
      } catch (err) {
        console.error(err);
      }
    } else if (type === 'stopCam') {
      //stop cam
      let cmd = `killall -9 ffmpeg`;
      try {
        cp.exec(cmd, (err, stdOut) => {
          if (err) {
            console.error(err);
            console.error('stop cam err');
          } else {
            console.log(stdOut);
          }
        })
      } catch (err) {
        console.error(err);
      }
    } else if (type === 'savePic') {
      parsed.shift();
      parsed = parsed.join('.');
      let obj = JSON.parse(parsed);
      let filename = obj.filename;
      let msgId = obj.msgId;
      let type = obj.type;
      let mkdir = './scripts/mkFPdir.sh';
      let convert = 'gm convert /home/ssd/fingerAndFace/' + filename + '.bmp /home/ssd/fingerAndFace/' + filename + '.jpg';
      let deleteSrc = 'rm /home/ssd/fingerAndFace/' + filename + '.bmp';
      let curlUpload = `curl http://127.0.0.1:1337/sync/uploadFile?filePath=/home/ssd/fingerAndFace/${filename}`;
      cp.exec(mkdir, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('mkdir failed');
        } else {
          let cmd = null;
          if (type === 'face') {
            cmd = 'cp /tmp/img_face.bmp /home/ssd/fingerAndFace/' + filename + '.bmp';
          } else {
            cmd = 'cp /tmp/fingerprint_user.bmp /home/ssd/fingerAndFace/' + filename + '.bmp';
          }
          cp.exec(cmd, (err, stdOut) => {
            if (err) {
              console.log(err);
              //返回复制成功消息
              c.write(`${msgId}.savePic.failed`);
            } else {
              console.log(stdOut);
              //返回复制成功消息
              c.write(`${msgId}.savePic.success`);
              cp.exec(convert, (err, stdOut) => {
                if (err) {
                  console.log(err);
                  curlUpload += '.bmp';
                  cp.exec(curlUpload, (err, stdOut) => {
                    if (err) {
                      console.log(err);
                    }
                  })
                } else {
                  console.log(stdOut);
                  curlUpload += '.jpg';
                  cp.exec(curlUpload, (err, stdOut) => {
                    if (err) {
                      console.log(err);
                    }
                  })
                  cp.exec(deleteSrc, (err, stdOut) => {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log(stdOut);
                    }
                  })
                }
              })
            }
          })
        }
      })
    } else if (type === 'deleteFacePic') {
      let cmd = `rm /tmp/img_face.bmp`;
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('rm facePic failed');
        } else {
          console.log(stdOut);
        }
      })
    } else if (type === 'mkdir') {
      parsed.shift();
      parsed = parsed.join('.');
      const obj = JSON.parse(parsed);
      const path = obj.path;
      const mkdir = `mkdir -p ${path}`
      cp.exec(mkdir, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('mkdir failed');
        }
      })
    } else if (type === 'mv') {
      parsed.shift();
      parsed = parsed.join('.');
      const obj = JSON.parse(parsed);
      const src = obj.src;
      const dist = obj.dist;
      const mv = `mv ${src} ${dist}`;
      let distArr = dist.split('/');
      distArr.pop();
      const path = distArr.join('/');
      cp.exec(`mkdir -p ${path}`, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('mv failed');
        } else {
          cp.exec(mv, (err, stdOut) => {
            if (err) {
              console.error(err);
              console.error('mv failed');
            }
          })
        }
      })
    } else if (type === 'rm') {
      parsed.shift();
      parsed = parsed.join('.');
      const obj = JSON.parse(parsed);
      const file = obj.file;
      const rm = `rm ${file}`
      cp.exec(rm, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('rm failed');
        }
      })
    } else if (type === 'resetUUID') {
      const genUUID = '/bin/bash ./scripts/uuid/uuid.sh y';
      const restartApp = '/bin/bash ./scripts/restartApp.sh'
      cp.exec(genUUID, (err, stdOut, stdErr) => {
        if (err) {
          console.error(err);
          console.error(stdErr);
        } else {
          cp.exec(restartApp, (err, stdOut, stdErr) => {
            if (err) {
              console.error(err);
              console.error(stdErr);
            }
          })
        }
      })
    } else if (type === 'setStorageTime') {
      parsed.shift();
      parsed = parsed.join('.');
      const obj = JSON.parse(parsed);
      const video = Number(obj.video);
      const pic = Number(obj.pic);
      let cmd = null;
      if (video && pic) {
        cmd = `echo '#!/bin/bash\nfind /home/ssd/video/* -type d -ctime +${video} | xargs rm -f\nfind /home/ssd/fingerAndFace/* -ctime +${pic} | xargs rm -f' > /home/bitinvo/scripts/video_rotate.sh`
      }
      if (cmd) {
        cp.exec(cmd, (err, stdOut) => {
          if (err) {
            console.error(err);
            console.error('setStorageTime failed');
          }
        })
      }
    } else if (type === 'shutdown') {
      const cmd = `shutdown -h now`;
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('shutdown failed');
        }
      })
    } else if (type === 'restartApp') {
      const cmd = `./scripts/restartSGSComandApplication.sh`;
      cp.exec(cmd, (err, stdOut) => {
        if (err) {
          console.error(err);
          console.error('restart failed');
        }
      })
    } else {
      console.error('No Such Type')
    }
  });
  c.pipe(c);
});

server.on('error', (err) => {
  console.log(err);
});

server.listen(8124, () => {
  console.log('shellProxy Start');
});
