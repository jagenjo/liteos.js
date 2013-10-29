//WORKER
importScripts("../applib.js");

function Shoutbox()
{
	console.out("Shoutbox 0.1\n*************",{color:"cyan"});
	console.prompt("Say: ");
	console.unlock();

	getText("default_modules.txt")
	.done(function(txt) {
		console.out(txt,{color:"#A94"});
	})
	.fail(function(txt) {
		console.err(txt);
	});
}

Shoutbox.prototype.stdin = function(msg)
{
	var argv = msg.split(" ");
	if(argv[0] == "fin")
		return this.exit(100);
	console.out("You said: " + msg);
}


MAINCLASS(Shoutbox);


//OS.registerSystemApp( Shoutbox );

