"use strict";
const http = require('http');

function createServer () {
	return http.createServer(function (req, res) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end('OK\n');
	}).listen(8080);
}

let server = createServer();

http.createServer(function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	if (server) {
		server.close();
		server = null;
		res.end('Shutting down...\n');
	} else {
		server = createServer();
		res.end('Starting up...\n');
	}
}).listen(8081);
