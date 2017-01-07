'use strict';

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Directories functions', function () {

    var paths = {
      created: 'path/to/created',
      read:    'path/to/read',
      deleted: 'path/to/deleted'
    };

    var filenames = [
      'fileA.txt',
      'fileB.js',
      'fileC.txt'
    ];

    before('add files to server', function (done) {
      instances.server.fs.mkdir(paths.read, function (error) {
        if (error) {
          return done(error);
        }

        filenames.forEach(function (filename) {
          instances.server.fs.set(paths.read + '/' + filename, new Buffer(0));
        });

        return instances.server.fs.mkdir(paths.deleted, done);
      });
    });

    it('should create a directory', function () {
      return instances.client.mkdir(paths.created).then(function () {
        expect(instances.server.fs.get(paths.created)).to.be.an('object');
        expect(instances.server.fs.get(paths.created)['.']).to.be.an('object');
      });
    });

    it('should list files of a directory', function () {
      return instances.client.readdir(paths.read).then(function (files) {
        expect(files).to.deep.equal(filenames);
      });
    });

    it('should delete a directory', function () {
      instances.client.rmdir(paths.deleted).then(function () {
        expect(instances.server.fs.get(paths.deleted)).to.equal(null);
      });
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
