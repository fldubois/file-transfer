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

function createClient(callback) {
  nock('http://www.example.com')
    .intercept('/webdav/', 'OPTIONS')
    .basicAuth(options.credentials)
    .reply(200);

  var webdav = new WebDAVClient(options);

  webdav.once('ready', function () {
    return callback(null, webdav);
  });

  webdav.once('error', function (error) {
    return callback(error);
  });

  webdav.connect();
}

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
        .intercept('/webdav/', 'OPTIONS')
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
        .intercept('/webdav/', 'OPTIONS')
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
        expect(error.message).to.equal('Nock: Not allow net connect for "www.example.com:80/webdav/"');

        return done();
      });

      webdav.connect();
    });

  });

  describe('createReadStream()', function () {

    it('should return a read stream', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(200, 'Hello, friend.');

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

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
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(404);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

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
    });

  });

  describe('createWriteStream()', function () {

    it('should return a read stream', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(options.credentials)
        .reply(200);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        var stream  = webdav.createWriteStream('file.txt');

        stream.on('error', done);

        stream.on('end', function () {
          expect(scope.isDone()).to.equal(true);
          return done();
        });

        stream.end('Hello, friend.', 'utf8');
      });
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(401);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

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
    });

  });

  describe('get()', function () {

    it('should download the file', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(200, 'Hello, friend.');

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        var path = os.tmpdir() + '/' + Date.now() + '.txt';

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
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(404);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        var path = os.tmpdir() + '/' + Date.now() + '.txt';

        webdav.get('file.txt', path, function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(404);
          expect(error.statusMessage).to.equal('Not Found');

          return done();
        });
      });
    });

  });

  describe('mkdir()', function () {

    it('should send a MKCOL request', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(options.credentials)
        .reply(201);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.mkdir('path/to/directory', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      });
    });

    it('should ignore `mode` parameter', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(options.credentials)
        .reply(201);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.mkdir('path/to/directory', '0775', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      });
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .intercept('/webdav/path/to/directory', 'MKCOL')
        .basicAuth(options.credentials)
        .reply(400);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.mkdir('path/to/directory', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      });
    });

  });

  describe('put()', function () {

    it('should upload the file', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(options.credentials)
        .reply(200);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        var path = os.tmpdir() + '/' + Date.now() + '.txt';

        fs.writeFile(path, 'Hello, friend.', 'utf8', function (error) {
          if (error) {
            return done(error);
          }

          webdav.put(path, 'file.txt', function (error) {
            if (error) {
              return done(error);
            }

            expect(scope.isDone()).to.equal(true);

            fs.unlink(path, done);
          });
        });
      });
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .put('/webdav/file.txt', 'Hello, friend.')
        .basicAuth(options.credentials)
        .reply(400);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        var path = os.tmpdir() + '/' + Date.now() + '.txt';

        fs.writeFile(path, 'Hello, friend.', 'utf8', function (error) {
          if (error) {
            return done(error);
          }

          webdav.put(path, 'file.txt', function (error) {
            expect(scope.isDone()).to.equal(true);

            expect(error).to.be.an('error');
            expect(error.message).to.equal('WebDAV request error');
            expect(error.statusCode).to.equal(400);
            expect(error.statusMessage).to.equal('Bad Request');

            fs.unlink(path, done);
          });
        });
      });
    });

  });

  describe('readdir()', function () {

    it('should return a list of filenames', function (done) {
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

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

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
    });

    it('should emit an error on request bad response', function (done) {
      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(options.credentials)
        .reply(400);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.readdir('dir', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      });
    });

    it('should emit an error on bad XML response', function (done) {
      var headers = {
        'Content-Type': 'text/xml',
        'Depth':        1
      };

      var scope = nock('http://www.example.com', headers)
        .intercept('/webdav/dir', 'PROPFIND')
        .basicAuth(options.credentials)
        .reply(200, 'Not an XML');

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.readdir('dir', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message.split('\n')[0]).to.equal('Non-whitespace before first tag.');

          return done();
        });
      });
    });

  });

  describe('rmdir()', function () {

    it('should delete the WebDAV collection', function (done) {
      var scope = nock('http://www.example.com', {Depth: 'infinity'})
        .delete('/webdav/path/to/directory/')
        .basicAuth(options.credentials)
        .reply(201);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.rmdir('path/to/directory', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      });
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com', {Depth: 'infinity'})
        .delete('/webdav/path/to/directory/')
        .basicAuth(options.credentials)
        .reply(400);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.rmdir('path/to/directory/', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      });
    });

  });

  describe('unlink()', function () {

    it('should delete the WebDAV file', function (done) {
      var scope = nock('http://www.example.com')
        .delete('/webdav/path/to/file.txt')
        .basicAuth(options.credentials)
        .reply(201);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.unlink('path/to/file.txt', function (error) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);

          return done();
        });
      });
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .delete('/webdav/path/to/file.txt')
        .basicAuth(options.credentials)
        .reply(400);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.unlink('path/to/file.txt', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      });
    });

  });

  describe('disconnect()', function () {

    it('should return null', function (done) {
      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        expect(webdav.disconnect()).to.equal(null);

        return done();
      });
    });

  });

  describe('request()', function () {

    it('should return the request instance', function (done) {
      nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(200, 'Hello');

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        var request = webdav.request('GET', 'file.txt');

        expect(request).to.include.keys(['method', 'headers', 'uri', 'httpModule']);

        return done();
      });
    });

    it('should send the HTTP request', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(200, 'Hello');

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.request('GET', 'file.txt', function (error, body) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);
          expect(body).to.equal('Hello');

          return done();
        });
      });
    });

    it('should send the request body', function (done) {
      var scope = nock('http://www.example.com')
        .post('/webdav/file.txt', 'Hello')
        .basicAuth(options.credentials)
        .reply(200, 'World');

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.request('POST', 'file.txt', 'Hello', function (error, body) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);
          expect(body).to.equal('World');

          return done();
        });
      });
    });

    it('should accept request options', function (done) {
      var headers = {
        From: 'me'
      };

      var scope = nock('http://www.example.com', headers)
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(200, 'Hello');

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.request({
          method:  'GET',
          headers: headers
        }, 'file.txt', function (error, body) {
          if (error) {
            return done(error);
          }

          expect(scope.isDone()).to.equal(true);
          expect(body).to.equal('Hello');

          return done();
        });
      });
    });

    it('should emit an error on request bad response', function (done) {
      var scope = nock('http://www.example.com')
        .get('/webdav/file.txt')
        .basicAuth(options.credentials)
        .reply(400);

      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.request('GET', 'file.txt', function (error) {
          expect(scope.isDone()).to.equal(true);

          expect(error).to.be.an('error');
          expect(error.message).to.equal('WebDAV request error');
          expect(error.statusCode).to.equal(400);
          expect(error.statusMessage).to.equal('Bad Request');

          return done();
        });
      });
    });

    it('should emit an error on request failure', function (done) {
      createClient(function (error, webdav) {
        if (error) {
          return done(error);
        }

        webdav.request('GET', 'file.txt', function (error) {
          expect(error.message).to.match(/^Nock: No match for request/);

          return done();
        });
      });
    });

  });

  after('enable unmocked HTTP requests', function () {
    nock.enableNetConnect();
  });

});
