require('./client-rest-connection/vc-rest-server.js');

require('./client-web-socket/client-web-socket.js');
require('./client-web-socket/web-socket-server.js');

require('./pair-connection/remote-pair-calls');

const VcRestServer = window.simplestore.ClientWebSocket;
const ClientWebSocket = window.simplestore.WebSocketServer;
const WebSocketServer = window.simplestore.VcRestServer;
const RemotePairCalls = window.simplestore.RemotePairCalls;

class VcConnect {

}

VcConnect.ClientWebSocket = ClientWebSocket;
VcConnect.WebSocketServer = WebSocketServer;
VcConnect.VcRestServer = VcRestServer;
VcConnect.RemotePairCalls = RemotePairCalls;

module.exports.VcConnect = VcConnect;
module.exports.ClientWebSocket = ClientWebSocket;
module.exports.WebSocketServer = WebSocketServer;
module.exports.VcRestServer = VcRestServer;
module.exports.RemotePairCalls = RemotePairCalls;

module.exports = VcConnect; // default