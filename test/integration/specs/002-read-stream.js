'use strict';

var expect = require('chai').expect;

var sftpd = require('test/integration/utils/sftpd');

var transfer = require('lib/file-transfer');

describe('Scenario: Read file with a stream', function () {

  var server = null;
  var client = null;
  var stream = null;

  before('start the server', function (done) {
    sftpd({
      username: 'foo',
      password: 'bar',
      files:    {
        'path/to/file.txt': new Buffer('Hello, world !', 'utf8')
      }
    }, function (error, _server) {
      if (error) {
        return done(error);
      }

      server = _server;

      server.listen(20000, '127.0.0.1', done);
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

  it('should create a read stream', function (done) {
    stream = client.createReadStream('path/to/file.txt');

    var content = '';

    stream.on('data', function (data) {
      content += data.toString();
    });

    stream.on('error', function (error) {
      return done(error);
    });

    stream.on('end', function () {
      expect(content).to.equal('Hello, world !');
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
