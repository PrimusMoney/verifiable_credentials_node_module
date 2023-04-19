import './client-rest-connection/vc-rest-server.js';

import './client-web-socket/client-web-socket.js';
import './client-web-socket/web-socket-server.js';

import './pair-connection/remote-pair-calls.js';


class VcConnect {

}


VcConnect.ClientWebSocket = window.simplestore.ClientWebSocket;
VcConnect.WebSocketServer = window.simplestore.WebSocketServer;
VcConnect.VcRestServer = window.simplestore.VcRestServer;
VcConnect.RemotePairCalls = window.simplestore.RemotePairCalls;

export default VcConnect;