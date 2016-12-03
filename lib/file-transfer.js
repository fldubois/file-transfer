'use strict';

var Promise = require('bluebird');

var clients = {
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

  return new Promise(function (resolve, reject) {
    var key = protocol.toLowerCase();

    if (!clients.hasOwnProperty(key)) {
      return reject(new Error('Unknown file transfer protocol: ' + protocol));
    }

    var client = new clients[key](options);

    client.once('ready', function () {
      client.removeListener('error', reject);
      return resolve(client);
    });

    client.once('error', reject);

    client.connect();
  }).asCallback(callback);
};
