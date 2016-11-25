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

    it('should create a directory with the right permissions', function (done) {
      var path = 'path/to/dir/B';

      instances.client.mkdir(path, '700', function (error) {
        if (error) {
          return done(error);
        }

        expect(instances.server.fs.get(path)).to.be.an('object');
        expect(instances.server.fs.get(path)['.']).to.be.an('object');
        expect(instances.server.fs.get(path)['.'].mode).to.equal(parseInt('700', 8));

        return done();
      });
    });

    it('should return errors', function (done) {
      var path = 'path/to/dir/A';

      instances.client.mkdir(path, function (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('EEXIST, mkdir \'path/to/dir/A\'');

        return done();
      });
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
