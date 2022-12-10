var mainLobby = undefined;

Service.origin = window.location.origin;

Service.getAllRooms = async function() {
    var url = Service.origin + "/chat";
    console.log("==== Service.origin " + url);
    promise = new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.send();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === this.DONE) {
                if (xhr.status === 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    // server side error
                    console.log("==== Received error code : " + xhr.responseText);
                    reject(new Error(xhr.responseText));
                }
            }
        }
        xhr.onerror = function() {
            // client side error
            console.log("==== Client error");
            reject(new Error("client error"));
        };
    });
    promise
        .then((data) => {
            // console.log("==== data " + data);
            for (var key in data) {
                room = data[key];
                console.log("==== room " + key + " " + room.id + " " + room.name + " " + room.image);
            }

        })
        .catch((err) => {
            console.error(err);
        });
    return promise;
};

Service.addRoom = async function(data) {
    return new Promise((resolve, reject) => {
        var url1 = Service.origin + "/chat";
        console.log("==== Service.origin for add romm in service is : " + url1);

        var xhr1 = new XMLHttpRequest();
        xhr1.open("POST", url1);

        xhr1.setRequestHeader("Content-Type", "application/json"); //set header to application/json

        xhr1.onload = function() {
            if (xhr1.status === 200) {
                console.log("==== Received JSON : " + xhr1.responseText);
                resolve(JSON.parse(xhr1.responseText));
            } else {
                console.log("==== Received error code : " + xhr1.responseText);
                reject(new Error(xhr1.responseText));
            }
        };

        xhr1.ontimeout = function() {
            console.log("==== Received error code for time out: " + xhr1.statusText);
            reject((new Error(xhr1.statusText)));
        }

        xhr1.onerror = function() {
            console.log("==== Received error code for error: " + xhr1.statusText);
            reject((new Error(xhr1.statusText)));
        };

        xhr1.onabort = function() {
            console.log("==== Received error code for abort: " + xhr1.statusText);
            reject((new Error(xhr1.statusText)));
        };

        xhr1.send(JSON.stringify(data));
    });
}

Service.getLastConversation = async function(roomId, before) {
    return new Promise((resolve, reject) => {
        var url2 = Service.origin + "/chat/" + roomId + "/messages?before=" + before.toString()
        let xhr2 = new XMLHttpRequest();

        xhr2.open("GET", url2);

        xhr2.onload = function() {
            (xhr2.status === 200) ? resolve(JSON.parse(xhr2.responseText)): reject(new Error(xhr2.responseText))
        }

        xhr2.ontimeout = function() {
            console.log("==== Received error code for time out: " + xhr2.statusText);
            reject((new Error(xhr2.statusText)));
        }

        xhr2.onabort = function() {
            console.log("==== Received error code for abort: " + xhr2.statusText);
            reject((new Error(xhr2.statusText)));
        }

        xhr2.onerror = function() {
            console.log("==== Received error code for error: " + xhr2.statusText);
            reject(new Error(xhr2.statusText));
        };

        xhr2.send();
    })
}


Service.getProfile = async function() {
    return new Promise((resolve, reject) => {
        var url2 = Service.origin + '/profile'
        let xhr2 = new XMLHttpRequest();

        xhr2.open("GET", url2);

        xhr2.onload = function() {
            (xhr2.status === 200) ? resolve(JSON.parse(xhr2.responseText)): reject(new Error(xhr2.responseText))
        }

        xhr2.ontimeout = function() {
            console.log("==== Received error code for time out: " + xhr2.statusText);
            reject((new Error(xhr2.statusText)));
        }

        xhr2.onabort = function() {
            console.log("==== Received error code for abort: " + xhr2.statusText);
            reject((new Error(xhr2.statusText)));
        }

        xhr2.onerror = function() {
            console.log("==== Received error code for error: " + xhr2.statusText);
            reject(new Error(xhr2.statusText));
        };

        xhr2.send();
    })
}

function* makeConversationLoader(room) {
    var tmpConv
    var tmpLast = room.timestamp

    while (room.canLoadConversation) {
        var tmpRID = room.id
        room.canLoadConversation = false

        Service.getLastConversation(tmpRID, tmpLast).then(
            (result) => {
                if (result) {
                    tmpConv = result
                    tmpLast = result.timestamp
                    room.canLoadConversation = true;
                    room.addConversation(result)
                }
            },
            (error) => {
                console.log(error)
            }
        )

        yield(tmpConv)
    }
}

// Removes the contents of the given DOM element (equivalent to elem.innerHTML = '' but faster)
function emptyDOM(elem) {
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM(htmlString) {
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}


class LobbyView {
    constructor(lobby) {
        // NOTE: Add the button label
        this.elem = createDOM('<div class="content"><ul class="room-list"><li></li></ul><div class="page-control"> <input type="text"> <button> Add </button> </div></div>')
        this.listElem = this.elem.querySelector("ul.room-list")
        this.inputElem = this.elem.querySelector(".page-control input[type=text]")
        this.buttonElem = this.elem.querySelector(".page-control button")
        this.lobby = lobby

        this.buttonElem.addEventListener("click", function() {
            var self = this
            console.log(self.inputElem.value)
            // NOTE: Alert users if no room name
            if (self.inputElem.value === "") {
                return;
            }
            // NOTE: Check if room already exists
            if (lobby.getRoom(self.inputElem.value) !== undefined) {
                return;
            }

            // var newID = self.lobby.rooms.length++
            console.log(self.lobby.rooms.length)
            var inputMess = self.inputElem.value
            // NOTE: Use name as id for duplicate name checking
            // self.lobby.addRoom(Math.random().toString(),inputMess)
            // self.lobby.addRoom(inputMess,inputMess)
            let data = {
                name: inputMess
            }
            Service.addRoom(data).then(
                (result) => {
                    this.lobby.addRoom(result._id, result.name, result.image, result.messages);
                }
            )
            self.inputElem.value = ""
        }.bind(this))
        this.redrawList()
        this.lobby.onNewRoom = function(room) {
            var self1 = this
            // console.log(room)
            const string1 = '<li><a href="#/chat/'
            const string2 = '"><div><img alt=""'
            const string3 = ' src="'
            const string4 = '" width="30px" height="30px"></div><div><p>'
            const string5 = '</p></div></a></li>'
            var newCreation = createDOM(string1 + room.id + string2 + string3 + room.image + string4 + room.name + string5)
            var debug2 = string1 + room.id + string2 + string3 + room.image + string4 + room.name + string5
            console.log("onnewRoom has html:" + debug2)
            // console.log(newCreation)
            self1.listElem.appendChild(newCreation);

        }.bind(this)
    }
    redrawList() {
        emptyDOM(this.listElem)
        var roomID

        const string1 = '<li><a href="#/chat/'
        const string2 = '"><div><img alt=""'
        const string3 = ' src="'
        // NOTE: changed to be consistent with this.lobby.onNewRoom string4
        // const string4 = '" width="30px" height="30px"><p>'
        // const string5 = '</p></div></a></li>'
        const string4 = '" width="30px" height="30px"></div><div><p>'
        const string5 = '</p></div></a></li>'

        for (roomID in this.lobby.rooms) {
            // console.log(roomID)
            // room = this.lobby.getRoom(roomID)

            var newCreation = createDOM(string1 + this.lobby.rooms[roomID].id + string2 + string3 + this.lobby.rooms[roomID].image + string4 + this.lobby.rooms[roomID].name + string5)
            var debugString = string1 + this.lobby.rooms[roomID].id + string2 + string3 + this.lobby.rooms[roomID].image + string4 + this.lobby.rooms[roomID].name + string5
            // console.log("redrawlist is " + debugString)
            this.listElem.appendChild(newCreation);
        }
    }
}

class ChatView {
    constructor(socket) {
        // NOTE: Add button "Add" label
        this.socket = socket;
        this.elem = createDOM('<div class="content"><h4 class="room-name"> </h4> <div class="message-list"> <div class="message"> <span class="message-user"> </span> <span class="message-text"> <p>message</p></span> </div><div class="message my-message"> <span class="message-user"> </span> <span class="message-text"> <p>mymessage</p></span> </div></div><div class="page-control"> <textarea> </textarea> <button> Add </button> </div></div>')
        this.titleElem = this.elem.querySelector("h4.room-name")
        this.chatElem = this.elem.querySelector("div.message-list")
        this.inputElem = this.elem.querySelector(".page-control textarea")
        this.buttonElem = this.elem.querySelector(".page-control button")
        this.room = null
        this.buttonElem.addEventListener("click", function() {
            var selfc1 = this
            selfc1.sendMessage()
        }.bind(this))

        this.inputElem.addEventListener("keyup", event => {
            var selfc2 = this
            if (event.shiftKey !== true && event.keyCode === 13) {
                selfc2.sendMessage()
            }
        })

        this.chatElem.addEventListener("wheel", event => {
            if (this.chatElem.scrollTop === 0 && event.deltaY < 0 && this.room.canLoadConversation === true) {
                this.room.getLastConversation.next()
            }
        })
    }

    setRoom(room) {
        if (room) {
            room.onNewMessage = (message) => {
                var self3 = this
                if (message.username === profile.username) {
                    // console.log("==== newCreation21 " + message.username)
                    var newCreation21 = createDOM('<div class="message"><span class="message my-message"><span class="message-user">' + message.username + '</span> <span class="message-text"><p>' + message.text + '</p></span> </span> </div>')
                    console.log("new creation21 is :" + newCreation21)
                    self3.chatElem.appendChild(newCreation21);
                } else {
                    // console.log("==== newCreation31 " + this.room.name + " " + message.username + " " + message.text)
                    var newCreation31 = createDOM('<div class="message"><span class="message regular-message"><span class="message-user">' + message.username + '</span> <span class="message-text"><p>' + message.text + '</p></span> </span> </div>')
                    console.log("new creation31 is :" + newCreation31)
                    self3.chatElem.appendChild(newCreation31);
                }
            }
            this.titleElem.innerHTML = room.name
            emptyDOM(this.chatElem)
            var userIndex
            for (userIndex in this.room.messages) {
                if (this.room.messages[userIndex].username === profile.username) {
                    console.log("==== newCreation2 " + this.room.name + " " + this.room.messages[userIndex].username + " " + this.room.messages[userIndex].text)
                    // NOTE: remove one extra span to align with other user messages
                    var newCreation2 = createDOM('<div class="message"><span class="message my-message"><span class="message-user">' + this.room.messages[userIndex].username + '</span> <span class="message-text"><p>' + this.room.messages[userIndex].text + '</p></span> </span> </div>')
                    console.log("new creation2 is :" + newCreation2)
                    this.chatElem.appendChild(newCreation2);
                } else {
                    console.log("==== newCreation3 " + this.room.name + " " + this.room.messages[userIndex].username + " " + this.room.messages[userIndex].text)
                    var newCreation3 = createDOM('<div class="message"><span class="message regular-message"><span class="message-user">' + this.room.messages[userIndex].username + '</span> <span class="message-text"><p>' + this.room.messages[userIndex].text + '</p></span> </span> </div>')
                    console.log("new creation3 is :" + newCreation3)
                    this.chatElem.appendChild(newCreation3);
                }
            }
        }
        this.room = room;
        this.room.onFetchConversation = (conv) => {
            var hb = this.chatElem.scrollHeight
            var newCreation4;

            for (var i in conv.messages) {
                (conv.messages[i].username == profile.username) ? newCreation4 += '<div class="message"><span class="message my-message"><span class="message-user">' + profile.username + '</span> <span class="message-text"><p>' + conv.messages[i].text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') + '</p></span> </span> </div>':
                    newCreation4 += '<div class="message"><span class="message-user">' + conv.messages[i].username + '</span> <span class="message-text"><p>' + conv.messages[i].text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') + '</p></span></div>'
            }

            this.chatElem.innerHTML = newCreation4 + this.chatElem.innerHTML

            var ha = this.chatElem.scrollHeight
            this.chatElem.scrollTop = ha - hb
        }

    }

    sendMessage() {
        var msg = this.inputElem.value
        // NOTE: check empty message
        if (msg === "") {
            return;
        }
        console.log("==== sendMessage's msg is : " + this.room.name + " " + profile.username + " " + msg)
        this.room.addMessage(profile.username, msg)


        var data = {
            roomId: this.room.id,
            text: this.inputElem.value
        };
        this.inputElem.value = ""
        this.socket.send(JSON.stringify(data));
    }
}

class ProfileView {
    constructor(elem) {
        // NOTE: Add label "User: " and "Password: ", remove file input field, add id "name" for
        //       input query
        // NOTE: form without password
        this.elem = createDOM('<div id="page-view"> <div class="content"> <div class="profile-form"> <div class="form-field"> <label>User: </label> <input type="text" id="username"> </div><div class="page-control"> <button> Login </button> </div></div></div></div>')
        // NOTE: form with password (obsolete)
        // this.elem = createDOM('<div id="page-view"> <div class="content"> <div class="profile-form"> <div class="form-field"> <label>User: </label> <input type="text" id="username" onkeypress="usernameInput(event)"> </div><div class="form-field"> <label>Password: </label> <input type="password"> </div></div><div class="page-control"> <button> Login </button> </div></div></div>')
        // NOTE: allow users to change profile name
        // NOTE: set button event listener
        this.buttonElem = this.elem.querySelector(".page-control button")
        this.inputElem = this.elem.querySelector(".profile-form input")
        // NOTE: click handling
        this.buttonElem.addEventListener("click", function() {
            var self = this
            self.changeProfile()
        }.bind(this))
        // NOTE: keyup handling
        this.inputElem.addEventListener("keyup", event => {
            var self = this
            if (event.shiftKey !== true && event.keyCode === 13) {
                self.changeProfile()
            }
        })
    }

    // NOTE: update profile user name
    changeProfile() {
        if (this.inputElem.value === "") {

            return;
        }
        profile.username = this.inputElem.value;
        // NOTE: update profile user name in top
        const dispName = document.getElementById('profile-user-name');
        dispName.textContent = profile.username;

        this.inputElem.value = ""
    }
}

class Room {
    constructor(id, name, image = "assets/everyone-icon.png", messages = []) {
        this.id = id;
        this.name = name;
        this.image = image;
        this.messages = messages;

        this.timestamp = Date.now()
        this.getLastConversation = makeConversationLoader(this)
        this.canLoadConversation = true
    }
    addMessage(username, text) {
        // console.log("==== addMessage " + this.name + " " + username + " " + text)
        if (text.trim() === "") {
            return
        } else {
            var newObj = {
                "username": username,
                "text": text
            }
            this.messages.push(newObj)
            if (this.onNewMessage !== undefined) {
                this.onNewMessage(newObj)
            }
        }
    }

    addConversation(conversation) {
        this.messages = conversation.messages.concat(this.messages)
        if (this.onFetchConversation !== undefined) {
            this.onFetchConversation(conversation)
        }
    }
}

class Lobby {
    constructor() {
        this.rooms = []
        for (let i = 0; i < 4; i++) {
            let id = i;
            // NOTE: Add "Room " prefix to name
            var name = "Room " + i.toString();
            // NOTE: Use string hash as index to be consistent with addRoom
            this.rooms[name] = new Room(name, name, "./assets/everyone-icon.png", []);
        }
    }

    getRoom(roomId) {
        try {
            return this.rooms[roomId]
        } catch (e) {}

    }

    addRoom(id, name, image, messages) {
        // console.log("==== addRoom " + id + " " + name + " " + image + " " + messages);
        if (this.rooms[id] !== undefined) {
            this.rooms[id].name = name;
            this.rooms[id].image = image;
            this.rooms[id].messages = messages;
        } else
            this.rooms[id] = new Room(id, name, image, messages)
        if (this.onNewRoom !== undefined) {
            this.onNewRoom(this.rooms[id])
        }


    }

}


window.addEventListener("load", main, false);

function main() {
    var socket = new WebSocket('ws://localhost:8000');

    var lobby = new Lobby()
    var lobbyView = new LobbyView(lobby)
    var chatView = new ChatView(socket)
    var profileView = new ProfileView()
    mainLobby = lobby;

    Service.getProfile().then((result) => {
        profile = result
    });

    socket.addEventListener("message", (response) => {
        let room = lobby.getRoom(JSON.parse(response.data).roomId);
        room.addMessage(JSON.parse(response.data).username, JSON.parse(response.data).text);
    });

    function renderRoute() {
        const pageView = document.getElementById('page-view');
        var creation
        var roomNum = "#/chat/[a-zA-Z0-9]+";
        var roomID
        if (window.location.hash === "#/") {
            emptyDOM(pageView);
            creation = lobbyView.elem
            pageView.appendChild(creation);
        } else if (window.location.hash.match(roomNum)) {
            emptyDOM(pageView);
            creation = chatView.elem
            // console.log("==== location hash is " + window.location.hash)
            roomID = window.location.hash.replace("#/chat/", "")
            // NOTE: convert potential URL with %20 to ' '
            roomID = decodeURI(roomID)
            console.log("roomID is " + roomID)
            var room34 = lobby.getRoom(roomID)
            console.log("room34 is " + JSON.stringify(room34))

            if (room34 !== undefined) {
                chatView.setRoom(room34)
            }

            pageView.appendChild(creation);
        } else if (window.location.hash === "#/profile") {
            emptyDOM(pageView);
            creation = profileView.elem
            pageView.appendChild(creation);
        }
    }

    refreshLobby()

    function refreshLobby() {
        // console.log("==== refreshLobby");
        try {
            promise = Service.getAllRooms();
            promise.then(response => {
                rooms = response;
                for (let i = 0; i < rooms.length; i++) {
                    console.log("==== add lobby room " + i + ": " +
                        rooms[i]._id + " " + rooms[i].name + " " + rooms[i].image + " " + rooms[i].messages);
                    if (rooms[i]._id in lobby.rooms) {
                        lobby.rooms[rooms[i]._id].name = rooms[i].name
                        lobby.rooms[rooms[i]._id].image = rooms[i].image
                    } else {
                        lobby.addRoom(rooms[i]._id, rooms[i].name, rooms[i].image, rooms[i].messages);
                    }
                }
                return response;
            });
        } catch (err) {
            console.log("==== Service.getAllRooms error: " + err.message);
        }
    }

    window.addEventListener("popstate", renderRoute, false);

    // NOTE: test-a3.js checks if refresh lobby is called repeatedly
    setInterval(refreshLobby, 50000);

}

main();