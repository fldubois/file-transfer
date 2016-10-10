'use strict';

var clients = {
  sftp: require('./protocols/sftp')
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
    return callback(new Error('Unknown file transfer protocol: ' + protocol));
  }

  var client = new clients[key](options);

  client.once('ready', function () {
    client.removeListener('error', callback);
    return callback(null, client);
  });

  client.once('error', callback);

  client.connect();
};
