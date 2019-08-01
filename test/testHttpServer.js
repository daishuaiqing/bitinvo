'use strict'
const http = require('http');
const soap = require('soap');
const port = 8000;
var myService = {
      DataSynServiceService: {
          DataSynServicePort: {
              uploadOpenMessage: function (args) {
                console.log(args);
                console.log('------------------end------------------');
                return {
                  return:{
                    success: true
                  }
                }
              },
              uploadAlarmMessage: function(args) {
                console.log(args);
                console.log('------------------end------------------');
                return {
                    return:{
                      success: true
                  }
                }
              }
          }
      }
  };

  var xml = require('fs').readFileSync('../config/wsdl', 'utf8'),
      server = http.createServer(function(request,response) {
          response.end("404: Not Found: " + request.url);
      });

  server.listen(port);
  console.log('server running on ' + port);
  soap.listen(server, '/dataSynService/wsdl', myService, xml);