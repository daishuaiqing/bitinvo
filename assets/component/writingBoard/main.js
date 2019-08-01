'use strict'

var animateCss = require("animate.css");
var jade = require('./main.jade');
var less = require('./main.less');
var ejp = require('easy-jq-plugin');
var SignaturePad = require('signature_pad');

var WritingBoard = function(element, conf) {
  this.$node = $(element);
  this.conf = conf;
  return this;
}

var metadata = {
  version: '0.0.1',
  name: 'writingBoard',
  events: {}
}

var prototype = {
  show: function(option) {
    var me = this,
        $node = me.$node,
        $body = $('body'),
        hasWritingBoard = $body.find('#writePadComponent').length > 0;

    if (!hasWritingBoard) {
      $node.append(jade());
      me.signature = me.initSignature(option);
    }
    return me;
  },
  initSignature: function(option) {
    var me = this,
        $node = me.$node,
        $writePadComponent = $('#writePadComponent'),
        writePadComponentWidth = null,
        writePadComponentHeight = null,
        canvas = $node.find('#signature').get(0),
        signature = null;

    me.canvas = canvas;

    signature = new SignaturePad(me.canvas, {
      backgroundColor: 'rgb(255,255,255)',
      minWidth: 1,
      maxWidth: 5
    });

    me.resizeCanvas(signature);

    $(window).off('resize').on('resize', function() {
      me.resizeCanvas(signature);
    });

    $writePadComponent.on('click', '.btn', function(e) {
      var targetName = $(this).attr('name');
      var map = {
        'clear': function() {
          me.clear();
        },
        'save': function() {
          me.save();
        }
      }
      map[targetName] && map[targetName].call(me);
    });

    return signature;
  },
  resizeCanvas: function(signature) {
    var me = this;
    var ratio =  Math.max(window.devicePixelRatio || 1, 1);
    me.canvas.width = me.canvas.offsetWidth * ratio;
    me.canvas.height = me.canvas.offsetHeight * ratio;
    me.canvas.getContext("2d").scale(ratio, ratio);
    signature.clear();
  },
  clear: function() {
    var me = this;
    me.signature.clear();
    me.$node.trigger('clearSignature');
  },
  save: function() {
    var me = this,
        dataURL = null;
    if (!me.isEmpty()) {
      dataURL = me.signature.toDataURL();
    }
    me.$node.trigger('saveSignature', dataURL)
  },
  isEmpty: function() {
    return this.signature.isEmpty();
  },
  closeWritingBoard: function() {
    $('body').find('#writePadComponent').remove();
  },
  destroy: function() {
    this.closeWritingBoard();
  }
}

module.exports = ejp.pluginize(WritingBoard, metadata, prototype);
