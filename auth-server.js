// Requirements.
var loginpanel = require('./pass-auth-1.0');

// Initialize the server.
const server = loginpanel.init(3030);

// Declare main page route.
loginpanel.get("/", function (req, res) {
  // Super user's page.
  if (req.user.super) {
    res.sendFile((__dirname + "/indexsuper.html"));
  }
  // Default user's page.
  else {
    res.sendFile((__dirname + "/index.html"));
  }
});

// Declare a reserved page.
loginpanel.get("/admin", function (req, res) {
  res.send("This may have not effect!");
});

// Start the server.
loginpanel.run();
