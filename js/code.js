var APP = {

	init: function()
	{
		TERM.init("mainlog");
		TERM.enable(false);
		console.out("Launching IP v3.0...");
		$.get("intro.txt",function(txt) { 
			console.out(txt, { color: "white" }); 
			OS.init( APP.onReady.bind(APP) );
		});
	},

	onReady: function()
	{
		console.out("Ready");
		//OS.exec("Shoutbox");
		OS.launchSafeApp("js/apps/shoutbox.js");
		//OS.launchSafeApp("js/apps/unittest.js");
		//OS.launchApp("js/apps/unittest.js");
	},

	intro: function()
	{
		TERM.enable(false);
		setTimeout(function() { console.out("<span class='bad'>Error detected, data maybe corrupt</span>"); },1000);
		setTimeout(function() { console.out("Restoring backup system..."); },1500);
		setTimeout(function() { console.out("<span class='ok'>OK</span>",{append:true}); },2500);
		setTimeout(function() { TERM.enable(1); },3000);
	}
};

