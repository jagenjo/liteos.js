
importScripts("../libs/stdlib.js");
importScripts("../libs/network.js");

var url = null;

function main(argv)
{
	OSCALL({module:"SERVER",method:"getIp"}, function(r){ 
		stdout("IP: " + r);
		exit();
	});
	return PROC_WAITING;
}


