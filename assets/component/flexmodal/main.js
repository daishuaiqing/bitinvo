/**
FlexModal module start
*/
'use strict';

var _ = require('lodash');
var bootstrap = require("bootstrap-webpack!./bootstrap.config.js");

var animateCss = require("animate.css");

var ejp = require('easy-jq-plugin');
var i18n = require('locales/zh-CN.json');

var tpl = require('./main.jade');
var modalbody = require('./modalbody.jade');
var less = require('common/less/base.less');
var less = require('./main.less');


var FlexModal = function(element, conf){
  log.info('FlexModal has been created');
  this.conf = conf;
  this.innerTpl = (conf && conf.innerTpl) ? conf.innerTpl : modalbody;
  this.renderer = null;
  this.listSelector = '.inner-list';
  this.$modal = null;
  this.$node = $(element);
  this.IsSureBtn = conf && conf.IsSureBtn || false;
  this.modalBackdropRemove = conf && conf.modalBackdropRemove || false;
  return this;
}

var metadata = {
  version : '0.0.1',
  name : 'flexmodal',
  events : {
    'confirm' : 'modal.confirm',
    'ok' : 'modal.ok',
    'cancel' : 'modal.cancel'
  }
};

var prototype = {
  init : function (){
    log.info('init Modal Component');
  },
  //
  show : function(data, innerTpl, renderer){
    var me = this;

    this.remove();

    data = data ? data : {};

    if(innerTpl){
      me.innerTpl = innerTpl;
    }

    if(renderer){
      me.renderer = renderer;
    }
    _.extend(data, {
      confirmBtnLabel : __('Confirm'),
      cancelBtnLabel : __('Cancel'),
      i18n : i18n
    });

    // create html frame
    this.$tpl = $(tpl(data))
    .on('click', '.action-btn', function(e){
      e.preventDefault();
      var id = $(this).attr('id');
      var $node = this.$node;
      switch(id) {
          case 'cancel':
            $node.trigger(metadata.events.cancel);
            break;
          case 'confirm':
            $node.trigger(metadata.events.confirm);
            break;
          case 'ok':

            $node.trigger(metadata.events.ok);
            break;
          default:
            break;
      }
    })
    this.$tpl.find('.modal-body').empty().html(me.innerTpl(data));
    this.$node.append(this.$tpl);

    if (this.modalBackdropRemove) {
      this.$modal = this.$tpl.removeData('bs.modal').modal({
        backdrop: 'static',
        keyboard: false,
        show: true
      })
    } else {
      this.$modal = this.$tpl.modal({
        backdrop: true,
        keyboard: true,
        show : true
      });
    }


    if(me.IsSureBtn){
      me.$node.find('.save-btn').removeClass('hide')
      .on('click', function(){
        me.$node.trigger('onOk')
      });

    }
    return this;
  },
  modalToggle : function(){
    this.$modal.modal('toggle');
  },
  modalShow: function(){
    this.$modal.modal('show');
  },
  modalHide: function(){
    this.$modal.modal('hide');
  },
  modalHandrandleUpdate: function(){
    this.$modal.modal('handleUpdate');
  },
  remove : function(){
    this.$node && this.$node.find('.flexmodal').remove();
  }
}

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(FlexModal, metadata, prototype);
/**
FlexModal module End
*/
