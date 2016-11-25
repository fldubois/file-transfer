'use strict';

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: List files of a directory', function () {

    var directory = [
      'fileA.txt',
      'fileB.js',
      'fileC.txt'
    ];

    before('add files to server', function (done) {
      instances.server.fs.mkdir('path/to/dir', function (error) {
        if (error) {
          return done(error);
        }

        instances.server.fs.set('path/to/dir/fileA.txt', new Buffer(0));
        instances.server.fs.set('path/to/dir/fileB.js',  new Buffer(0));
        instances.server.fs.set('path/to/dir/fileC.txt', new Buffer(0));

        return done();
      });
    });

    it('should list files of a directory', function (done) {
      instances.client.readdir('path/to/dir', function (error, files) {
        if (error) {
          return done(error);
        }

        expect(files).to.deep.equal(directory);

        return done();
      });
    });

    it('should return errors', function (done) {
      instances.client.readdir('path/to/missing/dir', function (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('No such file or directory');

        return done();
      });
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
