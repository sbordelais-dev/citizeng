var express         = require('express'),
    app             = express(),
    passport        = require('passport'),
    LocalStrategy   = require('passport-local').Strategy,
    bodyParser      = require('body-parser'),
    session         = require('express-session');
var port = 3030;

// Configure app.
//app.use(express.static(__dirname + "/html"));

// hardcoded users, ideally the users should be stored in a database
var users = [{"id":1, "username":"root", "password":"root"}];
 
// passport needs ability to serialize and unserialize users out of session
passport.serializeUser(function (user, done) {
    done(null, users[0].id);
});
passport.deserializeUser(function (id, done) {
    done(null, users[0]);
});
 
// passport local strategy for local-login, local refers to this app
passport.use('local-login', new LocalStrategy(
    function (username, password, done) {
        if (username === users[0].username && password === users[0].password) {
            return done(null, users[0]);
        } else {
            return done(null, false, {"message": "User not found."});
        }
    })
);
 
// Retrieving form data.
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
 
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
  //res.sendStatus(401);
  res.redirect("/login");
  console.log("Unauthorized access !");
}

// Main page.
app.get("/", isLoggedIn, function (req, res) {
  res.sendFile(__dirname + "/html/index.html");
  console.log("main page");
});

// Login page.
app.get("/login", function (req, res) {
  if(req.isAuthenticated()) {
    res.redirect("/");
    console.log("already authenticated");
  }
  else {
    res.sendFile(__dirname + "/html/login.html");
  }
  console.log("login page");
});

// Login post.
app.post("/login", passport.authenticate("local-login", { failureRedirect: "/login"}),
         function (req, res) {
         res.redirect("/");
         });

// Logout page.
app.get("/logout", function (req, res) {
        req.logout();
        res.redirect("/login");
        console.log("logout success!");
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

  // Join message.
  socket.on("clientmessage", function(data) {
    console.log(data);
  });

  // Disconnect message.
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

console.log("App running at localhost:" + port);
