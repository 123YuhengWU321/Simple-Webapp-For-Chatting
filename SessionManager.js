const crypto = require('crypto');

class SessionError extends Error {};

function SessionManager() {
    // default session length - you might want to
    // set this to something small during development
    const CookieMaxAgeMs = 600000;

    // keeping the session data inside a closure to keep them protected
    const sessions = {};

    // might be worth thinking about why we create these functions
    // as anonymous functions (per each instance) and not as prototype methods
    this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
        /* To be implemented */
        var Token = crypto.randomBytes(64).toString('hex');

        // console.log('==================token generated is: ' + Token);
        var obj_token = Object.assign({}, {
            username: username
        })
        obj_token.timestamp = Date.now()

        sessions[Token] = obj_token
        response.cookie("cpen322-session", Token, {
            maxAge: maxAge
        })

        setTimeout(() => {
            delete sessions[Token]
        }, maxAge)
    };

    this.deleteSession = (request) => {
        /* To be implemented */
        delete sessions[request.session]
        delete request.username
        delete request.session
    };

    this.middleware = (request, response, next) => {
        if (!request.headers.cookie) {
            next(new SessionError("no cookie from request header"));
        } 
        else {
            var cookie
            cookie = null

            var sessionCookie

            var i = 0,
                len = request.headers.cookie.split(';').length
            //console.log('=======================cookie_list is: ' + request.headers.cookie);
            while (i < len) {
                var tmp = request.headers.cookie.split(';')[i];
                tmp = (tmp.charAt(0) === ' ') ? tmp.substring(1, tmp.length) : tmp
                cookie = (tmp.indexOf("cpen322-session=") === 0) ? tmp.substring("cpen322-session=".length, tmp.length) : cookie
                i++
            }

            cookie ? cookie : next(new SessionError("reading CPEN 322 session cookie failed"))

            // console.log('============================cookie found is: ' + cookie);
            sessionCookie = sessions[cookie]
            if (!sessionCookie) {
                next(new SessionError("no session found with the given cookie"))
            } 
            else {
                request.session = cookie
                request.username = sessionCookie.username
                next();
            }
        }
    };

    // this function is used by the test script.
    // you can use it if you want.
    this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;