class EBSIMethodSubModule {
	constructor(crypto_did_module) {
		this.crypto_did_module = crypto_did_module;
		this.global = crypto_did_module.global;
	}

	_getIssuerTrustChain(trusted_issuer) {
		let attributes = trusted_issuer.attributes;
		let trust_chain = {};

		for (var i = 0; i < (attributes ? attributes.length : 0); i++) {
			let attribute = attributes[i];
			if (attribute.issuerType == 'TI') {
				trust_chain.rootTao = attribute.rootTao;
				trust_chain.tao = attribute.tao;
				break;
			}
		}

		return trust_chain;
	}

	_isRootTAO(trusted_issuer) {
		let attributes = trusted_issuer.attributes;

		for (var i = 0; i < (attributes ? attributes.length : 0); i++) {
			let attribute = attributes[i];
			if (attribute.issuerType == 'RootTAO') {
				return true;
			}
		}

		return false;
	}

	_isTAO(trusted_issuer) {
		let attributes = trusted_issuer.attributes;

		for (var i = 0; i < (attributes ? attributes.length : 0); i++) {
			let attribute = attributes[i];
			if (attribute.issuerType == 'TAO') {
				return true;
			}
		}

		return false;
	}

	async verifyVerifiableCredentialJWT(verifier, audience, vc_jwt, vc_obj, vc_verification) {
		var session = verifier.session;
		var global = session.getGlobalObject();
		var global = session.getGlobalObject();

		let ebsi_envs = [{ebsi_env_string: 'conformance'}, {ebsi_env_string: 'pilot'}, {ebsi_env_string: 'production'}];

		let ebsi_env;

		// 6 - VC authority of issuer validation (depending on the Trust Model, e.g. accreditation) at issuance time.
		const EBSIServer = global.getModuleClass('crypto-did', 'EBSIServer');

		let ebsi_server;

		// find if did is registered on an ebsi environment and which one
		let did_document;
		let iss_did = (vc_obj && vc_obj.payload ? vc_obj.payload.iss : null);
		let vc_issuer_did = (vc_obj && vc_obj.payload && vc_obj.payload.vc 
			&& vc_obj.payload.vc.issuer ? vc_obj.payload.vc.issuer : null);


		for (var i = 0; i < ebsi_envs.length; i++) {
			let _ebsi_env = ebsi_envs[i];

			ebsi_server = EBSIServer.getObject(session, _ebsi_env);

			did_document = await ebsi_server.did_registry_did_document(iss_did).catch(err => {});

			if (did_document) {
				vc_verification.is_did_registered = 1;

				ebsi_env = _ebsi_env;
				vc_verification.ebsi_env = ebsi_env;

				break;
			}
		}

		if (did_document) {
			// see what EBSI has to say about this credential
			let ebsiVerification = await ebsi_server.verifyVerifiableCredentialJWT(vc_jwt, {})
			.catch(err => {
				ebsiVerification.error = err;
			});
			vc_verification.ebsi = ebsiVerification;


			let trusted_issuer = await ebsi_server.trusted_issuers_registry_issuer(iss_did).catch(err => {});
			let trust_chain = this._getIssuerTrustChain(trusted_issuer);

			if (trusted_issuer)
			vc_verification.is_did_trusted_issuer = 1;
			else
			vc_verification.is_did_trusted_issuer = -1;

			vc_verification.TI = {identity: {}};

			vc_verification.TI.is_trusted = (vc_verification.is_did_trusted_issuer ? 1 : -1);

			vc_verification.TI.identity.name = iss_did;

			// get status and identity elements of RootTAO
			let root_tao_did = trust_chain.rootTao;

			vc_verification.RootTAO = {identity: {}};

			if (root_tao_did) {
				let trusted_rootTao = await ebsi_server.trusted_issuers_registry_issuer(root_tao_did).catch(err => {});

				if (trusted_rootTao && (this._isRootTAO(trusted_rootTao)) )
				vc_verification.RootTAO.is_trusted = 1;
				else
				vc_verification.RootTAO.is_trusted = -1;

				vc_verification.RootTAO.identity.name = root_tao_did;
			}

			// get status and identity elements of TAO
			let tao_did = trust_chain.tao;;

			vc_verification.TAO = {identity: {}};

			if (tao_did) {
				let trusted_tao = await ebsi_server.trusted_issuers_registry_issuer(tao_did).catch(err => {});

				if (trusted_tao && (this._isTAO(trusted_tao)) )
				vc_verification.TAO.is_trusted = 1;
				else
				vc_verification.TAO.is_trusted = -1;

				vc_verification.TAO.identity.name = tao_did;
			}

			// 5 - VC validity status (e.g. not revoked nor suspended)

			// check that credential is signed with a published public key
			vc_verification.is_credential_signing_publicly_confirmed = 0;
			
			if (did_document.verificationMethod) {
				let kid = vc_obj.header.kid;
				vc_verification.is_credential_signing_publicly_confirmed = -1;

				for (var i = 0; i < did_document.verificationMethod.length; i++) {
					if (did_document.verificationMethod[i].id == kid) {
						vc_verification.is_credential_signing_publicly_confirmed = 1;
						break;
					}
				}
			}

			// check if credential is revokable and has been revoked
			vc_verification.is_credential_revoked = 0; // 0, don't know
		}
		else  {
			vc_verification.is_did_registered = -1;
			vc_verification.is_did_trusted_issuer = -1;

			vc_verification.is_credential_signing_publicly_confirmed = -1;
						
			// 5 - VC validity status (e.g. not revoked nor suspended)
			vc_verification.is_credential_revoked = 0;
		}


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

_GlobalClass.registerModuleClass('crypto-did', 'EBSIMethodSubModule', EBSIMethodSubModule);