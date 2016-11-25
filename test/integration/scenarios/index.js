'use strict';

var fs   = require('fs');
var path = require('path');

module.exports = fs.readdirSync(__dirname).filter(function (file) {
  return /^00\d-/.test(file);
}).map(function (file) {
  return require(path.join(__dirname, file));
});
