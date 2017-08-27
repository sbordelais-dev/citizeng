var express         = require('express'),
    app             = express(),
    fs              = require('fs'),
    crypto          = require('crypto'),
    passport        = require('passport'),
    LocalStrategy   = require('passport-local').Strategy,
    bodyParser      = require('body-parser'),
    session         = require('express-session'),
    sqlite3         = require('sqlite3').verbose();

// Generate salt.
var genRandomString = function(length){
  return crypto.randomBytes(Math.ceil(length/2))
  .toString('hex')
  .slice(0,length);
};

// Hash password with sha512.
var sha512 = function(password, salt){
  var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  var value = hash.digest('hex');
  return { salt:salt, passwordHash:value };
};

// Hash password.
function saltHashPassword(userpassword) {
  var salt = genRandomString(16/* Default string size */);
  var passwordData = sha512(userpassword, salt);
  //console.log('UserPassword = '+userpassword);
  //console.log('Passwordhash = '+passwordData.passwordHash);
  //console.log('nSalt = '+passwordData.salt);
  return passwordData;
}

// Serialize users.
passport.serializeUser(function (user, done) {
 if (null!=user) done(null, user.username);
});

// Deserialize users.
passport.deserializeUser(function (username, done) {
  var query = "SELECT username, super FROM users WHERE username=\"" + username + "\"";
  db.all(query, function(err, row) {
    if (err) {
      // User not found.
      return done(err);
    }
    if ((null!=row)&&(null!=row[0])&&(username===row[0].username)) {
      console.log(query + "(" + row[0].username + ")");
      return done(null, row[0]);
    }
         
    // User not found.
    return done(err);
  });
});
 
// Passport local strategy for local-login, local refers to this app.
passport.use('local-login', new LocalStrategy(
  function (username, password, done) {
    var query = "SELECT username, password, salt, super FROM users WHERE username=\"" + username + "\"";
    db.all(query, function(err, row) {
      if (err) {
        // User not found.
        return done(err, null, {message: "User not found."});
      }
      if ((null!=row)&&(null!=row[0])) {
        var passwordData = sha512(password, row[0].salt);
        if (passwordData.passwordHash===row[0].password) {
          console.log(query + "(" + row[0].username + ", " + row[0].super + ")");
          return done(null, row[0], {message: "Yes!"});
        }
      }
        
      // User not found.
      return done(err, null, {message: "User not found."});
    });
  })
);
 
// Retrieving form data.
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({extended: true}));
 
// Initialize passposrt and and session for persistent login sessions.
app.use(session({
  secret: "chainesecrete",
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
 
// Route middleware to ensure user is logged in.
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
  console.log("Unauthorized access !");
}

// Main page.
app.get("/", isLoggedIn, function (req, res) {
  if(req.user.super) {
    res.sendFile(__dirname + "/html/indexsuper.html");
  }
  else {
    res.sendFile(__dirname + "/html/index.html");
  }
  console.log("main page (" + req.user.username + ", " + req.user.super + ")");
});

// Login page.
app.get("/login", function (req, res) {
  if(req.isAuthenticated()) {
    console.log("already authenticated (" + req.user.username + ", " + req.user.super + ")");
    res.redirect("/");
  }
  else {
    console.log("You need to login to view this page");
    res.sendFile(__dirname + "/html/login.html");
  }
});

// Login post.
app.post("/login", passport.authenticate("local-login", { successRedirect: "/", failureRedirect: "/login"/*, failureFlash: true*/}));

// Logout page.
app.get("/logout", function (req, res) {
  req.logout();
  console.log("logout success!");
  res.redirect("/login");
  });

// The 404 page (Alway keep this as the last route).
app.get("*", isLoggedIn, function(req, res){
  res.status(404).sendFile(__dirname + "/html/404.html");
});

// Server port.
var port  = 3030;

// Database directory.
var dbdir = __dirname + "/db";

// Check database directory.
if (!fs.existsSync(dbdir)) {
  fs.mkdirSync(dbdir);
  console.log("Create database directory '" + dbdir + "'");
}

// Launch the server.
const httpserver = app.listen(port);

// Databse.
var db = new sqlite3.Database((dbdir + "/users.db"));

// Load socket.io.
var io = require('socket.io')(httpserver);

// Connected users count.
var connectedusers = 0;

// Default hardcoded users.
var users = [ {"username":"root"  , "password":"root"   , "super":true}
            , {"username":"admin" , "password":"admin"  , "super":true}];

// Log new client.
io.sockets.on("connection", function (socket) {
  connectedusers++;
  console.log("client connected ! (" + connectedusers + ")");

  // Database.
  if (null!=db) {
    db.serialize(function() {
      db.run("CREATE TABLE IF NOT EXISTS users (username TEXT UNIQUE, password TEXT, salt TEXT, super INT)");
      var stmt = db.prepare("INSERT OR IGNORE INTO users VALUES (?,?,?,?)");
      for (u in users) {
        passwddata = saltHashPassword(users[u].password);
        stmt.run(users[u].username, passwddata.passwordHash, passwddata.salt, users[u].super);
      }
      stmt.finalize();
    });
    console.log("Connected to the database.");
  };
              
  // Disconnect message.
  socket.on("disconnect", () => {
    --connectedusers;
    console.log("client disconnected");
  });
              
  // Simple message.
  socket.on("consolemessage", function(data) {
    console.log(data);
  });

  // Check user name.
  socket.on("clientusername", function(data, ackfn) {
    var query = "SELECT username FROM users WHERE username=\"" + data + "\"";
    db.all(query, function(err, rows) {
      if (err) {
        ackfn("");
        return console.log(err.message);
      }
      console.log(query + "(" + rows + ")");
      ackfn(rows);
    });
  });
              
  // Users list.
  socket.on("userslist", function(data, ackfn) {
    if (null==db) return;
    var query = "SELECT username, super FROM users";
    db.all(query, function(err, rows) {
      if (err) return console.log(err.message);
      ackfn(rows);
      console.log(query);
    });
  });
              
  // Add user.
  socket.on("adduser", function(data, ackfn) {
    var passwddata = saltHashPassword(data.password);
    var query = "INSERT INTO users VALUES (\"" + data.username + "\",\"" + passwddata.passwordHash + "\",\"" + passwddata.salt + "\"," + ((data.super)?1:0) + ")";
    db.run(query, function(err) {
      if (err) return console.log(err.message);
      console.log(query);
      ackfn(data);
    });
  });

  // Remove user.
  socket.on("removeuser", function(data, ackfn) {
    var query = "DELETE FROM users WHERE username=\"" + data + "\"";
    db.run(query, function(err) {
      if (err) return console.log(err.message);
      console.log(query);
      ackfn(data);
    });
  });
});

process.on('SIGINT', () => {
  console.log("Exiting...");
  // Close the database connection.
  db.close();
  httpserver.close();
  process.exit(0);
});

console.log("App running at localhost:" + port);
