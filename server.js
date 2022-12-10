const path = require('path');
const fs = require('fs');
const express = require('express');
const ws = require('ws');
const Database = require('./Database.js');
const SessionManager = require('./SessionManager');
const crypto = require('crypto');

var sessionManager = new SessionManager();
const {
    domainToASCII
} = require('url');

const {
    ObjectID
} = require('bson');

var db = Database("mongodb://localhost:27017", "cpen322-messenger")
var messageBlockSize = 10;

function logRequest(req, res, next) {
    console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
    next();
}

/**quote:https://stackoverflow.com/questions/2794137/sanitizing-user-input-before-adding-it-to-the-dom-in-javascript/48226843#48226843*/
function sanitize(string) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    const reg = /[&<>]/ig;
    return string.replace(reg, (match) => (map[match]));
}

function isCorrectPassword(password, saltedHash) {
    var cond1 = saltedHash.substring(20)
    var cond2 = crypto.createHash('sha256').update(password.concat(saltedHash.substring(0, 20))).digest('base64')
    var res = Boolean(cond1 === cond2)
    return res
}

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

// express app
var app = express();

app.use(express.json()) // to parse application/json

app.use(express.urlencoded({
    extended: true
})) // to parse application/x-www-form-urlencoded

app.use(logRequest); // logging for debug
app.use('/login', express.static("./client/login.html"))

app.use("/index", sessionManager.middleware, express.static(clientApp + "/index"))
app.use("/app.js", sessionManager.middleware, express.static(clientApp + "/app.js"))
app.use("/index.html", sessionManager.middleware, express.static(clientApp + "/index.html"))
app.use("/+", sessionManager.middleware, express.static(clientApp + "/index.html"))

// var chatrooms = [];
// var messages = [];
// for(let i = 0; i < 4; i++){
//     const roomObj = {id: i.toString(), 
//                   name:"Room 10" + i, 
//                   image: "everyone-icon.png"};

//     chatrooms.push(roomObj);

//     messages[i.toString()] = []
// }


var messages = {};
// messages[new String("123")] = [];
// messages[new String("456")] = [];
// messages[new String("789")] = [];
// messages[new String("246")] = [];


db.getRooms().then((result) => {
    result.forEach(docs => {
        messages[docs._id.toString()] = [];
    });
});
// NOTE: Output messages data for debugging.
// test-a3.js reports an error.
//    - "messages" object should contain an array for each room in "chatrooms". messages["room1"]
//      is currently undefined
// NOTE: /cpen22/a3 somehow returns an empty array in the following:
//         let s = await o("getGlobalObject", "messages");
//       However, the following is successful
//         let s = await o("getGlobalObject", "chatrooms");
//
for (var key in messages) {
    console.log("==== msg " + key + " :" + messages[key] + ":");
}

let router = express.Router();

router.get('/', sessionManager.middleware, function(req, res) {
    console.log('GET router req.');
    // Copy to a new array to avoid original array

    // rooms = Array.from(chatrooms);
    // for (let i = 0; i < rooms.length; i++) {
    // // Array of object is copied with reference only.  Duplicate the objec to avoid overwriting
    // // the original
    // rooms[i] = Object.assign({}, chatrooms[i]);
    // rooms[i].messages = messages[rooms[i].id];
    // }
    // // console.log("==== json data sent new: " + JSON.stringify(rooms));
    // // console.log("==== json data sent old: " + JSON.stringify(chatrooms));
    // res.status(200).send(JSON.stringify(rooms));


    var rooms = [];
    var roomsObj
    db.getRooms().then(result => {
        result.forEach(docs01 => {
            roomsObj = Object.assign({}, docs01);
            roomsObj.messages = messages[docs01._id.toString()]
            rooms.push(roomsObj)
        });
        res.status(200).send(JSON.stringify(rooms));
        res.end()
    });
});

// router.post('/', function(req, res){
//     if (req.body && client.hasOwnProperty("name")){
//         var result = []
//         let roomObj2 = {
//             id: Math.random().toString(),
//             name:req.body.name,
//             image:req.body.image
//         }
//         for (var i=0; i<result.length; i++){
//             result.push(roomObj2)
//             result[i].messages = messages[result[i].id]
//         }
//         res.send(JSON.stringify(result));
//     }else{
//         res.status(400).send('req.body does not contain name')
//     }
// });

router.post('/', sessionManager.middleware, function(req, res) {
    console.log("============req body is" + req.body)

    if (req.body && req.body.hasOwnProperty("name")) {

        // var idRoom = chatrooms.length.toString() ;
        var idRoom = ObjectID();

        var roomObj2 = {
            _id: idRoom,
            name: req.body.name,
            image: req.body.image
        };

        //chatrooms.push(roomObj2);
        messages[idRoom] = [];


        const resposne2 = {
            id: idRoom,
            name: req.body.name,
            image: req.body.image,
            messages: []
        };
        db.addRoom(roomObj2)

        console.log("============resposne2 body is" + JSON.stringify(resposne2))
        res.status(200).send(JSON.stringify(roomObj2));
        res.end()
    } else {
        res.status(400).send('req.body does not contain name field')
        res.end()
    }
})

router.get('/:room_id', sessionManager.middleware, function(req, res) {
    db.getRoom(req.params.room_id).then(
        (docs03) => {
            (docs03) ? res.status(200).send(JSON.stringify(docs03)): res.status(404).send("NOt valid id for end point /chat/:room_id")
            res.end()
        },
        (err) => {
            res.status(404).send(err)
            res.end()
        }

    )
})

router.get('/:room_id/messages', sessionManager.middleware, function(req, res) {
    var tmpROOMID = req.params.room_id
    var tmpBefore = req.query.before
    db.getLastConversation(tmpROOMID, tmpBefore).then(
        (onResult) => {
            (onResult) ? res.status(200).send(JSON.stringify(onResult)): res.status(404).send("invalid for /:room_id/messages end point")
            res.end()
        },
        (err) => {
            res.status(404).send(err);
            res.end()
        }
    )
})

app.use('/chat', router);


app.route('/login').post((req, res) => {
    db.getUser(req.body.username).then(
        (result) => {
            if (!result) {
                res.redirect('/login')
                res.end()
            }
            if (result) {
                if (!isCorrectPassword(req.body.password, result.password)) {
                    res.redirect('/login')
                    res.end()
                } else {
                    sessionManager.createSession(res, result.username, 600000)
                    res.redirect('/')
                    res.end()
                }
            }
        },
        (err) => {
            res.status(404).send(err)
            res.end()
        })
})

app.route('/profile').get(sessionManager.middleware, (req, res) => {
    var obj = Object.assign({}, {
        username: req.username
    })
    res.status(200).send(JSON.stringify(obj))
    res.end()
});

app.route('/logout').get(sessionManager.middleware, (req, res) => {
    sessionManager.deleteSession(req)
    res.redirect('/login')
    res.end()
});

app.use((err, req, res, next) => {
    (err instanceof SessionManager.Error) ? ((req && req.headers && req.headers.accept === "application/json") ? res.status(401).send(err) : res.redirect('/login')) : res.status(500).send(err)
})


// serve static files (client-side)
app.use('/', express.static(clientApp, {
    extensions: ['html']
}));


app.listen(port, () => {
    console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});


const broker = new ws.WebSocketServer({
    port: 8000
});
broker.on("connection", function(ws, request) {
    if (!request.headers.cookie) {
        ws.close()
    } else {
        var cookie
        cookie = null

        var i = 0,
            len = request.headers.cookie.split(';').length
        while (i < len) {
            var tmp = request.headers.cookie.split(';')[i];
            tmp = (tmp.charAt(0) === ' ') ? tmp.substring(1, tmp.length) : tmp
            cookie = (tmp.indexOf("cpen322-session=") === 0) ? tmp.substring("cpen322-session=".length, tmp.length) : cookie
            i++
        }
        if (!cookie) {
            ws.close()
        }
        if (!sessionManager.getUsername(cookie)) {
            ws.close()
        } else {
            ws.on('message', function incoming(data, isBinary) {
                console.log("==============JSON parse is " + JSON.parse(data))

                var OBj4 = {
                    username: sessionManager.getUsername(cookie),
                    text: sanitize(JSON.parse(data).text),
                    roomId: JSON.parse(data).roomId
                };

                console.log("===========OBJ4 is " + OBj4)

                JSON.parse(data).roomId in messages ? messages[JSON.parse(data).roomId].push(OBj4) : messages[JSON.parse(data).roomId] = [OBj4]

                broker.clients.forEach(function each(client) {
                    if (client !== ws && ws.OPEN) {
                        console.log("===========goes in final condition check and sending" + JSON.stringify(OBj4))
                        client.send(JSON.stringify(OBj4));
                    }
                });


                if (messages[JSON.parse(data).roomId].length === messageBlockSize) {
                    var conversation = Object.assign({}, {
                        room_id: JSON.parse(data).roomId,
                        messages: messages[JSON.parse(data).roomId],
                        timestamp: Date.now()
                    })
                    db.addConversation(conversation).then((result) => {
                        messages[JSON.parse(data).roomId] = [];
                    });
                }
            });
        }
    }

})

