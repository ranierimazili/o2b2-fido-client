import 'dotenv/config'

export default {
    serverPort: process.env.SERVER_PORT || 4100,
    openIDDiscoveryDocumentEndpoint: process.env.OPENID_DISCOVERY_ENDPOINT,
    paymentApiHostPrefix: process.env.PAYMENT_API_HOST_PREFIX,
    directory: {
        tokenHost: process.env.DIRECTORY_ENV == 'sandbox' ? 'https://matls-auth.sandbox.directory.openbankingbrasil.org.br/token' : 'https://matls-auth.directory.openbankingbrasil.org.br/token',
        assertionHost: process.env.DIRECTORY_ENV == 'sandbox' ? 'https://matls-auth.sandbox.directory.openbankingbrasil.org.br' : 'https://matls-auth.directory.openbankingbrasil.org.br',
        keystoreHost: process.env.DIRECTORY_ENV == 'sandbox' ? 'https://keystore.sandbox.directory.openbankingbrasil.org.br' : 'https://keystore.directory.openbankingbrasil.org.br',
        clientId: process.env.DIRECTORY_CLIENT_ID,
        organisationId: process.env.DIRECTORY_ORGANISATION_ID,
        softwareStatement: { 
            id: process.env.DIRECTORY_SOFTWARE_STATEMENT_ID,
            redirectUris: process.env.DIRECTORY_SOFTWARE_STATEMENT_REDIRECT_URIS.split(',')
        },
        signingCertKid: process.env.DIRECTORY_SIGNING_CERT_KID
    },
    /*instrospection: {
        url: process.env.INTROSPECTION_ENDPOINT,
        user: process.env.INTROSPECTION_USER,
        password: process.env.INTROSPECTION_PASSWORD
    },
    organisationId: process.env.ORGANISATION_ID,
    signingCertKID: process.env.SIGNING_CERT_KID,
    sigingKeyPath: process.env.SIGNING_KEY_PATH,
    audiences: {
        enrollmentAudiencePrefix: process.env.ENROLLMENT_AUDIENCE_PREFIX
    },
    clientDetailsUrl: process.env.CLIENT_DETAILS_ENDPOINT,
    enrollmentIdPrefix: process.env.ENROLLMENT_ID_PREFIX,
    fido: {
        registration_options_endpoint: process.env.FIDO_REGISTRATION_OPTIONS
    }*/
};