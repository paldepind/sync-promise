define(function () {
function isPromise(p) {
  return p && typeof p.then === 'function';
}

// States
var PENDING = 3,
    FULFILLED = 0, // We later abuse these as array indices
    REJECTED = 1;

function SyncPromise(fn) {
  var self = this;
  self.v = 0; // Value, this will be set to either a resolved value or rejected reason
  self.s = PENDING; // State of the promise
  self.c = [[],[]]; // Callbacks c[0] is fulfillment and c[1] is rejection callbacks
  function transist(val, state) {
    self.v = val;
    self.s = state;
    self.c[state].forEach(function(fn) { fn(val); });
    self.c = null; // Free memory.
  }
  function resolve(val) {
    if (!self.c) {
      // Already resolved, do nothing.
    } else if (isPromise(val)) {
      val.then(resolve);
      val.catch(reject);
    } else {
      transist(val, FULFILLED);
    }
  }
  function reject(reason) {
    if (!self.c) {
      // Already resolved, do nothing.
    } else if (isPromise(reason)) {
      reason.then(reject);
      reason.catch(reject);
    } else {
      transist(reason, REJECTED);
    }
  }
  try {
    fn(resolve, reject);
  } catch (reason) {
    reject(reason);
  }
}

SyncPromise.resolve = function(v) {
  return isPromise(v) ? v : new SyncPromise(function(res) { res(v); });
};

SyncPromise.reject = function(v) {
  return isPromise(v) ? v : new SyncPromise(function(_, rej) { rej(v); });
};

var prot = SyncPromise.prototype;

prot.then = function(cb) {
  var self = this;
  return new SyncPromise(function(resolve, reject) {
    function settle() {
      try {
        resolve(cb(self.v));
      } catch(e) {
        reject(e);
      }
    }
    if (self.s === FULFILLED) {
      settle();
    } else if (self.s === REJECTED) {
      reject(self.v);
    } else {
      self.c[FULFILLED].push(settle);
      self.c[REJECTED].push(reject);
    }
  });
};

prot.catch = function(cb) {
  var self = this;
  return new SyncPromise(function(resolve, reject) {
    function settle() {
      try {
        resolve(cb(self.v));
      } catch(e) {
        reject(e);
      }
    }
    if (self.s === REJECTED) {
      settle();
    } else if (self.s === FULFILLED) {
      resolve(self.v);
    } else {
      self.c[REJECTED].push(settle);
      self.c[FULFILLED].push(resolve);
    }
  });
};

SyncPromise.all = function(promises) {
  return new SyncPromise(function(resolve, reject, l) {
    l = promises.length;
    promises.forEach(function(p, i) {
      if (isPromise(p)) {
        p.then(function(res) {
          promises[i] = res;
          --l || resolve(promises);
        }).catch(reject);
      } else {
        --l || resolve(promises);
      }
    });
  });
};

  return SyncPromise;
});
