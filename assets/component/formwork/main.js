/*Start of Formwork Component*/
'use strict';

/**
External depend on open source libs
*/
var $ = require('jquery');
var _ = require('lodash');
var ejp = require('easy-jq-plugin');

var Formwork = function(element, conf) {
  // this would never change
  var me = this;
  this.$me = $(element);

  _.each(['namespace', 'fields'], function(key){
    if(!key) return;
    me[key] = conf && conf[key] ? conf[key] : me.$me.data(key);
  });

  this.data = {};
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var prototypes = {
  init: function() {
    var $me = this.$me;
    _.each(this.fields, function(fieldConf, selector){
      fieldConf.init && fieldConf.init.apply($me.find(selector).get());
    })
    return this;
  },
  destroy: function() {
    _.each(this.fields, function(fieldConf, selector){
      fieldConf.init && fieldConf.destroy.apply($me.find(selector).get());
    })
    return this;
  },
  // Gather data and trigger [namespace].form.submit event
  submit : function(){
    var originalData = this.data;
    var data = this.processData();
    this.$me.trigger([this.namespace, 'form', 'submit'].join('.'), data);
    return this;
  },
  reset : function(){
    this.refresh(this.data);
  },
  clear : function(){
    var $me = this.$me;
    this.data = {};
    _.each(this.fields, function(fieldConf, selector){
      var $f = $me.find(selector);
      $f.parents('.form-group').removeClass('has-error');

      if(fieldConf.reset)
        fieldConf.reset.apply($me.find(selector).get());
      else{
        if($f.is('input')){
          if($f.is('select')){
            $f.find('option:selected').prop('selected', null);
          }
          else if($f.is(':checkbox')){
            $f.prop("checked", null).attr("checked", null);
          }
          else if($f.is(':radio')){
            $f.prop("checked", null).attr("checked", null);
          }
          else{
            $f.val('');
          }
        }
        else if($f.is('textarea')){
          $f.val('');
        }
        else{
          $f.text('');
        }
      }
    })
    return this;
  },

  /**
   *  This is called to validate the form
   *
   */
  validate : function(targets){
    var $me = this.$me;
    var getData = this.getData;

    var errors = [];
    var originalData = this.data;
    var data = this.processData();

    _.each(this.fields, function(fieldConf, selector){
      if(targets){
        targets = typeof targets === 'string' ? [targets] : targets;
        var hasTarget = _.some(targets, function(target){
          return target === selector;
        });
        if(!hasTarget)
          return;
      }
      var $f = $me.find(selector);
      if(fieldConf.validate){
        var value = getData(data, fieldConf.path ? fieldConf.path : fieldConf.name);
        var error = fieldConf.validate.apply($f.get(), [value, data, originalData]);
        if(error){
          $f.parents('.form-group').addClass('has-error');
          errors.push(error);
        }
        else{
          $f.parents('.form-group').removeClass('has-error');
        }
      }
      else
        fieldConf.rule;
    })
    if(errors.length > 0){
      $me.trigger([this.namespace, 'form.validate.error'].join('.'), [errors]);
    }
    else{
      $me.trigger([this.namespace, 'form.validate.valid'].join('.'));
    }
    return this;
  },

  /**
   *  set new data to controlling form
   *
   */
  refresh: function(data) {
    var getData = this.getData;
    this.data = data;
    var $me = this.$me;
    _.each(this.fields, function(fieldConf, selector){
      var value = getData(data, fieldConf.path ? fieldConf.path : fieldConf.name);
      if(fieldConf.refresh)
        fieldConf.refresh.apply($me.find(selector).get(), [value, data]);
      else{
        var $f = $me.find(selector);
        if($f.is('input')){
          if($f.is('select')){
            $f.find('option[value='+ value+']').prop('selected', 'selected');
          }
          else if($f.is(':checkbox') || $f.is(':radio')){
            $f.each(function(i, ele){
              if($(ele).val() === value){
                $(ele).prop("checked", "checked").attr("checked", "checked");
              }
            });
          }
          else{
            $f.val(value);
          }
        }
        else if($f.is('textarea')){
          $f.val(value);
        }
        else{
          $f.text(value);
        }
      }
    })
    return this;
  },
  formData : function(){
    return this.data;
  },

  /**
   *  process Data, call data proccessing functions from each field definition
   */
  processData : function(){
    var $me = this.$me;
    var originalData = this.data;
    var data = {};
    var getData =  this.getData;
    _.each(this.fields, function(fieldConf, selector){
      if (fieldConf.exclude) return this;

      if(fieldConf.val){
        var value = getData(originalData, fieldConf.path ? fieldConf.path : fieldConf.name);
        data[fieldConf.name] = fieldConf.val.apply($me.find(selector).get(), [value, originalData]);
      }
      else{
        var $f = $me.find(selector);
        var value = '';
        if($f.is('input')){
          if($f.is('select')){
            value = $f.find('option:selected').val();
          }
          else if($f.is(':checkbox')){
            value = $me.find(selector+':checked').map(function(i, ele){
              return $(ele).val();
            });
          }
          else if($f.is(':radio')){
            value = $me.find(selector+':checked').val();
          }
          else{
            value = $f.val();
          }
        }else if($f.is('textarea')){
          value = $f.val();
        }
        data[fieldConf.name] = value;
      }
    });
    return data;
  },

  /**
   * Get data according path info, for example
   * data = {hello : {yes : 1}, go : 2}
   * to get key "yes" 's value
   * getData(data, 'hello.yes') === 1
   */
  getData : function(data, path){
    var nodes = path.split('.');
    var value = data;
    _.every(nodes, function(node){
      var matches = /([a-zA-Z0-9]+)\[(\d+)\]/.exec(node);
      if(matches && matches.length === 3){
        var key = matches[1];
        var pos = matches[2];
        if(value[key] && value[key][pos] ){
          value = value[key][pos];
        }
        else{
          value = '';
          return false;
        }
      }else{
        if(value[node]){
          value = value[node];
        }
        else{
          value = '';
          return false;
        }
      }
      return true;
    })
    return value;
  }
};


var metadata = {
    version : '0.0.1',
    name : 'formwork',
    EVENTS : {}
};
/*
ejp.pluginize(LoginForm, metadata, prototypes) is a short-hand call equal to below code

    _.extend(Editor, {
        version : '0.0.1',
        DATA_PREFIX : 'data-',
        UNDERSCORE_VAR : {variable : 'option'},
        INSTANCE_PREFIX : 'loginform',
        EVENTS : {}
    });
     _.extend(LoginForm.prototype, prototypes);

    //register to jquery
    ejp.reg(Editor, Editor.INSTANCE_PREFIX, Editor.EVENTS, Editor.version);
*/

ejp.pluginize(Formwork, metadata, prototypes);

module.exports = Formwork;
