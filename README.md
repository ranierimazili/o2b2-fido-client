# o2b2-fido-client
Este projeto tem como intuito ser um front-end simples para testes do [o2b2-fido-server](https://github.com/ranierimazili/o2b2-fido-server).

## Testes em browsers (Chrome, Edge e Firefox)

**Microsoft Edge**

Caso esteja executando no browser em localhost e esteja enfrendo problema no Microsoft Edge com chamadas no localhost, siga os passos abaixo para liberar as chamadas.

- Abra a URL edge://flags/

- Pesquise por localhost na busca e ative a flag _Allow invalid certificates for resources loaded from localhost_

**Google Chrome**

Sem problemas encontrados

**Mozila Firefox**

Aparentemente não suporta utilização de dispositivo fido remoto (mobile), então nos testes aconselho utilizar Edge ou Chrome
