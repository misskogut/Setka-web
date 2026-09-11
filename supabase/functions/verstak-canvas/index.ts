import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const SOURCE="https://raw.githubusercontent.com/misskogut/Setka-web/cbae45c1a804d047bc7be4fbddb74fb0728b3dfc/dev/verstak-canvas-alpha.html";
Deno.serve(async(req:Request)=>{
  if(req.method!=="GET"&&req.method!=="HEAD") return new Response("Method Not Allowed",{status:405,headers:{"content-type":"text/plain; charset=utf-8"}});
  const r=await fetch(SOURCE,{headers:{"accept":"text/plain"}});
  if(!r.ok) return new Response("VERSTAK preview source unavailable",{status:502,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
  const html=await r.text();
  return new Response(req.method==="HEAD"?null:html,{status:200,headers:{"content-type":"text/html; charset=utf-8","content-disposition":"inline","cache-control":"no-store, max-age=0","x-content-type-options":"nosniff","referrer-policy":"no-referrer","permissions-policy":"camera=(), microphone=(), geolocation=()"}});
});