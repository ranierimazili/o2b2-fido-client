import * as utils from '../utils.js'
import config from '../config.js';
import https from 'https';
import axios from 'axios';
import { v4 } from "uuid";
import { SignJWT } from "jose";

export const dcr = async function(ssa, registrationEndpoint) {
    const [publicKey, privateKey] = utils.getTransportKeys();
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const data = {
        "grant_types": [
          "authorization_code",
          "implicit",
          "refresh_token",
          "client_credentials"
        ],
        "jwks_uri": `${config.directory.keystoreHost}/${config.directory.organisationId}/${config.directory.softwareStatement.id}/application.jwks`,
        "token_endpoint_auth_method": "private_key_jwt",
        "response_types": [
          "code id_token"
        ],
        "redirect_uris": config.directory.softwareStatement.redirectUris,
        "software_statement": ssa,
        "id_token_signed_response_alg": "PS256",
        "id_token_encrypted_response_alg": "RSA-OAEP",
        "id_token_encrypted_response_enc": "A256GCM",
        "tls_client_certificate_bound_access_tokens": true
      }

    const requestOptions = {
        method: "POST",
        data,
        httpsAgent: agent
    };

	try {
        const response = await axios(registrationEndpoint, requestOptions);
        return [ response.status == 201, response.data ];
    } catch (error) {
        return [ false, error ];
    }
}

export const createCCToken = async function(client, tokenEndpoint) {
	const [publicKey, privateKey] = utils.getTransportKeys();
	const clientAssertion = await createClientAssertion(client, tokenEndpoint);

	const agent = new https.Agent({
		cert: publicKey,
		key: privateKey,
		rejectUnauthorized: false
	});

  	const data = new URLSearchParams();
	data.append("grant_type", "client_credentials");
	data.append("scope", "payments");
	data.append("client_assertion", clientAssertion);
	data.append("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");

	const requestOptions = {
		method: "POST",
		data,
		httpsAgent: agent,
		headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': `*/*`
        },
	};

	try {
        const response = await axios(tokenEndpoint, requestOptions);
        return [ response.status == 200, response.data ];
    } catch (error) {
        return [ false, error ];
    }
}

export const exchangeCode = async function(client, tokenEndpoint, code) {
    const [publicKey, privateKey] = utils.getTransportKeys();
	const clientAssertion = await createClientAssertion(client, tokenEndpoint);

	const agent = new https.Agent({
		cert: publicKey,
		key: privateKey,
		rejectUnauthorized: false
	});

    const data = new URLSearchParams();
	data.append("grant_type", "authorization_code");
	data.append("client_assertion", clientAssertion);
	data.append("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
    data.append("code", code);
    data.append("redirect_uri", client.redirect_uris[0]);
    data.append("code_verifier", "jk24853kjh535308u4h538u53o53805jo3583h59385398453h4583h534853hu853985h39h593");

    const requestOptions = {
		method: "POST",
		data,
		httpsAgent: agent,
		headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': `*/*`
        },
	};

	try {
        const response = await axios(tokenEndpoint, requestOptions);
        return [ response.status == 200, response.data ];
    } catch (error) {
        return [ false, error ];
    }
	
}

export const createRTToken = async function(client, tokenEndpoint) {
	const [publicKey, privateKey] = utils.getTransportKeys();
	const clientAssertion = await createClientAssertion(client, tokenEndpoint);

	const agent = new https.Agent({
		cert: publicKey,
		key: privateKey,
		rejectUnauthorized: false
	});

  	const data = new URLSearchParams();
	data.append("grant_type", "client_credentials");
	data.append("scope", "payments");
	data.append("client_assertion", clientAssertion);
	data.append("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");

	const requestOptions = {
		method: "POST",
		data,
		httpsAgent: agent,
		headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': `*/*`
        },
	};

	try {
		const response = await axios(tokenEndpoint, requestOptions);
		return response.data;
	} catch (e) {
		return e.response.data;
	}
}

export const par = async function(client, parEndpoint, issuer, enrollment, state) {
	const [publicKey, privateKey] = utils.getTransportKeys();
	const clientAssertion = await createClientAssertion(client, parEndpoint);
	const parRequestObject = await createPARRequestObject(client, issuer, enrollment, state);

	const agent = new https.Agent({
		cert: publicKey,
		key: privateKey,
		rejectUnauthorized: false
	});

	const data = new URLSearchParams();
	data.append("request", parRequestObject);
	data.append("client_assertion", clientAssertion);
	data.append("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");

	const requestOptions = {
		method: "POST",
		data,
		httpsAgent: agent,
		headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': `*/*`
        },
	};

	try {
        const response = await axios(parEndpoint, requestOptions);
        return [ response.status == 201, response.data ];
    } catch (error) {
        return [ false, error ];
    }
}

const createPARRequestObject = async function(client, audience, enrollment, state) {
	const signingKey = utils.getPrivateSigningKey();

	const parRequestObject = {
        "response_type": "code id_token",
        "code_challenge_method": "S256",
        "nonce": "S05tH4J105",
        "client_id": client.client_id,
        scope: "openid payments consent:"+enrollment.enrollmentId,
        redirect_uri: config.directory.softwareStatement.redirectUris[0],
        state,
        code_challenge: "s7O3BLoJFer_w_HzH_RpLj-USoWbu_ROqwS0tW2Lmj4"
	}

	let signedRequestBody;
    try {
        signedRequestBody = await new SignJWT(parRequestObject)
        .setProtectedHeader({
          alg: "PS256",
          typ: "JWT",
          kid: config.directory.signingCertKid,
        })
		.setNotBefore(new Date())
        .setIssuedAt()
        .setIssuer(client.client_id)
        .setAudience(audience)
        .setExpirationTime("5m")
        .sign(signingKey);
    } catch (e){
        console.log("Error when trying to sign request body: ", e);
        throw e;
    }

    return signedRequestBody;
}

const createClientAssertion = async function(client, audience) {
	const signingKey = utils.getPrivateSigningKey();

	let signedRequestBody;
    try {
        signedRequestBody = await new SignJWT()
        .setProtectedHeader({
          alg: "PS256",
          typ: "JWT",
          kid: config.directory.signingCertKid,
        })
		.setSubject(client.client_id)
        .setIssuedAt()
        .setIssuer(client.client_id)
        .setJti(v4())
        .setAudience(audience)
        .setExpirationTime("5m")
        .sign(signingKey);
    } catch (e){
        console.log("Error when trying to sign request body: ", e);
        throw e;
    }

    return signedRequestBody;
}