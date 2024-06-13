import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as utils from './utils.js';
import * as directory from './conn/directory.js';
import * as authServer from './conn/authorization_server.js';
import * as paymentApis from './conn/payment_apis.js';
import MemoryAdapter from './persistence.js';

const router = express.Router();
const db = new MemoryAdapter();

//Rotas para servirem o conteúdo estático (dentro da pasta web)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
router.use(express.static(path.join(__dirname, 'web')));
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/web/index.html'));
});
router.get('/cb', (req, res) => {
    res.sendFile(path.join(__dirname, '/web/cb.html'));
});

router.post('/cb', async (req, res) => {
    if (req.body.state) {
        let data = db.get(req.body.state);
        data.callback = req.body;
        db.save(req.body.state, data);
    }
    res.status(200).send();
});

router.post('/dcr/:id', async (req, res) => {
    //Consulta o well-known para utilizar as rotas de token, dcr, par, etc, nas chamadas futuras.
    const openIDDiscoveryDocument = await utils.getOpenIDDiscoveryDocument();
    
    let responses = []; 
    let tmpResponse;
    let directoryToken, ssa, client;

    tmpResponse = {};
    try {
        tmpResponse.message = "Criando access token no diretório...";
        directoryToken = await directory.createToken();
        tmpResponse.details = JSON.stringify(directoryToken, null, 2);
        tmpResponse.success = true;
        responses.push({...tmpResponse});
    } catch (e) {
        tmpResponse.details = e.toString();
        tmpResponse.success = false;
        responses.push({...tmpResponse});
        res.status(200).send(responses);
        return;
    }

    tmpResponse = {};
    try {
        tmpResponse.message = "Criando SSA no diretório...";
        ssa = await directory.createSSA(directoryToken.access_token);
        tmpResponse.details = ssa;
        tmpResponse.success = true;
        responses.push({...tmpResponse});
    } catch (e) {
        tmpResponse.details = e.toString();
        tmpResponse.success = false;
        responses.push({...tmpResponse});
        res.status(200).send(responses);
        return;
    }

    tmpResponse = {};
    try {
        tmpResponse.message = "Criando client no authorization server...";
        client = await authServer.dcr(ssa, openIDDiscoveryDocument?.mtls_endpoint_aliases?.registration_endpoint || openIDDiscoveryDocument.registration_endpoint);
        tmpResponse.details = JSON.stringify(client, null, 2);
        tmpResponse.success = true;
        responses.push({...tmpResponse});
    } catch (e) {
        tmpResponse.details = e.toString();
        tmpResponse.success = false;
        responses.push({...tmpResponse});
        res.status(200).send(responses);
        return;
    }

    res.status(200).send(responses);
    db.save(req.params.id, {dcr: client});
});

router.post('/vincularDispositivo/step1/:id', async (req, res) => {
    //Consulta o well-known para utilizar as rotas de token, dcr, par, etc, nas chamadas futuras.
    const openIDDiscoveryDocument = await utils.getOpenIDDiscoveryDocument();
    
    const data = db.get(req.params.id);
    const client = data.dcr;

    let responses = []; 
    let tmpResponse;
    let ccToken, enrollment, riskSignals, par;

    tmpResponse = {};
    try {
        tmpResponse.message = "Criando token client credentials no authorization server...";
        ccToken = await authServer.createCCToken(client, openIDDiscoveryDocument?.mtls_endpoint_aliases?.token_endpoint || openIDDiscoveryDocument.token_endpoint);
        tmpResponse.details = JSON.stringify(ccToken, null, 2);
        tmpResponse.success = true;
        responses.push({...tmpResponse});
    } catch (e) {
        tmpResponse.details = e.toString();
        tmpResponse.success = false;
        responses.push({...tmpResponse});
        res.status(200).send(responses);
        return;
    }

    tmpResponse = {};
    try {
        tmpResponse.message = "Criando enrollment...";
        enrollment = await paymentApis.createEnrollment(ccToken.access_token);
        tmpResponse.details = JSON.stringify(enrollment, null, 2);
        tmpResponse.success = true;
        responses.push({...tmpResponse});
    } catch (e) {
        tmpResponse.details = e.toString();
        tmpResponse.success = false;
        responses.push({...tmpResponse});
        res.status(200).send(responses);
        return;
    }

    tmpResponse = {};
    try {
        tmpResponse.message = "Enviando sinais de risco...";
        riskSignals = await paymentApis.sendRiskSignals(ccToken.access_token, enrollment);
        tmpResponse.details = "";
        tmpResponse.success = true;
        responses.push({...tmpResponse});
    } catch (e) {
        tmpResponse.details = e.toString();
        tmpResponse.success = false;
        responses.push({...tmpResponse});
        res.status(200).send(responses);
        return;
    }

    tmpResponse = {};
    try {
        tmpResponse.message = "Realizando chamada PAR...";
        par = await authServer.par(client, openIDDiscoveryDocument?.mtls_endpoint_aliases?.pushed_authorization_request_endpoint || openIDDiscoveryDocument.pushed_authorization_request_endpoint, openIDDiscoveryDocument.issuer, enrollment, req.params.id);
        tmpResponse.details = JSON.stringify(par, null, 2);
        tmpResponse.success = true;
        tmpResponse.redirect = `${openIDDiscoveryDocument.authorization_endpoint}?client_id=${client.client_id}&request_uri=${par.request_uri}`;
        responses.push({...tmpResponse});
    } catch (e) {
        tmpResponse.details = e.toString();
        tmpResponse.success = false;
        responses.push({...tmpResponse});
        res.status(200).send(responses);
        return;
    }

    data.enrollment = enrollment;
    db.save(req.params.id, data);
    res.status(200).send(responses);
    
});

router.post('/vincularDispositivo/step2/:id', async (req, res) => {
    
    let responses = []; 
    let data = db.get(req.params.id);
    if (!data?.callback) {
        res.status(200).send([{
            message: "Code ainda não enviado... Tentando novamente em 5 segundos...",
            details: '',
            success: false
        }]);
    } else {
        //Consulta o well-known para utilizar as rotas de token, dcr, par, etc, nas chamadas futuras.
        const openIDDiscoveryDocument = await utils.getOpenIDDiscoveryDocument();
        let rtToken, fidoRegistratrationOptions;
        let tmpResponse = {};
        
        try {
            tmpResponse.message = "Trocando code por refresh_token no authorization server...";
            rtToken = await authServer.exchangeCode(data.dcr, openIDDiscoveryDocument?.mtls_endpoint_aliases?.token_endpoint || openIDDiscoveryDocument.token_endpoint, data.callback.code);
            tmpResponse.details = JSON.stringify(rtToken, null, 2);
            tmpResponse.success = true;
            responses.push({...tmpResponse});
        } catch (e) {
            tmpResponse.details = e.toString();
            tmpResponse.success = false;
            responses.push({...tmpResponse});
            res.status(200).send(responses);
            return;
        }

        //obter fido registration options
        tmpResponse = {};
        try {
            tmpResponse.message = "Obtendo FIDO registration options...";
            fidoRegistratrationOptions = await paymentApis.getFidoRegistrationOptions(rtToken.access_token, data.enrollment);
            tmpResponse.details = JSON.stringify(fidoRegistratrationOptions, null, 2);
            tmpResponse.success = true;
            responses.push({...tmpResponse});
        } catch (e) {
            tmpResponse.details = e.toString();
            tmpResponse.success = false;
            responses.push({...tmpResponse});
            res.status(200).send(responses);
            return;
        }
        res.status(200).send(responses);
    }
});

export default router;