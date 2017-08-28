/* ============= */
/* Requierements */
/* ============= */

var express         = require('express'),
    app             = express(),
    fs              = require('fs'),
    crypto          = require('crypto'),
    passport        = require('passport'),
    LocalStrategy   = require('passport-local').Strategy,
    bodyParser      = require('body-parser'),
    session         = require('express-session'),
    sqlite3         = require('sqlite3').verbose();

/* ============== */
/* Help functions */
/* ============== */

/* Random string generator function. */
var genRandomString = function(length){
  return crypto.randomBytes(Math.ceil(length/2))
  .toString('hex')
  .slice(0,length);
};

/* Function to hash password with sha512 algorithm. */
var sha512 = function(userpassword, salt){
  var hmac = crypto.createHmac('sha512', salt);
  hmac.update(userpassword);
  var value = hmac.digest('hex');
  return { salt:salt, hash:value };
};

/* Hash password. */
function doHashPassword(userpassword) {
  var salt = genRandomString(16/* Arbitrary string size. */);
  var passwordData = sha512(userpassword, salt);
  //console.log('UserPassword = '+userpassword);
  //console.log('Passwordhash = '+passwordData.hash);
  //console.log('nSalt = '+passwordData.salt);
  return passwordData;
}

/* Route middleware for login. */
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
  
  // Log.
  console.log("Unauthorized access !");
}

/* ================== */
/* Passport functions */
/* ================== */

/* Serialize user object */
passport.serializeUser(function (user, done) {
 if (null != user) done(null, user.username);
});

/* Deserialize user object. */
passport.deserializeUser(function (username, done) {
  var query = "SELECT username, super FROM users WHERE username=\"" + username + "\"";
  db.all(query, function(err, row) {
    // Not found.
    if (err) return done({message:err.message});

    var theone = null;

    // Found.
    if ((null != row) && (null != (theone = row[0])) && (username === theone.username)) {
      // Log.
      console.log("passport.deserializeUser() : '" + query + "'");

      // Done.
      return done(null, theone);
    }

    // Oops.
    return done(null, null);
  });
});
 
/* Passport local strategy for local-login. */
passport.use('local-login', new LocalStrategy(function (username, password, done) {
  var query = "SELECT username, password, salt, super FROM users WHERE username=\"" + username + "\"";
  db.all(query, function(err, row) {
    // Not found.
    if (err) return done({message:err.message});

    var theone = null;

    // Found.
    if ((null != row) && (null != (theone = row[0]))) {
      // Hash password.
      var passwordData = sha512(password, theone.salt);

      // Compare.
      if (passwordData.hash === theone.password) {
        // Log.
        console.log("passport.use() : '" + query + "'");

        // Done.
        return done(null, theone);
      }
    }

    // Oops.
    return done(null, null);
  });
}));

/* ===================== */
/* Application functions */
/* ===================== */

/* Retrieving form data. */
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({extended: true}));

/* Initialize passposrt and and session for persistent login sessions. */
app.use(session({
  secret: "chainesecrete",
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

/* Main page. */
app.get("/", isLoggedIn, function (req, res) {
  // Super user's page.
  if(req.user.super) {
    res.sendFile(htmlpath_indexsuper);
  }
  // Default user's page.
  else {
    res.sendFile(htmlpath_index);
  }

  // Log.
  console.log("main page (" + req.user.username + ", " + req.user.super + ")");
});

/* Login page. */
app.get("/login", function (req, res) {
  // Already authenticated.
  if(req.isAuthenticated()) {
    res.redirect("/");

    // Log.
    console.log("already authenticated (" + req.user.username + ", " + req.user.super + ")");
  }
  // Not yet authenticated.
  else {
    res.sendFile(htmlpath_login);
  }
});

/* Login post. */
app.post("/login", passport.authenticate("local-login", {successRedirect: "/", failureRedirect: "/login"/*, failureFlash: true*/}));

/* Logout page. */
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/login");
});

/* The 404 page (Alway keep this as the last route). */
app.get("*", isLoggedIn, function(req, res){
  res.status(404).sendFile(htmlpath_404);
});

/* ================ */
/* Global variables */
/* ================ */

// Connected users count.
var connectedusers = 0;

// Server port.
const port  = 3030;

// HTML pages to render.
const htmlpath_404        = __dirname + "/html/404.html";
const htmlpath_index      = __dirname + "/html/index.html";
const htmlpath_indexsuper = __dirname + "/html/indexsuper.html";
const htmlpath_login      = __dirname + "/html/login.html";

// Database directory.
const dbdir = __dirname + "/db";

// Check database directory.
if (!fs.existsSync(dbdir)) {
  fs.mkdirSync(dbdir);
  
  // Log.
  console.log("Create database subdirectory '" + dbdir + "'");
}

// Databse.
var db = new sqlite3.Database((dbdir + "/users.db"));

// Default hardcoded users.
const users = [ {"username":"root"  , "password":"root"   , "super":true}
              , {"username":"admin" , "password":"admin"  , "super":true}];

// Launch the server.
const httpserver = app.listen(port);

// Socket.io.
var io = require('socket.io')(httpserver);

/* Process exit management */
process.on('SIGINT', () => {
  // Log.
  console.log("Exiting...");

  // Close the database connection.
  db.close();
  httpserver.close();
           
  // Do exit now.
  process.exit(0);
});

/* ==================== */
/* Socket.io management */
/* ==================== */

/* Socket.io connection. */
io.sockets.on("connection", function (socket) {
  // Count up.
  connectedusers++;

  // Log.
  console.log("client connected ! (" + connectedusers + ")");

  // Database.
  if (null != db) {
    db.serialize(function() {
      db.run("CREATE TABLE IF NOT EXISTS users (username TEXT UNIQUE, password TEXT, salt TEXT, super INT)");
      var stmt = db.prepare("INSERT OR IGNORE INTO users VALUES (?,?,?,?)");
      for (u in users) {
        hashedpassword = doHashPassword(users[u].password);
        stmt.run(users[u].username, hashedpassword.hash, hashedpassword.salt, users[u].super);
      }
      stmt.finalize();
    });

    // Log.
    console.log("Connected to the database.");
  };
              
  /* Socket.io disconnect. */
  socket.on("disconnect", () => {
    // Count down.
    --connectedusers;

    // Log.
    console.log("client disconnected");
  });
              
  /* Simple message. */
  socket.on("consolemessage", function(data) {
    // Log.
    console.log(data);
  });

  /* Check user name. */
  socket.on("userpresent", function(data, ackfn) {
    var query = "SELECT username FROM users WHERE username=\"" + data + "\"";
    db.all(query, function(err, row) {
      if (err) {
        ackfn({message:err.message});
      }
      // Not found.
      else if (0 == row.length) {
        ackfn({message:"User '" + data + "' is unknown"});
      }
      // Found.
      else {
        ackfn(null, row);

        // Log.
        console.log("userpresent() : " + "'" + query + "'");
      }
    });
  });
              
  /* List users. */
  socket.on("userlist", function(data, ackfn) {
    if (null==db) return;
    var query = "SELECT username, super FROM users";
    db.all(query, function(err, rows) {
      if (err) {
        ackfn({message:err.message});
      }
      else {
        ackfn(null, rows);

        // Log.
        console.log("userlist() : " + "'" + query + "'");
      }
    });
  });
              
  /* Add user. */
  socket.on("useradd", function(data, ackfn) {
    var passwddata = doHashPassword(data.password);
    var query = "INSERT INTO users VALUES (\"" + data.username + "\",\"" + passwddata.hash + "\",\"" + passwddata.salt + "\"," + ((data.super)?1:0) + ")";
    db.run(query, function(err) {
      if (err) {
        ackfn({message:err.message});
      }
      else {
        ackfn({message:"ok"});

        // Log.
        console.log("useradd() : " + "'" + query + "'");
      }
    });
  });

  /* Remove user. */
  socket.on("userdelete", function(data, ackfn) {
    var query = "DELETE FROM users WHERE username=\"" + data + "\"";
    db.run(query, function(err) {
      if (err) {
        ackfn({message:err.message});
      }
      else {
        ackfn({message:"ok"});

        // Log.
        console.log("userdelete() : " + "'" + query + "'");
      }
    });
  });
});


/* ======== */
/* Gone now */
/* ======== */

console.log("App running at localhost:" + port);
