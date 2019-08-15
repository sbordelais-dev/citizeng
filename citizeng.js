/* ============= */
/* Requierements */
/* ============= */

var express         = require('express'),
    fs              = require('fs'),
    http            = require('http'),
    https           = require('https'),
    crypto          = require('crypto'),
    nodemailer      = require('nodemailer');
    passport        = require('passport'),
    path            = require('path'),
    LocalStrategy   = require('passport-local').Strategy,
    bodyParser      = require('body-parser'),
    session         = require('express-session'),
    sqlite3         = require('sqlite3').verbose();

/* ============== */
/* Help functions */
/* ============== */

/* Random string generator function. */
function genRandomString(length){
  return crypto.randomBytes(Math.ceil(length/2))
  .toString('hex')
  .slice(0,length);
};

/* Function to hash password with sha512 algorithm. */
function sha512(userpassword, salt){
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

/* Update user password. */
function changePasswordInDatabase(db, username, newpassword, done) {
  if ((null == db) || (null == done)) return ;
  if ((null == username) || (0 == username.length)) return ;
  if ((null == newpassword) || (0 == newpassword.length)) return ;

  // Look for salt.
  var query = "SELECT salt FROM users WHERE username=\"" + username + "\"";
  db.get(query, function(err, row) {
    // Not found.
    if (err) {
      done({message:err.message});

      // Oops.
      return ;
    }

    // Log.
    console.log("changePasswordInDatabase() : " + "'" + query + "'");

    // Hash new password.
    var newPasswordData = sha512(newpassword, row.salt);

    // Replace password.
    query = "UPDATE users SET password=\"" + newPasswordData.hash + "\" WHERE username=\"" + username + "\"";
    db.run(query, function(err) {
      if (err) {
        done({message:err.message});

        // Oops.
        return ;
      }

      // Ok.
      done(null);

      // Log.
      console.log("changePasswordInDatabase() : " + "'" + query + "'");
    });
  });
}

/* Add user. */
function addUserInDatabase(db, email, name, password, sup, done) {
  if ((null == db) || (null == done)) return ;
  if ((null == name) || (0 == name.length)) return ;
  if ((null == password) || (0 == password.length)) return ;
  
  var passwddata = doHashPassword(password);
  var query = "INSERT INTO users VALUES (\"" + email + "\",\"" + name + "\",\"" + passwddata.hash + "\",\"" + passwddata.salt + "\"," + ((sup)?1:0) + ", 0)";
  db.run(query, function(err) {
    if (err) {
      done({message:err.message});
    }
    else {
      // Ok.
      done(null);

      // Log.
      console.log("useradd() : " + "'" + query + "'");
    }
  });
}

/* Send mail */
function sendMail(servermail, usermail, username, password, done) {
  // Create nodemailer transport.
  var transport = nodemailer.createTransport(servermail.transport);

  // Setup mail option.
  var mailOptions = {
    from: transport.options.auth.user,
    to: usermail,
    subject: servermail.message.subject,
    text: "Nom d'utilisateur: " + username + "\nMot de passe: " + password
  };

  // Send mail with the password.
  transport.sendMail(mailOptions, function(err, info){
    if (err) {
      done({message:err.message});

      // Log.
      console.log(err);
    } else {
      // Done.
      done(null);

      // Log.
      console.log('Email sent: ' + info.response);
    }
  });
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
  var query = "SELECT username, super, master FROM users WHERE username=\"" + username + "\"";
  server.db.get(query, function(err, row) {
    // Not found.
    if (err) return done({message:err.message});

    // Found.
    if ((null != row) && (username === row.username)) {
      // Log.
      console.log("passport.deserializeUser() : '" + query + "'");

      // Done.
      return done(null, row);
    }

    // Oops.
    return done(null, null);
  });
});
 
/* Passport local strategy for local-login. */
passport.use('local-login', new LocalStrategy(function (username, password, done) {
  var query = "SELECT username, password, salt, super FROM users WHERE username=\"" + username + "\"";
  server.db.get(query, function(err, row) {
    // Not found.
    if (err) return done({message:err.message});

    // Found.
    if (null != row) {
      // Hash password.
      var passwordData = sha512(password, row.salt);

      // Compare.
      if (passwordData.hash === row.password) {
        // Log.
        console.log("passport.use() : '" + query + "'");

        // Done.
        return done(null, row);
      }
    }

    // Oops.
    return done(null, null);
  });
}));

/* ================ */
/* Global variables */
/* ================ */

// Connected users count.
var connectedusers = 0;

// Reserved HTML pages to render.
const htmlpath_404    = __dirname + "/html/404.html";
const htmlpath_admin  = __dirname + "/html/admin.html";
const htmlpath_login  = __dirname + "/html/login.html";

// Default super users.
var masterusers = [];

// The 'Express' app.
var app = null;

// Array of Socket.io objects.
var iofuncs = [];

// Life cycle functions.
var lifecycle = {init:null,fina:null};

// Server object.
const server =  { db:null
                , http:null
                , io:null
                 , mail:null};

/* Release server object */
function finalize() {
  if (null == server) return ;

  // Close the database connection.
  if (null != server.db) {
    server.db.close();
    server.db = null;
  }

  // Disconnect socket.io.
  if (null != server.io) {
    //server.io.Disconnect();
    server.io = null;
  }

  // Close server connection.
  if (null != server.server) {
    server.http.close();
    server.http = null;
  }
}

/* Process exit management */
process.on('SIGINT', () => {
  // Log.
  console.log("Exiting...");

  // Finalize call back.
  if (null != lifecycle.fina) lifecycle.fina();

  // Release server object.
  finalize();

  // Do exit now.
  process.exit(0);
});

/* ================== */
/* Exported functions */
/* ================== */

/* Initialize the server */
exports.init = function(port, username, password, email, dirname) {
  // Already started.
  if (null != app) return ;

  // Create express app.
  if (null == (app = express())) return ;

  /* ========================= */
  /* Application configuration */
  /* ========================= */
  
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
  
  /* Authorize script directory. */
  app.use("/citizeng.js", express.static(path.join(__dirname, "js")));

  /* Authorize style directory. */
  app.use("/citizeng.css", express.static(path.join(__dirname, "css")));

  if (null != dirname) {
    /* Authorize certificate directory for callee. */
    app.use("/cert", express.static(path.join(dirname, "cert")));
    
    /* Authorize script directory for callee. */
    app.use("/js", express.static(path.join(dirname, "js")));

    /* Authorize style directory for callee. */
    app.use("/css", express.static(path.join(dirname, "css")));
  }

  /* ==================== */
  /* Server configuration */
  /* ==================== */

  // Certificate path.
  const certpath = path.join(dirname, "cert");
  var certificate = { crt: null
                    , key: null
                    , pas: ""};

  try {
    // Optional pass phrase.
    certificate.pas = "" + fs.readFileSync(path.join(certpath, "passphrase")) + "";
  }
  catch(err) {
    // Oops.
    certificate.pas = "";
    console.log(err.message);
  }

  try {
    // Check certificate presence.
    certificate.crt = fs.readFileSync(path.join(certpath, "crt.pem"))
    certificate.key = fs.readFileSync(path.join(certpath, "key.pem"))
    console.log("Certificate installed in '" + certpath + "'");

    // Start the HTTP server (secured).
    if (null == (server.http = https.createServer ( { key:certificate.key
                                                    , cert:certificate.crt
                                                    , passphrase:certificate.pas}
                                                    , app).listen(port))) return server;
  }
  catch(err) {
    // Oops.
    certificate.crt = null;
    certificate.key = null;
    console.log(err.message);

    // Start the HTTP server.
    if (null == (server.http = http.createServer(app).listen(port))) return server;
  }

  // Socket.io.
  if (null == (server.io = require('socket.io')(server.http))) {
    // Release server object.
    finalize();

    // Done.
    return ;
  }

  // Database directory.
  const dbdir = ((null != dirname)? dirname : path.join(__dirname, "db"));

  // Check database directory.
  if (!fs.existsSync(dbdir)) {
    fs.mkdirSync(dbdir);

    // Log.
    console.log("Create database subdirectory '" + dbdir + "'");
  }

  // Database.
  if (null == (server.db = new sqlite3.Database(path.join(dbdir, "users_with_mail.db")))) {
    // Release server object.
    finalize();

    // Done.
    return ;
  }

  // Mail configuration file.
  const mailconf = ((null != dirname)? path.join(dirname, "mail.conf") : path.join(__dirname, "mail.conf"));

  // Read mail configuration file.
  fs.readFile(mailconf, 'utf-8', function (err, content) {
    if (err) {
      // Log.
      console.log("Mail configuration file '" + mailconf + "' NOT found");
    }
    else {
      // Load file content.
      server.mail = JSON.parse(content);
    }
  });

  // Add default super user.
  masterusers.push({email:email, username:username, password:password, super:true, master:1});
}

/* Run the server */
exports.run = function (init, fina) {
  // Server is already running.
  if (null == server) return ;

  // Save lifecycle callbacks.
  lifecycle.init = init;
  lifecycle.fina = fina;

  /* =================== */
  /* Application routers */
  /* =================== */

  /* Login route. */
  app.get("/login", function (req, res) {
    // Already authenticated.
    if (req.isAuthenticated()) {
      res.redirect("/");

      // Log.
      console.log("already authenticated (" + req.user.username + ", " + req.user.super + ")");
    }
    // Not yet authenticated.
    else {
      res.sendFile(htmlpath_login);
    }
  });

  /* Login post route. */
  app.post("/login", function(req, res, next) {
    // Log
    console.log("ip: " + req.connection.remoteAddress);
           
    // Need to update password.
    if ((null != req.body.newpassword) && (0 < req.body.newpassword.length)) {
      changePasswordInDatabase(server.db, req.body.username, req.body.newpassword, function(err){
        if (null != err) {
          console.log(err.message);
                          
          // Return to login page.
          res.sendFile(htmlpath_login);

          // Oops.
          return ;
        }
        else {
          // Swap password.
          req.body.password = req.body.newpassword;
        }
      });
    }

    // Do passport.
    passport.authenticate("local-login", {successRedirect: "/", failureRedirect: "/login"/*, failureFlash: true*/})(req, res, next);
  });

  /* Logout route. */
  app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/login");
  });

  /* Administration page. */
  app.get("/admin", isLoggedIn, function (req, res) {
    // Administration page.
    if (req.user.super) {
      res.sendFile(htmlpath_admin);
    }
    // Forbidden page.
    else {
      res.status(404).sendFile(htmlpath_404);
    }
  });

  /* Whoami REST API */
  app.get("/whoami", isLoggedIn, function(req, res) {
    if (null != req.user ) {
      res.status(200).json({username:req.user.username, super:req.user.super});
    }
    else {
      res.status(200).json({message:"no user defined"});
    }
  });
  
  /* The 404 route (Alway keep this as the last route). */
  app.get("*", isLoggedIn, function(req, res){
    res.status(404).sendFile(htmlpath_404);
  });

  /* ==================== */
  /* Socket.io management */
  /* ==================== */

  /* Socket.io connection. */
  server.io.sockets.on("connection", function (socket) {
    // Count up.
    connectedusers++;

    // Log.
    console.log("client connected ! (" + connectedusers + ")");

    // Database.
    server.db.serialize(function() {
      server.db.run("CREATE TABLE IF NOT EXISTS users (email TEXT UNIQUE, username TEXT UNIQUE, password TEXT, salt TEXT, super INT, master INT)");
      var stmt = server.db.prepare("INSERT OR IGNORE INTO users VALUES (?,?,?,?,?,?)");
      for (u in masterusers) {
        hashedpassword = doHashPassword(masterusers[u].password);
        stmt.run(masterusers[u].email, masterusers[u].username, hashedpassword.hash, hashedpassword.salt, masterusers[u].super, masterusers[u].master);
      }
      stmt.finalize();
    });

    // Log.
    console.log("Connected to the database.");

    /* Socket.io disconnect. */
    socket.on("disconnect", () => {
      // Count down.
      --connectedusers;

      // Log.
      console.log("client disconnected");
    });

    /* Check user name. */
    socket.on("userpresent", function(data, ackfn) {
      var query = "SELECT username, super FROM users WHERE username=\"" + data + "\"";
      server.db.get(query, function(err, row) {
        if (err) {
          ackfn({message:err.message});
        }
        // Not found.
        else if (null == row) {
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
      var query = "SELECT username, super, master, email FROM users";
      server.db.all(query, function(err, rows) {
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
      addUserInDatabase(server.db, data.email, data.username, data.password, data.super, ackfn);
    });

    /* Remove user. */
    socket.on("userdelete", function(data, ackfn) {
      var query = "DELETE FROM users WHERE username=\"" + data + "\"";
      server.db.run(query, function(err) {
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

    /* Change user password. */
    socket.on("userchangepassword", function(data, ackfn) {
      changePasswordInDatabase(server.db, data.username, data.newpassword, ackfn);
    });

    /* Change user password. */
    socket.on("userregister", function(username, usermail, ackfn) {
      var query = "SELECT email, username FROM users WHERE email=\"" + usermail + "\"";
      server.db.get(query, function(err, row) {
        if (err) {
          ackfn({message:err.message});
        }
        // Not found.
        else if (null == row) {
          // Generate new password.
          var newPassword = genRandomString(10);

          // Add this new user.
          addUserInDatabase(server.db, usermail, username, newPassword, false, function(err) {
            if (null == err) {
              // Do send mail to the user.
              sendMail(server.mail, usermail, username, newPassword, ackfn);
            }
          });
        }
        // Found.
        else {
          // User name and mail matches.
          if((row.email === usermail) && (row.username === username)) {
            // Generate new password.
            var newPassword = genRandomString(10);

            // Update password in the database.
            changePasswordInDatabase(server.db, username, newPassword, function(err) {
              if (null == err) {
                // Do send mail to the user.
                sendMail(server.mail, usermail, username, newPassword, ackfn);
              }
            });
          }
          else {
            // Bad user.
            ackfn({message:"KO"});
          }
        }
      });
    });

    // Customized Socket.io functions.
    for (f in iofuncs) {
      iofunc = iofuncs[f];
      socket.on(iofunc.method, iofunc.func);
    }
  });

  // Initialize call back.
  if (null != lifecycle.init) lifecycle.init();
}

/* Register custom GET method route. */
exports.get = function(route, file, superfile, func) {
  if (null == app) return ;

  // Reserved routes.
  if ((route === "/admin")
  ||  (route === "/login")
  ||  (route === "/logout")
  ||  (route === "/whoami")) {
    // Log.
    console.log("get() : Could NOT register GET method route " + "'" + route + "' (reserved)");

    // Get out.
    return ;
  }

  // Log.
  console.log("get() : Registering GET method route " + "'" + route + "'");

  // Do GET.
  app.get(route, isLoggedIn, function(req, res) {
    var restin = (0 == req.query.length)? {username:req.user.username, super:req.user.super} : {username:req.user.username, super:req.user.super, query:req.query};
    // Super user.
    if (req.user.super) {
      if (null != superfile) res.sendFile(superfile);
      else if (null != file) res.sendFile(file);
      else if (0 != req.query.length) {
        if (null != func) {
          func(restin, function ackfnc(restout) {
            res.status(200).json(restout);
          });
        }
        else res.status(200).json(restin);
      }
      else res.status(404).sendFile(htmlpath_404);
    }
    // Forbidden page.
    else {
      if (null != file) res.sendFile(file);
      else if (0 != req.query.length) {
        if (null != func) {
          func(restin, function ackfnc(restout) {
            res.status(200).json(restout);
          });
        }
        else res.status(200).json(restin);
      }
      else res.status(404).sendFile(htmlpath_404);
    }
  });
};

/* Register custom POST method route. */
exports.post = function(route, file, superfile, func) {
  if (null == app) return ;

  // Reserved routes.
  if (route === "/login") {
    // Log.
    console.log("post() : Could NOT register POST method route " + "'" + route + "' (reserved)");
    
    // Get out.
    return ;
  }

  // Log.
  console.log("post() : Registering POST method route " + "'" + route + "'");

  // Do POST.
  app.post(route, isLoggedIn, function(req, res) {

    // Content type (JSON only).
    var contype = req.headers['content-type'];
    if (!contype || (0 !== contype.indexOf('application/json'))) {
      // Log.
      console.log("post() : Content-type must be 'application/json'");
     
      // Forbidden access.
      res.status(404).sendFile(htmlpath_404);

      // Get out.
      return ;
    }

    var restin = (0 == req.body.length)? {username:req.user.username, super:req.user.super} : {username:req.user.username, super:req.user.super, query:req.body};

    // Super user.
    if (req.user.super) {
      if (null != superfile) res.sendFile(superfile);
      else if (null != file) res.sendFile(file);
      else if (0 != req.body.length) {
        if (null != func) {
          func(restin, function ackfnc(restout) {
            res.status(200).json(restout);
          });
        }
        else res.status(200).json(restin);
      }
      else res.status(404).sendFile(htmlpath_404);
    }
    // Forbidden page.
    else {
      if (null != file) res.sendFile(file);
      else if (0 != req.body.length) {
        if (null != func) {
          func(restin, function ackfnc(restout) {
            res.status(200).json(restout);
          });
        }
        else res.status(200).json(restin);
      }
      else res.status(404).sendFile(htmlpath_404);
    }
  });
};

/* Register custom Socket.io function */
exports.ioset = function(method, func) {
  if ((null == app) || (null == iofuncs)) return ;

  // Reserved.
  if ((method == null)
  ||  (method === "useradd")
  ||  (method === "userdelete")
  ||  (method === "userlist")
  ||  (method === "userpresent")) {
    // Log.
    console.log("ioset() : Could NOT register Socket.io method " + "'" + method + "' (reserved)");

    // Get out.
    return ;
  }

  // Build private Socket.io object...
  var ioobj = {method:method, func:func};

  // ... and add it to the list.
  iofuncs.push(ioobj);

  // Log.
  console.log("ioset() : Registering Socket.io method " + "'" + method + "'");
};

/* Register custom Socket.io function */
exports.ioemit = function(message, data) {
  server.io.emit(message, data);
};

