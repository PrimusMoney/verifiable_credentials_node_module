class Fetcher {

	constructor(session,) {
		this.session = session;

	}

	_createRestConnection(rest_url) {
		const URL = require("url");

		var session = this.session;
		var global = session.getGlobalObject();

		let parsedUrl = URL.parse(rest_url, true);

		const rest_server_url = parsedUrl.protocol + '//' + parsedUrl.host;
		const rest_server_api_path = parsedUrl.path;

		const AsyncRestConnection = global.getModuleClass('crypto-did', 'AsyncRestConnection');
		let rest_connection = new AsyncRestConnection(this.session, rest_server_url, rest_server_api_path);
		
		return rest_connection;				
	}

	async _createDidJWT(header, payload, did_obj, alg, did_method, type) {
		return did_obj.createDidJWT(header, payload, alg, did_method, type);
	}

	// calling 3rd party
	async fetchInitiationUrl(options) {
		let rest_url = options.rest_url;

		let params = options;

		let json = {};
		let resource;

		let plain_str;
		let enc_str;

		switch(params.workflow_version) {
			case 'v2': {
				switch (options.method) {
					case 'initiate_issuance': {
						let rest_connection_initiate_issuance = this._createRestConnection(rest_url);
		
						rest_connection_initiate_issuance.addToHeader({key: 'conformance', value: params.conformance});
				
						// cross
						resource = '/issuer-mock/initiate';
						resource += '?conformance=' + params.conformance;
						resource += '&credential_type=' + (params.credential_type ? params.credential_type : 'verifiable-id');
						resource += '&flow_type=' + (params.flow_type == 'same-device' ? 'same-device' : 'cross-device');
				
						json.initiate_issuance = await rest_connection_initiate_issuance.rest_get(resource);
		
						return (json.initiate_issuance ? json.initiate_issuance : null);
					}
					break;
		
					case 'initiate_verification': {
						let rest_connection_initiate_verification = this._createRestConnection(rest_url);
		
						rest_connection_initiate_verification.addToHeader({key: 'conformance', value: params.conformance});
						
						// cross
						resource = '/authentication-requests';
						resource += '?conformance=' + params.conformance;
						resource += '&flow_type=' + (params.flow_type == 'same-device' ? 'same-device' : 'cross-device');
						resource += '&scheme=openid';
				
						json.initiate_verification = await rest_connection_initiate_verification.rest_get(resource);
					
						return (json.initiate_verification ? json.initiate_verification : null);
					}
					break;
		
					default:
						break;
				}
			}
			break;

			case 'v3': {
				//
				// discovery
				const openid_credential_issuer_url = rest_url + '/.well-known/openid-credential-issuer';
				let rest_connection_openid_credential_issuer = this._createRestConnection(openid_credential_issuer_url);
				let openid_credential_issuer = await rest_connection_openid_credential_issuer.rest_get('');

				const openid_config_url = openid_credential_issuer.authorization_server + '/.well-known/openid-configuration';
				let rest_connection_openid_config = this._createRestConnection(openid_config_url);
				let openid_configuration = await rest_connection_openid_config.rest_get('');
	
				let xtra_configuration = (openid_configuration && openid_configuration.xtra_configuration ? openid_configuration.xtra_configuration : {});

				switch (options.method) {
					case 'initiate_issuance': {
						if (xtra_configuration.multi_tenancy && (xtra_configuration.multi_tenancy.activate === true)) {
							// server implements multi-tenancy, must get the endpoints for the specific client
							let client_token = (params.client_id ? (params.client_key ? params.client_id + '_' + params.client_key :params.client_id) : null)
							
							if (client_token) {
								// we check if we must use a specific openid_credential_issuer &&  openid_configuration
								const client_openid_credential_issuer_url = rest_url + '/' + client_token + '/.well-known/openid-credential-issuer';
								let client_rest_connection_openid_credential_issuer = this._createRestConnection(client_openid_credential_issuer_url);
								let client_openid_credential_issuer = await client_rest_connection_openid_credential_issuer.rest_get('').catch(err => {});
				
								if (client_openid_credential_issuer) {
									const client_openid_config_url = client_openid_credential_issuer.authorization_server + '/.well-known/openid-configuration';
									let client_rest_connection_openid_config = this._createRestConnection(client_openid_config_url);
									let client_openid_configuration = await client_rest_connection_openid_config.rest_get('').catch(err => {});
	
									if (client_openid_credential_issuer && client_openid_configuration) {
										openid_credential_issuer = client_openid_credential_issuer;
										openid_configuration = client_openid_configuration;
									}
								}
							}
						}

						let issuer_url = openid_credential_issuer.credential_issuer;

						let rest_connection_initiate_issuance = this._createRestConnection(issuer_url);

						// cross by default
						resource = '/initiate-credential-offer';

						resource += '?credential_type=' + (params.credential_type ? params.credential_type : 'verifiable-id');
						resource += '&flow_type=' + (params.flow_type == 'same-device' ? 'same-device' : 'cross-device');

						plain_str = params.client_did;
						enc_str = (plain_str ? encodeURIComponent(plain_str) : null);
						resource += (enc_str ? '&client_id=' + enc_str : '');

						plain_str = params.credential_offer_endpoint;
						enc_str = (plain_str ? encodeURIComponent(plain_str) : null);
						resource += (enc_str ? '&credential_offer_endpoint=' + enc_str : '');
		
						// primus specific
						resource += '&workflow_version=' + params.workflow_version;
				
						json.initiate_issuance = await rest_connection_initiate_issuance.rest_get(resource);
		
						return (json.initiate_issuance ? json.initiate_issuance : null);
					}
					break;

					case 'initiate_verification': {
						let rest_connection_initiate_verification = this._createRestConnection(rest_url);
		
						rest_connection_initiate_verification.addToHeader({key: 'conformance', value: params.conformance});
						
						// cross
						resource = '/authentication-requests';
						resource += '?conformance=' + params.conformance;
						resource += '&flow_type=' + (params.flow_type == 'same-device' ? 'same-device' : 'cross-device');
						resource += '&scheme=openid';
				
						json.initiate_verification = await rest_connection_initiate_verification.rest_get(resource);
					
						return (json.initiate_verification ? json.initiate_verification : null);
					}
					break;
		
					default:
						break;
	
				}
			}
			break;
	
			default:
				return Promise.reject('no workflow version');

		}
	}


	async fetchVerifiableCredential(options) {
		var session = this.session;
		var global = session.getGlobalObject();
		const Utils = global.getModuleClass('crypto-did', 'Utils');

		const alg = (options.alg ? options.alg : 'ES256');
		let did_obj = options.did_obj;

		let rest_url = options.rest_url;

		let json = {};

		let resource;
		let postdata;
		let plain_str;
		let enc_str;

		let params = options;

		const sessionuuid = this.session.getSessionUUID();

		switch(params.workflow_version) {
			case 'v2': {
				// test health
				let rest_connection_health = this._createRestConnection(rest_url);

				resource = '/health';
				json.health = await rest_connection_health.rest_get(resource);


				//
				// authorize
				let rest_connection_authorize = this._createRestConnection(rest_url);

				resource = '/issuer-mock/authorize';
				resource += '?scope=openid';
				resource += '&response_type=code';
				resource += '&state='+ sessionuuid;

				plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2';
				enc_str = encodeURIComponent(plain_str);
				resource += '&redirect_uri=' + enc_str;

				plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2&sessionuuid='+ sessionuuid;
				enc_str = encodeURIComponent(plain_str);
				resource += '&client_id=' + enc_str;

				plain_str = JSON.stringify([{credential_type:params.credential_type,format: 'jwt_vc',locations:null,type: 'openid_credential'}]);
				enc_str = encodeURIComponent(plain_str);
				resource += '&authorization_details=' + enc_str;

				resource += '&conformance=' + params.conformance;
				//postdata = {conformance: params.conformance}; // passsing conformance in body to appear in EBSI's logs


				json.authorize = await rest_connection_authorize.rest_get(resource);

				if (!json.authorize.code)
					return Promise.reject('could not retrieve authorization code');

				//
				// token
				let rest_connection_token = this._createRestConnection(rest_url);
				
				rest_connection_token.addToHeader({key: 'conformance', value: params.conformance});

				resource = '/issuer-mock/token';

				rest_connection_token.content_type = 'application/x-www-form-urlencoded';
				plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2';
				enc_str = encodeURIComponent(plain_str);

				postdata = 'grant_type=authorization_code';
				postdata += '&code=' + json.authorize.code;
				postdata += '&redirect_uri=' + enc_str;

				json.token = await rest_connection_token.rest_post(resource, postdata);

				if (!json.token.access_token)
					return Promise.reject('could not retrieve access token');


				//
				// credential
				let rest_connection_credential = this._createRestConnection(rest_url);

				rest_connection_credential.addToHeader({key: 'Authorization', value: json.token.token_type + ' ' + json.token.access_token});

				rest_connection_credential.addToHeader({key: 'conformance', value: params.conformance});

				resource = '/issuer-mock/credential';

				postdata = {};
				postdata.format = 'jwt_vc';
				postdata.type = params.credential_type;
				//postdata.access_token = json.token.access_token;
				postdata.c_nonce = json.token.c_nonce;
				postdata.c_nonce_expires_in = json.token.expires_in;
				//postdata.id_token = json.token.id_token;

				// building jwt
				let header = {};

				header.typ = 'jwt';

				let keySet = await this._getKeySet();
				let jwkPubKey = keySet.jwkKeyPair.publicKey;

				header.alg = did_obj._getJwkKeyAlg(jwkPubKey);
				header.jwk = {crv: jwkPubKey.crv, kty: jwkPubKey.kty, x: jwkPubKey.x, y: jwkPubKey.y};

				const agent = await did_obj.getNaturalPersonAgent(alg, (options.did_method ? options.did_method : 'ebsi'));
				const kid = agent.kid;

				header.kid = kid;

				let body = {};

				body.iss = header.kid;
				body.aud = params.issuer;
				body.nonce = json.token.c_nonce;
				body.iat = this._getTimeStamp();

				//let jwt = await this._createJWT(header, body, header.alg);
				let jwt = await this._createDidJWT(header, body, did_obj, alg, (options.did_method ? options.did_method : 'ebsi'))
				.catch(err => {
					console.log(err)
				});


				postdata.proof = {};
				postdata.proof.proof_type = 'jwt';
				postdata.proof.jwt = jwt;

				//postdata.credential = jwt;

				//json.credential = await rest_connection_credential.rest_post(resource, JSON.stringify(postdata));
				json.credential = await rest_connection_credential.rest_post(resource, postdata);
			}
			break

			case 'v3': {
				const Utils = global.getModuleClass('crypto-did', 'Utils');
				const Did = global.getModuleClass('crypto-did', 'Did');
				const JWT = global.getModuleClass('crypto-did', 'JWT');

				let header;
				let payload;

				let jwt;

				let bNeedsUserPin = false;
				let pre_authorization = {};
				pre_authorization.user_pin = params.user_pin;
				pre_authorization.preauthorized_code = params.preauthorized_code;

				//
				// discovery
				const openid_credential_issuer_url = rest_url + '/.well-known/openid-credential-issuer';
				let rest_connection_openid_credential_issuer = this._createRestConnection(openid_credential_issuer_url);
				let openid_credential_issuer = await rest_connection_openid_credential_issuer.rest_get('');

				const openid_config_url = openid_credential_issuer.authorization_server + '/.well-known/openid-configuration';
				let rest_connection_openid_config = this._createRestConnection(openid_config_url);
				let openid_configuration = await rest_connection_openid_config.rest_get('');
	
				//
				// authorize
				let rest_connection_authorize = this._createRestConnection(openid_configuration.authorization_endpoint);

				resource = '';
				resource += '?scope=openid';
				resource += '&response_type=code';
				resource += '&state='+ sessionuuid;

				//plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2';
				plain_str = 'openid:';
				enc_str = encodeURIComponent(plain_str);
				resource += '&redirect_uri=' + enc_str;

				//plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2&sessionuuid='+ sessionuuid;
				plain_str =  await did_obj.getDid()
				enc_str = encodeURIComponent(plain_str);
				resource += '&client_id=' + enc_str;

				let authorization_details = [{type:"openid_credential",format:"jwt_vc"}];
				authorization_details[0].types = params.vc_offer.credentials[0].types;
				authorization_details[0].locations = [openid_credential_issuer.credential_issuer];

				plain_str = JSON.stringify(authorization_details);
				enc_str = encodeURIComponent(plain_str);
				resource += '&authorization_details=' + enc_str;

				let client_metadata = {vp_formats_supported:{jwt_vp:{alg:["ES256"]},
						jwt_vc:{alg:["ES256"]}},
						response_types_supported:["vp_token","id_token"],
						authorization_endpoint:"openid:"};
				client_metadata.authorization_endpoint = openid_config_url; // to avoid 302 and CORS issues on a browser

				plain_str = JSON.stringify(client_metadata);
				enc_str = encodeURIComponent(plain_str);
				resource += '&client_metadata=' + enc_str;

				if (params.nonce)
				resource += '&nonce=' + params.nonce;

				if (params.vc_offer.grants.authorization_code) {
					// intime or deferred credential
					if (params.vc_offer.grants.authorization_code.issuer_state)
					resource += '&issuer_state=' + params.vc_offer.grants.authorization_code.issuer_state;
					else
					return Promise.reject('issuer_state is missing');
				}
				else if (params.vc_offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']) {
					// requires authorization
					let authorization_type = params.vc_offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code'];
					bNeedsUserPin = true;
					pre_authorization.user_pin = '6239'; // should be entered via params.user_pin
					pre_authorization.preauthorized_code = authorization_type['pre-authorized_code'];
				}
				else {
					return Promise.reject('wrong vc_offer.grants');
				}

				const jose = require('jose');
				//const multiformats = require('multiformats');
				const {base64url} = require('multiformats/bases/base64');

				let code_verifier = session.guid() + '-' + session.guid();
				let code_hash = Utils.hash256(code_verifier);
				let code_challenge = jose.base64url.encode(code_hash);

				let code_challenge_2;
				if (options.verifiablecredentialsserveraccess) {
					// TODO: remove when issue with node:crypto in browser is resolve
					let verifiablecredentialsserveraccess = options.verifiablecredentialsserveraccess;

					code_challenge_2 = await verifiablecredentialsserveraccess.credential_code_challenge(code_verifier);

					code_challenge = code_challenge_2;
				}

				resource += '&code_challenge=' + code_challenge;
				resource += '&code_challenge_method=S256';

				json.authorize = await rest_connection_authorize.rest_get_302(resource);

				//
				// access code
				const authorization_code_url = json.authorize.redirect_uri;
				let state = json.authorize.state;
				let nonce = json.authorize.nonce;

				const code_request_url = json.authorize.request_uri;
				let rest_connection_code_request = this._createRestConnection(code_request_url);
				let request_jwt = await rest_connection_code_request.rest_get('');
				let request_jobj = await this._decodeJWT(request_jwt);

				// TODO: analyse request_jobj


				let rest_connection_code = this._createRestConnection(authorization_code_url);
				
				resource = '';

				// build id_token
				const did = await did_obj.getDid();
				const kid = await did_obj.getKid();

				let keySet = await did_obj._getKeySet();

				//let aud = openid_credential_issuer.credential_issuer;
				let aud = openid_configuration.authorization_endpoint;

				header = {typ: 'JWT'}	;
				header.alg = alg;			
				header.kid = kid;

				payload = {};

				payload.iss = did;
				payload.sub = did;
				payload.aud = aud;
				payload.iat = did_obj._getTimeStamp();
				payload.exp = payload.iat + 3600;
				payload.nonce = nonce;
				payload.state = state;
		
				jwt = JWT.getObject(session, header, payload);
		
				let id_token = await jwt._createJWTFromKeySet(keySet);
				//let id_token = await Did.build_id_token(session, keySet, did, params.type, aud, nonce)

				rest_connection_code.content_type = 'application/x-www-form-urlencoded';
				plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2';
				enc_str = encodeURIComponent(plain_str);

				postdata = 'id_token=' + id_token;
				postdata += '&state=' + state;
				//postdata += '&redirect_uri=' + enc_str;

				if (options.verifiablecredentialsserveraccess) {
					// TODO: remove when issue with 302 is fixed
					// Workaround: make call from the server to avoid browser's issue with 302
					let verifiablecredentialsserveraccess = options.verifiablecredentialsserveraccess;

					json.code = await verifiablecredentialsserveraccess.credential_restcall(authorization_code_url, 'post', resource, postdata);
				}
				else
				json.code = await rest_connection_code.rest_post_302(resource, postdata);

				if (!json.code.code)
					return Promise.reject('could not retrieve access code');


				//
				// token
				const authorization_token_url = openid_configuration.token_endpoint;

				let rest_connection_token = this._createRestConnection(authorization_token_url);
				
				resource = '';

				rest_connection_token.content_type = 'application/x-www-form-urlencoded';
				plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2';
				enc_str = encodeURIComponent(plain_str);

				if (!bNeedsUserPin) {
					postdata = 'grant_type=authorization_code';
					postdata += '&code=' + json.code.code;
					postdata += '&code_verifier=' + code_verifier;
					//postdata += '&redirect_uri=' + enc_str;
	
					plain_str =  await did_obj.getDid()
					enc_str = encodeURIComponent(plain_str);
					postdata += '&client_id=' + enc_str;
				}
				else {
					postdata = 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:pre-authorized_code');
					postdata += '&user_pin=' + pre_authorization.user_pin;
					postdata += '&pre-authorized_code=' + pre_authorization.preauthorized_code;
				}

				json.token = await rest_connection_token.rest_post(resource, postdata);

				if (!json.token.access_token)
					return Promise.reject('could not retrieve access token');

				//
				// credential
				const credential_url = openid_credential_issuer.credential_issuer;
				//const credential_url = openid_configuration.authorization_endpoint + '/..';

				let rest_connection_credential = this._createRestConnection(credential_url);

				rest_connection_credential.addToHeader({key: 'Authorization', value: json.token.token_type + ' ' + json.token.access_token});

				resource = '/credential';

				postdata = {};
				postdata.format = 'jwt_vc';
				postdata.types = params.vc_offer.credentials[0].types;
				//postdata.access_token = json.token.access_token;
				postdata.c_nonce = json.token.c_nonce;
				postdata.c_nonce_expires_in = json.token.expires_in;
				//postdata.id_token = json.token.id_token;

				// building jwt proof
				header = {};

				//header.typ = 'jwt';
				header.typ = 'openid4vci-proof+jwt';

				let jwkPubKey = keySet.jwkKeyPair.publicKey;

				header.alg = did_obj._getJwkKeyAlg(jwkPubKey);
				header.jwk = {crv: jwkPubKey.crv, kty: jwkPubKey.kty, x: jwkPubKey.x, y: jwkPubKey.y};

				header.kid = kid;

				payload = {};

				payload.iss = header.kid;
				payload.aud = openid_credential_issuer.credential_issuer;
				//payload.aud = openid_configuration.authorization_endpoint;
				payload.nonce = json.token.c_nonce;
				payload.iat = did_obj._getTimeStamp();
				//payload.exp = json.token.expires_in;
				payload.exp = payload.iat + 300; // 300 == 5mn

				//let jwt = await this._createJWT(header, body, header.alg);
				jwt = await this._createDidJWT(header, payload, did_obj, alg, (options.did_method ? options.did_method : 'ebsi'))
				.catch(err => {
					console.log(err)
				});

				// TEST
/* 				let cryptoPubKey = await jose.importJWK(jwkPubKey, alg);
				let proof_verification = await jose.jwtVerify(jwt, cryptoPubKey)
				.catch(err => {
					console.log('cryptoPubKey verification error: ' + err);
				}); */
				// TEST

				postdata.proof = {};
				postdata.proof.proof_type = 'jwt';
				postdata.proof.jwt = jwt;

				//postdata.credential = jwt;

				//json.credential = await rest_connection_credential.rest_post(resource, JSON.stringify(postdata));
				json.credential = await rest_connection_credential.rest_post(resource, postdata);

				if (json.credential.acceptance_token) {
					// it is a deferred credential
					const deferred_credential_url = openid_credential_issuer.credential_issuer;
					//const credential_url = openid_configuration.authorization_endpoint + '/..';
					let acceptance_token = json.credential.acceptance_token;
	
					let rest_connection_deferred_credential = this._createRestConnection(deferred_credential_url);
	
					rest_connection_deferred_credential.addToHeader({key: 'Authorization', value: 'Bearer ' + acceptance_token});
	
					resource = '/credential_deferred';
	
					postdata = {
					};

					// TOOD: implement a while with time limit
					await Utils.sleep(5000); // wait 5s

			
					json.credential = await rest_connection_deferred_credential.rest_post(resource, postdata);
				}
			}
			break;

			default:
				return Promise.reject('no workflow version');

		}

		//


		return (json.credential && json.credential.credential ? json.credential.credential : null);
	}

	async fetchVerifiabledPresentationVerification(audience, idtoken, vptoken, options) {
		var params = options;

		const alg = (options.alg ? options.alg : 'ES256');

		let rest_url = options.rest_url;

		let json = {};

		let resource;
		let postdata;

		// cross
		let rest_connection_verify_cross = this._createRestConnection(rest_url);

		rest_connection_verify_cross.addToHeader({key: 'conformance', value: params.conformance});
		
		// '/authentication_responses'
		resource = '';
		resource += '?conformance=' + params.conformance;
		resource += '&flow_type=cross-device';
		resource += '&scheme=openid';

		rest_connection_verify_cross.content_type = 'application/x-www-form-urlencoded';

		postdata = {};

		postdata = 'id_token=' + idtoken;
		postdata += '&vp_token=' + vptoken;


		json.verify_cross_device = await rest_connection_verify_cross.rest_post(resource, postdata);


		return json.verify_cross_device;
	}

	async _decodeJWT(jwt) {
		var session = this.session;
		var global = session.getGlobalObject();

		const JWT = global.getModuleClass('crypto-did', 'JWT');
		return JWT.decodeJWT(jwt);
	}
	
	async verifyVerifiablePresentationJWT(audience, idtoken, vptoken, options) {
		var verification = {result: false, validations: {}};

		try {

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


			// check credential
			const vc_token = vp_obj.payload.verifiableCredential;

			const vc_obj = await this._decodeJWT(vc_token);

			if (vc_obj) {
				verification.result = true;

				verification.validations.presentation = {status: true};

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

	// static
	static getObject(session) {
		let obj =  new Fetcher(session);

		return obj;
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
_GlobalClass.registerModuleClass('crypto-did', 'Fetcher', Fetcher);