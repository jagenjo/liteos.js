var self = this;
var request_root_path = "";

var PROC_WAITING = 1;

var listening_actions = {};

request_root_path = "../../";

self.out = function(msg, options)
{
	self.postMessage({action:"out", params: [msg,options]});
}

self.console = {
	clear: function()
	{
		self.postMessage({action:"eval", instance: "console", method:"clear"});
	},

	log: function(msg)
	{
		self.postMessage({action:"eval", instance: "console", method:"log", params: msg});
	},

	out: function(msg, options)
	{
		self.postMessage({action:"eval", instance: "console", method:"out", params: [msg,options]});
	},

	prompt: function(txt)
	{
		self.postMessage({action:"eval", instance: "console", method:"prompt", params: txt});
	},

	lock: function(v)
	{
		self.postMessage({action:"eval", instance: "console", method:"lock", params: v});
	},

	unlock: function(v)
	{
		self.postMessage({action:"eval", instance: "console", method:"unlock", params: v});
	},

	err: function(msg)
	{
		self.postMessage({action:"eval", instance: "console", method:"err", params: msg});
	}
}


listening_actions["launch"] = function(e)
{
	if(typeof(main) != "undefined")
		var ret = main( e.data.argv.split(" "), e.data.argv );
	else
		return console.err("app without main");
	if(ret == PROC_WAITING )
		self.postMessage({action: "waiting" });
	else
		self.postMessage({action: "finish" });
}

listening_actions["stdin"] = function(e)
{
	if(self.input_callback)
		self.input_callback( e.data.text );
	else
		stdout( e.data.text, {color:"red"} );
}

listening_actions["exit"] = function(e)
{
	exit();
}

//read messages
self.addEventListener('message', function(e) {

	if( e.data.action && listening_actions[e.data.action] )
		listening_actions[e.data.action](e);

	if (e.data.callid) //OSCALL RESPONSE
		onOSCallResponse(e.data);
}, false);

self.console.genUid = function() { return new Date().getTime() + (Math.random()*1000).toFixed(0); };

//process to query the server
var _last_oscall_id = 1;
var _oscalls = {};

function OSCALL( params, callback )
{
	params._callid = _last_oscall_id++;
	_oscalls[ params._callid ] = callback;
	self.postMessage(params);
}

function onOSCallResponse( data )
{
	var id = data.callid;
	if( _oscalls[id] )
		_oscalls[id](data.ret);
	delete _oscalls[id];
}

//main actions
function stdout(msg, options)
{
	self.out(msg, options);
}

function exit(errcode)
{
	if(typeof(onExit) != "undefined")
		onExit(errcode);
	self.postMessage({action:"onexit", params: errcode});
	self.close();
}

function readInput( callback )
{
	self.input_callback = callback;
	self.postMessage({action:"input"});
}

function manInfo(str)
{
	self.postMessage({module:"IO", action:"manInfo", params: str});
}

//****************** CORE LIBRARY ********************************************************

function htmlencode(str) {
    return str.replace(/[&<>"']/g, function($0) {
        return "&" + {"&":"amp", "<":"lt", ">":"gt", '"':"quot", "'":"#39"}[$0] + ";";
    });
}

var EOF = String.fromCharCode(4);