'use strict';

var webdavd   = require('test/integration/utils/webdavd');
var scenarios = require('test/integration/scenarios');

var transfer = require('lib/file-transfer');

describe('WebDAV', function () {

  var instances = {
    server: null,
    client: null
  };

  before('start the server', function (done) {
    webdavd({
      username: 'foo',
      password: 'bar'
    }, function (error, _server) {
      if (error) {
        return done(error);
      }

      instances.server = _server;

      instances.server.listen(20001, '127.0.0.1', done);
    });
  });

  before('connect to the server', function (done) {
    transfer.connect('webdav', {
      host:     '127.0.0.1',
      port:     20001,
      username: 'foo',
      password: 'bar'
    }, function (err, _client) {
      if (err) {
        return done(err);
      }

      instances.client = _client;

      return done();
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
