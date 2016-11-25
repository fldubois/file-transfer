'use strict';

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Delete a directory', function () {

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

    it('should delete the directory', function (done) {
      var path = 'path/to/dir';

      instances.client.rmdir(path, function (error) {
        if (error) {
          return done(error);
        }

        expect(instances.server.fs.get(path)).to.equal(null);

        return done();
      });
    });

    it('should return errors', function (done) {
      instances.client.rmdir('path/to/missing/dir', function (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('No such file or directory');

        return done();
      });
    });

  });

};
