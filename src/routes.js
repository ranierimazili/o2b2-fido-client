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

//Rotas para receber o authorization_code via callback do detentor
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

//Rotas utilizadas pelo frontend do FIDO Server Test Client
router.post('/dcr/:id', async (req, res) => {
    let directoryToken, ssa, client, success, responses = [];
    
    //Consulta o well-known para utilizar as rotas de token, dcr, par, etc, nas chamadas futuras.
    const openIDDiscoveryDocument = await utils.getOpenIDDiscoveryDocument();
    
    [ success , directoryToken ] = await directory.createToken();
    responses.push(utils.createResponseMessage("Criando access token no diretório...", JSON.stringify(directoryToken, null, 2), success));

    if (success) {
        [success, ssa] = await directory.createSSA(directoryToken.access_token);
        responses.push(utils.createResponseMessage("Criando SSA no diretório...", JSON.stringify(ssa, null, 2), success));
    }

    if (success) {
        [success, client] = await authServer.dcr(ssa, openIDDiscoveryDocument?.mtls_endpoint_aliases?.registration_endpoint || openIDDiscoveryDocument.registration_endpoint);
        responses.push(utils.createResponseMessage("Criando client no authorization server...", JSON.stringify(client, null, 2), success));
    }

    if (client) {
        db.save(req.params.id, {dcr: client});
    }

    res.status(200).send(responses);
});

router.post('/vincularDispositivo/step1/:id', async (req, res) => {
    let ccToken, enrollment, riskSignals, par, success, responses = []; 
    
    const data = db.get(req.params.id);
    const client = data.dcr;

    //Consulta o well-known para utilizar as rotas de token, dcr, par, etc, nas chamadas futuras.
    const openIDDiscoveryDocument = await utils.getOpenIDDiscoveryDocument();

    [ success , ccToken ] = await authServer.createCCToken(client, openIDDiscoveryDocument?.mtls_endpoint_aliases?.token_endpoint || openIDDiscoveryDocument.token_endpoint);
    responses.push(utils.createResponseMessage("Criando token client credentials no authorization server...", JSON.stringify(ccToken, null, 2), success));

    if (success) {
        [ success , enrollment ] = await paymentApis.createEnrollment(ccToken.access_token);
        responses.push(utils.createResponseMessage("Criando enrollment...", JSON.stringify(enrollment, null, 2), success));
    }
    
    if (success) {
        [ success , riskSignals ] = await paymentApis.sendRiskSignals(ccToken.access_token, enrollment);
        responses.push(utils.createResponseMessage("Enviando sinais de risco...", JSON.stringify(riskSignals, null, 2), success));
    }

    if (success) {
        [ success , par ] = await authServer.par(client, openIDDiscoveryDocument?.mtls_endpoint_aliases?.pushed_authorization_request_endpoint || openIDDiscoveryDocument.pushed_authorization_request_endpoint, openIDDiscoveryDocument.issuer, enrollment, req.params.id);
        responses.push(utils.createResponseMessage("Chamando endpoint PAR no authorization server...", JSON.stringify(par, null, 2), success, `${openIDDiscoveryDocument.authorization_endpoint}?client_id=${client.client_id}&request_uri=${par.request_uri}`));
    }

    if (enrollment) {
        data.enrollment = enrollment;
        db.save(req.params.id, data);
    }
    
    res.status(200).send(responses);
    
});

router.post('/vincularDispositivo/step2/:id', async (req, res) => {
    let data = db.get(req.params.id);
    
    if (!data?.callback) {
        res.status(200).send([{ message: "Code ainda não enviado... Tentando novamente em 5 segundos...", details: '', success: false }]);
    } else {
        //Consulta o well-known para utilizar as rotas de token, dcr, par, etc, nas chamadas futuras.
        const openIDDiscoveryDocument = await utils.getOpenIDDiscoveryDocument();
        
        let rtToken, fidoRegistratrationOptions, success, responses = [];
        
        [ success , rtToken ] = await authServer.exchangeCode(data.dcr, openIDDiscoveryDocument?.mtls_endpoint_aliases?.token_endpoint || openIDDiscoveryDocument.token_endpoint, data.callback.code);
        responses.push(utils.createResponseMessage("Trocando code por refresh_token no authorization server...", JSON.stringify(rtToken, null, 2), success));

        if (success) {
            [ success , fidoRegistratrationOptions ] = await paymentApis.getFidoRegistrationOptions(rtToken.access_token, data.enrollment, req.body.platform);
            responses.push(utils.createResponseMessage("Obtendo FIDO registration options...", JSON.stringify(fidoRegistratrationOptions, null, 2), success));
        }

        data.refresh_token = rtToken;
        db.save(req.params.id, data);
        
        res.status(200).send(responses);
    }
});

//Fazer este método para mandar o fido registration para o servidor fido
router.post('/vincularDispositivo/step3/:id', async (req, res) => {
    let data = db.get(req.params.id);
    let success, rtToken, fidoRegistratration, responses = [];

    //Consulta o well-known para utilizar as rotas de token, dcr, par, etc, nas chamadas futuras.
    const openIDDiscoveryDocument = await utils.getOpenIDDiscoveryDocument();

    [ success , rtToken ] = await authServer.createRTToken(data.dcr, openIDDiscoveryDocument?.mtls_endpoint_aliases?.token_endpoint || openIDDiscoveryDocument.token_endpoint, data.refresh_token.refresh_token);
    responses.push(utils.createResponseMessage("Obtendo refresh_token no authorization server...", JSON.stringify(rtToken, null, 2), success));

    if (success) {
        [ success , fidoRegistratration ] = await paymentApis.createFidoRegistration(rtToken.access_token, data.enrollment, req.body);
        responses.push(utils.createResponseMessage("Registrando dispositivo no servidor FIDO...", JSON.stringify(fidoRegistratration, null, 2), success));
    }
    
    res.status(200).send(responses);
});

//Fazer este método para mandar o fido registration para o servidor fido
router.post('/pagamento/step1/:id', async (req, res) => {
    let data = db.get(req.params.id);
    let success, ccToken, paymentConsent, fidoSignOptions, responses = [];
    const client = data.dcr;
    const enrollment = data.enrollment;

    //Consulta o well-known para utilizar as rotas de token, dcr, par, etc, nas chamadas futuras.
    const openIDDiscoveryDocument = await utils.getOpenIDDiscoveryDocument();

    [ success , ccToken ] = await authServer.createCCToken(client, openIDDiscoveryDocument?.mtls_endpoint_aliases?.token_endpoint || openIDDiscoveryDocument.token_endpoint);
    responses.push(utils.createResponseMessage("Criando token client credentials no authorization server...", JSON.stringify(ccToken, null, 2), success));

    if (success) {
        [ success , paymentConsent ] = await paymentApis.createPaymentConsent(ccToken.access_token);
        responses.push(utils.createResponseMessage("Criando consentimento de pagamento...", JSON.stringify(paymentConsent, null, 2), success));
    }

    //FIDO sign options
    if (success) {
        [ success , fidoSignOptions ] = await paymentApis.getFidoSignOptions(ccToken.access_token, enrollment, req.body.platform);
        responses.push(utils.createResponseMessage("Obtendo FIDO Sign Options no servidor FIDO...", JSON.stringify(fidoSignOptions, null, 2), success));
    }

    data.paymentConsent = paymentConsent;
    data.fidoSignOptions = fidoSignOptions;

    db.save(req.params.id, data);

    res.status(200).send(responses);
});

router.post('/pagamento/step2/:id', async (req, res) => {
    let data = db.get(req.params.id);
    let success, rtToken, authoriseConsent, responses = [];
    //const client = data.dcr;
    const enrollment = data.enrollment;
    const paymentConsent = data.paymentConsent;

    //Consulta o well-known para utilizar as rotas de token, dcr, par, etc, nas chamadas futuras.
    const openIDDiscoveryDocument = await utils.getOpenIDDiscoveryDocument();

    [ success , rtToken ] = await authServer.createRTToken(data.dcr, openIDDiscoveryDocument?.mtls_endpoint_aliases?.token_endpoint || openIDDiscoveryDocument.token_endpoint, data.refresh_token.refresh_token);
    responses.push(utils.createResponseMessage("Obtendo refresh_token no authorization server...", JSON.stringify(rtToken, null, 2), success));

    if (success) {
        [ success , authoriseConsent ] = await paymentApis.authoriseConsent(rtToken.access_token, enrollment, paymentConsent, req.body.fidoAssertion);
        responses.push(utils.createResponseMessage("Autorizando consentimento de pagamento...", JSON.stringify(authoriseConsent, null, 2), success));
    }

    res.status(200).send(responses);
});

export default router;