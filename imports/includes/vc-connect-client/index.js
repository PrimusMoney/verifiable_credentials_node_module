require('./client-rest-connection/vc-rest-server.js');

require('./client-web-socket/client-web-socket.js');
require('./client-web-socket/web-socket-server.js');

require('./pair-connection/remote-pair-calls');

if (typeof window !== 'undefined') {
	var _globalscope = window;
}
else if (typeof global !== 'undefined') {
	var _globalscope = window;
}

const ClientWebSocket = _globalscope.simplestore.ClientWebSocket;
const WebSocketServer = _globalscope.simplestore.WebSocketServer;
const VcRestServer = _globalscope.simplestore.VcRestServer;
const RemotePairCalls = _globalscope.simplestore.RemotePairCalls;


// create decorated VcConnect class
class VcConnect {

}

VcConnect.ClientWebSocket = ClientWebSocket;
VcConnect.WebSocketServer = WebSocketServer;
VcConnect.VcRestServer = VcRestServer;
VcConnect.RemotePairCalls = RemotePairCalls;


// CommonJS exports
module.exports.VcConnect = VcConnect;
module.exports.ClientWebSocket = ClientWebSocket;
module.exports.WebSocketServer = WebSocketServer;
module.exports.VcRestServer = VcRestServer;
module.exports.RemotePairCalls = RemotePairCalls;

module.exports = VcConnect; // default