'use strict';

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Stream functions', function () {

    before('add files to server', function () {
      instances.server.fs.set('path/to/file.txt', new Buffer('Hello, world !', 'utf8'));
    });

    it('should create read stream', function (done) {
      if (!instances.client.supportsStreams()) {
        this.skip();
      }

      var stream = instances.client.createReadStream('path/to/file.txt');

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

    it('should create write stream', function (done) {
      if (!instances.client.supportsStreams()) {
        this.skip();
      }

      var filepath = 'path/to/file-new.txt';

      var stream = instances.client.createWriteStream(filepath);

      stream.on('finish', function () {
        expect(Buffer.isBuffer(instances.server.fs.get(filepath))).to.equal(true);
        expect(instances.server.fs.get(filepath).toString()).to.equal('Hello, friend.');

        return done();
      });

      stream.end('Hello, friend.', 'utf8');
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
