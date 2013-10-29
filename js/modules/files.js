var FILESYSTEM = {
	FOLDER:1,
	FILE:2,
	LINK:3,

	root: null,
	current_folder: { path:"/", link: null },

	init: function()
	{
		this.root = {type: FILESYSTEM.FOLDER, children: {}};
		//console.out("Filesystem ready",{tab:true});
		this.current_folder.link = this.root;
	},

	cd: function(name)
	{
		if(!name)
		{
			return this.current_folder.path;
		}
		if(name == "..")
		{
			return;
		}
		if(!this.current_folder.link[name])
		{
			return "cd: "+name+": No such file or directory";
		}
		//TODO
	},

	findFolder: function(path)
	{
		//TODO
	},

	mkdir: function(name)
	{
		if(this.current_folder.link.children && this.current_folder.link.children[name])
			return "mkdir: cannot create directory `"+name+"': File exists";
		if(!this.current_folder.link.children)
			this.current_folder.link.children = {};
		this.current_folder.link.children[name] = {type:FILESYSTEM.FOLDER, children:{}};
		return "";
	},

	ls: function(path)
	{
		var r = "";
		for(var i in FILESYSTEM.current_folder.link.children)
			r += i + " ";
		return r;
	}
};

OS.registerCommand("ls", function(line, tokens) {
	var output = FILESYSTEM.ls(tokens[1]);
	console.out(output);
	return true;
});

OS.registerCommand("cd", function(line, tokens) {
	var output = FILESYSTEM.cd(tokens[1]);
	console.out(output);
	return true;
});

OS.registerCommand("mkdir", function(line, tokens) {
	var output = FILESYSTEM.mkdir(tokens[1]);
	console.out(output);
	return true;
});


FILESYSTEM.init();
OS.modules["FILESYSTEM"] = FILESYSTEM;