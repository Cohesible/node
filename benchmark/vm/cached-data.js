'use strict';

const fs = require('fs');
const vm = require('vm');

const fixtures = require('../../test/common/fixtures.js');
const scriptPath = fixtures.path('snapshot', 'typescript.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');

if (process.env['PRODUCE_CACHED_DATA']) {
  function createCachedData(source) {
    const script = new vm.Script(source, { 
      filename: process.env['FILENAME'], 
      produceCachedData: true, 
      importModuleDynamically: process.env['IMPORT_MODULE_DYNAMICALLY'] ? async () => {} : undefined,
    });
    script.runInThisContext()
  
    if (process.send) {
      process.send(script.createCachedData().toString('base64'))
    }
  }
  
  return createCachedData(scriptSource)
}

const common = require('../common.js');

const bench = common.createBenchmark(main, {
  type: [ 'noCachedData', 'cachedData'],
  filename: ['', 'typescript'],
  importModuleDynamically: [0, 1],
  n: [10],
});

const child_process = require('node:child_process')

async function main({ n, type, filename, importModuleDynamically }) {
  const cachedData = await new Promise((resolve, reject) => {
    const proc = child_process.fork(__filename, { env: { 
      PRODUCE_CACHED_DATA: '1',
      FILENAME: filename ? filename : undefined,
      IMPORT_MODULE_DYNAMICALLY: importModuleDynamically === 1 ? '1' : undefined,
    } })
    proc.on('message', d => resolve(Buffer.from(d, 'base64')))
    proc.on('error', reject)
    proc.on('exit', (code, signal) => code ? reject(code) : reject(new Error('received no data')))
  })

  let script;

  bench.start();
  const options = {};
  options.filename = filename ? filename : undefined;
  options.importModuleDynamically = importModuleDynamically === 1 ? async () => {} : undefined;

  switch (type) {
    case 'cachedData':
      options.cachedData = cachedData;
      break;
    case 'noCachedData':
      break;
  }
  for (let i = 0; i < n; i++) {
    script = new vm.Script(scriptSource, options);
  }
  bench.end(n);
  script.runInThisContext();
}
