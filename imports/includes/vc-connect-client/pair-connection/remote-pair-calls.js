class RemotePairCalls {
	constructor(client_socket, sessionuuid, pair_uuid) {
		this.client_socket = client_socket;

		this.sessionuuid = sessionuuid;
		this.pair_uuid = pair_uuid; // correspondent connection uuid

		this.rpc_uuid = this.guid(); // our uuid
	}

	async init() {
		let websocket_server = this.client_socket.socket_server;

		websocket_server.addActionListener('receiveRequest', this.handleMessage.bind(this), this.client_socket.connectionuuid, this.rpc_uuid);
		websocket_server.addActionListener('receiveNotification', this.handleMessage.bind(this), this.client_socket.connectionuuid, this.rpc_uuid);
		websocket_server.addActionListener('receiveAnswer', this.handleMessage.bind(this), this.client_socket.connectionuuid, this.rpc_uuid);
	}

	async close() {
		let websocket_server = this.client_socket.socket_server;

		websocket_server.removeActionListener('receiveAnswer', this.client_socket.connectionuuid, this.rpc_uuid);
		websocket_server.removeActionListener('receiveNotification', this.client_socket.connectionuuid, this.rpc_uuid);
		websocket_server.removeActionListener('receiveRequest', this.client_socket.connectionuuid, this.rpc_uuid);
	}

	// messages: communication between client and widget

	// to pair
	postPacket(header, data) {
		// enrich header
		if (!header.from) header.from = this.client_socket.connectionuuid;
		if (!header.to) header.to = this.pair_uuid;

		// rpc header
		let _rpc_header = (data && data.header ? data.header : {});

		_rpc_header.stub = this.rpc_uuid;

		let _rpc_data = (data && data.data ? data.data : data);
		
		let rpc_packet = {header: _rpc_header, data: _rpc_data};

		if (!header.action)
		header.action = 'receiveNotification'; // no answer expected

		this.client_socket.postPacket(header, rpc_packet).catch(err => {});

		return true;
	}

	postData(data) {
		// create a header
		let header = {};

		this.postPacket(header, data);

		return true;
	}

	// from pair
	handleMessage(json) {
		try {
			let header = (json.header ? json.header : {});
			let data = (json.data ? json.data : {});

			switch(header.action) {
				//
				// communication from this client to pair
				//
				case 'receiveAnswer': {
					let request_uuid = header.request_uuid;
					let answer = data.answer;

					this.receiveAnswer(request_uuid, answer);
				}
				break;

				//
				// communication from pair to this client
				//
				case 'receiveRequest': {
					let request_uuid = header.request_uuid;
					let request = data;

					this.receiveRequest(request_uuid, data);
				}
				break;

				case 'receiveNotification': {
						let event = json;
	
						this.receiveNotification(event);
					}
					break;
	
				default:
					break;
			}
		}
		catch(e) {
			console.log('exception in RemotePairCalls.handleMessage: ' + e);
		}
	}

	// requests from pair to client
	async answerRequest(request, answer) {
		if (!request || !request.request_uuid)
			return;

		let header =  {action: 'receiveAnswer', request_uuid: request.request_uuid}
		let data = {answer: (answer ? answer : {})};

		this.postPacket(header, data);

		return true;
	}

	// requests to pair
	async sendRequest(data) {

		return new Promise((resolve, reject) => {
			let header = {action: 'receiveRequest'};

			header.request_uuid = this.guid();

			this.postPacket(header, data);

			var receive_answer = (ev) => {
				let answer = ev.detail;
				resolve(answer);

				window.removeEventListener('requestanswer_' + header.request_uuid, receive_answer);
			};
			
			window.addEventListener('requestanswer_' + header.request_uuid, receive_answer);
		});

	}

	receiveAnswer(request_uuid, answer) {
		const event = new CustomEvent('requestanswer_' + request_uuid, {detail: answer});

		window.dispatchEvent(event);
	}

	receiveRequest(request_uuid, data) {
		const event = new CustomEvent('request_' + request_uuid, {detail: data});

		window.dispatchEvent(event);
	}

	receiveNotification(ev) {
		const event = new CustomEvent('notification_' + ev.event_name, {detail: ev});

		window.dispatchEvent(event);
	}


	// remote call
	async invokeCall(method, params) {
		let answer_struct = await this.sendRequest({method, params})
		.catch(err => {
			console.log(err);
		});

		return (answer_struct ? answer_struct : null); 
	}

	async sendNotification(notification, params) {
		this.postData({notification, params});

		return true;
	}

	// guid
	guid() {
		return this.generateUUID(8) + '-' + this.generateUUID(4) + '-' + this.generateUUID(4) + '-' +
		this.generateUUID(4) + '-' + this.generateUUID(12);
	}
	
	generateUUID(length) {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
			}
		
		var uuid = '';
		
		while (uuid.length < length) {
			uuid += s4();
		}
		
		return uuid.substring(0, length);
	}
}


if (typeof window !== 'undefined') {
	// we are in the browser or in react native
	if  ((typeof window.simplestore === 'undefined') || (window.simplestore == null)) window.simplestore = {};
	
	window.simplestore.RemotePairCalls = RemotePairCalls;
}
else if (typeof global !== 'undefined') {
	// we are in nodejs
	if  ((typeof global.simplestore === 'undefined') || (global.simplestore == null)) global.simplestore = {};

	global.simplestore.RemotePairCalls = RemotePairCalls;
}

//module.exports = RemotePairCalls;