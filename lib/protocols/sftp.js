'use strict';

var events = require('events');
var util   = require('util');

var Promise   = require('bluebird');
var SSHClient = require('ssh2').Client;

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

function SFTPClient(options) {
  this.client    = new SSHClient();
  this.connected = false;
  this.options   = options;

  if (this.options.hasOwnProperty('user')) {
    if (!this.options.hasOwnProperty('username')) {
      this.options.username = this.options.user;
    }

    delete this.options.user;
  }

  if (this.options.hasOwnProperty('pass')) {
    if (!this.options.hasOwnProperty('password')) {
      this.options.password = this.options.pass;
    }

    delete this.options.pass;
  }

  this.client.on('error', this.emit.bind(this, 'error'));
}

util.inherits(SFTPClient, events.EventEmitter);

SFTPClient.prototype.connect = function (callback) {
  var self = this;

  return new Promise(function (resolve, reject) {
    self.client.on('error', reject);

    self.client.on('ready', function () {
      self.client.sftp(function (error, sftp) {
        self.client.removeListener('error', reject);

        if (error) {
          self.client.end();
          return reject(error);
        }

        self.sftp      = Promise.promisifyAll(sftp, {promisifier: simplePromisifier});
        self.connected = true;

        return resolve();
      });
    });

    self.client.connect(self.options);
  }).asCallback(callback);
};

SFTPClient.prototype.isConnected = function () {
  return this.connected;
};

SFTPClient.prototype.checkConnection = function () {
  return this.isConnected() ? Promise.resolve() : Promise.reject(new Error('SFTP client not connected'));
};

SFTPClient.prototype.supportsStreams = function () {
  return true;
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
  return this.checkConnection().bind(this).then(function () {
    return this.sftp.fastGetAsync(remote, local);
  }).asCallback(callback);
};

SFTPClient.prototype.mkdir = function (path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  return this.checkConnection().bind(this).then(function () {
    return this.sftp.mkdirAsync(path, options);
  }).asCallback(callback);
};

SFTPClient.prototype.put = function (local, remote, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  return this.checkConnection().bind(this).then(function () {
    return this.sftp.fastPutAsync(local, remote, options);
  }).asCallback(callback);
};

SFTPClient.prototype.readdir = function (path, callback) {
  return this.checkConnection().bind(this).then(function () {
    return this.sftp.readdirAsync(path).then(function (files) {
      return files.map(function (file) {
        return file.filename;
      });
    });
  }).asCallback(callback);
};

SFTPClient.prototype.rmdir = function (path, callback) {
  return this.checkConnection().bind(this).then(function () {
    return this.sftp.rmdirAsync(path);
  }).asCallback(callback);
};

SFTPClient.prototype.unlink = function (path, callback) {
  return this.checkConnection().bind(this).then(function () {
    return this.sftp.unlinkAsync(path);
  }).asCallback(callback);
};

SFTPClient.prototype.disconnect = function () {
  if (this.connected === true) {
    this.client.end();
    this.connected = false;
  }

  return null;
};

module.exports = SFTPClient;
