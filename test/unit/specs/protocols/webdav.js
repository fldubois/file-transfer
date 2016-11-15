'use strict';

var chai   = require('chai');
var expect = chai.expect;
var nock   = require('nock');

var WebDAVClient = require('lib/protocols/webdav');

var options = {
  baseURL:     'http://www.example.com/webdav',
  credentials: {
    user: 'john',
    pass: '117'
  }
};

describe('protocols/webdav', function () {

  before('disable unmocked HTTP requests', function () {
    nock.disableNetConnect();
  });

  beforeEach(function () {
    nock.cleanAll();
  });

  it('should expose common client interface', function () {
    expect(WebDAVClient).to.be.a('function');
    expect(WebDAVClient).to.respondTo('connect');
    expect(WebDAVClient).to.respondTo('disconnect');
  });

  describe('connect()', function () {

    it('should check WebDAV connectivity with an OPTIONS request', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        expect(scope.isDone()).to.equal(true);

        return done();
      });

      webdav.once('error', function (error) {
        return done(error);
      });

      webdav.connect();
    });

    it('should emit an error on OPTIONS request error', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(401);

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        return done(new Error('connect() succeed with OPTIONS request error'));
      });

      webdav.once('error', function (error) {
        expect(scope.isDone()).to.equal(true);

        expect(error).to.be.an('error');

        expect(error.message).to.equal('WebDAV request error');
        expect(error.statusCode).to.equal(401);
        expect(error.statusMessage).to.equal('Unauthorized');

        return done();
      });

      webdav.connect();
    });

    it('should emit an error on request failure', function (done) {
      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        return done(new Error('connect() succeed with OPTIONS request error'));
      });

      webdav.once('error', function (error) {
        expect(error.message).to.equal('Nock: Not allow net connect for "www.example.com:80/webdav"');

        return done();
      });

      webdav.connect();
    });

  });

});
