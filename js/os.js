
var OS = {
	ready: false,
	server_url: "ajax.php",
	modules: {},
	registered_commands: {},
	registered_envvars: {},
	registered_apps: {}, //name: "url.js"

	current_process: null,
	processes: [],
	processes_by_pid: {},
	last_process_pid: 0,

	init: function(on_ready)
	{
		if(this.ready) throw("already init");

		//system apps
		for(var i in config.shell_apps)
			OS.registerSystemApp(config.shell_apps[i],i);

		//load modules
		OS.loadModules(config.default_modules, inner_load_daemons );

		//launch daemons
		function inner_load_daemons()
		{
			if(config.init_seq)
				for(var i in config.init_seq)
					this.command(config.init_seq[i]);

			if(on_ready)
				on_ready();
		}
	},

	connectTerminal: function(t)
	{
		t.stdin = this.stdin.bind(this);
		t.keyHandler = this.keyHandler.bind(this);
	},

	stdin: function(cmd, ctx)
	{
		this.command(cmd, ctx);
	},

	keyHandler: function(e)
	{
		if(e.keyCode == 67 && e.ctrlKey) //CTRL + C
		{
			this.kill( this.current_process );
			console.out("process halted");
			e.stopPropagation();
			e.preventDefault();
			return true;
		}
	},

	command: function(cmd, ctx)
	{
		//app
		if(this.current_process && this.current_process.stdin)
			return this.current_process.stdin(cmd);

		//bash
		if(cmd.trim() == "")
			console.out("");
		else
			this.executeCommand(cmd);
	},

	executeCommand: function(fullcmd)
	{
		var pipes = fullcmd.split("|");

		var prev_proc = null;
		var app = null;

		for(var i in pipes)
		{
			if(!pipes[i]) continue;
			var cmd = pipes[i].trim();
			var tokens = cmd.split(" ");
			var last = tokens[ tokens.length - 1].trim();
			var bg = false;
			if( last == "&" )
				bg = true;

			//apps
			if( this.registered_apps[ tokens[0] ] )
			{
				app = this.registered_apps[ tokens[0] ];
				if(typeof(app) == "string") //remote
					app = this.launchSafeApp( app, tokens.join(" "), tokens[0], true );
				else
					app = this.exec( tokens[0], tokens);
			}
			else
			{
				//local commands
				var cmd_info = this.registered_commands[ tokens[0] ];
				if(!cmd_info)
					console.out(cmd + ": <span class='unknown'>command not found</span>");
				else
					cmd_info.callback(cmd, tokens);
				continue;
			}

			if(prev_proc)
				prev_proc.pipe_to = app;
			prev_proc = app;
		}
	},
	
	_pending_modules: [],

	loadModules: function(modules, on_complete)
	{
		for(var i in modules)
		{
			var url = modules[i];
			var nocache = (url.indexOf("?") == -1 ? "?" : "&") + "nocache=" + new Date().getTime();
			url += nocache;
			this._pending_modules.push(url);
		}
		this.all_modules_loaded = on_complete;
		this._processPendingModules();
	},

	_processPendingModules: function()
	{
		if(this._pending_modules.length == 0)
		{
			//console.out("All modules loaded" );
			if(this.all_modules_loaded)
				this.all_modules_loaded();
			return;
		}

		var url = this._pending_modules.shift();
		this.loadModule(url, this._processPendingModules.bind(this) );
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

	registerModule: function(name, module )
	{
		this.modules[name] = module;
	},	

	valid_safe_instances: {"console":true},

	/*
	launchApp: function(url, argv)
	{
		var nocache = "?" + new Date().getTime();
		var app_context = { url: url };

		getText(url + nocache)
		.done( function(code) {
			try
			{
				window._context = app_context;
				window.self = app_context;
				eval("(function() { var self = window._context;\n" + code + "\n})();");
				window._context = window.self = null;
			}
			catch (err)
			{
				return console.out("ERROR in APP: " + err,{color:"red"});
			}

			var app_class = app_context.app_className;
			if(!app_class) 
			{
				console.out("app not found: " + url,{className:"bad"});
				return null;
			}

			TERM.prompt("");
			var app = new app_class(argv.split(" "), argv);
			if(!app.appname) app.appname = url;
			if(!app.exit)
				app.exit = function(errcode) { 
					OS.kill( this, errcode );
				}

			OS.registerProcess( app );
		});

		return app_context;
	},
	*/

	launchSafeApp: function(url, argv, appname, in_background)
	{
		var nocache = "?" + new Date().getTime();
		var app_worker = new Worker(url + nocache);
		app_worker.state = 1;
		app_worker.name = appname;
		app_worker.url = url;
		app_worker.addEventListener("message", this.onWorkerAppEvent.bind(app_worker), false);
		app_worker.stdin = function(msg)
		{
			//console.lock();
			//APP._waiting_ready = true;
			app_worker.postMessage( {action:"stdin", text: msg });
		}
		app_worker.exit = function()
		{
			this.postMessage( {action:"exit"});
		}

		app_worker.kill = function()
		{
			this.state = 0;
			this.terminate();
			OS.removeProcess(this);
			console.log("killed");
		}

		app_worker.stdout = function(msg,options)
		{
			if(this.pipe_to)
				this.pipe_to.stdin(msg,options);
			else
				console.out(msg, options);
		}

		app_worker.callResponse = function(callid, data)
		{
			app_worker.postMessage({ callid: callid, ret: data });
		}


		this.registerProcess( app_worker );
		app_worker.postMessage( {action:"launch", argv: argv || ""});
		if(!in_background)
			this.current_process = app_worker;

		return app_worker;
	},

	onWorkerAppEvent: function(e)
	{
		if(!e.data) return;
		var data = e.data;

		if(data.module)
		{
			var module = OS.modules[data.module];
			if(module)
			{
				var ret = null;
				if(data.method && module["@" + data.method ])
					ret = module[data.method].apply(module, data.params || [] );
				else if(data.action && module.onProcessAction)
					ret = module.onProcessAction(this, data.action, data.params );
				else
				{
					console.error("Module do not support actions");
					return;
				}
				if(data._callid)
					this.callResponse(data._callid, ret);
			}
			else
				console.error("Module not found: " + data.module);
			return;
		}

		if(data.action == "eval")
		{
			//safe checking
			if(!OS.valid_safe_instances[ data.instance ])
				return console.error("action not safe");

			if(data.instance == "console" && data.method == "out")
				return this.stdout.apply( this, data.params );

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
		else if(data.action == "out")
		{
			if(data.params)
				return this.stdout.apply( this, data.params );
			return this.stdout.call( this, data.params );
		}
		else if(data.action == "sys")
		{
			if(data.info == "ready" && APP._waiting_ready)
			{
				console.unlock();
				APP._waiting_ready = false;
			}
		}
		else if(data.action == "onexit")
		{
			OS.kill( this );
		}
		else if(data.action == "finish")
		{
			OS.kill( this );
		}
		else if(data.action == "input")
		{
			//TODO
		}
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
		process._pid = this.last_process_pid++;
		process._starttime = new Date().getTime();
		this.processes.push(process);
		this.processes_by_pid[ process._pid ] = process;
	},

	removeProcess: function(process)
	{
		var pos = this.processes.indexOf( process );
		if(pos == -1) return;

		this.processes.splice(pos,1);
		delete this.processes_by_pid[ process._pid ];

		if(this.current_process == this)
			this.current_process = null;

		if(this.processes.length == 0)
			TERM.prompt("]");
	},

	kill: function( process )
	{
		//terminate
		if(process.kill)
			process.kill();
	},

	getProcess: function( pid )
	{
		return this.processes_by_pid[pid];
	},

	//regsiter shortcuts for commands
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

//sys commands
OS.registerCommand("ps", function(cmd, tokens) {
	var output = "PID TIME     CMD\n";
	var now = new Date().getTime();
	var time = new Date();
	for(var i in OS.processes)
	{
		var process = OS.processes[i];
		time.setTime( now - process._starttime);
		var str = process._pid + "   " + time.toTimeString().substr(0,8) + " " + process.name + "\n";
		if(OS.current_process == process)
			str = "<span style='color:white'>" + str + "</span>";
		output += str;
	}
	console.out(output);
	return true;
});

//sys commands
OS.registerCommand("kill", function(cmd, tokens) {
	var proc = OS.getProcess(tokens[1]);
	if(proc)
	{
		OS.kill(proc);
		console.out("Process killed");
	}
	else
		console.out("Process not found");
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

