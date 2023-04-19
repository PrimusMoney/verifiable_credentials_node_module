import './client-rest-connection/vc-rest-server.js';

import './client-web-socket/client-web-socket.js';
import './client-web-socket/web-socket-server.js';

import './pair-connection/remote-pair-calls.js';

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


// ES6 export
export default VcConnect;