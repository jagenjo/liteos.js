
var SERVER = {
	DISCONNECTED: 0,
	WAITING_LOGIN: 1,
	CONNECTED: 2,
	RECONNECTING: 3,

	server_host: "tamats.com",
	server_port: 8086,
	ports: {},
	ip: null, //virtual ip

	status: 0,

	init: function()
	{
		this.connectToServer();
	},

	onProcessAction: function(process, action, params)
	{
		if(action == "openPort")
		{
			this.openPort(process, params);
		}
	},

	openPort: function( process, port )
	{
		this.ports[port] = process;
	},

	closePort: function(process, port)
	{
		delete this.ports[port];
	},

	connectToServer: function()
	{
		//connect to server
		var socket = new WebSocket("ws://" + this.server_host + ":" + this.server_port );
		socket.onopen = this.onServerOpen.bind(this);
		socket.onmessage = this.onServerMessage.bind(this);
		socket.onclose = this.onServerClose.bind(this);
		socket.onerror = function() { console.log("Server error"); }
		this.socket = socket;
	},

	onServerOpen: function(e)
	{
		console.log("Server open");
		this.status = SERVER.WAITING_LOGIN;
	},

	onServerMessage: function(e)
	{
		//console.log("Server msg: " + e.data );
		if(!e.data) return;

		var packet = null;
		try
		{
			packet = JSON.parse(e.data);
		}
		catch (err)
		{
			console.log("Wrong msg: ",err);
			return;
		}

		if(this.status == SERVER.WAITING_LOGIN)
		{
			if(packet.action != "login") return;
			this.ip = packet.ip;
			this.status = SERVER.CONNECTED;
		}
		else if(this.status == SERVER.CONNECTED)
		{
			//console.out(JSON.stringify(data));
			var process = this.ports[ packet.port ];
			if(process)
			{
				process.postMessage( {action:"packet", params: packet });
			}
			else
				console.log("no process found");
		}
	},

	onServerClose: function(e)
	{
		console.log("Server closed");
		console.err("Server connection lost");
	},

	"@sendPacket":true, //public
	sendPacket: function(ip, port, data)
	{
		if(this.socket)
			this.socket.send(JSON.stringify({ip:ip, port:port, data: data}));
		else
			return false;
		return true;
	},

	"@getIp":true, //public
	getIp: function()
	{
		return this.ip;
	}
};


SERVER.init();
OS.registerModule("SERVER",SERVER);