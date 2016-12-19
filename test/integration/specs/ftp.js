'use strict';

var ftpd      = require('test/integration/utils/ftpd');
var scenarios = require('test/integration/scenarios');

var transfer = require('lib/file-transfer');

describe('FTP', function () {

  var instances = {
    server: null,
    client: null
  };

  before('start the server', function (done) {
    ftpd({
      username: 'foo',
      password: 'bar'
    }, function (error, _server) {
      if (error) {
        return done(error);
      }

      instances.server = _server;

      instances.server.listen(20000, '127.0.0.1', done);
    });
  });

  before('connect to the server', function () {
    return transfer.connect('ftp', {
      host:     '127.0.0.1',
      port:     20000,
      username: 'foo',
      password: 'bar'
    }).then(function (_client) {
      instances.client = _client;
    });
  });

  scenarios.forEach(function (scenario) {
    scenario(instances);
  });

  after('disconnect from the server', function () {
    instances.client.disconnect();
  });

  after('close the server', function (done) {
    instances.server.close(done);
  });

});
