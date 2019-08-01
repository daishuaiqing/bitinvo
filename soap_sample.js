var soap = require('soap');
var url = 'http://192.168.1.103:8081/dataSynService/wsdl?wsdl';
var args = {name : '0110001132401', arg1 : '子弹门超时未关', arg2: '2016-07-23T20:20:10'};
soap.createClient(url, function(err, client) {
  client.uploadAlarmMessage(args, function(err, result) {
    console.log(result);
  });
});



var args = {name : '0110001132401', 
arg1 : '330320198209082312',
arg2 : '450220197901021392',
arg3: '2016-07-23T20:42:30',
arg4: 1,
arg5: '0',
arg6: 0,
arg7: 0,
};
soap.createClient(url, function(err, client) {
  client.uploadOpenMessage(args, function(err, result) {
    console.log(result);
  });
});

