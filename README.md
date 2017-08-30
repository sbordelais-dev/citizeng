# citizeng
A turnkey user-password-based framework to create an authenticated HTTP-server. 
## Purpose
This project provides a parent HTTP-server class users can derive from to build authenticated Web services. It is supposed to be used on a **small** and **local network**. A particular attention is paid to ensure it can run easily on small devices (more particularly on a [Raspberry pi](https://www.raspberrypi.org/) system).
## Features
* Use [PassportJS](http://passportjs.org/) as an authentication framework.
* Support real-time HTML rendering thanks to [socket.io](https://socket.io/) framework.
* Simple and lightweight users management using [sqlite3](https://www.npmjs.com/package/sqlite3) database.
* Offer basic users management: list, add, remove users and password change.
## Installation
### Default installation
```Shell
npm install citizeng
```
### Installation for development
```Shell
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
First, you need to load `citizeng` module to retrieve an HTTP-server object:
```JavaScript
var citizeng = require('citizeng');
```
The server object must be initialized first by providing a `port number`, a master `user name` and and the master user `password`.

In the following sample, the server will be accessible from the URL **http://localhost:3030**, the user is **Groot** with password **root**:
```JavaScript
citizeng.init(3030, "Groot", "root");
```
TODO
```JavaScript
// Declare main page route.
citizeng.get("/", function (req, res) {
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
TODO
```JavaScript
// Declare a reserved page route.
citizeng.get("/admin", function(req, res) {
  res.send("This may have not effect!");
});
```
TODO
```JavaScript
// Simple message using socket.io method.
citizeng.ioset("consolemessage", function(data, ackfunc) {
  // Log.
  console.log(data);
});
```
TODO
```JavaScript
// Declare a reserved Socket.io method.
citizeng.ioset("useradd", function(data, ackfunc) {
  // Log.
  console.log("This may have not effect!");
});
```
Now start the server:
```JavaScript
citizeng.run();
```
## Next things to do
- [ ] To support secured protocol (HTTPS)
- [ ] To offer a way to customize private pages view (CSS)
- [ ] To make unit test ([mocha](https://mochajs.org/)?)
## License
[MIT](https://github.com/socketio/socket.io/blob/master/LICENSE)
