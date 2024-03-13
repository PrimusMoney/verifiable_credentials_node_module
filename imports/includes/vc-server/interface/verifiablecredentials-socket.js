var VerifiableCredentialsServerSocket = class {
	
	constructor(session) {
		this.session = session;

		this.wss_server_url = null;
		this.wss_server_api_path = null;

		this.websocket_server = null; // vc-connect web socket server
		this.client_websocket = null;

		this.action_listeners = {};

		this.request_responders = {};
	}

	_getVcConnectClass() {
		const VcConnect = require('../../vc-connect-client');
		return VcConnect;
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

	//
	// actions
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

		switch(action) {
			case 'onReceiveServerRequest': {
				this.onReceiveServerRequest(json).catch(err => {});
			}
			break;

			default: {
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
			break;
		}
		

	}

	//
	// requests
	addRequestResponder(obj, uuid) {
		this.request_responders[(uuid ? '_' + uuid : this.session.guid())] = obj;
	}

	removeRequestResponder(uuid) {
		if (!uuid) return;

		let obj = this.request_responders[(uuid ? '_' + uuid : '')];

		if (obj) {
			delete this.request_responders[(uuid ? '_' + uuid : '')];
		}
	}


	async _getWebSocketServer() {
		if (this.websocket_server)
			return this.websocket_server;

		var wss_server_url = (this.wss_server_url ? this.wss_server_url : this.session.getXtraConfigValue('wss_server_url'));
		var wss_server_api_path = (this.wss_server_api_path ? this.wss_server_api_path :this.session.getXtraConfigValue('wss_server_api_path'));

		var server_url = wss_server_url + (wss_server_api_path ? wss_server_api_path : '');

		const VcConnect = this._getVcConnectClass();
		const WebSocketServer = VcConnect.WebSocketServer;

		this.websocket_server = WebSocketServer.getObject(wss_server_url, wss_server_api_path);

		return this.websocket_server;
	}
	
	async getClientWebSocket() {
		if (this.client_websocket)
			return this.client_websocket;
		
		let websocket_server = await this._getWebSocketServer();
		
		// create web socket
		let session = this.session;
		let sessionuuid = session.getSessionUUID();
		let connectionuuid = session.guid();

		let vc_connect_client_socket = await websocket_server.createClientWebSocket(sessionuuid, connectionuuid, null, this._onMessage.bind(this));
						// re-route messages to our method (and we chain messages in it)

		this.client_websocket = websocket_server.getClientWebSocket(connectionuuid);
		
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

	// notifications sent to remote paired client
	// (e.g. wallet to widget, or widget to wallet)
	// it is using the VcConnect mechanisms and NOT
	// the VerifiableCredentialsServerSocket layer
	async notifyRemoteClient(remote_connectionuuid, notification) {
		const VcConnect = this._getVcConnectClass();
		const RemotePairCalls = VcConnect.RemotePairCalls;

		let action = notification.action;
		let params = notification.params;

		if (!params.remote_connectionuuid) params.remote_connectionuuid = remote_connectionuuid;

		let session = this.session;
		let sessionuuid = session.getSessionUUID();

		let rpc = new RemotePairCalls(this.client_websocket, sessionuuid, remote_connectionuuid);

		await rpc.init();

		let result = await rpc.sendNotification(action, params);
		
		await rpc.close();

		return result;
	}

	async requestRemoteClient(remote_connectionuuid, request) {
		const VcConnect = this._getVcConnectClass();
		const RemotePairCalls = VcConnect.RemotePairCalls;

		let action = request.action;
		let params = request.params;

		if (!params.remote_connectionuuid) params.remote_connectionuuid = remote_connectionuuid;

		let session = this.session;
		let sessionuuid = session.getSessionUUID();

		let rpc = new RemotePairCalls(this.client_websocket, sessionuuid, remote_connectionuuid);

		await rpc.init();

		let result = await rpc.invokeCall(action, params);
		
		await rpc.close();

		return result;
	}

	// answering server requests
	async onReceiveServerRequest(json) {
		let answer = {status: 'reject'};

		// dispatch to objects that want to handle
		// the action by themselves
		let keys = Object.keys(this.action_listeners);
		let handled = false;

		for (var i = 0; i < keys.length; i++) {
			let key = keys[i];
	
			if (key.startsWith('onReceiveServerRequest')) {
				let func = this.action_listeners[key];
	
				try {
					func(json);
					handled = true;
					answer.status = 'answered';
					break;
				}
				catch(e) {
				}
			}
		}

		// get list of objects that can respond to 
		// specific server requests
		if (handled === false) {
			let data = (json.data ? json.data : {});
			let calluuid = data.calluuid;
	
			let request = (data.request ? data.request : {});
			let question = request.question;
			let params = request.params;

			let arr = Object.values(this.request_responders);

			for (var i = 0; i < arr.length; i++) {
				let obj = arr[i];
		
				if (question && obj[question]) {
					let func = obj[question].bind(obj);
		
					try {
						answer = await func(params);
						handled = true;
						answer.status = 'accept';
						break;
					}
					catch(e) {
					}
				}
			}

		}


		if ((answer.status === 'reject')  || (answer.status === 'accept')) {
			await this.answerServerRequest(json, answer);
		}

	}

	async answerServerRequest(json, answer) {
		let calluuid = (json.data ? json.data.calluuid : null);

		let session = this.session;
		let sessionuuid = session.getSessionUUID();
		let connectionuuid = (json.header ? json.header.connectionuuid : null);

		let header = {action: 'receiveClientAnswer', sessionuuid, connectionuuid};
		let data = {params: {calluuid, answer}};

		return this.postPacket(header, data);
	}
	

	// notifications sent to server
	// FOR TEST PURPOSES use REST calls to 
	// use REST calls to start communications with server
	async notifyServer(notification) {
		const VcConnect = this._getVcConnectClass();
		const RemotePairCalls = VcConnect.RemotePairCalls;

		let action = notification.action;
		let params = notification.params;

		let header = {action};
		let data = params;

		await this.postPacket(header, data);
	}

	async nonce_changed(nonce) {

		let notification = {action: 'nonce_changed',params: {nonce}};

		await this.notifyServer(notification);

		console.log('nonce_changed');
	}
	
	async change_did(from, to) {

		var header = {action: 'change_did'}

		var data = {};
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
