/**
 * 
 */
 'use strict';

var CryptoCard = class {
	static get CLIENT_CARD() { return 0;}
	static get REMOTE_CARD() { return 1;}

	constructor(wallet, scheme, authname, address) {
		this.wallet = wallet;
		this.global = this.wallet.module.global;
		
		this.scheme = scheme;
		
		this.label = authname;
		this.uuid = null;
		
		this.authname = authname;
		this.address = address;
		this.password = null;
		
		this.xtra_data = {};
		
		// operations
	
		this.locked = true;
		this.readonly = false;
		
		this.tokenaccountmap = Object.create(null);
		
		this.tokenaccountlist = [];
		
		this.session = null;
	}
	
	init(callback) {
		return this._createSession()
		.then((session) => {
			if (callback)
				callback(null, true);
			
			return true;
			
		})
		.catch(err => {
			if (callback)
				callback(err, null);
					
			throw new Error(err);
		});
	}
	
	getLocalJson() {
		var json = {};
		
		json.schemeuuid = this.scheme.getSchemeUUID();
		json.authname = this.authname;
		json.address = this.address;
		json.password = this.password;
		
		json.name = (this.name ? this.name : 'no name');
		json.uuid = (this.uuid ? this.uuid : this.getCardUUID());
		json.label = this.label;
		
		json.xtra_data = this.xtra_data;

		return json;
	}
	
	getWallet() {
		return this.wallet;
	}
	
	getWalletUUID() {
		return this.wallet.getWalletUUID();
	}
	
	getScheme() {
		return this.scheme;
	}
	
	getSchemeUUID() {
		return this.scheme.getSchemeUUID();
	}
	
	getAuthName() {
		return this.authname;
	}
	
	getAddress() {
		return this.address;
	}
	
	getPublicKeys() {
		var session = this._getSession();
		
		var publickeys = {address: this.address}

		var sessionaccount = this._getSessionAccountObject();
		
		if (sessionaccount) {
			publickeys['public_key'] = sessionaccount.getPublicKey();
			publickeys['rsa_public_key'] = sessionaccount.getRsaPublicKey();
		}
		
		return publickeys;
	}
	
	getCardUUID() {
		if (this.uuid)
		return this.uuid;
		
		var session = this._getSession();
		
		if (session) {
			this.uuid = session.guid();
			session.CARD = this.uuid;
		}
		
		return this.uuid;
	}
	
	getCardType() {
		var scheme = this.scheme;
		
		if (scheme.isRemote()) {
			var wallet = this.wallet;
			var walletschemeuuid = wallet.getSchemeUUID();
			var schemeuuid = scheme.getSchemeUUID();

			if (walletschemeuuid && (walletschemeuuid === schemeuuid))
				return CryptoCard.CLIENT_CARD;
			else
				return CryptoCard.REMOTE_CARD
		}
		else
			return CryptoCard.CLIENT_CARD;
	}

	
	setCardUUID(uuid) {
		this.uuid = uuid;
	}
	
	getLabel() {
		if (this.label)
		return this.label;
		
		return 'unknown';
	}
	
	setLabel(label) {
		this.label = label;
	}
	
	// xtra data (available to let other modules store additional info)
	getXtraData(key) {
		if (key)
			return this.xtra_data[key];
		else
			return this.xtra_data;
	}
	
	putXtraData(key, value) {
		if (!key) {
			Object.assign(this.xtra_data, value);
			return;
		}
		
		this.xtra_data[key] = value;
	}
	
	_getSession() {
		return this.session;
	}
	
	_getLocalStorageSession() {
		// TODO: remove _getLocalStorageSession
		// we should normally no longer need _getLocalStorageSession
		// since we now impersonate local card session with wallet user (2020.04.10)
		var session;
		
		var cardtype = this.getCardType();
		
		switch(cardtype) {
			case CryptoCard.CLIENT_CARD:
				session = this.wallet._getSession();
				break;
				
			case CryptoCard.REMOTE_CARD:
				session = this._getSession();
				break;
				
			default:
				throw new Error('card is of a wrong type: ' + cardtype);
		}
		
		return session;
	}
	
	async _createSession() {
		var global = this.global;
		var session;
		var scheme = this.scheme;

		if (this.wallet) {
			if (scheme && scheme.isRemote()) {
				var wallet = this.wallet;
				var walletschemeuuid = wallet.getSchemeUUID();
				var schemeuuid = scheme.getSchemeUUID();

				if (walletschemeuuid && (walletschemeuuid === schemeuuid)) {
					// card has same session than wallet
					session = wallet._getSession();
				}
			}
			else if (this.uuid) {
				session = this.wallet.cardsessions[this.uuid];
			}

			if (session) {
				this.session = session;
				
				return Promise.resolve(session);
			}

		}
		
		// no session found, we create one
		
		session = await this.scheme.createSchemeSessionObject();
		this.session = session;
			
		this.session.SMARTCARD = this.uuid;
		
		// put in wallet's map to avoid recreating a session for same card uuid
		if (this.wallet) {
			this.wallet.cardsessions[this.uuid] = this.session;
		}
		
		// attach the card session to the wallet session
		// as a child
		var parentsession = this.wallet._getSession();
		
		var clientmodules = global.getModuleObject('clientmodules');
		
		clientmodules.attachChildSessionObject(session, parentsession)

		return session;
	}
	
	async lock() {
		this.locked = true;
		
		return Promise.resolve(true);
	}
	
	async unlock(password) {
		var global = this.global;
		var session = this._getSession();
		
		if (!session) {
			return Promise.reject('card should be initialized before being unlocked');
		}
		
		if (this.wallet.isLocked()) {
			return Promise.reject('ERR_WALLET_LOCKED');
		}

		if (!session.isAnonymous()) {
			this.locked = false;
		}
		else {
			var cardtype = this.getCardType();
			
			switch(cardtype) {
				case CryptoCard.CLIENT_CARD:
					// check that wallet can obtain private key for our address
					var accountaddress = this.address;
					var accountobject = this._getSessionAccountObject();
					
					if (accountobject) {
						await new Promise((resolve, reject) => {
							
							// we impersonate session with wallet's user
							var walletsession = this.wallet._getSession();
							var walletuser = walletsession.getSessionUserObject() 
							
							session.impersonateUser(walletuser);

							// add cryptokeys to session
							var cryptokeys = walletuser.getCryptoKeyObjects();

							for (var i = 0; i < (cryptokeys ? cryptokeys.length : 0); i++) {
								var cryptokey = cryptokeys[i];
								session.addCryptoKeyObject(cryptokey);
							}
							
							this.locked = false;
							
							resolve(true);
						});
					}
					else {
						// we only have the address
						// we unlock the card but mark it as read-only
						this.locked = false;
						this.readonly = true;
					}
					
					break;

				
				case CryptoCard.REMOTE_CARD:
					var _password = password;
					
					if (!_password) {
						if (this.password) {
							// we fill with the password we have in memory
							// (that could have been decrypted from vault)
							_password = this.password;
						}
						else if (this.wallet.getWalletType() == 1) {
							_password = this.wallet.password;
						}
					} 
					
					var username = this.authname;
					
					var authkeymodule = global.getModuleObject('authkey');

					if (!authkeymodule.isActivated()) {
						return Promise.reject('authkey module is not activated');
					}
					else {
						// set scheme config first
						var clientmodules = global.getModuleObject('clientmodules');

						var scheme = this.getScheme();
						var remoteschemeconfig = scheme.getNetworkConfig();
						
						await clientmodules.setSessionNetworkConfig(session, remoteschemeconfig)
						.then((sess) => {
							// then authenticate
							return new Promise((resolve, reject) => { 
								authkeymodule._authenticate(session, username, _password, (err, res) => {
									if (err) {reject(err);}	else {resolve(res);	}
								})
								.catch(err => {
									reject(err);
								});
							});
						})
						.then((authenticated) => {
							this.password = _password; // we note the password
							
							this.locked = false;

							return authenticated;
						});
					}
					break;

					
				default:
					return Promise.reject('card has a wrong type: ' + cardtype);
			}
		}
		
		// signal unlock
		var res = await this._onUnlock()		
		.catch((err) => {
			console.log('Error in CryptoCard.unlock:' + err);
			throw 'ERR_CARD_LOCKED'
		});

		return res;
	}
	
	async _onUnlock() {
		var global = this.global;
		var session = this._getSession();
		
		var cardtype = this.getCardType();
		var unlockpromise;
		
		// we refresh cached information
		await new Promise((resolve, reject) => { 
			// we read session accounts
			session.getSessionAccountObjects(true, (err, res) => {
				if (err) reject(err); else resolve(res);
			});
		});

		return true;
	}
	
	async checkLock() {
		if (this.isLocked()) {
			return Promise.reject('ERR_CARD_LOCKED');
		}

		return true;
	}

	isLocked() {
		if (this.wallet.isLocked())
			return true;
		
		var cardtype = this.getCardType();
	
		switch(cardtype) {
			case CryptoCard.CLIENT_CARD:
				return this.locked;
				
			case CryptoCard.REMOTE_CARD: {
				
				if (this.locked)
				return this.locked;

				// update only every 5s
				var now = Date.now();

				if (this.remotelockchecked && ((now - this.remotelockchecked) < 5000)) {
					return this.locked;
				}

				// check remote
				this.remotelockchecked = now;
				var session = this._getSession();

				if (session.isAnonymous()) {
					this.locked = true;
				}

				return this.locked ;
			}
			
			default:
				return this.locked;
		}
	}
	
	_getAccountObject() {
		var global = this.global;
		var session = this._getSession();

		// create account with card address
		var address = this.getAddress();

		var commonmodule = global.getModuleObject('common');
		
		// get account with this address
		var account = session.getAccountObject(address);
		
		return account;
	}

	async canSign() {
		if (this.readonly === true) {
			return false;
		}

		// look if we can get the privatekey
		var privatekey = await this.exportPrivateKey()
		.catch(err => {
			return false;
		});

		if (privatekey)
			return true
		else
			return false;

	}

	async exportPrivateKey() {
		if (this.isLocked()) {
			return Promise.reject('ERR_CARD_LOCKED');
		}

		var sessionaccount = this._getSessionAccountObject();
		
		if (!sessionaccount) {
			return Promise.reject('ERR_CARD_CANNOT_SIGN');
		}

		var privatekey = sessionaccount.getPrivateKey();

		return privatekey;
	}
	
	_getSessionAccountObject() {
		var global = this.global;
		var session = this._getLocalStorageSession();
		
		// create account with card address
		var address = this.getAddress();

		var commonmodule = global.getModuleObject('common');
		
		// get account with this address
		var account = session.getSessionAccountObject(address);
		
		return account;
	}
	

	async save() {
		var wallet = this.getWallet();
		
		return CryptoCard.saveCard(wallet, this);
	}
	
	// static methods
	static readFromJson(wallet, scheme, cardjson) {
		var walletmodule = wallet.module;
		var Card = walletmodule.Card;

		var authname = cardjson.authname;
		var address = cardjson.address;
		var password = cardjson.password;
		
		var card = new CryptoCard(wallet, scheme, authname, address);
		
		card.password = password;
		
		card.uuid = cardjson.uuid;
		card.label = cardjson.label;
		
		card.xtra_data = (cardjson.xtra_data ? cardjson.xtra_data : {});
		
		return card;
	}

	static async getCardList(wallet, bRefresh) {
		var global = wallet.global;
		var session = wallet._getSession();
		var walletmodule = wallet.module;
		
		var cards = [];
		
		if (wallet.isLocked()) {
			return Promise.reject('ERR_WALLET_LOCKED');
		}
		
		if ( (!bRefresh) || (bRefresh === false)) {
			return Promise.resolve(wallet.cardlist);
		}
		
		var cardarray;
		
		// keep current list within closure
		var oldlist = wallet.cardlist;
		
		// get list of cards
		var Card = global.getModuleClass('wallet', 'CryptoCard');
		var key = 'cryptocards';

		cardarray = wallet.getValue(key);

		
		for (var i = 0; i < (cardarray ? cardarray.length : 0); i++) {
			let cardjson = cardarray[i];
			let scheme = await walletmodule.getSchemeFromUUID(session, cardjson.schemeuuid);
			let card = await Card.readFromJson(wallet, scheme, cardjson);

			if (card) {
				let unlocked = await card.init() // create and set session object
				if (unlocked)
					cards.push(card);
			}
		}

		wallet.cardlist = cards;
			
		return cards;
	}
	
	static async saveCardList(wallet, cards) {
		// get json to save
		var cardsjson = [];
		
		for (var i = 0; i < cards.length; i++) {
			var cardjson = cards[i].getLocalJson();
			
			cardsjson.push(cardjson);
		}
		
		// put in vault under 'cryptocards'
		var key = 'cryptocards';
		
		await wallet.putValue(key, cardsjson);

		wallet.cardlist = cards;
			
		return cards;

	}

	static async saveCard(wallet, card) {
		if (card.isLocked()) {
			return Promise.reject('ERR_CARD_LOCKED');
		}
		
		// we do an non-atomic save
		var cards = await CryptoCard.getCardList(wallet, true);

		if (cards) {
				
			// check if it is in the list
			var bInList = false;
			
			for (var i = 0; i < cards.length; i++) {
				if (card.getCardUUID() == cards[i].getCardUUID()) {
					bInList = true;
					cards[i] = card;
					break;
				}
			}
			
			// add it if it is not
			if (!bInList)
			cards.push(card);
			
			// save list
			await CryptoCard.saveCardList(wallet, cards);
		}
		else {
			return Promise.reject('could not retrieve the list of cards');
		}

		return true;
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
_GlobalClass.registerModuleClass('wallet', 'CryptoCard', CryptoCard);