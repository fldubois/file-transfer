'use strict';

var events = require('events');
var fs     = require('fs');
var util   = require('util');

var Promise   = require('bluebird');
var Client    = require('ftp');

function FTPClient(options) {
  this.client    = new Client();
  this.connected = false;
  this.options   = options;

  this.client.on('error', this.emit.bind(this, 'error'));
}

util.inherits(FTPClient, events.EventEmitter);

FTPClient.prototype.connect = function (callback) {
  var self = this;

  return new Promise(function (resolve, reject) {
    self.client.on('error', reject);

    self.client.on('ready', function () {
      self.client.removeListener('error', reject);

      self.connected = true;

      return resolve();
    });

    self.client.connect(self.options);
  }).asCallback(callback);
};

FTPClient.prototype.isConnected = function () {
  return this.connected;
};

FTPClient.prototype.createReadStream = function () {
  throw new Error('Not implemented');
};

FTPClient.prototype.createWriteStream = function () {
  throw new Error('Not implemented');
};

FTPClient.prototype.get = function (remote, local, callback) {
  if (this.connected === false) {
    return callback(new Error('FTP client not connected'));
  }

  return this.client.get(remote, function (error, socket) {
    if (error) {
      return callback(error);
    }

    var stream = socket.on('error', callback).pipe(fs.createWriteStream(local));

    stream.on('finish', callback);
    stream.on('error', callback);
  });
};

FTPClient.prototype.mkdir = function (path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  if (this.connected === false) {
    return callback(new Error('FTP client not connected'));
  }

  return this.client.mkdir(path, callback);
};

FTPClient.prototype.put = function (local, remote, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  if (this.connected === false) {
    return callback(new Error('FTP client not connected'));
  }

  return this.client.put(local, remote, callback);
};

FTPClient.prototype.readdir = function (path, callback) {
  if (this.connected === false) {
    return callback(new Error('FTP client not connected'));
  }

  this.client.list(path, function (error, files) {
    if (error) {
      return callback(error);
    }

    return callback(null, files.map(function (file) {
      return file.name;
    }));
  });
};

FTPClient.prototype.rmdir = function (path, callback) {
  if (this.connected === false) {
    return callback(new Error('FTP client not connected'));
  }

  return this.client.rmdir(path, callback);
};

FTPClient.prototype.unlink = function (path, callback) {
  if (this.connected === false) {
    return callback(new Error('FTP client not connected'));
  }

  return this.client.delete(path, callback);
};

FTPClient.prototype.disconnect = function () {
  if (this.connected === true) {
    this.client.end();
    this.connected = false;
  }

  return null;
};

module.exports = FTPClient;
