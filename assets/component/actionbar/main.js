'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');

var spinner = require('spinner');
var pubsub = require('PubSubJS');
var router = require('common/router');
var ActionBar = function(element, conf) {
  // this would never change
  this.$node = $(element);
  this.conf = conf;
  return this;
};

var metadata = {
  version : '0.0.1',
  name : 'actionBar',
  events : {}
};

var prototype = {
  show : function(buttons){
    log.debug('show action bar');
    var html = tpl({quit: true});
    if(buttons && buttons.length > 0){
      html = tpl({
        signup : _.indexOf(buttons, 'signup') > -1,
        quit : _.indexOf(buttons, 'quit') > -1
      });
    }

    var me = this;
    this.$node.html(html);
    this.$node.on('click', '.action', function(){
      var id = $(this).attr('name');
      switch(id) {
        case 'signup':
          me.$node.trigger('signup');
          break;
        case 'quit':
          me.$node.trigger('onQuit');
          pubsub.publish('user.logout', function(){
            if($('body').hasClass('isSimpleapplication')){
              router.nav('/m/simpleapplication');
            }else{
              router.nav('/m/home');
            }
          });
          break;
        case 'noti':
          me.toggleMsgBox();
          break;
        default:
        ;
      }
    });
    this.$spinner = $('<div/>').spinner();
    this.$node.find('.panel').append(this.$spinner);
    return this;
  },
  toggleMsgBox : function(e){
      this.open ?
        this.closeBox() :
        this.openBox();
  },
  openBox : function(){
      this.$node.find('.comp-action-bar-msgbox').show();
      this.showLoading();
      this.open = true;
  },
  closeBox : function(){
    this.$node.find('.comp-action-bar-msgbox').hide();
    this.open =false;
  },
  showLoading : function(){
    this.$spinner.spinner('init');
  }
};

module.exports = ejp.pluginize(ActionBar, metadata, prototype);
