'use strict';

var ftpd =  require('ftpd');

var VirtualFS = require('./virtual-fs');

module.exports = function (options, callback) {
  var server = new ftpd.FtpServer('127.0.0.1', {
    useWriteFile: true,
    useReadFile:  true,

    getInitialCwd: function () {
      return '/';
    },

    getRoot: function () {
      return '/';
    }
  });

  server.fs = new VirtualFS();

  server.on('client:connected', function (connection) {
    var username = null;

    connection.on('command:user', function (user, success, failure) {
      if (user && user === options.username) {
        username = user;
        success();
      } else {
        failure();
      }
    });

    connection.on('command:pass', function (password, success, failure) {
      if (password && password === options.password) {
        success(username, server.fs);
      } else {
        failure();
      }
    });
  });

  return callback(null, server);
};
