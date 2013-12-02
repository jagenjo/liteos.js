var config = {
	default_modules: [
	"js/modules/io.js",
	"js/modules/server.js",
	"js/modules/files.js",
	"js/modules/comm.js"],

	server_host: "tamats.com",
	server_port: "8086",
	init_seq: [
		"say -d &"
	],

	shell_apps: {
		"wget":"js/apps/wget.js",
		"grep":"js/apps/grep.js",
		"say":"js/apps/say.js",
		"ifconfig":"js/apps/ifconfig.js"
	}
};