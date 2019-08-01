'use strict';

const http = require('http');
const WebSocket = require('ws');

const portInUse = {
  8081: false,
  8083: false
}

module.exports = function Camera(sails) {
  return {
    initialize: function (cb) {
      sails.log.debug(`#### Camera Hook started ####`);
      const pubsub = sails.config.innerPubsub;
      function cameraServer() {

        const STREAM_PORT_1 = 8081,
          WEBSOCKET_PORT_1 = 8082,
          STREAM_PORT_2 = 8083,
          WEBSOCKET_PORT_2 = 8084;

        // Websocket Server
        let socketServer = new WebSocket.Server({ port: WEBSOCKET_PORT_1, perMessageDeflate: false });
        socketServer.connectionCount = 0;
        socketServer.on('connection', function (socket, upgradeReq) {
          sails.log.debug(
            'New WebSocket Connection: ',
            (upgradeReq || socket.upgradeReq).socket.remoteAddress,
            (upgradeReq || socket.upgradeReq).headers['user-agent'],
            '(' + socketServer.connectionCount + ' total)'
          );
          socketServer.connectionCount++;
          socket.on('close', function (code, message) {
            socketServer.connectionCount--;
          });
          socket.on('error', function (e) {
            sails.log.error(e)
          });
        });
        socketServer.broadcast = function (data) {
          socketServer.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(data);
            }
          });
        };
        //----------------
        let socketServer_2 = new WebSocket.Server({ port: WEBSOCKET_PORT_2, perMessageDeflate: false });
        socketServer_2.connectionCount = 0;
        socketServer_2.on('connection', function (socket, upgradeReq) {
          sails.log.debug(
            'New WebSocket Connection: ',
            (upgradeReq || socket.upgradeReq).socket.remoteAddress,
            (upgradeReq || socket.upgradeReq).headers['user-agent'],
            '(' + socketServer_2.connectionCount + ' total)'
          );
          socketServer_2.connectionCount++;
          socket.on('close', function (code, message) {
            socketServer_2.connectionCount--;
          });
          socket.on('error', function (e) {
            sails.log.error(e)
          });
        });
        socketServer_2.broadcast = function (data) {
          socketServer_2.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(data);
            }
          });
        };


        // HTTP Server to accept incomming MPEG-TS Stream from ffmpeg
        http.createServer(function (request, response) {
          response.connection.setTimeout(0);
          request.on('data', function (data) {
            socketServer.broadcast(data);
          });
        }).listen(STREAM_PORT_1);

        http.createServer(function (request, response) {
          response.connection.setTimeout(0);
          request.on('data', function (data) {
            socketServer_2.broadcast(data);
          });
        }).listen(STREAM_PORT_2);

        pubsub.on('open_cam', (cabinetId, camId) => {
          let port = null
          for (let key in portInUse) {
            if (!portInUse[key]) {
              portInUse[key] = true
              port = key
              break
            }
          }
          if (!port) return pubsub.emit(`open_cam_cb_${camId}`, '端口已占用, 请先关闭摄像头')
          Cabinet.findOne({ id: cabinetId }).exec((err, rs) => {
            if (err) {
              pubsub.emit(`open_cam_cb_${camId}`, JSON.stringify(err))
            } else if (!rs || !rs.camIp) {
              pubsub.emit(`open_cam_cb_${camId}`, '未设置摄像头IP地址')
            } else {
              sails.services.shellproxy.startCam(rs.camIp, port);
              setTimeout(function () {
                pubsub.emit(`open_cam_cb_${camId}`, 'success')
              }, 3 * 1000)
            }
          })
        })

        pubsub.on('close_cam', () => {
          sails.services.shellproxy.stopCam();
          socketServer.clients.forEach(function each(client) {
            client.terminate();
          });
          socketServer_2.clients.forEach(function each(client) {
            client.terminate();
          });
          for (let key in portInUse) {
            portInUse[key] = false
          }
          pubsub.emit('close_cam_cb', 'success');
        })
      }

      sails.after(['lifted'], function () {
        cameraServer()
      });
      return cb();
    }
  }
}