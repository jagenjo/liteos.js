var APP = {

	init: function()
	{
		window.TERM = new Terminal("mainlog");
		TERM.enable();
		TERM.enableInput(false);
		console.out("Launching IP v3.0...");
		$.get("intro.txt",function(txt) { 
			console.out(txt, { color: "white" }); 
			OS.init( APP.onReady.bind(APP) );
		});
		OS.connectTerminal(TERM);

		/* secondary
		var backterm = new Terminal("backlog");
		backterm.out("backlog");
		backterm.enableInput(true);
		OS.connectTerminal(backterm);
		*/
	},

	onReady: function()
	{
		console.out("Ready");
		//OS.exec("Shoutbox");
		//OS.command("shoutbox");
		TERM.enableInput(true);
		//OS.launchSafeApp("js/apps/unittest.js");
		//OS.launchApp("js/apps/unittest.js");
	},

	intro: function()
	{
		TERM.enableInput(false);
		setTimeout(function() { console.out("<span class='bad'>Error detected, data maybe corrupt</span>"); },1000);
		setTimeout(function() { console.out("Restoring backup system..."); },1500);
		setTimeout(function() { console.out("<span class='ok'>OK</span>",{append:true}); },2500);
		setTimeout(function() { TERM.enableInput(1); },3000);
	}
};

APP.init();
