import * as utils from '../utils.js'
import config from '../config.js';
import https from 'https';
import axios from 'axios';

export const createToken = async function() {
    const [publicKey, privateKey] = utils.getTransportKeys();
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");
    urlencoded.append("scope", "directory:software");
    urlencoded.append("client_id", config.directory.clientId);

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        data: urlencoded,
        redirect: "follow",
        httpsAgent: agent
    };

    try {
        const response = await axios(config.directory.tokenHost, requestOptions);
        return [ response.status == 200, response.data ];
    } catch (error) {
        return [ false, error ];
    }
}

export const createSSA = async function(token) {
    const [publicKey, privateKey] = utils.getTransportKeys();
    
    const agent = new https.Agent({
        cert: publicKey,
        key: privateKey,
        rejectUnauthorized: false
    });

    const requestOptions = {
        method: "GET",
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': `*/*`
          },
        httpsAgent: agent
    };

    try {
        const response = await axios(`${config.directory.assertionHost}/organisations/${config.directory.organisationId}/softwarestatements/${config.directory.softwareStatement.id}/assertion`, requestOptions);
        return [ response.status == 200, response.data ];
    } catch (error) {
        return [ false, error ];
    }
}