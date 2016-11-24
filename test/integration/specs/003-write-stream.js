'use strict';

var expect = require('chai').expect;

var sftpd = require('test/integration/utils/sftpd');

var transfer = require('lib/file-transfer');

describe('Scenario: Write file with a stream', function () {

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

  before('add files to server', function () {
    server.fs.set('path/to/existing/file.txt', new Buffer('Hello, world !', 'utf8'));
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

  it('should create a write stream', function (done) {
    var filepath = 'path/to/file.txt';

    var stream = client.createWriteStream(filepath);

    stream.write('Hello, ', 'utf8', function (error) {
      if (error) {
        return done(error);
      }

      stream.end('friend.', 'utf8', function (error) {
        if (error) {
          return done(error);
        }

        expect(server.fs.get(filepath)).to.be.an('object');
        expect(server.fs.get(filepath).toString()).to.equal('Hello, friend.');

        return done();
      });
    });
  });

  it('should return errors', function (done) {
    var stream = client.createWriteStream('path/to/existing/file.txt', {flags: 'wx'});

    stream.on('error', function (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.equal('EEXIST, open \'path/to/existing/file.txt\'');

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
