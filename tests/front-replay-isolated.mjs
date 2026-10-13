import {mountReplay} from '../research-v1/replay.mjs?v=1.1.1';
import {recordedStates} from '../research-v1/replay-model.mjs';
const link=document.createElement('link');link.rel='stylesheet';link.href='../research-v1/style.css?v=1.1.1';const stylesheetReady=()=>new Promise(resolve=>{link.onload=resolve;document.head.append(link)});
const bar=document.createElement('div');bar.id='isolated-test-tools';
Object.assign(bar.style,{position:'fixed',left:'8px',right:'8px',top:'2px',zIndex:400000,background:'#eeeeeb',color:'#111',padding:'4px 8px',fontSize:'10px',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'});
bar.innerHTML='<span>Изолированный тест · запись в Supabase заблокирована</span><button style="font-size:10px;padding:4px 6px">Открыть Replay проверки</button>';document.body.append(bar);
const dialog=document.createElement('dialog');dialog.style.zIndex=500000;dialog.innerHTML='<button class="close-test">Закрыть проверку</button><p class="notice">Это действия из изолированной проверки, не запись участника. Они не входят в продуктовые отчёты.</p><div id="isolated-replay"></div><p id="isolated-results"></p>';document.body.append(dialog);let player;
dialog.querySelector('.close-test').onclick=()=>{player?.stop();dialog.close();link.remove()};
bar.querySelector('button').onclick=async()=>{
 await stylesheetReady();
 const C=window.SetkaStandaloneV34,d=C.getData(),session=d.sessions.at(-1),all=d.events.filter(e=>!session||e.sessionId===session.id),start=session?Date.parse(session.startedAt):Date.parse(all[0]?.wallAt);
 const events=all.map(e=>({...e,tMs:e.tMs??Math.max(0,Date.parse(e.wallAt)-start),source:'isolated-browser-actions'}));
 const states=recordedStates(events,d.notes,session?.id);
 dialog.showModal();player=mountReplay(dialog.querySelector('#isolated-replay'),{events,states,coverage:'partial',durationMs:Math.max(1,...events.map(e=>e.tMs)),session},{title:'Действия из изолированной проверки'});
 dialog.querySelector('#isolated-results').textContent=`${events.length} событий · ${states.length} слепков · ${d.notes.length} заметок · ${d.patternExposures?.length||0} просмотров · ${window.__SETKA_ISOLATED_FRONT_V1__.blocked()} заблокированных внешних запросов.`;
};
