"use_strict"

var self = this;
var request_root_path = "";

//define console when using workers
if( !self.document )
{
	request_root_path = "../../";
	self.console = {
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

	//close the worker
	self.exit = function(errcode)
	{
		self.postMessage({action:"exit", params: errcode});
	}

	//read messages
	self.addEventListener('message', function(e) {

		if(!self.app_className)
			return console.err("app not registered");
		
		if(e.data.action == "launch")
		{
			console.out("Launching app...");
			self.app = new self.app_className();
			if(self.app.stdin)
				self.postMessage({action: "sys", info:"stdin_enabled" });
		}
		if(e.data.action == "stdin")
		{
			if(self.app && self.app.stdin)
				self.app.stdin( e.data.text );
			self.postMessage({action: "sys", info:"ready" });
		}
	}, false);
}
else
{
	self.importScripts = function(){}; //nothing to do
	self.exit = function(){};
}

//define the main class
function MAINCLASS(className)
{
	self.app_className = className;
	//extend? ...
}

//****************** CORE LIBRARY ********************************************************


//easy request
function request(request_info)
{
	if(!request_info || !request_info.url)
		throw("Wrong use of request");
	var dataType = request_info.dataType || "text";
	if(dataType == "json") //parse it locally
		dataType = "text";
	else if(dataType == "xml") //parse it locally
		dataType = "text";
	else if (dataType == "binary")
	{
		//request_info.mimeType = "text/plain; charset=x-user-defined";
		dataType = "arraybuffer";
		request_info.mimeType = "application/octet-stream";
	}	
	else if(dataType == "image") //special case: images are loaded using regular images request
	{
		var img = new Image();
		img.onload = function() {
			if(request_info.success)
				request_info.success.call(this);
		};
		img.onerror = request_info.error;
		img.src = request_info.url;
		return img;
	}

	//on local paths
	if(request_root_path && request_info.url.indexOf("http://") == -1)
		request_info.url = request_root_path + request_info.url;

	//regular case, use AJAX call
	var xhr = new XMLHttpRequest();
	xhr.open(request_info.data ? 'POST' : 'GET', request_info.url, true);
	if(dataType)
		xhr.responseType = dataType;
	if (request_info.mimeType)
		xhr.overrideMimeType( request_info.mimeType );
	xhr.onload = function(load)
	{
		var response = this.response;
		if(this.status != 200)
		{
			var err = "Error " + this.status;
			if(request_info.error)
				request_info.error(err);
			if(xhr._fail_callback)
				xhr._fail_callback(err);
			return;
		}

		if(request_info.dataType == "json") //chrome doesnt support json format
		{
			try
			{
				response = JSON.parse(response);
			}
			catch (err)
			{
				if(request_info.error)
					request_info.error(err);
				if(xhr._fail_callback)
					xhr._fail_callback(err);
			}
		}
		else if(request_info.dataType == "xml")
		{
			try
			{
				var xmlparser = new DOMParser();
				response = xmlparser.parseFromString(response,"text/xml");
			}
			catch (err)
			{
				if(request_info.error)
					request_info.error(err);
				if(xhr._fail_callback)
					xhr._fail_callback(err);
			}
		}
		if(request_info.success)
			request_info.success.call(this, response);
		if(xhr._done_callback)
			xhr._done_callback(response);
	};
	xhr.onerror = request_info.error;
	xhr.send(request_info.data);

	xhr.done = function(callback) { this._done_callback = callback; return this; };
	xhr.fail = function(callback) { this._fail_callback = callback; return this; };
	return xhr;
}

function getText(url, data_or_callback, callback)
{
	var data = null;
	if(typeof(data_or_callback) == "function")
		callback = data_or_callback;
	else
		data = data_or_callback;
	return request({url:url, data: data, success: callback});
}

function getJSON(url, data_or_callback, callback)
{
	var data = null;
	if(typeof(data_or_callback) == "function")
		callback = data_or_callback;
	else
		data = data_or_callback;
	return request({url:url, dataType:"json", data: data, success: callback});
}