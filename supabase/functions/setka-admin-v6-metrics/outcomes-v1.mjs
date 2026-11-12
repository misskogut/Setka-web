// Privacy-minimal exploratory SETKA research summaries. Subjective user
// ratings only: NO clinical efficacy or per-person records. Rare groups hidden.
const DAY=86400000,OFFSET=4*3600000,MIN_GROUP=3,MIN_OVERALL=5;
const day=t=>Math.floor((t+OFFSET)/DAY);
const date=x=>{const t=Date.parse(String(x||""));return Number.isFinite(t)?t:null};
const finite1to5=v=>v!==null&&v!==undefined&&Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=5?Number(v):null;
const round1=x=>Math.round(x*10)/10;
const avg=x=>x.length?round1(x.reduce((a,b)=>a+b,0)/x.length):null;
function range({days=30,from=null,to=null,now=Date.now()}={}){
 if(!Number.isFinite(now)||![0,1,7,30,90].includes(days))throw Error("invalid_period");
 const custom=from!==null||to!==null;
 const low=custom?date(from):null,high=custom?date(to):null;
 if(custom&&(low===null||high===null||high<=low||high-low>370*DAY))throw Error("invalid_period");
 const today=day(now),first=custom?day(low):days?today-days+1:-Infinity,last=custom?day(high-1):today;
 return {includes:at=>Number.isFinite(at)&&at<=now+300000&&day(at)>=first&&day(at)<=last&&(!custom||(at>=low&&at<high))};
}
export function summarizeOutcomeSessions(rows,options={}){
 const selected=range(options),grouped=new Map();
 let completed=0,paired=0,totalSessions=0,freeSessionsIgnored=0;
 const deltas=[],preScores=[],postScores=[];
 for(const s of Array.isArray(rows)?rows:[]){
  const at=date(s?.started_at);
  if(at===null||!selected.includes(at))continue;
  // Historical "Просто исследую" may contain obsolete ratings; never
  // treat them as research evidence, even if a pre/post pair was saved.
  if(s.session_type==="exploration"||s.request_key==="explore"){freeSessionsIgnored++;continue}
  if(s.session_type!=="outcome")continue;
  totalSessions++;
  if(s.completed!==true)continue;
  completed++;
  const pre=finite1to5(s.pre_state),post=finite1to5(s.post_state);
  if(pre===null||post===null)continue;
  paired++;
  const delta=post-pre;preScores.push(pre);postScores.push(post);deltas.push(delta);
  const key=typeof s.request_key==="string"&&/^[a-z_-]{1,50}$/.test(s.request_key)?s.request_key:"other";
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push({pre,post,delta});
 }
 const sufficient=paired>=MIN_OVERALL;
 const groups=[...grouped.entries()].filter(([,values])=>values.length>=MIN_GROUP)
  .map(([requestKey,values])=>({
   requestKey,pairedSessions:values.length,meanPre:avg(values.map(v=>v.pre)),
   meanPost:avg(values.map(v=>v.post)),meanChange:avg(values.map(v=>v.delta)),
   increased:values.filter(v=>v.delta>0).length,unchanged:values.filter(v=>v.delta===0).length,
   decreased:values.filter(v=>v.delta<0).length
  })).sort((a,b)=>b.pairedSessions-a.pairedSessions).slice(0,12);
 return {trackedSessions:totalSessions,completedSessions:completed,pairedSessions:paired,
  excludedExplorationSessions:freeSessionsIgnored,minimumGroupSize:MIN_GROUP,
  overall:sufficient?{meanPre:avg(preScores),meanPost:avg(postScores),meanChange:avg(deltas)}:null,
  groups:groups.filter(g=>sufficient),privacySuppressed:paired>0&&!sufficient,
  caveat:"Self-reported before/after association only. No control group, no efficacy or attribution to any particular pattern. Groups with fewer than 3 pairs are hidden."
 };
}
export function summarizePatternTransitions(rows,{minimumSessions=3}={}){
 const sessions=new Map();
 for(const r of Array.isArray(rows)?rows:[]){
  const sid=r?.session_id,account=r?.tester_id,pattern=r?.pattern_id,at=date(r?.started_at);
  if(!sid||!account||!pattern||at===null)continue;
  const key=String(account)+"\u0000"+String(sid);
  if(!sessions.has(key))sessions.set(key,[]);
  sessions.get(key).push({pattern:String(pattern).slice(0,100),at});
 }
 const counts=new Map();
 for(const session of sessions.values()){
  session.sort((a,b)=>a.at-b.at);
  const seq=session.map(x=>x.pattern).filter((p,i,a)=>i===0||p!==a[i-1]);
  const unique=new Set();
  for(let i=1;i<seq.length;i++)if(seq[i-1]!==seq[i])unique.add(JSON.stringify([seq[i-1],seq[i]]));
  for(const key of unique)counts.set(key,(counts.get(key)||0)+1);
 }
 return {sessionsWithSequence:sessions.size,transitions:[...counts].filter(([,n])=>n>=minimumSessions)
  .map(([key,sessionCount])=>{const [fromPattern,toPattern]=JSON.parse(key);return {fromPattern,toPattern,sessionCount}})
  .sort((a,b)=>b.sessionCount-a.sessionCount).slice(0,10),
  minimumSessions,caveat:"Transitions count distinct recorded sessions, not people, and do not establish outcomes."};
}
