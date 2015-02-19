function isPromise(p) {
  return p && typeof p.then === 'function';
}

// States
var PENDING = 2,
    FULFILLED = 0, // We later abuse these as array indices
    REJECTED = 1;

function SyncPromise(fn) {
  var self = this;
  self.v = 0; // Value, this will be set to either a resolved value or rejected reason
  self.s = PENDING; // State of the promise
  self.c = [[],[]]; // Callbacks c[0] is fulfillment and c[1] is rejection callbacks
  self.a = false; // Has the promise been resolved synchronously
  var syncResolved = true;
  function transist(val, state) {
    self.a = syncResolved;
    self.v = val;
    self.s = state;
    if (state === REJECTED && !self.c[state].length) {
      throw val;
    }
    self.c[state].forEach(function(fn) { fn(val); });
    self.c = null; // Release memory.
  }
  function resolve(val) {
    if (!self.c) {
      // Already resolved, do nothing.
    } else if (isPromise(val)) {
      val.then(resolve).catch(reject);
    } else {
      transist(val, FULFILLED);
    }
  }
  function reject(reason) {
    if (!self.c) {
      // Already resolved, do nothing.
    } else if (isPromise(reason)) {
      reason.then(reject).catch(reject);
    } else {
      transist(reason, REJECTED);
    }
  }
  fn(resolve, reject);
  syncResolved = false;
}

var prot = SyncPromise.prototype;

prot.then = function(cb) {
  var self = this;
  if (self.a) { // Promise has been resolved synchronously
    throw new Error('Can not call then on synchonously resolved promise');
  }
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
  if (self.a) { // Promise has been resolved synchronously
    throw new Error('Can not call catch on synchonously resolved promise');
  }
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
