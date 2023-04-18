'use strict';

class ClientWebSocket {
	constructor(sessionuuid, connectionuuid, server_socket, socket_connection) {
		this.sessionuuid = sessionuuid;
		this.connectionuuid = connectionuuid;

		this.server_socket = server_socket;
		this.socket_connection = socket_connection;


		this.socket_connection.socket_connection.onclose = (event) => {
			this._onClose(event);
		}

		this.socket_connection.socket_connection.onerror = (event) => {
			this._onError(event);
		}

		/* this.socket_connection.onclose = (event) => {
			this._onClose(event);
		}

		this.socket_connection.onerror = (event) => {
			this._onError(event);
		} */
	}

	_onClose(event) {
		console.log('closing websocket for session ' + this.sessionuuid + ' and connection ' + this.connectionuuid);
		console.log('event is: ' + JSON.stringify(event));

		// chain to vc connect client socket
		if (this.socket_connection) this.socket_connection._onClose(event);

		this.socket_connection = null;

		let json = {sessionuuid: this.sessionuuid, connectuuid: this.connectionuuid};
		this.server_socket._dispatchActionEvent('onConnectionClosed', json);
	}
	
	_onError(event) {
		console.log('error on websocket for session ' + this.sessionuuid + ' and connection ' + this.connectionuuid);

		// chain to vc connect client socket
		if (this.socket_connection) this.socket_connection._onError(event);

		this.socket_connection = null;
	}
}

var VerifiableCredentialsServerSocket = class {
	
	constructor(session) {
		this.session = session;

		this.wss_server_url = null;
		this.wss_server_api_path = null;

		this.websocket_server = null; // vc-connect web socket server
		this.client_websocket = null;

		this.action_listeners = {};
	}

	isConnected() {
		return (this.client_websocket ? true : false);
	}

	async connect() {
		var client_websocket = await this.getClientWebSocket();

		return (client_websocket ? true : false);
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

			// chain to vc connect socket server
			if (this.websocket_server) this.websocket_server._onMessage(event);
		}
		catch(e) {
			console.log('exception in VerifiableCredentialsServerSocket._onMessage: ' + e);
		}
	}

	addActionListener(action, func, uuid) {
		this.action_listeners[action + (uuid ? '_' + uuid : this.session.guid())] = func;
	}

	removeActionListener(action, uuid) {
		if (!uuid) return;

		let func = this.action_listeners[action +  (uuid ? '_' + uuid : '')];

		if (func) {
			delete this.action_listeners[action +  (uuid ? '_' + uuid : '')];
		}
	}

	_dispatchActionEvent(action, json) {
		let keys = Object.keys(this.action_listeners);
		
		for (var i = 0; i < keys.length; i++) {
			let key = keys[i];

			if (key.startsWith(action)) {
				let func = this.action_listeners[key];

				try {
					func(json);
				}
				catch(e) {
				}
			}
		}
	}

	async _getWebSocketServer() {
		if (this.websocket_server)
			return this.websocket_server;

		var wss_server_url = (this.wss_server_url ? this.wss_server_url : this.session.getXtraConfigValue('wss_server_url'));
		var wss_server_api_path = (this.wss_server_api_path ? this.wss_server_api_path :this.session.getXtraConfigValue('wss_server_api_path'));

		var server_url = wss_server_url + (wss_server_api_path ? wss_server_api_path : '');

		const VcConnect = require('../../vc-connect-client');
		const WebSocketServer = VcConnect.WebSocketServer;

		this.websocket_server = WebSocketServer.getObject(wss_server_url, wss_server_api_path);

		return this.websocket_server;
	}
	
	async getClientWebSocket() {
		if (this.client_websocket)
			return this.client_websocket;
		
		let websocket_server = await this._getWebSocketServer();
		
		// create web socket
		var session = this.session;
		var sessionuuid = session.getSessionUUID();
		var connectionuuid = session.guid();

		let vc_connect_client_socket = await websocket_server.createClientWebSocket(sessionuuid, connectionuuid, null, this._onMessage.bind(this));
						// re-route messages to our method (and we chain messages in it)

		this.client_websocket = new ClientWebSocket(sessionuuid, connectionuuid, this, vc_connect_client_socket);


		/* this.client_websocket = await new Promise((resolve, reject) => {
			let socket_connection = new WebSocket(server_url + '?sessionuuid=' + sessionuuid + '&cnxuuid=' + connectionuuid);

			socket_connection.onopen = () => {
				let client_socket = new ClientWebSocket(sessionuuid, connectionuuid, this, socket_connection);

				resolve(client_socket);
			};

			socket_connection.onmessage = (event) => {
				this._onMessage(event);
			};

		}); */
		
		return this.client_websocket;
	}

	setConnectionUrl(wss_server_url, wss_server_api_path) {
		if (!wss_server_url)
			return;
		
		if ((wss_server_url === this.wss_server_url) && (wss_server_api_path === this.wss_server_api_path))
			return; // alreay done

		if (this.client_websocket) {
			//TODO: close client_websocket.socket_connection
			this.client_websocket = null;
		}

		this.wss_server_url = wss_server_url;
		this.wss_server_api_path = wss_server_api_path;
	}

	async send(message) {
		var client_websocket = await this.getClientWebSocket();

		if (client_websocket) {
			if (!client_websocket.socket_connection) {
				// socket has closed
				this.client_websocket = null;
				client_websocket = await this.getClientWebSocket();
			}
			
			await client_websocket.send(message);

			return true;
		}
		else {
			return Promise.reject('no web socket');
		}
	}

	async postPacket(header, data) {
		var client_websocket = await this.getClientWebSocket();

		if (client_websocket) {
			await client_websocket.postPacket(header, data);

			return true;
		}
		else {
			return Promise.reject('no web socket');
		}
	}

	async postData(data) {
		return this.postPacket({}, data);
	}

	// actions
	async change_did(from, to) {

		var header = {action: 'change_did'}

		var data = {}
		data.from = from;
		data.to = to;

		await this.postPacket(header, data);

		console.log('change_did');
	}
}


if ( typeof window !== 'undefined' && window ) // if we are in browser or react-native and not node js (e.g. truffle)
	window.simplestore.VerifiableCredentialsServerSocket = VerifiableCredentialsServerSocket;
else if (typeof global !== 'undefined')
	global.simplestore.VerifiableCredentialsServerSocket = VerifiableCredentialsServerSocket; // we are in node js
