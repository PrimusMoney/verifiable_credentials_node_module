class EBSIServer {
	constructor(session, type) {
		this.session = session;

		switch(type) {
			case 'conformance':
				this.rest_url = 'https://api-conformance.ebsi.eu'
				break;

			case 'pilot':
				this.rest_url = 'https://api-pilot.ebsi.eu'
				break;
	
			case 'production':
				this.rest_url = 'https://api.ebsi.eu'
				break;

			default:
				this.rest_url = 'https://api-conformance.ebsi.eu'
				break;
		}
	}


	getRestConnection() {
		if (this.rest_connection)
			return this.rest_connection;

		var session = this.session;
		var global = session.getGlobalObject();
		
		const AsyncRestConnection = global.getModuleClass('crypto-did', 'AsyncRestConnection');

	    this.rest_connection = new AsyncRestConnection(session, this.rest_url);
		
		return this.rest_connection;
	}

	async rest_get(resource, callback) {
		var rest_connection = this.getRestConnection();
		
		return rest_connection.rest_get(resource, callback);
	}
	
	async rest_post(resource, postdata, callback) {
		var rest_connection = this.getRestConnection();
		
		return rest_connection.rest_post(resource, postdata, callback);
	}

	async rest_put(resource, postdata, callback) {
		var rest_connection = this.getRestConnection();
		
		return rest_connection.rest_put(resource, postdata, callback);
	}
	
	
	// api
	async schema_list() {
		var resource = "/trusted-schemas-registry/v2/schemas";

		var res = await this.rest_get(resource);

		return res;
	}

}


if ( typeof window !== 'undefined' && typeof window.GlobalClass !== 'undefined' && window.GlobalClass ) {
	var _GlobalClass = window.GlobalClass;
}
else if (typeof window !== 'undefined') {
	var _GlobalClass = ( window && window.simplestore && window.simplestore.Global ? window.simplestore.Global : null);
}
else if (typeof global !== 'undefined') {
	// we are in node js
	var _GlobalClass = ( global && global.simplestore && global.simplestore.Global ? global.simplestore.Global : null);
}

_GlobalClass.registerModuleClass('crypto-did', 'EBSIServer', EBSIServer);