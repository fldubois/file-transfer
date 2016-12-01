'use strict';

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Delete a file', function () {

    before('add files to server', function () {
      instances.server.fs.set('path/to/file.txt', new Buffer('Hello, world !', 'utf8'));
    });

    it('should delete the file', function (done) {
      var path = 'path/to/file.txt';

      instances.client.unlink(path, function (error) {
        if (error) {
          return done(error);
        }

        expect(instances.server.fs.get(path)).to.equal(null);

        return done();
      });
    });

    it('should return errors', function (done) {
      instances.client.rmdir('path/to/missing/file.txt', function (error) {
        expect(error).to.be.an('error');

        return done();
      });
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
