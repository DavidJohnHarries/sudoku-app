'use strict';
// ===== Sudoku (killer) solving tool — plain JS, localStorage, no build step =====
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}},SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const RC=i=>`r${Math.floor(i/9)+1}c${i%9+1}`;
const COLOURS=['#fca5a5','#fdba74','#fde047','#86efac','#5eead4','#93c5fd','#c4b5fd','#f9a8d4','#cbd5e1'];
const MAXCOL=3;
// Feature flags / hooks for later variants (thermometers, arrows, kropki...): add a parser section + a draw layer.
const FEATURES={calculator:true,thermo:true,kropki:true,arrows:true};
// Colours: up to 3 per cell, drawn in palette order. At most one may be boosted
// (2/3 of the pie; the others share the remaining 1/3 equally). No boost = equal shares.
function normCol(x){
 let ids=[],boost=0;
 if(Array.isArray(x))ids=x;
 else if(x&&typeof x==='object'){ids=x.c||[];boost=x.b||0}
 const seen=new Set(),c=[];
 for(const x of ids){const d=+x;if(d>=1&&d<=9&&!seen.has(d)){seen.add(d);c.push(d)}}
 c.sort((a,b)=>a-b);if(c.length>MAXCOL)c.length=MAXCOL;
 if(!c.includes(boost))boost=0;
 return {c,b:boost}
}
function parseColourToks(toks){
 const s=toks.join('');let boost=0,ids=[];
 for(let i=0;i<s.length;i++){
  if(/[1-9]/.test(s[i])){const d=+s[i];ids.push(d);if(s[i+1]==='*'){boost=d;i++}}
 }
 return normCol({c:ids,b:boost})
}
function fmtColour(o){o=normCol(o);return o.c.map(d=>o.b===d?d+'*':String(d)).join(' ')}
const SAMPLE=`SUDOKU v1
name Sample killer
givens .................................................................................
cage 19 r1c1 r2c1 r3c1
cage 15 r1c2 r1c3 r2c2 r3c2
cage 20 r1c4 r2c3 r2c4
cage 12 r1c5 r1c6 r2c6
cage 8 r1c7 r2c7
cage 12 r1c8 r1c9 r2c8
cage 5 r2c5
cage 8 r2c9
cage 11 r3c3 r3c4 r4c3
cage 10 r3c5 r4c5
cage 6 r3c6
cage 23 r3c7 r4c7 r5c7 r6c6 r6c7
cage 12 r3c8 r4c8
cage 20 r3c9 r4c9 r5c8 r5c9
cage 17 r4c1 r4c2
cage 2 r4c4
cage 14 r4c6 r5c5 r5c6
cage 15 r5c1 r6c1 r6c2
cage 4 r5c2
cage 8 r5c3 r6c3
cage 15 r5c4 r6c4
cage 4 r6c5
cage 9 r6c8 r7c8
cage 10 r6c9 r7c9
cage 20 r7c1 r7c2 r8c2
cage 23 r7c3 r7c4 r8c3 r8c4
cage 18 r7c5 r8c5 r9c4 r9c5
cage 10 r7c6 r7c7
cage 6 r8c1 r9c1 r9c2
cage 7 r8c6
cage 30 r8c7 r8c8 r9c6 r9c7 r9c8
cage 8 r8c9 r9c9
cage 4 r9c3`;

// ---------- Puzzle format (see README) ----------
function blankPuzzle(name){return {id:uid(),name:name||'Untitled',givens:Array(81).fill(0),sol:null,cages:[],thermos:[],arrows:[],kropki:[],kropkiNeg:false,v:Array(81).fill(0),cn:Array(81).fill(''),mn:Array(81).fill(''),col:Array.from({length:81},()=>({c:[],b:0})),time:0,solved:false,extra:[],groups:{},lineSums:{},updated:Date.now()}}
function parseCell(t){const m=/^r([1-9])c([1-9])$/i.exec(t);return m?(m[1]-1)*9+(m[2]-1):-1}
function parseGrid81(s){s=s.replace(/[\s|]/g,'');if(s.length!==81||/[^.0-9]/.test(s))return null;return [...s].map(ch=>ch==='.'?0:+ch)}
function parsePuzzle(text){
 const lines=text.replace(/\r/g,'').split('\n');const errs=[],p=blankPuzzle();let i=0;
 while(i<lines.length&&!lines[i].trim())i++;
 const hdr=(lines[i]||'').trim().split(/\s+/);
 if(hdr[0].toUpperCase()!=='SUDOKU'||!/^v\d+$/i.test(hdr[1]||''))return {errs:['First line must be "SUDOKU v1"']};
 const ver=+hdr[1].slice(1);if(ver>1)errs.push(`Note: format v${ver} is newer than this app (v1); unknown lines are kept but ignored.`);
 const cageByAnchor={},pend=[];
 for(i++;i<lines.length;i++){
  let raw=lines[i];const ln=i+1;const line=raw.replace(/#.*$/,'').trim();if(!line)continue;
  const sp=line.indexOf(' ');const kw=(sp<0?line:line.slice(0,sp)).toLowerCase(),rest=sp<0?'':line.slice(sp+1).trim();
  const toks=rest.split(/\s+/).filter(Boolean);
  const grabGrid=()=>{let s=rest;while(s.replace(/[\s|]/g,'').length<81&&i+1<lines.length&&/^[\s.0-9|]+$/.test(lines[i+1])&&lines[i+1].trim()){i++;s+=lines[i]}return parseGrid81(s)};
  if(kw==='name')p.name=rest||p.name;
  else if(kw==='givens'||kw==='values'||kw==='solution'){const g=grabGrid();if(!g){errs.push(`Line ${ln}: ${kw} needs 81 characters of 1-9 or . (0 also = empty)`);continue}if(kw==='givens')p.givens=g;else if(kw==='values')p.v=g;else p.sol=g}
  else if(kw==='cage'){const sum=+toks[0];const cells=toks.slice(1).map(parseCell);
   if(!Number.isInteger(sum)||sum<1||sum>45||!cells.length||cells.some(c=>c<0)){errs.push(`Line ${ln}: expected "cage SUM r1c1 r1c2 ..."`);continue}
   const cg={sum,cells:[...new Set(cells)].sort((a,b)=>a-b),elim:[]};p.cages.push(cg);cageByAnchor[cg.cells[0]]=cg}
  else if(kw==='thermo'){const cs=toks.map(parseCell);
   if(cs.length<2||cs.some(c=>c<0)){errs.push(`Line ${ln}: expected "thermo BULB r1c2 r1c3 ..." (2+ cells, bulb first)`);continue}
   const why=thermoProblem(cs);if(why)errs.push(`Line ${ln}: ${why} (kept anyway)`);p.thermos.push({cells:cs})}
  else if(kw==='arrow'){const gt=toks.indexOf('>');const circ=(gt>=0?toks.slice(0,gt):toks.slice(0,1)).map(parseCell),sh=(gt>=0?toks.slice(gt+1):toks.slice(1)).map(parseCell);
   if(!circ.length||circ.length>3||!sh.length||circ.some(c=>c<0)||sh.some(c=>c<0)){errs.push(`Line ${ln}: expected "arrow CIRCLE r1c2 r1c3 ..." (circle first, then the shaft to the arrowhead; a 2–3 cell circle: "arrow r1c1 r1c2 > r2c3 ...")`);continue}
   const a={cells:[...circ,...sh],b:circ.length},why=arrowProblem(a.cells,a.b);if(why)errs.push(`Line ${ln}: ${why} (kept anyway)`);p.arrows.push(a)}
  else if(kw==='kropki'){const t=(toks[0]||'').toLowerCase(),a=parseCell(toks[1]||''),b=parseCell(toks[2]||'');
   if(!(t==='w'||t==='b')||a<0||b<0||toks.length!==3){errs.push(`Line ${ln}: expected "kropki w r1c1 r1c2" (w = white, b = black)`);continue}
   if(!orthAdj(a,b)){errs.push(`Line ${ln}: kropki cells ${RC(a)} and ${RC(b)} must share an edge`);continue}
   setDot(p,a,b,t)}
  else if(kw==='kropki-negative'||kw==='kropkinegative')p.kropkiNeg=true;
  else if(kw==='colour'||kw==='color'){const c=parseCell(toks[0]||'');
   if(c<0){errs.push(`Line ${ln}: expected "${kw} r1c1 COLOURS"`);continue}
   p.col[c]=parseColourToks(toks.slice(1))}
  else if(kw==='corner'||kw==='centre'||kw==='center'){const c=parseCell(toks[0]||''),d=(toks.slice(1).join('')).replace(/[^1-9]/g,'');
   if(c<0){errs.push(`Line ${ln}: expected "${kw} r1c1 DIGITS"`);continue}
   const u=[...new Set(d)];if(kw==='corner')p.cn[c]=u.sort().join('');else p.mn[c]=u.sort().join('')}
  else if(kw==='elim'||kw==='groupsum'||kw==='linesum')pend.push([ln,toks,kw]);
  else if(kw==='time'){p.time=Math.max(0,parseInt(toks[0])||0)}
  else if(kw==='solved')p.solved=true;
  else {p.extra.push(raw.trim());if(!errs.some(e=>e.includes(`"${kw}"`)))errs.push(`Note: "${kw}" lines aren't supported yet; kept and ignored.`)}
 }
 for(const [ln,toks,kw] of pend){const bm=/^box([1-9])$/i.exec(toks[0]||'');
  if(bm){const G=groupOf(p,bm[1]-1);if(!G){errs.push(`Line ${ln}: box${bm[1]} has no uncaged cells`);continue}const g=ensureGroup(p,G);
   if(kw==='groupsum'){const n=parseInt(toks[1]);if(n>=1&&n<=45&&!G.derived)g.sum=n}else g.elim=toks.slice(1).filter(t=>/^[1-9]+$/.test(t));continue}
  if(kw==='elim'&&/^arrow$/i.test(toks[0]||'')){const c=parseCell(toks[1]||''),a=p.arrows.find(x=>x.cells[0]===c);if(!a){errs.push(`Line ${ln}: "elim arrow" must name an arrow's circle cell`);continue}
   a.elim=toks.slice(2).filter(t=>/^\d+(:[1-9](\+[1-9])*)?$/.test(t));continue}
  if(kw==='linesum'||(kw==='elim'&&/^line$/i.test(toks[0]||''))){
   const src=kw==='elim'?toks.slice(1):toks,cells=[],rest=[];
   for(const t of src){const c=parseCell(t);if(c>=0)cells.push(c);else rest.push(t)}
   const uniq=[...new Set(cells)].sort((a,b)=>a-b);
   const onLine=uniq.length>=2&&(uniq.every(i=>Math.floor(i/9)===Math.floor(uniq[0]/9))||uniq.every(i=>i%9===uniq[0]%9));
   const inCage=uniq.length>=2&&p.cages.some(c=>uniq.every(i=>c.cells.includes(i)));
   if(!onLine&&!inCage){errs.push(`Line ${ln}: expected "${kw==='linesum'?'linesum SUM r1c1 r1c2 ...':'elim line r1c1 r1c2 ... COMBOS'}" (cells must share a row, a column, or a cage)`);continue}
   if(kw==='linesum'){const n=parseInt(rest[0]);if(!(n>=1&&n<=45)||rest.length!==1){errs.push(`Line ${ln}: expected "linesum SUM r1c1 r1c2 ..."`);continue}
    if(uniq.length<9){p.lineSums=p.lineSums||{};const L=p.lineSums[uniq.join(',')]=p.lineSums[uniq.join(',')]||{sum:null,elim:[]};L.sum=n}}
   else{p.lineSums=p.lineSums||{};const L=p.lineSums[uniq.join(',')]=p.lineSums[uniq.join(',')]||{sum:null,elim:[]};L.elim=rest.filter(t=>/^[1-9]+$/.test(t))}
   continue}
  if(kw==='groupsum'){errs.push(`Line ${ln}: expected "groupsum boxN SUM"`);continue}
  const c=parseCell(toks[0]||'');const cg=cageByAnchor[c];if(!cg){errs.push(`Line ${ln}: elim must name a cage's top-left cell`);continue}cg.elim=toks.slice(1).filter(t=>/^[1-9]+$/.test(t))}
 for(let k=0;k<81;k++)if(p.givens[k])p.v[k]=0;
 return {p,errs};
}
// Kropki dots: {t:'w'|'b',a,b} with a<b orthogonal neighbours (b=a+1 or a+9). One dot per edge.
// White = consecutive, black = one digit is double the other (1–2 satisfies either).
// kropkiNeg: all dots are given, so neighbours without a dot are neither consecutive nor double.
const orthAdj=(a,b)=>{const d=Math.abs(a-b);return d===9||(d===1&&Math.floor(a/9)===Math.floor(b/9))};
const dotOK=(t,x,y)=>t==='w'?Math.abs(x-y)===1:(x===2*y||y===2*x);
const dotAny=(x,y)=>dotOK('w',x,y)||dotOK('b',x,y);
function dotAt(p,a,b){const lo=Math.min(a,b),hi=Math.max(a,b);return (p.kropki||[]).findIndex(d=>d.a===lo&&d.b===hi)}
function setDot(p,a,b,t){p.kropki=p.kropki||[];const lo=Math.min(a,b),hi=Math.max(a,b),k=dotAt(p,lo,hi);
 if(k>=0){if(t)p.kropki[k].t=t;else p.kropki.splice(k,1)}else if(t)p.kropki.push({t,a:lo,b:hi});
 p.kropki.sort((x,y)=>x.a-y.a||x.b-y.b)}
// Thermometer cells are kept in order, bulb first. Each step must be to a king-move neighbour.
const kingAdj=(a,b)=>a!==b&&Math.abs(Math.floor(a/9)-Math.floor(b/9))<=1&&Math.abs(a%9-b%9)<=1;
function thermoProblem(cs){if(cs.length<2)return 'a thermo needs at least 2 cells';if(cs.length>9)return `thermo at ${RC(cs[0])} has ${cs.length} cells (max 9)`;
 if(new Set(cs).size<cs.length)return `thermo at ${RC(cs[0])} visits a cell twice`;
 for(let k=1;k<cs.length;k++)if(!kingAdj(cs[k-1],cs[k]))return `thermo at ${RC(cs[0])}: ${RC(cs[k-1])} → ${RC(cs[k])} aren't neighbours`;return ''}
// Arrows (v16): {cells:[circle…, shaft…], b}. The first b cells (1, or a 2–3 cell "pill" read as a
// number left-to-right / top-to-bottom) are the circle; the rest is the shaft in order, arrowhead last.
// Shaft digits add up to the circle. Digits may repeat on an arrow if sudoku rules allow.
function arrowProblem(cs,b){b=b||1;const at=RC(cs[0]);if(cs.length<b+1)return 'an arrow needs a circle and at least 1 shaft cell';
 if(new Set(cs).size<cs.length)return `arrow at ${at} visits a cell twice`;
 const circ=cs.slice(0,b),r0=Math.floor(circ[0]/9),c0=circ[0]%9;
 for(let k=1;k<b;k++)if(!orthAdj(circ[k-1],circ[k])||!(circ.every(i=>Math.floor(i/9)===r0)||circ.every(i=>i%9===c0)))return `arrow circle at ${at} must be cells side by side in a straight line`;
 if(!circ.some(c=>kingAdj(c,cs[b])))return `arrow at ${at}: the shaft must start next to the circle`;
 for(let k=b+1;k<cs.length;k++)if(!kingAdj(cs[k-1],cs[k]))return `arrow at ${at}: ${RC(cs[k-1])} → ${RC(cs[k])} aren't neighbours`;return ''}
function fmtArrow(a){const b=a.b||1,c=a.cells.map(RC);return 'arrow '+(b>1?c.slice(0,b).join(' ')+' > ':c[0]+' ')+c.slice(b).join(' ')}
function gridStr(a){let s='';for(let r=0;r<9;r++)s+=(r?' ':'')+a.slice(r*9,r*9+9).map(x=>x||'.').join('');return s}
function exportPuzzle(p,state){
 const L=['SUDOKU v1','name '+p.name,'givens '+gridStr(p.givens)];
 if(p.sol&&p.sol.some(x=>x))L.push('solution '+gridStr(p.sol));
 for(const c of p.cages)L.push(`cage ${c.sum} `+c.cells.map(RC).join(' '));
 for(const t of p.thermos||[])L.push('thermo '+t.cells.map(RC).join(' '));
 for(const a of p.arrows||[])L.push(fmtArrow(a));
 for(const d of p.kropki||[])L.push(`kropki ${d.t} ${RC(d.a)} ${RC(d.b)}`);
 if(p.kropkiNeg)L.push('kropki-negative');
 L.push(...p.extra);
 if(state){
  if(p.v.some(x=>x))L.push('values '+gridStr(p.v));
  for(let i=0;i<81;i++){if(p.cn[i])L.push(`corner ${RC(i)} ${p.cn[i]}`);if(p.mn[i])L.push(`centre ${RC(i)} ${p.mn[i]}`);const co=normCol(p.col[i]);if(co.c.length)L.push(`colour ${RC(i)} ${fmtColour(co)}`)}
  for(const c of p.cages)if(c.elim&&c.elim.length)L.push(`elim ${RC(c.cells[0])} ${c.elim.join(' ')}`);
  for(const a of p.arrows||[])if(a.elim&&a.elim.length)L.push(`elim arrow ${RC(a.cells[0])} ${a.elim.join(' ')}`);
  for(let b=0;b<9;b++){const G=groupOf(p,b);if(!G||!G.stored)continue;if(!G.derived&&G.sum)L.push(`groupsum ${G.key} ${G.sum}`);if(G.elim.length)L.push(`elim ${G.key} ${G.elim.join(' ')}`)}
  const ls=p.lineSums||{};for(const ck of Object.keys(ls).sort()){const g=ls[ck],cells=ck.split(',').map(Number);
   if(g.sum)L.push(`linesum ${g.sum} `+cells.map(RC).join(' '));if(g.elim&&g.elim.length)L.push(`elim line `+cells.map(RC).join(' ')+' '+g.elim.join(' '))}
  L.push('time '+Math.floor(p.time));if(p.solved)L.push('solved');
 }
 return L.join('\n')+'\n';
}

// ---------- Uncaged groups (uncaged cells of a 3x3 box) ----------
// Sum is 45 minus the box's cages when every cage touching the box lies inside it; otherwise typed by the user.
// Memory (typed sum, ruled-out combos) is kept per box in p.groups[boxN] and reset if the group's cells or derived sum change.
function boxCellsOf(b){const r0=Math.floor(b/3)*3,c0=(b%3)*3,o=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)o.push((r0+r)*9+c0+c);return o}
function groupOf(p,b){const bc=boxCellsOf(b),cnt=Array(81).fill(0),touch=new Set();
 p.cages.forEach((c,k)=>c.cells.forEach(i=>{cnt[i]++;if(bc.includes(i))touch.add(k)}));
 const cells=bc.filter(i=>!cnt[i]);if(!cells.length)return null;
 let derived=!bc.some(i=>cnt[i]>1),s=0;for(const k of touch){const c=p.cages[k];s+=c.sum;if(!c.cells.every(i=>bc.includes(i)))derived=false}
 const key='box'+(b+1),ck=cells.join(','),dsum=derived?45-s:null,g=p.groups&&p.groups[key];
 const stored=!!g&&g.cells===ck&&g.dsum===dsum;
 return {key,b,cells,ck,dsum,derived,stored,sum:derived?dsum:(stored?g.sum:null),elim:stored?g.elim:[]}}
function ensureGroup(p,G){p.groups=p.groups||{};let g=p.groups[G.key];if(!g||g.cells!==G.ck||g.dsum!==G.dsum)g=p.groups[G.key]={cells:G.ck,dsum:G.dsum,sum:null,elim:[]};return g}

// ---------- Typed set sums (a line, or a 2+ cell subset of a cage) ----------
// Stored in p.lineSums under the exact cell set (same key as v11 line sums) and only
// used when that same set is selected again. A full row or column is 45.
function cellsOnLine(cells){return cells.length>=2&&(cells.every(i=>ROW(i)===ROW(cells[0]))||cells.every(i=>COL(i)===COL(cells[0])))}
function cageOfCells(cells){if(!cells.length)return -1;const ks=cagesOf[cells[0]]||[];for(const k of ks)if(cells.every(i=>cagesOf[i].includes(k)))return k;return -1}
function exactCageOfSel(){if(!sel.size)return -1;const k=cageOfCells([...sel]);return k>=0&&P.cages[k].cells.length===sel.size?k:-1}
function setOfSel(){
 if(sel.size<2)return null;
 const cells=[...sel].sort((a,b)=>a-b);
 const k=cageOfCells(cells);
 if(k<0&&!cellsOnLine(cells))return null;
 const ck=cells.join(','),derived=cellsOnLine(cells)&&cells.length===9?45:null,g=P.lineSums&&P.lineSums[ck];
 return {ck,cells,cageK:k,cage:k>=0?P.cages[k]:null,derived:derived!=null,sum:derived!=null?derived:(g&&g.sum!=null?g.sum:null),elim:(g&&g.elim)||[]}}
function ensureLine(L){P.lineSums=P.lineSums||{};let g=P.lineSums[L.ck];if(!g)g=P.lineSums[L.ck]={sum:null,elim:[]};return g}
// Σ target: one caged cell → the whole cage; an exact uncaged group (double-tap) or an
// exact whole cage → that group/cage; 2+ cells all in one cage or all on one line → just
// those cells (typed sum). Anything else → disabled.
// Thermos: an exact thermo selection (or one uncaged cell on a thermo) → the thermo's range sheet.
// Checked after exact cages/groups and before line/cage-subset sets.
function exactThermoOfSel(){if(sel.size<2)return -1;const i0=[...sel][0];for(const k of thermosOf[i0]||[]){const t=P.thermos[k];if(t.cells.length===sel.size&&t.cells.every(i=>sel.has(i)))return k}return -1}
// Arrows: an exact arrow (circle + shaft) or exact shaft selection, or one uncaged, non-thermo arrow cell → the ARROW sheet.
function exactArrowOfSel(){if(sel.size<1)return -1;const i0=[...sel][0];for(const k of arrowsOf[i0]||[]){const a=P.arrows[k],sh=a.cells.slice(a.b||1);
 for(const cs of [a.cells,sh])if(cs.length===sel.size&&cs.every(i=>sel.has(i))&&(sel.size>1||cs===sh))return k}return -1}
function calcTarget(){
 if(!sel.size)return null;
 if(sel.size===1){const i=[...sel][0],k=cageOfCells([i]);if(k>=0)return {type:'cage',k};const th=(thermosOf[i]||[])[0];if(th!=null)return {type:'thermo',k:th};const ar=(arrowsOf[i]||[])[0];return ar!=null?{type:'arrow',k:ar}:null}
 const G=selGroup();if(G)return {type:'group',G};
 const k=exactCageOfSel();if(k>=0)return {type:'cage',k};
 const th=exactThermoOfSel();if(th>=0)return {type:'thermo',k:th};
 const ar=exactArrowOfSel();if(ar>=0)return {type:'arrow',k:ar};
 const L=setOfSel();return L?{type:'set',L}:null}

// ---------- Storage ----------
let DB=LS('sdk_puzzles')||{};let curId=LS('sdk_cur');
if(!Object.keys(DB).length){const {p}=parsePuzzle(SAMPLE);DB[p.id]=p;curId=p.id}
for(const p of Object.values(DB)){p.extra=p.extra||[];p.thermos=p.thermos||[];p.arrows=(p.arrows||[]).map(a=>({cells:a.cells,b:a.b||1,elim:a.elim||[]}));p.kropki=p.kropki||[];p.kropkiNeg=!!p.kropkiNeg;p.groups=p.groups||{};p.lineSums=p.lineSums||{};p.sol=p.sol||null;p.cages.forEach(c=>c.elim=c.elim||[]);if(p.col)for(let i=0;i<81;i++)p.col[i]=normCol(p.col[i])}
if(!DB[curId])curId=Object.values(DB).sort((a,b)=>b.updated-a.updated)[0].id;
let P=DB[curId];
let saveT=null;const saveNow=()=>{clearTimeout(saveT);saveT=null;SV('sdk_puzzles',DB);SV('sdk_cur',curId)};
const save=()=>{P.updated=Date.now();saveNow()};

// ---------- Geometry / peers ----------
const ROW=i=>Math.floor(i/9),COL=i=>i%9,BOX=i=>Math.floor(ROW(i)/3)*3+Math.floor(COL(i)/3);
const HOUSES=[];for(let k=0;k<9;k++){HOUSES.push([...Array(9)].map((_,j)=>k*9+j));HOUSES.push([...Array(9)].map((_,j)=>j*9+k));HOUSES.push([...Array(9)].map((_,j)=>(Math.floor(k/3)*3+Math.floor(j/3))*9+(k%3)*3+j%3))}
let cagesOf=[],thermosOf=[],arrowsOf=[];function indexCages(){cagesOf=Array.from({length:81},()=>[]);thermosOf=Array.from({length:81},()=>[]);arrowsOf=Array.from({length:81},()=>[]);(P.arrows||[]).forEach((a,k)=>a.cells.forEach(i=>{if(!arrowsOf[i].includes(k))arrowsOf[i].push(k)}));P.cages.forEach((c,k)=>c.cells.forEach(i=>cagesOf[i].push(k)));(P.thermos||[]).forEach((t,k)=>t.cells.forEach(i=>{if(!thermosOf[i].includes(k))thermosOf[i].push(k)}))}
function peers(i){const s=new Set();for(let j=0;j<81;j++)if(j!==i&&(ROW(j)===ROW(i)||COL(j)===COL(i)||BOX(j)===BOX(i)))s.add(j);for(const k of cagesOf[i])for(const j of P.cages[k].cells)if(j!==i)s.add(j);for(const k of thermosOf[i]||[])for(const j of P.thermos[k].cells)if(j!==i)s.add(j);return s}
const valAt=i=>P.givens[i]||P.v[i];

// ---------- UI state ----------
let sel=new Set(),mode='v',editing=false,etab='cage',sumBuf='',editCage=-1,editLine=-1,arrowB=1,paused=false,numSel=0;let lastDotEdge=null;
let undoS=[],redoS=[];
const snap=()=>JSON.stringify({ar:P.arrows,kd:P.kropki,kn:P.kropkiNeg,th:P.thermos,gr:P.groups,ls:P.lineSums,g:P.givens,c:P.cages,v:P.v,cn:P.cn,mn:P.mn,col:P.col,s:P.solved});
function restore(s){const o=JSON.parse(s);Object.assign(P,{arrows:o.ar||[],kropki:o.kd||[],kropkiNeg:!!o.kn,thermos:o.th||[],groups:o.gr||{},lineSums:o.ls||{},givens:o.g,cages:o.c,v:o.v,cn:o.cn,mn:o.mn,col:o.col,solved:o.s})}
function act(fn){const before=snap();fn();const after=snap();if(after!==before){undoS.push(before);if(undoS.length>500)undoS.shift();redoS=[];save()}render()}
function undo(){if(!undoS.length)return;redoS.push(snap());restore(undoS.pop());save();editCage=-1;editLine=-1;render()}
function redo(){if(!redoS.length)return;undoS.push(snap());restore(redoS.pop());save();editCage=-1;editLine=-1;render()}

// ---------- Build static DOM (never rebuilt mid-tap) ----------
const grid=$('#grid'),cells=[];
for(let i=0;i<81;i++){const d=document.createElement('div');d.className='cell';cells.push(d);grid.appendChild(d)}
const pad=$('#pad');const padBtns=[];
for(let d=1;d<=9;d++){const b=document.createElement('button');b.dataset.d=d;b.innerHTML=`<span class="sw"></span><span class="n">${d}</span><span class="cpm minus" data-op="-">−</span><span class="cpm plus" data-op="+">+</span>`;pad.appendChild(b);padBtns.push(b)}
const sumPad=$('#sumPad');[1,2,3,4,5,6,7,8,9,0].forEach(d=>{const b=document.createElement('button');b.dataset.s=d;b.textContent=d;sumPad.appendChild(b)});
const sb=document.createElement('button');sb.dataset.s='bk';sb.textContent='⌫';sumPad.appendChild(sb);sumPad.style.gridTemplateColumns='repeat(6,1fr)';
const givPad=$('#givPad');for(let d=1;d<=9;d++){const b=document.createElement('button');b.dataset.g=d;b.textContent=d;givPad.appendChild(b)}
{const b=document.createElement('button');b.dataset.g=0;b.className='act';b.textContent='⌫ Clear';givPad.appendChild(b)}

// ---------- Rendering ----------
function pie(o){o=normCol(o);const cs=o.c;if(!cs.length)return'transparent';if(cs.length===1)return COLOURS[cs[0]-1];
 const n=cs.length,boost=o.b&&cs.includes(o.b)?o.b:0;
 const share=id=>boost?(id===boost?2/3:(1/3)/(n-1)):1/n;
 let acc=0;const stops=cs.map((id,k)=>{const a=acc;acc+=share(id);return `${COLOURS[id-1]} ${a*100}% ${k===cs.length-1?100:acc*100}%`});
 // Start 30° clockwise from 12 o'clock so a 50-50 split has its dividing line 30° from vertical; all pies use this start.
 return 'conic-gradient(from 30deg,'+stops.join(',')+')'}
let bad=new Set(),cageBad=new Set(),thermoBad=new Set(),arrowBad=new Set(),dotBad=new Set(),negBad=[];
// Thermo: digits at positions a<b need v[b]-v[a] >= b-a, and position k (of n) can only hold k+1 .. 9-(n-1-k).
function thermoConflicts(t,out){const cs=t.cells,n=cs.length;let broke=false;
 for(let a=0;a<n;a++){const va=valAt(cs[a]);if(!va)continue;
  if(va<a+1||va>9-(n-1-a)){out.add(cs[a]);broke=true}
  for(let b=a+1;b<n;b++){const vb=valAt(cs[b]);if(vb&&vb-va<b-a){out.add(cs[a]);out.add(cs[b]);broke=true}}}
 return broke}
// Arrow: unknown circle digits count as 1..9, empty shaft cells as 1..9. Broken when the shaft's
// smallest possible total is above the circle's largest, or its largest is below the circle's smallest
// (so a full arrow with the wrong sum, or a shaft that already adds up to the circle or more with cells left).
function arrowConflicts(a,out){const b=a.b||1,circ=a.cells.slice(0,b),sh=a.cells.slice(b);let lo=0,hi=0,s=0,e=0;
 for(const i of circ){const v=valAt(i);lo=lo*10+(v||1);hi=hi*10+(v||9)}
 for(const i of sh){const v=valAt(i);if(v)s+=v;else e++}
 if(s+e<=hi&&s+9*e>=lo)return false;
 for(const i of a.cells)if(valAt(i))out.add(i);return true}
function computeConflicts(){bad=new Set();cageBad=new Set();thermoBad=new Set();arrowBad=new Set();
 (P.arrows||[]).forEach((a,k)=>{if(arrowConflicts(a,bad))arrowBad.add(k)});dotBad=new Set();negBad=[];
 (P.kropki||[]).forEach((d,k)=>{const x=valAt(d.a),y=valAt(d.b);if(x&&y&&!dotOK(d.t,x,y)){dotBad.add(k);bad.add(d.a);bad.add(d.b)}});
 if(P.kropkiNeg)for(let i=0;i<81;i++)for(const j of [COL(i)<8?i+1:-1,i<72?i+9:-1]){if(j<0||dotAt(P,i,j)>=0)continue;const x=valAt(i),y=valAt(j);if(x&&y&&dotAny(x,y)){bad.add(i);bad.add(j);negBad.push([i,j])}}
 (P.thermos||[]).forEach((t,k)=>{if(thermoConflicts(t,bad))thermoBad.add(k)});
 const units=HOUSES.concat(P.cages.map(c=>c.cells));
 for(const u of units){const m={};for(const i of u){const v=valAt(i);if(v)(m[v]=m[v]||[]).push(i)}for(const k in m)if(m[k].length>1)m[k].forEach(i=>bad.add(i))}
 P.cages.forEach((c,k)=>{let s=0,f=0;for(const i of c.cells){const v=valAt(i);if(v){s+=v;f++}}if(s>c.sum||(f===c.cells.length&&s!==c.sum))cageBad.add(k)})}
function noteMark(d){return numSel&&+d===numSel?`<span class="nh">${d}</span>`:`<span>${d}</span>`}
function cellHTML(i){
 let h='';const v=valAt(i);
 if(normCol(P.col[i]).c.length)h+=`<div class="bg" style="background:${pie(P.col[i])}"></div>`;
 const anc=cagesOf[i].find(k=>P.cages[k].cells[0]===i);
 if(anc!==undefined)h+=`<span class="sum${cageBad.has(anc)?' bad':''}">${P.cages[anc].sum}</span>`;
 if(v)h+=`<span class="val">${v}</span>`;
 else{
  if(P.cn[i]){const d=[...P.cn[i]],t=Math.ceil(d.length/2),sp=a=>a.map(noteMark).join('');
   h+=`<div class="cn${anc!==undefined?' a':''}"><div>${sp(d.slice(0,t))}</div><div>${sp(d.slice(t))}</div></div>`}
  if(P.mn[i])h+=`<span class="mn m${P.mn[i].length}">${[...P.mn[i]].map(noteMark).join('')}</span>`;
 }
 return h}
let cellCache=Array(81).fill(null);
const solWrong=i=>!!(P.sol&&P.v[i]&&P.sol[i]&&P.v[i]!==P.sol[i]);
function renderCells(){computeConflicts();for(let i=0;i<81;i++){const h=cellHTML(i);if(cellCache[i]!==h){cells[i].innerHTML=h;cellCache[i]=h}cells[i].classList.toggle('given',!!P.givens[i]);cells[i].classList.toggle('bad',bad.has(i)||solWrong(i))}}
function renderLines(){
 const S=100,d=7;let g='';
 P.cages.forEach((c,k)=>{const set=new Set(c.cells);const IN=(r,cc)=>r>=0&&r<9&&cc>=0&&cc<9&&set.has(r*9+cc);let p='';
  for(const i of c.cells){const r=ROW(i),cc=COL(i),x0=cc*S,y0=r*S;
   if(!IN(r-1,cc)){const xs=IN(r,cc-1)?(IN(r-1,cc-1)?x0-d:x0):x0+d,xe=IN(r,cc+1)?(IN(r-1,cc+1)?x0+S+d:x0+S):x0+S-d;p+=`M${xs} ${y0+d}H${xe}`}
   if(!IN(r+1,cc)){const xs=IN(r,cc-1)?(IN(r+1,cc-1)?x0-d:x0):x0+d,xe=IN(r,cc+1)?(IN(r+1,cc+1)?x0+S+d:x0+S):x0+S-d;p+=`M${xs} ${y0+S-d}H${xe}`}
   if(!IN(r,cc-1)){const ys=IN(r-1,cc)?(IN(r-1,cc-1)?y0-d:y0):y0+d,ye=IN(r+1,cc)?(IN(r+1,cc-1)?y0+S+d:y0+S):y0+S-d;p+=`M${x0+d} ${ys}V${ye}`}
   if(!IN(r,cc+1)){const ys=IN(r-1,cc)?(IN(r-1,cc+1)?y0-d:y0):y0+d,ye=IN(r+1,cc)?(IN(r+1,cc+1)?y0+S+d:y0+S):y0+S-d;p+=`M${x0+S-d} ${ys}V${ye}`}}
  const hot=editing&&k===editCage,badc=cageBad.has(k);
  g+=`<path d="${p}" fill="none" stroke="${hot?'#2563eb':badc?'#dc2626':'#374151'}" stroke-width="${hot?5:2.6}" stroke-dasharray="${hot?'':'7 6'}"/>`});
 for(let k=1;k<9;k++){const w=k%3?1.5:5,c=k%3?'#9ca3af':'#111827';g+=`<path d="M${k*S} 0V900M0 ${k*S}H900" stroke="${c}" stroke-width="${w}"/>`}
 g+='<rect x="2.5" y="2.5" width="895" height="895" fill="none" stroke="#111827" stroke-width="5"/>';
 $('#lines').innerHTML=g}
// Kropki: small circles centred on the shared edge, in their own SVG above the cage lines.
// r=10 of a 100-unit cell, so they stay clear of the central digit and most notes.
function dotXY(d){return d.b-d.a===1?[COL(d.b)*100,ROW(d.a)*100+50]:[COL(d.a)*100+50,ROW(d.b)*100]}
function renderDots(){const el=$('#dots');if(!el)return;let g='';
 (P.kropki||[]).forEach((d,k)=>{const [x,y]=dotXY(d),bd=dotBad.has(k),hot=editing&&etab==='kropki'&&lastDotEdge&&lastDotEdge[0]===d.a&&lastDotEdge[1]===d.b;
  const fill=d.t==='b'?(bd?'#dc2626':'#111827'):'#fff',stroke=bd?'#dc2626':'#111827';
  if(hot)g+=`<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#2563eb" stroke-width="4"/>`;
  g+=`<circle cx="${x}" cy="${y}" r="10" fill="${fill}" stroke="${stroke}" stroke-width="${bd?4:2.6}"/>`});
 for(const [a,b] of negBad){const [x,y]=dotXY({a,b});g+=`<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#dc2626" stroke-width="3" stroke-dasharray="4 3"/>`}
 if(editing&&etab==='kropki'&&lastDotEdge&&dotAt(P,lastDotEdge[0],lastDotEdge[1])<0){const [x,y]=dotXY({a:lastDotEdge[0],b:lastDotEdge[1]});g+=`<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#2563eb" stroke-width="4" stroke-dasharray="6 5"/>`}
 el.innerHTML=g}
// Thermometers: a grey bulb + rounded line through cell centres, in their own SVG layer above the
// cells with mix-blend-mode:multiply (so digits, notes and colours show through) and below the cage outlines.
function thermoPath(cs){return cs.map((i,k)=>`${k?'L':'M'}${COL(i)*100+50} ${ROW(i)*100+50}`).join('')}
function thermoSVG(cs,col,op){if(!cs.length)return '';const b=cs[0];
 return `<g opacity="${op}"><circle cx="${COL(b)*100+50}" cy="${ROW(b)*100+50}" r="33" fill="${col}"/>`+(cs.length>1?`<path d="${thermoPath(cs)}" fill="none" stroke="${col}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`:'')+'</g>'}
// Arrows: SudokuPad-style grey ring (or pill) around the circle and a thin line with an open
// arrowhead through the shaft cell centres, under the cage outlines, multiplied so digits show through.
const AR_R=37;
function arrowSVG(cs,b,col){if(!cs.length)return '';b=Math.min(b||1,cs.length);const X=i=>COL(i)*100+50,Y=i=>ROW(i)*100+50;
 const circ=cs.slice(0,b),sh=cs.slice(b);let g='';
 const xs=circ.map(X),ys=circ.map(Y),x0=Math.min(...xs)-AR_R,y0=Math.min(...ys)-AR_R,w=Math.max(...xs)-Math.min(...xs)+2*AR_R,h=Math.max(...ys)-Math.min(...ys)+2*AR_R;
 g+=`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${AR_R}" ry="${AR_R}" fill="none" stroke="${col}" stroke-width="5"/>`;
 if(sh.length){let best=circ[0],bd=1e9;for(const c of circ){const d=Math.hypot(X(c)-X(sh[0]),Y(c)-Y(sh[0]));if(d<bd){bd=d;best=c}}
  const dx=X(sh[0])-X(best),dy=Y(sh[0])-Y(best),L=Math.hypot(dx,dy)||1,sx=X(best)+dx/L*AR_R,sy=Y(best)+dy/L*AR_R;
  const pts=[[sx,sy],...sh.map(i=>[X(i),Y(i)])];
  g+=`<path d="${pts.map((p,k)=>(k?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('')}" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;
  const [ex,ey]=pts[pts.length-1],[px,py]=pts[pts.length-2],ang=Math.atan2(ey-py,ex-px),hl=24,sp=0.62;
  const hp=s=>[ex-hl*Math.cos(ang+s*sp),ey-hl*Math.sin(ang+s*sp)];const [ax,ay]=hp(1),[bx,by]=hp(-1);
  g+=`<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}L${ex} ${ey}L${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`}
 return g}
function renderArrows(){const el=$('#arrows');if(!el)return;let g='';
 (P.arrows||[]).forEach((a,k)=>{const hot=editing&&etab==='arrow'&&k===editLine;g+=arrowSVG(a.cells,a.b,hot?'#3b82f6':arrowBad.has(k)?'#ef4444':'#9ca3af')});
 if(editing&&etab==='arrow'&&sel.size&&editLine<0)g+=arrowSVG([...sel],arrowB,'#3b82f6');
 el.innerHTML=g}
function renderThermos(){const el=$('#thermo');if(!el)return;let g='';
 (P.thermos||[]).forEach((t,k)=>{const hot=editing&&etab==='thermo'&&k===editLine;g+=thermoSVG(t.cells,hot?'#93c5fd':thermoBad.has(k)?'#fca5a5':'#c8ccd2',1)});
 if(editing&&etab==='thermo'&&sel.size&&editLine<0)g+=thermoSVG([...sel],'#93c5fd',1);
 el.innerHTML=g}
function selGroup(){if(!sel.size)return null;const b=BOX([...sel][0]);const G=groupOf(P,b);if(!G||G.cells.length!==sel.size||!G.cells.every(i=>sel.has(i)))return null;return G}
// Total follows the Σ target when there is one, so a single caged cell uses the cage
// sum (and the cage's size) rather than that one cell's digit. An exact typed set-sum
// (line or cage subset) is used alone, never added to cage or group totals. Otherwise:
//  • each fully-selected cage contributes its cage sum
//  • each fully-selected uncaged group with a known sum (derived or typed) contributes that sum
//  • any leftover selected cell (partial cage, or uncaged without a group total) contributes its placed digit
function selTotal(){
 const n=sel.size;if(!n)return {n:0,sum:null,known:false};
 const T=calcTarget();
 if(T&&T.type==='cage'){const c=P.cages[T.k];return {n:c.cells.length,sum:c.sum,known:true}}
 if(T&&T.type==='group'&&T.G.sum!=null)return {n,sum:T.G.sum,known:true};
 if(T&&T.type==='set'&&T.L.sum!=null)return {n,sum:T.L.sum,known:true};
 const covered=new Set();let sum=0;
 for(const c of P.cages)if(c.cells.every(i=>sel.has(i))){sum+=c.sum;c.cells.forEach(i=>covered.add(i))}
 for(let b=0;b<9;b++){const G=groupOf(P,b);if(!G||G.sum==null||!G.cells.every(i=>sel.has(i)))continue;
  if(G.cells.some(i=>covered.has(i)))continue;sum+=G.sum;G.cells.forEach(i=>covered.add(i))}
 for(const i of sel){if(covered.has(i))continue;const v=valAt(i);if(!v)return {n,sum:null,known:false};sum+=v}
 return {n,sum,known:true}}
function near45(sum){
 if(sum%45===0)return sum===45?'= 45':`= ${sum/45}×45`;
 if(sum<45)return `45−${45-sum}`;
 const lo=Math.floor(sum/45)*45,hi=lo+45;
 return `${lo}+${sum-lo} · ${hi}−${hi-sum}`}
function selInfoText(){
 if(!sel.size)return numSel?(multi?`Number ${numSel} locked (Multi) — tap ${numSel} to clear`:`Number ${numSel} — tap ${numSel} again to clear`):(P.kropkiNeg?'Tap a cell · all dots given':'Tap a cell to select');
 const t=selTotal(),T0=calcTarget();
 if(T0&&T0.type==='thermo'&&!(t.known&&sel.size>1))return `Thermo (${P.thermos[T0.k].cells.length} cells) — Σ for ranges`;
 if(T0&&T0.type==='arrow'&&!(t.known&&sel.size>1)){const a=P.arrows[T0.k];return `Arrow (circle + ${a.cells.length-(a.b||1)}) — Σ for sums`}
 if(t.known)return `Total ${t.sum} (${t.n} cell${t.n>1?'s':''})  ${near45(t.sum)}`;
 if(calcTarget())return `${sel.size} cell${sel.size>1?'s':''} — Σ to enter a sum`;
 return `${sel.size} cell${sel.size>1?'s':''}`}
function fitInfo(){const el=$('#infoTxt');el.style.fontSize='';let fs=15;while(el.scrollWidth>el.clientWidth&&fs>11){fs--;el.style.fontSize=fs+'px'}}
// Number selection (digit highlight): numSel is 1–9 or 0.
// It turns on when you tap a cell that already has a given or placed digit, when you
// tap the already-selected cell after placing a digit, or when you tap a pad key with
// no cell selected. Placing a digit into a selected cell does not turn it on.
// Multi-select or a single empty cell clears it. An empty selection from the status
// line or the pad leaves numSel alone.
// Multi on (v16) = highlight lock: selecting cells never changes numSel; only the pad (with no
// cells selected) sets or clears it, and placing digits keeps it.
function syncNumSel(){
 if(editing){numSel=0;return}
 if(multi)return;
 if(sel.size>1)numSel=0;
 else if(sel.size===1&&!valAt([...sel][0]))numSel=0}
function blockedCells(){const s=new Set();if(!numSel)return s;
 for(let i=0;i<81;i++)if(valAt(i)===numSel){
  for(let j=0;j<81;j++)if(j!==i&&(ROW(j)===ROW(i)||COL(j)===COL(i)||BOX(j)===BOX(i)))s.add(j);
  for(const k of cagesOf[i])for(const j of P.cages[k].cells)if(j!==i)s.add(j);
  for(const k of thermosOf[i])for(const j of P.thermos[k].cells)if(j!==i)s.add(j)}
 for(let i=0;i<81;i++)if(valAt(i)===numSel)s.delete(i);return s}
function hasPencil(i,n){if(!n||valAt(i))return false;const d=String(n);return P.cn[i].includes(d)||P.mn[i].includes(d)}
let paintedNum=-1;
function renderSel(){
 syncNumSel();
 if(paintedNum!==numSel){renderCells();paintedNum=numSel}
 const blocked=blockedCells();
 for(let i=0;i<81;i++){cells[i].classList.toggle('sel',sel.has(i));cells[i].classList.toggle('same',!!numSel&&valAt(i)===numSel);cells[i].classList.toggle('nmark',hasPencil(i,numSel));cells[i].classList.toggle('blocked',blocked.has(i))}
 padBtns.forEach((b,k)=>b.classList.toggle('nsel',mode!=='k'&&!editing&&numSel===k+1));
 pad.classList.toggle('hlmode',!editing&&mode!=='k'&&!sel.size);
 if(editing){if(etab==='thermo')renderThermos();if(etab==='arrow')renderArrows();$('#bPick').classList.add('hidden');$('#infoTxt').textContent=etab==='kropki'?`${(P.kropki||[]).length} dot${(P.kropki||[]).length===1?'':'s'} — tap an edge to cycle`:etab==='thermo'?(sel.size?(editLine>=0?`Editing thermo: ${sel.size} cells — tap cells to extend`:`${sel.size} cell${sel.size>1?'s':''} · bulb ${RC([...sel][0])}`):'Drag from the bulb to the tip'):etab==='arrow'?(sel.size?(editLine>=0?`Editing arrow: ${sel.size} cells — tap cells to extend`:sel.size<=arrowB?`Circle ${[...sel].map(RC).join(' ')} — now the shaft`:`Circle ${RC([...sel][0])} · shaft ${sel.size-arrowB}`):'Tap the circle, then the shaft'):sel.size?`${sel.size} cell${sel.size>1?'s':''} selected`:'Drag across cells to make a cage';$('#bCalc').classList.add('hidden');$('#bTest').disabled=true;return}
 $('#bCalc').classList.toggle('hidden',!FEATURES.calculator||mode==='k');$('#bPick').classList.toggle('hidden',mode!=='k');
 $('#infoTxt').textContent=selInfoText();
 $('#bCalc').disabled=!calcTarget();
 $('#bTest').disabled=!canTest();
 fitInfo();
}
function renderControls(){
 $$('.modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
 pad.classList.toggle('cmode',mode==='k');pad.classList.toggle('nmode',mode==='c'||mode==='m');pad.classList.toggle('hlmode',!editing&&mode!=='k'&&!sel.size);
 padBtns.forEach((b,k)=>{b.querySelector('.sw').style.background=mode==='k'?COLOURS[k]:'transparent'});
 $('#bErase').textContent=mode==='k'?'⌫ Colours':'⌫ Erase';
 $('#play').classList.toggle('hidden',editing);$('#edit').classList.toggle('hidden',!editing);
 $('#bEdit').textContent=editing?'✓':'✎';
 $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===etab));
 $('#eCage').classList.toggle('hidden',etab!=='cage');$('#eKropki').classList.toggle('hidden',etab!=='kropki');$('#bKNeg').classList.toggle('on',!!P.kropkiNeg);$('#bKNeg').setAttribute('aria-pressed',P.kropkiNeg?'true':'false');$('#eThermo').classList.toggle('hidden',etab!=='thermo');$('#eArrow').classList.toggle('hidden',etab!=='arrow');$('#bArCreate').textContent=editLine>=0?'Update arrow':'Create arrow';$('#bArDel').classList.toggle('hidden',editLine<0||etab!=='arrow');$('#bArB').textContent='Circle: '+arrowB;
 $('#bThCreate').textContent=editLine>=0?'Update thermo':'Create thermo';$('#bThDel').classList.toggle('hidden',editLine<0);$('#eGiv').classList.toggle('hidden',etab!=='giv');
 $('#sumBuf').textContent=sumBuf||'–';
 $('#bCreate').textContent=editCage>=0?'Update cage':'Create cage';$('#bDelCage').classList.toggle('hidden',editCage<0);
 $('#bUndo').disabled=$('#eUndo').disabled=!undoS.length;$('#bRedo').disabled=$('#eRedo').disabled=!redoS.length;
 $('#pname').textContent=P.name;
}
function render(){indexCages();syncNumSel();renderCells();paintedNum=numSel;renderLines();renderThermos();renderArrows();renderDots();renderSel();renderControls();if(editing)renderWarn();checkSolved()}

// ---------- Cage validation ----------
const minSum=n=>n*(n+1)/2,maxSum=n=>n*(19-n)/2;
function contiguous(cs){const s=new Set(cs),seen=new Set([cs[0]]),q=[cs[0]];while(q.length){const i=q.pop();for(const j of [i-9,i+9,COL(i)?i-1:-1,COL(i)<8?i+1:-1])if(s.has(j)&&!seen.has(j)){seen.add(j);q.push(j)}}return seen.size===s.size}
function cageWarnings(){const w=[];let caged=0,total=0;
 const over=[];for(let i=0;i<81;i++){if(cagesOf[i].length)caged++;if(cagesOf[i].length>1)over.push(RC(i))}
 if(over.length)w.push(`Cells in two cages: ${over.join(' ')}`);
 P.cages.forEach(c=>{total+=c.sum;const n=c.cells.length,a=RC(c.cells[0]);
  if(!contiguous(c.cells))w.push(`Cage ${c.sum} at ${a} isn't joined up`);
  if(n>9)w.push(`Cage at ${a} has ${n} cells (max 9)`);else if(c.sum<minSum(n)||c.sum>maxSum(n))w.push(`Cage at ${a}: ${n} cells can't make ${c.sum} (range ${minSum(n)}–${maxSum(n)})`);
  const gv=c.cells.map(i=>P.givens[i]).filter(Boolean);if(new Set(gv).size<gv.length)w.push(`Cage ${c.sum} at ${a} repeats a given`)});
 if(caged===81&&!over.length&&total!==405)w.push(`Cage sums total ${total}, should be 405`);
 (P.kropki||[]).forEach(d=>{const x=P.givens[d.a],y=P.givens[d.b];if(x&&y&&!dotOK(d.t,x,y))w.push(`${d.t==='w'?'White':'Black'} dot ${RC(d.a)}–${RC(d.b)} doesn't fit the givens`)});
 (P.thermos||[]).forEach(t=>{const why=thermoProblem(t.cells);if(why)w.push(why[0].toUpperCase()+why.slice(1))});
 (P.arrows||[]).forEach(a=>{const why=arrowProblem(a.cells,a.b);if(why)w.push(why[0].toUpperCase()+why.slice(1))});
 return {w,caged,total}}
function renderWarn(){const {w,caged,total}=cageWarnings();
 $('#warn').innerHTML=w.map(x=>`<div>⚠️ ${esc(x)}</div>`).join('')+`<div class="${caged===81&&!w.length?'ok':'muted'}">${P.cages.length} cages${P.thermos.length?` · ${P.thermos.length} thermo${P.thermos.length>1?'s':''}`:''}${(P.arrows||[]).length?` · ${P.arrows.length} arrow${P.arrows.length>1?'s':''}`:''}${(P.kropki||[]).length?` · ${P.kropki.length} dot${P.kropki.length>1?'s':''}${P.kropkiNeg?' (all given)':''}`:''} · ${caged}/81 cells caged · sums total ${total}${caged===81&&!w.length?' ✓':''}</div>`}

// ---------- Actions ----------
const editable=()=>[...sel].filter(i=>!P.givens[i]);
function nudge(el){el.classList.remove('nudge');void el.offsetWidth;el.classList.add('nudge')}
function toast(m){$$('.toast').forEach(x=>x.remove());const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
// Test: for each selected empty cell with centre marks, flash whether the solution digit is among them.
// Enabled only when the puzzle has a solution line and at least one such cell is selected. Does not change state.
function hasSolution(){return !!(P.sol&&P.sol.some(x=>x))}
function canTest(){return !editing&&hasSolution()&&[...sel].some(i=>!valAt(i)&&P.mn[i])}
let testT=0;
function clearTestFx(){if(testT){clearTimeout(testT);testT=0}$$('.testFx').forEach(x=>x.remove())}
function runTest(){
 if(!canTest()){nudge($('#bTest'));return}
 clearTestFx();
 const cs=[...sel].filter(i=>!valAt(i)&&P.mn[i]&&P.sol&&P.sol[i]);
 let ok=0,miss=0;
 for(const i of cs){
  const good=P.mn[i].includes(String(P.sol[i]));
  if(good)ok++;else miss++;
  const m=document.createElement('div');m.className='testFx '+(good?'ok':'bad');m.textContent=good?'✓':'✕';
  cells[i].appendChild(m);
 }
 const msg=cs.length?(miss?`Test: ${ok} ok, ${miss} missing`:`Test: ${ok} ok`):'Test: nothing to check';
 $('#infoTxt').textContent=msg;fitInfo();
 testT=setTimeout(()=>{const keep=$('#infoTxt').textContent===msg;clearTestFx();if(keep)renderSel()},1500);
}
function pressDigit(d,el){
 // No cell selected (and not in Colour mode): the pad selects / toggles that number's highlight.
 if(!editing&&!sel.size&&mode!=='k'){numSel=numSel===d?0:d;render();return}
 if(mode==='k'){pressColour(d,true,el);return}
 const cs=editable();if(!cs.length){if(el)nudge(el);return}
 act(()=>{
  if(mode==='v'){const all=cs.every(i=>P.v[i]===d);
   if(!all)lastPlace=cs[cs.length-1];
   for(const i of cs){if(all)P.v[i]=0;else{P.v[i]=d;for(const j of peers(i)){P.cn[j]=P.cn[j].replace(String(d),'');P.mn[j]=P.mn[j].replace(String(d),'')}}}
   if(!multi)numSel=0;tapSeq.cell=-1} // placing does not enter number-highlight mode; break any pending double-tap
  else if(mode==='c'||mode==='m'){const A=mode==='c'?P.cn:P.mn,t=cs.filter(i=>!P.v[i]);if(!t.length)return;const all=t.every(i=>A[i].includes(d));
   for(const i of t){const s=new Set(A[i]);all?s.delete(String(d)):s.add(String(d));A[i]=[...s].sort().join('')}
   tapSeq.cell=-1}
 })}
// Colour pad: '+' adds a new colour (unboosted) or boosts one already in the cell (moving any existing boost).
// '+' on an already-boosted colour does nothing. '−' un-boosts a boosted colour, or removes an unboosted one.
function pressColour(d,add,el){
 if(!sel.size){if(el)nudge(el);return}
 act(()=>{
  let full=0;
  for(const i of sel){
   const o=normCol(P.col[i]);
   if(add){
    if(!o.c.includes(d)){if(o.c.length>=MAXCOL){full++;continue}o.c.push(d);o.c.sort((a,b)=>a-b)}
    else if(o.b!==d)o.b=d;
   }else{
    if(!o.c.includes(d))continue;
    if(o.b===d)o.b=0;
    else{o.c=o.c.filter(x=>x!==d);if(!o.c.includes(o.b))o.b=0}
   }
   P.col[i]=o;
  }
  if(full)toast(`Max ${MAXCOL} colours per cell`);
 })
}
function erase(){const cs=editable();if(mode==='k'){clearColours();return}
 act(()=>{if(cs.some(i=>P.v[i]))cs.forEach(i=>P.v[i]=0);else if(cs.some(i=>P.cn[i]||P.mn[i]))cs.forEach(i=>{P.cn[i]='';P.mn[i]=''});else [...sel].forEach(i=>P.col[i]={c:[],b:0})})}
function clearColours(){act(()=>[...sel].forEach(i=>P.col[i]={c:[],b:0}))}
let lastPlace=40,celebT=0,celebRAF=0;
function reducedMotion(){return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches}
function checkSolved(){if(P.solved||editing)return;for(let i=0;i<81;i++)if(!valAt(i)||solWrong(i))return;if(bad.size||cageBad.size)return;P.solved=true;save();celebrate()}
function endCeleb(){
 clearTimeout(celebT);if(celebRAF)cancelAnimationFrame(celebRAF);celebRAF=0;
 grid.classList.remove('celeb-wave');cells.forEach(c=>c.style.removeProperty('--wave'));
 const fx=$('#celebFx');if(fx){const c=fx.getContext('2d');c&&c.clearRect(0,0,fx.width,fx.height)}
 const el=$('#celeb');if(!el)return;el.classList.add('hidden');el.classList.remove('shown','card-on');el.setAttribute('aria-hidden','true')}
const CELEB_WAVE_STEP=110,CELEB_CARD_PAD=2000,CELEB_FX_MS=7000;
function startConfetti(){
 const canvas=$('#celebFx');if(!canvas)return;const ctx=canvas.getContext('2d');
 const rec=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.max(1,rec.width*dpr);canvas.height=Math.max(1,rec.height*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 const w=rec.width,h=rec.height;
 const g=grid.getBoundingClientRect();
 const cellXY=i=>({x:g.left-rec.left+(COL(i)+.5)*g.width/9,y:g.top-rec.top+(ROW(i)+.5)*g.height/9});
 const origin=cellXY(lastPlace);
 const cols=['#1e3a8a','#f59e0b','#fde68a','#2563eb','#ffffff','#b91c1c','#93c5fd'];
 const parts=[];
 const fountain=(ox,oy,n,born)=>{
  for(let i=0;i<n;i++){
   const a=-Math.PI/2+(Math.random()-.5)*Math.PI,sp=7+Math.random()*11;
   parts.push({x:ox+(Math.random()-.5)*36,y:oy+(Math.random()-.5)*18,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,w:4+Math.random()*4,h:6+Math.random()*7,rot:Math.random()*Math.PI,vr:(Math.random()-.5)*.28,col:cols[i%cols.length],born,life:2400});
  }
 };
 const firework=(ox,oy,n,born)=>{
  for(let i=0;i<n;i++){
   const a=Math.random()*Math.PI*2,sp=3+Math.random()*10;
   parts.push({x:ox,y:oy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1.2,w:3+Math.random()*4,h:5+Math.random()*7,rot:Math.random()*Math.PI,vr:(Math.random()-.5)*.35,col:cols[(i+3)%cols.length],born,life:2600});
  }
 };
 fountain(origin.x,origin.y,110,0);
 const t0=performance.now();let b2=false,b3=false;
 const tick=t=>{
  const age=t-t0;
  if(!b2&&age>1500){b2=true;firework(origin.x,origin.y-24,90,age);firework(w*0.28,h*0.32,55,age)}
  if(!b3&&age>2900){b3=true;firework(w*0.5,h*0.26,80,age);firework(w*0.72,h*0.36,55,age)}
  ctx.clearRect(0,0,w,h);
  for(const p of parts){
   if(age<p.born)continue;
   const local=age-p.born;
   p.vy+=0.18;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.vx*=0.995;
   const fade=p.life*0.68,a=local<fade?1:Math.max(0,1-(local-fade)/(p.life-fade));if(a<=0)continue;
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=a;ctx.fillStyle=p.col;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
  }
  if(age<CELEB_FX_MS)celebRAF=requestAnimationFrame(tick);else{ctx.clearRect(0,0,w,h);celebRAF=0}
 };
 celebRAF=requestAnimationFrame(tick)}
function celebrate(){
 sel.clear();numSel=0;renderSel();
 const el=$('#celeb');if(!el)return;
 const showCard=()=>{
  $('#celebName').textContent=P.name||'Puzzle';
  const msgs=['Nice.','Beautifully done.','A clean finish.','Well spotted.','That was a good one.'];
  $('#celebMsg').textContent=msgs[Math.abs((P.time|0)+lastPlace)%msgs.length];
  $('#celebTime').textContent=fmtT(P.time);
  el.classList.add('shown','card-on');
 };
 el.classList.remove('hidden');el.setAttribute('aria-hidden','false');
 if(reducedMotion()){el.classList.add('shown');showCard();return}
 const or=ROW(lastPlace),oc=COL(lastPlace);let max=0;
 for(let i=0;i<81;i++){const d=Math.max(Math.abs(ROW(i)-or),Math.abs(COL(i)-oc));cells[i].style.setProperty('--wave',(d*CELEB_WAVE_STEP)+'ms');if(d>max)max=d}
 grid.classList.add('celeb-wave');startConfetti();
 celebT=setTimeout(showCard,max*CELEB_WAVE_STEP+CELEB_CARD_PAD)}
$('#celebClose').onclick=()=>endCeleb();
$('#celebList').onclick=()=>{endCeleb();showList()};

// A cell is "fully" one colour when it has exactly one colour (no other slices). Boost does not matter.
function fullColour(i){const o=normCol(P.col[i]);return o.c.length===1?o.c[0]:0}
function cellsOfFullColour(d){const h=[];if(!d)return h;for(let i=0;i<81;i++)if(fullColour(i)===d)h.push(i);return h}

// ---------- Grid pointer: tap / drag select, double/triple tap, multi-select ----------
// Single tap acts instantly; a 2nd tap on the same cell within TAP_MS of the previous tap
// (gap from the previous pointerup to this pointerdown) upgrades to the cage (or box if no cage),
// a 3rd upgrades to the 3x3 box. In Colour mode, a double-tap on a cell that is fully one colour
// selects every cell fully shaded that same colour instead. In Multi mode taps toggle cells; double/triple taps add the group — unless
// the double-tapped cell was already selected *before* the first tap, in which case the group is removed.
const TAP_MS=250;
// Groups reached by repeated taps on one cell, in order: its cage, then any thermo(s) through it,
// then (for an uncaged cell) the box's uncaged group, then the whole box. Double-tap = first,
// triple = second, and so on; extra taps stay on the last. Without thermos this is the old cage/group → box.
function tapGroups(i){const L=[];for(const k of cagesOf[i])L.push(P.cages[k].cells);
 for(const k of thermosOf[i])L.push(P.thermos[k].cells);
 for(const k of arrowsOf[i])L.push(P.arrows[k].cells);
 if(!cagesOf[i].length)L.push(BOXCELLS(i).filter(j=>!cagesOf[j].length));
 L.push(BOXCELLS(i));const seen=new Set();return L.filter(g=>{const key=[...g].sort((a,b)=>a-b).join(',');if(seen.has(key))return false;seen.add(key);return true})}
let gp=null,multi=false,tapSeq={cell:-1,t:0,n:0,base:null};
const BOXCELLS=i=>HOUSES[BOX(i)*3+2];
function cellAt(x,y){const r=grid.getBoundingClientRect();const c=Math.floor((x-r.left)/r.width*9),w=Math.floor((y-r.top)/r.height*9);return c<0||c>8||w<0||w>8?-1:w*9+c}
// Kropki editor: the nearest interior edge to the tap point (outer border ignored).
function edgeAt(x,y){const r=grid.getBoundingClientRect(),fx=(x-r.left)/r.width*9,fy=(y-r.top)/r.height*9;
 if(fx<0||fx>9||fy<0||fy>9)return null;const vx=Math.round(fx),hy=Math.round(fy),dv=Math.abs(fx-vx),dh=Math.abs(fy-hy);
 const okV=vx>=1&&vx<=8,okH=hy>=1&&hy<=8;
 if(okV&&(!okH||dv<=dh)){const row=Math.min(8,Math.floor(fy));return [row*9+vx-1,row*9+vx]}
 if(okH){const col=Math.min(8,Math.floor(fx));return [(hy-1)*9+col,hy*9+col]}return null}
function cycleDot(a,b){const k=dotAt(P,a,b),cur=k>=0?P.kropki[k].t:'',nxt=cur===''?'w':cur==='w'?'b':'';lastDotEdge=[a,b];act(()=>{setDot(P,a,b,nxt);P.solved=false})}
grid.addEventListener('pointerdown',e=>{if(editing&&etab==='kropki'){e.preventDefault();const ed=edgeAt(e.clientX,e.clientY);if(ed)cycleDot(ed[0],ed[1]);return}
 const i=cellAt(e.clientX,e.clientY);if(i<0)return;e.preventDefault();
 if(editing&&(etab==='thermo'||etab==='arrow')){gp={id:e.pointerId,start:i,last:i,moved:false,thermo:true,fresh:!sel.size,added:false};try{grid.setPointerCapture(e.pointerId)}catch(_){}
  if(!sel.size){editLine=-1;sel=new Set([i])}else if(!sel.has(i)){sel.add(i);gp.added=true}
  renderSel();renderControls();return}
 const add=multi||e.shiftKey||e.metaKey||e.ctrlKey;const now=Date.now();
 const rep=!editing&&tapSeq.cell===i&&now-tapSeq.t<TAP_MS;
 // Tap an already-selected single cell (not Multi, not editing):
 //  • if it has a digit and number-highlight is off → turn highlight on, stay selected
 //  • otherwise deselect and clear highlight (grid back to normal)
 // A second tap within TAP_MS of the previous one is still a double-tap (cage/box).
 const already=!editing&&!add&&sel.size===1&&sel.has(i);
 if(!rep)tapSeq={cell:i,t:now,n:0,base:new Set(sel)};
 gp={id:e.pointerId,start:i,moved:false,wasOnly:sel.size===1&&sel.has(i),wasSel:sel.has(i),add,rep,already};
 try{grid.setPointerCapture(e.pointerId)}catch(_){}
 if(rep)return; // upgrade happens on pointerup
 if(already){const v=valAt(i);if(v&&numSel!==v){numSel=v;renderSel();return}sel.clear();numSel=0;renderSel();return}
 if(!add)sel=new Set();sel.add(i);
 if(!editing&&!add)numSel=valAt(i)||0; // selecting a cell that already has a digit turns highlight on
 renderSel()});
// Thermo drawing only takes a cell when the finger is near its centre, so a diagonal drag doesn't clip the corner cells.
function nearCentre(x,y){const r=grid.getBoundingClientRect(),fx=(x-r.left)/r.width*9,fy=(y-r.top)/r.height*9;return Math.hypot(fx-Math.floor(fx)-.5,fy-Math.floor(fy)-.5)<.36}
grid.addEventListener('pointermove',e=>{if(!gp||e.pointerId!==gp.id)return;const i=cellAt(e.clientX,e.clientY);
 if(gp.thermo){if(i<0||i===gp.last||!nearCentre(e.clientX,e.clientY))return;gp.last=i;gp.moved=true;if(!sel.has(i)){sel.add(i);renderSel()}return}if(i<0||i===gp.last)return;gp.last=i;if(i!==gp.start){gp.moved=true;tapSeq.cell=-1}if(!sel.has(i)){sel.add(i);renderSel()}});
function endGP(e){if(!gp||(e&&e.pointerId!=null&&e.pointerId!==gp.id))return;const g=gp;gp=null;
 if(g.thermo){const i=g.start;
  if(!g.moved){
   const OF=etab==='arrow'?arrowsOf:thermosOf,LST=etab==='arrow'?P.arrows:P.thermos;
   if(g.fresh&&OF[i].length){const k=OF[i][0];editLine=k;sel=new Set(LST[k].cells);if(etab==='arrow')arrowB=LST[k].b||1}
   else if(!g.added&&!g.fresh&&[...sel].pop()===i){sel.delete(i);if(!sel.size)editLine=-1}}
  renderThermos();renderArrows();renderSel();renderControls();return}
 if(g.moved){if(editing&&editCage>=0){editCage=-1;sumBuf='';renderLines();renderControls()}renderSel();return}
 if(g.rep){tapSeq.n++;tapSeq.t=Date.now();const i=g.start,ks=cagesOf[i];let grp;
  const full=(mode==='k'&&tapSeq.n===1)?fullColour(i):0;
  if(full)grp=cellsOfFullColour(full);
  else{const L=tapGroups(i);grp=L[Math.min(tapSeq.n-1,L.length-1)]}
  // Use tapSeq.base (selection before the first tap): the first tap of a double-tap may already have toggled/deselected the cell.
  if(multi&&tapSeq.n===1&&tapSeq.base.has(i)){sel=new Set(tapSeq.base);for(const j of grp)sel.delete(j)}
  else sel=new Set([...(multi?tapSeq.base:[]),...grp]);
  renderSel();return}
 tapSeq.t=Date.now();
 if(g.already){renderSel();return}
 if(editing&&etab==='cage'&&!g.add){const ks=cagesOf[g.start];if(ks.length){const k=ks[0];editCage=k;sel=new Set(P.cages[k].cells);sumBuf=String(P.cages[k].sum);renderLines();renderSel();renderControls();return}}
 if(g.add){if(g.wasSel)sel.delete(g.start)}else if(g.wasOnly)sel.clear();
 if(editing&&editCage>=0){editCage=-1;sumBuf='';renderLines();renderControls()}
 renderSel()}
['pointerup','pointercancel','lostpointercapture'].forEach(t=>grid.addEventListener(t,endGP));
// iOS: block pinch/double-tap zoom everywhere (Safari ignores user-scalable=no)
grid.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
let lastTE=0;document.addEventListener('touchend',e=>{const now=Date.now();
 if(now-lastTE<400&&!e.target.closest('textarea,input')){e.preventDefault();const b=e.target.closest('button,.combo,.arow,#infoTxt');if(b&&!b.disabled&&!b.dataset.lp){const inner=e.target.closest('.cpm');(inner||b).click()}}
 lastTE=now},{passive:false});

// ---------- Multi-select + select-by-colour ----------
function setMulti(on){multi=on;const b=$('#bMulti');b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')}
$('#bMulti').onclick=()=>setMulti(!multi);
let pickColour=false;
function setPick(on){pickColour=on;$('#bPick').classList.toggle('on',on);$('#bPick').textContent=on?'Tap a colour…':'◎ Select colour';pad.classList.toggle('picking',on)}
$('#bPick').onclick=()=>setPick(!pickColour);
// Tap the status line to drop the cell selection (number highlight stays). A quick second tap on a cell is a double-tap (cage/box), so this is the reliable way to get to 'no cell selected' without waiting for the double-tap window.
$('#infoTxt').addEventListener('click',()=>{if(editing||!sel.size)return;sel.clear();renderSel()});
const CNAMES=['red','orange','yellow','green','teal','blue','purple','pink','grey'];
function selectColour(d){const hit=[];for(let i=0;i<81;i++)if(normCol(P.col[i]).c.includes(d))hit.push(i);
 sel=new Set([...(multi?sel:[]),...hit]);setPick(false);if(!hit.length)toast(`No ${CNAMES[d-1]} cells`);renderSel()}
// long-press a colour key (Colour mode) = select all cells with that colour
padBtns.forEach(b=>{let t=null;
 b.addEventListener('pointerdown',()=>{delete b.dataset.lp;if(mode!=='k')return;t=setTimeout(()=>{t=null;b.dataset.lp='1';selectColour(+b.dataset.d)},500)});
 const cancel=()=>{if(t){clearTimeout(t);t=null}};['pointerup','pointercancel','pointerleave'].forEach(x=>b.addEventListener(x,cancel));
 b.addEventListener('contextmenu',e=>e.preventDefault())});

// ---------- Controls ----------
$$('.modes button').forEach(b=>b.onclick=()=>{mode=b.dataset.m;if(mode!=='k')setPick(false);renderControls();renderSel()});
padBtns.forEach(b=>b.onclick=e=>{if(b.dataset.lp){delete b.dataset.lp;return}if(mode==='k'&&pickColour){selectColour(+b.dataset.d);return}
 if(mode==='k'){pressColour(+b.dataset.d,!e.target.closest('.cpm.minus'),b);return}
 pressDigit(+b.dataset.d,b)});
$('#bErase').onclick=erase;$('#bTest').onclick=runTest;$('#bUndo').onclick=$('#eUndo').onclick=undo;$('#bRedo').onclick=$('#eRedo').onclick=redo;
$('#bEdit').onclick=()=>setEditing(!editing);$('#bDone').onclick=()=>setEditing(false);
function setEditing(on){editing=on;lastDotEdge=null;editCage=-1;editLine=-1;sumBuf='';if(on)sel.clear();render()}
$('#bKNeg').onclick=()=>act(()=>{P.kropkiNeg=!P.kropkiNeg;P.solved=false});
$$('.tabs button').forEach(b=>b.onclick=()=>{etab=b.dataset.t;lastDotEdge=null;editCage=-1;editLine=-1;sumBuf='';sel.clear();render()});
$('#bThCreate').onclick=()=>{const cs=[...sel],why=thermoProblem(cs);if(why){nudge($('#bThCreate'));toast(cs.length<2?'Drag from the bulb to the tip first':why);return}
 const k=editLine;act(()=>{if(k>=0)P.thermos[k].cells=cs;else P.thermos.push({cells:cs})});sel.clear();editLine=-1;render()};
$('#bThDel').onclick=()=>{if(editLine<0)return;const k=editLine;act(()=>P.thermos.splice(k,1));editLine=-1;sel.clear();render()};
$('#bThClear').onclick=()=>{sel.clear();editLine=-1;render()};
$('#bArCreate').onclick=()=>{const cs=[...sel],why=arrowProblem(cs,arrowB);if(why){nudge($('#bArCreate'));toast(cs.length<=arrowB?'Tap the circle, then the shaft cells':why);return}
 const k=editLine,b=arrowB;act(()=>{if(k>=0)P.arrows[k]={cells:cs,b};else P.arrows.push({cells:cs,b});P.solved=false});sel.clear();editLine=-1;render()};
$('#bArDel').onclick=()=>{if(editLine<0)return;const k=editLine;act(()=>P.arrows.splice(k,1));editLine=-1;sel.clear();render()};
$('#bArClear').onclick=()=>{sel.clear();editLine=-1;arrowB=1;render()};
$('#bArB').onclick=()=>{arrowB=arrowB%3+1;renderArrows();renderSel();renderControls()};
sumPad.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const s=b.dataset.s;
 if(s==='bk')sumBuf=sumBuf.slice(0,-1);else if(sumBuf.length<2&&!(sumBuf===''&&s==='0'))sumBuf+=s;else nudge(b);renderControls()});
$('#bCreate').onclick=()=>{const n=+sumBuf;if(!sel.size||!n||n>45){nudge($('#bCreate'));toast(!sel.size?'Select cells first':'Enter a sum (1–45)');return}
 const cellsSel=[...sel].sort((a,b)=>a-b);
 act(()=>{if(editCage>=0){const c=P.cages[editCage];c.sum=n;if(c.cells.join()!==cellsSel.join()){c.cells=cellsSel;c.elim=[]}}else P.cages.push({sum:n,cells:cellsSel,elim:[]});P.cages.sort((a,b)=>a.cells[0]-b.cells[0])});
 sel.clear();sumBuf='';editCage=-1;render()};
$('#bDelCage').onclick=()=>{if(editCage<0)return;const k=editCage;act(()=>P.cages.splice(k,1));editCage=-1;sel.clear();sumBuf='';render()};
givPad.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=+b.dataset.g;if(!sel.size){nudge(b);return}
 act(()=>{const all=d&&[...sel].every(i=>P.givens[i]===d);for(const i of sel){P.givens[i]=all?0:d;P.v[i]=0}P.solved=false})});

// ---------- Cage-sum calculator ----------
function combos(n,sum){const out=[];(function rec(start,left,acc,s){if(left===0){if(s===sum)out.push(acc.join(''));return}for(let d=start;d<=9;d++){if(s+d>sum)break;rec(d+1,left-1,[...acc,d],s+d)}})(1,n,[],0);return out}
// A subset combo fits its parent cage if some remaining cage combo contains those digits
// and the leftover digits can hold any digits already placed in the rest of the cage.
function subsetFitsCage(cage,cells,combo){
 if(!cage)return true;
 const need=[...combo],rest=cage.cells.filter(i=>!cells.includes(i)).map(valAt).filter(Boolean).map(String);
 const list=combos(cage.cells.length,cage.sum).filter(x=>!(cage.elim||[]).includes(x));
 return list.some(c=>need.every(d=>c.includes(d))&&rest.every(d=>[...c].filter(x=>!need.includes(x)).includes(d)))
}
// spec: {cells, sum (null = unknown), editable, elim(), toggle(x), setSum(n), allow?(combo)}
function openCalc(spec){
 const placed=[...new Set(spec.cells.map(valAt).filter(Boolean))],n=spec.cells.length;
 const ok=x=>placed.every(d=>x.includes(String(d)))&&(!spec.allow||spec.allow(x));
 const grey=spec.allow?" Grey = can't contain the digits already placed, or doesn't fit the cage.":" Grey = can't contain the digits already placed.";
 $('#mbox').innerHTML=`<h2 class="ch">SUM: ${spec.editable?`<input id="cSum" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${spec.sum||''}" placeholder="?">`:spec.sum}</h2><div class="muted" id="cMeta"></div><div id="cList"></div>
 <p class="muted cnote">Tap to rule out (tap again to restore).${grey}${spec.note||''}</p><div class="r"><button class="btn" id="mClose">Close</button></div>`;
 const draw=()=>{const sum=spec.sum,list=sum?combos(n,sum):[],el=spec.elim();
  const live=list.filter(x=>!el.includes(x)&&ok(x)).length;
  $('#cMeta').textContent=`${n} cell${n>1?'s':''}`+(sum?` · ${list.length} combination${list.length===1?'':'s'}${list.length?` · ${live} still possible`:''}`:'');
  const cols=list.length<=5||n>=7?1:list.length<=10||n>=6?2:3;
  $('#cList').className='clist c'+cols;
  $('#cList').innerHTML=!sum?'<p class="muted">Enter the sum to see combinations.</p>':list.length?list.map(x=>`<button class="combo${el.includes(x)?' off':''}${ok(x)?'':' imp'}" data-x="${x}">${[...x].map(d=>`<span>${d}</span>`).join('')}</button>`).join(''):'<p class="err">No combination of different digits makes this sum.</p>'};
 draw();showModal();$('#mClose').onclick=closeModal;
 const inp=$('#cSum');if(inp)inp.addEventListener('input',()=>{const v=parseInt(inp.value);const nv=v>=1&&v<=45?v:null;if(nv===spec.sum)return;const before=snap();spec.setSum(nv);undoS.push(before);redoS=[];save();draw();renderSel();renderControls()});
 $('#cList').onclick=e=>{const b=e.target.closest('.combo');if(!b)return;const before=snap();spec.toggle(b.dataset.x);undoS.push(before);redoS=[];save();draw();renderControls()}}
function openCalculator(k){const c=P.cages[k];if(!c)return;
 openCalc({cells:c.cells,sum:c.sum,editable:false,elim:()=>c.elim,toggle:x=>{c.elim.includes(x)?c.elim.splice(c.elim.indexOf(x),1):c.elim.push(x)}})}
function openGroupCalc(G){const spec={cells:G.cells,sum:G.sum,editable:!G.derived,
 note:G.derived?'':' Type the sum above — a cage crosses this box, so it can\'t be worked out.',
 elim:()=>{const g=P.groups[G.key];return g&&g.cells===G.ck&&g.dsum===G.dsum?g.elim:[]},
 toggle:x=>{const g=ensureGroup(P,G);g.elim.includes(x)?g.elim.splice(g.elim.indexOf(x),1):g.elim.push(x)},
 setSum:nv=>{const g=ensureGroup(P,G);if(g.sum!==nv){g.sum=nv;g.elim=[]}spec.sum=nv}};openCalc(spec)}
function openLineCalc(L){const spec={cells:L.cells,sum:L.sum,editable:!L.derived,
 note:L.derived?'':(L.cage?' Type the sum for these cells of the cage — used in Total only when you select this exact set again.':' Type the sum for these cells — it is used in Total only when you select this exact set again.'),
 allow:L.cage?x=>subsetFitsCage(L.cage,L.cells,x):null,
 elim:()=>{const g=P.lineSums&&P.lineSums[L.ck];return (g&&g.elim)||[]},
 toggle:x=>{const g=ensureLine(L);g.elim.includes(x)?g.elim.splice(g.elim.indexOf(x),1):g.elim.push(x)},
 setSum:nv=>{const g=ensureLine(L);if(g.sum!==nv){g.sum=nv;g.elim=[]}spec.sum=nv}};openCalc(spec)}
// Thermo sheet: each cell's possible range from its position (bulb of n cells: 1..10-n), narrowed by
// digits already placed on the thermo (each step up needs at least +1).
function thermoRanges(t){const cs=t.cells,n=cs.length,lo=[],hi=[];
 for(let k=0;k<n;k++){lo[k]=k+1;hi[k]=9-(n-1-k);const v=valAt(cs[k]);if(v){lo[k]=Math.max(lo[k],v);hi[k]=Math.min(hi[k],v)}}
 for(let k=1;k<n;k++)lo[k]=Math.max(lo[k],lo[k-1]+1);
 for(let k=n-2;k>=0;k--)hi[k]=Math.min(hi[k],hi[k+1]-1);
 return cs.map((i,k)=>({i,lo:lo[k],hi:hi[k],v:valAt(i)}))}
function openThermoCalc(k){const t=P.thermos[k];if(!t)return;const rs=thermoRanges(t),bad=rs.some(r=>r.lo>r.hi);
 const row=(r,k)=>`<div class="trow${r.lo>r.hi?' tbad':''}"><span class="tpos">${k===0?'Bulb':k===rs.length-1?'Tip':'Cell '+(k+1)}</span><span class="tcell">${RC(r.i)}</span><span class="trng">${r.v?`<b>${r.v}</b> placed`:r.lo>r.hi?'no digit fits':r.lo===r.hi?`must be <b>${r.lo}</b>`:`<b>${r.lo}–${r.hi}</b>`}</span></div>`;
 $('#mbox').innerHTML=`<h2>THERMO</h2><div class="muted">${rs.length} cells · digits increase from the bulb</div><div class="tlist">${rs.map(row).join('')}</div>
 <p class="muted cnote">Ranges come from the thermo's length and the digits already placed on it.${bad?' <b style="color:#b91c1c">Placed digits break the thermo.</b>':''}</p><div class="r"><button class="btn" id="mClose">Close</button></div>`;
 showModal();$('#mClose').onclick=closeModal}
$('#bCalc').onclick=()=>{const T=calcTarget();if(!T)return;if(T.type==='thermo'){openThermoCalc(T.k);return}if(T.type==='arrow'){openArrowCalc(T.k);return}if(T.type==='cage')openCalculator(T.k);else if(T.type==='group')openGroupCalc(T.G);else openLineCalc(T.L)};
// ARROW sheet: for each circle value still possible, the shaft digit sets that make it. Candidates
// per cell are 1–9 minus digits already placed in its row, column, box, cage or thermo; shaft cells
// that see each other (row/column/box/cage) must differ, others may repeat.
function sees(a,b){return a!==b&&(ROW(a)===ROW(b)||COL(a)===COL(b)||BOX(a)===BOX(b)||cagesOf[a].some(k=>cagesOf[b].includes(k)))}
function arrowOptions(a){const b=a.b||1,cs=a.cells,n=cs.length;
 const cand=cs.map(i=>{const v=valAt(i);if(v)return [v];const used=new Set();for(const j of peers(i)){const w=valAt(j);if(w)used.add(w)}return [1,2,3,4,5,6,7,8,9].filter(d=>!used.has(d))});
 const S=cs.map((i,x)=>cs.map((j,y)=>y<x&&sees(i,j)).map((f,y)=>f?y:-1).filter(y=>y>=0));
 const res=new Map(),asg=Array(n);let nodes=0,capped=false;
 const shMin=k=>{let m=0;for(let x=k;x<n;x++)m+=Math.min(...cand[x]);return m},shMax=k=>{let m=0;for(let x=k;x<n;x++)m+=Math.max(...cand[x]);return m};
 const mins=[],maxs=[];for(let k=0;k<=n;k++){mins[k]=k<b?0:shMin(k);maxs[k]=k<b?0:shMax(k)}
 (function rec(k,circle,sum){if(capped)return;if(++nodes>400000){capped=true;return}
  if(k<b){for(const d of cand[k]){if(S[k].some(y=>asg[y]===d))continue;asg[k]=d;rec(k+1,circle*10+d,0)}return}
  if(sum+mins[k]>circle||sum+maxs[k]<circle)return;
  if(k===n){const key=asg.slice(b).slice().sort((p,q)=>p-q).join('+');if(!res.has(circle))res.set(circle,new Set());res.get(circle).add(key);return}
  for(const d of cand[k]){if(S[k].some(y=>asg[y]===d))continue;asg[k]=d;rec(k+1,circle,sum+d)}})(0,0,0);
 return {res,capped}}
// Crossings are manual and stored per arrow in a.elim: "9" = the whole circle value 9 crossed out,
// "9:1+2+6" = just that shaft set. Keyed by value + digits, so they survive placed digits changing the list.
function openArrowCalc(k){const a=P.arrows[k];if(!a)return;const b=a.b||1,shN=a.cells.length-b,{res,capped}=arrowOptions(a);
 a.elim=a.elim||[];const vals=[...res.keys()].sort((x,y)=>x-y),MAXC=8,open=new Set();
 const lists=new Map(vals.map(v=>[v,[...res.get(v)].sort((p,q)=>{const P2=p.split('+').map(Number),Q=q.split('+').map(Number);for(let x=0;x<P2.length;x++)if(P2[x]!==Q[x])return P2[x]-Q[x];return 0})]));
 const E=()=>P.arrows[k].elim||(P.arrows[k].elim=[]);
 const comboOff=(v,c)=>E().includes(String(v))||E().includes(v+':'+c);
 const valOff=v=>E().includes(String(v))||lists.get(v).every(c=>E().includes(v+':'+c));
 const row=v=>{const L=lists.get(v),show=open.has(v)?L:L.slice(0,MAXC),off=valOff(v);
  return `<div class="arow${off?' off':''}" data-v="${v}"><button class="av" data-v="${v}">${v}</button><span class="ac">${show.map(x=>`<button class="acb${comboOff(v,x)?' off':''}" data-v="${v}" data-c="${x}">${x}</button>`).join('')}${L.length>show.length?`<button class="more" data-more="${v}">+${L.length-show.length} more</button>`:''}</span></div>`};
 const draw=()=>{const live=vals.filter(v=>!valOff(v));$('#aList').innerHTML=vals.length?vals.map(row).join(''):'<div class="trow tbad">No circle value works with the digits placed.</div>';
  $('#aMeta').textContent=`${b>1?`${b}-cell circle (${b}-digit number)`:'Circle'} ${a.cells.slice(0,b).map(RC).join(' ')} · shaft ${shN} cell${shN>1?'s':''}`+(vals.length?` · ${live.length} of ${vals.length} values left`:'')};
 const change=fn=>{const before=snap();fn(P.arrows[k]);if(snap()!==before){undoS.push(before);redoS=[];save()}draw()};
 $('#mbox').innerHTML=`<h2>ARROW</h2><div class="muted" id="aMeta"></div><div class="tlist" id="aList"></div>
 <p class="muted cnote">Circle value, then each set of shaft digits that adds up to it. Tap a value to cross out the whole row, or one set to cross out just that set; tap again to restore. Uses digits already placed on the arrow and in each cell's row, column, box and cage; shaft cells that see each other can't repeat.${capped?' <b>Too many options to list them all.</b>':''}</p><div class="r"><button class="btn" id="mClose">Close</button></div>`;
 draw();showModal();$('#mClose').onclick=closeModal;
 $('#aList').onclick=e=>{const t=e.target.closest('button,.arow');if(!t)return;
  if(t.dataset.more){open.add(+t.dataset.more);draw();return}
  const v=+t.dataset.v,c=t.dataset.c,V=String(v),pre=V+':';
  if(c)change(a2=>{const el=a2.elim||(a2.elim=[]);
    if(el.includes(V)){a2.elim=el.filter(x=>x!==V&&!x.startsWith(pre));for(const o of lists.get(v))if(o!==c)a2.elim.push(pre+o)} // whole value crossed: restore just this set
    else{const key=pre+c,ix=el.indexOf(key);ix>=0?el.splice(ix,1):el.push(key)}});
  else change(a2=>{const el=a2.elim||[];const was=valOff(v);a2.elim=el.filter(x=>x!==V&&!x.startsWith(pre));if(!was)a2.elim.push(V)})}}
function showModal(){$('#modal').classList.remove('hidden')}
function closeModal(){if(document.activeElement)document.activeElement.blur();$('#modal').classList.add('hidden');$('#mbox').onclick=null;$('#mbox').classList.remove('help');$('#mbox').innerHTML=''}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});

// ---------- Timer ----------
const fmtT=s=>{s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s/60)%60,x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
let lastTick=Date.now();
setInterval(()=>{const now=Date.now(),dt=(now-lastTick)/1000;lastTick=now;
 if(!document.hidden&&!paused&&!P.solved&&!editing&&$('#list').classList.contains('hidden')&&dt<5){P.time+=dt;if(!saveT)saveT=setTimeout(saveNow,5000)}
 $('#timer').textContent=paused?'⏸ '+fmtT(P.time):fmtT(P.time);$('#timer').classList.toggle('paused',paused)},1000);
$('#timer').onclick=()=>{paused=!paused;$('#timer').classList.toggle('paused',paused);$('#timer').textContent=paused?'⏸ '+fmtT(P.time):fmtT(P.time)};
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow();lastTick=Date.now()});

// ---------- Puzzle list, import / export ----------
function openPuzzle(id){saveNow();curId=id;P=DB[id];undoS=[];redoS=[];sel.clear();numSel=0;editing=false;editCage=-1;paused=false;cellCache=Array(81).fill(null);SV('sdk_cur',curId);showGame();render()}
function showGame(){$('#list').classList.add('hidden');$('#game').classList.remove('hidden')}
function progress(p){let f=0,g=0;for(let i=0;i<81;i++){if(p.givens[i])g++;else if(p.v[i])f++}return Math.round(100*(f+g)/81)}
function showList(){endCeleb();saveNow();$('#game').classList.add('hidden');$('#list').classList.remove('hidden');
 const ps=Object.values(DB).sort((a,b)=>b.updated-a.updated);
 $('#items').innerHTML=ps.map(p=>`<div class="item${p.id===curId?' cur':''}" data-id="${p.id}"><div class="t">${esc(p.name)}</div><div class="s">${p.solved?'Solved ✓':progress(p)+'% filled'} · ${fmtT(p.time)} · ${p.cages.length} cages${(p.thermos||[]).length?` · ${p.thermos.length} thermos`:''}${(p.arrows||[]).length?` · ${p.arrows.length} arrows`:''}${(p.kropki||[]).length?` · ${p.kropki.length} dots`:''} · ${new Date(p.updated).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
 <div class="r"><button class="open" data-a="open">Open</button><button data-a="copy">Copy</button><button data-a="ren">Rename</button><button data-a="restart">Restart</button><button class="del" data-a="del">Delete</button></div></div>`).join('')}
$('#items').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.closest('.item').dataset.id,p=DB[id],a=b.dataset.a;
 if(a==='open')openPuzzle(id);
 else if(a==='copy')exportDialog(p);
 else if(a==='ren'){const n=prompt('Puzzle name',p.name);if(n&&n.trim()){p.name=n.trim();saveNow();showList()}}
 else if(a==='restart'){if(confirm(`Restart "${p.name}"? Your digits, notes, colours, ruled-out combos and time will be cleared.`)){Object.assign(p,{v:Array(81).fill(0),cn:Array(81).fill(''),mn:Array(81).fill(''),col:Array.from({length:81},()=>({c:[],b:0})),time:0,solved:false});p.cages.forEach(c=>c.elim=[]);(p.arrows||[]).forEach(a=>a.elim=[]);p.groups={};p.lineSums={};if(id===curId){undoS=[];redoS=[];cellCache=Array(81).fill(null)}saveNow();showList()}}
 else if(a==='del'){if(confirm(`Delete "${p.name}"? This can't be undone.`)){delete DB[id];if(!Object.keys(DB).length){const n=blankPuzzle('Untitled');DB[n.id]=n}if(id===curId){curId=Object.values(DB).sort((a,b)=>b.updated-a.updated)[0].id;P=DB[curId];undoS=[];redoS=[];cellCache=Array(81).fill(null)}saveNow();showList()}}});
$('#bList').onclick=showList;$('#bBack').onclick=()=>{showGame();render()};
$('#bNew').onclick=()=>{const n=prompt('Name for the new puzzle','Puzzle '+(Object.keys(DB).length+1));if(n===null)return;const p=blankPuzzle(n.trim()||'Untitled');DB[p.id]=p;openPuzzle(p.id);setEditing(true)};
$('#bPaste').onclick=()=>{
 $('#mbox').innerHTML=`<h2>Paste puzzle</h2><p class="muted" style="font-size:14px;margin:4px 0 8px">Paste the code Dev gave you (starts with <b>SUDOKU v1</b>).</p><textarea id="pIn" placeholder="SUDOKU v1\nname ...\ngivens ...\ncage 21 r1c1 r1c2 ..."></textarea><div id="pErr" class="err"></div>
 <div class="r"><button class="btn sec" id="pClip">Paste from clipboard</button><button class="btn" id="pGo">Import</button></div><div class="r"><button class="btn sec" id="pX">Cancel</button></div>`;
 showModal();$('#pX').onclick=closeModal;
 $('#pClip').onclick=async()=>{try{$('#pIn').value=await navigator.clipboard.readText()}catch(e){$('#pErr').textContent='Clipboard not available — long-press in the box and choose Paste.'}};
 $('#pGo').onclick=()=>{const r=parsePuzzle($('#pIn').value);if(!r.p){$('#pErr').textContent=r.errs.join('\n');return}
  const hard=r.errs.filter(x=>!x.startsWith('Note:'));if(hard.length&&!confirm('Some lines had problems:\n\n'+hard.join('\n')+'\n\nImport anyway?'))return;
  DB[r.p.id]=r.p;closeModal();openPuzzle(r.p.id);const notes=r.errs.filter(x=>x.startsWith('Note:'));if(notes.length)toast(notes[0].slice(6))}};
function exportDialog(p){
 $('#mbox').innerHTML=`<h2>Copy “${esc(p.name)}”</h2><div class="r"><button class="btn" id="xP">Copy puzzle</button><button class="btn" id="xS">Copy with progress</button></div><textarea id="xOut" readonly></textarea><div class="r"><button class="btn sec" id="xX">Close</button></div>`;
 showModal();$('#xX').onclick=closeModal;
 const go=async st=>{const t=exportPuzzle(p,st);$('#xOut').value=t;try{await navigator.clipboard.writeText(t);toast('Copied')}catch(e){$('#xOut').select();toast('Select all and copy')}};
 $('#xP').onclick=()=>go(false);$('#xS').onclick=()=>go(true);$('#xOut').value=exportPuzzle(p,false)}

// ---------- Help (opened from the ☰ puzzle list) ----------
// One entry per section. To document a new element (arrows, kropki…), add an object to HELP_ELEMENTS;
// app controls live in HELP_CONTROLS. Each body is a small HTML string.
const HELP_ELEMENTS=[
 {id:'rules',title:'Sudoku rules',body:`<p>Place 1–9 once in every row, column and 3×3 box.</p>`},
 {id:'cage',title:'Killer cages',body:`<p>A dashed outline is a <b>cage</b>. Its digits add up to the small number in its top-left corner, and no digit repeats inside a cage.</p><p>Σ Combos lists every set of different digits that makes the sum. Tap a combo to rule it out; grey ones can't fit the digits already placed.</p>`},
 {id:'45',title:'Uncaged sums and the rule of 45',body:`<p>Every row, column and box adds up to <b>45</b>. If a box's other cells are all in cages that stay inside it, the leftover cells must make 45 minus those cages. Double-tap an uncaged cell to select that leftover group and see its sum.</p><p>You can also select 2+ cells on one row or column (or part of a cage) and type a sum for them with Σ. The status line shows the total and how far it is from a multiple of 45.</p>`},
 {id:'kropki',title:'Kropki dots',body:`<p>A dot on the line between two cells links their digits.</p><ul><li><span class="hdots"></span> <b>White</b>: the digits are <b>consecutive</b> (differ by 1), e.g. 4 and 5.</li><li><span class="hdots b"></span> <b>Black</b>: one digit is <b>double</b> the other, e.g. 3 and 6. Possible pairs: 1–2, 2–4, 3–6, 4–8.</li><li>1 and 2 fit either colour.</li></ul><p>Usually <b>not all dots are given</b>: a missing dot tells you nothing. If a puzzle says <b>all dots are given</b>, two neighbours with no dot can be neither consecutive nor double.</p><p>Tips: 9 can't be on a black dot, and 5 or 7 only pair with 1 less or 1 more. A dot turns red when the digits beside it break its rule.</p>`},
 {id:'thermo',title:'Thermometers',body:`<p>A grey line with a round <b>bulb</b> is a thermometer. Digits must <b>strictly increase</b> from the bulb to the far end, so no digit repeats on a thermo.</p><p>On a 4-cell thermo the bulb can only be 1–6 and the tip 4–9. Select a thermo (or one uncaged cell on it) and press Σ to see each cell's possible range, narrowed by digits you've placed. Digits that break the order turn red.</p>`},
 {id:'arrow',title:'Arrows',body:`<p>A grey <b>circle</b> with a line and an arrowhead is an arrow. The digits along the line (the <b>shaft</b>) <b>add up to the digit in the circle</b>.</p><p>Digits <b>can repeat</b> on an arrow, as long as the repeats aren't in the same row, column, box or cage. A 2-cell oval circle is read as a 2-digit number (left to right, or top to bottom).</p><p>Tips: the circle is at least the number of shaft cells, so a 3-cell shaft means the circle is 6+ if its cells all see each other. Select an arrow (or one uncaged cell on it) and press Σ to list each possible circle value with the shaft digits that make it. Tap a value to cross out that whole row, or tap one set of digits to cross out just that set; tap again to restore. Crossings are yours — the app never crosses anything out for you. Digits that can't add up turn the arrow red.</p>`},
];
const HELP_CONTROLS=[
 {id:'select',title:'Selecting cells',body:`<ul><li><b>Tap</b> a cell to select it; tap it again to deselect.</li><li><b>Double-tap</b> selects the cell's cage (or the uncaged cells of its box).</li><li>On a thermo or arrow, the next tap selects the thermo/arrow: <b>double</b> = cage, <b>triple</b> = thermo or arrow, then the box. An uncaged thermo or arrow cell goes thermo/arrow → uncaged group → box.</li><li>Otherwise <b>triple-tap</b> selects the whole box.</li><li><b>Drag</b> to select several cells, or turn on <b>Multi</b> to add/remove cells with taps (double-tapping a selected cell removes its group).</li><li>While <b>Multi</b> is on, the number highlight is <b>locked</b>: selecting cells won't change it. To change it, clear the selection (tap the status line) and tap a number key; tap the same key to turn it off.</li><li>Tap the status line to clear the selection.</li></ul>`},
 {id:'modes',title:'Digit, Corner, Centre',body:`<p>Pick a mode, then a number. Digit places a value; Corner and Centre add pencil marks. Placing a digit clears that digit's marks from the same row, column, box, cage and thermo.</p><p>With nothing selected, the number keys <b>highlight</b> that number: its cells and pencil marks light up and the places it can't go are greyed. Tap the key again to clear.</p>`},
 {id:'colour',title:'Colours',body:`<p>In Colour mode each key has a <b>+</b> half and a <b>−</b> half. + adds a colour (up to 3 per cell); + on a colour already there makes it 2/3 of the cell. − shrinks or removes it. Long-press a key, or use ◎ Select colour, to select every cell with that colour. Double-tap a cell that is one solid colour to select all cells of that colour.</p>`},
 {id:'sigma',title:'Σ Combos and Total',body:`<p>Σ works on: one cell in a cage (the whole cage), an uncaged box group, 2+ cells all in one cage or on one row/column (type their sum), a thermo (ranges), or an arrow (circle values and shaft digits). The status line adds up whole cages, known groups and placed digits.</p>`},
 {id:'test',title:'Test',body:`<p>For puzzles that come with a solution, select cells with centre marks and press <b>Test</b>: a green ✓ means the right digit is among the marks, a red ✕ means it's missing. Wrong placed digits also show red.</p>`},
 {id:'other',title:'Timer, edit, puzzles',body:`<p>Tap the timer to pause. ✎ opens the editor for cages, thermos, arrows, dots and givens. In the Arrows tab, tap the circle then the shaft cells in order. In the Dots tab, tap the line between two cells to cycle no dot → white → black. ☰ lists puzzles: paste a new one, copy, rename, restart or delete.</p>`},
];
function showHelp(){
 const sec=h=>`<details class="hs" id="help-${h.id}"><summary>${esc(h.title)}</summary><div class="hb2">${h.body}</div></details>`;
 $('#mbox').innerHTML=`<h2>Help</h2><div class="hgrp">Puzzle elements</div>${HELP_ELEMENTS.map(sec).join('')}<div class="hgrp">Using the app</div>${HELP_CONTROLS.map(sec).join('')}<div class="r"><button class="btn" id="hClose">Close</button></div>`;
 $('#mbox').classList.add('help');showModal();$('#hClose').onclick=closeModal}
$('#bHelp').onclick=showHelp;

// ---------- Keyboard (handy on a Mac/iPad keyboard) ----------
document.addEventListener('keydown',e=>{if(!$('#celeb').classList.contains('hidden')){if(e.key==='Escape'){e.preventDefault();endCeleb()}return}if(!$('#modal').classList.contains('hidden')||!$('#list').classList.contains('hidden'))return;
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
 if(e.key==='Escape'&&!editing){e.preventDefault();sel.clear();numSel=0;render();return}
 if(/^[1-9]$/.test(e.key)&&!editing){pressDigit(+e.key);return}
 if((e.key==='Backspace'||e.key==='Delete')&&!editing){erase();return}
 const m={z:'v',x:'c',c:'m',v:'k'}[e.key];if(m&&!editing){mode=m;if(m!=='k')setPick(false);renderControls();renderSel();return}
 const mv={ArrowUp:-9,ArrowDown:9,ArrowLeft:-1,ArrowRight:1}[e.key];if(mv&&sel.size){e.preventDefault();let i=[...sel].pop()+mv;if(i<0||i>80)return;sel=new Set([i]);renderSel()}});

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'});
render();
