var ClientWebSocket = class {
	
	constructor(sessionuuid, connectionuuid, socket_server, socket_connection) {

		this.socket_server = socket_server;

		this.sessionuuid = sessionuuid;
		this.connectionuuid = connectionuuid;

		this.socket_connection = socket_connection;

		this.socket_connection.onclose = (event) => {
			this._onClose(event);
		}

		this.socket_connection.onerror = (event) => {
			this._onError(event);
		}
	}

	_onClose(event) {
		console.log('closing websocket for session ' + this.sessionuuid + ' and connection ' + this.connectionuuid);
		console.log('event is: ' + JSON.stringify(event));

		this.socket_connection = null;

		let json = {sessionuuid: this.sessionuuid, connectuuid: this.connectionuuid};
		this.socket_server._dispatchActionEvent('onConnectionClosed', json);
	}
	
	_onError(event) {
		console.log('error on websocket for session ' + this.sessionuuid + ' and connection ' + this.connectionuuid);
		this.socket_connection = null;
	}

	async send(message) {
		if (this.socket_connection) {
			this.socket_connection.send(message); // does not have a callback

			return true;
		}
		else {
			return Promise.reject('no web socket');
		}
	}

	async postPacket(header, data) {
		let json = {header, data};

		if (!header.sessionuuid) header.sessionuuid = this.sessionuuid;
		if (!header.connectionuuid) header.connectionuuid = this.connectionuuid;

		let json_string = JSON.stringify(json);

		return this.send(json_string);
	}

	async postData(data) {
		return this.postPacket({}, data);
	}
}


if (typeof window !== 'undefined') {
	// we are in the browser or in react native
	if  ((typeof window.simplestore === 'undefined') || (window.simplestore == null)) window.simplestore = {};
	
	window.simplestore.ClientWebSocket = ClientWebSocket;
}
else if (typeof global !== 'undefined') {
	// we are in nodejs
	if  ((typeof global.simplestore === 'undefined') || (global.simplestore == null)) global.simplestore = {};

	global.simplestore.ClientWebSocket = ClientWebSocket;
}

//module.exports = ClientWebSocket;
