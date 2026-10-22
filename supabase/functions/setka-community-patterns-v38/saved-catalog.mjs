// Historical public recipes remain browsable when account-based metrics replace
// device-based metrics. Never reinterpret historical devices as current accounts.
export function historicalSavedCatalog(rows,descriptors){
  const catalog=new Map(descriptors.map(p=>[p.id,p])),groups=new Map();
  for(const row of rows){
    const p=catalog.get(row.pattern_id);if(!p||!row.config||typeof row.config!=='object')continue;
    const config={patternId:p.id};
    for(const [key,rule] of Object.entries(p.schema||{})){
      const v=row.config[key];
      if(typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean'||typeof v==='string'&&rule.type==='string'&&v.length<=(rule.maxLength||200)||Array.isArray(v)&&rule.type==='array'&&v.length<=(rule.maxItems||64)&&v.every(Number.isFinite))config[key]=v;
    }
    if(Object.keys(config).length===1)continue;
    const key=JSON.stringify(Object.fromEntries(Object.entries(config).sort(([a],[b])=>a.localeCompare(b))));
    let item=groups.get(key);
    if(!item){item={pattern_id:p.id,patternId:p.id,pattern_version:p.version,config,config_key:row.config_key,created_at:row.saved_at,updated_at:row.updated_at,devices:new Set()};groups.set(key,item)}
    if(row.device_id)item.devices.add(row.device_id);
    if(row.saved_at<item.created_at)item.created_at=row.saved_at;
  }
  return [...groups.values()].map(({devices,...item})=>({...item,legacySaveCount:devices.size,saveCount:0,historical:true,preview_frame:44}));
}
