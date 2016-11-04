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

    var directories = {};

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
            server.fs.mkdir(directory, attrs.mode, function (error) {
              if (error) {
                return sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message);
              }

              return sftpStream.status(reqid, STATUS_CODE.OK);
            });
          });

          sftpStream.on('OPENDIR', function (reqid, directory) {
            server.fs.stat(directory, function (error, stats) {
              if (error) {
                if (error.code === 'ENOENT') {
                  return sftpStream.status(reqid, STATUS_CODE.NO_SUCH_FILE);
                }

                return sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message);
              }

              if (stats.size > 0) {
                return sftpStream.status(reqid, STATUS_CODE.FAILURE, 'ENOTDIR, opendir \'/etc/hosts\'');
              }

              server.fs.open(directory, 'r', function (error, fd) {
                if (error) {
                  return sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message);
                }

                directories[fd] = {
                  path: directory,
                  read: false
                };

                var handle = new Buffer(4);

                handle.writeUInt32BE(fd, 0, true);

                sftpStream.handle(reqid, handle);
              });
            });
          });

          sftpStream.on('READDIR', function (reqid, handle) {
            var fd = handle.readUInt32BE(0, true);

            if (!directories.hasOwnProperty(fd)) {
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            }

            if (directories[fd].read === false) {
              directories[fd].read = true;

              server.fs.readdir(directories[fd].path, function (error, files) {
                if (error) {
                  return sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message);
                }

                return sftpStream.name(reqid, files.map(function (file) {
                  return {filename: file};
                }));
              });
            }

            return sftpStream.status(reqid, STATUS_CODE.EOF);
          });

          sftpStream.on('RMDIR', function (reqid, directory) {
            server.fs.rmdir(directory, function (error) {
              if (error) {
                if (error.code === 'ENOENT') {
                  return sftpStream.status(reqid, STATUS_CODE.NO_SUCH_FILE);
                }

                return sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message);
              }

              return sftpStream.status(reqid, STATUS_CODE.OK);
            });
          });

          sftpStream.on('REMOVE', function (reqid, filepath) {
            server.fs.unlink(filepath, function (error) {
              if (error) {
                if (error.code === 'ENOENT') {
                  return sftpStream.status(reqid, STATUS_CODE.NO_SUCH_FILE);
                }

                return sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message);
              }

              return sftpStream.status(reqid, STATUS_CODE.OK);
            });
          });

          sftpStream.on('CLOSE', function (reqid, handle) {
            var fd = handle.readUInt32BE(0, true);

            if (directories.hasOwnProperty(fd)) {
              delete directories[fd];
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
