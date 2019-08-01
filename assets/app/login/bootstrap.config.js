/**
Using https://github.com/gowravshekar/bootstrap-webpack
See
http://getbootstrap.com/customize/
https://gist.github.com/beherca/2ebc84c48c48a85e7d63
FMI
*/
module.exports = {
  styleLoader: require('extract-text-webpack-plugin').extract('style-loader', 'css-loader!postcss-loader!less-loader'),
  //styleLoader: 'style-loader!css-loader!postcss-loader!less-loader',
  scripts: {
  },
  styles: {
    "mixins" : true,
    "utilities": true,
    "type" : true,
    "forms" : true,
    "normalize": true,
    "grid": true,
    "buttons" : true,
    "responsive-utilities" : true,
    "print" : true, 
    "code" : true, 
    "responsive-embed" : true
  }
};