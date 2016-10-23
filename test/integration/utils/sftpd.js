'use strict';

var fs   = require('fs');
var path = require('path');

var ssh2 = require('ssh2');

var key = null;

function readServerKey(callback) {
  if (key !== null) {
    return callback(null, key);
  }

  fs.readFile(path.join(__dirname, '../resources/keys/server_rsa_key'), function (error, _key) {
    if (error) {
      return callback(error);
    }

    key = _key;

    return callback(null, key);
  });

}

module.exports = function (options, callback) {
  readServerKey(function (error, _key) {
    if (error) {
      return callback(error);
    }

    var server = new ssh2.Server({
      hostKeys: [_key]
    });

    server.clients = [];

    server.on('connection', function (client) {
      server.clients.push(client);

      client.on('authentication', function (ctx) {
        if (ctx.method === 'password' && ctx.username === options.username && ctx.password === options.password) {
          ctx.accept();
        } else {
          ctx.reject();
        }
      });

      client.on('session', function (sessionAccept) {
        var session = sessionAccept();

        session.on('sftp', function (sftpAccept) {
          sftpAccept();
        });
      });

      client.on('end', function () {
        server.clients.splice(server.clients.indexOf(client), 1);
      });

    });

    return callback(null, server);

  });
};
