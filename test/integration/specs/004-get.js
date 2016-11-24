'use strict';

var fs = require('fs');
var os = require('os');

var expect = require('chai').expect;

var sftpd = require('test/integration/utils/sftpd');

var transfer = require('lib/file-transfer');

describe('Scenario: Get a file', function () {

  var server = null;
  var client = null;

  var remote = 'path/to/file.txt';
  var local  = os.tmpdir() + '/file-' + Date.now() + '.txt';

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

  before('add files to server', function () {
    server.fs.set('path/to/file.txt', new Buffer('Hello, world !', 'utf8'));
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

  it('should download the file', function (done) {
    client.get(remote, local, done);
  });

  it('should write the file locally', function (done) {
    fs.readFile(local, 'utf8', function (error, content) {
      if (error) {
        return done(error);
      }

      expect(content).to.equal('Hello, world !');

      return done();
    });
  });

  it('should return errors', function (done) {
    client.get('path/to/missing/file.txt', local, function (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.equal('No such file or directory');

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

  after('delete the local file', function (done) {
    fs.unlink(local, function () {
      return done();
    });
  });

  after('close the server', function (done) {
    server.close(done);
  });

});
