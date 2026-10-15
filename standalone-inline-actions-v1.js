(() => {
  'use strict';const C=window.SetkaStandaloneV34;if(!C)return;
  const style=document.createElement('style');style.textContent=`.st-inline-status{margin:12px 0;color:#aaa;font-size:13px;line-height:1.5}.st-inline-status[data-kind=error]{color:#ffd6c9}.st-inline-confirm{margin:14px 0;padding:16px;border:1px solid #555;border-radius:20px;background:#111}.st-inline-confirm h3{margin:0 0 8px;font-size:16px}.st-inline-confirm p{color:#aaa;font-size:13px;line-height:1.5;margin:0 0 12px}.st-inline-confirm .st-row{align-items:stretch}.st-inline-confirm button{flex:1;min-height:44px;height:auto;margin-top:0}.st-note-add{display:flex;align-items:center;justify-content:center;gap:8px}.st-note-add span{font-size:24px;line-height:1}.st-note-editor{margin:12px 0 20px;padding:16px;border:1px solid #444;border-radius:22px}.st-note-editor label{display:block;margin-bottom:10px}.st-note-editor .st-row>*{flex:1}.st-note-editor .st-textarea{min-height:150px}`;document.head.appendChild(style);
  C.inlineStatus=(root,text,kind='status')=>{if(!root)return;let line=root.querySelector('.st-inline-status');if(!line){line=document.createElement('div');line.className='st-inline-status';line.setAttribute('role','status');root.appendChild(line)}line.textContent=text;line.dataset.kind=kind;return line};
  C.inlineConfirm=(root,{title,body,accept='Подтвердить',cancel='Отмена'})=>new Promise(resolve=>{
    if(!root?.isConnected){resolve(false);return}
    const panel=document.createElement('section');panel.className='st-inline-confirm';panel.setAttribute('role','group');panel.setAttribute('aria-label',title);
    const heading=document.createElement('h3');heading.textContent=title;panel.appendChild(heading);const copy=document.createElement('p');copy.textContent=body;panel.appendChild(copy);
    const actions=document.createElement('div');actions.className='st-row';const no=document.createElement('button'),yes=document.createElement('button');no.type=yes.type='button';no.className='st-secondary';yes.className='st-primary';no.textContent=cancel;yes.textContent=accept;actions.append(no,yes);panel.appendChild(actions);root.appendChild(panel);
    let done=false;const observer=new MutationObserver(()=>{if(!panel.isConnected)finish(false)});
    function finish(value){if(done)return;done=true;observer.disconnect();window.removeEventListener('pagehide',close);panel.remove();resolve(value)}
    const close=()=>finish(false);no.onclick=close;yes.onclick=()=>finish(true);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('pagehide',close,{once:true});panel.scrollIntoView({block:'nearest',behavior:'smooth'});
  });
})();
