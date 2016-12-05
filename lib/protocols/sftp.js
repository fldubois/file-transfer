'use strict';

var events = require('events');
var util   = require('util');

var Promise   = require('bluebird');
var SSHClient = require('ssh2').Client;

function SFTPClient(options) {
  this.client    = null;
  this.connected = false;
  this.options   = options;
}

util.inherits(SFTPClient, events.EventEmitter);

SFTPClient.prototype.connect = function (callback) {
  var self = this;

  self.client = new SSHClient();

  self.client.on('error', function (error) {
    self.emit('error', error);
  });

  return new Promise(function (resolve, reject) {
    self.client.on('error', reject);

    self.client.on('ready', function () {
      self.client.sftp(function (error, sftp) {
        self.client.removeListener('error', reject);

        if (error) {
          self.client.end();
          return reject(error);
        }

        self.sftp      = sftp;
        self.connected = true;

        return resolve();
      });
    });

    self.client.connect(self.options);
  }).asCallback(callback);
};

SFTPClient.prototype.createReadStream = function (path, options) {
  if (this.connected === false) {
    throw new Error('SFTP client not connected');
  }

  if (typeof options === 'object' && options.hasOwnProperty('handle')) {
    delete options.handle;
  }

  return this.sftp.createReadStream(path, options);
};

SFTPClient.prototype.createWriteStream = function (path, options) {
  if (this.connected === false) {
    throw new Error('SFTP client not connected');
  }

  if (typeof options === 'object' && options.hasOwnProperty('handle')) {
    delete options.handle;
  }

  return this.sftp.createWriteStream(path, options);
};

SFTPClient.prototype.get = function (remote, local, callback) {
  if (this.connected === false) {
    return callback(new Error('SFTP client not connected'));
  }

  return this.sftp.fastGet(remote, local, callback);
};

SFTPClient.prototype.mkdir = function (path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  if (this.connected === false) {
    return callback(new Error('SFTP client not connected'));
  }

  return this.sftp.mkdir(path, options, callback);
};

SFTPClient.prototype.put = function (local, remote, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  if (this.connected === false) {
    return callback(new Error('SFTP client not connected'));
  }

  return this.sftp.fastPut(local, remote, options, callback);
};

SFTPClient.prototype.readdir = function (path, callback) {
  if (this.connected === false) {
    return callback(new Error('SFTP client not connected'));
  }

  this.sftp.readdir(path, function (error, files) {
    if (error) {
      return callback(error);
    }

    return callback(null, files.map(function (file) {
      return file.filename;
    }));
  });
};

SFTPClient.prototype.rmdir = function (path, callback) {
  if (this.connected === false) {
    return callback(new Error('SFTP client not connected'));
  }

  return this.sftp.rmdir(path, callback);
};

SFTPClient.prototype.unlink = function (path, callback) {
  if (this.connected === false) {
    return callback(new Error('SFTP client not connected'));
  }

  return this.sftp.unlink(path, callback);
};

SFTPClient.prototype.disconnect = function () {
  this.client.end();
  this.connected = false;
};

module.exports = SFTPClient;
