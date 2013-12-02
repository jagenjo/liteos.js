var IO = {
	manpages: {},

	init: function()
	{
	},

	onProcessAction: function(process, action, params)
	{
		if(action == "manInfo")
		{
			this.manpages[process.name] = params;
		}
	},	

	man: function(cmd)
	{
		if(this.manpages[cmd])
			return this.manpages[cmd];
		return "No manual entry for " + cmd;
	}
};

OS.registerCommand("man", function(line, tokens) {
	var output = IO.man(tokens[1]);
	console.out(output);
	return true;
});

OS.registerCommand("echo", function(line, argv) {
	console.out(argv.slice(1).join(" "));
	return true;
});

IO.init();
OS.modules["IO"] = IO;