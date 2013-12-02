//for request and server interaction
var network = { ip: null, ports: {} };

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

function requestText(url, data_or_callback, callback)
{
	var data = null;
	if(typeof(data_or_callback) == "function")
		callback = data_or_callback;
	else
		data = data_or_callback;
	return request({url:url, data: data, success: callback});
}

function requestJSON(url, data_or_callback, callback)
{
	var data = null;
	if(typeof(data_or_callback) == "function")
		callback = data_or_callback;
	else
		data = data_or_callback;
	return request({url:url, dataType:"json", data: data, success: callback});
}

function openPort(port_number, callback, error_callback )
{
	if(network.ports[ port_number ])
	{
		return false; //already open
	}
	network.ports[ port_number ] = { start: new Date().getTime(), callback: callback, error: error_callback };
	self.postMessage({module:"SERVER", action:"openPort", params: port_number });	
	return true;
}

function closePort(port_number)
{
	if(!network.ports[ port_number ])
		return;
	delete network.ports[ port_number ];
	self.postMessage({module:"SERVER", action:"closePort", params: port_number });	
}

function sendPacket(ip, port, data)
{
	OSCALL({module:"SERVER", method:"sendPacket", params: [ip, port, data] });	
}

//packet received
listening_actions["packet"] = function(e)
{
	var packet = e.data.params;
	var registered = network.ports[ packet.port ];
	//console.log( JSON.stringify(  network.ports ) );
	if(registered)
		registered.callback(packet);
	else
		console.error("packet without port");
}

listening_actions["newip"] = function(e)
{
	network.ip = e.data.params;
}

OSCALL({module:"SERVER", method:"getIp"}, function(ip) { network.ip = ip; });