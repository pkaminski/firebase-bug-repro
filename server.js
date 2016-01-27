'use strict';

['FIREBASE', 'FIREBASE_AUTH'].forEach(function(envKey) {
  if (!process.env[envKey]) {
    console.log('Missing ' + envKey + ' environment variable');
    process.exit(1);
  }
});

let _ = require('lodash');
let NodeFire = require('nodefire');
let firelease = require('firelease');

firelease.captureError = _.noop;
firelease.pingQueues();

let tasksHandled = 0;

global.db = new NodeFire('https://' + process.env.FIREBASE + '.firebaseio.com');
db.child('.info/connected').on('value', function(snap) {
  console.log('Firebase', db.toString(), snap.val() ? 'CONNECTED' : 'DISCONNECTED');
});

let QUEUES = {
  requests: {options: {maxConcurrent: 15, minLease: '2s'}, handler: handleRequest},
  responses: {options: {}, handler: clearResponse}
};

db.auth(process.env.FIREBASE_AUTH, {uid: 'server', debug: true}).then(function() {
  _.each(QUEUES, function(value, key) {
    firelease.attachWorker(db.child('queues/' + key), value.options, value.handler);
  });
  // Running checks within the server process seems to jostle Firebase into finding the missing
  // items, so check from a separate process instead.
  // setInterval(function() {
  //   tasksHandled = 0;
  //   checkQuery('queues/requests');
  //   checkQuery('queues/responses');
  // }, 10000);
}).catch(function(error) {
  console.log('Auth error: ', error.stack);
  process.exit(1);
});


function clearResponse(response) {
  // Do nothing, just delete the response if the client hasn't picked it up yet.
  process.stdout.write('-');
  tasksHandled++;
}

function *handleRequest(request) {
  tasksHandled++;
  if (_.random(1)) {
    process.stdout.write('*');
    return firelease.RETRY;
  }
  let response = {userKey: request.userKey, outcome: 'ok', _lease: {expiry: db.now() + 30000}};
  response['.priority'] = response._lease.expiry;
  yield db.child('queues/responses/:id', {id: request.$ref.key()}).set(response);
  process.stdout.write('.');
}

function checkQuery(path) {
  process.stdout.write('?');
  db.child(path).limitToFirst(5).once('value', function(snap) {
    if (tasksHandled) return;
    if (snap.numChildren() === 0) {
      db.child(path).once('value', function(snap) {
        if (tasksHandled) return;
        if (snap.numChildren()) {
          console.log(path, 'empty, actually', snap.numChildren());
        }
      });
    }
  });
}
