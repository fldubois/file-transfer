'use strict';

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Read file with a stream', function () {

    var stream = null;

    before('add files to server', function () {
      instances.server.fs.set('path/to/file.txt', new Buffer('Hello, world !', 'utf8'));
    });

    it('should create a read stream', function (done) {
      if (!instances.client.supportsStreams()) {
        this.skip();
      }

      stream = instances.client.createReadStream('path/to/file.txt');

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

    it('should return errors', function (done) {
      if (!instances.client.supportsStreams()) {
        this.skip();
      }

      stream = instances.client.createReadStream('path/to/missing/file.txt');

      stream.on('data', function () {
        return done(new Error('Read stream created on missing file'));
      });

      stream.on('error', function (error) {
        expect(error).to.be.an('error');

        return done();
      });

      stream.on('end', function () {
        return done(new Error('Read stream created on missing file'));
      });
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
