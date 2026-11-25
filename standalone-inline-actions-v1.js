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
  const popupStyle=document.createElement('style');
  popupStyle.textContent=`
    #st34NoteDeleteConfirm{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;box-sizing:border-box;padding:20px;background:rgba(0,0,0,.65);overscroll-behavior:contain;animation:st-note-confirm-fade .18s ease-out}
    #st34NoteDeleteConfirm .st-note-confirm-card{width:min(100%,350px);box-sizing:border-box;padding:22px;border:1px solid rgba(255,255,255,.22);border-radius:26px;background:#151515;color:#fff;box-shadow:0 18px 70px rgba(0,0,0,.55);text-align:center;animation:st-note-confirm-pop .2s ease-out}
    #st34NoteDeleteConfirm h3{font-size:19px;margin:0 0 10px;font-weight:600}
    #st34NoteDeleteConfirm p{font-size:13px;line-height:1.5;color:#aaa;margin:0 0 20px}
    #st34NoteDeleteConfirm .st-note-confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #st34NoteDeleteConfirm button{min-width:0;min-height:46px;margin:0;padding:8px;border:1px solid rgba(255,255,255,.18);border-radius:15px;background:#202020;color:#eee;font:inherit;font-size:14px;touch-action:manipulation}
    #st34NoteDeleteConfirm .st-note-confirm-delete{color:#f18787;border-color:rgba(241,135,135,.33)}
    @keyframes st-note-confirm-fade{from{opacity:0}to{opacity:1}}
    @keyframes st-note-confirm-pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
    @media(prefers-reduced-motion:reduce){#st34NoteDeleteConfirm,#st34NoteDeleteConfirm .st-note-confirm-card{animation:none}}
  `;document.head.appendChild(popupStyle);
  C.noteDeleteConfirm=(root,{title,body,accept='Удалить',cancel='Отмена'})=>new Promise(resolve=>{
    if(!root?.isConnected||document.getElementById('st34NoteDeleteConfirm')){resolve(false);return}
    const overlay=document.createElement('div');overlay.id='st34NoteDeleteConfirm';
    const panel=document.createElement('section');panel.className='st-note-confirm-card';panel.setAttribute('role','alertdialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','st34NoteDeleteTitle');panel.setAttribute('aria-describedby','st34NoteDeleteCopy');
    const heading=document.createElement('h3');heading.id='st34NoteDeleteTitle';heading.textContent=title;
    const copy=document.createElement('p');copy.id='st34NoteDeleteCopy';copy.textContent=body;
    const actions=document.createElement('div');actions.className='st-note-confirm-actions';
    const no=document.createElement('button'),yes=document.createElement('button');no.type=yes.type='button';no.textContent=cancel;yes.textContent=accept;yes.className='st-note-confirm-delete';
    actions.append(no,yes);panel.append(heading,copy,actions);overlay.appendChild(panel);
    const sheet=root.closest('#st34Layer');let done=false;
    const observer=new MutationObserver(()=>{if(!root.isConnected||!overlay.isConnected||sheet?.classList.contains('hidden'))finish(false)});
    function finish(value){if(done)return;done=true;observer.disconnect();window.removeEventListener('pagehide',close);window.removeEventListener('keydown',key,true);document.removeEventListener('focusin',focus,true);overlay.remove();resolve(value)}
    const close=()=>finish(false);
    function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}else if(e.key==='Tab'){e.preventDefault();(document.activeElement===no?yes:no).focus({preventScroll:true})}}
    function focus(e){if(!panel.contains(e.target))no.focus({preventScroll:true})}
    no.onclick=close;yes.onclick=()=>finish(true);overlay.onclick=e=>{if(e.target===overlay)close()};
    document.body.appendChild(overlay);observer.observe(document.body,{childList:true,subtree:true});if(sheet)observer.observe(sheet,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    window.addEventListener('pagehide',close,{once:true});window.addEventListener('keydown',key,true);document.addEventListener('focusin',focus,true);no.focus({preventScroll:true});
  });
})();
