'use strict';

var os = require('os');
var fs = require('fs');

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

  describe('createReadStream()', function () {

    it('should return a read stream', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(200, 'Hello, friend.');

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        var stream  = webdav.createReadStream('file.txt');
        var content = '';

        stream.on('data', function (data) {
          content += data.toString();
        });

        stream.on('error', done);

        stream.on('end', function () {
          expect(scope.isDone()).to.equal(true);
          expect(content).to.equal('Hello, friend.');
          return done();
        });
      });

      webdav.once('error', function (error) {
        return done(error);
      });

      webdav.connect();
    });

    it('should return an error on request error', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(404);

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        var stream = webdav.createReadStream('file.txt');

        stream.on('data', function () {
          return done(new Error('Read stream created with request error'));
        });

        stream.on('error', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(404);
          expect(error.statusMessage).to.equal('Not Found');

          return done();
        });

        stream.on('end', function () {
          return done(new Error('Read stream created with request error'));
        });
      });

      webdav.connect();
    });

  });

  describe('createWriteStream()', function () {

    it('should return a read stream', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(options.credentials)
        .reply(200);

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        var stream  = webdav.createWriteStream('file.txt');

        stream.on('error', done);

        stream.on('end', function () {
          expect(scope.isDone()).to.equal(true);
          return done();
        });

        stream.end('Hello, friend.', 'utf8');
      });

      webdav.once('error', done);

      webdav.connect();
    });

    it('should return an error on request error', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(401);

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        var stream = webdav.createWriteStream('file.txt');

        stream.on('error', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(401);
          expect(error.statusMessage).to.equal('Unauthorized');

          return done();
        });
      });

      webdav.connect();
    });

  });

  describe('get()', function () {

    it('should download the file', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(200, 'Hello, friend.');

      var webdav = new WebDAVClient(options);
      var path   = os.tmpdir() + '/' + Date.now() + '.txt';

      webdav.once('ready', function () {
        webdav.get('file.txt', path, function (error) {
          if (error) {
            return done(error);
          }

          fs.readFile(path, 'utf8', function (error, content) {
            if (error) {
              return done(error);
            }

            expect(scope.isDone()).to.equal(true);
            expect(content).to.equal('Hello, friend.');

            fs.unlink(path, done);
          });
        });
      });

      webdav.once('error', function (error) {
        return done(error);
      });

      webdav.connect();
    });

    it('should return an error on request error', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(404);

      var webdav = new WebDAVClient(options);
      var path   = os.tmpdir() + '/' + Date.now() + '.txt';

      webdav.once('ready', function () {
        webdav.get('file.txt', path, function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(404);
          expect(error.statusMessage).to.equal('Not Found');

          return done();
        });
      });

      webdav.connect();
    });

  });

  describe('mkir()', function () {

    it('should send a MKCOL request', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(options.credentials)
        .reply(201);

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        webdav.mkdir('path/to/directory', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      });

      webdav.once('error', function (error) {
        return done(error);
      });

      webdav.connect();
    });

    it('should return an error on request error', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(options.credentials)
        .reply(400);

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        webdav.mkdir('path/to/directory', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      });

      webdav.once('error', function (error) {
        return done(error);
      });

      webdav.connect();
    });

  });

  describe('put()', function () {

    it('should upload the file', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(options.credentials)
        .reply(200);

      var webdav = new WebDAVClient(options);
      var path   = os.tmpdir() + '/' + Date.now() + '.txt';

      fs.writeFile(path, 'Hello, friend.', 'utf8', function (error) {
        if (error) {
          return done(error);
        }

        webdav.once('ready', function () {
          webdav.put(path, 'file.txt', function (error) {
            if (error) {
              return done(error);
            }

            expect(scope.isDone()).to.equal(true);

            fs.unlink(path, done);
          });
        });

        webdav.once('error', function (error) {
          return done(error);
        });

        webdav.connect();
      });
    });

    it('should return an error on request error', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(options.credentials)
        .reply(400);

      var webdav = new WebDAVClient(options);
      var path   = os.tmpdir() + '/' + Date.now() + '.txt';

      fs.writeFile(path, 'Hello, friend.', 'utf8', function (error) {
        if (error) {
          return done(error);
        }

        webdav.once('ready', function () {
          webdav.put(path, 'file.txt', function (error) {
            expect(scope.isDone()).to.equal(true);

            expect(error).to.be.an('error');
            expect(error.message).to.equal('WebDAV request error');
            expect(error.statusCode).to.equal(400);
            expect(error.statusMessage).to.equal('Bad Request');

            fs.unlink(path, done);
          });
        });

        webdav.once('error', function (error) {
          return done(error);
        });

        webdav.connect();
      });
    });

  });

  describe('readdir()', function () {

    it('should return a list of filenames', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(options.credentials)
        .reply(200, [
          '<?xml version="1.0" encoding="utf-8"?>',
          '<D:multistatus xmlns:D="DAV:">',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/</D:href>',
          '  </D:response>',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/</D:href>',
          '  </D:response>',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/subdir/</D:href>',
          '  </D:response>',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/file1.txt</D:href>',
          '  </D:response>',
          '  <D:response xmlns:lp2="http://apache.org/dav/props/" xmlns:lp1="DAV:">',
          '    <D:href>/webdav/dir/file2.txt</D:href>',
          '  </D:response>',
          '</D:multistatus>'
        ].join('\n'));

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        webdav.readdir('dir', function (error, files) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          expect(files).to.be.an('array');
          expect(files).to.deep.equal(['subdir', 'file1.txt', 'file2.txt']);

          return done();
        });
      });

      webdav.once('error', function (error) {
        return done(error);
      });

      webdav.connect();
    });

    it('should return an error on request error', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(options.credentials)
        .reply(400);

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        webdav.readdir('dir', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      });

      webdav.once('error', function (error) {
        return done(error);
      });

      webdav.connect();
    });

    it('should return an error on bad XML response', function (done) {
      nock('http://www.example.com')
        .intercept('/webdav', 'OPTIONS')
        .basicAuth(options.credentials)
        .reply(200);

      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(options.credentials)
        .reply(200, 'Not an XML');

      var webdav = new WebDAVClient(options);

      webdav.once('ready', function () {
        webdav.readdir('dir', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message.split('\n')[0]).to.equal('Non-whitespace before first tag.');

          return done();
        });
      });

      webdav.once('error', function (error) {
        return done(error);
      });

      webdav.connect();
    });

  });

});
