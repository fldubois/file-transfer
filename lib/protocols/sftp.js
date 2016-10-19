'use strict';

var events = require('events');
var util   = require('util');

var SSHClient = require('ssh2').Client;

function SFTPClient(options) {
  this.client    = null;
  this.connected = false;
  this.options   = options;
}

util.inherits(SFTPClient, events.EventEmitter);

SFTPClient.prototype.connect = function () {
  var self = this;

  self.client = new SSHClient();

  self.client.on('ready', function () {
    self.client.sftp(function (error, sftp) {
      if (error) {
        self.client.end();
        self.emit('error', error);
      } else {
        self.sftp      = sftp;
        self.connected = true;

        self.emit('ready');
      }
    });
  });

  self.client.on('error', function (error) {
    self.emit('error', error);
  });

  self.client.connect(self.options);
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

SFTPClient.prototype.mkdir = function (path, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode     = null;
  }

  if (this.connected === false) {
    return callback(new Error('SFTP client not connected'));
  }

  return this.sftp.mkdir(path, {mode: mode}, callback);
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
