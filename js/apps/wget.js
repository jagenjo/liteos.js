
importScripts("../libs/stdlib.js");
importScripts("../libs/network.js");

var url = null;

function main(argv)
{
	url = argv[1];
	if(!url)
		url = "data/lorem.txt";

	if(!url)
	{
		stdout( EOF );
		exit();
		return;
	}

	requestText(this.url)
	.done(function(txt) {
		var lines = txt.split("\n");
		lines.forEach( function(v) { stdout( htmlencode(v) ); } );
		stdout( EOF );
		exit(0);
	})
	.fail(function(txt) {
		console.err(txt);
		stdout( EOF );
		exit(0);
	});

	return PROC_WAITING;
}


