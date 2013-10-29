var IO = {

	init: function()
	{
	},

	man: function(v)
	{
		return "No manual entry for " + v;
	}
};

OS.registerCommand("man", function(line, tokens) {
	var output = IO.man(tokens[1]);
	console.out(output);
	return true;
});

IO.init();
OS.modules["IO"] = IO;