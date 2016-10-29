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

  before('create the local file', function (done) {
    fs.writeFile(local, 'Hello, world !', 'utf8', done);
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

  it('should upload the file', function (done) {
    client.put(local, remote, done);
  });

  it('should write the file on server', function () {
    expect(server.files).to.include.keys(remote);
    expect(server.files[remote].toString()).to.equal('Hello, world !');
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
