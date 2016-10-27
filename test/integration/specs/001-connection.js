'use strict';

var expect = require('chai').expect;

var sftpd = require('test/integration/utils/sftpd');

var transfer = require('lib/file-transfer');

describe('Scenario: Connection', function () {

  var server = null;
  var client = null;

  before('start the server', function (done) {
    sftpd({
      username: 'foo',
      password: 'bar'
    }, function (error, _server) {
      if (error) {
        return done(error);
      }

      server = _server;

      server.listen(20000, '127.0.0.1', done);
    });
  });

  it('should fail on wrong host', function (done) {
    transfer.connect('sftp', {
      host:     '127.0.0.2',
      port:     20000,
      username: 'foo',
      password: 'bar'
    }, function (err, _client) {
      expect(err).to.be.an('error');
      expect(err.code).to.equal('ECONNREFUSED');

      expect(_client).to.be.an('undefined');

      expect(server.clients.length).to.equal(0);

      return done();
    });
  });

  it('should fail on wrong port', function (done) {
    transfer.connect('sftp', {
      host:     '127.0.0.1',
      port:     20001,
      username: 'foo',
      password: 'bar'
    }, function (err, _client) {
      expect(err).to.be.an('error');
      expect(err.code).to.equal('ECONNREFUSED');

      expect(_client).to.be.an('undefined');

      expect(server.clients.length).to.equal(0);

      return done();
    });
  });

  it('should fail on bad credentials', function (done) {
    transfer.connect('sftp', {
      host:     '127.0.0.1',
      port:     20000,
      username: 'baz',
      password: 'bar'
    }, function (err, _client) {
      expect(err).to.be.an('error');
      expect(err.message).to.equal('All configured authentication methods failed');

      expect(_client).to.be.an('undefined');

      expect(server.clients.length).to.equal(0);

      return done();
    });
  });

  it('should connect to the server', function (done) {
    transfer.connect('sftp', {
      host:     '127.0.0.1',
      port:     20000,
      username: 'foo',
      password: 'bar'
    }, function (err, _client) {
      if (err) {
        return done(err);
      }

      client = _client;

      expect(server.clients.length).to.equal(1);

      return done();
    });
  });

  it('should disconnect to the server', function (done) {
    client.disconnect();

    setTimeout(function () {
      expect(server.clients.length).to.equal(0);
      return done();
    }, 25);
  });

  after('close the server', function (done) {
    server.close(done);
  });

});
