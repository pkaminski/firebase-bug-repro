Instructions:

1. `npm install`
2. Set `FIREBASE` and `FIREBASE_AUTH` environment variables to the name of the Firebase and an auth secret, respectively.
3. Deploy `rules.json` in your Firebase.
4. Run `node server.js` (make sure to use Node 4.x).
5. Run `node client.js` in a separate shell.
6. Wait until client exits and server has been quiet for 30+ seconds.  Don't stop the server.
7. Run `node query.js` to see how many children are reported for a `limitToFirst(5)` query vs a full query on `queues/responses`.

Once you stop the server, the test query works fine.
