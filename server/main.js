/* Protocol **********************
    send -> DEST_IP|PORT|json
    received <- SEND_IP|PORT|json
*/

var WebSocketServer = require('websocket').server;
var http = require('http');
var readline = require('readline');
var crypto = require('crypto');

var port = 8086;

var last_user_id = 1;
var num_users = 0;
var users = {};
var users_by_vip = {};

var key = "";

//HTTP
var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
    response.write("Users: " + num_users);
    response.end();
});

// create the WS server
wsServer = new WebSocketServer({
    httpServer: server
});

// on WebSocket request
wsServer.on('request', onNewUser );

function sendToAll(client, msg)
{
    for(var i in users)
        users[i].send(msg)
}

//create virtual ip
function createVIP( id )
{
	var md5sum = crypto.createHash('md5');
	md5sum.update( key );
	md5sum.update( id.toString() );
	md5sum.update( (new Date().getTime()).toString() );		
	return md5sum.digest('hex');
}


function Client(socket)
{
    this.id = last_user_id++;
	this.vip = createVIP(this.id);
    this.socket = socket;
    this.send({action:"login", ip: this.vip }); //send info

    socket.on('message', this.onMessage.bind(this));
    socket.on('close', this.onClose.bind(this));

}

Client.prototype.send = function(msg)
{
    if(typeof(msg) != "string")
        msg = JSON.stringify(msg);
    this.socket.send(msg);
}

Client.prototype.onMessage = function(msg)
{
    //console.log(msg);

	var data = JSON.parse( msg.utf8Data );
	data.from = this.vip;
	if(data.ip == "*")
	    sendToAll( this, data );
	else
	{
		var user = users_by_vip[ data.ip ];
		if(user)
			user.send(data);
	}
}

Client.prototype.onClose = function(msg)
{
    console.log("user close: " + this.id);
    //remove
    delete users[ this.id ];
	delete users_by_vip[this.vip];
    num_users--;
}


function onNewUser(request)
{
	//connection
    var connection = request.accept(null, request.origin);

    //create client
    var client = new Client(connection);
    users[client.id] = client;
	users_by_vip[client.vip] = client;
    num_users++;
    connection._client = connection;

    console.log("New user: " + client.id + " VIP: " + client.vip );
}

//set server key
if( process.argv.length > 2 )
	key = process.argv[2];
else
	key = (new Date().getTime() + (Math.random() * 1000)).toString();

server.listen(port, function() { });
console.log("LiteOS Server listening in port "+port+"...");
console.log(" + key: " + key );
