'use strict';

var events = require('events');
var util   = require('util');

var sinon = require('sinon');

var Promise = require('bluebird');

function ClientMock(options) {
  this.options = options;

  sinon.spy(this, 'connect');
  sinon.spy(this, 'disconnect');
}

util.inherits(ClientMock, events.EventEmitter);

ClientMock.prototype.connect = function () {
  if (this.options.hasOwnProperty('errors') && this.options.errors.hasOwnProperty('connect')) {
    return Promise.reject(new Error(this.options.errors.connect));
  }

  return Promise.resolve();
};

ClientMock.prototype.disconnect = function() {
  return null;
};

module.exports = ClientMock;
