/**
Using https://github.com/gowravshekar/bootstrap-webpack
See
http://getbootstrap.com/customize/
https://gist.github.com/beherca/2ebc84c48c48a85e7d63
FMI
*/
module.exports = {
  styleLoader: require('extract-text-webpack-plugin').extract('style-loader', 'css-loader!postcss-loader!less-loader'),
  // styleLoader: 'style-loader!css-loader!postcss-loader!less-loader',
  scripts: {
    "alert" : true,
    "button" : true,
    "carousel" : true,
    "dropdown" : true,
    "modal" : true,
    "tooltip" : true,
    "popover" : true,
    "tab" : true,
    "affix" : true,
    "collapse" : true,
    "scrollspy" : true
  },
  styles: {
    "mixins" : true,
    "utilities": true,
    "type" : true,
    "normalize": true,
    "forms" : true,
    "grid": true,
    "buttons" : true,
    "responsive-utilities" : true,
    "print" : true, 
    "code" : true, 
    "responsive-embed" : true,
    "glyphicons" : true,
    "images": true,
    "modal" : true,
    // "print" : true,
    // "type" : true,
    // "code" : true,
    // "grid" : true,
    // "tables" : true,
    // "forms" : true,
    // "buttons" : true,
    // "responsive-utilities" : true,
    // //////////////////////////
    // "button-groups" : true,
    // "input-groups" : true,
    // "navs" : true,
    // "navbar" : true,
    // "breadcrumbs" : true,
    // "pagination" : true,
    // "pager" : true,
    // "labels" : true,
    // "jumbotron" : true,
    // "thumbnails" : true,
    // "alerts" : true,
    // "progress-bars" : true,
    "media" : true,
    // "list-group" : true,
    "panels" : true,

    "responsive-embed" : true,
    // "wells" : true,
    "close" : true,
    "component-animations" : true,
    "dropdowns" : true,
    "tooltip" : true,
    "popovers" : true,
    "modals" : true,
    "carousel" : true
  }
};