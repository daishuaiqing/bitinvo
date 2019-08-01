/*
    Vmenu Component Start
*/
'use strict';
var $ = require('jquery');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var less = require('./main.less');

var VMenu = function(element, conf) {
    // this would never change
    this.$node = $(element);
    this.conf = conf;
    return this;
};

_.extend(VMenu, {
    version : '0.0.1',
    DATA_PREFIX : 'data-',
    UNDERSCORE_VAR : {variable : 'option'},
    INSTANCE_PREFIX : 'vMenu',
    EVENTS : {}
})

var prototypes = {
    /**
    @params items  [{name : 'menu1', target: 'javascript:void(0)'},...]
    @params defaultItem integer
    @params clickable
    */
    show : function(current, items, clickable){
        log.debug('Show Vertical Menu');
        var html = tpl({
            defaultItem : current,
            items : items ? items : []
        });
        this.$node.html(html);
        if(this.conf && this.conf.clickable){
            this.$node.find('.comp-vmenu').on('click', 'li', function(e){
                var $curr = $(e.delegateTarget).find('.active').removeClass('active');
                var $next = $(e.currentTarget);
                $next.addClass('active');
            });
        }
        
        return this;
    }
};

 _.extend(VMenu.prototype, prototypes);

//register to jquery
ejp.reg(VMenu, VMenu.INSTANCE_PREFIX, VMenu.EVENTS, VMenu.version);

module.exports = VMenu;

/**
    Vmenu Component End
*/
