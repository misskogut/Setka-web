// Author-drawn SETKA sound glyph primitives. No image tracing, RDP or raster coordinates.
export const P=d=>'<path d="'+d+'"/>';
export const F=d=>'<path fill="currentColor" stroke="none" d="'+d+'"/>';
export const C=(x,y,r,solid=false)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'"'+(solid?' fill="currentColor" stroke="none"':'')+'/>';
export const E=(x,y,rx,ry)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'"/>';
export const L=(x1,y1,x2,y2)=>'<path d="M'+x1+' '+y1+'L'+x2+' '+y2+'"/>';
export const ROT=(a,content,x=50,y=50)=>'<g transform="rotate('+a+' '+x+' '+y+')">'+content+'</g>';
export const N=(count,fn)=>Array.from({length:count},(_,i)=>fn(i)).join('');
export const polygon=points=>P('M'+points.map(p=>p.join(' ')).join('L')+'Z');
