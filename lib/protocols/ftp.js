'use strict';

var events = require('events');
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

FTPClient.prototype.disconnect = function () {
  if (this.connected === true) {
    this.client.end();
    this.connected = false;
  }

  return null;
};

module.exports = FTPClient;
