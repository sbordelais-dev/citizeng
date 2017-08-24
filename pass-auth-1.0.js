var express         = require('express'),
    app             = express(),
    passport        = require('passport'),
    LocalStrategy   = require('passport-local').Strategy,
    bodyParser      = require('body-parser'),
    session         = require('express-session'),
    cookie          = require('cookie');
var port  = 3030;

// Configure app.
//app.use(express.static(__dirname + "/html"));

// Hardcoded users, ideally the users should be stored in a database.
var users = [ {"id":1, "username":"root"  , "password":"root"   , "super":true}
            , {"id":5, "username":"admin" , "password":"admin"  , "super":false}];
 
// Serialize users.
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

// Deserialize users.
passport.deserializeUser(function (id, done) {
  // Walk users array.
  for (u in users) {
    if (users[u].id == id) done(null, users[u]);
  }
});
 
// Passport local strategy for local-login, local refers to this app.
passport.use('local-login', new LocalStrategy(
  function (username, password, done) {
    // Walk users array.
    for (u in users) {
      if ((username === users[u].username) && (password === users[u].password)) {
        return done(null, users[u], {message: "Yes!"});
      }
    }
    // User not found.
    return done(null, false, {message: "User not found."});
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
app.get("*", function(req, res){
  res.status(404).sendFile(__dirname + "/html/404.html");
});

// Launch the app.
const httpserver = app.listen(port);

// Load socket.io.
var io = require('socket.io')(httpserver);

// Log new client.
io.sockets.on("connection", function (socket) {
  console.log("client connected !");

  // Simple message.
  socket.on("clientmessage", function(data) {
    console.log(data);
  });

  // Check user name.
  socket.on("clientusername", function(data, ackfn) {
    var isPresent = false;
    // Walk users array.
    for (u in users) {
      if (users[u].username == data) { isPresent = true; break; }
    }
    ackfn((isPresent)? "yes" : "no");
  });

  // Disconnect message.
  socket.on("disconnect", () => {
    console.log("client disconnected");
  });
});


console.log("App running at localhost:" + port);
