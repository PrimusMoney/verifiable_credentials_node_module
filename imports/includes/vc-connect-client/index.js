const VcRestServer = require('./client-rest-connection/vc-rest-server.js');

const ClientWebSocket = require('./client-web-socket/client-web-socket.js');
const WebSocketServer = require('./client-web-socket/web-socket-server.js');

const RemotePairCalls = require('./pair-connection/remote-pair-calls');

class VcConnect {

}

module.exports = VcConnect; // default

VcConnect.ClientWebSocket = ClientWebSocket;
VcConnect.WebSocketServer = WebSocketServer;
VcConnect.VcRestServer = VcRestServer;
VcConnect.RemotePairCalls = RemotePairCalls;

module.exports.VcConnect = VcConnect;
module.exports.ClientWebSocket = ClientWebSocket;
module.exports.WebSocketServer = WebSocketServer;
module.exports.VcRestServer = VcRestServer;
module.exports.RemotePairCalls = RemotePairCalls;