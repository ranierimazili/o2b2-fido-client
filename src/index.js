import https from 'https';
import * as selfsigned from 'selfsigned';
import fs from 'fs';
import path from 'path';

//Gera certificados auto-assinados para localhost
const attrs = [{ name: 'commonName', value: 'localhost' }];
const hostCerts = selfsigned.generate(attrs, { days: 365, keySize: 2048 });

const options = {
    key: hostCerts.private,
    cert: hostCerts.cert,
};

const server = https.createServer(options, async (req, res) => {
  const filePath = path.join('./src/html', req.url === '/' ? 'index.html' : req.url);
  console.log(filePath)

  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404);
      res.end('File not found!');
    } else {
      res.writeHead(500);
      res.end(`Internal server error: ${err.code}`);
    }
  }
});
  
const port = 4433;

server.listen(port, () => {
    console.log(`Server running on https://localhost:${port}/`);
});