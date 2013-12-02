function Terminal(id)
{
	this.root = null;
	this.prompt_string = "&gt;";
	this.last_line = null;
	this.history = [];
	this.history_offset = 1;
	this.stdin = null;
	this.keyHandler = null;
	this.cursorSpeed = 200;
	this.is_capslock = false;

	this.init(id);
}

Terminal.prototype.init = function(container_id)
{
	this.root = document.querySelector("#" + container_id);
	if(!this.root) throw("Container not found");
	this.root.className +=" log";

	this.lines_element = document.createElement("div");
	this.lines_element.className = "lines";
	this.root.appendChild(this.lines_element);

	this.inputline_element = document.createElement("div");
	this.inputline_element.className = "inputline";
	this.inputline_element.innerHTML = '<span class="prompt"></span><input type="text" class="input" /></span>';
	this.root.appendChild(this.inputline_element);

	this.prompt_element = this.inputline_element.querySelector(".prompt");
	this.input_element = this.inputline_element.querySelector(".input" );
	this.input_element.addEventListener("keydown", this.onKeyDown.bind(this) );

	this.root.addEventListener("mousedown", (function(e) {
		if(e.target.localName != "input")
		{
			$(this.input_element).focus();
			return false;
		}
	}).bind(this));
	
	this.input_element.focus();
	this.prompt("]");
	this.enableInput(0);
}

Terminal.prototype.enable = function()
{
	console.out = (function(msg,options) { return this.out(msg,options); }).bind(this);
	console.err = (function(msg) { 
		console.error(msg); 
		return this.out(msg,{color:"red"}); 
	}).bind(this);
	console.lock = (function() { return this.enableInput(0); }).bind(this);
	console.unlock = (function() { return this.enableInput(1); }).bind(this);
	console.prompt = (function(v) { return this.prompt(v); }).bind(this);
}

//for special keys
Terminal.prototype.onKeyDown = function(e) 
{
	//console.log(e.keyCode);
	if(this.keyHandler)
		if(this.keyHandler(e) == true)
			return false;

	switch(e.keyCode)
	{
		case 9: this.tabKey(e); break;
		case 13: this.introKey(e); break;
		case 17: return; break; //CTRL
		case 38: this.upCursorKey(e); break;
		case 40: this.downCursorKey(e); break;
		/*
		case 39: this.rightCursorKey(e); break;
		case 37: this.leftCursorKey(e); break;
		case 8: this.backspaceKey(e); break;
		case 46: this.deleteKey(e); break;
		case 20: this.is_capslock = !this.is_capslock; break;
		*/
		default: 
			return;
	}
	e.stopPropagation();
	e.preventDefault();
	return false;
}

Terminal.prototype.processInput = function(v)
{
	var cmd = safe_tags_replace( v );
	this.echo( this.prompt_string + cmd, {user:"me"} );
	this.history.push(cmd);
	if(this.history.length > 100)
		this.history.length.shift();
	this.history_offset = 1;

	if(this.stdin)
		this.stdin(cmd, this);
}

Terminal.prototype.enableInput = function(v)
{
	if(v)
	{
		this.inputline_element.style.display = "block";
		this.inputline_element.focus();
	}
	else
	{
		this.inputline_element.style.display = "none";
	}
}

Terminal.prototype.getCursorText = function()
{
	//return decodeHTML( this.precursor_element.innerHTML + this.cursor_element.innerHTML + this.postcursor_element.innerHTML );
	return decodeHTML( this.input_element.localName == "input" ? this.input_element.value : this.input_element.innerHTML );
}

Terminal.prototype.setCursorText = function(v)
{
	if(this.input_element.localName == "input")
		this.input_element.value = v;
	else
		this.input_element.innerHTML = v;
	/*
	this.precursor_element.innerHTML = v;
	this.cursor_element.innerHTML = " ";
	this.postcursor_element.innerHTML = "";
	*/
}

Terminal.prototype.prompt = function(text)
{
	this.prompt_string = text;
	if(!this.prompt_element) return;
	this.prompt_element.innerHTML = text;
}

Terminal.prototype.echo = function(msg, options)
{
	options = options || {};
	var element = null;

	if(options.append && this.last_line)
	{
		element = document.createElement("span");
		element.innerHTML = msg;
		this.last_line.appendChild(element);
		return element;
	}

	if(options.uid)
		element = this.lines_element.querySelector("#line_" + options.uid);

	if(!element)
	{
		element = document.createElement("p");
		element.className = "line";
		if(options.user)
			element.className += " me";
		if(options.uid)
			element.id = "line_" + options.uid;
	}

	if(options.color)
		element.style.color = options.color;
	if(options.tab)
		element.style.marginLeft = "15px";
	if(options.className)
		element.className += " " + options.className;
	element.innerHTML = msg;
	this.last_line = element;

	if(!element.parentNode)
		this.lines_element.appendChild(element);

	document.body.scrollTop = document.body.scrollHeight;
	window.scrollTo(0,document.body.scrollHeight);
	return element;
}

Terminal.prototype.out = function(msg, options)
{
	if(msg.indexOf("\n") != -1)
		msg = "<pre>"+msg+"</pre>";
	return this.echo(msg, options);
}

Terminal.prototype.clear = function()
{
	this.lines_element.innerHTML = "";
}

Terminal.prototype.introKey = function(e)
{
	var content = this.getCursorText();
	this.processInput( content );
	this.setCursorText("");
	return false;
}

Terminal.prototype.upCursorKey = function(e)
{
	if(this.history.length > this.history_offset)
	{
		this.setCursorText( this.history[ this.history.length - this.history_offset ] );
		this.history_offset += 1;
	}
	return false;
}

Terminal.prototype.downCursorKey = function(e)
{
	if(this.history_offset > 1 && this.history.length >= this.history_offset)
	{
		this.history_offset -= 1;
		this.setCursorText( this.history[ this.history.length - this.history_offset ] );
	}
	return false;
}

/* old manual cursor version
_cursor_on: false,

init:
{

	this.precursor_element = this.inputline_element.querySelector(".precursor" );
	this.cursor_element = this.inputline_element.querySelector(".cursor");
	this.postcursor_element = this.inputline_element.querySelector(".postcursor" );

	this._cursor_timer = setTimeout( this.updateCursor.bind(this), this.cursorSpeed );
	document.body.addEventListener("keydown", this.onKeyDown.bind(this) );
	document.body.addEventListener("keypress", this.onKeyPress.bind(this) );
	document.body.addEventListener("paste", this.onPaste.bind(this) );

	$(this.root).bind("mousedown", function(e) {
		if(e.target.localName != "input")
		{
			TERM.input_element.focus();
			return false;
		}
	});
}

Terminal.prototype.onKeyPress: function(e) 
{
	//console.log(e.keyCode);
	if(this.keyHandler)
		if(this.keyHandler(e) == true)
			return false;

	this.addChar(e);
	return false;
}


Terminal.prototype.insertCursorText = function(v)
{
	//this.precursor_element.innerHTML = decodeHTML(this.precursor_element.innerHTML + v);
}


onPaste: function(e) 
{
	//console.log("PASTE!");
	this.insertCursorText( e.clipboardData.getData('text/plain') );
},

updateCursor: function(v)
{
	clearTimeout( this._cursor_timer );
	this._cursor_on = v || !this._cursor_on;
	this.cursor_element.style.backgroundColor = this._cursor_on ? "white" : "transparent";
	this.cursor_element.style.color = this._cursor_on ? "black" : "white";
	this._cursor_timer = setTimeout( this.updateCursor.bind(this), this.cursorSpeed );
},
Terminal.prototype.leftCursorKey = function(e)
{
	var pretext = decodeHTML( this.precursor_element.innerHTML );
	if(pretext.length == 0) return false;

	if(e.shiftKey)
	{
		var c = pretext[ pretext.length - 1 ];
		pretext = pretext.substr(0, pretext.length - 1);
		this.precursor_element.innerHTML = pretext;
		this.cursor_element.innerHTML = c + decodeHTML( this.cursor_element.innerHTML );
	}
	else
	{
		var c = pretext[ pretext.length - 1 ];
		pretext = pretext.substr(0, pretext.length - 1);
		this.precursor_element.innerHTML = pretext;
		this.postcursor_element.innerHTML = decodeHTML( this.cursor_element.innerHTML + this.postcursor_element.innerHTML );
		this.cursor_element.innerHTML = c;
	}

	this.updateCursor(true);
	return false;
}

Terminal.prototype.rightCursorKey = function(e)
{
	var posttext = decodeHTML( this.postcursor_element.innerHTML );
	if(posttext.length == 0) return false;

	var c = posttext[0];
	posttext = posttext.substr(1);
	this.precursor_element.innerHTML += decodeHTML( this.cursor_element.innerHTML );
	this.postcursor_element.innerHTML = posttext;
	this.cursor_element.innerHTML = c;

	this.updateCursor(true);
	return false;
}

Terminal.prototype.backspaceKey = function(e)
{
	var pretext = decodeHTML( this.precursor_element.innerHTML );
	if(pretext.length == 0) return false;
	pretext = pretext.substr(0, pretext.length - 1);
	this.precursor_element.innerHTML = pretext;

	this.updateCursor(true);
	return false;
}


Terminal.prototype.deleteKey = function(e)
{
	var posttext = decodeHTML( this.postcursor_element.innerHTML );
	if(posttext.length == 0) return false;

	var c = posttext[0];
	posttext = posttext.substr(1);
	this.postcursor_element.innerHTML = posttext;
	this.cursor_element.innerHTML = c;

	this.updateCursor(true);
	return false;
}

Terminal.prototype.addChar = function(e)
{
	var charcode = e.charCode || e.keyCode;
	if(charcode < 32) //not visual
		return false;

	var c = String.fromCharCode(charcode);
	var to_caps = this.is_capslock;
	if(e.shiftKey)
		to_caps = !to_caps;

	if(!to_caps)
		c = c.toLowerCase();
	this.precursor_element.innerHTML = decodeHTML( this.precursor_element.innerHTML ) + c;
	return false;
}
*/

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

function decodeHTML(html){
	if(!this._decode_textarea)
		this._decode_textarea = document.createElement("textarea");
	this._decode_textarea.innerHTML = html;
	return this._decode_textarea.value;
}