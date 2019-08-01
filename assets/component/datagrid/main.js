/**
Datagrid module start
*/
'use strict';

var animateCss = require("animate.css");

var ejp = require('easy-jq-plugin');
var server = require('common/server.js').server;

var dbs = require("datatables.net/js/jquery.dataTables.js");

require("./log.less");

var Datagrid = function(element, conf){
  log.info('Datagrid has been created');
  this.$node = $(element);
  this.newUrl = null;
  this.conf = conf;
  return this;
}

var metadata = {
  version : '0.0.1',
  name : 'datagrid',
  events : {
    'confirm' : 'grid.confirm',
    'cancel' : 'grid.cancel'
  }
};

var prototype = {
  init : function (conf){
    log.info('init Datagrid Component');
    var me = this,
      url = conf.url,
      columns = conf.columns,
      order = conf.order,
      confData = conf.data ? conf.data : null,
      confSort = conf.sort ? conf.sort : null,
      recordsTotal = conf.total ? conf.total : 100,
      recordsFiltered = conf.filteredTotal ? conf.filteredTotal : 100,
      createdRow = conf.createdRow ? conf.createdRow : null;
      
  me.table = me.$node.DataTable({
      // paging :   false,
      order: order,
      ordering : true,
      info :     false,
      searching : false,
      serverSide : true,
      pageLength : 9,
      lengthChange : false,
      destroy: true,
      language: {
        paginate: {
          previous: '上一页',
          next:     '下一页'
        },
        aria: {
          paginate: {
            previous: '上一页',
            next:     '下一页'
          }
        },
        zeroRecords: "没有数据"
      },
      ajax : function (data, callback, settings) {
        log.debug('fetch data from server');
        var skip = data.start;
        var limit = data.length > 0 ? data.length : 10;
        var sort = {};
        _.each(data.order,
          function(o){
            if(!_.isNil(o) && !_.isNil(o.column) && !_.isNil(o.dir)){
              var columnDef = data.columns[o.column];
              if(columnDef){
                if(columnDef.data !== 'function'){
                  sort[columnDef.data] = o.dir.toUpperCase();
                }else if(!_.isNil(columnDef.name)){
                  sort[columnDef.name] = o.dir.toUpperCase();
                }
              }
            }
          }
        );

        sort = _.defaults(sort, confData.sort);
        var enablePagination = true;
        server({
          url : me.newUrl || url,
          data : _.defaults(
            {
              skip : skip,
              limit : limit,
              sort : sort
            },
            confData
          )
        }, enablePagination)
        .done(function(data, pagination){
          callback({data : data, start: skip, recordsTotal: pagination.total, recordsFiltered: pagination.filteredTotal});
        })
        .fail(function(){
          me.$node.trigger('onError');
        });
      },
      columns: columns,
      createdRow: createdRow
    });

  },
  next : function(){
    this.$node.DataTable().page( 'next' ).draw( 'page' );
  },
  prev : function(){
    this.$node.DataTable().page( 'previous' ).draw( 'page' );
  },
  goto : function(page){
    this.$node.DataTable().page( 'previous' ).draw( 'page' );
  },
  refresh : function(url){
    if(url){
      this.newUrl = url;
    }
    this.$node.DataTable().ajax.reload(null, false);
  }
}

//expose jquery plugin reference as a module entry
module.exports = ejp.pluginize(Datagrid, metadata, prototype);
/**
Datagrid module End
*/
