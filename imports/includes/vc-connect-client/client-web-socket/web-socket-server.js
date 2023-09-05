var WebSocketServer = class {
	
	constructor(wss_server_url, wss_server_api_path) {

		this.wss_server_url = wss_server_url;
		this.wss_server_api_path = wss_server_api_path;

		this.client_websockets = {};

		this.action_listeners = {};
	}

	_onMessage(event) {
		try {
			let datastring = event.data;
			let json = JSON.parse(datastring);
			let header = json.header;
			let data = json.data;

			if (header.action) {
				this._dispatchActionEvent(header.action, json);
			}
		}
		catch(e) {
			console.log('exception in VerifiableCredentialsServerSocket._onMessage: ' + e);
		}
	}

	addActionListener(action, func, connectionuuid, uuid) {
		let key = action;
		if (connectionuuid) key += '_' + connectionuuid; else key +='_all';
		if (uuid) key += '_' + uuid; else key +='_anyone';

		this.action_listeners[key] = func;
	}

	removeActionListener(action, connectionuuid, uuid) {
		if (!uuid) return;

		let key = action;
		if (connectionuuid) key += '_' + connectionuuid; else key +='_all';
		if (uuid) key += '_' + uuid; else key +='_anyone';

		let func = this.action_listeners[key];

		if (func) {
			delete this.action_listeners[key];
		}
	}

	_dispatchActionEvent(action, json) {
		let keys = Object.keys(this.action_listeners);
		
		for (var i = 0; i < keys.length; i++) {
			let key = keys[i];
			let parts = key.split('_')

			if (parts[0] == action) {
				let _connectionuuid = (json && json.header ? json.header.connectionuuid : null)
				if ((parts[1] == 'all') || (parts[1] == _connectionuuid)) {
					let func = this.action_listeners[key];

					try {
						func(json);
					}
					catch(e) {
					}
				}
			}
		}
	}

	_getClientWebSocketClass() {
		require('./client-web-socket.js');

		if (typeof window !== 'undefined') {
			// we are in the browser or in react native
			return window.simplestore.ClientWebSocket;
		}
		else if (typeof global !== 'undefined') {
			// we are in nodejs
			return global.simplestore.ClientWebSocket;
		}
	}

	async createClientWebSocket(sessionuuid, connectionuuid, onopen_callback, onmessage_callback) {
		if (!sessionuuid)
			return Promise.reject('missing server session uuid');

		if (!connectionuuid)
			return Promise.reject('missing connection uuid');

		if (this.client_websockets[connectionuuid])
			return Promise.reject('connection uuid already attributed');

		
		// then create client web socket
		var server_url = this.wss_server_url + (this.wss_server_api_path ? this.wss_server_api_path : '');

		const ClientWebSocket = this._getClientWebSocketClass();

		let client_websocket = await new Promise((resolve, reject) => {
			let socket_connection = new WebSocket(server_url + '?sessionuuid=' + sessionuuid + '&cnxuuid=' + connectionuuid);

			if (onopen_callback)
				socket_connection.onopen = onopen_callback;
			else
				socket_connection.onopen = () => {
					let client_socket = ClientWebSocket.getObject(sessionuuid, connectionuuid, this, socket_connection);

					resolve(client_socket);
				};

			if (onmessage_callback)
				socket_connection.onmessage =onmessage_callback;
			else
				socket_connection.onmessage = (event) => {
					this._onMessage(event);
				};

		});

		this.client_websockets[connectionuuid] = client_websocket;

		return client_websocket;
	}


	async getClientWebSocket(connectionuuid) {
		if (!connectionuuid)
			return Promise.reject('missing connection uuid');

		if (this.client_websockets[connectionuuid])
			return this.client_websockets[connectionuuid];
	}

	async closeClientWebSocket(connectionuuid) {
		if (!connectionuuid)
			return;

		if (this.client_websockets[connectionuuid])
		delete this.client_websockets[connectionuuid];
	}

	// static
	static getObject(wss_server_url, wss_server_api_path) {
		if (!wss_server_url)
			return;

		let key = wss_server_url.toLowerCase() + (wss_server_api_path ? wss_server_api_path.toLowerCase() : '');

		if (!WebSocketServer.servers)
			WebSocketServer.servers = {};

		if (WebSocketServer.servers[key])
		return WebSocketServer.servers[key];

		WebSocketServer.servers[key] = new WebSocketServer(wss_server_url, wss_server_api_path);

		return WebSocketServer.servers[key];
	}

}


if (typeof window !== 'undefined') {
	// we are in the browser or in react native
	if  ((typeof window.simplestore === 'undefined') || (window.simplestore == null)) window.simplestore = {};
	
	window.simplestore.WebSocketServer = WebSocketServer;
}
else if (typeof global !== 'undefined') {
	// we are in nodejs
	if  ((typeof global.simplestore === 'undefined') || (global.simplestore == null)) global.simplestore = {};

	global.simplestore.WebSocketServer = WebSocketServer;
}

//module.exports = WebSocketServer;
