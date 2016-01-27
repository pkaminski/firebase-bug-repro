'use strict';

['FIREBASE', 'FIREBASE_AUTH'].forEach(function(envKey) {
  if (!process.env[envKey]) {
    console.log('Missing ' + envKey + ' environment variable');
    process.exit(1);
  }
});

let _ = require('lodash');
let co = require('co');
let sleep = require('co-sleep');
let NodeFire = require('nodefire');

global.db = new NodeFire('https://' + process.env.FIREBASE + '.firebaseio.com');
db.child('.info/connected').on('value', function(snap) {
  console.log('Firebase', db.toString(), snap.val() ? 'CONNECTED' : 'DISCONNECTED');
});

db.auth(process.env.FIREBASE_AUTH, {uid: 'github:1646896', provider: 'github'}).then(function() {
  return co(function*() {
    for (let i = 0; i < 100; i++) {
      yield [
        sendRequest('syncCustomer'),
        sendRequest('checkCoverage'),
        sendRequest('reconcile')
      ];
      yield sleep(_.random(1000, 2000));
    }
  });
}).then(function() {
  console.log();
  process.exit(0);
}).catch(function(error) {
  console.log(error.stack);
  process.exit(1);
});


function *sendRequest(action) {
  let requestKey = db.generateUniqueKey();
  yield db.child('queues/requests/:requestKey', {requestKey}).set({
    userKey: 'github:1646896', action: action
  });

  let responseRef = db.child('queues/responses/:requestKey', {requestKey});

  let timeoutHandle = setTimeout(function() {
    responseRef.off('value', processResponse);
    process.stdout.write('-');
  }, 5000);

  function processResponse(snap) {
    var response = snap.val();
    if (!response) return;
    responseRef.off('value', processResponse);
    clearTimeout(timeoutHandle);
    process.stdout.write('.');
    responseRef.remove();
  }

  responseRef.on('value', processResponse, function(error) {
    console.log(error.message);
  });
}
