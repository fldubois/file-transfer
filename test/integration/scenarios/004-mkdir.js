'use strict';

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Create a directory', function () {

    it('should create a directory', function (done) {
      var path = 'path/to/dir/A';

      instances.client.mkdir(path, function (error) {
        if (error) {
          return done(error);
        }

        expect(instances.server.fs.get(path)).to.be.an('object');
        expect(instances.server.fs.get(path)['.']).to.be.an('object');

        return done();
      });
    });

    it('should return errors', function (done) {
      var path = 'path/to/dir/A';

      instances.client.mkdir(path, function (error) {
        expect(error).to.be.an('error');

        return done();
      });
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
