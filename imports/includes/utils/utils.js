class Utils {
	static _getBufferClass() {
		var _Buffer;
		try {
			if (typeof window !== 'undefined' && typeof window.Buffer !== 'undefined') {
				_Buffer = window.Buffer;
			} else {
				_Buffer = require('buffer').Buffer;
			}
		} catch (e) {
		}
		
		return _Buffer;
	}

	static toBuffer(str, type) {
		const _Buffer = Utils._getBufferClass();

		if (type)
		return _Buffer.from(str, type);
		else
		return _Buffer.from(str);
	}

	static hash256(str) {
		const CryptoJS = require('crypto-js');
		const _Buffer = Utils._getBufferClass();

		let hash   = CryptoJS.SHA256(str);
		let buffer = _Buffer.from(hash.toString(CryptoJS.enc.Hex), 'hex');
		let array  = new Uint8Array(buffer);

		return buffer.toString('hex');
	}

	static encodebase64(str) {
		const _Buffer = Utils._getBufferClass();
		return _Buffer.from(str).toString('base64');
	}

	static encodebase64url(str) {
		const jose = require('jose');
		return jose.base64url.encode(str);
	}

	static decodebase64(b64) {
		const _Buffer = Utils._getBufferClass();
		return _Buffer.from(b64, 'base64').toString('utf8');
	}

	static decodebase64url(b64url) {
		const jose = require('jose');
		return jose.base64url.decode(b64url);
	}

	static encodehex(str) {
		const _Buffer = Utils._getBufferClass();
		return '0x' + _Buffer.from(str).toString('hex');
	}

	static decodehex(hex) {
		const _Buffer = Utils._getBufferClass();
		return _Buffer.from(hex, 'hex').toString('utf8');
	}

	static encodebase58btc(str, input_encoding) {
		const _Buffer = Utils._getBufferClass();
		var str_buf;
		var b58_str;
		
		if (input_encoding == 'hex')
		str_buf = _Buffer.from(str, 'hex');
		else
		str_buf = _Buffer.from(str);

/* 		const multiformats = require('multiformats');
		const base58btc = multiformats.base58btc;

		b58_str = base58btc.encode(new Uint8Array(str_buf)); */

 		const multibase = require('multibase');
		var b58_uint8rray =  multibase.encode('base58btc',str_buf);
		b58_str = _Buffer.from(b58_uint8rray).toString('utf8');

		return b58_str;
	}

	static decodebase58btc(b58btc, output_encoding) {
		const _Buffer = Utils._getBufferClass();

		var b58_str;

 		const multibase = require('multibase');
		var b58_uint8rray =  multibase.decode(b58btc);


/* 		const multiformats = require('multiformats');  // eslint-disable-line
		const base58btc = multiformats.base58btc;

		var b58_uint8rray = base58btc.decode(b58btc); */

		if (output_encoding)
		b58_str = _Buffer.from(b58_uint8rray).toString(output_encoding);
		else
		b58_str = _Buffer.from(b58_uint8rray).toString('utf8'); 

		return b58_str;
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
_GlobalClass.registerModuleClass('crypto-did', 'Utils', Utils);
