'use strict';

var fs   = require('fs');
var path = require('path');

var ssh2 = require('ssh2');

var OPEN_MODE   = ssh2.SFTP_OPEN_MODE;
var STATUS_CODE = ssh2.SFTP_STATUS_CODE;

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
  var files = options.files || {};

  Object.keys(files).forEach(function (filepath) {
    if (typeof files[filepath] === 'string') {
      files[filepath] = new Buffer(files[filepath], 'utf8');
    }
  });

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
          var sftpStream = sftpAccept();

          var handles = {};

          sftpStream.on('OPEN', function (reqid, filepath, flags) {
            if (!files.hasOwnProperty(filepath)) {
              return sftpStream.status(reqid, STATUS_CODE.NO_SUCH_FILE);
            }

            if (!(flags & OPEN_MODE.READ)) {
              return sftpStream.status(reqid, STATUS_CODE.PERMISSION_DENIED);
            }

            handles[reqid] = filepath;

            var handle = new Buffer(4);

            handle.writeUInt32BE(reqid, 0, true);

            sftpStream.handle(reqid, handle);
          });

          sftpStream.on('READ', function (reqid, handle, offset, length) {
            if (handle.length !== 4 || !handles.hasOwnProperty(handle.readUInt32BE(0, true))) {
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            }

            var file = files[handles[handle.readUInt32BE(0, true)]];

            if (file.length > offset) {
              sftpStream.data(reqid, file.toString('utf8', offset, Math.min(file.length, offset + length)));
            } else {
              sftpStream.status(reqid, STATUS_CODE.EOF);
            }
          });

          sftpStream.on('CLOSE', function (reqid, handle) {
            if (handle.length !== 4 || !handles.hasOwnProperty(handle.readUInt32BE(0, true))) {
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            }

            delete handles[handle.readUInt32BE(0, true)];

            sftpStream.status(reqid, STATUS_CODE.OK);
          });

        });
      });

      client.on('end', function () {
        server.clients.splice(server.clients.indexOf(client), 1);
      });

    });

    return callback(null, server);
  });
};
