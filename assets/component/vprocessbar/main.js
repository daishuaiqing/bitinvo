/*
    vProcessBar Component Start
*/
'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');

var VProcessBar = function(element, conf) {
    // this would never change
    this.$node = $(element);
    this.conf = conf;
    return this;
};

_.extend(VProcessBar, {
    version : '0.0.1',
    DATA_PREFIX : 'data-',
    UNDERSCORE_VAR : {variable : 'option'},
    INSTANCE_PREFIX : 'vProcessBar',
    EVENTS : {}
})

var prototypes = {
    show : function(current, items, clickable){
        log.debug('Show Vertical Prcess');
        var me = this;
        if(items){
            this.items = items;
        }
        current = typeof(current) == 'undefinded' ? 0 : current;
        var html = tpl({
            current : current,
            items : me.items
        });
        this.$node.html(html);
        if(clickable){
            this.$node.find('.comp-vprocessbar').on('click', 'li', function(e){
                var $curr = $(e.delegateTarget).find('.active').removeClass('active');
                var $next = $(e.currentTarget);
                me.show($next.attr('seq'));
            });
        }
        return this;
    }
};

 _.extend(VProcessBar.prototype, prototypes);

//register to jquery
ejp.reg(VProcessBar, VProcessBar.INSTANCE_PREFIX, VProcessBar.EVENTS, VProcessBar.version);

module.exports = VProcessBar;

/**
    VProcessBar Component End
*/
