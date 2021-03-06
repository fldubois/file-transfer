'use strict';

var Promise = require('bluebird');

var clients = {
  ftp:    require('./protocols/ftp'),
  sftp:   require('./protocols/sftp'),
  webdav: require('./protocols/webdav')
};

module.exports = {
  clients: clients
};

module.exports.connect = function (protocol, options, callback) {
  if (typeof protocol === 'object') {
    callback = options;
    options  = protocol;
    protocol = options.protocol;

    delete options.protocol;
  }

  var key = protocol.toLowerCase();

  if (!clients.hasOwnProperty(key)) {
    return Promise.reject(new Error('Unknown file transfer protocol: ' + protocol)).asCallback(callback);
  }

  var client = new clients[key](options);

  return client.connect().thenReturn(client).asCallback(callback);
};

module.exports.disposer = function (protocol, options) {
  return module.exports.connect(protocol, options).disposer(function (client) {
    client.disconnect();
  });
};
