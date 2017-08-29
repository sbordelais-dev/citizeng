# citizeng

Server frond-end for authenticated Web services. 

## Features

TODO

## Installation

### Default installation

```
npm install citizeng
```

### Installation for development

```
# Clone the repository.
git clone https://github.com/LordHadder/citizeng.git mydir

# Go the cloned repository.
cd mydir

# Install required modules.
npm install express passport passport-local body-parser express-session sqlite3 socket.io --save

# Run the demo.
node citizeng-demo
```

## How to use

TODO

```
// Requirements.
var citizengserver = require('./citizeng');
```

```
// Initialize the server.
citizengserver.init(3030, "root", "root");
```

```
// Declare main page route.
citizengserver.get("/", function (req, res) {
  // Super user's page.
  if (req.user.super) {
    res.sendFile((__dirname + "/indexsuper.html"));
  }
  // Default user's page.
  else {
    res.sendFile((__dirname + "/index.html"));
  }
});
```

```
// Declare a reserved page route.
citizengserver.get("/admin", function(req, res) {
  res.send("This may have not effect!");
});
```

```
// Simple message using socket.io method.
citizengserver.ioset("consolemessage", function(data, ackfunc) {
  // Log.
  console.log(data);
});
```

```
// Declare a reserved Socket.io method.
citizengserver.ioset("useradd", function(data, ackfunc) {
  // Log.
  console.log("This may have not effect!");
});
```

```
// Start the server.
citizengserver.run();
```

## License

[MIT](https://github.com/socketio/socket.io/blob/master/LICENSE)
