'use strict';

var events = require('events');
var util   = require('util');

var sinon = require('sinon');

var errors = {};

/* SFTPStream mock */

function SFTPStreamMock() {
  sinon.spy(this, 'createReadStream');
  sinon.spy(this, 'createWriteStream');
  sinon.spy(this, 'readdir');
  sinon.spy(this, 'unlink');
}

SFTPStreamMock.prototype.createReadStream = function () {
  return null;
};

SFTPStreamMock.prototype.createWriteStream = function () {
  return null;
};

SFTPStreamMock.prototype.readdir = function (path, callback) {
  if (errors.hasOwnProperty('readdir')) {
    return callback(errors.readdir);
  }

  return callback(null, [
    {filename: 'file1'},
    {filename: 'file2'},
    {filename: 'file3'},
    {filename: 'file4'},
    {filename: 'file5'},
    {filename: 'file6'}
  ]);
};

SFTPStreamMock.prototype.unlink = function (path, callback) {
  return errors.hasOwnProperty('unlink') ? callback(errors.unlink) : callback(null);
};

/* ssh2 Client mock */

function ClientMock(options) {
  this.options = options;

  sinon.spy(this, 'connect');
  sinon.spy(this, 'sftp');
  sinon.spy(this, 'end');
}

util.inherits(ClientMock, events.EventEmitter);

ClientMock.prototype.connect = function () {
  if (errors.hasOwnProperty('connect')) {
    this.emit('error', errors.connect);
  } else {
    this.emit('ready');
  }
};

ClientMock.prototype.sftp = function (callback) {
  if (errors.hasOwnProperty('sftp')) {
    return callback(errors.sftp);
  }

  return callback(null, new SFTPStreamMock());
};

ClientMock.prototype.end = function () {
  return null;
};

module.exports = {
  Client: ClientMock,

  setError: function (method, error) {
    errors[method] = error;
  },

  clear: function () {
    errors = {};
  }
};
