'use strict';

var fs   = require('fs');
var path = require('path');

var ssh2 = require('ssh2');

var SFTPStream = require('ssh2-streams').SFTPStream;

var VirtualFS = require('./virtual-fs');

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
  readServerKey(function (error, _key) {
    if (error) {
      return callback(error);
    }

    var server = new ssh2.Server({
      hostKeys: [_key]
    });

    server.clients = [];
    server.fs      = new VirtualFS(options.files);

    // TODO: Remove legacy virtual FS
    server.files   = options.files || {};


    Object.keys(server.files).forEach(function (filepath) {
      if (typeof server.files[filepath] === 'string') {
        server.files[filepath] = new Buffer(server.files[filepath], 'utf8');
      }
    });

    server.on('connection', function (client) {
      server.clients.push(client);

      client.on('authentication', function (ctx) {
        if (ctx.method === 'password' && ctx.username === options.username && ctx.password === options.password) {
          ctx.accept();
        } else {
          server.clients.splice(server.clients.indexOf(client), 1);
          ctx.reject();
        }
      });

      client.on('session', function (sessionAccept) {
        var session = sessionAccept();

        session.on('sftp', function (sftpAccept) {
          var sftpStream = sftpAccept();

          var handles = {};

          sftpStream.on('OPEN', function (reqid, filepath, flags) {
            server.fs.open(filepath, SFTPStream.flagsToString(flags), function (error, fd) {
              if (error) {
                if (error.code === 'ENOENT') {
                  return sftpStream.status(reqid, STATUS_CODE.NO_SUCH_FILE);
                }

                return sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message);
              }

              var handle = new Buffer(4);

              handle.writeUInt32BE(fd, 0, true);

              sftpStream.handle(reqid, handle);
            });
          });

          sftpStream.on('STAT', function (reqid, filepath) {
            server.fs.stat(filepath, function (error, stats) {
              if (error) {
                return sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message);
              }

              return sftpStream.attrs(reqid, stats);
            });
          });

          sftpStream.on('READ', function (reqid, handle, offset, length) {
            var fd = handle.readUInt32BE(0, true);

            server.fs.read(fd, new Buffer(length), offset, length, 0, function (error, bytesRead, buffer) {
              if (error) {
                return sftpStream.status(reqid, STATUS_CODE.FAILURE);
              }

              if (bytesRead === 0) {
                return sftpStream.status(reqid, STATUS_CODE.EOF);
              }

              return sftpStream.data(reqid, buffer.toString('utf8', 0, bytesRead));
            });
          });

          sftpStream.on('WRITE', function (reqid, handle, offset, data) {
            var fd = handle.readUInt32BE(0, true);

            server.fs.write(fd, data, offset, data.length, 0, function (error) {
              return sftpStream.status(reqid, error ? STATUS_CODE.FAILURE : STATUS_CODE.OK);
            });
          });

          sftpStream.on('MKDIR', function (reqid, directory, attrs) {
            if (server.files.hasOwnProperty(directory)) {
              return sftpStream.status(reqid, STATUS_CODE.FAILURE, 'file exists');
            }

            server.files[directory] = {'.': attrs};
            sftpStream.status(reqid, STATUS_CODE.OK);
          });

          sftpStream.on('OPENDIR', function (reqid, directory) {
            if (!server.files.hasOwnProperty(directory)) {
              return sftpStream.status(reqid, STATUS_CODE.NO_SUCH_FILE);
            }

            if (!Array.isArray(server.files[directory])) {
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            }

            handles[reqid] = {
              files: server.files[directory],
              read:  false
            };

            var handle = new Buffer(4);

            handle.writeUInt32BE(reqid, 0, true);

            sftpStream.handle(reqid, handle);
          });

          sftpStream.on('READDIR', function (reqid, handle) {
            if (handle.length !== 4 || !handles.hasOwnProperty(handle.readUInt32BE(0, true))) {
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            }

            var data = handles[handle.readUInt32BE(0, true)];

            if (data.read === false) {
              data.read = true;
              return sftpStream.name(reqid, data.files);
            }

            return sftpStream.status(reqid, STATUS_CODE.EOF);
          });

          sftpStream.on('RMDIR', function (reqid, directory) {
            if (!server.files.hasOwnProperty(directory)) {
              return sftpStream.status(reqid, STATUS_CODE.NO_SUCH_FILE);
            }

            if (!Array.isArray(server.files[directory])) {
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            }

            delete server.files[directory];

            return sftpStream.status(reqid, STATUS_CODE.OK);
          });

          sftpStream.on('REMOVE', function (reqid, filepath) {
            if (!server.files.hasOwnProperty(filepath)) {
              return sftpStream.status(reqid, STATUS_CODE.NO_SUCH_FILE);
            }

            if (!Buffer.isBuffer(server.files[filepath])) {
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            }

            delete server.files[filepath];

            return sftpStream.status(reqid, STATUS_CODE.OK);
          });

          sftpStream.on('CLOSE', function (reqid, handle) {
            var fd = handle.readUInt32BE(0, true);

            // TODO: Remove legacy virtual FS
            if (handles.hasOwnProperty(fd)) {
              delete handles[fd];
              return sftpStream.status(reqid, STATUS_CODE.OK);
            }

            server.fs.close(fd, function (error) {
              return sftpStream.status(reqid, error ? STATUS_CODE.FAILURE : STATUS_CODE.OK);
            });
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
