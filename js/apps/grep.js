//WORKER
importScripts("../libs/stdlib.js");

var needle = "";

function main(argv)
{
	needle = argv.slice(1).join(" ");
	readInput( function(msg)
	{
		if( msg.indexOf( needle ) != -1 )
			stdout( msg );
		if( msg.indexOf( EOF ) != -1 )
			exit();
	});
}


