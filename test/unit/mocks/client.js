'use strict';

var events = require('events');
var util   = require('util');

var sinon = require('sinon');

function ClientMock(options) {
  this.options = options;

  sinon.spy(this, 'connect');
}

util.inherits(ClientMock, events.EventEmitter);

ClientMock.prototype.connect = function () {
  if (this.options.hasOwnProperty('errors') && this.options.errors.hasOwnProperty('connect')) {
    this.emit('error', new Error(this.options.errors.connect));
  } else {
    this.emit('ready');
  }
};

module.exports = ClientMock;
