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

	// @cef libs
	async _decodeJWT(jwt) {
		var session = this.session;
		var global = session.getGlobalObject();

		const JWT = global.getModuleClass('crypto-did', 'JWT');
		return JWT.decodeJWT(jwt);
	}
	

	async verifyVerifiablePresentationJWT(audience, idtoken, vptoken, options) {
		var verification = {result: false, validations: {}};

		try {
			//const EbsiVerifiablePresentation= require('@cef-ebsi/verifiable-presentation');
			const EbsiVerifiablePresentation = await import('@cef-ebsi/verifiable-presentation');
			const { verifyPresentationJwt } = EbsiVerifiablePresentation;

			if (!options)
				options = {};

			if (!options.ebsiAuthority)
				options.ebsiAuthority = "api-conformance.ebsi.eu"; // for tests on conformance deployment

			// checks
			if (!vptoken)
				return verification; // avoids "Uncaught ValidationError: Unable to decode JWT VC" in this._decodeJWT

			const vp_obj = await this._decodeJWT(vptoken);

			verification.validations.vpFormat = {status: true};

			// check presentation
			let _audience = (audience ? audience : (vp_obj && vp_obj.payload ? vp_obj.payload.aud : null));


			let verifiedVp = await verifyPresentationJwt(vptoken, _audience, options);

			if (verifiedVp) {
				verification.result = true;

				verification.validations.presentation = {status: true};

				// check credential
				//let vc_jwt = (vp_obj && vp_obj.payload && vp_obj.payload.verifiableCredential ? vp_obj.payload.verifiableCredential[0]: null);
				verification.validations.credential = {status: true};
		
			}
			else {
				verification.result = false;

				verification.validations.presentation = {status: false, error: 'VP jwt validation failed',	details: 'unkown'};
				verification.validations.credential = {status: false};
			}

			
		}
		catch(e) {
			console.log('exception in verifyVerifiablePresentationJWT: ' + e);

			let error = (e ? (e.message ? e.message : e) : 'unknown');
			verification.validations.presentation = {status: false, error};
			verification.validations.credential = {status: false};

		}

		return verification;
	}
	
	
	// rest api
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