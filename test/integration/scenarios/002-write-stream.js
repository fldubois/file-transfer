'use strict';

var expect = require('chai').expect;

module.exports = function (instances) {

  describe('Scenario: Write file with a stream', function () {

    before('add files to server', function () {
      instances.server.fs.set('path/to/existing/file.txt', new Buffer('Hello, world !', 'utf8'));
    });

    it('should create a write stream', function (done) {
      var filepath = 'path/to/file.txt';

      var stream = instances.client.createWriteStream(filepath);

      stream.write('Hello, ', 'utf8', function (error) {
        if (error) {
          return done(error);
        }

        stream.end('friend.', 'utf8', function (error) {
          if (error) {
            return done(error);
          }

          expect(instances.server.fs.get(filepath)).to.be.an('object');
          expect(instances.server.fs.get(filepath).toString()).to.equal('Hello, friend.');

          return done();
        });
      });
    });

    it('should return errors', function (done) {
      var stream = instances.client.createWriteStream('path/to/existing/file.txt', {flags: 'wx'});

      stream.on('error', function (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('EEXIST, open \'path/to/existing/file.txt\'');

        return done();
      });
    });

    after('delete the remote files', function (done) {
      instances.server.fs.rmdir('path', done);
    });

  });

};
