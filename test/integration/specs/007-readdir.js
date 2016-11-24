'use strict';

var expect = require('chai').expect;

var sftpd = require('test/integration/utils/sftpd');

var transfer = require('lib/file-transfer');

describe('Scenario: List files of a directory', function () {

  var server = null;
  var client = null;

  var directory = [
    'fileA.txt',
    'fileB.js',
    'fileC.txt'
  ];

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

  before('add files to server', function (done) {
    server.fs.mkdir('path/to/dir', function (error) {
      if (error) {
        return done(error);
      }

      server.fs.set('path/to/dir/fileA.txt', new Buffer(0));
      server.fs.set('path/to/dir/fileB.js',  new Buffer(0));
      server.fs.set('path/to/dir/fileC.txt', new Buffer(0));

      return done();
    });
  });

  it('should connect to the server', function (done) {
    transfer.connect('sftp', {
      host:     '127.0.0.1',
      port:     20000,
      username: 'foo',
      password: 'bar'
    }, function (error, _client) {
      if (error) {
        return done(error);
      }

      client = _client;

      expect(server.clients.length).to.equal(1);

      return done();
    });
  });

  it('should list files of a directory', function (done) {
    client.readdir('path/to/dir', function (error, files) {
      if (error) {
        return done(error);
      }

      expect(files).to.deep.equal(directory);

      return done();
    });
  });

  it('should return errors', function (done) {
    client.readdir('path/to/missing/dir', function (error) {
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

  after('close the server', function (done) {
    server.close(done);
  });

});
