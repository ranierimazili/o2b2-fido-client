import * as utils from '../utils.js'
import config from '../config.js';
import https from 'https';
import axios from 'axios';
import { v4 } from "uuid";
import { decodeJwt } from 'jose';


export const createEnrollment = async function(token) {
    const [publicKey, privateKey] = utils.getTransportKeys();
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const data = {
        "data": {
          "loggedUser": {
            "document": {
              "identification": "11111111111",
              "rel": "CPF"
            }
          },
          "permissions": [
            "PAYMENTS_INITIATE"
          ],
          "debtorAccount": {
            "ispb": "12345678",
            "issuer": "1774",
            "number": "1234567890",
            "accountType": "CACC"
          }
        }
    }

    const endpoint = `${config.paymentApiHostPrefix}/open-banking/enrollments/v1/enrollments`;
    const signedData = await utils.signPayload(data, endpoint);

    const requestOptions = {
        method: "POST",
        data: signedData,
        httpsAgent: agent,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/jwt',
            'Accept': `*/*`,
            'x-fapi-interaction-id': v4(),
            'x-idempotency-key': v4()
        },
    };

    try {
        const response = await axios(endpoint, requestOptions);
        return [ response.status == 201, decodeJwt(response.data).data ];
    } catch (error) {
        return [ false, error ];
    }
}

export const sendRiskSignals = async function(token, enrollment) {
    const [publicKey, privateKey] = utils.getTransportKeys();
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const data = {
        "data": {
            "deviceId": "string",
            "isRootedDevice": true,
            "screenBrightness": 0,
            "elapsedTimeSinceBoot": 0,
            "osVersion": "string",
            "userTimeZoneOffset": "-03",
            "language": "pt",
            "screenDimensions": {
                "height": 0,
                "width": 0
            },
            "accountTenure": "2023-09-01T00:00:00.000Z",
            "geolocation": {
                "latitude": 0,
                "longitude": 0,
                "type": "COARSE"
            },
            "isCallInProgress": true,
            "isDevModeEnabled": true,
            "isMockGPS": true,
            "isEmulated": true,
            "isMonkeyRunner": true,
            "isCharging": true,
            "antennaInformation": "string",
            "isUsbConnected": true,
            "integrity": {
                "appRecognitionVerdict": "string",
                "deviceRecognitionVerdict": "string"
            }
        }
    }

    const endpoint = `${config.paymentApiHostPrefix}/open-banking/enrollments/v1/enrollments/${enrollment.enrollmentId}/risk-signals`;
    const signedData = await utils.signPayload(data, endpoint);

    const requestOptions = {
        method: "POST",
        data: signedData,
        httpsAgent: agent,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/jwt',
            'Accept': `*/*`,
            'x-fapi-interaction-id': v4(),
            'x-idempotency-key': v4()
        },
    };

    try {
        const response = await axios(endpoint, requestOptions);
        return [ response.status == 204, null ];
    } catch (error) {
        return [ false, error ];
    }
}

export const getFidoRegistrationOptions = async function(token, enrollment, platform) {
    const [publicKey, privateKey] = utils.getTransportKeys();
    const subject = utils.getSubjectFromCert(publicKey);
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const data = {
        "data": {
            "rp": subject,
            platform
        }
    }

    const endpoint = `${config.paymentApiHostPrefix}/open-banking/enrollments/v1/enrollments/${enrollment.enrollmentId}/fido-registration-options`;
    const signedData = await utils.signPayload(data, endpoint);

    const requestOptions = {
        method: "POST",
        data: signedData,
        httpsAgent: agent,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/jwt',
            'Accept': `*/*`,
            'x-fapi-interaction-id': v4(),
            'x-idempotency-key': v4()
        },
    };

    try {
        const response = await axios(endpoint, requestOptions);
        return [ response.status == 201, decodeJwt(response.data).data ];
    } catch (error) {
        return [ false, error ];
    }
}

export const createFidoRegistration = async function(token, enrollment, fidoRegistratration) {
    const [publicKey, privateKey] = utils.getTransportKeys();
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const data = {
        "data": fidoRegistratration
    }

    const endpoint = `${config.paymentApiHostPrefix}/open-banking/enrollments/v1/enrollments/${enrollment.enrollmentId}/fido-registration`;
    const signedData = await utils.signPayload(data, endpoint);

    const requestOptions = {
        method: "POST",
        data: signedData,
        httpsAgent: agent,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/jwt',
            'Accept': `*/*`,
            'x-fapi-interaction-id': v4(),
            'x-idempotency-key': v4()
        },
    };

    try {
        const response = await axios(endpoint, requestOptions);
        return [ response.status == 204, "Registro realizado com sucesso" ];
    } catch (error) {
        return [ false, error ];
    }
}

export const createPaymentConsent = async function(token) {
    const [publicKey, privateKey] = utils.getTransportKeys();
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const data = {
        "data": {
            "loggedUser": {
                "document": {
                    "identification": "11111111111",
                    "rel": "CPF"
                }
            },
            "creditor": {
                "personType": "PESSOA_NATURAL",
                "cpfCnpj": "58764789000137",
                "name": "Marco Antonio de Brito"
            },
            "payment": {
                "type": "PIX",
                "date": "2021-01-01",
                "currency": "BRL",
                "amount": "100000.12",
                "ibgeTownCode": "5300108",
                "details": {
                    "localInstrument": "DICT",
                    "proxy": "12345678901",
                    "creditorAccount": {
                        "ispb": "12345678",
                        "issuer": "1774",
                        "number": "1234567890",
                        "accountType": "CACC"
                    }
                }
            },
            "debtorAccount": {
                "ispb": "12345678",
                "issuer": "1774",
                "number": "1234567890",
                "accountType": "CACC"
            }
        }
    };

    const endpoint = `${config.paymentApiHostPrefix}/open-banking/payments/v3/consents`;
    const signedData = await utils.signPayload(data, endpoint);

    const requestOptions = {
        method: "POST",
        data: signedData,
        httpsAgent: agent,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/jwt',
            'Accept': `*/*`,
            'x-fapi-interaction-id': v4(),
            'x-idempotency-key': v4()
        },
    };

    try {
        const response = await axios(endpoint, requestOptions);
        return [ response.status == 201, decodeJwt(response.data).data ];
    } catch (error) {
        return [ false, error ];
    }
}

export const getFidoSignOptions = async function(token, enrollment, platform) {
    const [publicKey, privateKey] = utils.getTransportKeys();
    const subject = utils.getSubjectFromCert(publicKey);
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const data = {
        "data": {
            "rp": subject,
            platform
        }
    }

    const endpoint = `${config.paymentApiHostPrefix}/open-banking/enrollments/v1/enrollments/${enrollment.enrollmentId}/fido-sign-options`;
    const signedData = await utils.signPayload(data, endpoint);

    const requestOptions = {
        method: "POST",
        data: signedData,
        httpsAgent: agent,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/jwt',
            'Accept': `*/*`,
            'x-fapi-interaction-id': v4(),
            'x-idempotency-key': v4()
        },
    };

    try {
        const response = await axios(endpoint, requestOptions);
        return [ response.status == 201, decodeJwt(response.data).data ];
    } catch (error) {
        return [ false, error ];
    }
}

export const authoriseConsent = async function(token, enrollment, paymentConsent, fidoAssertion) {
    const [publicKey, privateKey] = utils.getTransportKeys();
    //const subject = utils.getSubjectFromCert(publicKey);
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const data = {
        "data": {
          "enrollmentId": enrollment.enrollmentId,
          "riskSignals": {
            "deviceId": "fakeId",
            "isRootedDevice": false,
            "screenBrightness": 0,
            "elapsedTimeSinceBoot": 0,
            "osVersion": "1.0",
            "userTimeZoneOffset": "-03",
            "language": "pt",
            "screenDimensions": {
              "height": 0,
              "width": 0
            },
            "accountTenure": "2023-09-01T00:00:00.000Z",
            "geolocation": {
              "latitude": 0,
              "longitude": 0,
              "type": "COARSE"
            },
            "isCallInProgress": true,
            "isDevModeEnabled": true,
            "isMockGPS": true,
            "isEmulated": true,
            "isMonkeyRunner": true,
            "isCharging": true,
            "antennaInformation": "string",
            "isUsbConnected": true,
            "integrity": {
              "appRecognitionVerdict": "string",
              "deviceRecognitionVerdict": "string"
            }
          },
          fidoAssertion
        }
      }

    const endpoint = `${config.paymentApiHostPrefix}/open-banking/enrollments/v1/consents/${paymentConsent.consentId}/authorise`;
    const signedData = await utils.signPayload(data, endpoint);

    const requestOptions = {
        method: "POST",
        data: signedData,
        httpsAgent: agent,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/jwt',
            'Accept': `*/*`,
            'x-fapi-interaction-id': v4(),
            'x-idempotency-key': v4()
        },
    };

    try {
        const response = await axios(endpoint, requestOptions);
        return [ response.status == 204, "Consentimento autorizado" ];
    } catch (error) {
        return [ false, error ];
    }
}