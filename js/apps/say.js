//WORKER
importScripts("../libs/stdlib.js");
importScripts("../libs/network.js");

var daemon_port = 541;

manInfo("Allows to send messages between users");

function main(argv)
{
	//launch as daemon
	if(argv.indexOf("-d") != -1)
	{
		if(openPort(daemon_port, onMessage ))
		{
			console.out("Say 0.1 daemon in port " + daemon_port, {color:"green"});
		}
		else
			console.error("port already in use: " + daemon_port);
		return PROC_WAITING;
	}

	//send message
	var msg = argv.slice(2).join(" ");
	console.out("You say \"" + msg + "\" to " + (argv[1] == "*" ? "everybody" : argv[1]) );
	sendPacket(argv[1], daemon_port, msg );
	exit(0);
}

function onMessage(packet)
{
	if(packet.from != network.ip)
		stdout("Somebody said: " + packet.data);
}


/*
//when launched as daemon
function daemon(argv)
{

}
*/

//OS.registerSystemApp( Shoutbox );

