let id;

function getPlatform() {
    // Check if navigator.userAgentData is available
    if (navigator.userAgentData) {
        const isMobile = navigator.userAgentData.mobile;
        const brands = navigator.userAgentData.brands;

        if (isMobile) {
            for (let i = 0; i < brands.length; i++) {
                if (brands[i].brand === 'Android') {
                    return 'ANDROID';
                } else if (brands[i].brand === 'Apple') {
                    return 'IOS';
                }
            }
        } else {
            return 'BROWSER';
        }
    } else {
        // Fallback to userAgent string detection
        const ua = navigator.userAgent || navigator.vendor || window.opera;

        // Check for mobile iOS
        if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
            return 'IOS';
        }

        // Check for mobile Android
        if (/android/i.test(ua)) {
            return 'ANDROID';
        }
    }

    // If none of the conditions match, it is a non-mobile browser
    return 'BROWSER';
}

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters.charAt(randomIndex);
    }
  
    return randomString;
}

function base64UrlSafeToBase64(base64Url) {
    // Replace URL safe characters with Base64 standard characters
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    switch (base64.length % 4) {
        case 2:
            base64 += '==';
            break;
        case 3:
            base64 += '=';
            break;
    }

    return base64;
}

function atobUrlSafe(base64Url) {
    // Convert Base64 URL safe to standard Base64
    const base64 = base64UrlSafeToBase64(base64Url);

    // Use atob to decode
    return atob(base64);
}

const base64ToArrayBuffer = function(base64String) {
    // Step 1: Convert Base64 to binary string
    const binaryString = atobUrlSafe(base64String);

    // Step 2: Create a Uint8Array from the binary string
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }

    // Step 3: Convert Uint8Array to ArrayBuffer
    const arrayBuffer = uint8Array.buffer;

    return arrayBuffer;
}

function getLogContainer() {
    return document.getElementById('logContainer');
}

function enableButton(id) {
    const button = document.getElementById(id);
    if (button) {
        button.removeAttribute('disabled');
    }
}

function disableButton(id) {
    const button = document.getElementById(id);
    if (button) {
        button.setAttribute('disabled', 'true');
    }
}

function scrollToBottom() {
    const logContainer = getLogContainer();
    logContainer.scrollTop = logContainer.scrollHeight;
}

function addLogHeader(text) {
    const p = document.createElement('p');
    p.textContent = text;
    const logContainer = getLogContainer();
    logContainer.appendChild(p);
    
    scrollToBottom();
}

function addLogSubHeader(text) {
    const strong = document.createElement('strong');
    strong.textContent = text;
    
    const pre = document.createElement('pre');
    pre.appendChild(strong);
    
    const logContainer = getLogContainer();
    logContainer.appendChild(pre);
}

function addLogContent(responses) {
    for (var i=0;i<responses.length;i++) {
        addLogSubHeader(responses[i].message);

        const pre = document.createElement('pre');
        pre.textContent = responses[i].details;
        const logContainer = getLogContainer();
        logContainer.appendChild(pre);
    }
    scrollToBottom();
}

function clearLogContent() {
    const logContainer = getLogContainer();
    logContainer.innerHTML = '';
}

async function solicitarAutenticacaoParaVinculo(registrationOptions) {
    const user_name = registrationOptions.user.name;
    const user_display_name = registrationOptions.user.displayName;

    const publicKeyCredentialCreationOptions = {
        challenge: base64ToArrayBuffer(registrationOptions.challenge),
        rp: registrationOptions.rp,
        user: {
            id: Uint8Array.from(
                registrationOptions.user.id, c => c.charCodeAt(0)),
            name: user_name,
            displayName: user_display_name,
        },
        pubKeyCredParams: registrationOptions.pubKeyCredParams,
        authenticatorSelection: registrationOptions.authenticatorSelection,
        timeout: registrationOptions.timeout,
        attestation: registrationOptions.attestation
    };
    
    try {
        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions
        });
        console.log("Usuário autenticado...");
        vincularDispositivoStep3(credential);
        //const fidoRegistrationResponse = await callFidoRegistration(credential);
        //return fidoRegistrationResponse;
    } catch (error) {
        console.log("Erro ao tentar autenticar o usuário", error);
    }
}

async function dcr() {
    id=generateRandomString(10);
    addLogHeader("Executando DCR...");

    try {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: null,
            redirect: 'follow',
            rejectUnauthorized: false
        };

        const response = await fetch('/dcr/'+id, requestOptions);
        const jsonResponse = await response.json();
        addLogContent(jsonResponse);

        enableButton("btnVincularDispositivo");
    } catch (e) {
        addLogContent(e);
    }
}

async function vincularDispositivoStep1() {
    addLogHeader("Executando vínculo de dispositivo...");

    try {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: null,
            redirect: 'follow',
            rejectUnauthorized: false
        };

        const response = await fetch('/vincularDispositivo/step1/'+id, requestOptions);
        const jsonResponse = await response.json();
        addLogContent(jsonResponse);

        window.open(jsonResponse[jsonResponse.length-1].redirect, '_blank');
        vincularDispositivoStep2();
        
    } catch (e) {
        addLogContent(e);
    }
}

async function vincularDispositivoStep2() {
    addLogHeader("Aguardando aprovação do consentimento...");

    try {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: JSON.stringify({ platform: getPlatform() }),
            redirect: 'follow',
            rejectUnauthorized: false
        };

        const response = await fetch('/vincularDispositivo/step2/'+id, requestOptions);
        const jsonResponse = await response.json();
        addLogContent(jsonResponse);

        if (jsonResponse.length == 1 && jsonResponse[0].success == false) {
            setTimeout(vincularDispositivoStep2, 5000);
        } else {
            solicitarAutenticacaoParaVinculo(JSON.parse(jsonResponse[jsonResponse.length-1].details));
        }
    } catch (e) {
        addLogContent(e);
    }
}

async function vincularDispositivoStep3(credential) {
    addLogHeader("Enviando credenciais para o servidor FIDO...");

    /*try {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: null,
            redirect: 'follow',
            rejectUnauthorized: false
        };

        const response = await fetch('/vincularDispositivo/step2/'+id, requestOptions);
        const jsonResponse = await response.json();
        console.log(jsonResponse);
        if (jsonResponse.length == 1 && jsonResponse[0].success == false) {
            //agenda para daqui 5 segundos novamente
            console.log("daqui 5 segundos fazer de novo")
            setTimeout(vincularDispositivoStep2, 5000);
        }
        addLogContent(jsonResponse);
        //console.log(JSON.parse(jsonResponse[jsonResponse.length-1].details));
        solicitarAutenticacaoParaVinculo(JSON.parse(jsonResponse[jsonResponse.length-1].details));
    } catch (e) {
        addLogContent(e);
    }*/
}



async function executarTransacao() {
    addLogHeader("Executando transação...");
}