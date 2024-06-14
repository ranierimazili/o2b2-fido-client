import { SignJWT } from "jose";
import { createPrivateKey } from 'crypto';
import fs from 'fs';
import config from "./config.js";
import { v4 } from "uuid";
import { X509Certificate } from 'node:crypto';

export const getSubjectFromCert = function(pemCert) {
    const x509Cert = new X509Certificate(pemCert, 'base64');
    return x509Cert.subject.split('\n').join(',');
}

export const createResponseMessage = function(message, details, success, redirect = undefined) {
    return { message, details, success, redirect };
}

export const getPrivateSigningKey = function getPrivateSigningKey() {
    const signingKey = fs.readFileSync('./src/certs/signing.key');
    const key = createPrivateKey(signingKey);
    return key;
}

export const getTransportKeys = function() {
    const publicKey = fs.readFileSync('./src/certs/transport.pem', 'utf-8');
    const privateKey = fs.readFileSync('./src/certs/transport.key', 'utf-8');
    return [ publicKey, privateKey];
}

export const signPayload = async function (requestBody, audience) {
    const key = getPrivateSigningKey();

    let signedRequestBody;
    try {
        signedRequestBody = await new SignJWT(requestBody)
        .setProtectedHeader({
          alg: "PS256",
          typ: "JWT",
          kid: config.directory.signingCertKid,
        })
        .setIssuedAt()
        .setIssuer(config.directory.organisationId)
        .setJti(v4())
        .setAudience(audience)
        .setExpirationTime("5m")
        .sign(key);
    } catch (e){
        console.log("Error when trying to sign request body: ", e);
        throw e;
    }

    return signedRequestBody;
}

export const getOpenIDDiscoveryDocument = async function() {
    const requestOptions = {
        redirect: 'follow',
        rejectUnauthorized: false
    };

    const response = await fetch(config.openIDDiscoveryDocumentEndpoint, requestOptions);
    const jsonResponse = await response.json();

    return jsonResponse;
}