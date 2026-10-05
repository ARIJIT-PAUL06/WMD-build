const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=9222',
    '--window-size=488,1055',
    '--user-data-dir=' + process.env.TEMP + '\\edge_story_scroll_test',
    'http://localhost:5173/#story'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://localhost:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      const pages = JSON.parse(data);
      const page = pages.find(p => p.url.includes('localhost:5173')) || pages[0];
      
      const wsUrl = page.webSocketDebuggerUrl;
      const ws = new (require('http').ClientRequest) ? null : null; // we will use CDP HTTP or puppeteer-core if available
    });
  });
}
