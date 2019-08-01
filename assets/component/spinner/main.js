'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');

var Spinner = function(element, conf) {
    // this would never change
    this.$node = $(element);
    this.conf = conf;
    return this;
};

_.extend(Spinner, {
    version : '0.0.1',
    DATA_PREFIX : 'data-',
    UNDERSCORE_VAR : {variable : 'option'},
    INSTANCE_PREFIX : 'spinner',
    EVENTS : {}
})

var prototypes = {
    init : function(showText){
        log.debug('spinner');
        var html = tpl({
            showText :  !!showText
        });
        this.$node.html(html);
        return this;
    },
    show : function(showText){
        // this.$node.show();
    }
};

 _.extend(Spinner.prototype, prototypes);

//register to jquery
ejp.reg(Spinner, Spinner.INSTANCE_PREFIX, Spinner.EVENTS, Spinner.version);

module.exports = Spinner;