'use strict';

var expect = require('chai').expect;

var sftpd     = require('test/integration/utils/sftpd');
var scenarios = require('test/integration/scenarios')

var transfer = require('lib/file-transfer');

describe('SFTP', function () {

  var instances = {
    server: null,
    client: null
  };

  before('start the server', function (done) {
    sftpd({
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

  before('connect to the server', function (done) {
    transfer.connect('sftp', {
      host:     '127.0.0.1',
      port:     20000,
      username: 'foo',
      password: 'bar'
    }, function (err, _client) {
      if (err) {
        return done(err);
      }

      instances.client = _client;

      expect(instances.server.clients.length).to.equal(1);

      return done();
    });
  });

  scenarios.forEach(function (scenario) {
    scenario(instances);
  });

  after('disconnect from the server', function (done) {
    instances.client.disconnect();

    setTimeout(function () {
      expect(instances.server.clients.length).to.equal(0);
      return done();
    }, 25);
  });

  after('close the server', function (done) {
    instances.server.close(done);
  });

});
