/**
See https://dev.opera.com/articles/better-error-handling-with-window-onerror/
*/
'use strict';

var log = require('./log.js');

//msg, file, line, col, error
window.onerror = function (errorMsg, url, lineNumber, column, error) {
  error = error ? error : 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber
  + ' Column: ' + column + ' Error' + error;
  log.error(error);
}