export const renderCycle=function renderCycle(p,ss=[],ex=[],notes=[],physio=[],checks=[]){
 const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
 const day=x=>{const t=Date.parse(x?.observedAt||x?.startedAt||x?.createdAt||"");return Number.isFinite(t)?new Date(t).toISOString().slice(0,10):null};
 const count=(rows,date)=>rows.filter(x=>day(x)===date).length,c=p.cycle;
 if(!c)return "<p class='muted'>Связанных данных цикла с разрешённой синхронизацией пока нет.</p>";
 const dates=[...new Set([...c.periods.map(x=>x.start),...c.events.map(x=>x.date)])].sort().reverse();
 const rows=dates.map(d=>{const r=c.periods.find(x=>x.start===d),marks=c.events.filter(x=>x.date===d).map(x=>esc(x.label)).join(", ");
 return "<tr><td>"+esc(d)+"</td><td>"+(r?"Начало · "+esc(r.periodLength??"—")+" дн.":"—")+"</td><td>"+(marks||"—")+"</td><td>"+[count(ss,d),count(ex,d),count(notes,d),count(physio,d),count(checks,d)].join(" / ")+"</td></tr>"}).join("");
 return "<div class='notice'><b>"+(p.id?.startsWith("device:")?"Календарь гостевого устройства":"Связанный календарь ALMA")+"</b> · "+esc(c.periodCount)+" записей начала цикла · "+esc(c.markCount)+" отметок. Обновлено "+esc(c.updatedAt)+".</div>"+
 "<p class='muted small'>Совпадения по календарным датам UTC: сессии / просмотры / заметки / пульс / состояния. Не подтверждают физиологическую фазу.</p>"+
 "<div style='overflow:auto'><table><thead><tr><th>Дата</th><th>Менструация</th><th>Отметки</th><th>Связанные записи</th></tr></thead><tbody>"+(rows||"<tr><td colspan='4'>Записей ещё нет</td></tr>")+"</tbody></table></div>"+
 "<details><summary>Все исходные параметры и записи ALMA</summary><pre style='white-space:pre-wrap;overflow-wrap:anywhere'>"+esc(JSON.stringify(c.raw,null,2))+"</pre></details>";
};
