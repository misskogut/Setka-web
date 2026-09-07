// Offline contract regression. Uses only fake credentials and mocked HTTP.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = process.argv[2] || process.cwd();
function page(file, initial = {}) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, {value:'',hidden:true,children:[],style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){}});
    return nodes.get(key);
  };
  const storage = new Map(Object.entries(initial));
  const calls = []; const redirects = [];
  const context = vm.createContext({
    document:{querySelector:node,querySelectorAll:()=>[]},
    location:{hash:'',search:'',pathname:'/Setka-web/'+file,replace:v=>redirects.push(v)},
    history:{replaceState(){}},window:{},URLSearchParams,
    sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
    fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true,accessToken:'offline-fixture-session'})}},
    addEventListener(){},setTimeout(){},performance:{now:()=>0}
  });
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(script, context);
  return {context,node,storage,calls,redirects,html};
}
(async()=>{
  const login=page('verstak-login.html');
  login.node('#id').value='SETKA-H-TEST-0000';login.node('#pin').value='123456';
  await vm.runInContext('login()',login.context);
  assert.equal(login.calls[0].body.action,'login');
  assert.equal(login.calls[0].body.setkaId,'SETKA-H-TEST-0000');
  assert.equal(login.storage.get('verstak_session'),'offline-fixture-session');
  assert.deepEqual(login.redirects,['verstak-user-genesis-v2.html']);
  assert.throws(()=>vm.runInContext('redirect(undefined)',login.context));
  const denied=page('verstak-login.html');
  denied.node('#id').value='SETKA-H-TEST-0000';denied.node('#pin').value='123456';
  denied.context.fetch=async()=>({ok:false,status:401,json:async()=>({error:'invalid_credentials'})});
  await vm.runInContext('login()',denied.context);
  assert.equal(denied.redirects.length,0);assert.equal(denied.storage.size,0);
  const front=page('verstak-user-genesis-v2.html');
  assert.match(front.html,/href="verstak-login.html"/);
  assert.doesNotMatch(front.html,/id="manual"/);
  assert.equal(front.node('#gate').hidden,false);
  front.storage.set('verstak_session','offline-fixture-session');
  vm.runInContext('token=tok();render=()=>{}',front.context);
  await vm.runInContext('start()',front.context);
  assert.equal(front.node('#app').hidden,false);
  assert.equal(front.calls[0].body.p_session_token,'offline-fixture-session');
  assert.equal('p_actor_identity_id' in front.calls[0].body,false);
  front.context.fetch=async()=>{throw new Error('network offline')};
  await vm.runInContext('start()',front.context);
  assert.equal(front.storage.get('verstak_session'),'offline-fixture-session');
  assert.equal(front.node('#app').hidden,true);
  assert.equal(front.node('#retry').hidden,false);
  console.log('PASS: login success/denial, token-free Genesis redirect, scoped gateway, unauthenticated gate, network retry. Browser login remains unproven.');
})().catch(e=>{console.error(e);process.exitCode=1});
