'use strict';
var pubsub = require('PubSubJS');

var UserManagement = function(){
  log.info('UserManagement has been created');
  this.user = null;
}

var metadata = {
  NS : 'UserManagement',
  pub : {
    changed : 'usermanagement.changed'
  },
  sub : {
    signout : ['usermanagement.logout', 'user.logout']
  },
  endpoint : '/user'
}

var prototype = {
    init : function(){
      var me = this;
      me.initSubscription();
      return this;
    },
    setUserInfo: function(user) {
      this.user = user;
    },
    hasPermission : function(permission){
      var user = this.user;
      if(user && user.roles && user.roles.length >0){
        var hasRole = false;
        _.each(user.roles, function(role){
          if(role.permissions && role.permissions.length > 0){
            if(_.indexOf(role.permissions, permission) >= 0){
              hasRole = true;
            }
          }
        });
        return hasRole;
      }
    },
    getUserByToken: function (token, isLoginManagePage) {
      var d = $.Deferred();
      var me = this;
      var url = '/user/me',
        dataType = 'json',
        data = [],
        base64 = btoa(token),
        tokenAuth = "Token " + base64;

      if (isLoginManagePage) {
        url = url + '?isLogin=true';
      }

      $.ajax({
        url : url,
        data: data,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        dataType: dataType,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", tokenAuth);
        }
      })
      .done(function(data){
        log.debug(' #### UserManagement : getUser Success #### ');
        log.debug(data);
        me.user = data;
        d.resolve(data);
      })
      .fail(function(err){
        log.error(' #### UserManagement : getUser fail #### ');
        log.error(err);
        d.reject(err);
      })
      .always(function(){
      });

      return d;
    },
    updateUser : function(data, beforeSend){
      var d = $.Deferred();
      var me = this;
      log.debug('Update user');
      log.debug(data);
      if(!data) return;
      var me = this;
      var url = '';
      var method = '';
      if(data.id){
        url = metadata.endpoint + '/' + data.id;
        method = 'PUT';
      }else{
        url = metadata.endpoint;
        method = 'POST';
      }
      var dataType = 'json';
      var notyInst = null;
      $.ajax({
        url: url,
        method: method,
        data: data,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        dataType: dataType,
        beforeSend : beforeSend ? beforeSend : null
      }).done(function(user){
        log.debug(user);
        _.merge(me.user, user);
        d.resolve(me.user);
      })
      .fail(function(err){
        log.error(' #### UserManagement : updateUser fail #### ');
        log.error(err);
        d.reject();
      })
      .always(function(){

      })
      return d;
    },
    /**
      @params force force to get latest info from server
    */
    getUser : function(force){
      var d = $.Deferred();
      var me = this;
      var user = me.user;
      if(user && !force){
        pubsub.publish('autologout.start');
        d.resolve(user);
      }else{
        $.ajax({
          url : '/user/me',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
        })
        .done(function(data){
          log.debug(' #### UserManagement : getUser Success #### ');
          log.debug(data);
          me.user = data;
          pubsub.publish('autologout.start');
          d.resolve(data);
        })
        .fail(function(err){
          log.error(' #### UserManagement : getUser fail #### ');
          log.error(err);
          d.reject();
        })
        .always(function(){
        });
      }
      return d;
    },
    initSubscription: function(){
      var me = this;
      _.each(UserManagement.sub, function(topicName/*value*/, handlerFn/*key*/){
        if(_.isArray(topicName)){
          _.each(topicName, function(topicName){
            pubsub.subscribe(topicName, function(){
              me[handlerFn].apply(me, Array.prototype.slice.call(arguments));
            });
          })
        }
        else{
          pubsub.subscribe(topicName, function(msg, data){
            me[handlerFn].apply(me, [msg, data]);
          });
        }
      })
    },
    signin: function(username, password, onSuccess, onError, nosessionUrl){
      var me = this;
      me.user = null;

      var url = '/auth/login?v=' + new Date().getTime(),
        dataType = 'json',
        data = [],
        base64 = btoa(username + ":" + password),
        basicAuth = "Basic " + base64;
      /*
      判断是否用no session 方式
      */
      if(nosessionUrl){
        url = nosessionUrl;
      }

      if (url.indexOf('?') > -1) {
        url = url + '&v=' + new Date().getTime();
      } else {
        url = url + '?v=' + new Date().getTime();
      }

      $.ajax({
        url: url,
        data: data,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        dataType: dataType,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", basicAuth);
        }
      }).done(function(data){
        log.debug(data);
        me.user = data;
        pubsub.publish('message.subscribe');
        pubsub.publish('autologout.start');
        onSuccess(data);
      }).fail(function(err){
        log.debug(err);
        onError(err);
      });
      return this;
    },
    signup: function(username, password, onSuccess, onError){
      var me = this;
      me.user = null;

      var url = '/auth/signup',
        dataType = 'json',
        data = {"username" : username, "password" : password};

      $.ajax({
        url: url,
        method: 'POST',
        data: data,
        dataType: dataType
      }).done(function(data){
        log.debug(data);
        me.user = data;
        onSuccess(data);
      }).fail(function(err){
        log.debug(err);
        me.user = null;
        onError(err);
      });

      return this;
    },
    signout: function(eventName, cb, forceRefresh){
      var me = this;
      me.user = null;
      //停止倒计时
      pubsub.publish('autologout.stop');
      var url = '/auth/logout';
      if(cb){
        forceRefresh = cb();
      }
      $.ajax({
        url: url,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      }).done(function(){
        if(forceRefresh){
          window.location.href = me.signoutRedirect;
        }
      })
      return this;
    },
    signoutRedirect: '/m/home',
    destroy : function(){
      return this;
    }
}
_.extend(UserManagement, metadata);
_.extend(UserManagement.prototype, prototype);
module.exports = new UserManagement();
