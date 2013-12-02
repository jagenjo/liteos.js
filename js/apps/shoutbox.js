//WORKER
importScripts("../libs/stdlib.js");
importScripts("../libs/network.js");

var intro_uid = null;
var timer = 0;

function main()
{
	console.out("Shoutbox 0.1\n*************",{color:"cyan"});
	console.prompt("Say: ");
	console.unlock();

	var counter = 0;
	var text = "Loading... ";
	var anim = "/-\\|";

	//User input
	readInput( function(msg)
	{
		var argv = msg.split(" ");
		if(argv[0] == "fin")
			return exit(100);
		console.out("You said: " + msg);
		if(timer)
		{
			clearInterval(timer);
			timer = null;
		}
	});
}




//OS.registerSystemApp( Shoutbox );

