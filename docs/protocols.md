# Protocols

## Summary

* [SFTP](#sftp)
* [FTP](#ftp)
* [WebDAV](#webdav)

## SFTP

#### Specific options

SFTP client use the [`ssh2` module]() behind, so SFTP specific options are in fact `ssh2` options.

---

##### [Client constructor](client.md#client-constructor)

```js
new Client(options) -> Client
```

See [`Client.connect()` parameters from `ssh2` module](https://www.npmjs.com/package/ssh2#client-methods).

**Note:** When using alternative authentication methods (eg private key authentication), the `pass`/`password` option is no longer required.

---

##### [createReadStream](client.md#createreadstream)

```js
client.createReadStream(path, options) -> Readable
```

See [`options` parameter from `SFTPStream.createReadStream()` method](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md#sftpstream-methods).

---

##### [createWriteStream](client.md#createwritestream)

```js
client.createWriteStream(path, options) -> Writable
```

See [`options` parameter from `SFTPStream.createWriteStream()` method](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md#sftpstream-methods).

---

##### [mkdir](client.md#mkdir)

```js
client.mkdir(path, options) -> Promise
```

See [`attributes` parameters from `SFTPStream.mkdir()` method](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md#sftpstream-methods).

---

##### [put](client.md#put)

```js
client.put(local, remote, options) -> Promise
```

See [`options` parameter from `SFTPStream.fastPut()` method](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md#sftpstream-methods).

---

#### Additional methods

SFTP Client has no Additional methods.

[▲ Back to top](#protocols)

## FTP

#### Specific options

---

##### [Client constructor](client.md#client-constructor)

```js
new Client(options) -> Client
```

See [`connect()` parameters from `ftp` module](https://www.npmjs.com/package/ftp#methods).

---

##### [createReadStream](client.md#createreadstream)

```js
client.createReadStream(path, options) -> Readable
```

Method not supported by FTP Client.

---

##### [createWriteStream](client.md#createwritestream)

```js
client.createWriteStream(path, options) -> Writable
```

Method not supported by FTP Client.

---

##### [mkdir](client.md#mkdir)

```js
client.mkdir(path, options) -> Promise
```

No specific options, the `options` parameter will be ignored.

---

##### [put](client.md#put)

```js
client.put(local, remote, options) -> Promise
```

No specific options, the `options` parameter will be ignored.

---

#### Additional methods

FTP Client has no Additional methods.

[▲ Back to top](#protocols)

## WebDAV

#### Specific options

##### [Client constructor](client.md#client-constructor)

```js
new Client(options) -> Client
```

| Option | Type(s)  | Required | Description                                                                                   |
| ------ | -------- | -------- | --------------------------------------------------------------------------------------------- |
| `path` | `string` | No       | Base path for WebDAV requests (`{options.host}:{options.port}/{options.path}/{request path}`) |

---

##### [createReadStream](client.md#createreadstream)

```js
client.createReadStream(path, options) -> Readable
```

No specific options, the `options` parameter will be ignored.

---

##### [createWriteStream](client.md#createwritestream)

```js
client.createWriteStream(path, options) -> Writable
```

No specific options, the `options` parameter will be ignored.

---

##### [mkdir](client.md#mkdir)

```js
client.mkdir(path, options) -> Promise
```

No specific options, the `options` parameter will be ignored.

---

##### [put](client.md#put)

```js
client.put(local, remote, options) -> Promise
```

No specific options, the `options` parameter will be ignored.

---

#### Additional methods

##### request

> Send a WebDAV request.

###### Usage

```js
client.request(method, remotePath, body, callback) -> request
```

(See [`request` from request module](https://www.npmjs.com/package/request) for more informations on the return value)

###### Parameters

| Parameter    | Type(s)                          | Required | Default | Description                                            |
| ------------ | -------------------------------- | -------- | --------| ------------------------------------------------------ |
| `method`     | `string`, `object`               | **Yes**  |         | WebDAV method (`GET`, `MKCOL`, ...) or request options |
| `remotePath` | `string`                         | **Yes**  |         | Request path                                           |
| `body`       | `string`, `Buffer`, `ReadStream` | No       |         | Request body                                           |
| `callback`   | `function`                       | No       | `{}`    | Request callback                                       |

For more informations on request options and callback, see the [request module documentation](https://www.npmjs.com/package/request#requestoptions-callback).

---

##### requestAsync

> Send a WebDAV request with a Promise interface.

###### Usage

```js
client.requestAsync(method, remotePath, body) -> Promise
```

###### Parameters

| Parameter    | Type(s)                          | Required | Default | Description                                            |
| ------------ | -------------------------------- | -------- | --------| ------------------------------------------------------ |
| `method`     | `string`, `object`               | **Yes**  |         | WebDAV method (`GET`, `MKCOL`, ...) or request options |
| `remotePath` | `string`                         | **Yes**  |         | Request path                                           |
| `body`       | `string`, `Buffer`, `ReadStream` | No       |         | Request body                                           |

For more informations on request options, see the [request module documentation](https://www.npmjs.com/package/request#requestoptions-callback).

###### Return value

An `Array` containing 2 elements:
* An `http.IncomingMessage` object
* The response body (`string` or `Buffer`, or JSON object if the `json` option is supplied)

[▲ Back to top](#protocols)
