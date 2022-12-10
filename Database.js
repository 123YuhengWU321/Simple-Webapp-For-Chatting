const {
    MongoClient,
    ObjectID
} = require('mongodb'); // require the mongodb driver

/**
 * Uses mongodb v4.2+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/4.2/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function Database(mongoUrl, dbName) {
    if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
    this.connected = new Promise((resolve, reject) => {
        MongoClient.connect(
            mongoUrl, {
                useNewUrlParser: true
            },
            (err, client) => {
                if (err) reject(err);
                else {
                    console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
                    resolve(client.db(dbName));
                }
            }
        )
    });
    this.status = () => this.connected.then(
        db => ({
            error: null,
            url: mongoUrl,
            db: dbName
        }),
        err => ({
            error: err
        })
    );
}



Database.prototype.getRooms = function() {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            /* TODO: read the chatrooms from `db`
             * and resolve an array of chatrooms */
            db.collection('chatrooms').find({}).toArray(
                function(err, docs) {
                    if (err) {
                        reject(err);
                    }
                    console.log("============docs is" + docs)
                    resolve(docs)
                }
            )

        })
    )
}

Database.prototype.getRoom = function(room_id) {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            /* TODO: read the chatroom from `db`
             * and resolve the result */
            if (ObjectID.isValid(room_id)) {
                db.collection("chatrooms").findOne({
                    _id: ObjectID(room_id)
                }).then((docs) => {
                        resolve(docs)
                    },
                    (err) => {
                        reject(err)
                    })
            } else if (typeof room_id === 'string') {
                db.collection("chatrooms").findOne({
                    _id: room_id
                }).then((docs1) => {
                        resolve(docs1)
                    },
                    (err) => {
                        reject(err)
                    })
            } else {
                reject(new Error("not valid _id, not string nor ObjectID"))
            }
        })
    )
}

Database.prototype.addRoom = function(room) {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            /* TODO: insert a room in the "chatrooms" collection in `db`
             * and resolve the newly added room */
            if (!room.hasOwnProperty("name")) {
                reject(new Error("no name field existed"))
            } else {
                (room._id) ? room._id: ObjectID()
                db.collection("chatrooms").insertOne(room, function(err) {
                    (err) ? reject(err): resolve(room)
                })
            }
        })
    )
}

Database.prototype.getLastConversation = function(room_id, before) {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            /* TODO: read a conversation from `db` based on the given arguments
             * and resolve if found */
            before = (before) ? before : Date.now()
            db.collection("conversations").find({
                room_id: room_id
            }).toArray((err, docs) => {
                if (err) {
                    reject(err)
                } else if (!docs) {
                    resolve(null)
                } else {
                    var ret;
                    (docs.sort((a, b) => b.timestamp - a.timestamp).filter(last => {
                        (last.timestamp) ? ret = last.timestamp < before: ret = false;
                        return ret
                    })) ? resolve(docs.sort((a, b) => b.timestamp - a.timestamp).filter(last => {
                        (last.timestamp) ? ret = last.timestamp < before: ret = false;
                        return ret
                    })[0]): resolve(null)
                }
            })
        })
    )
}

Database.prototype.addConversation = function(conversation) {
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            /* TODO: insert a conversation in the "conversations" collection in `db`
             * and resolve the newly added conversation */

            if (!conversation.hasOwnProperty("room_id") || !conversation.hasOwnProperty("timestamp") || !conversation.hasOwnProperty("messages")) {
                reject(new Error("missing field"))
            } else {
                db.collection("conversations").insertOne(conversation, function(err) {
                    (err) ? reject(err): resolve(conversation)
                })
            }
        })
    )
}

/**A5 stuff added here**/
Database.prototype.getUser = function(username){
    return this.connected.then(db =>
        new Promise((resolve, reject) => {
            /* TODO: insert a conversation in the "conversations" collection in `db`
             * and resolve the newly added conversation */
            db.collection("users").findOne({username: username}, function(err,resposne) {
                (err) ? reject(err): resolve(resposne)
            })
        })
    )
}

module.exports = Database;