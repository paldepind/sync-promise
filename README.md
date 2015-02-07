# SyncPromise

A very small promise implementation with an API close to ECMAScript promises
but without synchronized resolution. This means SyncPromise is incompliant with
the Promises/A+ spec. Specifically part [2.2.4](https://promisesaplus.com/#point-34).

Why
===

Promises makes handling asynchronous operations easier. IndexedDB exposes a lot of
asynchronous operations. Sounds like a great match? Well, no, because the Promises/A+
specification is completely incompatible with the way IndexedDB transactions work.

SyncPromise was created because it's author wanted to use promises inside
IndexedDB transaction for the library
[SyncedDB](https://github.com/paldepind/synceddb) – both internally and in the
user facing API. SyncPromise was extracted from the SyncedDB codebase in the
hope that it whould be of use to others who work directly with IndexedDB.

Features
========

* Weights less than 1KB when minified (not gziped). That's probably the
  smallest promise implementation you're going to find.
* Perfect for including directly inside another library
* Familiar API that is very similair to the native ECMAScript promise API.
* Distributed both as a CommonJS pacakge, AMD module, global export and as a
  version suitable for including directly in other source code.

Beware
======

It is for good reason that the Promises/A+ specification requires asynchronous
resolution! Without care taken one can end up creating promises that are
sometimes synchronous and sometimes asynchronous. That is a _very_ bad idea
that leads to unpredictable non-determined behaviour ([see this post for a
detailed explanation](http://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)).
Take precautions. If, for instance, you always perform an IndexedDB request
inside a promise one can be sure about the order execution and rely on
run-to-completion semantics.

Installation
============

### Node.js/Browserify
```
npm install sync-promise
```
Then:
```javascript
var SyncPromise = require('sync-promise');
```

### Browser
```
bower install sync-promise
```
Then include the global export or the AMD module.


Example
=======

```javascript
// This is a wrapper around IDBStore#get.
// Had it been written using native promises it whould have closed the
// transaction when calling `resolve` or `reject`
function getRecord(IDBStore, key) {
  return new SyncPromise(function(resolve, reject) {
    var req = IDBStore.get(key);
    req.onsuccess = function() {
      if (req.result !== undefined) {
        resolve(req.result);
      } else {
        reject('KeyNotFoundError');
      }
    };
    req.onerror = reject;
  });
}

// Usage
var tx = db.transaction('books', 'readonly');
var bookStore = tx.objectStore('books');

getRecord(bookStore, 'Bedrock Nights')
.then(function(book) {
  // We got the book, and the transaction is still open so we
  // can make another request. Had `getRecord` used native promises
  // the transaction whould have been closed by now.
});
```

Differences from ECMAScript promises
====================================

* Synchronized resolution and rejection, of course.
* No `race` function. How that function ended up in the specification is beyond
  me. Especially considering the amount of way more useful promise utility function.
* `.then` does not take a rejection handler. Only a fulfilled handler. Use `.catch`
  instead. This is a departure from Promises/A+. But we're not compatible anyway
  so we get away with not supporting [this anti-pattern](https://github.com/petkaantonov/bluebird/wiki/Promise-anti-patterns#the-thensuccess-fail-anti-pattern).

API
===

### new SyncPromise(function)

Creates a new promise. The passed function is passed callbacks to both resolve and reject the promise.

__Example:__

```javascript
var p = new SyncPromise(function(resolve, reject) {
  var req = IDBStore.get(key);
  req.onsuccess = function() {
    if (req.result !== undefined) {
      resolve(req.result);
    } else {
      reject('KeyNotFoundError');
    }
  };
  req.onerror = reject;
});
```

### SyncPromise#then(function)

The passed function will be called if the promise fulfills. A new promise
chained from the original promise is returned. The new promise is resolved with
the value that the function return. The new promise is rejected if the function
throws an error.

__Example:__

```javascript
getSomething.then(function(v) {
  return doSomething(v);
}).then(function(v) {
  doSomethingElse(v);
});

```

### SyncPromise#catch(function)

The passed function will be called if the promise rejects. A new promise
chained from the original promise is returned. The new promise is resolved with
the value that the function return. The new promise is rejected if the function
throws an error.

__Example:__

```javascript
getSomething.then(function(v) {
  return doSomething(v);
}).then(function(v) {
  doSomethingElse(v);
});

```

### SyncPromise.resolve(value)

Return a promise that is resolved with the value.

__Example:__

```javascript
SyncPromise.resolve(12).then(function(n) {
  assert(n === 12);
});
```

### SyncPromise.reject(value)

Return a promise that is rejeced with the value.

__Example:__

```javascript
SyncPromise.reject('err').catch(function(n) {
  assert(n === 12);
});
```

### SyncPromise.all(array)

Return a promise that is resolved when all promises in the array has fulfilled.
If one rejects the promise is rejected for the same reason.

__Example:__

```javascript
var ps = [
  new SyncPromise(function(resolve) {
    resolve(1);
  }),
  2,
  new SyncPromise(function(resolve) {
    setTimeout(function() {
      resolve(3);
    }, 9);
  }),
];
SyncPromise.all(ps).then(function(ns) {
  assert.deepEqual(ns, [1, 2, 3]);
});
```
