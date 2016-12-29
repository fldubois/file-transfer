'use strict';

var events = require('events');
var fs     = require('fs');
var util   = require('util');

var Promise = require('bluebird');
var Client  = require('ftp');

function simplePromisifier(method) {
  return function promisified() {
    var args = [].slice.call(arguments);
    var self = this;

    return new Promise(function (resolve, reject) {
      args.push(function () {
        var results = [].slice.call(arguments);

        var error = results.shift();

        return error ? reject(error) : resolve(results.length === 1 ? results[0] : results);
      });

      method.apply(self, args);
    });
  };
}

function FTPClient(options) {
  this.client    = Promise.promisifyAll(new Client(), {promisifier: simplePromisifier});
  this.connected = false;
  this.options   = options;

  if (this.options.hasOwnProperty('username')) {
    if (!this.options.hasOwnProperty('user')) {
      this.options.user = this.options.username;
    }

    delete this.options.username;
  }

  if (this.options.hasOwnProperty('pass')) {
    if (!this.options.hasOwnProperty('password')) {
      this.options.password = this.options.pass;
    }

    delete this.options.pass;
  }

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

FTPClient.prototype.checkConnection = function () {
  return this.isConnected() ? Promise.resolve() : Promise.reject(new Error('FTP client not connected'));
};

FTPClient.prototype.disconnect = function () {
  if (this.connected === true) {
    this.client.end();
    this.connected = false;
  }

  return null;
};

FTPClient.prototype.supportsStreams = function () {
  return false;
};

FTPClient.prototype.createReadStream = function () {
  throw new Error('Not implemented');
};

FTPClient.prototype.createWriteStream = function () {
  throw new Error('Not implemented');
};

FTPClient.prototype.get = function (path, local, callback) {
  return this.checkConnection().bind(this).then(function () {
    return this.client.getAsync(path);
  }).then(function (socket) {
    return new Promise(function (resolve, reject) {
      var stream = socket.on('error', reject).pipe(fs.createWriteStream(local));

      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }).asCallback(callback);
};

FTPClient.prototype.put = function (local, remote, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  return this.checkConnection().then(function () {
    return new Promise(function (resolve, reject) {
      fs.stat(local, function (error, stats) {
        if (error) {
          return reject(error);
        }

        if (!stats.isFile()) {
          return reject(new Error('Not a file: ' + local));
        }

        return resolve();
      });
    });
  }).bind(this).then(function () {
    return this.client.putAsync(local, remote);
  }).asCallback(callback);
};

FTPClient.prototype.unlink = function (path, callback) {
  return this.checkConnection().bind(this).then(function () {
    return this.client.deleteAsync(path);
  }).asCallback(callback);
};

FTPClient.prototype.readdir = function (path, callback) {
  return this.checkConnection().bind(this).then(function () {
    return this.client.listAsync(path);
  }).then(function (files) {
    return files.slice(1).map(function (file) {
      return file.name;
    });
  }).asCallback(callback);
};

FTPClient.prototype.mkdir = function (path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  return this.checkConnection().bind(this).then(function () {
    return this.client.mkdirAsync(path);
  }).asCallback(callback);
};

FTPClient.prototype.rmdir = function (path, callback) {
  return this.checkConnection().bind(this).then(function () {
    return this.client.rmdirAsync(path);
  }).asCallback(callback);
};

module.exports = FTPClient;
