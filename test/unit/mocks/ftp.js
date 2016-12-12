'use strict';

var events = require('events');
var util   = require('util');

var sinon = require('sinon');

var PassThrough = require('stream').PassThrough;

var errors = {};

function ClientMock(options) {
  this.options = options;

  sinon.spy(this, 'connect');
  sinon.spy(this, 'get');
  sinon.spy(this, 'put');
  sinon.spy(this, 'mkdir');
  sinon.spy(this, 'list');
  sinon.spy(this, 'rmdir');
  sinon.spy(this, 'delete');
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

ClientMock.prototype.get = function (path, callback) {
  if (errors.hasOwnProperty('get')) {
    return callback(errors.get);
  }

  var stream = new PassThrough();

  stream.end('Hello, friend.');

  return callback(null, stream);
};

ClientMock.prototype.put = function (local, remote, callback) {
  return callback(errors.hasOwnProperty('put') ? errors.put : null);
};

ClientMock.prototype.mkdir = function (path, callback) {
  return callback(errors.hasOwnProperty('mkdir') ? errors.mkdir : null);
};

ClientMock.prototype.list = function (path, callback) {
  if (errors.hasOwnProperty('list')) {
    return callback(errors.list);
  }

  return callback(null, [
    {name: 'file1'},
    {name: 'file2'},
    {name: 'file3'},
    {name: 'file4'},
    {name: 'file5'},
    {name: 'file6'}
  ]);
};

ClientMock.prototype.rmdir = function (path, callback) {
  return callback(errors.hasOwnProperty('rmdir') ? errors.rmdir : null);
};

ClientMock.prototype.delete = function (path, callback) {
  return callback(errors.hasOwnProperty('delete') ? errors.delete : null);
};

ClientMock.prototype.end = function () {
  return null;
};

ClientMock.setError = function (method, error) {
  errors[method] = error;
};

ClientMock.clear = function () {
  errors = {};
};

module.exports = ClientMock;
