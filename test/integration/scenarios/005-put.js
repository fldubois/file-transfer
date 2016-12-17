'use strict';

var fs = require('fs');
var os = require('os');

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Put a file', function () {

    var remote = 'path/to/file.txt';
    var local  = os.tmpdir() + '/file-' + Date.now() + '.txt';

    before('create the local file', function (done) {
      fs.writeFile(local, 'Hello, world !', 'utf8', done);
    });

    it('should upload the file', function (done) {
      instances.client.put(local, remote, done);
    });

    it('should write the file on server', function () {
      expect(Buffer.isBuffer(instances.server.fs.get(remote))).to.equal(true);
      expect(instances.server.fs.get(remote).toString()).to.equal('Hello, world !');
    });

    it('should return errors', function (done) {
      instances.client.put('path/to/missing/file.txt', remote, function (error) {
        expect(error).to.be.an('error');
        expect(error.code).to.equal('ENOENT');

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
