var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var proxy = require('http-proxy-middleware');
var devConfig = require('./config/env/development');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(cookieParser());
if(process.env.NODE_ENV === 'production'){
  app.use(express.static(path.join(__dirname, 'www')));
}else{
  app.use(express.static(path.join(__dirname, '.tmp/public')));
}

app.get('/', function(req, res){
  res.redirect('/m/home');
})
app.use(express.static(path.join(__dirname, 'apidoc')));
app.use('/apidoc', function(req, res){
  res.sendFile(__dirname + '/apidoc/index.html');
})

app.use('/m/:moduleName', function(req, res, next){
  var module =  req.param('moduleName');
  var webpackUrl = '';
  if(process.env.NODE_ENV !== 'production'){
    // webpackUrl = 'http://localhost:8080/dist'
    webpackUrl = devConfig.webpackUrl
  }
  if(req.ip){
    if(req.ip === '::1' || req.ip.indexOf('127.0.0.1') > -1){
      req.isLocal = true;
      res.cookie('islocal', 1, { maxAge: 900000, httpOnly: false });
    }
  }
  return res.render('module/index',{
    title : module,
    module : module,
    isLocal : req.isLocal,
    isProd : process.env.NODE_ENV === 'production',
    webpackUrl: webpackUrl
  });
})

var option = {
  target: 'http://localhost:1337',
  ws:true
}
var proxySails = proxy(option);
app.use(proxySails)

module.exports = app;
