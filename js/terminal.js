var TERM = {
	root: null,
	prompt_string: "&gt;",
	last_line: null,
	history: [],
	history_offset: 1,
	stdin: null,
	keyHandler: null,

	init: function(container_id)
	{
		this.root = $("#" + container_id);
		this.lines_element = $(this.root).find( ".lines" );
		this.input_element = $(this.root).find( ".maininput" );
		this.inputline_element = $(this.root).find( ".inputline" );

		this.input_element.bind("keydown", this.onKeyDown );

		$(this.root).bind("mousedown", function(e) {
			if(e.target.localName != "input")
			{
				TERM.input_element.focus();
				return false;
			}
		});

		console.out = function(msg,options) { return TERM.out(msg,options); };
		console.err = function(msg) { 
			console.error(msg); 
			return TERM.out(msg,{color:"red"}); 
		};
		console.lock = function() { return TERM.enable(0); };
		console.unlock = function() { return TERM.enable(1); };
		console.prompt = function(v) { return TERM.prompt(v); };
		this.input_element.focus();
		this.prompt("]");
		this.enable(0);
	},

	onKeyDown: function(e) 
	{
		//console.log(e.keyCode);
		if(TERM.keyHandler)
			if(TERM.keyHandler(e) == true)
				return;

		if(e.keyCode == 13)
		{
			TERM.processInput(this.value);
			this.value = "";
			return false;
		}
		else if(e.keyCode == 38) //UP
		{
			if(TERM.history.length > TERM.history_offset)
			{
				this.value = TERM.history[ TERM.history.length - TERM.history_offset ];
				TERM.history_offset += 1;
			}
			return false;
		}
		else if(e.keyCode == 40) //DOWN
		{
			if(TERM.history_offset > 1 && TERM.history.length >= TERM.history_offset)
			{
				TERM.history_offset -= 1;
				this.value = TERM.history[ TERM.history.length - TERM.history_offset ];
			}
			return false;
		}
	},

	processInput: function(v)
	{
		var cmd = safe_tags_replace( v );
		this.echo( this.prompt_string + cmd, {user:"me"} );
		this.history.push(cmd);
		if(this.history.length > 100)
			this.history.length.shift();
		this.history_offset = 1;

		if(this.stdin)
			this.stdin(cmd);
	},

	enable: function(v)
	{
		if(v)
		{
			$(this.inputline_element).show();
			$(this.input_element).focus();
		}
		else
		{
			$(this.inputline_element).hide();
		}
	},

	prompt: function(text)
	{
		this.prompt_string = text;
		$(this.inputline_element).find(".prompt").html(text);
	},

	echo: function(msg, options)
	{
		options = options || {};
		var element = null;
		if(options.append && this.last_line)
		{
			element = document.createElement("span");
			element.innerHTML = msg;
			this.last_line.appendChild(element);
		}
		else
		{
			element = document.createElement("p");
			if(options.color)
				element.style.color = options.color;
			if(options.tab)
				element.style.marginLeft = "15px";
			element.className = "line";
			if(options.className)
				element.className += " " + options.className;
			element.innerHTML = msg;
			if(options.user)
				element.className += " me";
			this.last_line = element;
			this.lines_element.append(element);
			document.body.scrollTop = document.body.scrollHeight;
		}
		return element;
	},

	out: function(msg, options)
	{
		if(msg.indexOf("\n") != -1)
			msg = "<pre>"+msg+"</pre>";
		return this.echo(msg, options);
	},

	clear: function()
	{
		$(this.lines_element).empty();
	}
};


var tagsToReplace = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};

function replaceTag(tag) {
    return tagsToReplace[tag] || tag;
}

function safe_tags_replace(str) {
    return str.replace(/[&<>]/g, replaceTag);
}

function append(root, text)
{
	var element = document.createElement("span");
	element.innerHTML = text;
	root.appendChild(element);
}