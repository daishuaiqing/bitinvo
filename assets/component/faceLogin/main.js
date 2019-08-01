'use strict';

var animateCss = require("animate.css");
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');
var pagestate = require('pagestate');

var faceLogin = function (element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version: '0.0.1',
  name: 'faceLogin',
  events: {
    'submit': 'loginform.submit'
  }
};

var prototype = {
  show: function($node, config) {
    var me = this;
    var html = tpl({
      img: require("./img/face.png")
    });

    me.$node.html(html)
    .on('click', '.faceLogin-button', function(e) {
      e.preventDefault();
      var $this = $(this)
      $this.addClass('disabled');
      me.$node.trigger('onFaceLogin', $this);
    });

    return me;
  }
}

module.exports = ejp.pluginize(faceLogin, metadata, prototype);
