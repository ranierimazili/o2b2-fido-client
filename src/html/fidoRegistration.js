let regId;
const urls = {
    fidoRegistrationOptions: 'https://fido2-client.ranieri.dev.br/fido-server/fido-registration-options',
    fidoRegistration: 'https://fido2-client.ranieri.dev.br/fido-server/fido-registration',
    fidoSignOptions: 'https://fido2-client.ranieri.dev.br/fido-server/fido-sign-options',
    fidoSign: 'https://fido2-client.ranieri.dev.br/fido-server/fido-sign'
}

const callFidoRegistrationOptions = async function() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    regId = "RegistrationId_"+Math.floor(Math.random()*100000);
    const rp_id = document.getElementById("rp_id").value;
    const rp_name = document.getElementById("rp_name").value;
    const origin = document.getElementById("resultContainerOrigin").innerText;
    const platform = navigator.userAgentData.mobile ? 'ANDROID' : 'BROWSER';
    
    const reqObj = {
        id: regId,
        rp : {
            id: rp_id,
            name: rp_name
        },
        platform: platform,
        origin: origin
    };

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(reqObj),
        redirect: 'follow'
    };

    console.log("REQUEST - Fido Registration Options");
    console.log(reqObj);

    const response = await fetch(urls.fidoRegistrationOptions, requestOptions)
    const jsonResponse = await response.json();
    
    console.log("RESPONSE - Fido Registration Options");
    console.log(jsonResponse);

    return jsonResponse;
}

const callFidoRegistration = async function(credential) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const parsedCredential = {
        id: credential.id, //pode remover esta linha
        rawId: arrayBufferToBase64url(credential.rawId), //Porque base64 url? e não apenas base64
        response: {
            attestationObject: arrayBufferToBase64url(credential.response.attestationObject),
            clientDataJSON: arrayBufferToBase64url(credential.response.clientDataJSON),
            type: "public-key"
        }
    }

    var reqObj = {
        id: regId,
        attestationResult: parsedCredential
    };

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(reqObj),
        redirect: 'follow'
    };

    console.log("REQUEST - Fido Registration");
    console.log(reqObj);

    const response = await fetch(urls.fidoRegistration, requestOptions)
    
    console.log("RESPONSE - Fido Registration");
    console.log(response);

    return response;
}

const callFidoSignOption = async function() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const platform = navigator.userAgentData.mobile ? 'ANDROID' : 'BROWSER';

    var reqObj = {
        id: regId,
        platform: platform
    };

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(reqObj),
        redirect: 'follow'
    };

    console.log("REQUEST - Fido Sign Options");
    console.log(reqObj);

    const response = await fetch(urls.fidoSignOptions, requestOptions)
    const jsonResponse = await response.json();
    
    console.log("RESPONSE - Fido Sign Options");
    console.log(jsonResponse);

    return jsonResponse;

}

const callFidoSign = async function(credential) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const reqObj = {
        id: regId,
        assertion: {
            rawId: arrayBufferToBase64url(credential.rawId),
            response: {
                authenticatorData: arrayBufferToBase64url(credential.response.authenticatorData),
                clientDataJSON: arrayBufferToBase64url(credential.response.clientDataJSON),
                signature: arrayBufferToBase64url(credential.response.signature)
            },
            type: credential.type
        }
    }

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(reqObj),
        redirect: 'follow'
    };

    console.log("REQUEST - Fido Sign Options");
    console.log(reqObj);

    const response = await fetch(urls.fidoSign, requestOptions)
    const jsonResponse = await response.json();
    
    console.log("RESPONSE - Fido Sign Options");
    console.log(jsonResponse);

    return jsonResponse;

}

const arrayBufferToBase64url = function(arrayBuffer) {
    // Step 1: Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);

    // Step 2: Encode Uint8Array to Base64
    const base64 = btoa(String.fromCharCode.apply(null, uint8Array));

    // Step 3: Make Base64 URL-safe
    const base64url = base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return base64url;
}

const base64ToArrayBuffer = function(base64String) {
    console.log("Convertendo ", base64String);
    // Step 1: Convert Base64 to binary string
    const binaryString = atob(base64String);

    // Step 2: Create a Uint8Array from the binary string
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }

    // Step 3: Convert Uint8Array to ArrayBuffer
    const arrayBuffer = uint8Array.buffer;

    return arrayBuffer;
}

const authenticate = async function() {
    const fidoSignOptionsResponse = await callFidoSignOption();
    
    const publicKeyCredentialRequestOptions = {...fidoSignOptionsResponse};
    publicKeyCredentialRequestOptions.challenge = base64ToArrayBuffer(publicKeyCredentialRequestOptions.challenge);
    publicKeyCredentialRequestOptions.allowCredentials[0].id = base64ToArrayBuffer(publicKeyCredentialRequestOptions.allowCredentials[0].id)

    const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
    });

    console.log("authentication credential", credential)

    const fidoSignResponse = await callFidoSign(credential);
}

const register = async function() {
    const fidoRegistrationOptionsResponse = await callFidoRegistrationOptions();

    const user_name = document.getElementById("user_name").value;
    const user_display_name = document.getElementById("user_display_name").value;
    
    const publicKeyCredentialCreationOptions = {
        challenge: base64ToArrayBuffer(fidoRegistrationOptionsResponse.challenge),
        rp: fidoRegistrationOptionsResponse.rp,
        user: {
            id: Uint8Array.from(
                fidoRegistrationOptionsResponse.user.id, c => c.charCodeAt(0)),
            name: user_name,
            displayName: user_display_name,
        },
        pubKeyCredParams: fidoRegistrationOptionsResponse.pubKeyCredParams,
        authenticatorSelection: fidoRegistrationOptionsResponse.authenticatorSelection,
        timeout: fidoRegistrationOptionsResponse.timeout,
        attestation: fidoRegistrationOptionsResponse.attestation
    };
    
    const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
    });

    console.log("registration credential", credential)
    
    const fidoRegistrationResponse = await callFidoRegistration(credential);
}
