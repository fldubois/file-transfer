'use strict';

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Write file with a stream', function () {

    before('add files to server', function () {
      instances.server.fs.set('path/to/existing/file.txt', new Buffer('Hello, world !', 'utf8'));
    });

    it('should create a write stream', function (done) {
      if (!instances.client.supportsStreams()) {
        this.skip();
      }

      var filepath = 'path/to/file.txt';

      var stream = instances.client.createWriteStream(filepath);

      stream.on('finish', function () {
        expect(Buffer.isBuffer(instances.server.fs.get(filepath))).to.equal(true);
        expect(instances.server.fs.get(filepath).toString()).to.equal('Hello, friend.');

        return done();
      });

      stream.end('Hello, friend.', 'utf8');
    });

    it('should return errors', function (done) {
      if (!instances.client.supportsStreams()) {
        this.skip();
      }

      var stream = instances.client.createWriteStream('path/to/existing/file.txt', {flags: 'wx'});

      stream.on('error', function (error) {
        expect(error).to.be.an('error');

        return done();
      });
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
