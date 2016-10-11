'use strict';

var events = require('events');
var util   = require('util');

var sinon = require('sinon');

var errors = {};

function ClientMock(options) {
  this.options = options;

  sinon.spy(this, 'connect');
  sinon.spy(this, 'sftp');
  sinon.spy(this, 'end');
}

util.inherits(ClientMock, events.EventEmitter);

ClientMock.prototype.connect = function (options) {
  if (errors.hasOwnProperty('connect')) {
    this.emit('error', errors.connect);
  } else {
    this.emit('ready');
  }

};

ClientMock.prototype.sftp = function(callback) {
  if (errors.hasOwnProperty('sftp')) {
    return callback(errors.sftp);
  }

  return callback(null, {});
};

ClientMock.prototype.end = function() {
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
