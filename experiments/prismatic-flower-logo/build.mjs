import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
await build({entryPoints:[resolve(root,'src/main.js')],outfile:resolve(root,'app.js'),bundle:true,format:'esm',minify:true,legalComments:'eof',target:['safari16','chrome110']});
