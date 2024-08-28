class WebServer {
	constructor(session, web_env) {
		this.session = session;
		this.global = session.getGlobalObject();

		this.web_env = web_env;
	}

	getRestConnection() {
		if (this.rest_connection)
			return this.rest_connection;

		var session = this.session;
		var global = session.getGlobalObject();
		
		const AsyncRestConnection = global.getModuleClass('crypto-did', 'AsyncRestConnection');
		this.rest_connection = new AsyncRestConnection(this.session, this.web_env.rest_server_url, this.web_env.rest_server_api_path);
		
		return this.rest_connection;				
	}

	//
	// registry functions
	//

	// configuration
	async registries_configuration() {
		// TODO: use WebRegistryServer from @p2pmoney-org/did_web_registries package
		var resource = '/.well-known/registries-configuration';
		var rest_connection = this.getRestConnection();
		
		let registries_config = await rest_connection.rest_get(resource);

		return registries_config;
	}

	//
	// identifiers

	// did & documents
	async did_registry_identifiers(pageafter, pagesize, did_web_domain) {
		// TODO: use WebRegistryServer from @p2pmoney-org/did_web_registries package
		var resource = "/did/identifiers";
		var rest_connection = this.getRestConnection();

		if ((typeof pageafter !== 'undefined') || (typeof pagesize !== 'undefined')) resource += '?';

		resource += (typeof pageafter !== 'undefined' ? 'page[after]=' + pageafter : '');
		resource += (typeof pagesize !== 'undefined'  ? '&page[size]=' + pagesize : '');
		resource += (typeof did_web_domain !== 'undefined'  ? '&domain=' + did_web_domain : '');

		var res = await rest_connection.rest_get(resource);

		return res;
	}

	async did_registry_did_document(did) {
		// TODO: use WebRegistryServer from @p2pmoney-org/did_web_registries package
		var resource = "/did/identifiers";
		var rest_connection = this.getRestConnection();
		
		resource += "/" + encodeURI(did);

		var res = await rest_connection.rest_get(resource);

		return res;
	}

	//
	// attributes
	async did_registry_identifier_attributes(did) {
		// TODO: use WebRegistryServer from @p2pmoney-org/did_web_registries package
		var resource = "/did/identifiers";
		var rest_connection = this.getRestConnection();
		
		resource += "/" + encodeURI(did) + "/attributes";

		var res = await rest_connection.rest_get(resource);

		return res;
	}

	//
	// trust chain
	async did_trust_chain(did) {
		// TODO: use WebRegistryServer from @p2pmoney-org/did_web_registries package
		var resource = "/did/trust_chain";
		var rest_connection = this.getRestConnection();
		
		resource += "/" + encodeURI(did);

		var res = await rest_connection.rest_get(resource);

		return res;
	}


	//
	// trusted issuers registry
	async trusted_issuers_registry_issuers(pageafter, pagesize, did_web_domain) {
		// TODO: use WebRegistryServer from @p2pmoney-org/did_web_registries package
		var resource = "/did/issuers";
		var rest_connection = this.getRestConnection();

		if ((typeof pageafter !== 'undefined') || (typeof pagesize !== 'undefined')) resource += '?';

		resource += (typeof pageafter !== 'undefined' ? 'page[after]=' + pageafter : '');
		resource += (typeof pagesize ? '&page[size]=' + pagesize : '');
		resource += (typeof did_web_domain !== 'undefined'  ? '&domain=' + did_web_domain : '');

		var res = await rest_connection.rest_get(resource);

		return res;
	}

	async trusted_issuers_registry_issuer(did) {
		// TODO: use WebRegistryServer from @p2pmoney-org/did_web_registries package
		var resource = "/did/issuers";
		var rest_connection = this.getRestConnection();

		resource += "/" + encodeURI(did);

		var res = await rest_connection.rest_get(resource);

		return res;
	}

	//
	// credentials
	async issuer_credential_status_history(credential_hash, did_web_domain) {
		// TODO: use WebRegistryServer from @p2pmoney-org/did_web_registries package
		var resource = "/issuer/credential/status/history";
		var rest_connection = this.getRestConnection();
		
		var postdata = {credential_hash, did_web_domain};

		var res = await rest_connection.rest_post(resource, postdata);

		return res;
	}

	async issuer_credential_status_modifications_list(credential_hash, modifier_did) {
		// TODO: use WebRegistryServer from @p2pmoney-org/did_web_registries package
		var resource = "/issuer/credential/status/modifications/list";
		var rest_connection = this.getRestConnection();
		
		var postdata = {credential_hash, modifier_did};

		var res = await rest_connection.rest_post(resource, postdata);

		return res;
	}

	//
	// utility
	async getConnectionRawCertificate() {
		var global = this.global;
		const WebCertificate = global.getModuleClass('crypto-did', 'WebCertificate');

		let webcertificate = new WebCertificate(this.web_env.rest_server_url);
		let certificate = await webcertificate.get();

		return certificate;
	}




	// static
	static getObject(session, web_env) {

		let web_server =  new WebServer(session, web_env);

		return web_server;
	}

	static 	getDidDomain(did) {
		if (!did) return;

		let parts = did.split(':')
		let domain = parts[2];

		return domain;
	}



	static async fetchObjectFromDid(session, did) {
		var global = session.getGlobalObject();

		let domain = WebServer.getDidDomain(did);

		let registrar_url = 'https://' + domain;

		const AsyncRestConnection = global.getModuleClass('crypto-did', 'AsyncRestConnection');
		
		let rest_connection = new AsyncRestConnection(session, registrar_url, null);

		let registries_config = await rest_connection.rest_get('/.well-known/registries-configuration');

		if (!registries_config || !registries_config.api_endpoint)
			return Promise.reject('serveur for did does not support /.well-known/registries-configuration: ' + did);

		let did_registrar_rest_url = registries_config.api_endpoint;

		let web_env = {rest_server_url: did_registrar_rest_url}

		let web_server =  WebServer.getObject(session, web_env);

		return web_server;
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

_GlobalClass.registerModuleClass('crypto-did', 'WebServer', WebServer);