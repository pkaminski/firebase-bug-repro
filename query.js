'use strict';

['FIREBASE', 'FIREBASE_AUTH'].forEach(function(envKey) {
  if (!process.env[envKey]) {
    console.log('Missing ' + envKey + ' environment variable');
    process.exit(1);
  }
});

let NodeFire = require('nodefire');

global.db = new NodeFire('https://' + process.env.FIREBASE + '.firebaseio.com');
db.child('.info/connected').on('value', function(snap) {
  console.log('Firebase', db.toString(), snap.val() ? 'CONNECTED' : 'DISCONNECTED');
});

db.auth(process.env.FIREBASE_AUTH, {uid: 'server', debug: true}).then(function() {
  db.child('queues/responses').limitToFirst(5).once('value', function(snap) {
    console.log('queues/responses limitToFirst(5) numChildren:', snap.numChildren());
    db.child('queues/responses').once('value', function(snap) {
      console.log('queues/responses full numChildren:', snap.numChildren());
      process.exit(0);
    });
  });
}).catch(function(error) {
  console.log('Auth error: ', error.stack);
  process.exit(1);
});
