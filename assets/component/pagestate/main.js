/*Start of State Component*/
'use strict';

/**
External depend on open source libs
*/
var $ = require('jquery');
var _ = require('lodash');
var ejp = require('easy-jq-plugin');

var PageState = function(element, conf) {
  // this would never change
  var me = this;
  this.$me = $(element);

  _.each(['namespace', 'state', 'states'], function(key){
    if(!key) return;
    me[key] = conf && !_.isNil(conf[key]) ? conf[key] : me.$me.data(key);
  });

  this.data = {};
  this.$node = $(element);
  this.conf = conf;
  return this;
};


var metadata = {
    version : '0.0.1',
    name : 'pagestate',
    EVENTS : {
      'beforeChange' : 'state.change.before',
      'afterChange' : 'state.change.after',
    }
};

var prototypes = {
  init: function() {
    var me = this;
    if(!_.isNil(me.states)){
      _.each(me.states, function(state){
        if(typeof state === 'object' ){
          me.$me.find(state[0]).hide();
        }
      });
      me.$me.find(me.states[me.state][0]).show();
    }
    return this;
  },
  destroy: function() {
  },
  getState: function (){
    return this.currentState;
  },
  setState : function(state){
    if(this.currentState == state || !this.states[state])return this;
    var me = this;
    var $me = this.$me;

    $me.trigger(metadata.EVENTS.beforeChange, [this.currentState, state]);

    this.currentState = state;

    // This will find all managed elements, and first hide them(if the are not hidden),
    // then we will show those under current state
    _(this.states).values().flatten().each(function(state){
      if(typeof state === 'object'){
      }else{
        $me.find(state).hide();
      }
    });

    _.each(this.states[state], function(state){
      if(typeof state === 'object'){
        if(state.text && state.selector){
          $me.find(state.selector).text(state.text);
        }
        else if(state.value && state.selector){
          $me.find(state.selector).val(state.value);
        }
      }else{
        $me.find(state).show();
      }
    })
    $me.trigger(metadata.EVENTS.afterChange, [this.currentState]);
    return this;
  }
};

ejp.pluginize(PageState, metadata, prototypes);

module.exports = PageState;
