const WebSocketServer = require('./client-web-socket/web-socket-server.js').default;
const VcRestServer = require('./client-rest-connection/vc-rest-server.js').default;
const RemotePairCalls = require('./pair-connection/remote-pair-calls').default;

class VcConnect {

}

module.exports = VcConnect; // default
VcConnect.WebSocketServer = WebSocketServer;
VcConnect.VcRestServer = VcRestServer;
VcConnect.RemotePairCalls = RemotePairCalls;

module.exports.VcConnect = VcConnect;
module.exports.WebSocketServer = WebSocketServer;
module.exports.VcRestServer = VcRestServer;
module.exports.RemotePairCalls = RemotePairCalls;

export default VcConnect;