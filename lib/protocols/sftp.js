'use strict';

var events = require('events');
var util   = require('util');

var SSHClient = require('ssh2').Client;

function SFTPClient(options) {
  this.options = options;
}

util.inherits(SFTPClient, events.EventEmitter);

SFTPClient.prototype.connect = function () {
  var self = this;

  self.client = new SSHClient();

  self.client.on('ready', function () {
    self.client.sftp(function (error, sftp) {
      if (error) {
        self.client.end();
        self.emit('error', error);
      } else {
        self.sftp = sftp;
        self.emit('ready');
      }
    });
  });

  self.client.on('error', function (error) {
    self.emit('error', error);
  });

  self.client.connect(self.options);
};

SFTPClient.prototype.createReadStream = function (path, options) {
  if (typeof options === 'object' && options.hasOwnProperty('handle')) {
    delete options.handle;
  }

  return this.sftp.createReadStream(path, options);
};

SFTPClient.prototype.disconnect = function () {
  this.client.end();
};

module.exports = SFTPClient;
