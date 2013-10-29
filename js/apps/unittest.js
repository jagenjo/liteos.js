//WORKER
importScripts("../applib.js");

function Test()
{
	console.out("Unittest 0.1\n*************",{color:"cyan"});
	console.lock();

	var tests = [];
	function next_test()
	{
		if(tests.length == 0)
		{
			console.out("END");
			return exit();
		}
		var test = tests.shift();
		console.out(test[0]);
		test[1]();
	}
	function test_ok() { console.out("OK",{color:"green"}); next_test(); }
	function test_error() { console.err("ERROR",{color:"red"}); next_test(); }
	function debug(msg) { console.out(msg); }

	tests.push(["getText.done", function() {
		getText("default_modules.txt")
		.done(test_ok)
		.fail(debug);
	}]);

	tests.push(["getText.fail", function() {
		getText("default_modules.tt")
		.done(debug)
		.fail(test_ok);
	}]);

	tests.push(["getJSON.done", function() {
		getJSON("ajax.php?action=version")
		.done(test_ok)
		.fail(test_error);
	}]);

	tests.push(["getText.fail", function() {
		getJSON("default_modules.txt")
		.done(test_error)
		.fail(test_ok);
	}]);

	next_test();
}

Test.prototype.stdin = function(msg)
{
	var argv = msg.split(" ");
	if(argv[0] == "fin")
		return this.exit(100);
	console.out("You said: " + msg);
}


MAINCLASS(Test);

