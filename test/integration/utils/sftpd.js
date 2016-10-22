'use strict';

var fs   = require('fs');
var path = require('path');

var ssh2 = require('ssh2');

var key = fs.readFileSync(path.join(__dirname, '../resources/keys/server_rsa_key'));

module.exports = function (options) {
  var server = new ssh2.Server({
    hostKeys: [key]
  });

  server.on('connection', function (client) {

    client.on('authentication', function (ctx) {
      if (ctx.method === 'password' && ctx.username === options.username && ctx.password === options.password) {
        ctx.accept();
      } else {
        ctx.reject();
      }
    });

    client.on('session', function(accept, reject) {
      var session = accept();

      session.on('sftp', function(accept, reject) {
        var sftpStream = accept();
      });
    });

  })

  return server;
}
