'use strict';

var fs = require('fs');
var os = require('os');

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Get a file', function () {

    var remote = 'path/to/file.txt';
    var local  = os.tmpdir() + '/file-' + Date.now() + '.txt';

    before('add files to server', function () {
      instances.server.fs.set('path/to/file.txt', new Buffer('Hello, world !', 'utf8'));
    });

    it('should download the file', function (done) {
      instances.client.get(remote, local, done);
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
      instances.client.get('path/to/missing/file.txt', local, function (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('No such file or directory');

        return done();
      });
    });

    after('delete the local file', function (done) {
      fs.unlink(local, done);
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
