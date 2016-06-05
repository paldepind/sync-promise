var assert = require('assert');
var SyncPromise = require('../dist/sync-promise-commonjs');

function soon(f) { setTimeout(f, 1); }
function later(f) { setTimeout(f, 100); }

describe('SyncPromise', function() {
  it('has `then` and `catch` methods', function() {
    var p = new SyncPromise(function(res, rej) {
    });
    assert.equal(typeof p.then, 'function');
    assert.equal(typeof p.catch, 'function');
  });
  describe('Resolution', function() {
    it('calls `then` callback when resolved', function(done) {
      var p = new SyncPromise(function(res, rej) {
        soon(function() { res(10); });
      });
      p.then(function(v) {
        assert.equal(v, 10);
        done();
      });
    });
    it('`then` returns a new promise', function() {
      var p = new SyncPromise(function(res, rej) {});
      var q = p.then(function(){});
      assert.equal(typeof q.then, 'function');
      assert.equal(typeof q.catch, 'function');
    });
    it('`then` can be chained with plain values', function(done) {
      new SyncPromise(function(res) {
        soon(function() { res(1); });
      }).then(function(n) {
        return n+1;
      }).then(function(n) {
        return n+1;
      }).then(function(n) {
        assert.equal(n, 3);
        done();
      });
    });
    it('`then` can be chained with promises', function(done) {
      new SyncPromise(function(res) {
        soon(function() { res(1); });
      }).then(function(n) {
        return new SyncPromise(function(res) {
          soon(function() { res(n+1); });
        });
      }).then(function(n) {
        return new SyncPromise(function(res) {
          soon(function() { res(n + 1); });
        });
      }).then(function(n) {
        assert.equal(n, 3);
        done();
      });
    });
    it('can only be resolved once', function(done) {
      var p = new SyncPromise(function(res, rej) {
        soon(function() {
          res(1); res(2);
        });
      });
      p.then(function() {
        done();
      });
    });
    it('cannot call `then` on synchronously resolved promise', function(done) {
      try {
        new SyncPromise(function(res, rej) {
          res(1);
        }).then(function() { });
      } catch (err) {
        done();
      }
    });
  });
  describe('Rejection', function(done) {
    it('can reject a promise with 2nd argument to `then`', function(done) {
      new SyncPromise(function(res, rej) {
        soon(function() { rej(1); });
      }).then(null, function(n) {
        assert.equal(n, 1);
        done();
      });
    });
    it('can reject a promise with `catch`', function(done) {
      new SyncPromise(function(res, rej) {
        soon(function() { rej(1); });
      }).catch(function(n) {
        assert.equal(n, 1);
        done();
      });
    });
    it('forwards rejections', function(done) {
      new SyncPromise(function(res, rej) {
        soon(function() { res(1); });
      }).then(function(n) {
        throw 'err';
      }).then(function(n) {
        return n+1;
      }).catch(function(e) {
        assert.equal(e, 'err');
        done();
      });
    });
    it('promise returned by `catch` resolves', function(done) {
      new SyncPromise(function(res, rej) {
        soon(function() { res(1); });
      }).then(function(n) {
        return new SyncPromise(function(res) {
          soon(function() { res(n+1); });
        });
      }).catch(function(e) {
        return 0;
      }).then(function(n) {
        assert.equal(n, 2);
        done();
      });
    });
    it('can only be rejected once', function(done) {
      var p = new SyncPromise(function(res, rej) {
        soon(function() {
          rej(1); rej(2);
        });
      });
      p.catch(function() {
        done();
      });
    });
    it('exceptions can be caught', function(done) {
      new SyncPromise(function(res, rej) {
        soon(function() { res(1); });
      }).then(function(n) {
        throw 'err';
      }).then(function(n) {
        return n+1;
      }).catch(function(e) {
        return 0;
      }).then(function(n) {
        assert.equal(n, 0);
        done();
      });
    });
    it('throws if sync exceptions aren\'t caught', function (done) {
      try {
        new SyncPromise(function(res, rej) {
          throw new Error('err');
        });
      } catch (err) {
        assert.equal(err.message, 'err');
        done();
      }
    });
    it('throws if async exceptions aren\'t caught', function(done) {

      // Handle uncaught exceptions ourselves
      var originalException = process.listeners('uncaughtException').pop();
      process.removeListener('uncaughtException', originalException);
      process.once('uncaughtException', function (error) {
          process.addListener('uncaughtException', originalException);
          done();
      });

      new SyncPromise(function(res, rej) {
        setTimeout(function () {
          throw new Error('err');
        });
      });
    });
    it('throws when no onRejected callback has been attached', function (done) {
      // Handle uncaught exceptions ourselves
      var originalException = process.listeners('uncaughtException').pop();
      process.removeListener('uncaughtException', originalException);
      process.once('uncaughtException', function (error) {
          process.addListener('uncaughtException', originalException);
          done();
      });

      new SyncPromise(function(resolve, reject) {
        setTimeout(reject, 10);
      });
    });
    it('if `catch` throws then promise is rejected', function(done) {
      new SyncPromise(function(res, rej) {
        soon(function() { rej(1); });
      }).catch(function(e) {
        throw 0;
      }).catch(function(n) {
        assert.equal(n, 0);
        done();
      });
    });
    it('promise returned from `then` rejects if cb returns rejected promise', function(done) {
      new SyncPromise(function(res, rej) {
        soon(function() { res(1); });
      }).then(function(n) {
        return new SyncPromise(function(res, rej) {
          soon(function() { rej(n+1); });
        });
      }).catch(function(e) {
        assert.equal(e, 2);
        done();
      });
    });
  });
  describe('All', function() {
    it('resolves with values in array', function(done) {
      var ps = [
        new SyncPromise(function(res) {
          soon(function() { res(1); });
        }),
        new SyncPromise(function(res) {
          soon(function() { res(2); });
        }),
        new SyncPromise(function(res) {
          soon(function() { res(3); });
        }),
      ];
      SyncPromise.all(ps).then(function(ns) {
        assert.deepEqual(ns, [1, 2, 3]);
        done();
      });
    });
    it('handles plain values in array', function(done) {
      var ps = [
        new SyncPromise(function(res) {
          soon(function() { res(1); });
        }),
        2,
        new SyncPromise(function(res) {
          soon(function() { res(3); });
        }),
      ];
      SyncPromise.all(ps).then(function(ns) {
        assert.deepEqual(ns, [1, 2, 3]);
        done();
      });
    });
    it('throws upon all plain values in array', function(done) {
      var ps = [
        1,
        2,
        3,
      ];
      try {
        SyncPromise.all(ps);
      } catch (err) {
        done();
      }
    });
    it('rejects if a promise rejects', function(done) {
      var ps = [
        new SyncPromise(function(res) {
          soon(function() { res(1); });
        }),
        new SyncPromise(function(res, rej) {
          soon(function() { rej(0); });
        }),
        new SyncPromise(function(res) {
          soon(function() { res(3); });
        }),
      ];
      SyncPromise.all(ps).then(function(ns) {
      }).catch(function(e) {
        assert.equal(e, 0);
        done();
      });
    });
  });
  describe('Race', function() {
    it('resolves with first value resolving in array', function(done) {
      var ps = [
        new SyncPromise(function(res) {
          later(function() { res(1); });
        }),
        new SyncPromise(function(res) {
          soon(function() { res(2); });
        }),
        new SyncPromise(function(res) {
          later(function() { res(3); });
        }),
      ];
      SyncPromise.race(ps).then(function(ns) {
        assert.deepEqual(ns, 2);
        done();
      });
    });
    it('throws upon plain values in array (since will make `SyncPromise.race` promise synchronous)', function(done) {
      var ps = [
        new SyncPromise(function(res) {
          soon(function() { res(1); });
        }),
        2,
        new SyncPromise(function(res) {
          later(function() { res(3); });
        }),
      ];
      try {
        SyncPromise.race(ps);
      } catch (err) {
        done();
      }
    });
    it('rejects if a promise rejects', function(done) {
      var ps = [
        new SyncPromise(function(res) {
          later(function() { res(1); });
        }),
        new SyncPromise(function(res, rej) {
          soon(function() { rej(0); });
        }),
        new SyncPromise(function(res) {
          later(function() { res(3); });
        }),
      ];
      SyncPromise.race(ps).then(function(ns) {
      }).catch(function(e) {
        assert.equal(e, 0);
        done();
      });
    });
  });
  /*
  it('can create resolved promise from value', function(done) {
    SyncPromise.resolve(1).then(function(n) {
      return n+1;
    }).then(function(n) {
      assert.equal(n, 2);
      done();
    });
  });
  it('can create rejected promise from value', function(done) {
    SyncPromise.reject(1).catch(function(n) {
      return n+1;
    }).then(function(n) {
      assert.equal(n, 2);
      done();
    });
  });
  */
});
