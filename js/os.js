var OS = {
	ready: false,
	server_url: "ajax.php",
	modules: {},
	registered_commands: {},
	registered_envvars: {},
	registered_apps: {},

	current_process: null,
	fg_process_stack: [],
	bg_process_stack: [],
	last_process_id: 0,

	init: function(on_ready)
	{
		if(this.ready) throw("already init");
		OS.loadModulesFromList("default_modules.txt", on_ready );

		TERM.stdin = this.stdin.bind(this);
		TERM.keyHandler = this.keyHandler.bind(this);
	},

	stdin: function(cmd)
	{
		this.command(cmd);
	},

	keyHandler: function(e)
	{
		if(e.keyCode == 67 && e.ctrlKey) //CTRL + C
		{
			this.kill( this.current_process );
			console.out("process halted");
			return true;
		}
	},

	command: function(cmd)
	{
		//app
		if(this.current_process && this.current_process.stdin)
			return this.current_process.stdin(cmd);

		//bash
		if(cmd == "")
			console.out("");
		else if(cmd[0] == ".")
			this.executeRequest(cmd);
		else
			this.executeCommand(cmd);
	},

	executeCommand: function(cmd)
	{
		var tokens = cmd.split(" ");
		if( this.registered_apps[ tokens[0] ] )
		{
			var app_class = this.registered_apps[ tokens[0] ];
			this.exec( tokens[0], tokens);
			return;
		}
		var cmd_info = this.registered_commands[ tokens[0] ];
		if(!cmd_info)
			console.out(cmd + ": <span class='unknown'>command not found</span>");
		else
			cmd_info.callback(cmd, tokens);
	},

	executeRequest: function(cmd)
	{
		var tokens = cmd.substr(1).split(" ");
		var action = tokens[0];
		TERM.enable(false);
		$.ajax({ 
			url: this.server_url,
			data:{action:action, params: tokens.slice(1).join(" ")},
			method:"POST",
			dataType: "json"})
		.done(function(v){
			if(!v.type || v.type == "text")
				console.out(v.msg);
			else
				console.out("<span class='unknown'>DONE</span>");
			TERM.enable(true);
		})
		.fail(function(v){
			console.out("<span class='bad'>ERROR</span>");
			TERM.enable(true);
		});
	},
	
	_pending_modules: [],

	loadModulesFromList: function(url, on_complete)
	{
		var that = this;
		var loading = console.out("Loading modules list... ");
		console.lock();
		this.all_modules_loaded = function(){
			that.all_modules_loaded = null;
			if(on_complete)
				on_complete();
		};

		var nocache = "?" + new Date().getTime();

		$.get(url + nocache)
		.done( function(response) {
			console.out("<span class='ok'>OK</span>", {append:true} );
			var l = response.split("\n");
			for(var i in l)
			{
				var name = l[i].trim();
				if(name[0] != "#")
					that._pending_modules.push(name);
			}
			that._processPendingModules();
		})
		.fail(function(err) {
			console.out("<span class='bad'>ERROR</span>", {append:true} );
		});
	},

	_processPendingModules: function()
	{
		if(OS._pending_modules.length == 0)
		{
			console.out("All modules loaded" );
			if(OS.all_modules_loaded)
				OS.all_modules_loaded();
			return;
		}

		var url = OS._pending_modules.shift();
		OS.loadModule(url, OS._processPendingModules );
	},

	loadModule: function(url, on_complete, name)
	{
		var pos = url.lastIndexOf("/");
		var shortname = url.substr( pos, url.lastIndexOf(".") - pos );
		var loading = console.out(" + module: <span class='important'>"+(shortname || url)+"</span> ... ");
		$.get(url,null,null,"text")
		.done( function(response) {
			var problems = true;
			try
			{
				eval(response);
				append(loading, "<span class='ok'>OK</span>" );
				problems = false;
			}
			catch (err)
			{
				append(loading, "<span class='bad'>JS ERROR </span> \"" + err.message + "\"" );
				//console.log(err);
			}
			if(on_complete) on_complete(problems);
		})
		.fail(function(err) {
			append(loading, "<span class='bad'>NOT FOUND</span>" );
			if(on_complete) on_complete(false);
		});
	},

	valid_safe_instances: {"console":true},

	launchApp: function(url, argv)
	{
		var nocache = "?" + new Date().getTime();
		getText(url + nocache)
		.done( function(txt) {
			try
			{
				eval(txt);
			}
			catch (err)
			{
				return console.out("ERROR in APP: " + err,{color:"red"});
			}
			var app_class = window.app_className;
			if(!app_class) 
			{
				console.out("app not found: " + app_name,{className:"bad"});
				return null;
			}

			TERM.prompt("");
			var app = new app_class(argv);
			if(!app.appname) app.appname = url;
			if(!app.exit) app.exit = function(errcode) { 
				OS.kill( this, errcode );
			}

			OS.registerProcess( app );
		});
	},

	launchSafeApp: function(url)
	{
		var nocache = "?" + new Date().getTime();
		var app_worker = new Worker(url + nocache);
		app_worker.addEventListener("message", this.onWorkerAppEvent.bind(app_worker), false);
		app_worker.stdin = function(msg)
		{
			console.lock();
			APP._waiting_ready = true;
			app_worker.postMessage( {action:"stdin", text: msg });
		}
		app_worker.exit = function()
		{
			this.terminate();
		}

		this.registerProcess( app_worker );
		app_worker.postMessage( {action:"launch" });
	},

	exec: function( app_name, argv )
	{
		if(typeof(app_name) != "string") return;
		var app_class = this.registered_apps[app_name];
		if(!app_class) 
		{
			console.out("app not found: " + app_name,{className:"bad"});
			return null;
		}

		TERM.prompt("");
		var app = new app_class(argv);
		if(!app.appname) app.appname = app_name;
		if(!app.exit) app.exit = function(errcode) { 
			OS.kill( this, errcode );
		}

		this.registerProcess( app );
	},

	registerProcess: function( process )
	{
		process._pid = this.last_process_id++;
		process._starttime = new Date().getTime();
		this.fg_process_stack.push(process);
		this.current_process = process;
	},

	kill: function( app, errcode )
	{
		var pos = OS.fg_process_stack.indexOf( app );
		if(pos == -1) return;
		OS.fg_process_stack.splice(pos,1);
		if(	OS.current_process == app )
			OS.current_process = OS.fg_process_stack[ OS.fg_process_stack.length - 1 ];

		if(errcode)
			console.out("exited with code " + errcode );

		if(app.exit)
			app.exit();

		if(OS.fg_process_stack.length == 0)
			TERM.prompt("]");
	},

	onWorkerAppEvent: function(e)
	{
		if(!e.data) return;
		var data = e.data;

		if(data.action == "eval")
		{
			//safe checking
			if(!OS.valid_safe_instances[ data.instance ])
				return console.error("App Not safe");
			if(!window[ data.instance ])
				return console.error("Instance not found", data.instance);
			var instance = window[ data.instance ];
			if(!instance[ data.method ])
				return console.error("Instance method not found", data.instance, data.method );
			var method = instance[ data.method ];
			if(typeof(method) != "function")
				return console.error("Instance method not a function", data.instance, data.method );
			if(data.params && data.params.constructor == Array)
				method.apply( instance, data.params );
			else
				method.call( instance, data.params );
		}
		else if(data.action == "sys")
		{
			if(data.info == "ready" && APP._waiting_ready)
			{
				console.unlock();
				APP._waiting_ready = false;
			}
		}
	},

	registerSystemApp: function(app, name)
	{
		this.registered_apps[ name || getClassName(app) ] = app;
	},

	registerCommand: function(cmd, cmd_info)
	{
		if(typeof(cmd_info) == "function")
			cmd_info = { callback: cmd_info };
		this.registered_commands[cmd] = cmd_info;
	}
};

OS.registerCommand("ps", function(cmd, tokens) {
	var output = "PID TIME     CMD\n";
	var now = new Date().getTime();
	var time = new Date();
	for(var i in OS.fg_process_stack)
	{
		var process = OS.fg_process_stack[i];
		time.setTime( now - process._starttime);
		var str = process._pid + "   " + time.toTimeString().substr(0,8) + " " + process.appname + "\n";
		if(OS.current_process == process)
			str = "<span style='color:white'>" + str + "</span>";
		output += str;
	}
	console.out(output);
	return true;
});

function getClassName(obj) {
    if (obj && obj.toString) {
        var arr = obj.toString().match(
            /function\s*(\w+)/);

        if (arr && arr.length == 2) {
            return arr[1];
        }
    }
    return undefined;
}

