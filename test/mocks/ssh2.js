'use strict';

var events = require('events');
var util   = require('util');

var sinon = require('sinon');

var errors = {};

/* SFTPStream mock */

function SFTPStreamMock() {
  sinon.spy(this, 'createReadStream');
  sinon.spy(this, 'createWriteStream');
}

SFTPStreamMock.prototype.createReadStream = function () {
  return null;
};

SFTPStreamMock.prototype.createWriteStream = function () {
  return null;
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
