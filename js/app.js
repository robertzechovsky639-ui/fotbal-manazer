// ===================== FOTBAL MANAŽER – jádro =====================
const STORE=(function(){const mem={};let ls=null;try{const t='__fm_t';window.localStorage.setItem(t,'1');window.localStorage.removeItem(t);ls=window.localStorage;}catch(e){ls=null;}
 return {ok:!!ls,get(k){try{if(ls){const v=ls.getItem(k);if(v!=null)return v;}}catch(e){}return mem[k]==null?null:mem[k];},
  set(k,v){mem[k]=v;if(!ls)return false;try{ls.setItem(k,v);return true;}catch(e){try{ls.removeItem(k);ls.setItem(k,v);return true;}catch(e2){return false;}}},
  del(k){delete mem[k];try{if(ls)ls.removeItem(k);}catch(e){}}};})();
const SAVE_KEY='fotbalManazer_save_v1';
const FM_VER=6;
let S=null;
let RNG=Math.random;
const rnd=(a,b)=>a+RNG()*(b-a), rint=(a,b)=>Math.floor(rnd(a,b+1));
let pick=a=>a[Math.floor(RNG()*a.length)];
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const gauss=()=>(RNG()+RNG()+RNG()+RNG()-2)*1.22;
const finite=v=>{v=Number(v);return Number.isFinite(v)?v:0;};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(RNG()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function hashStr(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function wpick(arr,wf){let t=0;const w=arr.map(x=>{const v=Math.max(0,finite(wf(x)));t+=v;return v;});if(t<=0)return arr[Math.floor(RNG()*arr.length)];let r=RNG()*t;for(let i=0;i<arr.length;i++){r-=w[i];if(r<=0)return arr[i];}return arr[arr.length-1];}
function czPlural(n,one,few,many){n=Math.abs(Math.round(finite(n)));return n===1?one:(n>=2&&n<=4?few:many);}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fmtMoney(v){v=finite(v);const a=Math.abs(v),s=v<0?'−':'';
 if(a>=1e9)return s+(a/1e9).toLocaleString('cs-CZ',{maximumFractionDigits:2})+' mld. €';
 if(a>=1e6)return s+(a/1e6).toLocaleString('cs-CZ',{maximumFractionDigits:a>=1e8?0:1})+' mil. €';
 if(a>=1e4)return s+Math.round(a/1e3).toLocaleString('cs-CZ')+' tis. €';
 return s+Math.round(a).toLocaleString('cs-CZ')+' €';}
const fmtNum=v=>Math.round(finite(v)).toLocaleString('cs-CZ');
const $=s=>document.querySelector(s);
// ---------- pozice ----------
const POS=['GK','CB','LB','RB','DM','CM','AM','LM','RM','LW','RW','ST'];
const POS_CZ={GK:'B',CB:'SO',LB:'LO',RB:'PO',DM:'DZ',CM:'SZ',AM:'OZ',LM:'LZ',RM:'PZ',LW:'LK',RW:'PK',ST:'ÚT'};
const POS_FULL={GK:'brankář',CB:'stoper',LB:'levý obránce',RB:'pravý obránce',DM:'defenzivní záložník',CM:'střední záložník',AM:'ofenzivní záložník',LM:'levý záložník',RM:'pravý záložník',LW:'levé křídlo',RW:'pravé křídlo',ST:'útočník'};
const GRP=p=>p==='GK'?'G':(p==='CB'||p==='LB'||p==='RB')?'D':(p==='LW'||p==='RW'||p==='ST')?'F':'M';
const GRP_CZ={G:'Brankáři',D:'Obránci',M:'Záložníci',F:'Útočníci'};
const GRP_COL={G:'#ffb648',D:'#36d1ff',M:'#3ee68a',F:'#ff5d73'};
// pozice vhodnost (1 = ideál)
const FIT={GK:{GK:1},CB:{CB:1,DM:.88,LB:.85,RB:.85},LB:{LB:1,LM:.9,RB:.86,CB:.85,LW:.8},RB:{RB:1,RM:.9,LB:.86,CB:.85,RW:.8},
 DM:{DM:1,CM:.93,CB:.86,AM:.8},CM:{CM:1,DM:.93,AM:.92,LM:.85,RM:.85},AM:{AM:1,CM:.92,LW:.86,RW:.86,ST:.85,LM:.84,RM:.84},
 LM:{LM:1,LW:.94,RM:.88,CM:.86,LB:.82,AM:.84},RM:{RM:1,RW:.94,LM:.88,CM:.86,RB:.82,AM:.84},LW:{LW:1,LM:.94,RW:.9,AM:.87,ST:.85},RW:{RW:1,RM:.94,LW:.9,AM:.87,ST:.85},ST:{ST:1,AM:.86,LW:.85,RW:.85}};
function posFit(p,slot){if(p===slot)return 1;const f=FIT[slot]&&FIT[slot][p];if(f)return f;if(slot==='GK'||p==='GK')return .35;return GRP(p)===GRP(slot)?.8:.68;}
const FORMS={
 '4-4-2':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['LM',14,46],['CM',38,50],['CM',62,50],['RM',86,46],['ST',38,20],['ST',62,20]],
 '4-3-3':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['DM',50,56],['CM',30,46],['CM',70,46],['LW',16,22],['ST',50,16],['RW',84,22]],
 '4-2-3-1':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['DM',36,56],['DM',64,56],['LM',16,34],['AM',50,36],['RM',84,34],['ST',50,15]],
 '4-1-4-1':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['DM',50,60],['LM',14,40],['CM',37,44],['CM',63,44],['RM',86,40],['ST',50,16]],
 '3-5-2':[['GK',50,92],['CB',26,76],['CB',50,78],['CB',74,76],['LM',10,48],['DM',50,58],['CM',32,44],['CM',68,44],['RM',90,48],['ST',38,18],['ST',62,18]],
 '3-4-3':[['GK',50,92],['CB',26,76],['CB',50,78],['CB',74,76],['LM',12,50],['CM',38,52],['CM',62,52],['RM',88,50],['LW',18,22],['ST',50,16],['RW',82,22]],
 '5-3-2':[['GK',50,92],['LB',8,66],['CB',30,76],['CB',50,78],['CB',70,76],['RB',92,66],['CM',30,48],['CM',50,52],['CM',70,48],['ST',38,20],['ST',62,20]],
 '4-5-1':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['LM',12,44],['CM',32,50],['CM',50,54],['CM',68,50],['RM',88,44],['ST',50,18]]};
const MENT={def:'Defenzivní',bal:'Vyrovnaná',att:'Útočná'};
const PRESS={low:'Nízký',mid:'Střední',high:'Vysoký'};
const STYLE={short:'Krátké přihrávky',direct:'Přímočarý',counter:'Protiútoky'};
const ATTR_CZ=['Rychlost','Střelba','Přihrávky','Technika','Obrana','Fyzička'];
const ATTR_GK=['Robinsonády','Chytání','Výkop','Reflexy','Postavení','Vyběhnutí'];
// ---------- vlajky ----------
function flag(iso){if(!iso||iso==='XX')return '🏳️';
 if(iso.indexOf('GB-')===0){const sub=iso.slice(3).toLowerCase();return '\u{1F3F4}'+[...('gb'+sub)].map(c=>String.fromCodePoint(0xE0000+c.charCodeAt(0))).join('')+'\u{E007F}';}
 if(iso==='XK')return '🇽🇰';
 return [...iso.toUpperCase()].map(c=>String.fromCodePoint(0x1F1E6+c.charCodeAt(0)-65)).join('');}
function natName(iso){return (FM_CAT.nat&&FM_CAT.nat[iso])||(FM_CAT.countries[iso])||iso;}
// ---------- data (líné načítání lig) ----------
const DATA={};const _loadCb={};
function FM_DATA(o){DATA[o.code]=o;const cb=_loadCb[o.code];if(cb){delete _loadCb[o.code];cb.forEach(f=>f.ok(o));}}
function loadLeague(code){if(DATA[code])return Promise.resolve(DATA[code]);
 return new Promise((ok,fail)=>{if(_loadCb[code]){_loadCb[code].push({ok,fail});return;}_loadCb[code]=[{ok,fail}];
  const s=document.createElement('script');s.src='data/'+code+'.js?v='+(window.FM_DATA_VER||'1');s.async=true;
  s.onerror=()=>{const cb=_loadCb[code];delete _loadCb[code];s.remove();(cb||[]).forEach(f=>f.fail(new Error('Nepodařilo se načíst data soutěže. Zkontroluj připojení k internetu.')));};
  document.head.appendChild(s);});}
function leagueInfo(code){return FM_CAT.leagues.find(l=>l.code===code);}
function countryLeagues(cc,all){const ls=FM_CAT.leagues.filter(l=>l.cc===cc).sort((a,b)=>a.tier-b.tier);if(!all&&typeof S!=='undefined'&&S&&S.leagues&&S.cc===cc){const f=ls.filter(l=>S.leagues[l.code]);if(f.length)return f;}return ls;}
function leagueLabel(code){const l=leagueInfo(code);if(!l)return code;return l.name+(l.cc!=='CZ'&&['Bundesliga','Superliga','Super League','Premier Division'].includes(l.name)?' ('+l.country+')':'');}
// ---------- hodnota hráče ----------
function ageOf(p){return S.season-p.by;}
function playerValue(p){const a=ageOf(p);let v=150000*Math.exp((p.ovr-50)*0.17);
 const af=a<=19?1.7:a<=21?1.55:a<=24?1.3:a<=28?1:a<=30?0.75:a<=32?0.48:a<=34?0.28:0.15;
 v*=af*(1+Math.max(0,p.pot-p.ovr)*(a<=24?0.045:0.02));
 if(p.inj>4)v*=0.85;
 const r=v>=1e7?5e5:v>=1e6?5e4:v>=1e5?1e4:1e3;return Math.max(10000,Math.round(v/r)*r);}
function playerWage(p){const v=playerValue(p);const w=(900+v*0.0021)*(p.wm||1);const r=w>=1e4?500:100;return Math.round(w/r)*r;}
function initials(n){return n;}
function shortName(n){const parts=String(n).split(' ');if(parts.length<2)return n;const last=parts.slice(1).join(' ');return parts[0][0]+'. '+last;}
function surname(n){const parts=String(n).split(' ');return parts.length>1?parts.slice(1).join(' '):n;}

function isOwn(){return typeof ownMode==='function'&&ownMode();}
function czPct(v){return (Math.round(v*10)/10).toLocaleString('cs-CZ')+' %';}
function mgrRef(cap){const r=isOwn()?(S.role==='owner'?'majitel klubu':'majitel a trenér'):'trenér';const d=!S.manager||/^(majitel|trenér)$/i.test(S.manager.trim());const t=d?r:r+' '+S.manager;return cap?t[0].toUpperCase()+t.slice(1):t;}
const CZ_GEN_X={Pavel:'Pavla',Karel:'Karla',Havel:'Havla',Marek:'Marka',Mirek:'Mirka',Přemek:'Přemka'};
function czGen1(w){if(CZ_GEN_X[w])return CZ_GEN_X[w];if(w.length<3||/-/.test(w))return w;if(/sk[iy]$/.test(w))return w.slice(0,-1)+'ého';if(/ý$/.test(w))return w.slice(0,-1)+'ého';if(/í$/.test(w))return w+'ho';
 if(/něk$/.test(w))return w.slice(0,-3)+'ňka';if(/děk$/.test(w))return w.slice(0,-3)+'ďka';if(/těk$/.test(w))return w.slice(0,-3)+'ťka';
 if(/[^aeiouyáéíóúůý]ek$/.test(w)&&w.length>4&&/[áéěíóúůýčďňřšťž]/.test(w))return w.slice(0,-2)+'ka';if(/ec$/.test(w)&&w.length>4)return w.slice(0,-2)+'ce';
 if(/a$/.test(w))return w.slice(0,-1)+'u';if(/o$/.test(w))return w.slice(0,-1)+'a';if(/[šžčřcjďťňxć]$/.test(w))return w+'e';if(/[bdfghklmnpqrstvwz]$/i.test(w))return w+'a';return w;}
function czGen(n){n=String(n||'');if(/[a-z]-[a-z]/.test(n))return n;return n.split(' ').map(czGen1).join(' ');}

// ===================== SIMULACE: hra, sezóna, kola =====================
function P(id){return S.players[id];}
function C(id){return S.clubs[id];}
function myClub(){return S.clubs[S.clubId];}
function lgOf(cid){return S.clubs[cid].lg;}
function clubPlayers(cid){return (S.clubs[cid].pl||[]).map(P).filter(Boolean);}
function pSurname(p){if(!p)return '';if(['KR','CN','KP','TW'].includes(p.nat)){return p.n;}return surname(p.n);}
function mkPlayer(arr,cid,idx){const [n,pos,by,ovr,pot,nat,a,gen]=arr;const id='p'+(S.nextId++);
 const p={id,n,pos,by,ovr,pot:Math.max(pot,ovr),nat,a:a.slice(),gen:gen?1:0,cl:cid,cond:100,mor:70,inj:0,sus:0,yc:0,st:newStats(),form:[],car:{ap:0,g:0}};
 S.players[id]=p;return p;}
function newStats(){return {ap:0,g:0,as:0,yc:0,rc:0,rt:0,cs:0,min:0};}
function clubId(name){return 'c'+hashStr(name).toString(36);}
// ----- nová hra -----
async function newGame(opts){// opts: {cc, clubName, manager}
 const lgs=countryLeagues(opts.cc,true);
 const datas=await Promise.all(lgs.map(l=>loadLeague(l.code)));await loadWorld();
 S={v:FM_VER,created:Date.now(),season:2026,round:0,cc:opts.cc,manager:opts.manager||'Trenér',clubs:{},players:{},nextId:1,leagues:{},news:[],
  inbox:[],offers:[],fin:{log:[]},history:[],tac:null,training:{focus:'bal',int:2},cohesion:55,boardTrust:60,gone:{},seasonLog:[],trophies:[],achievements:{},
  bets:[],betBank:0,wallet:10000,slip:[],betStats:{st:0,won:0,n:0,nw:0},settings:{speed:2,sound:false,betLimit:5000,betChat:true},cups:{list:[],poMade:0},cal:[],W:null,prevRank:null,domW:null};
 lgs.forEach((l,i)=>{const d=datas[i];const ids=[];
  d.clubs.forEach(c=>{const id=clubId(c.n+'|'+l.code);const club={id,n:c.n,s:c.s,c:c.c,b:c.b,lg:l.code,pl:[],money:0,rep:0};if(c.z!=null)club.z=c.z;S.clubs[id]=club;ids.push(id);
   c.p.forEach((arr,k)=>{const p=mkPlayer(arr,id,k);club.pl.push(p.id);});});
  S.leagues[l.code]={code:l.code,clubs:ids,fix:[],res:[],table:{}};});
 for(const id in S.clubs){const c=S.clubs[id];c.rep=Math.round(teamStrength(id).ovr);}
 const me=Object.values(S.clubs).find(c=>c.n===opts.clubName);S.clubId=me?me.id:Object.keys(S.clubs)[0];
 setupFinances(true);
 initWorld();
 startSeason(true);
 S.tac=defaultTactic(S.clubId);
 addNews('🤝',`${S.manager} se stal novým trenérem klubu ${myClub().n}. Vedení od něj čeká: ${expectText(myClub().expect)}.`);
 saveGame();return S;}
function setupFinances(initial){for(const id in S.clubs){const c=S.clubs[id];const wb=clubPlayers(id).reduce((s,p)=>s+playerWage(p),0);
  c.wageBase=wb; c.tv=Math.round(wb*1.02/100)*100;
  const r=c.rep||60;c.cap=Math.round(clamp(2500+Math.exp((r-55)*0.135)*2600,2500,75000)/100)*100;
  c.ticket=Math.round(clamp(6+(r-55)*1.6,5,90));
  if(initial){const sq=clubPlayers(id).reduce((s,p)=>s+playerValue(p),0);c.money=Math.round(sq*0.12/1e4)*1e4+Math.round(wb*8/1e4)*1e4;}}}
// ----- sestava a síla týmu -----
function effRating(p,slot){if(!p)return 30;let r=p.ovr*posFitP(p,slot);r*=0.78+0.22*clamp(p.cond,0,100)/100;r*=0.96+0.08*clamp(p.mor,0,100)/100;return r;}
function available(p){return p&&p.inj<=0&&p.sus<=0;}
function autoLineup(cid,form){form=form||'4-4-2';const slots=FORMS[form];const ps=clubPlayers(cid).filter(available);const used=new Set();const xi=new Array(slots.length).fill(null);
 // pořadí obsazování: nejdřív brankář, pak podle vzácnosti pozice
 const order=slots.map((s,i)=>i).sort((a,b)=>(slots[a][0]==='GK'?-1:0)-(slots[b][0]==='GK'?-1:0));
 for(const i of order){const slot=slots[i][0];let best=null,bv=-1;for(const p of ps){if(used.has(p.id))continue;const v=p.ovr*posFitP(p,slot)*(0.85+0.15*p.cond/100);if(v>bv){bv=v;best=p;}}if(best){xi[i]=best.id;used.add(best.id);}}
 const rest=ps.filter(p=>!used.has(p.id)).sort((a,b)=>b.ovr*(0.85+0.15*b.cond/100)-a.ovr*(0.85+0.15*a.cond/100));
 const bench=[];const gk=rest.find(p=>p.pos==='GK');if(gk)bench.push(gk.id);
 for(const p of rest){if(bench.length>=9)break;if(!bench.includes(p.id))bench.push(p.id);}
 return {xi,bench};}
function bestForm(cid){const ps=clubPlayers(cid);const cnt={D:0,M:0,F:0,W:0};ps.forEach(p=>{const g=GRP(p.pos);if(g!=='G')cnt[g]++;if(['LW','RW'].includes(p.pos))cnt.W++;});
 if(cnt.W>=3&&cnt.F>=4)return '4-3-3';const h=hashStr(cid)%5;return ['4-4-2','4-2-3-1','4-3-3','4-1-4-1','3-5-2'][h];}
function defaultTactic(cid){const form=bestForm(cid);const l=autoLineup(cid,form);return {form,ment:'bal',press:'mid',style:'short',xi:l.xi,bench:l.bench,cap:null,pk:null};}
function lineStrength(xiIds,form,tac){const slots=FORMS[form];let G=0,D=[],M=[],F=[];
 slots.forEach((s,i)=>{const p=P(xiIds[i]);const r=effRating(p,s[0]);const g=GRP(s[0]);if(g==='G')G=r;else if(g==='D')D.push(r);else if(g==='M')M.push(r);else F.push(r);
  if(s[0]==='DM')D.push(r*0.96);if(s[0]==='AM')F.push(r*0.96);if(['LM','RM'].includes(s[0]))F.push(r*0.9);if(['LB','RB'].includes(s[0])&&form.startsWith('3')===false)M.push(r*0.85);});
 const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:40;
 const n=xiIds.filter(Boolean).length;const miss=Math.max(0,11-n)*4;
 let att=avg(F)*0.62+avg(M)*0.38, def=avg(D)*0.62+G*0.22+avg(M)*0.16, mid=avg(M);
 const t=tac||{};if(t.ment==='att'){att+=1.6;def-=1.6;}else if(t.ment==='def'){att-=1.8;def+=1.6;}
 if(t.press==='high'){mid+=1.2;def-=0.4;}else if(t.press==='low'){mid-=1;def+=0.6;}
 if(t.style==='counter'){att+=t.ment==='def'?1.2:0.3;mid-=0.8;}else if(t.style==='direct'){att+=0.5;mid-=0.5;}else{mid+=0.8;}
 const ovr=(G+D.reduce((a,b)=>a+b,0)+M.reduce((a,b)=>a+b,0)+F.reduce((a,b)=>a+b,0))/Math.max(1,1+D.length+M.length+F.length);
 if(t.line||t.roles||t.cap){const tm=tacMods(t,xiIds);att+=tm.att;def+=tm.def;mid+=tm.mid;}
 return {att:att-miss,def:def-miss,mid:mid-miss,gk:G,ovr:ovr-miss};}
function teamStrength(cid){const c=S.clubs[cid];if(cid===S.clubId&&S.tac)return lineStrength(S.tac.xi,S.tac.form,S.tac);
 const form=c.form||bestForm(cid);const l=autoLineup(cid,form);return lineStrength(l.xi,form,c.tac||{});}
// ----- rozpis -----
function roundRobin(ids,legsW){const t=ids.slice();if(t.length%2)t.push(null);const n=t.length,rounds=[];const arr=t.slice();
 for(let r=0;r<n-1;r++){const m=[];for(let i=0;i<n/2;i++){const a=arr[i],b=arr[n-1-i];if(a&&b)m.push(r%2===0?(i===0?[a,b]:[a,b]):[b,a]);}rounds.push(m);arr.splice(1,0,arr.pop());}
 const legs=legsW||(ids.length>24?1:2);let all=rounds.slice();if(legs===2)all=all.concat(rounds.map(r=>r.map(([a,b])=>[b,a])));return all;}
function startSeason(first){RNG=Math.random;
 for(const code in S.leagues){const L=S.leagues[code];L.grp=null;L.ded=0;if(zoneN(code)){zoneAssign(L);const rounds=[];for(let z=0;z<zoneN(code);z++)roundRobin(shuffle(L.clubs.filter(id=>S.clubs[id].z===z)),2).forEach((r,k)=>(rounds[k]=rounds[k]||[]).push(...r));L.fix=rounds;}else L.fix=roundRobin(shuffle(L.clubs.slice()));L.res=L.fix.map(()=>null);L.table={};L.base=L.fix.length;L.clubs.forEach(id=>L.table[id]={p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,form:[]});}
 S.round=0;S.maxRound=Math.max(...Object.values(S.leagues).map(L=>L.fix.length+splitExtra(L)));for(const code in S.leagues){const L=S.leagues[code];L.tot=L.fix.length+splitExtra(L);L.done=0;}
 for(const id in S.players){const p=S.players[id];p.st=newStats();p.cst=null;p.yc=0;}
 // očekávání vedení podle síly v lize
 for(const code in S.leagues){const L=S.leagues[code];const r=L.clubs.map(id=>[id,teamStrength(id).ovr]).sort((a,b)=>b[1]-a[1]);const zc={};r.forEach(([id])=>{const z=zoneN(code)?S.clubs[id].z:0;zc[z]=(zc[z]||0)+1;S.clubs[id].expect=zc[z];S.clubs[id].rep=Math.round(teamStrength(id).ovr);});}
 S.seasonStart={money:myClub().money};S.finSeason={inc:0,exp:0,gate:0,tv:0,wages:0,tr_in:0,tr_out:0,prize:0};
 if(S.W&&WD)initCups();else{S.cups={list:[],poMade:0};S.cal=[];}
}
// ----- česká 1. liga: nadstavba (skupina o titul, o umístění, o záchranu) -----
const SPLIT={CZ1:[[0,6,'Skupina o titul'],[6,10,'Skupina o umístění'],[10,16,'Skupina o záchranu']]};
function splitExtra(L){const sp=SPLIT[L.code];if(!sp||L.clubs.length!==16)return 0;return Math.max(...sp.map(([a,b])=>{const n=b-a;return n%2?n:n-1;}));}
function splitCheck(){for(const code in S.leagues){const L=S.leagues[code];if(!splitExtra(L)||L.grp||(L.done||0)!==L.base)continue;const tab=sortedTable(code);L.grp={};const rounds=[];
  SPLIT[code].forEach(([a,b],gi)=>{const ids=tab.slice(a,b);ids.forEach(id=>L.grp[id]=gi);roundRobin(ids,1).forEach((r,k)=>{(rounds[k]=rounds[k]||[]).push(...r);});});
  rounds.forEach(r=>{L.fix.push(r);L.res.push(null);});
  const gi=L.grp[S.clubId];if(gi!=null)addNews('🔀',`Základní část skončila. ${myClub().n} hraje v nadstavbě: ${SPLIT[code][gi][2].toLowerCase()}. Body se přenášejí.`);}}
function grpName(code,gi){if(zoneN(code))return (code==='ARG2'?'Zóna ':'Skupina ')+(code==='ARG2'?'AB'[gi]:gi+1);return SPLIT[code]&&SPLIT[code][gi]?SPLIT[code][gi][2]:'';}
// ----- soutěže hrané ve skupinách (Primera Federación, Primera Nacional) -----
function zoneN(code){const li=leagueInfo(code);return li&&li.zn||0;}
function zoneAssign(L){const n=zoneN(L.code);const cnt=Array(n).fill(0);L.clubs.forEach(id=>{const c=S.clubs[id];if(c.z!=null&&c.z<n)cnt[c.z]++;else c.z=null;});
 L.clubs.forEach(id=>{const c=S.clubs[id];if(c.z==null){const k=cnt.indexOf(Math.min(...cnt));c.z=k;cnt[k]++;}});L.grp={};L.clubs.forEach(id=>L.grp[id]=S.clubs[id].z);}
function zoneSize(code,cid){const L=S.leagues[code];return zoneN(code)?L.clubs.filter(id=>S.clubs[id].z===S.clubs[cid].z).length:L.clubs.length;}
function ladder(code){const t=sortedTable(code);const n=zoneN(code);if(!n)return t;const zs=[...Array(n)].map((_,z)=>t.filter(id=>S.clubs[id].z===z));const out=[];for(let i=0;out.length<t.length&&i<t.length;i++)zs.forEach(z=>{if(z[i])out.push(z[i]);});return out;}
function expectText(pos){const L=S.leagues[myClub().lg];const n=zoneSize(myClub().lg,S.clubId);const li=leagueInfo(myClub().lg);
 if(pos<=1)return 'boj o titul';if(pos<=3)return 'umístění na stupních vítězů';if(pos<=Math.ceil(n*0.4))return 'horní polovina tabulky';
 if(pos<=Math.ceil(n*0.7))return 'klidný střed tabulky';return li.down>0||li.tier>1?'záchrana v soutěži':'vyhnout se poslednímu místu';}
// ----- tabulka -----
function sortedTable(code){const L=S.leagues[code];const G=L.grp;return L.clubs.slice().sort((a,b)=>{const x=L.table[a],y=L.table[b];return (G?(G[a]-G[b]):0)||y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf||S.clubs[a].n.localeCompare(S.clubs[b].n,'cs');});}
function tablePos(cid){const code=lgOf(cid);const t=sortedTable(code);if(zoneN(code)){const z=S.clubs[cid].z;return t.filter(id=>S.clubs[id].z===z).indexOf(cid)+1;}return t.indexOf(cid)+1;}
function applyResult(code,h,a,gh,ga){const T=S.leagues[code].table;const x=T[h],y=T[a];x.p++;y.p++;x.gf+=gh;x.ga+=ga;y.gf+=ga;y.ga+=gh;
 if(gh>ga){x.w++;y.l++;x.pts+=3;x.form.push('V');y.form.push('P');}else if(gh<ga){y.w++;x.l++;y.pts+=3;x.form.push('P');y.form.push('V');}else{x.d++;y.d++;x.pts++;y.pts++;x.form.push('R');y.form.push('R');}
 if(x.form.length>5)x.form.shift();if(y.form.length>5)y.form.shift();}
// ----- rychlá simulace zápasu (AI) -----
function xgPair(sh,sa){const k=20.5;let xh=1.53*Math.exp((sh.att-sa.def)/k+(sh.mid-sa.mid)/80)*1.12;let xa=1.53*Math.exp((sa.att-sh.def)/k+(sa.mid-sh.mid)/80)*0.9;return [clamp(xh,0.15,4.2),clamp(xa,0.12,3.8)];}
// góly po úsecích zápasu: vedoucí tým při náskoku hru zklidní, prohrávající riskuje (realistické rozdělení skóre, méně přestřelek)
function gsMul(my,th,late){return gsMul0(my,th,late)*(my+th>=6?0.3:my+th===5?0.5:my+th===4?0.68:my+th===3?0.92:1);}
function gsMul0(my,th,late){const d=my-th;if(d>=4)return 0.3;if(d===3)return 0.45;if(d===2)return 0.66;if(d===1)return late?0.88:0.95;if(d===-1)return late?1.12:1.08;if(d<=-3)return 0.8;if(d===-2)return 0.9;return late?0.97:1;}
function segGoals(xh,xa){xh=Math.min(xh,3.4);xa=Math.min(xa,3.2);let gh=0,ga=0;for(let k=0;k<6;k++){const late=k>=4;const h=poisson(xh/6*gsMul(gh,ga,late)),a=poisson(xa/6*gsMul(ga,gh,late));gh+=h;ga+=a;}return [gh,ga];}
function poisson(l){let L=Math.exp(-l),k=0,p=1;do{k++;p*=RNG();}while(p>L&&k<12);return k-1;}
function pickScorer(ids){const ps=ids.map(P).filter(Boolean);return wpick(ps,p=>{const g=GRP(p.pos);return (g==='F'?6:g==='M'?(p.pos==='AM'?3.6:1.8):g==='D'?0.55:0.01)*Math.pow(Math.max(20,p.a[1]||50)/60,3);});}
function pickAssist(ids,ex){const ps=ids.map(P).filter(p=>p&&p.id!==ex);return wpick(ps,p=>{const g=GRP(p.pos);return (g==='F'?2.5:g==='M'?3.2:g==='D'?1:0.05)*Math.pow(Math.max(20,p.a[2]||50)/60,2);});}
function quickMatch(h,a){const fh=S.clubs[h].form||bestForm(h),fa=S.clubs[a].form||bestForm(a);const lh=autoLineup(h,fh),la=autoLineup(a,fa);
 const sh=lineStrength(lh.xi,fh,{}),sa=lineStrength(la.xi,fa,{});let [xh,xa]=xgPair(sh,sa);try{const fx=wxFx(matchWeather(h,{h,a,type:'lg'}));if(fx&&isFinite(fx.rate*fx.acc)){xh*=fx.rate*fx.acc;xa*=fx.rate*fx.acc;}}catch(e){}let [gh,ga]=segGoals(xh,xa);const fz=S._forced&&S._forced[h+'|'+a];if(fz){gh=fz.gh;ga=fz.ga;delete S._forced[h+'|'+a];}
 const ev=[];const add=(cid,xi,n)=>{for(let i=0;i<n;i++){const fo=fz&&fz.sc&&fz.sc[cid]&&fz.sc[cid][i];if(fo&&fo.og){ev.push({t:'g',c:cid,p:fo.og,og:1,m:rint(2,90)});continue;}const fs=fz&&fz.sc&&fz.sc[cid]&&fz.sc[cid][i]&&P(fz.sc[cid][i]);const s=fs||pickScorer(xi);const as=RNG()<0.72?pickAssist(xi,s&&s.id):null;if(s){s.st.g++;s.car.g++;}if(as)as.st.as++;ev.push({t:'g',c:cid,p:s&&s.id,as:as&&as.id,m:rint(2,90)});}};
 add(h,lh.xi,gh);add(a,la.xi,ga);
 [[h,lh,ga],[a,la,gh]].forEach(([cid,l,conc])=>{l.xi.forEach(id=>{const p=P(id);if(!p)return;p.st.ap++;p.st.min+=90;p.car.ap++;const r=clamp(6.4+gauss()*0.5+(conc===0&&GRP(p.pos)!=='F'?0.4:0)-conc*0.12,4.5,9.5);p.st.rt+=r;if(conc===0&&(GRP(p.pos)==='G'))p.st.cs++;
  p.cond=clamp(p.cond-rint(14,24),20,100);if(RNG()<0.012){p.inj=rint(1,6);}if(RNG()<0.09){p.yc++;p.st.yc++;if(p.yc>=5){p.sus=1;p.justSus=S.round;p.yc=0;}}if(RNG()<0.004){p.st.rc++;p.sus=rint(1,3);p.justSus=S.round;}});});
 ev.sort((x,y)=>x.m-y.m);return {h,a,gh,ga,ev};}
// ----- kolo -----
function nextMatch(){autoEvents();const e=pendingEvent();if(e){const m=userInEvent(e);if(m){const cup=cupById(e.c);const t=e.k==='ko'?tieOf(e,m[0],m[1]):null;
  return {type:'cup',e,h:m[0],a:m[1],cup:e.c,title:evTitle(e),ko:t?koInfo(e,m[0],m[1]):null,neutral:!!(t&&t.legs===1&&cup.rounds[e.i].ties.length===1&&!(cup.rounds[e.i].byes||[]).length)};}}
 if(S.round>=S.maxRound)return null;const f=myFixture();if(f)return {type:'lg',h:f[0],a:f[1],title:leagueLabel(myClub().lg)+' · '+myRoundNo()+'. kolo'};return null;}
// ----- kalendář lig: kratší soutěže mají volné týdny rozložené přes celou sezónu -----
function lgTot(L){return Math.max(L.tot||S.maxRound,L.fix.length);}
function lgAt(L,j){const M=Math.max(1,S.maxRound),T=Math.max(1,lgTot(L));return T>=M?j:Math.floor(j*M/T);}
function lgDue(code){const L=S.leagues[code];if(!L)return -1;const d=L.done||0;if(d>=L.fix.length||S.round>=S.maxRound)return -1;return lgAt(L,d)<=S.round?d:-1;}
function lgRoundsBy(code,g){const L=S.leagues[code];if(!L)return 0;let n=0;const T=lgTot(L);while(n<T&&lgAt(L,n)<g)n++;return n;}
function myRoundNo(){const L=S.leagues[myClub().lg];const d=lgDue(myClub().lg);return d>=0?d+1:(L.done||0);}
function myFixture(r){const L=S.leagues[myClub().lg];if(r==null){r=lgDue(myClub().lg);if(r<0)return null;}const m=(L.fix[r]||[]).find(f=>f[0]===S.clubId||f[1]===S.clubId);return m||null;}
function playRound(userResult){const out=[];
 for(const code in S.leagues){const L=S.leagues[code];const r=lgDue(code);if(r<0)continue;const res=[];L.done=r+1;
  for(const [h,a] of L.fix[r]){let m;if(userResult&&((h===S.clubId)||(a===S.clubId))&&code===myClub().lg)m=userResult;else m=quickMatch(h,a);
   applyResult(code,h,a,m.gh,m.ga);BETRES['L|'+code+'|'+r+'|'+h+'|'+a]={gh:m.gh,ga:m.ga,ev:(m.ev||[]).filter(e=>e.t==='g').map(e=>{const x={c:e.c,p:e.p,m:e.m};if(e.og)x.og=1;return x;}),st:m.st||null,ht:m.ht||null};res.push({h,a,gh:m.gh,ga:m.ga,ev:(m.ev||[]).filter(e=>e.t==='g').map(e=>({c:e.c,p:e.p,m:e.m}))});}
  L.res[r]=res;out.push([code,res]);}
 return out;}
function weekTick(){// po kole: regenerace, zranění, trénink, finance, nabídky
 if(typeof extraWeek==='function')extraWeek();
 if(typeof betSalary==='function')betSalary();
 const tr=S.training;const intensity=tr.int||2;
 for(const id in S.players){const p=S.players[id];const mine=p.cl===S.clubId;
  const rec=mine?(26-intensity*4+(tr.focus==='fit'?4:0)):20;p.cond=clamp(p.cond+rec,0,100);
  if(p.inj>0){p.inj--;if(p.inj===0&&mine)addNews('🩹',`${p.n} je po zranění znovu k dispozici.`);}
  if(p.sus>0&&p.justSus!==S.round)p.sus--;
  // progres
  const age=ageOf(p);let g=0;
  if(age<=23)g=(p.pot-p.ovr)*0.006;else if(age<=28)g=(p.pot-p.ovr)*0.004;else if(age>=31)g=-(age-30)*0.012;
  if(mine){g*=(0.7+intensity*0.25)*(1+0.07*(typeof facLv==='function'?facLv('tr'):0));if(tr.focus!=='bal'&&tr.focus!=='fit'&&tr.focus!=='tac')g*=1.05;
   if(mine&&intensity===3&&p.inj<=0&&RNG()<0.006){p.inj=rint(1,3);addNews('🤕',`${p.n} se zranil na tréninku a bude chybět ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.`);}}
  p._xp=(p._xp||0)+(g>0&&typeof persDevMul==='function'?g*persDevMul(p):g)+(RNG()-0.5)*0.03;
  if(p._xp>=1){p._xp-=1;p.ovr=Math.min(99,p.ovr+1);bumpAttrs(p,1,mine?tr.focus:null);if(mine&&p.ovr%2===0)addNews('📈',`${p.n} se na tréninku zlepšil (celkem ${p.ovr}).`,1);}
  else if(p._xp<=-1){p._xp+=1;p.ovr=Math.max(30,p.ovr-1);bumpAttrs(p,-1,null);}
 }
 if(tr.focus==='tac')S.cohesion=clamp(S.cohesion+2.5,0,100);else S.cohesion=clamp(S.cohesion+0.8,0,100);
 // finance
 const me=myClub();const wages=clubPlayers(S.clubId).reduce((s,p)=>s+playerWage(p),0);
 money(-wages,'wages','Mzdy hráčů');money(me.tv,'tv','Televizní práva a sponzoring');
 for(const id in S.clubs){if(id===S.clubId)continue;const c=S.clubs[id];c.money+=c.tv-c.wageBase;}
 aiTransfers();genOffers();
 if(typeof v4Week==='function')v4Week();
 if(me.money<0&&!S._debtWarn){S._debtWarn=1;addNews('⚠️',isOwn()?'Klub je v minusu. Vlož peníze, prodej hráče nebo sniž mzdy.':'Klub je v minusu. Vedení žádá prodej hráčů nebo snížení mezd.');S.boardTrust=clamp(S.boardTrust-4,0,100);}
 if(me.money>=0)S._debtWarn=0;}
function bumpAttrs(p,d,focus){const map={att:[1,3],def:[4,5],tech:[2,3],fit:[0,5]};const idx=focus&&map[focus]?map[focus]:[rint(0,5),rint(0,5)];
 for(const i of idx)p.a[i]=clamp(p.a[i]+d,20,99);if(RNG()<0.5){const j=rint(0,5);p.a[j]=clamp(p.a[j]+d,20,99);}}
function money(v,cat,label){const me=myClub();me.money+=v;if(v>=0)S.finSeason.inc+=v;else S.finSeason.exp-=v;if(S.finSeason[cat]!=null)S.finSeason[cat]+=Math.abs(v);
 S.fin.log.unshift({s:S.season,r:S.round,v:Math.round(v),t:label});if(S.fin.log.length>60)S.fin.log.length=60;}
function gateIncome(h){const c=S.clubs[h];if(!c||!S.leagues[c.lg])return {att:Math.round(((c&&c.cap)||8000)*0.85),inc:0};const pos=tablePos(h);const n=S.leagues[c.lg].clubs.length;const fill=clamp(0.62+0.3*(1-(pos-1)/n)+(RNG()-0.5)*0.12+(h===S.clubId?(fans()-55)/200-(c.ticketBase?(c.ticket/c.ticketBase-1)*0.22:0):0),0.3,1);const att=Math.round(c.cap*fill);return {att,inc:att*c.ticket};}
function addNews(ic,t,minor){S.news.unshift({ic,t,s:S.season,r:S.round,m:minor?1:0});if(S.news.length>90)S.news.length=90;}
// ----- přestupy AI -----
function transferWindow(){const half=Math.floor(S.maxRound/2);return S.round<=3||(S.round>=half-1&&S.round<=half+1);}
function aiTransfers(){if(!transferWindow()||RNG()>0.5)return;const ids=Object.keys(S.clubs).filter(id=>id!==S.clubId&&!S.clubs[id].tmp);
 for(let k=0;k<2;k++){const buyer=pick(ids);const seller=pick(ids);if(buyer===seller)continue;const b=S.clubs[buyer],s=S.clubs[seller];
  const cand=clubPlayers(seller).filter(p=>p.ovr>=b.rep-2&&p.ovr<=b.rep+6&&available(p));if(!cand.length)continue;const p=pick(cand);const fee=playerValue(p);
  if(b.money<fee*1.1||clubPlayers(buyer).length>=32||clubPlayers(seller).length<=19)continue;
  b.money-=fee;s.money+=fee;movePlayer(p,buyer);
  if(lgOf(buyer)===myClub().lg||p.ovr>=72)addNews('🔁',`Přestup: ${p.n} (${s.n} → ${b.n}) za ${fmtMoney(fee)}.`,1);}}
function movePlayer(p,to){const from=S.clubs[p.cl];if(from)from.pl=from.pl.filter(x=>x!==p.id);p.cl=to;if(to&&S.clubs[to])S.clubs[to].pl.push(p.id);p.mor=clamp(p.mor+5,0,100);
 if(from&&from.id===S.clubId&&S.tac){S.tac.xi=S.tac.xi.map(x=>x===p.id?null:x);S.tac.bench=S.tac.bench.filter(x=>x!==p.id);}
 if(to===S.clubId&&S.tac){}}
function genOffers(){if(!transferWindow()||RNG()>0.35)return;const mine=clubPlayers(S.clubId).filter(p=>p.inj<=0);if(mine.length<=16)return;
 const p=wpick(mine,x=>Math.pow(x.ovr/60,6)*(ageOf(x)<27?1.5:1));const others=Object.keys(S.clubs).filter(id=>id!==S.clubId&&!S.clubs[id].tmp&&S.clubs[id].rep>=p.ovr-6);
 let buyerName,buyer=null;if(others.length&&RNG()<0.6){buyer=pick(others);buyerName=S.clubs[buyer].n;}else{buyerName=foreignClubName(p);}
 if(S.offers.some(o=>o.p===p.id))return;const fee=Math.round(playerValue(p)*rnd(0.85,1.35)/1e4)*1e4;
 S.offers.push({id:'o'+Date.now()+rint(0,999),p:p.id,buyer,bn:buyerName,fee,r:S.round});
 addNews('📨',`Nabídka za hráče ${p.n}: ${fmtMoney(fee)} (klub ${buyerName}).`);}
function foreignClubName(p){const pool=FM_CAT.leagues.filter(l=>l.cc!==S.cc&&l.tier===1);const l=wpick(pool,x=>x.top?1:0);return l?pick(l.top)+' ('+l.country+')':'Zahraniční klub';}
function acceptOffer(oid){const o=S.offers.find(x=>x.id===oid);if(!o)return;const p=P(o.p);S.offers=S.offers.filter(x=>x.id!==oid);if(!p||p.cl!==S.clubId)return;
 const top3=clubPlayers(S.clubId).sort((a,b)=>b.ovr-a.ovr).slice(0,3).some(x=>x.id===p.id);if(top3){fansAdd(-6);addNews('😤',`Fanoušci nesou těžce odchod opory: ${p.n}.`,1);}
 money(o.fee,'tr_in','Prodej: '+p.n);if(o.buyer&&S.clubs[o.buyer]){S.clubs[o.buyer].money-=o.fee;movePlayer(p,o.buyer);}else{movePlayer(p,null);delete S.players[p.id];}
 addNews('✍️',`Prodej hotov: ${p.n} míří do klubu ${o.bn} za ${fmtMoney(o.fee)}.`);saveGame();}
function rejectOffer(oid){const o=S.offers.find(x=>x.id===oid);S.offers=S.offers.filter(x=>x.id!==oid);if(o){const p=P(o.p);if(p&&RNG()<0.35){p.mor=clamp(p.mor-8,0,100);addNews('😒',`${p.n} je zklamaný, že jsi odmítl nabídku klubu ${o.bn}.`,1);}}saveGame();}

// ===================== KONEC SEZÓNY =====================
const seasonLabel=s=>s+'/'+String((s+1)%100).padStart(2,'0');
function seasonOver(){return S.round>=S.maxRound&&!pendingEvent();}
function endSeason(){const me=myClub();const code=me.lg;const L=S.leagues[code];const li=leagueInfo(code);const tab=sortedTable(code);const pos=tablePos(S.clubId);const n=zoneSize(code,S.clubId);const row=L.table[S.clubId];
 const rep={season:S.season,lg:code,pos,n,pts:row.pts,w:row.w,d:row.d,l:row.l,gf:row.gf,ga:row.ga,exp:me.expect,moves:[],retired:[],youth:[],prize:0,trust0:S.boardTrust};
 // mistři
 for(const c in S.leagues){const t=sortedTable(c);const champ=S.clubs[t[0]];addNews('🏆',`${champ.n} vyhrál soutěž ${leagueLabel(c)} v sezóně ${seasonLabel(S.season)}.`);}
 if(pos===1){S.trophies.push({s:S.season,t:'Vítěz soutěže '+leagueLabel(code)});}
 // prémie
 const prize=Math.round(me.tv*10*Math.pow(1-(pos-1)/n,1.4)/1e4)*1e4+Math.round(me.tv*2/1e4)*1e4;rep.prize=prize;money(prize,'prize','Prémie za umístění v lize');
 // hodnocení vedení
 let d=(me.expect-pos)*4;if(pos===1)d+=12;
 // postupy / sestupy
 const lgs=countryLeagues(S.cc);const TB={};lgs.forEach(l=>TB[l.code]=sortedTable(l.code));const NEW={};lgs.forEach(l=>NEW[l.code]=TB[l.code].slice());
 for(let i=0;i<lgs.length-1;i++){const up=lgs[i],lo=lgs[i+1];if(!up.down&&!up.po)continue;const tu=TB[up.code],tl=TB[lo.code];
  const down=up.down?tu.slice(-up.down):[];const ups=up.down?ladder(lo.code).filter(id=>!S.clubs[id].b).slice(0,up.down):[];
  const po=cupById('po');if(up.po&&po)po.rounds[0].ties.filter(t=>t.up===up.code&&t.w===t.a).forEach(t=>{down.push(t.b);ups.push(t.a);});
  down.forEach(id=>{S.clubs[id].lg=lo.code;S.clubs[id].z=null;rep.moves.push({id,from:up.code,to:lo.code,dir:-1});});
  ups.forEach(id=>{S.clubs[id].lg=up.code;S.clubs[id].z=null;rep.moves.push({id,from:lo.code,to:up.code,dir:1});});
  NEW[up.code]=NEW[up.code].filter(id=>!down.includes(id)).concat(ups);
  NEW[lo.code]=NEW[lo.code].filter(id=>!ups.includes(id)).concat(down);}
 lgs.forEach(l=>S.leagues[l.code].clubs=NEW[l.code]);
 const myMove=rep.moves.find(m=>m.id===S.clubId);rep.myMove=myMove?myMove.dir:0;
 if(myMove&&myMove.dir>0){d+=18;S.trophies.push({s:S.season,t:'Postup do soutěže '+leagueLabel(myMove.to)});}
 if(myMove&&myMove.dir<0)d-=22;
 S.boardTrust=clamp(Math.round(S.boardTrust+d),0,100);rep.trust=S.boardTrust;rep.fired=S.boardTrust<=5;
 rep.moves.forEach(m=>addNews(m.dir>0?'⬆️':'⬇️',`${S.clubs[m.id].n} ${m.dir>0?'postupuje do soutěže':'sestupuje do soutěže'} ${leagueLabel(m.to)}.`,m.id!==S.clubId?1:0));
 // statistiky sezóny do historie hráčů
 const top=topScorers(code,1)[0];rep.topScorer=top?{n:top.p.n,g:top.g,club:S.clubs[top.p.cl]?S.clubs[top.p.cl].n:''}:null;
 // stárnutí, konce kariér, mládež
 rep.cups=(S.cups&&S.cups.list||[]).filter(c=>c.teams.includes(S.clubId)).map(c=>({n:c.n,ic:c.ic,r:myCupResult(c)}));
 S.prevRank=TB[lgs[0].code].slice();
 wEndSeason();
 S.season++;
 for(const id of Object.keys(S.players)){const p=S.players[id];const a=ageOf(p);
  if(a>=34){const pr=a>=39?1:(a-33)*0.22;if(RNG()<pr){if(p.cl===S.clubId)rep.retired.push(p.n);if(p.cl&&S.clubs[p.cl])S.clubs[p.cl].pl=S.clubs[p.cl].pl.filter(x=>x!==id);delete S.players[id];continue;}}
  // letní vývoj
  if(a<=21)p.ovr=Math.min(p.pot,p.ovr+rint(0,3));else if(a<=24)p.ovr=Math.min(p.pot,p.ovr+rint(0,2));else if(a>=32)p.ovr=Math.max(35,p.ovr-rint(0,2)-(a>=34?1:0));
  if(a>=30&&p.pot>p.ovr)p.pot=p.ovr;p.cond=100;p.inj=Math.max(0,p.inj-2);p.sus=0;p.mor=clamp(p.mor*0.6+28,30,90);}
 if(S.tac){S.tac.xi=S.tac.xi.map(x=>S.players[x]?x:null);S.tac.bench=S.tac.bench.filter(x=>S.players[x]);}
 for(const cid in S.clubs){const c=S.clubs[cid];const mine=cid===S.clubId;const need=mine?clamp(22-c.pl.length,3,6):clamp(23-c.pl.length,1,6);
  for(let k=0;k<need;k++){const y=youthPlayer(cid);if(mine)rep.youth.push(y.n);}}
 // nové finance pro změnu soutěže
 for(const m of rep.moves){const c=S.clubs[m.id];const avg=S.leagues[c.lg].clubs.reduce((s,id)=>s+S.clubs[id].wageBase,0)/S.leagues[c.lg].clubs.length;c.tv=Math.round((c.wageBase*0.45+avg*0.6)/100)*100;}
 S.offers=[];S.history.unshift(rep);if(S.history.length>30)S.history.length=30;
 if(typeof v4SeasonEnd==='function')v4SeasonEnd(rep);
 startSeason();
 if(S.tac){const ok=S.tac.xi.filter(Boolean).length;if(ok<11){const l=autoLineup(S.clubId,S.tac.form);S.tac.xi=l.xi;S.tac.bench=l.bench;}}
 addNews('📅',`Začíná sezóna ${seasonLabel(S.season)}. ${isOwn()?(S.role==='owner'?'Cíl pro trenéra':'Tvůj cíl')+': '+expectText(S.own.goal||myClub().expect):'Vedení očekává: '+expectText(myClub().expect)}.`);
 S.lastSeasonRep=rep;saveGame();return rep;}
function myCupResult(c){const me=S.clubId;if(c.winner===me)return 'vítěz';if(c.q){const t=c.rounds[0].ties.find(x=>x.a===me||x.b===me);return t&&t.w===me?'postup do skupin':'konec v kvalifikaci';}if(c.id==='po'){const t=c.rounds[0].ties.find(x=>x.a===me||x.b===me);return t&&t.w===me?'úspěch':'neúspěch';}
 let last=null;c.rounds.forEach(R=>{if(R.ties.some(t=>t.a===me||t.b===me))last=R;});
 if(c.kind==='grp'&&!last){const g=c.groups.find(g=>g.cl.includes(me));return g?'skupina ('+(grpSorted(g).indexOf(me)+1)+'. místo)':'—';}
 if(!last)return 'nehrál';const t=last.ties.find(x=>x.a===me||x.b===me);if(!t.w)return last.nm.toLowerCase()+' (nedohráno)';return t.w===me?last.nm.toLowerCase():'konec – '+last.nm.toLowerCase();}
function youthPlayer(cid){const c=S.clubs[cid];const names=FM_CAT.names[S.cc]||FM_CAT.names['GB-ENG'];const nm=pick(names[0])+' '+pick(names[1]);
 const posL=['GK','CB','CB','LB','RB','DM','CM','CM','AM','LM','RM','LW','RW','ST','ST'];let pos=pick(posL);const age=rint(16,18);const ai=cid!==S.clubId;
 {const cnt={};c.pl.forEach(id=>{const q=S.players[id];if(q){const g=q.pos==='GK'?'GK':['CB','LB','RB'].includes(q.pos)?'DEF':['DM','CM','AM','LM','RM'].includes(q.pos)?'MID':'ATT';cnt[g]=(cnt[g]||0)+1;}});const want={GK:2,DEF:7,MID:7,ATT:5};const gp={GK:['GK'],DEF:['CB','CB','LB','RB'],MID:['DM','CM','CM','AM','LM','RM'],ATT:['LW','RW','ST','ST']};let best=null,bd=-99;if((cnt.GK||0)<2||UI._forceGK){bd=9;best='GK';}else for(const g in want){const d=want[g]-(cnt[g]||0);if(d>bd){bd=d;best=g;}}if(bd>0)pos=pick(gp[best]);}
 let lvl=c.rep||60;if(ai){const top=c.pl.map(id=>S.players[id]).filter(Boolean).map(q=>q.ovr).sort((a,b)=>b-a).slice(0,14);if(top.length)lvl=Math.max(lvl,top.reduce((a,b)=>a+b,0)/top.length);}
 const base=ai?clamp(lvl-rint(5,11),38,80):clamp(lvl-rint(12,20),38,70);const ovr=clamp(Math.round(base+gauss()*3),36,ai?82:72);const pot=clamp(Math.round(ovr+rint(8,26)+(cid===S.clubId&&RNG()<0.2?6:0)),ovr,94);
 const prof={GK:[0,-30,-10,-25,-30,-5],CB:[-8,-25,-12,-18,6,4],LB:[4,-20,-6,-6,0,-4],RB:[4,-20,-6,-6,0,-4],DM:[-8,-12,0,-6,2,4],CM:[-5,-6,3,1,-8,0],AM:[0,-1,4,5,-28,-8],LM:[5,-5,0,3,-22,-8],RM:[5,-5,0,3,-22,-8],LW:[7,-2,-3,4,-32,-10],RW:[7,-2,-3,4,-32,-10],ST:[3,5,-10,0,-38,2]}[pos];
 const a=prof.map(x=>clamp(Math.round(ovr+x+gauss()*4),20,99));
 const p=mkPlayer([nm,pos,S.season-age,ovr,pot,S.cc,a,1],cid);p.yth=1;c.pl.push(p.id);return p;}
function topScorers(code,n){const ids=new Set(S.leagues[code].clubs);const arr=[];for(const id in S.players){const p=S.players[id];if(p.cl&&ids.has(p.cl)&&p.st.g>0)arr.push({p,g:p.st.g,as:p.st.as});}
 return arr.sort((a,b)=>b.g-a.g||b.as-a.as).slice(0,n||15);}

// ===================== ŽIVÝ ZÁPAS – engine =====================
function sideSetup(cid,isUser){const c=S.clubs[cid];let form,xi,bench,tac;
 if(isUser){tac=tacDefaults(Object.assign({},S.tac));form=tac.form;xi=tac.xi.slice();bench=tac.bench.slice();
  // doplň chybějící (zranění, tresty)
  const used=new Set();xi=xi.map(id=>{const p=P(id);if(p&&available(p)&&p.cl===cid&&!used.has(id)){used.add(id);return id;}return null;});
  if(xi.some(x=>!x)){const pool=clubPlayers(cid).filter(p=>available(p)&&!used.has(p.id));FORMS[form].forEach((s,i)=>{if(xi[i])return;let best=null,bv=-1;pool.forEach(p=>{if(used.has(p.id))return;const v=p.ovr*posFitP(p,s[0]);if(v>bv){bv=v;best=p;}});if(best){xi[i]=best.id;used.add(best.id);}});}
  bench=bench.filter(id=>{const p=P(id);return p&&available(p)&&p.cl===cid&&!used.has(id);});
  if(bench.length<7){clubPlayers(cid).filter(p=>available(p)&&!used.has(p.id)&&!bench.includes(p.id)).sort((a,b)=>b.ovr-a.ovr).forEach(p=>{if(bench.length<9)bench.push(p.id);});}
 }else{form=c.form||bestForm(cid);const l=autoLineup(cid,form);xi=l.xi;bench=l.bench;tac={ment:'bal',press:'mid',style:pick(['short','direct','counter'])};}
 const ov=xi.map(P).filter(Boolean);return {cid,form,xi,slots:FORMS[form].map(s=>s[0]),bench,tac,subs:0,maxSubs:5,user:isUser,red:0,avgOvr:ov.length?ov.reduce((s,p)=>s+p.ovr,0)/ov.length:60};}
function createMatch(h,a,F){const M={F:F||null,ko:F&&F.ko||null,cup:!!(F&&F.type==='cup'),h:sideSetup(h,h===S.clubId),a:sideSetup(a,a===S.clubId),min:0,half:1,score:[0,0],ev:[],stats:[mkSt(),mkSt()],rt:{},played:{},cond:{},ended:false,added:[rint(1,3),rint(2,6)],poss:[50,50],ht:false};
 M.sides=[M.h,M.a];
 [M.h,M.a].forEach(sd=>{sd.xi.forEach(id=>{if(id){M.rt[id]=6.0;M.played[id]={from:0,to:null};}});});
 const g=gateIncome(h);M.att=g.att;M.gate=g.inc;if(F&&F.neutral){M.att=Math.round(clamp(30000+(clubStr(h)+clubStr(a)-120)*700,12000,70000));M.gate=0;}M.wx=matchWeather(h,F);M.fx=wxFx(M.wx);recalc(M);
 M.ev.push({m:0,t:'ko',tx:`Rozhodčí zahájil utkání. ${S.clubs[h].n} – ${S.clubs[a].n}, v hledišti ${fmtNum(M.att)} diváků. ${WX_INTRO[M.wx.k]} (${M.wx.t} °C)`});
 return M;}
function mkSt(){return {sh:0,sot:0,cor:0,fou:0,yc:0,rc:0,off:0,xg:0,pos:0,sav:0};}
function recalc(M){M.str=[M.h,M.a].map((sd,i)=>{const s=lineStrength(sd.xi,sd.form,sd.tac);if(sd.user){const coh=(S.cohesion-50)/50*1.2;s.att+=coh;s.def+=coh;s.mid+=coh;}else if(M.sides&&M.sides[1-i].user){const rb=rivBonus(sd.cid);s.att+=rb;s.def+=rb;s.mid+=rb;}if(sd.tac.style==='short'&&M.fx&&M.fx.short)s.mid+=M.fx.short;return s;});
 const [xh,xa]=xgPair(M.str[0],M.str[1]);M.xg=[xh,xa];const mh=M.str[0].mid+2,ma=M.str[1].mid;M.possBase=clamp(50+(mh-ma)*1.6+(M.h.tac.style==='short'?3:0)-(M.a.tac.style==='short'?3:0)-(M.h.tac.style==='counter'?4:0)+(M.a.tac.style==='counter'?4:0)+(M.h.tac.tempo==='slow'?3:0)-(M.a.tac.tempo==='slow'?3:0),25,75);}
function onPitch(sd){return sd.xi.filter(Boolean);}
function nm(id){const p=P(id);return p?pSurname(p):'?';}
const T_GOAL=['{S} prošel až do vápna a zakončil přesně k tyči.','{S} napálil míč z hranice vápna přímo pod břevno.','{S} si naběhl za obranu a v klidu zakončil.','Dorážka! {S} byl na správném místě a míč zamířil do sítě.','{S} hlavičkou po centru nedal brankáři šanci.','{S} obhodil brankáře a poslal míč do prázdné branky.','{S} vystřelil k tyči a brankář se jen natáhl.','{S} zakončil z první a míč zapadl k tyči.'];
const T_GOAL_HEAD=['{S} hlavičkou po rohovém kopu skóroval.','{S} vyskočil nejvýš ze všech a hlavou skóroval.'];
const T_SAVE=['{S} šel sám na brankáře, ale {K} skvěle zasáhl.','{K} vytáhl střelu, kterou vyslal {S}, na roh.','{S} vystřelil z dálky, {K} si s tím poradil.','{K} chytil jedovatou střelu, kterou poslal {S}.','{S} zakončoval z úhlu, {K} byl na místě.'];
const T_MISS=['{S} pálil z dálky, ale těsně vedle.','{S} hlavičkoval nad břevno.','{S} to zkusil z přímého kopu, míč letěl nad.','Velká šance! {S} ale z malého vápna přestřelil.','{S} se uvolnil, ale trefil jen boční síť.'];
const T_POST=['{S} trefil tyč! Domácí fanoušci se chytají za hlavu.','Břevno! {S} měl gól na kopačce.'];
const T_BLOCK=['Obránce zablokoval střelu, kterou vyslal {S}.','{S} vystřelil, ale míč skončil v hradbě obránců.'];
const T_FILL=['Hra se přelévá ve středu pole.','{T} drží míč a trpělivě hledají cestu dopředu.','{T} vysoko napadají rozehrávku soupeře.','Rozhodčí přerušil hru kvůli faulu ve středu hřiště.','{T} se tlačí dopředu, ale obrana soupeře drží.','Tempo zápasu na chvíli opadlo.','{T} zkoušejí hrát po křídlech.'];
function fillT(t,o){return t.replace('{S}',o.S||'').replace('{K}',o.K||'').replace('{A}',o.A||'').replace('{T}',o.T||'');}
function sideName(i){return i===0?'Domácí':'Hosté';}
function gkOf(sd){const i=sd.slots.indexOf('GK');return i>=0?sd.xi[i]:null;}
function stepMinute(M){if(M.ended)return [];const out=[];M.min++;const m=M.min;
 const half=M.half;const limit=half===1?45+M.added[0]:half===2?90+M.added[1]:half===3?105+(M.added[2]||1):120+(M.added[3]||2);
 if(m%5===0)recalc(M);
 // držení míče
 const pv=clamp(M.possBase+gauss()*6,15,85);M.stats[0].pos+=pv;M.stats[1].pos+=100-pv;
 // únava
 [M.h,M.a].forEach(sd=>{const drain=sd.tac.press==='high'?0.3:sd.tac.press==='low'?0.18:0.24;const dm=(M.fx?M.fx.drain:1)*tacDrain(sd.tac);onPitch(sd).forEach(id=>{const p=P(id);if(p)p.cond=Math.max(5,p.cond-drain*dm*(1.15-p.a[5]/250));});});
 for(let i=0;i<2;i++){const sd=M.sides[i],op=M.sides[1-i];const rate=M.xg[i]/90/0.128*(typeof gsMul==='function'?gsMul(M.score[i],M.score[1-i],m>=60):1)*(m>80&&M.score[i]<M.score[1-i]?1.12:1)*(op.red?0.85:1)*(M.fx?M.fx.rate:1)*tacRate(sd.tac)*(op.tac.tempo==='fast'?1.04:1);
  if(RNG()<rate){out.push(...chance(M,i));}
  else if(RNG()<0.055*(sd.tac.width==='wide'?1.3:sd.tac.width==='narrow'?0.8:1)){out.push({m,t:'cor',s:i,tx:`${sideName(i)} mají rohový kop.`});M.stats[i].cor++;if(RNG()<0.12*spMul(sd)*(typeof gsMul==='function'?gsMul(M.score[i],M.score[1-i],m>=60):1))out.push(...chance(M,i,'head'));}
  if(RNG()<0.12){M.stats[i].fou++;if(RNG()<0.16*bribeCardMul(M,i))out.push(...card(M,i));}
  if(RNG()<0.02*(op.tac.trap?1.8:1)){const p=pick(onPitch(sd).filter(id=>GRP(P(id).pos)==='F'))||pick(onPitch(sd));M.stats[i].off++;if(RNG()<0.4)out.push({m,t:'off',s:i,tx:`${nm(p)} byl v ofsajdu.`});}
  if(RNG()<0.0028*(sd.tac.press==='high'?1.3:1)*(M.fx?M.fx.inj:1)){const id=pick(onPitch(sd).filter(x=>GRP(P(x).pos)!=='G'));if(id){const p=P(id);p._minj=rint(1,5)+(RNG()<0.15?rint(3,8):0);out.push({m,t:'inj',s:i,p:id,tx:`🚑 ${nm(id)} zůstal ležet na trávníku a nemůže pokračovat.`});forceSub(M,i,id,out);}}}
 if(!out.length&&RNG()<0.14){const i=RNG()<M.possBase/100?0:1;const wf=M.wx&&WX_FILL[M.wx.k];if(wf&&RNG()<0.22)out.push({m,t:'fill',tx:pick(wf)});else out.push({m,t:'fill',s:i,tx:fillT(pick(T_FILL),{T:sideName(i)})});}
 // AI střídání
 for(let i=0;i<2;i++){const sd=M.sides[i];if(sd.user&&!M.autoUser)continue;if(m>=58&&sd.subs<sd.maxSubs&&RNG()<0.09){aiSub(M,i,out);}}
 if(m>=limit){if(half===1){M.half=2;M.min=45;M.ht=true;out.push({m:45,t:'ht',tx:`Poločas. ${S.clubs[M.h.cid].s} ${M.score[0]}:${M.score[1]} ${S.clubs[M.a.cid].s}`});[M.h,M.a].forEach(sd=>onPitch(sd).forEach(id=>{const p=P(id);if(p)p.cond=Math.min(100,p.cond+4);}));}
  else if(half===2&&M.ko&&M.ko.decide&&!M.et&&M.score[0]+M.ko.agg[0]===M.score[1]+M.ko.agg[1]){M.et=true;M.half=3;M.min=90;[M.h,M.a].forEach(sd=>{sd.maxSubs++;onPitch(sd).forEach(id=>{const p=P(id);if(p)p.cond=Math.min(100,p.cond+2);});});
   out.push({m:90,t:'et',tx:`Konec základní hrací doby za stavu ${M.score[0]}:${M.score[1]}.${M.ko.legs===2?` Celkové skóre ${M.score[0]+M.ko.agg[0]}:${M.score[1]+M.ko.agg[1]}.`:''} Bude se prodlužovat! Každý tým může jednou navíc střídat.`});}
  else if(half===3){M.half=4;M.min=105;out.push({m:105,t:'et',tx:`Konec první půle prodloužení. ${S.clubs[M.h.cid].s} ${M.score[0]}:${M.score[1]} ${S.clubs[M.a.cid].s}`});}
  else{M.ended=true;const fm=M.et?120:90;out.push({m:fm,t:'ft',tx:`${M.et?'Konec prodloužení!':'Konec zápasu!'} ${S.clubs[M.h.cid].n} ${M.score[0]}:${M.score[1]} ${S.clubs[M.a.cid].n}`});if(M.ko&&M.ko.legs===2&&M.ko.leg===1)out.push({m:fm,t:'ft',tx:`Celkové skóre dvojzápasu ${M.score[0]+M.ko.agg[0]}:${M.score[1]+M.ko.agg[1]}.`});if(M.ko&&M.ko.decide&&M.score[0]+M.ko.agg[0]===M.score[1]+M.ko.agg[1])shootout(M,out);finishMatch(M);}}
 out.forEach(e=>M.ev.push(e));return out;}
function shooterOf(sd,kind){const ids=onPitch(sd).filter(id=>GRP(P(id).pos)!=='G');const R=sd.tac.roles||{};return wpick(ids.map(P),p=>{const rm=R[p.id]==='att'||R[p.id]==='free'?1.4:R[p.id]==='def'?0.7:1;const g=GRP(p.pos);let w=(g==='F'?6:g==='M'?(p.pos==='AM'?3.6:1.7):0.55)*Math.pow(Math.max(20,p.a[1])/60,3);if(kind==='head')w=(g==='D'?3:g==='F'?3:1)*Math.pow(Math.max(20,p.a[5])/60,3);return w*rm;});}
function spMul(sd){if(!sd.user)return 1;const tk=sd.tac.sp&&onPitch(sd).includes(sd.tac.sp)?P(sd.tac.sp):null;return clamp(1+((S.training.sp||40)-40)/160+(tk?((tk.a[2]||60)-65)/120:0),0.8,1.5);}
function bribePenMul(M,i){const b=M.bribe;if(!b)return 1;return b.side===i?1+0.35*b.l:Math.max(0.4,1-0.15*b.l);}
function bribeCardMul(M,i){const b=M.bribe;if(!b)return 1;return b.side===i?Math.max(0.5,1-0.15*b.l):1+0.25*b.l;}
function chance(M,i,kind){const sd=M.sides[i],op=M.sides[1-i];const m=M.min;const out=[];let sh=shooterOf(sd,kind);if(!sh)return out;const gk=P(gkOf(op));
 let q;const pen=!kind&&RNG()<0.024*bribePenMul(M,i);if(pen){q=0.76;const tk=sd.tac.pk&&onPitch(sd).includes(sd.tac.pk)?P(sd.tac.pk):null;if(tk)sh=tk;}else{q=clamp(0.012+Math.pow(RNG(),5.5)*0.62,0.01,0.6);if(kind==='head')q*=0.8;if(op.tac.trap&&!kind&&RNG()<0.07)q=Math.max(q,0.38);}
 const shotQ=(sh.a[1]+(pen?sh.a[1]:sh.ovr))/2;const gkQ=gk?gk.ovr*(0.85+0.15*gk.cond/100):45;
 let pg=q*clamp(1+(shotQ-gkQ-8)/160,0.8,1.2)*(M.fx&&!pen?M.fx.acc:1);M.stats[i].sh++;M.stats[i].xg+=q;
 const S1=pSurname(sh),K=gk?pSurname(gk):'brankář';
 if(pen){if(RNG()<0.1&&!(M.bribe&&M.bribe.side===i)&&M._fp!==i){M.stats[i].sh--;M.stats[i].xg-=q;out.push({m,t:'var',s:i,tx:`📺 Videorozhodčí! Sudí si zákrok přehrál u monitoru a nařízenou penaltu pro ${S.clubs[sd.cid].n} odvolal. Hraje se dál.`});return out;}out.push({m,t:'pen',s:i,p:sh.id,tx:`Penalta! ${sideName(i)} kopou pokutový kop, k míči se staví ${S1}.`});}
 const r=RNG();
 if(r<pg&&!pen&&typeof varGoalP==='function'&&RNG()<varGoalP(M,i)){M.stats[i].sot++;out.push({m,t:'var',vg:1,s:i,p:sh.id,tx:varGoalTx(M,i)});}
 else if(r<pg){M.stats[i].sot++;M.score[i]++;const as=pen?null:(RNG()<0.74?pickAssistM(sd,sh.id,kind):null);
  M.rt[sh.id]=(M.rt[sh.id]||6)+1.05;if(as)M.rt[as.id]=(M.rt[as.id]||6)+0.6;onPitch(op).forEach(id=>{const g=GRP(P(id).pos);if(g==='D'||g==='G')M.rt[id]=(M.rt[id]||6)-0.22;});
  const t=pen?`${S1} poslal brankáře na opačnou stranu.`:fillT(pick(kind==='head'?T_GOAL_HEAD:T_GOAL),{S:S1});
  out.push({m,t:'goal',s:i,p:sh.id,as:as&&as.id,pen,tx:`⚽ GÓL! ${t}${as?' Asistence: '+pSurname(as)+'.':''}`,sc:M.score.slice()});}
 else{const r2=RNG();if(r2<0.42){M.stats[i].sot++;M.stats[1-i].sav++;if(gk)M.rt[gk.id]=(M.rt[gk.id]||6)+0.22;out.push({m,t:'save',s:i,p:sh.id,tx:pen?`${K} penaltu chytil! ${S1} neproměnil.`:fillT(pick(T_SAVE),{S:S1,K})});}
  else if(r2<0.47){out.push({m,t:'post',s:i,p:sh.id,tx:fillT(pick(T_POST),{S:S1}).replace('Domácí fanoušci',i===0?'Domácí fanoušci':'Hostující fanoušci')});}
  else if(r2<0.66&&!pen){out.push({m,t:'block',s:i,p:sh.id,tx:fillT(pick(T_BLOCK),{S:S1})});}
  else{if(q>0.3)M.rt[sh.id]=(M.rt[sh.id]||6)-0.15;out.push({m,t:'miss',s:i,p:sh.id,tx:pen?`${S1} penaltu přestřelil!`:fillT(pick(T_MISS),{S:S1})});}}
 return out;}
function pickAssistM(sd,ex,kind){const ids=onPitch(sd).filter(id=>id!==ex);return wpick(ids.map(P),p=>{const g=GRP(p.pos);return (g==='F'?2.4:g==='M'?3.2:g==='D'?(kind==='head'?0.6:1.1):0.05)*Math.pow(Math.max(20,p.a[2])/60,2)*(['LM','RM','LW','RW','LB','RB'].includes(p.pos)&&kind==='head'?2:1);});}
function card(M,i){const sd=M.sides[i];const m=M.min;const ids=onPitch(sd).filter(id=>P(id).pos!=='GK');const id=wpick(ids,x=>(GRP(P(x).pos)==='D'?2:GRP(P(x).pos)==='M'?1.5:0.8)*(typeof persCardMul==='function'?persCardMul(x):1)*(M.yc&&M.yc[x]?0.35:1));if(!id)return [];
 const out=[];M.yc=M.yc||{};const direct=RNG()<0.03;
 if(direct||M.yc[id]){M.stats[i].rc++;M.rt[id]=(M.rt[id]||6)-1.5;out.push({m,t:'red',s:i,p:id,tx:direct?`🟥 Červená karta! ${nm(id)} zastavil soupeře v brejku a jde předčasně do kabin.`:`🟥 Druhá žlutá a červená! ${nm(id)} musí opustit hřiště.`});P(id)._mred=direct?rint(1,3):1;removeFromPitch(M,i,id);sd.red++;}
 else{M.yc[id]=1;M.stats[i].yc++;M.rt[id]=(M.rt[id]||6)-0.3;out.push({m,t:'yel',s:i,p:id,tx:`🟨 Žlutá karta: ${nm(id)} ${pick(['za zákrok zezadu.','za taktický faul.','za protesty proti rozhodnutí sudího.','za podražení v protiútoku.','za zdržování hry.'])}`});P(id)._myc=(P(id)._myc||0)+1;}
 return out;}
function removeFromPitch(M,i,id){const sd=M.sides[i];const k=sd.xi.indexOf(id);if(k>=0)sd.xi[k]=null;if(M.played[id])M.played[id].to=M.min;recalc(M);}
function doSub(M,i,outId,inId,silent){const sd=M.sides[i];if(sd.subs>=sd.maxSubs)return null;const k=sd.xi.indexOf(outId);if(k<0)return null;const bi=sd.bench.indexOf(inId);if(bi<0)return null;
 sd.xi[k]=inId;sd.bench.splice(bi,1);sd.subs++;if(M.played[outId])M.played[outId].to=M.min;M.played[inId]={from:M.min,to:null};M.rt[inId]=6.0;sd.out=(sd.out||[]).concat(outId);recalc(M);
 const e={m:M.min,t:'sub',s:i,pin:inId,pout:outId,tx:`🔄 Střídání – ${sideName(i).toLowerCase()}: přichází ${nm(inId)}, odchází ${nm(outId)}.`};if(!silent)M.ev.push(e);return e;}
function bestBenchFor(sd,slot){let best=null,bv=-1;sd.bench.forEach(id=>{const p=P(id);if(!p)return;const v=p.ovr*posFitP(p,slot);if(v>bv){bv=v;best=id;}});return best;}
function forceSub(M,i,id,out){const sd=M.sides[i];const k=sd.xi.indexOf(id);if(k<0)return;if(M.played[id])M.played[id].to=M.min;
 if(sd.user&&!M.autoUser){sd.xi[k]=null;M.needSub={i,slot:k};recalc(M);return;}
 const inId=bestBenchFor(sd,sd.slots[k]);if(inId&&sd.subs<sd.maxSubs){sd.xi[k]=id;const e=doSub(M,i,id,inId,true);if(e)out.push(e);}else{sd.xi[k]=null;recalc(M);}}
function aiSub(M,i,out){const sd=M.sides[i];const cands=onPitch(sd).map(P).filter(p=>p.pos!=='GK').sort((a,b)=>a.cond-b.cond||((M.rt[a.id]||6)-(M.rt[b.id]||6)));const o=cands[0];if(!o||o.cond>68&&(M.rt[o.id]||6)>5.8)return;
 const k=sd.xi.indexOf(o.id);const inId=bestBenchFor(sd,sd.slots[k]);if(!inId)return;const e=doSub(M,i,o.id,inId,true);if(e)out.push(e);}
function shootout(M,out){const m=M.min;out.push({m,t:'pso',tx:'Rozhodnou penalty! Začíná penaltový rozstřel.'});
 const k=[0,1].map(i=>{const on=onPitch(M.sides[i]);return on.filter(id=>P(id).pos!=='GK').sort((a,b)=>(P(b).a[1]||50)-(P(a).a[1]||50)).concat(on.filter(id=>P(id).pos==='GK'));});
 const sc=[0,0],kk=[0,0];const shot=i=>{const ids=k[i];if(!ids.length){kk[i]++;return;}const id=ids[kk[i]%ids.length];kk[i]++;const p=P(id);const g=P(gkOf(M.sides[1-i]));
  const pr=clamp(0.75+((p.a[1]||60)-65)/220-(g?((g.a[0]||60)-65)/400:0),0.55,0.92);const ok=RNG()<pr;if(ok)sc[i]++;
  out.push({m,t:'pk',s:i,tx:ok?`${nm(id)} proměnil penaltu (${sc[0]}:${sc[1]}).`:(g&&RNG()<0.6?`${pSurname(g)} chytil penaltu, kterou kopal ${nm(id)} (${sc[0]}:${sc[1]}).`:`${nm(id)} penaltu nedal, míč letěl mimo (${sc[0]}:${sc[1]}).`)});};
 const over=()=>sc[0]>sc[1]+(5-kk[1])||sc[1]>sc[0]+(5-kk[0]);
 for(let j=0;j<5;j++){shot(0);if(over())break;shot(1);if(over())break;}
 let g=0;while(sc[0]===sc[1]&&g++<30){shot(0);shot(1);}
 M.pen=sc;const w=sc[0]>sc[1]?0:1;out.push({m,t:'pso',s:w,tx:`${S.clubs[M.sides[w].cid].n} vyhrál penaltový rozstřel ${Math.max(...sc)}:${Math.min(...sc)}.`});}
function simToEnd(M){M.autoUser=true;let guard=0;while(!M.ended&&guard++<260)stepMinute(M);}
function finishMatch(M){const res=[M.score[0],M.score[1]];
 for(let i=0;i<2;i++){const sd=M.sides[i];const conc=res[1-i];const win=res[i]>res[1-i],draw=res[i]===res[1-i];
  for(const id in M.played){const p=P(id);if(!p||p.cl!==sd.cid)continue;const pl=M.played[id];const mins=(pl.to==null?(M.et?120:90):pl.to)-pl.from;let r=M.rt[id]||6;
   const g=GRP(p.pos);if(conc===0&&(g==='D'||g==='G')&&mins>=60){r+=0.5;if(!M.cup)p.st.cs+=g==='G'?1:0;}r+=win?0.3:draw?0:-0.25;r=clamp(r+gauss()*0.25,3,10);M.rt[id]=Math.round(r*10)/10;
   const st=M.cup?(p.cst||(p.cst=newStats())):p.st;st.ap++;p.car.ap++;st.min+=mins;st.rt+=M.rt[id];p.form.push(M.rt[id]);if(p.form.length>5)p.form.shift();
   if(p._myc&&M.cup){delete p._myc;}
   if(p._myc){p.yc+=p._myc;p.st.yc+=p._myc;if(p.yc>=5){p.sus=1;p.justSus=S.round;p.yc=0;if(sd.user)addNews('⛔',`${p.n} dostal pátou žlutou kartu a jeden zápas nebude hrát.`);}delete p._myc;}
   if(p._mred){p.sus=p._mred;p.justSus=S.round;p.st.rc++;if(sd.user)addNews('🟥',`${p.n} byl vyloučen a ${p.sus===1?'jeden zápas':p.sus+' zápasy'} nebude hrát.`);delete p._mred;}
   if(p._minj){p.inj=p._minj;if(sd.user)addNews('🚑',`${p.n} se zranil a bude chybět ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.`);delete p._minj;}
   if(sd.user)p.mor=clamp(p.mor+(win?6:draw?1:-6),5,100);}
  if(sd.user){clubPlayers(sd.cid).forEach(p=>{if(!M.played[p.id]&&p.ovr>=sd.avgOvr)p.mor=clamp(p.mor-1.5,5,100);});}}
 M.ev.filter(e=>e.t==='goal').forEach(e=>{const p=e.og?null:P(e.p);if(p){const st=M.cup?(p.cst||(p.cst=newStats())):p.st;st.g++;p.car.g++;}if(e.as){const a=P(e.as);if(a){const st=M.cup?(a.cst||(a.cst=newStats())):a.st;st.as++;}}});
 const tot=M.stats[0].pos+M.stats[1].pos||1;M.poss=[Math.round(M.stats[0].pos/tot*100),0];M.poss[1]=100-M.poss[0];
 M.result={pen:M.pen||null,et:!!M.et,h:M.h.cid,a:M.a.cid,gh:res[0],ga:res[1],st:{c:M.stats[0].cor+M.stats[1].cor,k:M.stats[0].yc+M.stats[1].yc+M.stats[0].rc+M.stats[1].rc},ht:(()=>{const i=M.ev.findIndex(e=>e.t==='ht');if(i<0)return null;let x=0,y=0;for(let j=0;j<i;j++){const e=M.ev[j];if(e.t==='goal'){if(e.s===0)x++;else y++;}}return [x,y];})(),ev:M.ev.filter(e=>e.t==='goal').map(e=>{const r={t:'g',c:M.sides[e.s].cid,p:e.p,m:e.m};if(e.og)r.og=1;return r;})};}
function motm(M){let best=null,bv=-1;for(const id in M.played){const v=M.rt[id]||0;if(v>bv){bv=v;best=id;}}return best;}

// ===================== SVĚT: souběžná simulace ostatních zemí =====================
let WD=null;const _wcb=[];let WFIX={};let BETRES={};
function FM_WORLDDATA(o){WD=o;_wcb.splice(0).forEach(f=>f.ok(o));}
function loadWorld(){if(WD)return Promise.resolve(WD);return new Promise((ok,fail)=>{_wcb.push({ok,fail});if(_wcb.length>1)return;
 const s=document.createElement('script');s.src='data/world.js?v='+(window.FM_DATA_VER||'1');s.async=true;
 s.onerror=()=>{s.remove();_wcb.splice(0).forEach(f=>f.fail(new Error('Nepodařilo se načíst data ostatních lig. Zkontroluj připojení k internetu.')));};document.head.appendChild(s);});}
function wRow(key){if(!WD||!key)return null;const i=key.lastIndexOf(':');const L=WD[key.slice(0,i)];return L?L[+key.slice(i+1)]:null;}
function isWorld(ref){return typeof ref==='string'&&ref.indexOf(':')>0&&!S.clubs[ref];}
// jednotný přístup ke klubu (domácí i zahraniční)
function CL(ref){if(!ref)return null;if(S.clubs[ref])return S.clubs[ref];const r=wRow(ref);const lg=wLeagueOf(ref);
 if(!r)return {id:ref,n:'Zahraniční klub',s:'???',c:['#556','#fff'],lg,foreign:1};return {id:ref,n:r[0],s:r[1],c:[r[2],r[3]],b:r[5],lg,foreign:1};}
function clubStr(ref){const c=S.clubs[ref];if(c)return c.rep||60;return (S.W&&S.W.str[ref])||60;}
function clubCC(ref){if(S.clubs[ref]&&!S.clubs[ref].tmp)return S.cc;const lg=wLeagueOf(ref);const li=lg&&leagueInfo(lg);return li?li.cc:null;}
let _wAt=null;function wLeagueOf(ref){if(!S.W)return ref.split(':')[0];if(!_wAt){_wAt={};for(const code in S.W.lg)S.W.lg[code].cl.forEach(k=>_wAt[k]=code);}return _wAt[ref]||ref.split(':')[0];}
function synth(ref){const s=clubStr(ref);return {att:s,def:s,mid:s,gk:s,ovr:s};}
function initWorld(){S.W={lg:{},str:{},prev:{},cupW:{},champ:{}};_wAt=null;WFIX={};
 for(const l of FM_CAT.leagues){if(l.cc===S.cc||!WD[l.code])continue;const cl=WD[l.code].map((_,i)=>l.code+':'+i);S.W.lg[l.code]={cl,ord:[],t:{},r:0};if(l.zn){const Z={};cl.forEach(k=>{const r=wRow(k);Z[k]=r&&r[7]!=null?r[7]:0;});S.W.lg[l.code].z=Z;}
  cl.forEach(k=>{S.W.str[k]=Math.round((wRow(k)[4]+gauss()*0.6)*10)/10;});S.W.prev[l.code]=cl.slice().sort((a,b)=>S.W.str[b]-S.W.str[a]);}
 wStartSeason();}
function wZoneFix(code){const L=S.W.lg[code];const n=zoneN(code);if(!n||!L.z)return;const cnt=Array(n).fill(0);L.cl.forEach(k=>{if(L.z[k]!=null&&L.z[k]<n)cnt[L.z[k]]++;else delete L.z[k];});for(const k in L.z)if(!L.cl.includes(k))delete L.z[k];L.cl.forEach(k=>{if(L.z[k]==null){const i=cnt.indexOf(Math.min(...cnt));L.z[k]=i;cnt[i]++;}});}
function wStartSeason(){WFIX={};_wAt=null;for(const code in S.W.lg){const L=S.W.lg[code];if(zoneN(code)&&!L.z)L.z={};wZoneFix(code);L.ord=shuffle(L.cl.slice());L.t={};L.sc={};L.cl.forEach(k=>L.t[k]=[0,0,0,0,0,0,0]);L.r=0;}}
function wFix(code){if(!WFIX[code]){const L=S.W.lg[code];const n=zoneN(code);if(n&&L.z){const rounds=[];for(let z=0;z<n;z++)roundRobin(L.ord.filter(k=>L.z[k]===z),2).forEach((r,i)=>(rounds[i]=rounds[i]||[]).push(...r));WFIX[code]=rounds;}else WFIX[code]=roundRobin(L.ord);}return WFIX[code];}
function wMatch(h,a){const [xh,xa]=xgPair(synth(h),synth(a));if(RNG()<0.002)return {gh:3,ga:0,ab:1};const g=segGoals(xh,xa);return {gh:g[0],ga:g[1]};}
function wStar(L,k,g){const r=wRow(k);const st=r&&r[6];if(!st||!st.length)return;L.sc=L.sc||{};for(let i=0;i<g;i++){const u=RNG();const j=u<0.27?0:u<0.41?1:-1;if(j<0||!st[j])continue;const key=k+'|'+j;L.sc[key]=(L.sc[key]||0)+1;}}
function wApply(L,h,a,gh,ga){const x=L.t[h],y=L.t[a];if(!x||!y)return;wStar(L,h,gh);wStar(L,a,ga);x[0]++;y[0]++;x[4]+=gh;x[5]+=ga;y[4]+=ga;y[5]+=gh;
 if(gh>ga){x[1]++;y[3]++;x[6]+=3;}else if(gh<ga){y[1]++;x[3]++;y[6]+=3;}else{x[2]++;y[2]++;x[6]++;y[6]++;}}
function wPlayRound(code){const L=S.W.lg[code];const F=wFix(code);if(L.r>=F.length)return;const r=L.r;
 for(const [h,a] of F[r]){const m=wMatch(h,a);wApply(L,h,a,m.gh,m.ga);BETRES['W|'+code+'|'+r+'|'+h+'|'+a]=m;}L.r++;}
function wPlayTo(final){if(!S.W)return;for(const code in S.W.lg){const F=wFix(code);const tgt=final?F.length:Math.min(F.length,Math.round(F.length*S.round/Math.max(1,S.maxRound)));while(S.W.lg[code].r<tgt)wPlayRound(code);}}
function wLadder(code){const t=wSorted(code);const L=S.W.lg[code];const n=zoneN(code);if(!n||!L.z)return t;const zs=[...Array(n)].map((_,z)=>t.filter(k=>L.z[k]===z));const out=[];for(let i=0;out.length<t.length&&i<t.length;i++)zs.forEach(z=>{if(z[i])out.push(z[i]);});return out;}
function wSorted(code){const L=S.W.lg[code];const Z=L.z;return L.cl.slice().sort((a,b)=>{const x=L.t[a]||[0,0,0,0,0,0,0],y=L.t[b]||[0,0,0,0,0,0,0];return (Z?(Z[a]||0)-(Z[b]||0):0)||y[6]-x[6]||(y[4]-y[5])-(x[4]-x[5])||y[4]-x[4]||(S.W.str[b]-S.W.str[a]);});}
function wCountries(){const s=new Set();for(const code in S.W.lg)s.add(leagueInfo(code).cc);return [...s];}
function wPens(sa,sb){let a=0,b=0;const pa=clamp(0.76+(sa-sb)/400,0.6,0.9),pb=clamp(0.76+(sb-sa)/400,0.6,0.9);for(let i=0;i<5;i++){if(RNG()<pa)a++;if(RNG()<pb)b++;}let g=0;while(a===b&&g++<20){const x=RNG()<pa,y=RNG()<pb;a+=x;b+=y;}if(a===b)a++;return [a,b];}
function wCupWinner(cc){const lgs=countryLeagues(cc).filter(l=>S.W.lg[l.code]).slice(0,2);let al=[];lgs.forEach(l=>al=al.concat(S.W.lg[l.code].cl.filter(k=>!(wRow(k)||[])[5])));if(al.length<2)return al[0]||null;
 al=shuffle(al);while(al.length>1){const nx=[];for(let i=0;i<al.length;i+=2){const h=al[i],a=al[i+1];if(!a){nx.push(h);continue;}const m=wMatch(h,a);let w=m.gh>m.ga?h:m.ga>m.gh?a:null;if(!w){const p=wPens(clubStr(h),clubStr(a));w=p[0]>p[1]?h:a;}nx.push(w);}al=nx;}return al[0];}
function wEndSeason(){if(!S.W)return;wPlayTo(true);const moves=[];
 for(const cc of wCountries()){const lgs=countryLeagues(cc).filter(l=>S.W.lg[l.code]);const TB={};lgs.forEach(l=>TB[l.code]=wSorted(l.code));
  if(lgs[0]){S.W.prev[lgs[0].code]=TB[lgs[0].code].slice();S.W.champ[lgs[0].code]=TB[lgs[0].code][0];}
  lgs.forEach(l=>{if(l.tier>1)S.W.prev[l.code]=TB[l.code].slice();});
  for(let i=0;i<lgs.length-1;i++){const up=lgs[i],lo=lgs[i+1];const n=(up.down||0)+(up.po||0);if(!n)continue;const tu=TB[up.code],tl=TB[lo.code];
   const down=tu.slice(-n);const ups=wLadder(lo.code).filter(k=>!(wRow(k)||[])[5]).slice(0,n);const k=Math.min(down.length,ups.length);const d2=down.slice(down.length-k),u2=ups.slice(0,k);
   S.W.lg[up.code].cl=S.W.lg[up.code].cl.filter(x=>!d2.includes(x)).concat(u2);S.W.lg[lo.code].cl=S.W.lg[lo.code].cl.filter(x=>!u2.includes(x)).concat(d2);
   u2.forEach(x=>S.W.str[x]=Math.round((S.W.str[x]+0.8)*10)/10);d2.forEach(x=>S.W.str[x]=Math.round((S.W.str[x]-0.8)*10)/10);}
  S.W.cupW[cc]=wCupWinner(cc);}
 for(const k in S.W.str){const r=wRow(k);const base=r?r[4]:60;S.W.str[k]=Math.round(clamp(S.W.str[k]+gauss()*0.9+(base-S.W.str[k])*0.2,40,92)*10)/10;}
 // zprávy o mistrech velkých lig
 ['GB-ENG','ES','DE','IT','FR'].forEach(cc=>{const l=countryLeagues(cc)[0];if(l&&S.W.champ[l.code])addNews('🌍',`${CL(S.W.champ[l.code]).n} vyhrál soutěž ${leagueLabel(l.code)} (${l.country}).`,1);});
 wStartSeason();}

// ===================== POHÁRY: domácí pohár, kontinentální soutěže, baráž =====================
const CONF={
 uefa:{slots:{'GB-ENG':[4,2,1],'ES':[4,2,1],'DE':[4,2,1],'IT':[4,2,1],'FR':[3,2,1],'PT':[2,1,1],'NL':[2,1,1],'BE':[1,2,1],'TR':[1,1,1],'CZ':[1,1,2],'GB-SCT':[1,1,1],'AT':[1,1,1],'CH':[1,1,1],'GR':[1,1,1],'DK':[1,1,1],'NO':[1,1,1],
  'PL':[0,1,1],'HR':[0,1,1],'RS':[0,1,1],'UA':[0,1,1],'IL':[0,1,1],'CY':[0,1,1],'SE':[0,1,1],'HU':[0,1,1],'RO':[0,1,1],'SK':[0,1,1],'BG':[0,1,1],'SI':[0,1,1],'BA':[0,1,1],'FI':[0,1,1],'IE':[0,1,1]},
  comps:[{id:'lm',n:'Liga mistrů',s:'LM',ic:'⭐',pz:1},{id:'el',n:'Evropská liga',s:'EL',ic:'🟠',pz:0.28},{id:'kl',n:'Konferenční liga',s:'KL',ic:'🟢',pz:0.14}]},
 conmebol:{slots:{'BR':[5,4],'AR':[5,4],'CO':[3,4],'UY':[2,2],'CL':[3,3]},comps:[{id:'lib',n:'Pohár osvoboditelů',s:'PO',ic:'🌎',pz:0.18},{id:'sud',n:'Jihoamerický pohár',s:'JP',ic:'🟡',pz:0.06}]},
 afc:{slots:{'JP':[5,2],'KR':[5,2],'SA':[4,3],'CN':[2,1],'AU':[2,1]},comps:[{id:'acl',n:'Asijská liga mistrů',s:'ALM',ic:'🌏',pz:0.15},{id:'acl2',n:'Asijský pohár',s:'AP',ic:'🟣',pz:0.05}]},
 concacaf:{slots:{'MX':[9],'US':[8]},comps:[{id:'ccl',n:'Liga mistrů CONCACAF',s:'LMC',ic:'🌎',pz:0.12}]}};
const LM_PRIZE={base:15.6e6,win:2.1e6,draw:0.7e6,ko:[11e6,12.5e6,15e6,18.5e6],champ:6e6};
function confOf(cc){for(const k in CONF)if(CONF[k].slots[cc])return k;return null;}
function cupById(id){return S.cups&&S.cups.list.find(c=>c.id===id);}
function GL(i){return 'ABCDEFGHIJKLMNOP'[i];}
// ----- pořadí loňské sezóny -----
function rankList(cc){if(cc===S.cc){if(S.prevRank&&S.prevRank.length)return S.prevRank.filter(id=>S.clubs[id]);const top=countryLeagues(S.cc)[0];return S.leagues[top.code].clubs.slice().sort((a,b)=>(S.clubs[b].rep||0)-(S.clubs[a].rep||0));}
 const top=countryLeagues(cc)[0];if(!top||!S.W||!S.W.lg[top.code])return [];return (S.W.prev[top.code]||S.W.lg[top.code].cl).slice();}
function cupWinnerOf(cc){return cc===S.cc?S.domW:(S.W&&S.W.cupW[cc]);}
function isB(ref){const c=CL(ref);return !!(c&&c.b);}
// ----- vytvoření soutěží na sezónu -----
function initCups(){S.cups={list:[],poMade:0};S.cal=[];const mr=S.maxRound;const rOf=f=>clamp(Math.round(f*mr),1,mr);
 // domácí pohár
 const teams=Object.keys(S.clubs).filter(id=>!S.clubs[id].b&&!S.clubs[id].tmp&&S.leagues[S.clubs[id].lg]);
 if(teams.length>=4){const R=Math.ceil(Math.log2(teams.length));S.cups.list.push({id:'dom',n:'Pohár',s:'P',ic:'🏆',kind:'ko',teams,alive:teams.slice(),rounds:[],winner:null,R});
  for(let i=0;i<R;i++){const f=i===R-1?0.97:0.06+i*(0.84/Math.max(1,R-1));S.cal.push({r:rOf(f),c:'dom',k:'ko',i,l:0,done:0});}}
 // kontinentální
 const ck=confOf(S.cc);if(ck&&S.W){const C=CONF[ck];const SEED={};const sd=r=>clubStr(r)+(SEED[r]||0);const lists=C.comps.map(()=>[]);
  for(const cc in C.slots){const cnt=C.slots[cc];const rank=rankList(cc).filter(r=>!isB(r));let pos=0;const take=n=>{const o=rank.slice(pos,pos+n);pos+=n;return o;};
   {const tot=cnt.reduce((x,y)=>x+y,0);rank.forEach((r,ix)=>{SEED[r]=tot*4-Math.min(ix,8)*3;});}
   const qn=(ck==='uefa'&&cnt[0]===0&&cnt.length>1)?1:0;if(qn)lists[0].push(...take(qn));
   const got=cnt.map(n=>take(n));const cw=cupWinnerOf(cc);
   if(cw&&got.length>1&&cnt[1]>0&&!got[0].includes(cw)&&!got[1].includes(cw)&&!isB(cw)){const k2=got[2]?got[2].indexOf(cw):-1;if(k2>=0)got[2].splice(k2,1);
    const mv=got[1].pop();got[1].push(cw);if(mv&&got[2]){got[2].unshift(mv);if(got[2].length>cnt[2])got[2].pop();}}
   got.forEach((g,i)=>lists[i].push(...g));}
  C.comps.forEach((cd,ci)=>{let t=[...new Set(lists[ci])];const size=t.length>=32?32:t.length>=16?16:t.length>=8?8:0;if(!size)return;while(t.length>size*2){const w=t.filter(r=>r!==S.clubId).sort((a,b)=>sd(a)-sd(b))[0];t=t.filter(r=>r!==w);}const G=size/4;
   let qual=null;if(t.length>size){const e=t.length-size;const srt=t.slice().sort((a,b)=>sd(b)-sd(a));const pool=srt.slice(srt.length-2*e);const direct=srt.slice(0,srt.length-2*e);const ties=[];
    for(let k=0;k<e;k++){const st=pool[k],wk=pool[pool.length-1-k];ties.push({a:wk,b:st,legs:2,res:[],pen:null,w:null});}
    qual={id:cd.id+'q',n:'Kvalifikace – '+cd.n,s:'Q',ic:cd.ic,pz:cd.pz*0.25,kind:'ko',teams:pool,alive:pool.slice(),rounds:[{nm:'Kvalifikace',ties}],winner:null,R:1,q:cd.id};t=direct;}
   const cup={id:cd.id,n:cd.n,s:cd.s,ic:cd.ic,pz:cd.pz,kind:'grp',teams:t,groups:qual?[]:drawGroups(t,G),rounds:[],alive:[],winner:null,G,qPend:qual?1:0};S.cups.list.push(cup);
   if(qual){S.cups.list.push(qual);[0.03,0.06].forEach((f,l)=>S.cal.push({r:rOf(f),c:qual.id,k:'ko',i:0,l,done:0}));if(qual.teams.includes(S.clubId))addNews(qual.ic,`Tvůj tým čeká kvalifikace o soutěž ${cd.n}. Dvojzápas rozhodne o postupu do skupin.`);}
   const GF=[0.1,0.17,0.24,0.31,0.38,0.45];GF.forEach((f,i)=>S.cal.push({r:rOf(f),c:cd.id,k:'md',i,l:0,done:0}));
   const KF=G>=8?[[0.55,0.6],[0.68,0.73],[0.8,0.86],[1]]:G>=4?[[0.6,0.66],[0.78,0.86],[1]]:[[0.75,0.85],[1]];
   KF.forEach((legs,i)=>legs.forEach((f,l)=>S.cal.push({r:rOf(f),c:cd.id,k:'ko',i,l,done:0})));});}
 S.cal.sort((a,b)=>a.r-b.r);
 const mine=S.cups.list.filter(c=>c.teams.includes(S.clubId)&&c.kind==='grp');mine.forEach(c=>addNews(c.ic,`Tvůj tým hraje v sezóně ${seasonLabel(S.season)} soutěž ${c.n}. ${c.qPend?'Los skupin proběhne po kvalifikaci.':'Los skupin je hotový.'}`));}
function drawGroups(t,G){let best=null,bs=1e9;const sorted=t.slice().sort((a,b)=>clubStr(b)-clubStr(a));
 for(let tr=0;tr<40;tr++){const gs=Array.from({length:G},()=>[]);let bad=0;
  for(let p=0;p<4;p++){const pot=shuffle(sorted.slice(p*G,p*G+G));for(const ref of pot){const cc=clubCC(ref);let gi=gs.findIndex(g=>g.length===p&&!g.some(x=>clubCC(x)===cc));if(gi<0){gi=gs.findIndex(g=>g.length===p);bad++;}gs[gi].push(ref);}}
  if(bad<bs){bs=bad;best=gs;}if(!bad)break;}
 return best.map(cl=>{const t={};cl.forEach(r=>t[r]=[0,0,0,0,0,0,0]);return {cl,t,fix:roundRobin(cl,2),res:[]};});}
// ----- kalendář -----
function pendingEvent(){if(!S.cal)return null;return S.cal.find(e=>!e.done&&e.r<=S.round)||null;}
function evMatches(e){const cup=cupById(e.c);if(!cup)return [];
 if(e.k==='md')return cup.groups.flatMap(g=>(g.fix[e.i]||[]).map(m=>[m[0],m[1]]));
 ensureDraw(cup,e.i);const R=cup.rounds[e.i];if(!R)return [];return R.ties.filter(t=>e.l<t.legs).map(t=>e.l===0?[t.a,t.b]:[t.b,t.a]);}
function userInEvent(e){return evMatches(e).find(m=>m[0]===S.clubId||m[1]===S.clubId)||null;}
function roundName(n,cup){if(cup.id==='po')return 'Baráž';return n===2?'Finále':n===4?'Semifinále':n===8?'Čtvrtfinále':n===16?'Osmifinále':null;}
function ensureDraw(cup,i){if(cup.rounds[i])return;let al;
 if(cup.kind==='grp'){if(i===0){const W=[],R=[];cup.groups.forEach((g,gi)=>{const t=grpSorted(g);W.push([t[0],gi]);R.push([t[1],gi]);});
   let ties=null;for(let tr=0;tr<60&&!ties;tr++){const rr=shuffle(R.slice());if(W.every((w,k)=>w[1]!==rr[k][1])||tr===59)ties=W.map((w,k)=>({a:rr[k][0],b:w[0],legs:2,res:[],pen:null,w:null}));}
   cup.rounds[0]={nm:roundName(ties.length*2,cup)||'Vyřazovací fáze',ties};return;}
  al=shuffle(cup.alive.slice());const n=al.length;const ties=[];for(let k=0;k+1<n;k+=2)ties.push({a:al[k],b:al[k+1],legs:n===2?1:2,res:[],pen:null,w:null});
  cup.rounds[i]={nm:roundName(n,cup)||(i+1)+'. kolo',ties};return;}
 // domácí pohár
 al=shuffle(cup.alive.slice());const n=al.length;let p=1;while(p*2<=n)p*=2;const ties=[];let byes=[];
 if(n>p){const m=n-p;const srt=al.slice().sort((a,b)=>tierOf(a)-tierOf(b)||clubStr(b)-clubStr(a));byes=srt.slice(0,n-2*m);const play=shuffle(srt.slice(n-2*m));for(let k=0;k<play.length;k+=2)ties.push(mkDomTie(play[k],play[k+1]));}
 else for(let k=0;k+1<n;k+=2)ties.push(mkDomTie(al[k],al[k+1]));
 cup.rounds[i]={nm:n>p?'Předkolo':(roundName(n,cup)||(i+1)+'. kolo'),ties,byes};}
function tierOf(ref){const c=S.clubs[ref];const li=c&&leagueInfo(c.lg);return li?li.tier:1;}
function mkDomTie(x,y){let a=x,b=y;if(tierOf(y)>tierOf(x)){a=y;b=x;}else if(tierOf(y)===tierOf(x)&&RNG()<0.5){a=y;b=x;}return {a,b,legs:1,res:[],pen:null,w:null};}
function grpSorted(g){return g.cl.slice().sort((a,b)=>{const x=g.t[a],y=g.t[b];return y[6]-x[6]||(y[4]-y[5])-(x[4]-x[5])||y[4]-x[4]||clubStr(b)-clubStr(a);});}
// kontext zápasu pro uživatele / AI
function tieOf(e,h,a){const cup=cupById(e.c);if(e.k!=='ko')return null;return cup.rounds[e.i].ties.find(t=>(t.a===h&&t.b===a)||(t.a===a&&t.b===h));}
function koInfo(e,h,a){const t=tieOf(e,h,a);if(!t)return null;const last=e.l===t.legs-1;let agg=[0,0];if(e.l===1&&t.res[0]){agg=[t.res[0][1],t.res[0][0]];}return {decide:last,agg,legs:t.legs,leg:e.l};}
function quickCup(h,a,ko){let [xh,xa]=xgPair(synth(h),synth(a));try{const fx=wxFx(matchWeather(h,{h,a,type:'cup'}));if(fx&&isFinite(fx.rate*fx.acc)){xh*=fx.rate*fx.acc;xa*=fx.rate*fx.acc;}}catch(e){}let [gh,ga]=segGoals(xh,xa);let pen=null,et=false;if(ko&&ko.decide&&gh+ko.agg[0]===ga+ko.agg[1]){et=true;gh+=poisson(xh/3.2);ga+=poisson(xa/3.2);if(gh+ko.agg[0]===ga+ko.agg[1])pen=wPens(clubStr(h),clubStr(a));}return {gh,ga,pen,et};}
function evTitle(e){const cup=cupById(e.c);if(!cup)return '';if(e.k==='md'){const gi=cup.groups.findIndex(g=>g.cl.includes(S.clubId));return `${cup.n} · ${e.i+1}. zápas ve skupině${gi>=0?' '+GL(gi):''}`;}
 ensureDraw(cup,e.i);const R=cup.rounds[e.i];const t=R.ties.find(x=>x.a===S.clubId||x.b===S.clubId);return `${cup.n} · ${R.nm}${t&&t.legs===2?(e.l?' – odveta':' – 1. zápas'):''}`;}
function cupPrize(cup,kind,i){const me=myClub();if(cup.id==='dom'){const b=Math.max(20000,me.tv*0.5);return Math.round(b*(1+i*0.5)/1e4)*1e4;}if(cup.id==='po')return 0;
 const f=cup.pz;if(kind==='base')return LM_PRIZE.base*f;if(kind==='win')return LM_PRIZE.win*f;if(kind==='draw')return LM_PRIZE.draw*f;if(kind==='ko')return (LM_PRIZE.ko[i]||LM_PRIZE.ko[3])*f;if(kind==='champ')return LM_PRIZE.champ*f;return 0;}
// ----- odehrání dne -----
function resolveEvent(e,userRes){const cup=cupById(e.c);e.done=1;if(!cup)return;if(cup.qPend&&e.k==='md'){const q=cupById(cup.id+'q');if(q){q.rounds[0].ties.forEach(t=>{if(!t.w)t.w=clubStr(t.b)>=clubStr(t.a)?t.b:t.a;});q.alive=q.rounds[0].ties.map(t=>t.w);qualDone(q);}}const ms=evMatches(e);
 for(const [h,a] of ms){const isU=h===S.clubId||a===S.clubId;const ko=e.k==='ko'?koInfo(e,h,a):null;const r=isU&&userRes?userRes:quickCup(h,a,ko);
  if(e.k==='md'){const g=cup.groups.find(gg=>gg.cl.includes(h));const x=g.t[h],y=g.t[a];x[0]++;y[0]++;x[4]+=r.gh;x[5]+=r.ga;y[4]+=r.ga;y[5]+=r.gh;
   if(r.gh>r.ga){x[1]++;y[3]++;x[6]+=3;}else if(r.gh<r.ga){y[1]++;x[3]++;y[6]+=3;}else{x[2]++;y[2]++;x[6]++;y[6]++;}
   (g.res[e.i]=g.res[e.i]||[]).push([h,a,r.gh,r.ga]);
   if(isU){const my=h===S.clubId?r.gh:r.ga,th=h===S.clubId?r.ga:r.gh;if(e.i===0)money(cupPrize(cup,'base'),'prize',`${cup.n}: startovné`);if(my>th)money(cupPrize(cup,'win'),'prize',`${cup.n}: prémie za výhru`);else if(my===th)money(cupPrize(cup,'draw'),'prize',`${cup.n}: prémie za remízu`);}}
  else{const t=tieOf(e,h,a);t.res[e.l]=[r.gh,r.ga];
   if(e.l===t.legs-1){const ga=t.res[0][0]+(t.legs===2?t.res[1][1]:0),gb=t.res[0][1]+(t.legs===2?t.res[1][0]:0);
    if(r.et)t.et=1;
    if(ga!==gb)t.w=ga>gb?t.a:t.b;else{let p=r.pen||wPens(clubStr(h),clubStr(a));t.pen=h===t.a?[p[0],p[1]]:[p[1],p[0]];t.w=t.pen[0]>t.pen[1]?t.a:t.b;}}}}
 if(e.k==='md'&&e.i===5)cupGroupsDone(cup);
 if(e.k==='ko'){const R=cup.rounds[e.i];if(R.ties.every(t=>t.w)){cupRoundDone(cup,e.i);}}}
function cupGroupsDone(cup){const gi=cup.groups.findIndex(g=>g.cl.includes(S.clubId));if(gi<0)return;const t=grpSorted(cup.groups[gi]);const p=t.indexOf(S.clubId)+1;
 if(p<=2){addNews(cup.ic,`${myClub().n} postoupil ze skupiny ${GL(gi)} soutěže ${cup.n} (${p}. místo).`);S.boardTrust=clamp(S.boardTrust+4,0,100);}else addNews(cup.ic,`${myClub().n} v soutěži ${cup.n} nepostoupil ze skupiny ${GL(gi)} (${p}. místo).`);}
function cupRoundDone(cup,i){const R=cup.rounds[i];const win=R.ties.map(t=>t.w);const byes=R.byes||[];cup.alive=byes.concat(win);
 const myT=R.ties.find(t=>t.a===S.clubId||t.b===S.clubId);
 if(myT){const opp=myT.a===S.clubId?myT.b:myT.a;const on=CL(opp).n;
  if(myT.w===S.clubId){if(cup.id==='po'){addNews('✅',`Baráž zvládnutá! ${myClub().n} přešel přes ${on}.`);}
   else if(cup.alive.length>1){addNews(cup.ic,`${cup.n}: ${myClub().n} postupuje přes ${on} (${R.nm}).`,0);money(cupPrize(cup,'ko',i),'prize',`${cup.n}: postup – ${R.nm.toLowerCase()}`);}}
  else{if(cup.id==='po')addNews('❌',`Baráž nevyšla, ${on} byl úspěšnější.`);else addNews('❌',`${cup.n}: konec v soutěži, ${R.nm.toLowerCase()} nevyšlo (${on}).`);if(cup.id==='dom'&&tierOf(opp)>tierOf(S.clubId))S.boardTrust=clamp(S.boardTrust-4,0,100);}}
 if(cup.q){qualDone(cup);return;}
 if(cup.alive.length===1&&cup.id!=='po'){cup.winner=cup.alive[0];const wn=CL(cup.winner).n;
  if(cup.id==='dom')S.domW=cup.winner;
  if(cup.winner===S.clubId){S.trophies.push({s:S.season,t:(cup.id==='dom'?'Vítěz domácího poháru':'Vítěz soutěže '+cup.n)});money(cupPrize(cup,cup.id==='dom'?'ko':'champ',cup.id==='dom'?5:0),'prize',`${cup.n}: prémie pro vítěze`);S.boardTrust=clamp(S.boardTrust+(cup.id==='dom'?10:18),0,100);addNews('🏆',`Trofej! ${myClub().n} vyhrál soutěž ${cup.n}!`);}
  else addNews(cup.ic,`${wn} vyhrál soutěž ${cup.n} v sezóně ${seasonLabel(S.season)}.`,cup.teams.includes(S.clubId)?0:1);}}
function qualDone(q){const m=cupById(q.q);if(!m||!m.qPend)return;m.teams=m.teams.concat(q.alive);m.groups=drawGroups(m.teams,m.G);m.qPend=0;
 if(m.teams.includes(S.clubId))addNews(m.ic,`Postup do skupin! Tvůj tým hraje v sezóně ${seasonLabel(S.season)} soutěž ${m.n}. Los skupin je hotový.`);}
function autoEvents(){let e,g=0;while((e=pendingEvent())&&!userInEvent(e)&&g++<80){resolveEvent(e,null);}}
// ----- baráž -----
function makePlayoffs(){if(!S.cups||S.cups.poMade)return;S.cups.poMade=1;const lgs=countryLeagues(S.cc);const ties=[];
 for(let i=0;i<lgs.length-1;i++){const up=lgs[i],lo=lgs[i+1];if(!up.po)continue;const TU=sortedTable(up.code),TL=sortedTable(lo.code).filter(id=>!S.clubs[id].b);const n=TU.length;
  const ups=TU.slice(n-up.down-up.po,n-up.down),lows=TL.slice(up.down,up.down+up.po);for(let k=0;k<Math.min(ups.length,lows.length);k++)ties.push({a:lows[lows.length-1-k],b:ups[k],legs:2,res:[],pen:null,w:null,up:up.code,lo:lo.code});}
 if(!ties.length)return;S.cups.list.push({id:'po',n:'Baráž',s:'B',ic:'⚔️',kind:'ko',teams:ties.flatMap(t=>[t.a,t.b]),alive:[],rounds:[{nm:'Baráž',ties}],winner:null,pre:1});
 S.cal.push({r:S.round,c:'po',k:'ko',i:0,l:0,done:0},{r:S.round,c:'po',k:'ko',i:0,l:1,done:0});
 const me=ties.find(t=>t.a===S.clubId||t.b===S.clubId);addNews('⚔️',me?`Čeká tě baráž proti týmu ${CL(me.a===S.clubId?me.b:me.a).n}. Hraje se na dva zápasy.`:'Rozlosována baráž o účast v nejvyšší soutěži.',me?0:1);}
// ----- dočasné načtení zahraničního soupeře pro živý zápas -----
async function ensureClub(ref){if(S.clubs[ref])return S.clubs[ref];const i=ref.lastIndexOf(':');const code=ref.slice(0,i),idx=+ref.slice(i+1);await loadLeague(code);const d=DATA[code].clubs[idx];
 const rep=clubStr(ref);const c={id:ref,n:d.n,s:d.s,c:d.c,b:d.b,lg:wLeagueOf(ref),pl:[],tmp:1,rep,money:0,tv:0,wageBase:0,cap:Math.round(clamp(2500+Math.exp((rep-55)*0.135)*2600,2500,75000)/100)*100,ticket:20};S.clubs[ref]=c;
 const adj=Math.round(rep-(wRow(ref)?wRow(ref)[4]:rep));d.p.forEach((arr,pi)=>{if(S.gone[code+':'+idx+':'+pi])return;const p=mkPlayer(arr,ref,pi);p.tmp=1;p.ovr=clamp(p.ovr+adj,30,99);c.pl.push(p.id);});return c;}
function purgeTmp(){for(const id of Object.keys(S.clubs)){const c=S.clubs[id];if(!c.tmp)continue;(c.pl||[]).forEach(pid=>{const p=S.players[pid];if(p&&p.tmp)delete S.players[pid];});delete S.clubs[id];}
 for(const pid of Object.keys(S.players)){if(S.players[pid].tmp)delete S.players[pid];}}

// ===================== SÁZKY (jen herní peníze, simulovaní sázkaři) =====================
const MK_LBL={'1':'výhra domácích','X':'remíza','2':'výhra hostů','o25':'více než 2,5 gólu','u25':'méně než 2,5 gólu','gg':'oba týmy skórují','ng':'neskórují oba'};
const MK_SHORT={'1':'1','X':'X','2':'2','o25':'+2,5','u25':'−2,5','gg':'Oba dají','ng':'Oba nedají'};
function czOdd(o){return finite(o).toFixed(2).replace('.',',');}
function betSalary(){const me=myClub();const sal=Math.round(clamp(200+(me.tv||0)*0.0006,200,2500)/50)*50;S.wallet=Math.round(finite(S.wallet)+sal);S.salary=sal;}
const RO_HI=[21,23,26,29,34,41,51];function roundOdd(x){x=clamp(x,1.03,51);return x<2?Math.round(x*100)/100:x<3?Math.round(x*50)/50:x<5?Math.round(x*20)/20:x<10?Math.round(x*10)/10:x<20?Math.round(x*2)/2:RO_HI.reduce((b,v)=>Math.abs(v-x)<Math.abs(b-x)?v:b,21);}
function strOf(ref){const c=S.clubs[ref];if(c&&!c.tmp)return synthLine(ref);return synth(ref);}
function synthLine(cid){const s=S.clubs[cid].rep||60;return {att:s,def:s,mid:s,gk:s,ovr:s};}
function matchOdds(h,a,seed){const [xh,xa]=xgPair(strOf(h),strOf(a));let [ph,pd,pa]=winProb(xh,xa);{const d2=Math.min(0.34,pd*1.2);const k=(1-d2)/((ph+pa)||1);ph*=k;pa*=k;pd=d2;}const l=xh+xa;const pu=Math.exp(-l)*(1+l+l*l/2);const pg=(1-Math.exp(-xh))*(1-Math.exp(-xa));
 const n=(k)=>1+((hashStr(seed+k)%100)/100-0.5)*0.04;const M=1.06;
 return {'1':roundOdd(n('1')/(ph*M)),'X':roundOdd(n('X')/(pd*M)),'2':roundOdd(n('2')/(pa*M)),'o25':roundOdd(n('o')/((1-pu)*M)),'u25':roundOdd(n('u')/(pu*M)),'gg':roundOdd(n('g')/(pg*M)),'ng':roundOdd(n('n')/((1-pg)*M))};}
// nabídka zápasů
function betGroups(){const out=[];
 for(const l of countryLeagues(S.cc)){const L=S.leagues[l.code];if(!L)continue;const r=lgDue(l.code);if(r<0)continue;
  const ms=(L.fix[r]||[]).filter(([h,a])=>h!==S.clubId&&a!==S.clubId).map(([h,a])=>({mid:'L|'+l.code+'|'+r+'|'+h+'|'+a,h,a}));if(ms.length)out.push({code:l.code,name:leagueLabel(l.code)+' · '+(r+1)+'. kolo',ms});}
 const wc=UI.betW||'ENG1';if(S.W&&S.W.lg[wc]){const L=S.W.lg[wc];const F=wFix(wc);if(L.r<F.length){const r=L.r;out.push({code:wc,world:1,name:leagueLabel(wc)+' ('+leagueInfo(wc).country+') · '+(r+1)+'. kolo',ms:F[r].map(([h,a])=>({mid:'W|'+wc+'|'+r+'|'+h+'|'+a,h,a}))});}}
 return out;}
function parseMid(mid){const [t,code,r,h,a]=mid.split('|');return {t,code,r:+r,h,a};}
function midTitle(mid){const m=parseMid(mid);return CL(m.h).n+' – '+CL(m.a).n;}
function addToSlip(mid,mk){S.slip=S.slip||[];const ex=S.slip.find(x=>x.mid===mid);if(ex&&ex.mk===mk){S.slip=S.slip.filter(x=>x!==ex);return 'Tip odebrán ze sázenky.';}
 const m=parseMid(mid);const o=matchOdds(m.h,m.a,mid)[mk];if(ex){ex.mk=mk;ex.o=o;return 'Tip změněn.';}if(S.slip.length>=10)return 'Na sázence může být nejvýš 10 tipů.';
 S.slip.push({mid,mk,o});return 'Tip přidán na sázenku.';}
function slipOdds(){return (S.slip||[]).reduce((p,x)=>p*x.o,1);}
function roundSpent(){return (S.bets||[]).filter(b=>b.s===S.season&&b.r===S.round).reduce((a,b)=>a+b.stake,0);}
function betLimitLeft(){return Math.max(0,(S.settings.betLimit||5000)-roundSpent());}
function placeBet(stake,mode){stake=Math.round(+stake||0);const sl=S.slip||[];if(!sl.length)return 'Sázenka je prázdná.';if(stake<10)return 'Minimální vklad je 10 €.';
 const total=mode==='single'?stake*sl.length:stake;if(total>S.wallet)return 'Na osobním kontě nemáš dost peněz.';if(total>betLimitLeft())return `Překročil bys limit sázek na kolo (zbývá ${fmtMoney(betLimitLeft())}).`;
 const mk=legs=>({id:'b'+Date.now().toString(36)+rint(0,9999),legs:legs.map(x=>({mid:x.mid,mk:x.mk,o:x.o,st:'open'})),stake,o:Math.round(legs.reduce((p,x)=>p*x.o,1)*100)/100,st:'open',s:S.season,r:S.round,pay:0});
 if(mode==='single')sl.forEach(x=>S.bets.unshift(mk([x])));else S.bets.unshift(mk(sl));
 S.wallet-=total;S.betStats.st+=total;const hs=betSeasonStat();hs.st+=total;hs.n+=mode==='single'?sl.length:1;S.betStats.n+=mode==='single'?sl.length:1;S.slip=[];if(S.bets.length>80)S.bets.length=80;saveGame();return 'Sázka přijata ✓';}
function legResult(l,r){const t=r.gh+r.ga;switch(l.mk){case '1':return r.gh>r.ga;case 'X':return r.gh===r.ga;case '2':return r.gh<r.ga;case 'o25':return t>2;case 'u25':return t<3;case 'gg':return r.gh>0&&r.ga>0;case 'ng':return !(r.gh>0&&r.ga>0);}return false;}
const MK_GRP={'1':'1x2','X':'1x2','2':'1x2',o25:'goly',u25:'goly',gg:'gg',ng:'gg'};
function betSeasonStat(se){se=se||S.season;const H=S.betHist||(S.betHist={});return H[se]||(H[se]={st:0,won:0,n:0,nw:0});}
function settleBets(final){let any=0;for(const b of S.bets||[]){if(b.st!=='open')continue;
  for(const l of b.legs){if(l.st!=='open')continue;const r=BETRES[l.mid];if(r){l.res=r.ab?'předčasně ukončeno':r.gh+':'+r.ga;l.st=r.ab?'void':legResult(l,r)?'won':'lost';}
   else if(b.s!==S.season||final){l.st='void';l.res='neodehráno';}
   else{const m=parseMid(l.mid);if(m.t==='L'){const L=S.leagues[m.code];if(!L||m.r<(L.done||0)&&!BETRES[l.mid]){/* výsledek zápasu se nepodařilo dohledat (např. po načtení hry) */if(L&&L.res[m.r]){const x=L.res[m.r].find(z=>z.h===m.h&&z.a===m.a);if(x){l.res=x.gh+':'+x.ga;l.st=legResult(l,x)?'won':'lost';}else{l.st='void';l.res='neodehráno';}}else if(!L){l.st='void';l.res='neodehráno';}}}}}
  b.legs.forEach(l=>{if((l.st==='won'||l.st==='lost')&&!l.cnt){l.cnt=1;const g=MK_GRP[l.mk]||'1x2';const mk=S.betStats.mk||(S.betStats.mk={});const a=mk[g]||(mk[g]=[0,0]);a[0]++;if(l.st==='won')a[1]++;}});
  if(b.legs.some(l=>l.st==='lost')){b.st='lost';any=1;continue;}
  if(b.legs.every(l=>l.st!=='open')){const live=b.legs.filter(l=>l.st==='won');if(!live.length){b.st='void';b.pay=b.stake;betSeasonStat(b.s).won+=b.pay;S.betStats.won+=0;}else{b.st='won';b.o=Math.round(live.reduce((p,l)=>p*l.o,1)*100)/100;b.pay=Math.round(b.stake*b.o);S.betStats.won+=b.pay;S.betStats.nw++;const hs=betSeasonStat(b.s);hs.won+=b.pay;hs.nw++;if(b.pay>(S.betStats.best||0)){S.betStats.best=b.pay;S.betStats.bestO=b.o;}}
   S.wallet+=b.pay;any=1;if(b.st==='won')addNews('🎲',`Sázka vyšla! Výhra ${fmtMoney(b.pay)} (kurz ${czOdd(b.o)}).`,b.pay<5000?1:0);else addNews('🎲',`Sázka byla zrušena, vklad ${fmtMoney(b.stake)} se vrací.`,1);}}
 BETRES={};return any;}
// ----- chat sázkařů během živého zápasu -----
function liveOdds(M){const rem=Math.max(0,90-M.min)/90;const xh=M.xg[0]*rem,xa=M.xg[1]*rem;let ph=0,pd=0,pa=0;const pf=(l,k)=>{let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f;};
 for(let i=0;i<8;i++)for(let j=0;j<8;j++){const p=pf(xh,i)*pf(xa,j);const a=M.score[0]+i,b=M.score[1]+j;if(a>b)ph+=p;else if(a===b)pd+=p;else pa+=p;}const t=ph+pd+pa||1;return [roundOdd(1/(ph/t*1.07+1e-6)),roundOdd(1/(pd/t*1.07+1e-6)),roundOdd(1/(pa/t*1.07+1e-6))];}

// ===================== UI – společné =====================
const UI={tab:'home',sqSort:'pos',lgView:'table',lgCode:null,lgRound:null,mk:{code:'*',pos:'all',max:0,age:0,sort:'ovr'},start:{step:0},sel:null,newsAll:false};
function badge(c,cls){if(!c)return '';const [c1,c2]=c.c||['#555','#fff'];const fg=lum(c1)>0.6?'#111':'#fff';return `<span class="badge ${cls||''}" style="background:linear-gradient(135deg,${c1} 0 58%,${c2} 58% 100%);color:${fg}">${esc(c.s)}</span>`;}
function lum(hex){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255;return 0.299*r+0.587*g+0.114*b;}
function ovrCls(o){return o>=80?'o1':o>=70?'o2':o>=60?'o3':'o4';}
function ovrB(o){return `<span class="ovr ${ovrCls(o)}">${Math.round(o)}</span>`;}
function posB(p){return `<span class="pos" style="background:${GRP_COL[GRP(p)]}">${POS_CZ[p]}</span>`;}
function condBar(v){return `<div class="bar cond"><i style="width:${clamp(Math.round(v),0,100)}%"></i></div>`;}
function formB(arr){return `<span class="frm">${(arr||[]).map(x=>`<i class="${x}">${x}</i>`).join('')}</span>`;}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2700);}
function modal(html,opts){closeModal();const bg=document.createElement('div');bg.className='modal-bg';bg.id='mbg';bg.innerHTML=`<div class="modal" role="dialog">${opts&&opts.noClose?'':'<button class="mclose" aria-label="Zavřít" onclick="closeModal()">✕</button>'}${html}</div>`;
 if(!(opts&&opts.noClose))bg.addEventListener('click',e=>{if(e.target===bg)closeModal();});document.body.appendChild(bg);syncAppViewport();return bg;}
function closeModal(){const m=document.getElementById('mbg');if(m)m.remove();}
function confirmBox(title,text,okLabel,fn,cls){modal(`<h2>${title}</h2><div class="small mut" style="margin-bottom:14px">${text}</div><div class="grid2"><button class="btn ghost" onclick="closeModal()">Zrušit</button><button class="btn ${cls||'red'}" id="cfok">${okLabel}</button></div>`);$('#cfok').onclick=()=>{closeModal();fn();};}
function syncAppViewport(){try{const vv=window.visualViewport;const h=Math.max(1,Math.round((vv&&vv.height)?vv.height:window.innerHeight));const top=Math.max(0,Math.round((vv&&vv.offsetTop)?vv.offsetTop:0));const r=document.documentElement;r.style.setProperty('--app-vh',h+'px');r.style.setProperty('--app-vtop',top+'px');}catch(e){}}
function watchAppViewport(){if(window.__vvw)return;window.__vvw=1;syncAppViewport();const fn=()=>syncAppViewport();window.addEventListener('resize',fn);window.addEventListener('orientationchange',()=>setTimeout(fn,250));if(window.visualViewport){window.visualViewport.addEventListener('resize',fn);window.visualViewport.addEventListener('scroll',fn);}}
function newsWhen(n){if(n.s!==S.season||!S.leagues[myClub().lg])return (n.r+1)+'. týden';return Math.max(1,lgRoundsBy(myClub().lg,n.r+1))+'. kolo';}
function roundLabel(){const e=pendingEvent();if(e&&userInEvent(e)){const c=cupById(e.c);return c?c.n:'Pohár';}if(S.round>=S.maxRound)return 'Konec sezóny';const L=S.leagues[myClub().lg];return lgDue(myClub().lg)>=0?myRoundNo()+'. kolo z '+lgTot(L):'Volný týden';}
// ---------- zvuk (bezpečně pro Safari) ----------
let _ac=null;function getAC(){if(_ac)return _ac;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;_ac=new A();}catch(e){_ac=null;}return _ac;}
function beep(f,d,v){if(!S||!S.settings||!S.settings.sound)return;try{const ac=getAC();if(!ac)return;if(ac.state==='suspended'&&ac.resume)ac.resume().catch(()=>{});const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.value=v||0.05;o.connect(g);g.connect(ac.destination);const t=ac.currentTime;g.gain.setValueAtTime(v||0.05,t);g.gain.exponentialRampToValueAtTime(0.0001,t+(d||0.2));o.start(t);o.stop(t+(d||0.2)+0.02);}catch(e){}}
function goalSound(){beep(660,0.15,0.06);setTimeout(()=>beep(880,0.25,0.06),140);}
function whistle(){beep(2400,0.35,0.03);}
// ---------- hlavní render ----------
function render(){watchAppViewport();const app=$('#app');if(!app)return;
 if(!S){app.innerHTML=renderStart();bindStart();return;}
 const me=myClub();const nOff=S.offers.length;
 const navWarn={tac:(()=>{try{return !!lineupIssues();}catch(e){return false;}})(),club:fans()<30||(!isOwn()&&S.boardTrust<30),bets:(S.bets||[]).some(b=>b.st!=='open'&&!b.seen)};
 const tabs=[['home','🏟️','Přehled'],['squad','👥','Kádr'],(S.role==='owner'&&S.own?['tac','🧑‍💼','Trenér']:['tac','📋','Taktika']),['league','🏆','Soutěže'],['market','💼','Přestupy'],['bets','🎲','Sázky'],['club','🏦','Klub']];
 app.innerHTML=`<div class="top">${badge(me,'')}<div class="wk">${esc(me.n)}<small>${esc(leagueLabel(me.lg))} · ${seasonLabel(S.season)} · ${roundLabel()}</small></div><div class="sp"></div><span class="pill ${me.money<0?'bad':'gold'}">${fmtMoney(me.money)}</span></div>
 <div class="view" id="view">${renderTab()}</div>
 <div class="nav">${tabs.map(t=>`<button class="${UI.tab===t[0]?'on':''}" onclick="go('${t[0]}')"><span class="i">${t[1]}</span>${t[2]}${(t[0]==='market'&&nOff)||(t[0]==='tac'&&navWarn.tac)||(t[0]==='club'&&navWarn.club)||(t[0]==='bets'&&navWarn.bets)?'<span class="dot"></span>':''}</button>`).join('')}</div>`;
 afterRender();}
function go(t){UI.tab=t;if(t==='bets'&&S&&S.bets)S.bets.forEach(b=>{if(b.st!=='open')b.seen=1;});UI.sel=null;render();window.scrollTo(0,0);}
function renderTab(){switch(UI.tab){case 'squad':return renderSquad();case 'tac':return renderTactics();case 'league':return renderLeague();case 'market':return renderMarket();case 'club':return renderClub();case 'bets':return renderBets();default:return renderHome();}}
function afterRender(){if(UI.tab==='market')marketLoadResults();}
// ===================== START =====================
const REGIONS=[['Evropa',['CZ','SK','GB-ENG','ES','DE','IT','FR','NL','PT','BE','TR','GB-SCT','AT','CH','PL','DK','SE','NO','IE','RO','GR','HR','HU','RS','UA','BG','CY','IL','SI','BA','FI']],['Jižní Amerika',['BR','AR','UY','CL','CO']],['Severní Amerika',['MX','US']],['Asie a Austrálie',['JP','KR','SA','CN','AU']]];
function renderStart(){const st=UI.start;
 if(st.step===0)return `<div class="view" style="padding-top:calc(30px + env(safe-area-inset-top,0px))"><div class="c" style="margin-bottom:18px"><div style="font-size:64px">⚽</div><h1 style="margin:6px 0 2px;font-size:28px;letter-spacing:.04em">FOTBAL MANAŽER</h1><div class="mut small">Skutečné kluby a hráči · ${FM_CAT.leagues.length} soutěží · ${Object.keys(FM_CAT.countries).length} zemí</div></div>
  <div class="card"><h3>Nová kariéra</h3><label class="small mut">Tvoje jméno</label><input id="mgr" maxlength="30" placeholder="Např. Robert Zechovský" value="${esc(st.name||'')}">
  <div class="small mut" style="margin:12px 0 6px">Za koho chceš hrát</div><div class="seg">${[['coach','Trenér'],['owner','Majitel'],['both','Majitel i trenér']].map(([k,l])=>`<button class="${(st.role||'coach')===k?'on':''}" onclick="startRole('${k}')">${l}</button>`).join('')}</div>
  <div class="tiny mut" style="margin-top:6px">${(st.role||'coach')==='coach'?'Vedeš tým na lavičce: sestava, taktika, přestupy. Vedení tě může odvolat.':(st.role==='owner'?'Koupíš klub, najímáš trenéra, určuješ rozpočet, sponzory, vstupné a stadion. Sestavu dělá trenér.':'Koupíš klub a zároveň ho vedeš na lavičce. Nikdo tě neodvolá, ale finance hlídáš sám.')}</div>
  ${st.role==='owner'||st.role==='both'?`<div class="small mut" style="margin:12px 0 6px">Tvůj kapitál</div><div class="seg">${OWN_FORT.map(([v,l])=>`<button class="${(st.fort||OWN_FORT[1][0])===v?'on':''}" onclick="startFort(${v})">${l}</button>`).join('')}</div><div class="tiny mut" style="margin-top:6px">Kapitál: ${fmtMoney(st.fort||OWN_FORT[1][0])}. Doplnit ho můžeš investory a úvěrem.</div>`:''}
  <div style="height:12px"></div><button class="btn big" id="st1">Vybrat zemi a klub</button></div>
  <div class="card small mut">Hra se ukládá automaticky do prohlížeče. Soupisky vycházejí ze skutečných kádrů pro sezónu 2026/27, hodnocení hráčů jsou orientační.</div></div>`;
 if(st.step===1)return `<div class="view" style="padding-top:calc(14px + env(safe-area-inset-top,0px))"><div class="row" style="margin-bottom:10px"><button class="btn ghost sm" onclick="UI.start.step=0;render()">‹ Zpět</button><b>Vyber zemi</b></div>
  ${REGIONS.map(([r,ccs])=>`<div class="card"><h3>${r}</h3>${ccs.filter(cc=>FM_CAT.countries[cc]).map(cc=>{const ls=countryLeagues(cc,true);return `<button class="lgpick" onclick="startPickCountry('${cc}')"><span class="f">${flag(cc)}</span><span class="t"><b>${esc(FM_CAT.countries[cc])}</b><small>${ls.map(l=>esc(l.name)).join(' · ')}</small></span><span class="mut">›</span></button>`;}).join('')}</div>`).join('')}</div>`;
 if(st.step===2){const ls=countryLeagues(st.cc,true);return `<div class="view" style="padding-top:calc(14px + env(safe-area-inset-top,0px))"><div class="row" style="margin-bottom:10px"><button class="btn ghost sm" onclick="UI.start.step=1;render()">‹ Zpět</button><b>${flag(st.cc)} ${esc(FM_CAT.countries[st.cc])}</b></div>
  <div class="card"><h3>Soutěž</h3><div class="seg">${ls.map(l=>`<button class="${st.lg===l.code?'on':''}" onclick="startPickLeague('${l.code}')">${esc(l.name)}</button>`).join('')}</div></div>
  <div id="clublist">${st.lg&&DATA[st.lg]?clubPickList(st.lg):'<div class="empty"><div class="sp2" style="margin:0 auto 10px"></div>Načítám kluby…</div>'}</div></div>`;}
 return '';}
function clubPickList(code){const d=DATA[code];const arr=d.clubs.map(c=>{const top=c.p.map(p=>p[3]).sort((a,b)=>b-a).slice(0,16);return {c,str:top.reduce((s,x)=>s+x,0)/top.length};}).sort((a,b)=>b.str-a.str);
 return `<div class="card"><h3>Vyber klub<span class="sp"></span><span class="tiny">${arr.length} klubů</span></h3>${arr.map((x,i)=>`<button class="lgpick" onclick="startConfirm('${code}',${d.clubs.indexOf(x.c)})">${badge(x.c)}<span class="t"><b>${esc(x.c.n)}</b><small>${UI.start&&(UI.start.role==='owner'||UI.start.role==='both')?'Cena '+fmtMoney(ownDataPrice(x.c))+' · ':''}Síla kádru ${Math.round(x.str)} · ${i<2?'favorit soutěže':i<arr.length*0.35?'ambice na horní příčky':i<arr.length*0.7?'střed tabulky':'boj o záchranu'}${x.c.b?' · rezervní tým (nemůže postoupit)':''}</small></span><span>${ovrB(x.str)}</span></button>`).join('')}</div>`;}
function startRole(k){const n=$('#mgr');if(n)UI.start.name=(n.value||'').trim();UI.start.role=k;render();}
function startFort(v){const n=$('#mgr');if(n)UI.start.name=(n.value||'').trim();UI.start.fort=v;render();}
function bindStart(){const b=$('#st1');if(b)b.onclick=()=>{const n=($('#mgr').value||'').trim();UI.start.name=n||(UI.start.role&&UI.start.role!=='coach'?'Majitel':'Trenér');UI.start.step=1;render();window.scrollTo(0,0);};}
function startPickCountry(cc){UI.start.cc=cc;UI.start.step=2;const ls=countryLeagues(cc,true);UI.start.lg=ls[0].code;render();window.scrollTo(0,0);startLoad(ls[0].code);}
function startPickLeague(code){UI.start.lg=code;render();startLoad(code);}
function startLoad(code){loadLeague(code).then(()=>{if(UI.start.lg===code&&!S){const el=$('#clublist');if(el)el.innerHTML=clubPickList(code);}}).catch(e=>{const el=$('#clublist');if(el)el.innerHTML=`<div class="empty bad">${esc(e.message)}</div><button class="btn w100" onclick="startLoad('${code}')">Zkusit znovu</button>`;});}
function startConfirm(code,ci){const c=DATA[code].clubs[ci];const ps=c.p.slice().sort((a,b)=>b[3]-a[3]).slice(0,5);
 modal(`<div class="hero" style="margin-bottom:10px">${badge(c,'lg')}<div><h2 style="margin:0">${esc(c.n)}</h2><div class="small mut">${esc(leagueLabel(code))} · ${flag(UI.start.cc)} ${esc(FM_CAT.countries[UI.start.cc])}</div></div></div>
 <div class="card"><h3>Opory kádru</h3>${ps.map(p=>`<div class="row small" style="padding:4px 0">${posB(p[1])}<span style="flex:1">${flag(p[5])} ${esc(p[0])}</span><span class="mut">${2026-p[2]} let</span>${ovrB(p[3])}</div>`).join('')}</div>
 <button class="btn big gold" id="cgo">Převzít klub</button>`);
 $('#cgo').onclick=async()=>{const b=$('#cgo');b.disabled=true;b.textContent='Připravuji sezónu…';try{await newGame({cc:UI.start.cc,clubName:c.n,manager:UI.start.name});closeModal();UI.tab='home';render();window.scrollTo(0,0);setTimeout(()=>welcomeModal(),200);}catch(e){console.error(e);b.disabled=false;b.textContent='Převzít klub';toast('⚠️ '+(e.message||'Chyba při načítání'));}};}
function welcomeModal(){const me=myClub();modal(`<div class="c"><div style="font-size:44px">🤝</div><h2>Vítej v klubu ${esc(me.n)}</h2></div><div class="small" style="line-height:1.5">Vedení od tebe v sezóně ${seasonLabel(S.season)} očekává: <b class="gold">${expectText(me.expect)}</b>.<br><br>Na rozpočet máš <b>${fmtMoney(me.money)}</b>. Sestavu a rozestavení nastavíš v záložce <b>Taktika</b>, posily najdeš v záložce <b>Přestupy</b>. Přestupové okno je otevřené na začátku sezóny a v její polovině.</div><div style="height:14px"></div><button class="btn big" onclick="closeModal()">Jdeme na to</button>`);}
// ===================== PŘEHLED =====================
function renderHome(){const me=myClub();let h=typeof v4HomeCards==='function'?v4HomeCards():'';const F=seasonOver()?null:nextMatch();
 if(seasonOver()){h+=`<div class="card c"><div style="font-size:40px">🏁</div><h2 style="margin:4px 0">Sezóna je u konce</h2><div class="small mut" style="margin-bottom:12px">Konečné umístění: <b>${tablePos(S.clubId)}. místo</b> v soutěži ${esc(leagueLabel(me.lg))}.</div><button class="btn big gold" onclick="uiEndSeason()">Vyhodnotit sezónu</button></div>`;}
 else if(F&&F.type==='cup'){const H=CL(F.h),A=CL(F.a);const home=F.h===S.clubId;const cup=cupById(F.cup);
   h+=`<div class="card cupcard"><h3>${cup.ic} ${esc(F.title)}</h3><div class="small mut" style="margin:-4px 0 6px">${F.neutral?'Finále na neutrální půdě':home?'Doma':'Venku'}${F.ko&&F.ko.legs===2&&F.ko.leg===1?` · první zápas ${F.ko.agg[1]}:${F.ko.agg[0]}`:''}</div>
   <div class="vs"><div class="tm">${badge(H,'lg')}<span>${esc(H.n)}</span><small class="mut">${esc(H.foreign?leagueInfo(H.lg).country:leagueLabel(H.lg))}</small></div><div class="mid">VS</div><div class="tm">${badge(A,'lg')}<span>${esc(A.n)}</span><small class="mut">${esc(A.foreign?leagueInfo(A.lg).country:leagueLabel(A.lg))}</small></div></div>
   <div style="height:10px"></div>${lineupIssues()}<button class="btn big gold" onclick="preMatch()">⚽ Na zápas</button></div>`;}
 else{const f=myFixture();
  if(f){const home=f[0]===S.clubId;const opp=S.clubs[home?f[1]:f[0]];const ot=S.leagues[opp.lg].table[opp.id];
   h+=`<div class="card"><h3>${myRoundNo()}. kolo · ${home?'doma':'venku'}<span class="sp"></span>${transferWindow()?'<span class="tag g">přestupy otevřené</span>':''}</h3>
   <div class="vs"><div class="tm">${badge(S.clubs[f[0]],'lg')}<span>${esc(S.clubs[f[0]].n)}</span><small class="mut">${tablePos(f[0])}. místo</small></div><div class="mid">VS</div><div class="tm">${badge(S.clubs[f[1]],'lg')}<span>${esc(S.clubs[f[1]].n)}</span><small class="mut">${tablePos(f[1])}. místo</small></div></div>
   <div class="row small mut" style="justify-content:center;margin:8px 0 12px">Forma soupeře: ${formB(ot.form)||'—'}</div>
   ${lineupIssues()}
   <button class="btn big gold" onclick="preMatch()">⚽ Na zápas</button></div>`;}
  else{const L=S.leagues[me.lg];const idle=lgDue(me.lg)<0;h+=`<div class="card c"><h3>${idle?'Volný týden':myRoundNo()+'. kolo'}</h3><div class="small mut" style="margin-bottom:10px">${idle?`Tvoje soutěž má tento týden pauzu (odehráno ${L.done||0} z ${lgTot(L)} kol). Ostatní soutěže hrají dál.`:'Tvůj tým má v tomto kole volno.'}</div><button class="btn big" onclick="advanceRound(null)">${idle?'Pokračovat na další týden':'Odehrát kolo'}</button></div>`;}}
 h+=cupHomeCard();
 if(S.offers.length)h+=`<div class="card"><h3>📨 Nabídky za hráče</h3>${S.offers.map(offerRow).join('')}</div>`;
 const tab=sortedTable(me.lg).filter(id=>!zoneN(me.lg)||S.clubs[id].z===me.z);const pos=tab.indexOf(S.clubId);const from=clamp(pos-2,0,Math.max(0,tab.length-5));
 h+=`<div class="card"><h3>Tabulka<span class="sp"></span><button class="tiny cy" style="min-height:44px" onclick="UI.lgCode=myClub().lg;UI.lgView='table';go('league')">Celá tabulka ›</button></h3>${tableHtml(me.lg,tab.slice(from,from+5),from)}</div>`;
 h+=`<div class="grid2" style="margin-bottom:12px">${isOwn()?(()=>{const o=S.own;const c=o.coach;return `<div class="tile"><div class="k">Pověst majitele</div><div class="v ${o.rep<35?'bad':o.rep>=65?'good':''}">${ownRepTxt(o.rep)}</div><div class="tiny mut">Fanoušci: ${fansLabel()}</div></div><div class="tile"><div class="k">${S.role==='owner'?'Cíl pro trenéra':'Tvůj cíl sezóny'}</div><div class="v" style="font-size:13.5px;white-space:normal">${expectText(o.goal||me.expect)}</div>${S.role==='owner'?`<div class="tiny mut">${c?esc(c.n)+' · vztah '+(c.pat>=60?'dobrý':c.pat>=35?'napjatý':'špatný'):'Trenér chybí'}</div>`:''}</div>`;})():`<div class="tile"><div class="k">Důvěra vedení</div><div class="v ${S.boardTrust<30?'bad':S.boardTrust>65?'good':''}">${Math.round(S.boardTrust)} %</div><div class="bar" style="margin-top:5px"><i style="width:${S.boardTrust}%"></i></div></div><div class="tile"><div class="k">Cíl sezóny</div><div class="v" style="font-size:13.5px;white-space:normal">${expectText(me.expect)}</div></div>`}</div>`;
 const nws=S.news.filter(n=>UI.newsAll||!n.m).slice(0,UI.newsAll?60:8);
 h+=`<div class="card"><h3>📰 Zprávy<span class="sp"></span><button class="tiny cy" style="min-height:44px" onclick="UI.newsAll=!UI.newsAll;render()">${UI.newsAll?'Jen důležité':'Všechny'}</button></h3>${nws.length?nws.map(n=>`<div class="news"><span>${n.ic}</span><div class="t">${esc(n.t)}<small>${seasonLabel(n.s)} · ${n.r+1>S.maxRound?'po sezóně':newsWhen(n)}</small></div></div>`).join(''):'<div class="empty">Zatím žádné zprávy.</div>'}</div>`;
 return h;}
function lineupIssues(){const bad=S.tac.xi.filter(id=>{const p=P(id);return !p||!available(p)||p.cl!==S.clubId;}).length;const tired=S.tac.xi.map(P).filter(p=>p&&p.cond<60).length;let t='';
 if(bad)t+=`<div class="small warn" style="margin-bottom:8px">⚠️ V základní sestavě ${bad===1?'je 1 nedostupný hráč':'jsou nedostupní hráči ('+bad+')'} – před zápasem ho nahradí náhradník.</div>`;
 if(tired)t+=`<div class="small mut" style="margin-bottom:8px">😮‍💨 Unavení hráči v sestavě: ${tired}.</div>`;return t;}
function offerRow(o){const p=P(o.p);if(!p)return '';return `<div class="pl-row" style="cursor:default">${posB(p.pos)}<div class="nm"><b>${esc(p.n)}</b><small>${esc(o.bn)} · hodnota ${fmtMoney(playerValue(p))}</small></div><div class="r"><div class="b gold small">${fmtMoney(o.fee)}</div><div class="row" style="gap:4px;margin-top:3px"><button class="btn ghost sm" onclick="rejectOffer('${o.id}');render()">Odmítnout</button><button class="btn sm" onclick="confirmBox('Prodat hráče?','${esc(p.n).replace(/'/g,'’')} odejde za ${fmtMoney(o.fee)}.','Prodat',()=>{acceptOffer('${o.id}');render();},'gold')">Prodat</button></div></div></div>`;}
function tableHtml(code,ids,offset){const L=S.leagues[code];const li=leagueInfo(code);const n=L.clubs.length;const lgs=countryLeagues(S.cc);const idx=lgs.findIndex(l=>l.code===code);const upN=idx>0?lgs[idx-1].down:0;const upP=idx>0?(lgs[idx-1].po||0):0;const dnN=idx<lgs.length-1?(li.down||0):0;const dnP=idx<lgs.length-1?(li.po||0):0;const G=L.grp;let lg=null;const zn=zoneN(code);let zi=offset;const zsz=z=>L.clubs.filter(x=>S.clubs[x].z===z).length;let upZ=upN;if(zn){upZ=Math.ceil(upN/zn);}
 return `<table class="tbl"><tr><th>#</th><th class="l">Klub</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>B</th></tr>${ids.map((id,i)=>{const t=L.table[id];const pos=offset+i+1;const c=S.clubs[id];
  let gh='';if(G&&ids.length>5&&G[id]!==lg){lg=G[id];zi=0;gh=`<tr class="gh"><td colspan="8">${esc(grpName(code,lg))}</td></tr>`;}
  if(zn){zi++;const zp=zi,zn2=zsz(c.z);return gh+`<tr class="${id===S.clubId?'me':''} ${zp<=upZ?'up':''} ${zp>zn2-Math.ceil(dnN/zn)?'dn':''}" onclick="clubSheet('${id}')"><td>${zp}</td><td class="nm"><span class="row" style="gap:6px">${badge(c,'sm')}<span style="overflow:hidden;text-overflow:ellipsis;max-width:118px">${esc(c.n)}</span></span></td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}:${t.ga}</td><td class="b">${t.pts}</td></tr>`;}
  return gh+`<tr class="${id===S.clubId?'me':''} ${pos<=upN?'up':pos<=upN+upP?'po':''} ${pos>n-dnN?'dn':pos>n-dnN-dnP?'po':''}" onclick="clubSheet('${id}')"><td>${pos}</td><td class="nm"><span class="row" style="gap:6px">${badge(c,'sm')}<span style="overflow:hidden;text-overflow:ellipsis;max-width:118px">${esc(c.n)}</span></span></td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}:${t.ga}</td><td class="b">${t.pts}</td></tr>`;}).join('')}</table>`;}
// ===================== KÁDR =====================
function statusIc(p){let s='';if(p.inj>0)s+=` <span title="zraněn">🚑${p.inj}</span>`;if(p.sus>0)s+=' ⛔';if(S.tac.xi.includes(p.id))s+=' <span class="tag g">ZS</span>';else if(S.tac.bench.includes(p.id))s+=' <span class="tag">LAV</span>';if(p.yth)s+=' <span class="tag y">odchovanec</span>';return s;}
function renderSquad(){const ps=clubPlayers(S.clubId);const so=UI.sqSort;const ord={G:0,D:1,M:2,F:3};
 const sorted=ps.slice().sort((a,b)=>so==='ovr'?b.ovr-a.ovr:so==='age'?ageOf(a)-ageOf(b):so==='cond'?a.cond-b.cond:so==='val'?playerValue(b)-playerValue(a):(ord[GRP(a.pos)]-ord[GRP(b.pos)])||POS.indexOf(a.pos)-POS.indexOf(b.pos)||b.ovr-a.ovr);
 const wages=ps.reduce((s,p)=>s+playerWage(p),0);const val=ps.reduce((s,p)=>s+playerValue(p),0);
 let h=(typeof kabinaHtml==='function'?kabinaHtml():'')+`<div class="grid3" style="margin-bottom:12px"><div class="tile"><div class="k">Hráčů</div><div class="v">${ps.length}</div></div><div class="tile"><div class="k">Hodnota kádru</div><div class="v" style="font-size:14px">${fmtMoney(val)}</div></div><div class="tile"><div class="k">Mzdy / týden</div><div class="v" style="font-size:14px">${fmtMoney(wages)}</div></div></div>
 <div class="chips" style="margin-bottom:10px">${[['pos','Pozice'],['ovr','Hodnocení'],['age','Věk'],['cond','Kondice'],['val','Hodnota']].map(([k,l])=>`<button class="chip ${so===k?'on':''}" onclick="UI.sqSort='${k}';render()">${l}</button>`).join('')}</div><div class="card" style="padding:6px 10px">`;
 let lastG=null;
 sorted.forEach(p=>{if(so==='pos'&&GRP(p.pos)!==lastG){lastG=GRP(p.pos);h+=`<div class="tiny mut b" style="padding:8px 4px 2px;letter-spacing:.08em;text-transform:uppercase">${GRP_CZ[lastG]}</div>`;}
  h+=`<div class="pl-row" onclick="playerSheet('${p.id}')">${posB(p.pos)}<div class="nm"><b>${flag(p.nat)} ${esc(p.n)}</b><small>${ageOf(p)} let · ${fmtMoney(playerValue(p))}${statusIc(p)}</small></div><div class="cb">${condBar(p.cond)}<div class="tiny mut c">${Math.round(p.cond)} %</div></div>${ovrB(p.ovr)}</div>`;});
 return h+'</div>';}
function potLabel(p){const d=p.pot-p.ovr;const a=ageOf(p);if(a>=29||d<=1)return 'na vrcholu';if(d<=4)return 'mírný';if(d<=9)return 'dobrý';if(d<=15)return 'vysoký';return 'obrovský';}
function attrBars(p){const L=p.pos==='GK'?ATTR_GK:ATTR_CZ;return p.a.map((v,i)=>`<div class="attr"><span class="mut">${L[i]}</span><div class="bar"><i style="width:${v}%;${v>=80?'background:linear-gradient(90deg,#f2a514,#ffe27a)':''}"></i></div><b class="r">${v}</b></div>`).join('');}
function playerSheet(id){const p=P(id);if(!p)return;const mine=p.cl===S.clubId;const c=S.clubs[p.cl];const st=p.st;
 const avgR=st.ap?(st.rt/st.ap).toFixed(2).replace('.',','):'—';
 let act='';
 if(mine){act=`${v4MineHtml(p)}${retrainHtml(p)}<div class="grid2" style="margin-top:12px"><button class="btn ghost" onclick="sellPlayer('${p.id}')">💰 Nabídnout k prodeji</button><button class="btn ghost" onclick="releasePlayer('${p.id}')">✂️ Uvolnit</button></div><button class="btn ghost w100" style="margin-top:8px" onclick="closeModal();compareSheet('${p.id}')">⚖️ Porovnat s jiným hráčem</button>`;}
 else act=`${v4OtherHtml(p)}${scoutHtml(p)}<button class="btn big gold" style="margin-top:12px" onclick="bidSheet('${p.id}')">✍️ Podat nabídku</button>${S.players[p.id]?`<button class="btn ghost w100" style="margin-top:8px" onclick="closeModal();compareSheet('${p.id}')">⚖️ Porovnat s mým hráčem</button>`:''}`;
 modal(`<div class="hero">${posB(p.pos)}<div style="flex:1;min-width:0"><h2 style="margin:0;font-size:18px">${esc(p.n)}</h2><div class="small mut">${flag(p.nat)} ${esc(natName(p.nat))} · ${ageOf(p)} let · ${POS_FULL[p.pos]}</div></div>${ovrB(p.ovr)}</div>
 <div class="row small" style="margin:10px 0">${c?badge(c,'sm')+' '+esc(c.n):'bez klubu'}<span class="sp"></span>${p.yth?'<span class="tag y">odchovanec</span>':''}${p.gen?'<span class="tag" title="Doplněný hráč">doplněný</span>':''}</div>
 <div class="grid3" style="margin-bottom:10px"><div class="tile"><div class="k">Hodnota</div><div class="v" style="font-size:13.5px">${fmtMoney(playerValue(p))}</div></div><div class="tile"><div class="k">Mzda/týden</div><div class="v" style="font-size:13.5px">${fmtMoney(playerWage(p))}</div></div><div class="tile"><div class="k">Potenciál</div><div class="v" style="font-size:13.5px">${potLabel(p)}</div></div></div>
 <div class="card" style="padding:10px 12px">${attrBars(p)}</div>
 <div class="grid2" style="margin-bottom:6px"><div class="tile"><div class="k">Kondice</div>${condBar(p.cond)}<div class="small b">${Math.round(p.cond)} %</div></div><div class="tile"><div class="k">Morálka</div><div class="bar"><i style="width:${p.mor}%"></i></div><div class="small b">${moraleText(p.mor)}</div></div></div>
 <div class="card" style="padding:10px 12px"><h3>Sezóna ${seasonLabel(S.season)}</h3><div class="grid3"><div class="tile"><div class="k">Zápasy</div><div class="v">${st.ap}</div></div><div class="tile"><div class="k">Góly</div><div class="v">${st.g}</div></div><div class="tile"><div class="k">Asistence</div><div class="v">${st.as}</div></div><div class="tile"><div class="k">Prům. známka</div><div class="v">${avgR}</div></div><div class="tile"><div class="k">Žluté</div><div class="v">${st.yc}</div></div><div class="tile"><div class="k">${p.pos==='GK'?'Čistá konta':'Červené'}</div><div class="v">${p.pos==='GK'?st.cs:st.rc}</div></div></div>
 ${p.inj>0?`<div class="small bad" style="margin-top:8px">🚑 Zraněn ještě ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.</div>`:''}${p.sus>0?`<div class="small warn" style="margin-top:8px">⛔ Trest na ${p.sus} ${czPlural(p.sus,'zápas','zápasy','zápasů')}.</div>`:''}</div>${act}`);}
function moraleText(m){return m>=85?'výborná':m>=68?'dobrá':m>=50?'průměrná':m>=32?'špatná':'velmi špatná';}
function sellPlayer(id){const p=P(id);if(!transferWindow()){toast('Přestupové okno je zavřené.');return;}if(clubPlayers(S.clubId).length<=16){toast('Kádr musí mít aspoň 16 hráčů.');return;}
 const fee=Math.round(playerValue(p)*rnd(0.78,0.98)/1e4)*1e4;const others=Object.keys(S.clubs).filter(x=>x!==S.clubId&&S.clubs[x].rep>=p.ovr-8&&S.clubs[x].money>fee);const buyer=others.length?pick(others):null;const bn=buyer?S.clubs[buyer].n:foreignClubName(p);
 confirmBox('Nabídka za hráče',`O hráče ${esc(p.n)} má zájem klub <b>${esc(bn)}</b>. Nabízí <b class="gold">${fmtMoney(fee)}</b> (tržní hodnota ${fmtMoney(playerValue(p))}).`,'Prodat',()=>{S.offers.push({id:'q'+Date.now(),p:id,buyer,bn,fee,r:S.round});acceptOffer(S.offers[S.offers.length-1].id);render();toast('Hráč prodán ✓');},'gold');}
function releasePlayer(id){const p=P(id);if(clubPlayers(S.clubId).length<=16){toast('Kádr musí mít aspoň 16 hráčů.');return;}const cost=playerWage(p)*12;
 confirmBox('Uvolnit hráče?',`Smlouvu s hráčem ${esc(p.n)} ukončíš dohodou. Odstupné činí ${fmtMoney(cost)}.`,'Uvolnit',()=>{money(-cost,'exp','Odstupné: '+p.n);movePlayer(p,null);delete S.players[id];addNews('✂️',`Klub ukončil smlouvu s hráčem ${p.n}.`);saveGame();render();});}
// ===================== TAKTIKA =====================
function renderTactics(){const t=S.tac;const slots=FORMS[t.form];const str=lineStrength(t.xi,t.form,t);
 let h=`<div class="chips" style="margin-bottom:10px">${Object.keys(FORMS).map(f=>`<button class="chip ${t.form===f?'on':''}" onclick="setForm('${f}')">${f}</button>`).join('')}</div>
 <div class="pitch" id="pitch"><div class="box t"></div><div class="box b"></div>${slots.map((s,i)=>{const p=P(t.xi[i]);const fit=p?posFitP(p,s[0]):0;const c=myClub();
  return `<div class="slot ${UI.sel===i?'sel':''} ${p?'':'empty'} ${p&&(!available(p)||fit<0.85)?'bad':''}" style="left:${s[1]}%;top:${s[2]}%" onclick="slotTap(${i})"><div class="sh" style="background:${s[0]==='GK'?'#ffb648':c.c[0]};color:${lum(s[0]==='GK'?'#ffb648':c.c[0])>0.6?'#111':'#fff'}">${p?p.ovr:POS_CZ[s[0]]}</div><div class="sn">${p?esc(pSurname(p)):POS_CZ[s[0]]}</div>${p?`<div class="cbar"><i style="width:${p.cond}%;background:${p.cond<60?'#ff5d73':p.cond<80?'#ffb648':'#3ee68a'}"></i></div>`:''}</div>`;}).join('')}</div>
 <div class="small mut c" style="margin:6px 0 10px">${UI.sel!=null?'Vyber hráče pro pozici '+POS_FULL[slots[UI.sel][0]]+'.':'Klepni na pozici a vyber hráče.'}</div>
 <div class="grid3" style="margin-bottom:12px"><div class="tile"><div class="k">Útok</div><div class="v">${Math.round(str.att)}</div></div><div class="tile"><div class="k">Záloha</div><div class="v">${Math.round(str.mid)}</div></div><div class="tile"><div class="k">Obrana</div><div class="v">${Math.round(str.def)}</div></div></div>
 <div class="grid2" style="margin-bottom:12px"><button class="btn ghost" onclick="autoPick()">🪄 Nejlepší sestava</button><button class="btn ghost" onclick="benchSheet()">🪑 Lavička (${t.bench.length})</button></div>
 <div class="card"><h3>Mentalita</h3><div class="seg">${Object.entries(MENT).map(([k,v])=>`<button class="${t.ment===k?'on':''}" onclick="S.tac.ment='${k}';saveGame();render()">${v}</button>`).join('')}</div>
 <h3 style="margin-top:12px">Presink</h3><div class="seg">${Object.entries(PRESS).map(([k,v])=>`<button class="${t.press===k?'on':''}" onclick="S.tac.press='${k}';saveGame();render()">${v}</button>`).join('')}</div>
 <h3 style="margin-top:12px">Styl hry</h3><div class="seg">${Object.entries(STYLE).map(([k,v])=>`<button class="${t.style===k?'on':''}" onclick="S.tac.style='${k}';saveGame();render()">${v}</button>`).join('')}</div>
 <div class="tiny mut" style="margin-top:10px">Vysoký presink zvyšuje tlak, ale hráči se víc unaví. Protiútoky fungují nejlépe s defenzivní mentalitou. Sehranost týmu: <b>${Math.round(S.cohesion)} %</b>.</div></div>`+renderTacExtra();
 return h;}
function setForm(f){const t=S.tac;const old=t.xi.slice();t.form=f;const slots=FORMS[f];const used=new Set();const xi=new Array(11).fill(null);
 // přeřadit stávající hráče co nejlépe
 const pool=old.map(P).filter(p=>p&&p.cl===S.clubId);slots.forEach((s,i)=>{let best=null,bv=-1;pool.forEach(p=>{if(used.has(p.id))return;const v=p.ovr*posFitP(p,s[0]);if(v>bv){bv=v;best=p;}});if(best){xi[i]=best.id;used.add(best.id);}});
 t.xi=xi;UI.sel=null;saveGame();render();}
function autoPick(){const l=autoLineup(S.clubId,S.tac.form);S.tac.xi=l.xi;S.tac.bench=l.bench.slice(0,9);UI.sel=null;saveGame();render();toast('Sestava sestavena podle formy a kondice ✓');}
function slotTap(i){UI.sel=i;const slot=FORMS[S.tac.form][i][0];const ps=clubPlayers(S.clubId).sort((a,b)=>b.ovr*posFitP(b,slot)-a.ovr*posFitP(a,slot));
 modal(`<h2>${POS_FULL[slot]}</h2><div class="small mut" style="margin-bottom:8px">Číslo vpravo je síla hráče na této pozici.</div>${ps.map(p=>{const where=S.tac.xi.indexOf(p.id);const r=Math.round(p.ovr*posFitP(p,slot));return `<div class="pl-row" onclick="assignSlot(${i},'${p.id}')" style="${!available(p)?'opacity:.5':''}">${posB(p.pos)}<div class="nm"><b>${esc(p.n)}${where===i?' ✓':''}</b><small>${ageOf(p)} let · kondice ${Math.round(p.cond)} %${statusIc(p)}</small></div>${ovrB(r)}</div>`;}).join('')}`);}
function assignSlot(i,id){const t=S.tac;const p=P(id);if(!available(p)){toast(p.inj>0?'Hráč je zraněný.':'Hráč má trest.');return;}const prev=t.xi[i];const k=t.xi.indexOf(id);
 if(k>=0)t.xi[k]=prev;else{const b=t.bench.indexOf(id);if(b>=0){if(prev)t.bench[b]=prev;else t.bench.splice(b,1);}}
 t.xi[i]=id;UI.sel=null;closeModal();saveGame();render();}
function benchSheet(){const t=S.tac;const ps=clubPlayers(S.clubId).filter(p=>!t.xi.includes(p.id)).sort((a,b)=>(t.bench.includes(b.id)-t.bench.includes(a.id))||b.ovr-a.ovr);
 modal(`<h2>Lavička náhradníků</h2><div class="small mut" style="margin-bottom:8px">Vyber až 9 náhradníků (${t.bench.length}/9). Během zápasu můžeš 5× střídat.</div>${ps.map(p=>`<div class="pl-row" onclick="toggleBench('${p.id}')" style="${!available(p)?'opacity:.5':''}"><span style="width:26px;font-size:18px">${t.bench.includes(p.id)?'✅':'⬜'}</span>${posB(p.pos)}<div class="nm"><b>${esc(p.n)}</b><small>${ageOf(p)} let · kondice ${Math.round(p.cond)} %${p.inj>0?' · zraněn':''}</small></div>${ovrB(p.ovr)}</div>`).join('')}`);}
function toggleBench(id){const t=S.tac;const k=t.bench.indexOf(id);if(k>=0)t.bench.splice(k,1);else{if(t.bench.length>=9){toast('Na lavičce může být nejvýše 9 hráčů.');return;}if(!available(P(id))){toast('Hráč není k dispozici.');return;}t.bench.push(id);}saveGame();benchSheet();}

// ===================== SOUTĚŽ =====================
function renderLeague(){const lgs=countryLeagues(S.cc);if(!UI.lgCode||!S.leagues[UI.lgCode])UI.lgCode=myClub().lg;const code=UI.lgCode;const L=S.leagues[code];const v=UI.lgView;
 let h=compChips();if(UI.lgMode==='cup'&&S.cups&&S.cups.list.length)return h+renderCups();if(UI.lgMode==='world'&&S.W)return h+renderWorld();
 h+=`<div class="seg" style="margin-bottom:10px">${[['table','Tabulka'],['fix','Zápasy'],['sc','Střelci'],['hist','Historie']].map(([k,l])=>`<button class="${v===k?'on':''}" onclick="UI.lgView='${k}';render()">${l}</button>`).join('')}</div>`;
 if(v==='table'){const li=leagueInfo(code);const idx=lgs.findIndex(l=>l.code===code);h+=`<div class="card" style="padding:8px 8px">${tableHtml(code,sortedTable(code),0)}${S.leagues[code].ded&&myClub().lg===code?`<div class="tiny bad" style="margin-top:8px">⚖️ ${esc(myClub().n)}: odečteno ${S.leagues[code].ded} bodů za korupční skandál.</div>`:''}<div class="tiny mut" style="margin-top:8px;line-height:1.5">${idx>0&&lgs[idx-1].down?`<span class="good">▌</span> postup (${lgs[idx-1].down}) `:''}${idx>0&&lgs[idx-1].po?`<span class="warn">▌</span> baráž (${lgs[idx-1].po}) `:''}${li.down&&idx<lgs.length-1?`<span class="bad">▌</span> sestup (${li.down}) `:''}${li.po&&idx<lgs.length-1?`<span class="warn">▌</span> baráž (${li.po})`:''}${SPLIT[code]?'<br>Po 30 kolech se soutěž dělí na skupinu o titul (1.–6.), o umístění (7.–10.) a o záchranu (11.–16.), body se přenášejí.':''}${(idx===lgs.length-1&&!(idx>0))?'Soutěž je v této zemi jediná, nesestupuje se.':''}</div></div>`;}
 else if(v==='fix'){let r=UI.lgRound==null?Math.min(lgDue(code)>=0?lgDue(code):Math.max(0,(L.done||0)-1),L.fix.length-1):UI.lgRound;r=clamp(r,0,L.fix.length-1);
  h+=`<div class="row" style="margin-bottom:8px"><button class="btn ghost sm" ${r<=0?'disabled':''} onclick="UI.lgRound=${r-1};render()">‹</button><div class="sp c b">${r+1}. kolo</div><button class="btn ghost sm" ${r>=L.fix.length-1?'disabled':''} onclick="UI.lgRound=${r+1};render()">›</button></div><div class="card" style="padding:6px 10px">`;
  const res=L.res[r];
  L.fix[r].forEach(([a,b],k)=>{const rr=res&&res.find(x=>x.h===a&&x.a===b);const me=a===S.clubId||b===S.clubId;
   h+=`<div class="fx ${me?'me':''}" ${rr?`onclick="resSheet('${code}',${r},'${a}')"`:''}><span class="t r">${esc(S.clubs[a].n)}</span>${badge(S.clubs[a],'sm')}<span class="sc">${rr?rr.gh+':'+rr.ga:'–:–'}</span>${badge(S.clubs[b],'sm')}<span class="t">${esc(S.clubs[b].n)}</span></div>`;});
  h+='</div>';}
 else if(v==='sc'){const ts=topScorers(code,20);h+=`<div class="card" style="padding:6px 10px">${ts.length?`<table class="tbl"><tr><th>#</th><th class="l">Hráč</th><th>G</th><th>A</th></tr>${ts.map((x,i)=>`<tr class="${x.p.cl===S.clubId?'me':''}" onclick="playerSheet('${x.p.id}')"><td>${i+1}</td><td class="nm"><b>${esc(x.p.n)}</b><div class="tiny mut">${esc(S.clubs[x.p.cl].n)}</div></td><td class="b">${x.g}</td><td>${x.as}</td></tr>`).join('')}</table>`:'<div class="empty">Zatím nepadl žádný gól.</div>'}</div>`;}
 else{h+=`<div class="card">${S.history.length?S.history.map(r=>`<div class="news"><span>${r.pos===1?'🏆':r.myMove>0?'⬆️':r.myMove<0?'⬇️':'📅'}</span><div class="t"><b>${seasonLabel(r.season)}</b> – ${esc(leagueLabel(r.lg))}: ${r.pos}. místo, ${r.pts} b. (${r.w}–${r.d}–${r.l}, skóre ${r.gf}:${r.ga})${r.topScorer?`<small>Nejlepší střelec soutěže: ${esc(r.topScorer.n)} (${r.topScorer.g} ${czPlural(r.topScorer.g,'gól','góly','gólů')})</small>`:''}</div></div>`).join(''):'<div class="empty">Historie se začne psát po první sezóně.</div>'}</div>`;
  if(S.trophies.length)h+=`<div class="card"><h3>🏆 Úspěchy</h3>${S.trophies.map(t=>`<div class="news"><span>🏅</span><div class="t">${esc(t.t)}<small>${seasonLabel(t.s)}</small></div></div>`).join('')}</div>`;}
 return h;}
function resSheet(code,r,h){const res=S.leagues[code].res[r].find(x=>x.h===h);if(!res)return;const H=S.clubs[res.h],A=S.clubs[res.a];
 modal(`<div class="vs" style="margin-bottom:10px"><div class="tm">${badge(H,'lg')}<span>${esc(H.n)}</span></div><div class="mid" style="font-size:28px;color:#fff">${res.gh}:${res.ga}</div><div class="tm">${badge(A,'lg')}<span>${esc(A.n)}</span></div></div>
 <div class="card">${(res.ev||[]).length?res.ev.sort((a,b)=>a.m-b.m).map(e=>{const p=P(e.p);return `<div class="row small" style="padding:4px 0;${e.c===res.a?'flex-direction:row-reverse;text-align:right':''}"><span class="mut b">${e.m}'</span><span>⚽ ${p?esc(p.n):'—'}${e.og?' (vlastní)':''}</span></div>`;}).join(''):'<div class="empty">Bez branek.</div>'}</div>`);}
function clubSheet(id){const c=S.clubs[id];const ps=clubPlayers(id).sort((a,b)=>b.ovr-a.ovr);const st=teamStrength(id);const t=S.leagues[c.lg].table[id];
 modal(`<div class="hero" style="margin-bottom:10px">${badge(c,'lg')}<div><h2 style="margin:0">${esc(c.n)}</h2><div class="small mut">${esc(leagueLabel(c.lg))} · ${tablePos(id)}. místo · ${t.pts} b.</div></div></div>
 <div class="grid3" style="margin-bottom:10px"><div class="tile"><div class="k">Útok</div><div class="v">${Math.round(st.att)}</div></div><div class="tile"><div class="k">Záloha</div><div class="v">${Math.round(st.mid)}</div></div><div class="tile"><div class="k">Obrana</div><div class="v">${Math.round(st.def)}</div></div></div>
 <div class="row small mut" style="margin-bottom:8px">Forma: ${formB(t.form)||'—'}<span class="sp"></span>Stadion: ${fmtNum(c.cap)} míst</div>
 <div class="card" style="padding:6px 10px">${ps.map(p=>`<div class="pl-row" onclick="playerSheet('${p.id}')">${posB(p.pos)}<div class="nm"><b>${flag(p.nat)} ${esc(p.n)}</b><small>${ageOf(p)} let · ${fmtMoney(playerValue(p))}${p.inj>0?' · 🚑':''}</small></div>${ovrB(p.ovr)}</div>`).join('')}</div>`);}
// ===================== PŘESTUPY =====================
function allLeagueOptions(){const groups={};FM_CAT.leagues.forEach(l=>{(groups[l.country]=groups[l.country]||[]).push(l);});return groups;}
function renderMarket(){const mk=UI.mk;const me=myClub();const win=transferWindow();
 let h=`<div class="card" style="padding:12px"><div class="row"><span style="font-size:22px">${win?'🟢':'🔴'}</span><div style="flex:1"><b>${win?'Přestupové okno je otevřené':'Přestupové okno je zavřené'}</b><div class="tiny mut">${win?'Můžeš kupovat i prodávat hráče.':'Otevře se v polovině sezóny a znovu v létě. Hráče si můžeš prohlížet.'}</div></div></div></div>`;
 if(S.offers.length)h+=`<div class="card"><h3>📨 Nabídky za tvé hráče</h3>${S.offers.map(offerRow).join('')}</div>`;
 const groups=allLeagueOptions();
 h+=`<div class="card"><h3>Hledat hráče</h3><select id="mkcode" onchange="UI.mk.code=this.value;render()"><option value="*" ${mk.code==='*'?'selected':''}>${flag(S.cc)} Všechny soutěže v zemi ${esc(FM_CAT.countries[S.cc])}</option>${Object.entries(groups).map(([cn,ls])=>`<optgroup label="${esc(cn)}">${ls.map(l=>`<option value="${l.code}" ${mk.code===l.code?'selected':''}>${esc(cn)} – ${esc(l.name)}</option>`).join('')}</optgroup>`).join('')}</select>
 <div class="chips" style="margin-top:8px">${[['all','Vše'],['G','Brankáři'],['D','Obránci'],['M','Záložníci'],['F','Útočníci']].map(([k,l])=>`<button class="chip ${mk.pos===k?'on':''}" onclick="UI.mk.pos='${k}';render()">${l}</button>`).join('')}</div>
 <div class="grid2" style="margin-top:8px"><select onchange="UI.mk.max=+this.value;render()"><option value="0">Cena: bez limitu</option>${[2e5,5e5,1e6,2e6,5e6,1e7,2e7,5e7].map(v=>`<option value="${v}" ${mk.max===v?'selected':''}>do ${fmtMoney(v)}</option>`).join('')}<option value="-1" ${mk.max===-1?'selected':''}>do mého rozpočtu</option></select>
 <select onchange="UI.mk.age=+this.value;render()"><option value="0">Věk: jakýkoli</option>${[21,23,25,28,31].map(v=>`<option value="${v}" ${mk.age===v?'selected':''}>do ${v} let</option>`).join('')}</select></div>
 <div class="chips" style="margin-top:8px">${[['ovr','Nejlepší'],['val','Nejlevnější'],['pot','Talenty']].map(([k,l])=>`<button class="chip ${mk.sort===k?'on':''}" onclick="UI.mk.sort='${k}';render()">${l}</button>`).join('')}</div></div>
 <div id="mkres"><div class="empty"><div class="sp2" style="margin:0 auto 10px"></div>Hledám hráče…</div></div>`;
 return h;}
const MK={tmp:{}};
function foreignPlayers(code){const d=DATA[code];const out=[];if(!d)return out;d.clubs.forEach((c,ci)=>{c.p.forEach((a,pi)=>{const key=code+':'+ci+':'+pi;if(S.gone[key])return;
 out.push({tmp:1,key,code,ci,id:'t_'+key,n:a[0],pos:a[1],by:a[2],ovr:a[3],pot:a[4],nat:a[5],a:a[6],gen:a[7],club:c,cond:100,mor:70,inj:0,sus:0,st:newStats()});});});return out;}
function marketLoadResults(){const mk=UI.mk;const el=$('#mkres');if(!el)return;
 const draw=list=>{const me=myClub();const max=mk.max===-1?me.money:mk.max;let arr=list.filter(p=>p.cl!==S.clubId&&(mk.pos==='all'||GRP(p.pos)===mk.pos)&&(!mk.age||ageOf(p)<=mk.age)&&(!max||playerValue(p)<=max));
  arr.sort((a,b)=>mk.sort==='val'?playerValue(a)-playerValue(b):mk.sort==='pot'?(b.pot-b.ovr)-(a.pot-a.ovr)||b.pot-a.pot:b.ovr-a.ovr);arr=arr.slice(0,60);MK.tmp={};arr.forEach(p=>{if(p.tmp)MK.tmp[p.id]=p;});
  el.innerHTML=arr.length?`<div class="card" style="padding:6px 10px">${arr.map(p=>{const c=p.tmp?p.club:S.clubs[p.cl];return `<div class="pl-row" onclick="${p.tmp?`tmpSheet('${p.id}')`:`playerSheet('${p.id}')`}">${posB(p.pos)}<div class="nm"><b>${flag(p.nat)} ${esc(p.n)}</b><small>${ageOf(p)} let · ${c?esc(c.n):''} · ${fmtMoney(playerValue(p))}</small></div>${ovrB(p.ovr)}</div>`;}).join('')}</div>`:'<div class="empty">Filtru neodpovídá žádný hráč.</div>';};
 if(mk.code==='*'){draw(Object.values(S.players));return;}
 if(S.leagues[mk.code]){draw(Object.values(S.players).filter(p=>p.cl&&S.clubs[p.cl]&&S.clubs[p.cl].lg===mk.code));return;}
 loadLeague(mk.code).then(()=>{if(UI.tab==='market'&&UI.mk.code===mk.code)draw(foreignPlayers(mk.code));}).catch(e=>{el.innerHTML=`<div class="empty bad">${esc(e.message)}</div>`;});}
function tmpSheet(id){const p=MK.tmp[id];if(!p)return;const top=p.club.p.map(x=>x[3]).sort((a,b)=>b-a).slice(0,16);p.clubRep=top.reduce((s,x)=>s+x,0)/top.length;
 modal(`<div class="hero">${posB(p.pos)}<div style="flex:1;min-width:0"><h2 style="margin:0;font-size:18px">${esc(p.n)}</h2><div class="small mut">${flag(p.nat)} ${esc(natName(p.nat))} · ${ageOf(p)} let · ${POS_FULL[p.pos]}</div></div>${ovrB(p.ovr)}</div>
 <div class="row small" style="margin:10px 0">${badge(p.club,'sm')} ${esc(p.club.n)} <span class="mut">· ${esc(leagueLabel(p.code))}</span></div>
 <div class="grid3" style="margin-bottom:10px"><div class="tile"><div class="k">Hodnota</div><div class="v" style="font-size:13.5px">${fmtMoney(playerValue(p))}</div></div><div class="tile"><div class="k">Mzda/týden</div><div class="v" style="font-size:13.5px">${fmtMoney(playerWage(p))}</div></div><div class="tile"><div class="k">Potenciál</div><div class="v" style="font-size:13.5px">${potLabel(p)}</div></div></div>
 <div class="card" style="padding:10px 12px">${attrBars(p)}</div><button class="btn big gold" onclick="bidSheet('${p.id}')">✍️ Podat nabídku</button>`);}
function bidSheet(id){const p=id.startsWith('t_')?MK.tmp[id]:P(id);if(!p)return;if(!transferWindow()){toast('Přestupové okno je zavřené.');return;}
 const val=playerValue(p);const steps=[0.8,0.9,1,1.1,1.2,1.35,1.5].map(f=>Math.round(val*f/1e4)*1e4||Math.round(val*f));
 modal(`<h2>Nabídka: ${esc(p.n)}</h2><div class="small mut" style="margin-bottom:10px">Tržní hodnota ${fmtMoney(val)} · hráč bude chtít mzdu ${fmtMoney(playerWage(p))} týdně. Rozpočet: <b>${fmtMoney(myClub().money)}</b>.</div>
 <div class="col">${steps.map(v=>`<button class="btn ${v>myClub().money?'ghost':''}" ${v>myClub().money?'disabled':''} onclick="makeBid('${id}',${v})">${fmtMoney(v)}${v<val?' (pod hodnotou)':v>val?' (nad hodnotou)':' (tržní hodnota)'}</button>`).join('')}</div>`);}
function makeBid(id,fee){const tmp=id.startsWith('t_');const p=tmp?MK.tmp[id]:P(id);if(!p)return;const me=myClub();if(fee>me.money){toast('Na tuto nabídku nemáš peníze.');return;}
 if(clubPlayers(S.clubId).length>=36){toast('Kádr je plný (max. 36 hráčů).');return;}
 const val=playerValue(p);const sellerRep=tmp?p.clubRep:S.clubs[p.cl].rep;const sellerSize=tmp?p.club.p.length:S.clubs[p.cl].pl.length;
 // ochota klubu
 let ok=0.15+(fee/val-0.8)*1.3;if(p.ovr>=sellerRep+2)ok-=0.2;if(sellerSize<=19)ok-=0.4;ok=clamp(ok,0,0.97);
 // ochota hráče
 const myRep=me.rep||teamStrength(S.clubId).ovr;let will=0.85-Math.max(0,(p.ovr-myRep)-3)*0.09-Math.max(0,sellerRep-myRep-2)*0.05;if(ageOf(p)>=31)will+=0.1;will+=((S.v4&&S.v4.mrep||50)-50)/250;will=clamp(will,0.03,0.97);
 if(!tmp&&!UI._bw&&bidWar(id,fee))return;UI._bw=0;
 closeModal();
 if(RNG()>ok){modal(`<div class="c"><div style="font-size:42px">🙅</div><h2>Nabídka odmítnuta</h2><div class="small mut">Klub ${esc(tmp?p.club.n:S.clubs[p.cl].n)} tvou nabídku ${fmtMoney(fee)} za hráče ${esc(p.n)} odmítl.${fee<val?' Zkus nabídnout víc.':''}</div></div><div style="height:12px"></div><button class="btn big" onclick="closeModal()">Rozumím</button>`);return;}
 if(RNG()>will){modal(`<div class="c"><div style="font-size:42px">🤷</div><h2>Hráč nemá zájem</h2><div class="small mut">Klub nabídku přijal, ale ${esc(p.n)} o přestup do tvého týmu nestojí. Láká ho silnější klub.</div></div><div style="height:12px"></div><button class="btn big" onclick="closeModal()">Škoda</button>`);return;}
 money(-fee,'tr_out','Nákup: '+p.n);let np;
 if(tmp){np=mkPlayer([p.n,p.pos,p.by,p.ovr,p.pot,p.nat,p.a,p.gen],S.clubId);me.pl.push(np.id);S.gone[p.key]=1;}else{S.clubs[p.cl].money+=fee;movePlayer(p,S.clubId);np=p;}
 np.mor=80;np.cy=S.season+rint(2,4);np.wm=1;np.hap=72;{const sq=clubPlayers(S.clubId).filter(x=>x.id!==np.id).sort((a,b)=>b.ovr-a.ovr);if(sq.length<3||np.ovr>=sq[2].ovr)fansAdd(3);}addNews('✍️',`Posila! ${np.n} podepsal smlouvu, přestupová částka ${fmtMoney(fee)}.`);saveGame();render();
 modal(`<div class="c"><div style="font-size:46px">✍️</div><h2>Přestup dokončen</h2><div class="small">${esc(np.n)} je novou posilou týmu. Mzda ${fmtMoney(playerWage(np))} týdně.</div></div><div style="height:12px"></div><div class="grid2"><button class="btn ghost" onclick="closeModal()">Zavřít</button><button class="btn" onclick="closeModal();go('tac')">Do sestavy</button></div>`);}
// ===================== KLUB =====================
function renderClub(){const me=myClub();const ps=clubPlayers(S.clubId);const wages=ps.reduce((s,p)=>s+playerWage(p),0);const f=S.finSeason;const tr=S.training;const ct=UI.clubTab||'fin';
 let h=`<div class="seg" style="margin-bottom:10px">${[['fin','Klub'],['tr','Trénink'],['zaz','Zázemí'],['kar','Kariéra'],['set','Nastavení']].map(([k,l])=>`<button class="${ct===k?'on':''}" onclick="UI.clubTab='${k}';render()">${l}</button>`).join('')}</div>`;
 h=`<button class="btn ghost w100" style="margin-bottom:10px" onclick="go('own')">💼 ${typeof ownMode==='function'&&ownMode()?'Kancelář majitele':'Majitel klubu'}</button>`+h;if(ct==='tr')return h+renderTraining();if(ct==='zaz')return h+renderFacilities();if(ct==='kar')return h+renderCareer();
 if(ct==='fin'){h+=`<div class="grid2" style="margin-bottom:10px"><div class="tile"><div class="k">Fanoušci</div><div class="v ${fansCls()}">${fansIc()} ${fansLabel()}</div></div>${isOwn()?`<div class="tile"><div class="k">Pověst majitele</div><div class="v ${S.own.rep<35?'bad':S.own.rep>=65?'good':''}">${ownRepTxt(S.own.rep)}</div></div>`:`<div class="tile"><div class="k">Důvěra vedení</div><div class="v ${S.boardTrust<30?'bad':S.boardTrust>65?'good':''}">${Math.round(S.boardTrust)} %</div></div>`}</div><div class="card"><h3>💶 Finance</h3><div class="grid2"><div class="tile"><div class="k">Zůstatek</div><div class="v ${me.money<0?'bad':'gold'}">${fmtMoney(me.money)}</div></div><div class="tile"><div class="k">Bilance týdne</div><div class="v ${me.tv-wages<0?'bad':'good'}">${fmtMoney(me.tv-wages)}</div></div><div class="tile"><div class="k">Mzdy / týden</div><div class="v" style="font-size:14px">${fmtMoney(wages)}</div></div><div class="tile"><div class="k">TV a sponzoři / týden</div><div class="v" style="font-size:14px">${fmtMoney(me.tv)}</div></div></div>
 <div class="small mut" style="margin-top:10px;line-height:1.6">Tato sezóna: vstupné ${fmtMoney(f.gate)} · prodeje ${fmtMoney(f.tr_in)} · nákupy ${fmtMoney(f.tr_out)} · mzdy ${fmtMoney(f.wages)}<br>Stadion: ${fmtNum(me.cap)} míst · vstupenka ${fmtMoney(me.ticket)}</div>
 <details style="margin-top:8px"><summary class="small cy" style="min-height:40px;display:flex;align-items:center">Pohyby na účtu</summary>${S.fin.log.slice(0,25).map(l=>`<div class="row small" style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span class="mut" style="width:52px">${l.r+1>S.maxRound?'léto':(l.r+1)+'. k.'}</span><span style="flex:1">${esc(l.t)}</span><b class="${l.v<0?'bad':'good'}">${fmtMoney(l.v)}</b></div>`).join('')}</details></div>
 ${isOwn()?`<div class="card"><h3>💼 Majitel klubu</h3><div class="small">${S.role==='owner'?'Cíl pro trenéra':'Tvůj cíl sezóny'}: <b class="gold">${expectText(S.own.goal||me.expect)}</b></div><div class="small" style="margin-top:6px">Pověst majitele: <b>${ownRepTxt(S.own.rep)}</b></div><div class="tiny mut" style="margin-top:6px">${S.role==='owner'?'Trenér: '+(S.own.coach?esc(S.own.coach.n):'chybí')+' · majitel: '+esc(S.manager):'Majitel i trenér: '+esc(S.manager)}</div></div>`:`<div class="card"><h3>👔 Vedení klubu</h3><div class="small">Cíl sezóny: <b class="gold">${expectText(me.expect)}</b></div><div class="small" style="margin-top:6px">Důvěra vedení: <b>${Math.round(S.boardTrust)} %</b></div><div class="bar" style="margin-top:6px"><i style="width:${S.boardTrust}%"></i></div><div class="tiny mut" style="margin-top:6px">Trenér: ${esc(S.manager)}</div></div>`}
 `+fansCard()+`<div class="card"><h3>📰 Média</h3><div class="small">Rivalové v médiích: ${Object.entries(S.riv||{}).filter(([k,v])=>v>=3&&CL(k)).map(([k])=>esc(CL(k).n)).join(', ')||'zatím nikdo'}</div><div class="tiny mut" style="margin-top:6px">Odpovědi na tiskových konferencích ovlivňují morálku kabiny, fanoušky${isOwn()?'':', vedení'} i vztahy se soupeři.</div></div>`;return h;}
 h+=`<div class="card"><h3>⚙️ Nastavení a uložení · v${FM_VER}</h3>
 <div class="small mut" style="margin-bottom:6px">Rychlost zápasu</div><div class="seg" style="margin-bottom:10px">${[[1,'Pomalu'],[2,'Normálně'],[3,'Rychle']].map(([k,l])=>`<button class="${S.settings.speed===k?'on':''}" onclick="S.settings.speed=${k};saveGame();render()">${l}</button>`).join('')}</div>
 <div class="small mut" style="margin-bottom:6px">Zvuky</div><div class="seg" style="margin-bottom:12px"><button class="${!S.settings.sound?'on':''}" onclick="S.settings.sound=false;saveGame();render()">Vypnuté</button><button class="${S.settings.sound?'on':''}" onclick="S.settings.sound=true;getAC();saveGame();render();beep(880,.15)">Zapnuté</button></div>
 <div class="small mut" style="margin-bottom:6px">Atmosféra stadionu (zvuk davu)</div><div class="seg" style="margin-bottom:12px"><button class="${S.settings.crowd===false?'on':''}" onclick="S.settings.crowd=false;saveGame();render()">Vypnutá</button><button class="${S.settings.crowd!==false?'on':''}" onclick="S.settings.crowd=true;if(!S.settings.sound){S.settings.sound=true;}getAC();saveGame();render()">Zapnutá</button></div>
 <div class="small mut" style="margin-bottom:6px">Tiskové konference</div><div class="seg" style="margin-bottom:12px"><button class="${S.settings.press===false?'on':''}" onclick="S.settings.press=false;saveGame();render()">Vypnuté</button><button class="${S.settings.press!==false?'on':''}" onclick="S.settings.press=true;saveGame();render()">Zapnuté</button></div>
 <div class="small mut" style="margin-bottom:6px">Chat sázkařů při zápase</div><div class="seg" style="margin-bottom:12px"><button class="${S.settings.betChat===false?'on':''}" onclick="S.settings.betChat=false;saveGame();render()">Skrytý</button><button class="${S.settings.betChat!==false?'on':''}" onclick="S.settings.betChat=true;saveGame();render()">Zobrazený</button></div>
 <div class="small mut" style="margin-bottom:6px">Limit sázek na jedno kolo</div><div class="seg" style="margin-bottom:12px">${[1000,5000,20000,50000].map(v=>`<button class="${(S.settings.betLimit||5000)===v?'on':''}" onclick="S.settings.betLimit=${v};saveGame();render()">${fmtMoney(v)}</button>`).join('')}</div>
 <div class="grid2"><button class="btn ghost" onclick="saveGame(true);toast('Uloženo ✓')">💾 Uložit</button><button class="btn ghost" onclick="exportSave()">📤 Export</button><label class="btn ghost" style="cursor:pointer">📥 Import<input type="file" accept=".json,application/json" style="display:none" onchange="importSave(this)"></label><button class="btn red" onclick="confirmBox('Nová hra?','Současná kariéra bude smazána.','Smazat',()=>{resetGame();UI.tab='home';UI.start={step:0};render();})">🗑️ Nová hra</button></div>
 <div class="tiny mut" style="margin-top:8px">Hra se ukládá automaticky po každém kole i změně. Soupisky: skutečné kádry 2026/27, hodnocení hráčů je orientační.</div></div>`;
 return h;}

// ===================== UI v2: poháry, svět, sázky =====================
function compChips(){const lgs=countryLeagues(S.cc);const m=UI.lgMode||'lg';
 return `<div class="chips" style="margin-bottom:8px">${lgs.map(l=>`<button class="chip ${m==='lg'&&UI.lgCode===l.code?'on':''}" onclick="UI.lgMode='lg';UI.lgCode='${l.code}';UI.lgRound=null;render()">${esc(l.name)}</button>`).join('')}${(S.cups&&S.cups.list.length)?`<button class="chip ${m==='cup'?'on':''}" onclick="UI.lgMode='cup';render()">🏆 Poháry</button>`:''}${S.W?`<button class="chip ${m==='world'?'on':''}" onclick="UI.lgMode='world';render()">🌍 Svět</button>`:''}</div>`;}
function tieScore(t){if(!t.res.length)return '–:–';if(t.legs===1)return t.res[0][0]+':'+t.res[0][1];const a=t.res[0][0]+(t.res[1]?t.res[1][1]:0),b=t.res[0][1]+(t.res[1]?t.res[1][0]:0);return a+':'+b;}
function tieRow(t){const A=CL(t.a),B=CL(t.b);const me=t.a===S.clubId||t.b===S.clubId;const det=t.legs===2&&t.res.length?`${t.res[0][0]}:${t.res[0][1]}${t.res[1]?', '+t.res[1][1]+':'+t.res[1][0]:''}`:'';
 return `<div class="fx ${me?'me':''}" style="cursor:default"><span class="t r ${t.w===t.a?'b':''}">${esc(A.n)}</span>${badge(A,'sm')}<span class="sc">${tieScore(t)}</span>${badge(B,'sm')}<span class="t ${t.w===t.b?'b':''}">${esc(B.n)}</span></div>${det||t.pen||t.et?`<div class="tiny mut c" style="margin:-4px 0 4px">${det?'zápasy '+det:''}${t.et&&!t.pen?(det?' · ':'')+'po prodloužení':''}${t.pen?(det?' · ':'')+(t.et?'po prodloužení, ':'')+'penalty '+t.pen[0]+':'+t.pen[1]:''}</div>`:''}`;}
function cupNextText(cup){const e=(S.cal||[]).find(x=>x.c===cup.id&&!x.done);if(!e)return cup.winner?`Vítěz: <b>${esc(CL(cup.winner).n)}</b>`:'Soutěž skončila.';return e.r>=S.maxRound?'Další zápasy: po skončení ligy':e.r<=S.round?'Další zápasy: teď':`Další zápasy: po ${lgRoundsBy(myClub().lg,e.r)}. kole ligy`;}
function grpTable(g,gi,cup){const t=grpSorted(g);return `<div class="card" style="padding:8px 8px"><h3>Skupina ${GL(gi)}</h3><table class="tbl"><tr><th>#</th><th class="l">Klub</th><th>Z</th><th>Skóre</th><th>B</th></tr>${t.map((r,i)=>{const x=g.t[r];const c=CL(r);return `<tr class="${r===S.clubId?'me':''} ${i<2?'up':''}" style="cursor:default"><td>${i+1}</td><td class="nm"><span class="row" style="gap:6px">${badge(c,'sm')}<span style="overflow:hidden;text-overflow:ellipsis;max-width:150px">${esc(c.n)}</span></span></td><td>${x[0]}</td><td>${x[4]}:${x[5]}</td><td class="b">${x[6]}</td></tr>`;}).join('')}</table></div>`;}
function renderCups(){const L=S.cups.list;if(!UI.cupId||!cupById(UI.cupId)){const mine=L.find(c=>c.teams.includes(S.clubId)&&c.kind==='grp')||L.find(c=>c.id==='dom')||L[0];UI.cupId=mine&&mine.id;}
 const cup=cupById(UI.cupId);let h=`<div class="chips" style="margin-bottom:8px">${L.map(c=>`<button class="chip ${c.id===UI.cupId?'on':''}" onclick="UI.cupId='${c.id}';render()">${c.ic} ${esc(c.n)}</button>`).join('')}</div>`;
 if(!cup)return h+'<div class="empty">V této sezóně se poháry nehrají.</div>';
 const inC=cup.teams.includes(S.clubId);
 h+=`<div class="card"><h3>${cup.ic} ${esc(cup.n)} ${seasonLabel(S.season)}</h3><div class="small">${cup.q?`Kvalifikační dvojzápasy (${cup.rounds[0].ties.length}). Vítězové postupují do základních skupin soutěže ${esc(cupById(cup.q)?cupById(cup.q).n:'')}.`:cup.qPend?`Do skupin jde zatím ${cup.teams.length} týmů, dalších ${cupById(cup.id+'q')?cupById(cup.id+'q').rounds[0].ties.length:0} přibude z kvalifikace. Los skupin proběhne po kvalifikaci.`:cup.id==='dom'?`Vyřazovací pohár všech klubů z ligových soutěží (${cup.teams.length}). Hraje se na jeden zápas, nižší soutěž hraje doma, při remíze rozhodnou penalty. Vítěz získá místo v evropské soutěži.`:cup.id==='po'?'Baráž mezi týmy nad sestupovou čarou a týmy z nižší soutěže. Hraje se na dva zápasy.':`${cup.teams.length} týmů, ${cup.G} skupin po čtyřech. Dva nejlepší ze skupiny postupují do vyřazovací fáze (dvojzápasy, finále na jeden zápas).`}</div>
 <div class="small mut" style="margin-top:6px">${inC?'Tvůj tým v soutěži hraje. ':cup.kind==='grp'?'Tvůj tým se do této soutěže nekvalifikoval. ':''}${cupNextText(cup)}</div></div>`;
 for(let i=cup.rounds.length-1;i>=0;i--){const R=cup.rounds[i];const mine=R.ties.filter(t=>t.a===S.clubId||t.b===S.clubId);const rest=R.ties.filter(t=>!mine.includes(t));const lim=UI.cupAll?999:12;
  h+=`<div class="card" style="padding:8px 10px"><h3>${esc(R.nm)}${R.byes&&R.byes.length?` <span class="tiny mut">· ${R.byes.length} týmů postupuje bez boje</span>`:''}</h3>${mine.concat(rest.slice(0,lim)).map(tieRow).join('')}${rest.length>lim?`<button class="btn ghost w100" style="margin-top:6px" onclick="UI.cupAll=1;render()">Zobrazit všech ${R.ties.length} dvojic</button>`:''}</div>`;}
 if(cup.kind==='grp'){const gi=cup.groups.findIndex(g=>g.cl.includes(S.clubId));const ord=cup.groups.map((g,i)=>i).sort((a,b)=>(a===gi?-1:0)-(b===gi?-1:0));
  if(gi>=0){const g=cup.groups[gi];h+=`<div class="card" style="padding:6px 10px"><h3>Zápasy tvé skupiny</h3>${g.fix.map((md,k)=>md.map(([x,y])=>{const r=(g.res[k]||[]).find(z=>z[0]===x&&z[1]===y);const me=x===S.clubId||y===S.clubId;return `<div class="fx ${me?'me':''}" style="cursor:default"><span class="tiny mut" style="min-width:18px">${k+1}.</span><span class="t r">${esc(CL(x).n)}</span><span class="sc">${r?r[2]+':'+r[3]:'–:–'}</span><span class="t">${esc(CL(y).n)}</span></div>`;}).join('')).join('')}</div>`;}
  h+=ord.map(i=>grpTable(cup.groups[i],i,cup)).join('');}
 if(!cup.rounds.length&&cup.kind==='ko')h+='<div class="empty">Los prvního kola proběhne těsně před zápasy.</div>';
 return h;}
function renderWorld(){const opts=FM_CAT.leagues.filter(l=>S.W.lg[l.code]);if(!UI.wCode||!S.W.lg[UI.wCode])UI.wCode=(opts.find(l=>l.code==='ENG1')||opts[0]).code;const code=UI.wCode;const L=S.W.lg[code];const li=leagueInfo(code);
 const groups={};opts.forEach(l=>{(groups[l.country]=groups[l.country]||[]).push(l);});
 let h=`<div class="card"><h3>🌍 Ligy ve světě</h3><select onchange="UI.wCode=this.value;render()">${Object.entries(groups).map(([c,ls])=>`<optgroup label="${esc(c)}">${ls.map(l=>`<option value="${l.code}" ${l.code===code?'selected':''}>${esc(c)} – ${esc(l.name)}</option>`).join('')}</optgroup>`).join('')}</select>
 <div class="tiny mut" style="margin-top:6px">Ostatní země se hrají souběžně s tvou ligou (zjednodušená simulace podle síly týmů). Odehráno ${L.r} z ${wFix(code).length} kol.${S.W.champ[code]?' Loňský mistr: '+esc(CL(S.W.champ[code]).n)+'.':''}</div></div>`;
 const t=wSorted(code);const n=t.length;const lgs=countryLeagues(li.cc).filter(l=>S.W.lg[l.code]);const idx=lgs.findIndex(l=>l.code===code);const upN=idx>0?(lgs[idx-1].down||0)+(lgs[idx-1].po||0):0;const dn=idx<lgs.length-1?(li.down||0)+(li.po||0):0;
 const zn=zoneN(code);let lz=null,zi=0;const upZ=zn?Math.ceil(upN/zn):upN;
 h+=`<div class="card" style="padding:8px 8px"><table class="tbl"><tr><th>#</th><th class="l">Klub</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>B</th></tr>${t.map((k,i)=>{const x=L.t[k];const c=CL(k);let gh='';if(zn&&L.z&&L.z[k]!==lz){lz=L.z[k];zi=0;gh=`<tr class="gh"><td colspan="8">${esc(grpName(code,lz))}</td></tr>`;}zi++;const ps=zn?zi:i+1;return gh+`<tr class="${ps<=upZ?'up':''} ${!zn&&i>=n-dn?'dn':''}" style="cursor:default"><td>${ps}</td><td class="nm"><span class="row" style="gap:6px">${badge(c,'sm')}<span style="overflow:hidden;text-overflow:ellipsis;max-width:118px">${esc(c.n)}</span></span></td><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3]}</td><td>${x[4]}:${x[5]}</td><td class="b">${x[6]}</td></tr>`;}).join('')}</table></div>`;
 const sc=Object.entries(L.sc||{}).sort((a,b)=>b[1]-a[1]).slice(0,8);if(sc.length)h+=`<div class="card"><h3>⚽ Střelci – hvězdy týmů</h3>${sc.map(([key,g],i)=>{const [k,j]=key.split('|');const r=wRow(k);const c=CL(k);return `<div class="row small" style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span class="mut" style="width:18px">${i+1}.</span>${badge(c,'sm')}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis"><b>${esc(r[6][+j])}</b> <span class="mut">· ${esc(c.n)}</span></span><b>${g}</b></div>`;}).join('')}<div class="tiny mut" style="margin-top:6px">Zjednodušená simulace: sledují se jen dvě největší hvězdy každého týmu.</div></div>`;
 return h;}
// ----- sázky -----
function renderBets(){const lim=betLimitLeft();const net=S.betStats.won-S.betStats.st;
 let h=`<div class="grid3" style="margin-bottom:10px"><div class="tile"><div class="k">Osobní konto</div><div class="v gold">${fmtMoney(S.wallet)}</div></div><div class="tile"><div class="k">Limit na kolo</div><div class="v">${fmtMoney(lim)}</div></div><div class="tile"><div class="k">Bilance</div><div class="v ${net>=0?'good':'bad'}">${net>=0?'+':''}${fmtMoney(net)}</div></div></div>
 <div class="small mut" style="margin:-2px 2px 10px">Sázíš z vlastních peněz trenéra (plat ${fmtMoney(S.salary||200)} za kolo), ne z peněz klubu. Na vlastní zápasy se dá sázet jen živě během utkání a komise to sleduje. Všechno jsou jen herní peníze.</div>`;
 const sl=S.slip||[];const bt=UI.betTab||'offer';const nOpen=S.bets.filter(b=>b.st==='open').length;
 h+=`<div class="seg" style="margin-bottom:10px"><button class="${bt==='offer'?'on':''}" onclick="UI.betTab='offer';render()">Nabídka${sl.length?' ('+sl.length+')':''}</button><button class="${bt==='my'?'on':''}" onclick="UI.betTab='my';render()">Moje sázky${nOpen?' ('+nOpen+')':''}</button><button class="${bt==='stat'?'on':''}" onclick="UI.betTab='stat';render()">Statistiky</button><button class="${bt==='lb'?'on':''}" onclick="UI.betTab='lb';render()">Žebříček</button></div>`;
 if(bt==='stat')return h+betStatsHtml();if(bt==='lb')return h+lbHtml();if(bt==='offer'&&typeof tipHtml==='function')h+=tipHtml();
 if(bt==='offer'&&sl.length){const mode=UI.betMode||(sl.length>1?'ako':'single');const st=UI.betStake||200;const tot=mode==='single'?st*sl.length:st;const win=mode==='single'?sl.reduce((s,x)=>s+st*x.o,0):st*slipOdds();
  h+=`<div class="card" id="slip"><h3>🧾 Sázenka (${sl.length})<span class="sp"></span><button class="tiny cy" style="min-height:44px" onclick="S.slip=[];saveGame();render()">Vyprázdnit</button></h3>${sl.map((x,i)=>`<div class="row small" style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)"><div style="flex:1;min-width:0"><b>${esc(midTitle(x.mid))}</b><div class="tiny mut">${MK_LBL[x.mk]}</div></div><b class="gold">${czOdd(x.o)}</b><button class="btn ghost sm" style="min-width:44px" onclick="S.slip.splice(${i},1);saveGame();render()" aria-label="Odebrat">✕</button></div>`).join('')}
  ${sl.length>1?`<div class="seg" style="margin:10px 0 6px"><button class="${mode==='ako'?'on':''}" onclick="UI.betMode='ako';render()">AKO (kurz ${czOdd(slipOdds())})</button><button class="${mode==='single'?'on':''}" onclick="UI.betMode='single';render()">Jednotlivě</button></div>`:''}
  <div class="row" style="gap:6px;margin-top:8px"><input id="bstake" type="number" inputmode="numeric" min="10" step="10" value="${st}" style="flex:1" onchange="UI.betStake=Math.max(10,Math.round(+this.value||0));render()"><span class="small mut">€${mode==='single'&&sl.length>1?' / tip':''}</span></div>
  <div class="chips" style="margin-top:6px">${[100,500,1000,5000].map(v=>`<button class="chip" onclick="UI.betStake=${v};render()">${fmtMoney(v)}</button>`).join('')}</div>
  <div class="row small" style="margin:8px 0"><span>Vklad celkem <b>${fmtMoney(tot)}</b></span><span class="sp"></span><span>Možná výhra <b class="gold">${fmtMoney(Math.round(win))}</b></span></div>
  <button class="btn big gold" onclick="const r=placeBet(UI.betStake||200,'${mode}');toast(r);render()">Vsadit ${fmtMoney(tot)}</button></div>`;}
 if(bt==='offer'){const gs=(typeof v14OwnGroup==='function'?v14OwnGroup():[]).concat(betGroups());const wl=FM_CAT.leagues.filter(l=>S.W&&S.W.lg[l.code]);
 h+=`<div class="card"><h3>Zahraniční liga v nabídce</h3><select onchange="UI.betW=this.value;render()">${wl.map(l=>`<option value="${l.code}" ${l.code===(UI.betW||'ENG1')?'selected':''}>${esc(l.country)} – ${esc(l.name)}</option>`).join('')}</select></div>`;
 if(!gs.length)h+='<div class="card"><div class="empty">Teď nejsou v nabídce žádné zápasy.</div></div>';
 gs.forEach(g=>{h+=`<div class="card" style="padding:8px 10px"><h3>${esc(g.name)}</h3>${g.ms.map(m=>{const o=matchOdds(m.h,m.a,m.mid);const inS=k=>sl.some(x=>x.mid===m.mid&&x.mk===k);const open=UI.betOpen===m.mid;
  const b=k=>`<button class="odd ${inS(k)?'on':''}" onclick="toast(addToSlip('${m.mid}','${k}'));saveGame();render()"><small>${MK_SHORT[k]}</small><b>${czOdd(o[k])}${typeof v14Arr==='function'?v14Arr(m.mid,k):''}</b></button>`;
  return `<div class="bm"><div class="row small" style="gap:6px;margin-bottom:6px">${badge(CL(m.h),'sm')}<b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(CL(m.h).n)} – ${esc(CL(m.a).n)}</b>${badge(CL(m.a),'sm')}</div><div class="odds">${b('1')}${b('X')}${b('2')}<button class="odd more" onclick="UI.betOpen=${open?'null':`'${m.mid}'`};render()"><small>další</small><b>${open?'▲':'▼'}</b></button></div>${open?(typeof v14MktHtml==='function'?v14MktHtml(m,b,o):`<div class="odds" style="margin-top:6px">${b('o25')}${b('u25')}${b('gg')}${b('ng')}</div>`):''}${typeof volMini==='function'?volMini(m.h,m.a,m.mid):''}${typeof v14HistBtn==='function'?v14HistBtn(m.mid):''}</div>`;}).join('')}</div>`;});
 return h;}
 const open=S.bets.filter(b=>b.st==='open'),done=S.bets.filter(b=>b.st!=='open').slice(0,UI.betAll?80:12);
 const bRow=b=>`<div class="betrow ${b.st}"><div class="row small"><b>${b.legs.length>1?'AKO '+b.legs.length+' tipů':esc(midTitle(b.legs[0].mid))}</b><span class="sp"></span><span class="tag ${b.st==='won'?'g':b.st==='lost'?'r':''}">${{open:'čeká',won:'výhra',lost:'prohra',void:'vráceno'}[b.st]}</span></div>
  ${b.legs.map(l=>`<div class="tiny ${l.st==='won'?'good':l.st==='lost'?'bad':'mut'}">${b.legs.length>1?esc(midTitle(l.mid))+' · ':''}${MK_LBL[l.mk]} @ ${czOdd(l.o)}${l.res?' · '+esc(l.res):''}${typeof v14Clv==='function'?v14Clv(l):''}</div>`).join('')}
  <div class="tiny mut">Vklad ${fmtMoney(b.stake)} · kurz ${czOdd(b.o)}${b.st==='won'?' · výhra <b class="good">'+fmtMoney(b.pay)+'</b>':b.st==='void'?' · vráceno '+fmtMoney(b.pay):b.st==='open'?' · možná výhra '+fmtMoney(Math.round(b.stake*b.o)):''}</div></div>`;
 h+=`<div class="card"><h3>Moje sázky</h3>${open.length?open.map(bRow).join(''):'<div class="empty">Žádné otevřené sázky.</div>'}${done.length?'<div class="small mut" style="margin:10px 0 4px">Vyhodnocené</div>'+done.map(bRow).join(''):''}${!UI.betAll&&S.bets.filter(b=>b.st!=='open').length>12?'<button class="btn ghost w100" onclick="UI.betAll=1;render()">Zobrazit starší</button>':''}
 <div class="tiny mut" style="margin-top:8px">Celkem vsazeno ${fmtMoney(S.betStats.st)} · vyplaceno ${fmtMoney(S.betStats.won)} · ${S.betStats.n} sázek, ${S.betStats.nw} výherních</div></div>`;
 return h;}
function betStatsHtml(){const B=S.betStats;const sett=S.bets.filter(b=>b.st==='won'||b.st==='lost').length;const H=S.betHist||{};const mk=B.mk||{};
 const pct=(a,b)=>b?Math.round(a/b*100)+' %':'–';const net=B.won-B.st;
 let h=`<div class="card"><h3>📊 Celkový přehled</h3><div class="grid2" style="gap:8px">
 <div class="tile"><div class="k">Sázek celkem</div><div class="v">${B.n}</div></div><div class="tile"><div class="k">Výherních</div><div class="v">${B.nw} (${pct(B.nw,B.n)})</div></div>
 <div class="tile"><div class="k">Vsazeno</div><div class="v">${fmtMoney(B.st)}</div></div><div class="tile"><div class="k">Vyplaceno</div><div class="v">${fmtMoney(B.won)}</div></div>
 <div class="tile"><div class="k">Bilance</div><div class="v ${net>=0?'good':'bad'}">${net>=0?'+':''}${fmtMoney(net)}</div></div><div class="tile"><div class="k">Nejvyšší výhra</div><div class="v gold">${B.best?fmtMoney(B.best):'–'}</div>${B.bestO?`<div class="tiny mut">kurz ${czOdd(B.bestO)}</div>`:''}</div></div></div>`;
 const MN={'1x2':'Výsledek zápasu (1/X/2)',goly:'Počet gólů (více/méně 2,5)',gg:'Oba týmy dají gól'};
 h+=`<div class="card"><h3>🎯 Úspěšnost tipů podle typu</h3>${Object.keys(MN).map(k=>{const a=mk[k]||[0,0];const p=a[0]?a[1]/a[0]*100:0;return `<div style="padding:6px 0"><div class="row small"><span>${MN[k]}</span><span class="sp"></span><b>${a[1]}/${a[0]}</b><span class="mut" style="min-width:48px;text-align:right">${pct(a[1],a[0])}</span></div><div class="bar" style="margin-top:4px"><i style="width:${p}%"></i></div></div>`;}).join('')}<div class="tiny mut" style="margin-top:6px">Počítají se jednotlivé tipy včetně tipů v AKO. Zrušené zápasy se nezapočítávají.</div></div>`;
 const ss=Object.keys(H).sort((a,b)=>b-a);
 h+=`<div class="card"><h3>📅 Podle sezón</h3>${ss.length?ss.map(se=>{const x=H[se];const n=x.won-x.st;return `<div class="row small" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)"><b style="min-width:62px">${seasonLabel(+se)}</b><span class="mut">${x.n} sázek · ${x.nw} výher</span><span class="sp"></span><b class="${n>=0?'good':'bad'}">${n>=0?'+':''}${fmtMoney(n)}</b></div>`;}).join(''):'<div class="empty">Zatím žádné sázky.</div>'}</div>`;
 return h;}
// ----- karta poháru na přehledu -----
function cupHomeCard(){if(!S.cups||!S.cups.list.length)return '';const mine=S.cups.list.filter(c=>c.teams.includes(S.clubId));if(!mine.length)return '';
 return `<div class="card"><h3>🏆 Poháry</h3>${mine.map(c=>{const al=cupAlive(c);
  return `<div class="row small" style="padding:6px 0;min-height:44px;cursor:pointer" onclick="UI.lgMode='cup';UI.cupId='${c.id}';go('league')"><span>${c.ic}</span><b style="flex:1">${esc(c.n)}</b><span class="${c.winner===S.clubId?'gold':al?'good':'mut'}">${c.winner===S.clubId?'vítěz 🏆':al?'ve hře':'vypadli jste'}</span><span class="mut">›</span></div>`;}).join('')}</div>`;}
function cupAlive(c){const me=S.clubId;if(c.winner)return c.winner===me;let last=null,bye=false;c.rounds.forEach(R=>{if(R.ties.some(t=>t.a===me||t.b===me)){last=R;bye=false;}else if((R.byes||[]).includes(me)){bye=true;last=null;}});
 if(bye)return true;if(last){const t=last.ties.find(x=>x.a===me||x.b===me);return !t.w||t.w===me;}
 if(c.kind==='grp'){if(c.rounds.length)return false;const md=(S.cal||[]).find(e=>e.c===c.id&&e.k==='md'&&e.i===5);if(md&&md.done){const g=c.groups.find(g=>g.cl.includes(me));return !!g&&grpSorted(g).indexOf(me)<2;}return true;}return !c.rounds.length||c.alive.includes(me);}

// ===================== PŘED ZÁPASEM / ŽIVÝ ZÁPAS =====================
let MS=null;
async function preMatch(){const F=nextMatch();if(!F)return;const h=F.h,a=F.a;
 if(!S.clubs[h]||!S.clubs[a]){modal('<div class="c" style="padding:20px 0"><div class="sp2" style="margin:0 auto 12px"></div><div class="small mut">Načítám soupisku soupeře…</div></div>',{noClose:true});
  try{await ensureClub(S.clubs[h]?a:h);}catch(e){closeModal();toast(e.message||'Soupisku soupeře se nepodařilo načíst.');return;}}
 if(!UI.F||UI.F.h!==F.h||UI.F.a!==F.a){UI.pressKey={};UI.pressDone={};UI.bribe=0;if(!(UI.fix&&UI.fix.forced))UI.fix=null;UI.fxd=null;}UI.F=F;const H=S.clubs[h],A=S.clubs[a];const wx=matchWeather(h,F);const sh=teamStrength(h),sa=teamStrength(a);const [xh,xa]=xgPair(sh,sa);
 const pw=winProb(xh,xa);const opp=h===S.clubId?a:h;const op=clubPlayers(opp).filter(available).sort((x,y)=>y.ovr-x.ovr).slice(0,3);
 const row=(k,x,y)=>`<div class="stt"><b>${Math.round(x)}</b><span class="k">${k}</span><b class="r">${Math.round(y)}</b><div class="dbar"><i style="width:${x/(x+y)*100}%"></i><i style="width:${y/(x+y)*100}%"></i></div></div>`;
 const koT=F.ko?(F.ko.legs===2&&F.ko.leg===1?`<div class="small c gold" style="margin-top:4px">První zápas ${F.ko.agg[1]}:${F.ko.agg[0]} · rozhoduje celkové skóre, při rovnosti prodloužení a penalty</div>`:F.ko.decide&&F.ko.legs===1?`<div class="small c gold" style="margin-top:4px">Vyřazovací zápas – při remíze prodloužení, pak penalty</div>`:`<div class="small c mut" style="margin-top:4px">První zápas dvojzápasu</div>`):'';
 modal(`<div class="small mut c">${esc(F.title)}</div>${koT}<div class="vs" style="margin:8px 0"><div class="tm">${badge(H,'lg')}<span>${esc(H.n)}</span></div><div class="mid">VS</div><div class="tm">${badge(A,'lg')}<span>${esc(A.n)}</span></div></div>
 <div class="card" style="padding:10px 12px">${row('Útok',sh.att,sa.att)}${row('Záloha',sh.mid,sa.mid)}${row('Obrana',sh.def,sa.def)}<div class="row small" style="justify-content:space-between;margin-top:6px"><span>Výhra domácích ${Math.round(pw[0]*100)} %</span><span class="mut">remíza ${Math.round(pw[1]*100)} %</span><span>hostů ${Math.round(pw[2]*100)} %</span></div></div>
 <div class="card" style="padding:10px 12px"><h3>Hlídat u soupeře</h3>${op.map(p=>`<div class="row small" style="padding:3px 0">${posB(p.pos)}<span style="flex:1">${esc(p.n)}</span>${ovrB(p.ovr)}</div>`).join('')}</div>
 <div class="card" style="padding:8px 12px"><div class="row small" style="gap:10px;flex-wrap:wrap"><span>Předpověď: ${wxText(wx)}</span><span class="sp"></span><span>${fansIc()} Fanoušci: <b class="${fansCls()}">${fansLabel()}</b></span></div>${(S.riv&&S.riv[opp]>=3)?'<div class="tiny gold" style="margin-top:4px">🔥 Vyhrocený souboj s rivalem – soupeř bude extra motivovaný.</div>':''}</div>
 ${v4PreHtml(F)}${pressHtml('pre',F)}
 ${lineupIssues()}
 <button class="btn ghost w100" style="margin-bottom:8px" onclick="bribeSheet()">🤫 Obálka pro rozhodčího${UI.bribe?' · '+BRIBE[UI.bribe][1].toLowerCase()+' ✓':''}</button>${typeof fixSheet==='function'&&!(S.fix&&S.fix.ban>0)?`<button class="btn ghost w100" style="margin-bottom:8px" onclick="UI.fxd=null;fixSheet()">🕴️ Prodat zápas${UI.fix?' · domluveno ✓':''}</button>`:''}
 <div class="mstick"><div class="grid2"><button class="btn ghost" onclick="closeModal();go('tac')">📋 Sestava</button><button class="btn ghost" onclick="quickPlay()">⏩ Jen výsledek</button></div><div style="height:8px"></div><button class="btn big gold" id="pmgo" onclick="startLive()">▶ Hrát zápas</button></div>`);}
function winProb(xh,xa){let ph=0,pd=0,pa=0;const pf=(l,k)=>{let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f;};for(let i=0;i<9;i++)for(let j=0;j<9;j++){const p=pf(xh,i)*pf(xa,j);if(i>j)ph+=p;else if(i===j)pd+=p;else pa+=p;}const t=ph+pd+pa;return [ph/t,pd/t,pa/t];}
function quickPlay(){closeModal();const F=UI.F||nextMatch();const M=createMatch(F.h,F.a,F);bribeApply(M);simToEnd(M);endLive(M,true);}
function startLive(){closeModal();const F=UI.F||nextMatch();const M=createMatch(F.h,F.a,F);bribeApply(M);crowdStart(M);MS={M,tab:'kom',paused:false,timer:null,shown:0};if(typeof initBetChat==='function')initBetChat(M);if(typeof pmStart==='function')pmStart(M);
 const w=document.createElement('div');w.className='mv-wrap';w.id='mv';document.body.appendChild(w);document.body.style.overflow='hidden';drawLive(true);whistle();schedule();}
function speedMs(){return [0,650,300,110][S.settings.speed||2];}
function minLbl(M){const m=M.min;if(M.half===1&&m>45)return '45+'+(m-45);if(M.half===2&&m>90)return '90+'+(m-90);if(M.half===3&&m>105)return '105+'+(m-105);if(M.half===4&&m>120)return '120+'+(m-120);return m;}
function schedule(){clearTimeout(MS&&MS.timer);if(!MS||MS.paused||MS.M.ended)return;MS.timer=setTimeout(tick,speedMs());}
function tick(){if(!MS||!document.getElementById('mv'))return;const M=MS.M;const ev=stepMinute(M);if(typeof chatOnEvents==='function')chatOnEvents(M,ev);crowdEvents(M,ev);if(typeof pmTick==='function')pmTick(M);
 if(ev.some(e=>e.t==='goal')){goalSound();const sc=$('#mvscore');if(sc){sc.classList.remove('pop');void sc.offsetWidth;sc.classList.add('pop');}}
 if(ev.some(e=>e.t==='ht')){MS.paused=true;whistle();updLive();toast('Poločas – uprav taktiku nebo pokračuj.');if(typeof htTalk==='function')htTalk(M);return;}
 if(ev.some(e=>e.t==='et'&&e.m===90)){MS.paused=true;whistle();updLive();toast('Prodloužení – můžeš ještě jednou střídat navíc.');return;}
 if(M.ended){whistle();updLive();setTimeout(()=>endLive(M),600);return;}
 if(M.needSub){updLive();toast('Zranění! Musíš vystřídat.');subSheet(M.needSub.slot,true);return;}
 updLive();schedule();}
function drawLive(){const M=MS.M;const H=S.clubs[M.h.cid],A=S.clubs[M.a.cid];const w=$('#mv');
 w.innerHTML=`<div class="mview"><div class="mtop"><div class="sbd"><div class="tm">${badge(H)}<span>${esc(H.n)}</span></div><div class="score" id="mvscore">0:0</div><div class="tm a">${badge(A)}<span>${esc(A.n)}</span></div></div><div class="mmin" id="mvmin">0'</div><div class="tiny mut c" id="mvwx">${M.wx?wxText(M.wx):''}</div><div class="magg" id="mvagg">${M.F&&M.F.type==='cup'?esc(M.F.title):''}</div><div class="mprog"><i id="mvprog" style="width:0"></i></div></div>
 <div class="mtabs"><div class="seg">${[['kom','Komentář'],['stat','Statistiky'],['sest','Sestavy']].concat([['chat','Sázky']]).map(([k,l])=>`<button data-t="${k}" class="${MS.tab===k?'on':''}" onclick="MS.tab='${k}';updLive(true)">${l}</button>`).join('')}</div></div>
 <div class="mbody" id="mvbody"></div><div class="mfoot" id="mvfoot"></div></div>`;updLive(true);}
function evHtml(e,M){const cls=e.t==='goal'?'goal':e.t==='red'?'red':(e.t==='ht'||e.t==='ft'||e.t==='ko'||e.t==='pso'||e.t==='et')?'big':'';const col=e.s==null?'transparent':(e.s===0?S.clubs[M.h.cid].c[0]:S.clubs[M.a.cid].c[0]);
 return `<div class="ev ${cls}"><span class="sd" style="background:${col}"></span><span class="m">${e.t==='ko'?'':e.m+"'"}</span><span class="tx">${esc(e.tx)}${e.t==='goal'?` <b class="gold">${e.sc[0]}:${e.sc[1]}</b>`:''}</span></div>`;}
function updLive(full){if(!MS)return;const M=MS.M;const b=$('#mvbody');if(!b)return;
 $('#mvscore').textContent=M.score[0]+':'+M.score[1];$('#mvmin').textContent=M.ended?'Konec':M.ht&&MS.paused&&M.min===45?'Poločas':minLbl(M)+"'";$('#mvprog').style.width=Math.min(100,M.min/(M.et?120:90)*100)+'%';
 if(M.ko){const ag=$('#mvagg');let t=M.F.title;if(M.ko.legs===2&&M.ko.leg===1)t+=` · celkem ${M.score[0]+M.ko.agg[0]}:${M.score[1]+M.ko.agg[1]}`;if(M.et&&!M.ended)t+=' · prodloužení';if(M.pen)t+=` · penalty ${M.pen[0]}:${M.pen[1]}`;if(ag)ag.textContent=t;}
 document.querySelectorAll('#mv .mtabs button').forEach(x=>x.classList.toggle('on',x.dataset.t===MS.tab));
 if(MS.tab==='kom'){const evs=M.ev.slice().reverse();b.innerHTML=evs.map(e=>evHtml(e,M)).join('');}
 else if(MS.tab==='stat')b.innerHTML=statsHtml(M);else if(MS.tab==='chat')b.innerHTML=chatHtml(M);else b.innerHTML=lineupsHtml(M);
 const f=$('#mvfoot');const us=M.h.user?M.h:M.a;
 f.innerHTML=M.ended?`<button class="btn gold" onclick="endLive(MS.M)">Pokračovat</button>`:`<button class="btn ${MS.paused?'gold':'ghost'}" onclick="togglePause()">${MS.paused?'▶ Hrát':'⏸ Pauza'}</button><button class="btn ghost spd" onclick="cycleSpeed()">${['','1×','2×','4×'][S.settings.speed||2]}</button><button class="btn ghost" onclick="subSheet()">🔄 ${us.subs}/${us.maxSubs}</button><button class="btn ghost" onclick="liveTac()">📋</button><button class="btn ghost" onclick="finishNow()">⏩ Dohrát</button>`;}
function statsHtml(M){const s=M.stats;const tot=s[0].pos+s[1].pos||1;const ph=Math.round(s[0].pos/tot*100);
 const row=(k,x,y,fmt)=>{const a=finite(x),c=finite(y);return `<div class="stt"><b>${fmt?fmt(a):a}</b><span class="k">${k}</span><b class="r">${fmt?fmt(c):c}</b><div class="dbar"><i style="width:${a+c?a/(a+c)*100:50}%"></i><i style="width:${a+c?c/(a+c)*100:50}%"></i></div></div>`;};
 const gs=M.ev.filter(e=>e.t==='goal');
 return `<div class="card" style="padding:10px 12px">${row('Držení míče (%)',ph,100-ph)}${row('Střely',s[0].sh,s[1].sh)}${row('Na branku',s[0].sot,s[1].sot)}${row('Očekávané góly',s[0].xg,s[1].xg,v=>v.toFixed(1).replace('.',','))}${row('Rohy',s[0].cor,s[1].cor)}${row('Fauly',s[0].fou,s[1].fou)}${row('Žluté karty',s[0].yc,s[1].yc)}${row('Červené karty',s[0].rc,s[1].rc)}${row('Ofsajdy',s[0].off,s[1].off)}${row('Zákroky brankáře',s[0].sav,s[1].sav)}</div>
 ${gs.length?`<div class="card" style="padding:10px 12px"><h3>Branky</h3>${gs.map(e=>`<div class="row small" style="padding:3px 0;${e.s===1?'flex-direction:row-reverse;text-align:right':''}"><b class="mut">${e.m}'</b><span>⚽ ${esc(nm(e.p))}${e.pen?' (pen.)':''}${e.og?' (vlastní)':''}</span></div>`).join('')}</div>`:''}`;}
function rtB(v){v=finite(v);return `<span class="rt ${v>=7.5?'hi':v<5.8?'lo':''}">${v.toFixed(1).replace('.',',')}</span>`;}
function lineupsHtml(M){const side=(sd)=>{const c=S.clubs[sd.cid];const on=sd.xi.map((id,i)=>[id,sd.slots[i]]).filter(x=>x[0]);const off=Object.keys(M.played).filter(id=>P(id)&&P(id).cl===sd.cid&&!sd.xi.includes(id));
 return `<div class="card lineup" style="padding:8px 10px"><h3>${badge(c,'sm')} ${esc(c.n)} <span class="sp"></span><span class="tiny">${sd.form}</span></h3>${on.map(([id,sl])=>{const p=P(id);return `<div class="lr">${posB(sl)}<span class="n">${esc(p.n)}${M.yc&&M.yc[id]?' 🟨':''}</span><span class="tiny mut">${Math.round(p.cond)} %</span>${rtB(M.rt[id])}</div>`;}).join('')}
 ${off.length?`<div class="tiny mut" style="margin-top:6px">Mimo hřiště: ${off.map(id=>esc(nm(id))).join(', ')}</div>`:''}<div class="tiny mut" style="margin-top:4px">Lavička: ${sd.bench.map(id=>esc(nm(id))).join(', ')||'—'}</div></div>`;};
 const us=M.h.user?M.h:M.a,th=M.h.user?M.a:M.h;return side(us)+side(th);}
function togglePause(){if(!MS)return;MS.paused=!MS.paused;if(!MS.paused){MS.M.ht=false;}updLive();schedule();getAC();}
function cycleSpeed(){S.settings.speed=(S.settings.speed%3)+1;updLive();if(!MS.paused){schedule();}}
function finishNow(){if(!MS)return;const M=MS.M;clearTimeout(MS.timer);if(M.needSub){M.needSub=null;}M.autoUser=true;simToEnd(M);updLive();setTimeout(()=>endLive(M),200);}
function userSide(M){return M.h.user?0:1;}
function subSheet(slot,auto){if(!MS)return;const M=MS.M;const i=userSide(M);const sd=M.sides[i];if(M.ended)return;
 if(!document.getElementById('mbg')){MS.resumeAfter=auto?true:!MS.paused;}
 MS.paused=true;clearTimeout(MS.timer);
 if(sd.subs>=sd.maxSubs&&!M.needSub){toast('Už jsi vystřídal pětkrát.');MS.paused=!MS.resumeAfter;schedule();return;}
 if(slot!=null)MS.subOut=slot;else if(MS.subOut==null&&M.needSub)MS.subOut=M.needSub.slot;
 const html=`<h2>Střídání (${sd.subs}/${sd.maxSubs})</h2>${M.needSub?'<div class="small warn" style="margin-bottom:8px">🚑 Zraněného hráče musíš nahradit.</div>':''}<div class="small mut" style="margin-bottom:6px">1. Kdo jde ze hřiště</div>${sd.xi.map((id,k)=>{const p=P(id);return `<div class="pl-row" onclick="subSheet(${k})" style="${MS.subOut===k?'background:rgba(255,211,77,.15);border-radius:10px':''}">${posB(sd.slots[k])}<div class="nm"><b>${p?esc(p.n):'— volné místo —'}</b><small>${p?'kondice '+Math.round(p.cond)+' % · známka '+finite(M.rt[id]).toFixed(1).replace('.',','):'hráč musel odstoupit'}</small></div>${MS.subOut===k?'<span class="gold b">✓</span>':''}</div>`;}).join('')}
 <div class="small mut" style="margin:10px 0 6px">2. Kdo přichází</div>${sd.bench.map(id=>{const p=P(id);const sl=MS.subOut!=null?sd.slots[MS.subOut]:null;return `<div class="pl-row" onclick="confirmSub('${id}')">${posB(p.pos)}<div class="nm"><b>${esc(p.n)}</b><small>${ageOf(p)} let${sl?' · na této pozici '+Math.round(p.ovr*posFitP(p,sl)):''}</small></div>${ovrB(p.ovr)}</div>`;}).join('')||'<div class="empty">Na lavičce nikdo není.</div>'}
 <div style="height:8px"></div><button class="btn big ghost" onclick="closeSub()">${M.needSub?'Hrát v oslabení':'Hotovo'}</button>`;
 const bg=modal(html,{noClose:true});bg.style.zIndex=120;}
function confirmSub(inId){const M=MS.M;const i=userSide(M);const sd=M.sides[i];if(MS.subOut==null){toast('Nejdřív vyber, kdo půjde ze hřiště.');return;}const k=MS.subOut;const outId=sd.xi[k];
 if(sd.subs>=sd.maxSubs){toast('Už nemůžeš střídat.');return;}
 if(!outId){const bi=sd.bench.indexOf(inId);if(bi<0)return;sd.xi[k]=inId;sd.bench.splice(bi,1);sd.subs++;M.played[inId]={from:M.min,to:null};M.rt[inId]=6;recalc(M);M.ev.push({m:M.min,t:'sub',s:i,tx:`🔄 Střídání – ${sideName(i).toLowerCase()}: na hřiště přichází ${nm(inId)}.`});}
 else{const se=doSub(M,i,outId,inId,false);if(!se)return;if(typeof chUserSub==='function')chUserSub(M,se);}
 M.needSub=null;closeSub();}
function closeSub(){const M=MS.M;M.needSub=null;closeModal();MS.subOut=null;MS.paused=!MS.resumeAfter;updLive();schedule();}
function liveTac(){if(!MS)return;const M=MS.M;const sd=M.sides[userSide(M)];const wp=MS.paused;MS.paused=true;clearTimeout(MS.timer);
 const seg=(title,obj,key)=>`<h3 style="margin-top:10px">${title}</h3><div class="seg">${Object.entries(obj).map(([k,v])=>`<button class="${sd.tac[key]===k?'on':''}" onclick="MS.M.sides[userSide(MS.M)].tac.${key}='${k}';recalc(MS.M);liveTacRefresh()">${v}</button>`).join('')}</div>`;
 const bg=modal(`<h2>Pokyny z lavičky</h2><div id="ltac">${seg('Mentalita',MENT,'ment')}${seg('Presink',PRESS,'press')}${seg('Styl hry',STYLE,'style')}</div><div style="height:12px"></div><button class="btn big" id="ltok">Hotovo</button>`,{noClose:true});bg.style.zIndex=120;
 MS._ltwp=wp;$('#ltok').onclick=()=>{closeModal();MS.paused=MS._ltwp;updLive();schedule();};}
function liveTacRefresh(){const M=MS.M;const sd=M.sides[userSide(M)];const seg=(title,obj,key)=>`<h3 style="margin-top:10px">${title}</h3><div class="seg">${Object.entries(obj).map(([k,v])=>`<button class="${sd.tac[key]===k?'on':''}" onclick="MS.M.sides[userSide(MS.M)].tac.${key}='${k}';recalc(MS.M);liveTacRefresh()">${v}</button>`).join('')}</div>`;$('#ltac').innerHTML=seg('Mentalita',MENT,'ment')+seg('Presink',PRESS,'press')+seg('Styl hry',STYLE,'style');}
function endLive(M,quick){if(MS&&MS.done)return;document.querySelectorAll('.toast').forEach(t=>t.remove());if(MS)MS.done=true;if(MS)clearTimeout(MS.timer);crowdStop();if(typeof pmEnd==='function')pmEnd();const f0=fans();fansAfterMatch(M);v4AfterMatch(M);const fd=Math.round((fans()-f0)*10)/10;
 const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const won=my>th,draw=my===th;
 let koTxt='';if(M.ko&&M.ko.decide){const tm=my+(ui===0?M.ko.agg[0]:M.ko.agg[1]),tt=th+(ui===0?M.ko.agg[1]:M.ko.agg[0]);const adv=tm>tt||(tm===tt&&M.pen&&M.pen[ui]>M.pen[1-ui]);
  koTxt=`<div class="b ${adv?'good':'bad'} c" style="margin-top:6px">${adv?(M.F.cup==='po'?'✅ Baráž zvládnutá!':'✅ Postup dál!'):(M.F.cup==='po'?'❌ Baráž nevyšla':'❌ Konec v soutěži')}${M.ko.legs===2?` · celkem ${tm}:${tt}`:''}${M.et&&!M.pen?' · po prodloužení':''}${M.pen?` · penalty ${M.pen[ui]}:${M.pen[1-ui]}`:''}</div>`;}const opp=S.clubs[M.sides[1-ui].cid];
 const best=motm(M);const bp=P(best);const gs=M.ev.filter(e=>e.t==='goal');
 const mine=Object.keys(M.played).filter(id=>P(id)&&P(id).cl===S.clubId).sort((a,b)=>finite(M.rt[b])-finite(M.rt[a]));
 const bg=modal(`<div class="c"><div style="font-size:42px">${won?'🎉':draw?'🤝':'😞'}</div><h2 style="margin:2px 0;color:${won?'#3ee68a':draw?'#fff':'#ff5d73'}">${won?'VÍTĚZSTVÍ':draw?'REMÍZA':'PROHRA'}</h2>
 <div class="b" style="font-size:22px">${esc(S.clubs[M.h.cid].n)} ${M.score[0]}:${M.score[1]} ${esc(S.clubs[M.a.cid].n)}</div>${M.F&&M.F.type==='cup'?`<div class="small mut">${esc(M.F.title)}</div>`:''}${koTxt}</div>
 ${gs.length?`<div class="card" style="padding:8px 12px;margin-top:10px">${gs.map(e=>`<div class="row small" style="padding:2px 0;${e.s===1?'flex-direction:row-reverse;text-align:right':''}"><b class="mut">${e.m}'</b><span>⚽ ${esc(P(e.p)?P(e.p).n:'')}${e.pen?' (pen.)':''}${e.og?' (vlastní)':''}</span></div>`).join('')}</div>`:''}
 ${bp?`<div class="small c" style="margin:8px 0">⭐ Hráč zápasu: <b>${esc(bp.n)}</b> (${finite(M.rt[best]).toFixed(1).replace('.',',')})</div>`:''}
 <div class="card lineup" style="padding:8px 10px"><h3>Známky tvých hráčů</h3><div class="tiny mut" style="margin:-4px 0 6px">Stupnice 1–10: <b class="good">7,5 a víc</b> výborný · 6,5–7,4 dobrý · 6,0–6,4 průměrný · <b class="bad">pod 6</b> slabý</div>${mine.map(id=>`<div class="lr">${posB(P(id).pos)}<span class="n">${esc(P(id).n)}</span>${rtB(M.rt[id])}</div>`).join('')}</div>
 ${M.h.user?`<div class="small mut c" style="margin-bottom:8px">Návštěva ${fmtNum(M.att)} diváků · vstupné ${fmtMoney(M.gate)}</div>`:''}
 <div class="small c" style="margin-bottom:8px">${fansIc()} Nálada fanoušků: <b class="${fansCls()}">${fansLabel()}</b> <span class="${fd>0?'good':fd<0?'bad':'mut'}">(${fd>0?'+':''}${String(fd).replace('.',',')})</span>${M.wx?` · ${wxText(M.wx)}`:''}</div>
 ${pressHtml('post',null,M)}${v4PostHtml(M)}
 <button class="btn big gold" id="endc">Pokračovat</button>`,{noClose:true});bg.style.zIndex=130;
 $('#endc').onclick=()=>{UI.pressKey={};UI.pressDone={};UI.F=null;closeModal();const w=$('#mv');if(w)w.remove();document.body.style.overflow='';MS=null;
  if(M.h.user)money(M.gate,'gate','Vstupné: '+opp.n);
  const tr=won?'výhrou':draw?'remízou':'porážkou';addNews(won?'✅':draw?'➖':'❌',`${S.clubs[M.h.cid].n} – ${S.clubs[M.a.cid].n} ${M.score[0]}:${M.score[1]}. Zápas skončil ${tr} tvého týmu.${bp&&bp.cl===S.clubId?' Hráčem zápasu byl '+bp.n+'.':''}`);
  if(M.F&&M.F.type==='cup')cupAfter(M);else advanceRound(M.result);};}
function cupAfter(M){const F=M.F;UI.F=null;resolveEvent(F.e,{gh:M.score[0],ga:M.score[1],pen:M.pen||null,et:!!M.et});
 clubPlayers(S.clubId).forEach(p=>{p.cond=clamp(p.cond+10,0,100);});purgeTmp();autoEvents();saveGame();render();window.scrollTo(0,0);if(S.sackNow){sackModal();return;}
 if(seasonOver())setTimeout(()=>toast('Sezóna je u konce!'),300);}
function advanceRound(result){UI.F=null;playRound(result);weekTick();S.round++;splitCheck();wPlayTo();if(S.round>=S.maxRound)makePlayoffs();autoEvents();if(typeof settleBets==='function')settleBets();
 if(S.round<S.maxRound){const L=S.leagues[myClub().lg];const pos=tablePos(S.clubId);if(L.done&&L.done%5===0&&L.newsAt!==L.done){L.newsAt=L.done;addNews('📊',`Po ${L.done}. kole je tvůj tým na ${pos}. místě tabulky.`,1);}}
 if(S.round===Math.floor(S.maxRound/2)-1)addNews('🔔','Otevírá se zimní přestupové okno.');
 if(S.round===4)addNews('🔒','Letní přestupové okno se zavřelo.',1);
 saveGame();render();window.scrollTo(0,0);if(S.sackNow){sackModal();return;}
 if(seasonOver())setTimeout(()=>toast('Odehráno poslední kolo sezóny!'),300);else if(pendingEvent())setTimeout(()=>toast('Čeká tě pohárový zápas!'),300);}
function uiEndSeason(){const rep=endSeason();const me=myClub();
 const moveTxt=rep.myMove>0?`<div class="b good" style="font-size:16px;margin:6px 0">⬆️ Postup do soutěže ${esc(leagueLabel(me.lg))}!</div>`:rep.myMove<0?`<div class="b bad" style="font-size:16px;margin:6px 0">⬇️ Sestup do soutěže ${esc(leagueLabel(me.lg))}</div>`:'';
 const ow=isOwn();const gl=ow?(S.own.goal||rep.exp):rep.exp;const verdict=ow?(rep.pos<=gl-2?'Cíl sezóny jsi výrazně překonal.':rep.pos<=gl?'Cíl sezóny je splněný.':rep.pos<=gl+2?'Cíl sezóny se těsně nepodařilo splnit.':'Výsledky byly hluboko pod cílem sezóny.'):rep.pos<=rep.exp-2?'Vedení je nadšené, výrazně jsi překonal očekávání.':rep.pos<=rep.exp?'Vedení je spokojené, cíl sezóny jsi splnil.':rep.pos<=rep.exp+2?'Vedení je mírně zklamané, cíl jsi těsně nesplnil.':'Vedení je nespokojené, výsledky byly hluboko pod očekáváním.';
 modal(`<div class="c"><div style="font-size:46px">${rep.pos===1?'🏆':rep.myMove>0?'🎉':rep.myMove<0?'😢':'📋'}</div><h2>Sezóna ${seasonLabel(rep.season)}</h2><div class="b" style="font-size:18px">${rep.pos}. místo z ${rep.n}</div><div class="small mut">${rep.pts} bodů · ${rep.w} výher, ${rep.d} remíz, ${rep.l} proher · skóre ${rep.gf}:${rep.ga}</div>${moveTxt}</div>
 <div class="card" style="margin-top:10px;padding:10px 12px"><div class="small">${verdict}</div>${ow?`<div class="small" style="margin-top:6px">Pověst majitele: <b>${ownRepTxt(S.own.rep)}</b> · fanoušci: ${fansLabel()}</div>`:`<div class="small" style="margin-top:6px">Důvěra vedení: <b>${Math.round(rep.trust)} %</b></div>`}<div class="small" style="margin-top:6px">Prémie za umístění: <b class="gold">${fmtMoney(rep.prize)}</b></div>
 ${rep.topScorer?`<div class="small" style="margin-top:6px">Král střelců: <b>${esc(rep.topScorer.n)}</b> (${esc(rep.topScorer.club)}, ${rep.topScorer.g} ${czPlural(rep.topScorer.g,'gól','góly','gólů')})</div>`:''}
 ${rep.mrep!=null&&S.role!=='owner'?`<div class="small" style="margin-top:6px">${isOwn()?'Trenérská reputace':'Tvoje reputace'}: <b>${rep.mrep}</b> (${rep.mrepD>=0?'+':''}${rep.mrepD})</div>`:''}${rep.freeGone&&rep.freeGone.length?`<div class="small" style="margin-top:6px">Odchod po konci smlouvy: ${rep.freeGone.map(esc).join(', ')}</div>`:''}${rep.added&&rep.added.length?`<div class="small" style="margin-top:6px">🆕 Nové soutěže: ${rep.added.map(esc).join(', ')}</div>`:''}
 ${rep.retired.length?`<div class="small" style="margin-top:6px">Konec kariéry: ${rep.retired.map(esc).join(', ')}</div>`:''}
 ${(rep.cups||[]).map(c=>`<div class="small" style="margin-top:6px">${c.ic} ${esc(c.n)}: <b>${esc(c.r)}</b></div>`).join('')}
 ${rep.youth.length?`<div class="small" style="margin-top:6px">Z akademie přicházejí: <b>${rep.youth.map(esc).join(', ')}</b></div>`:''}</div>
 ${rep.fired?`<div class="card" style="border-color:var(--bad)"><b class="bad">Vedení s tebou ukončilo spolupráci.</b><div class="small mut" style="margin-top:4px">Můžeš převzít jiný klub ve stejné zemi.</div></div><button class="btn big red" onclick="closeModal();firedPick()">Vybrat nový klub</button>`:`<button class="btn big gold" onclick="closeModal();render();window.scrollTo(0,0)">Začít sezónu ${seasonLabel(S.season)}</button>`}`,{noClose:true});}
function firedPick(){const ids=Object.keys(S.clubs).filter(id=>id!==S.clubId).sort((a,b)=>S.clubs[a].rep-S.clubs[b].rep);const low=ids.filter(id=>S.clubs[id].rep<=myClub().rep).slice(-8);const opts=(low.length?low:ids.slice(0,8));
 modal(`<h2>Nabídky práce</h2><div class="small mut" style="margin-bottom:8px">O tvé služby mají zájem tyto kluby:</div>${opts.map(id=>{const c=S.clubs[id];return `<button class="lgpick" onclick="takeClub('${id}')">${badge(c)}<span class="t"><b>${esc(c.n)}</b><small>${esc(leagueLabel(c.lg))} · síla ${c.rep}</small></span></button>`;}).join('')}`,{noClose:true});}
function sackModal(){S.sackNow=0;setTimeout(()=>{S.sackWhy=null;},0);modal(`<div class="c"><div style="font-size:46px">🧾</div><h2>Konec v klubu</h2><div class="small">${S.sackWhy||'Po skandálu s rozhodčím'} vedení ztratilo veškerou důvěru a s okamžitou platností tě odvolalo.</div></div><button class="btn big red" style="margin-top:12px" onclick="closeModal();firedPick()">Vybrat nový klub</button>`,{noClose:true});}
function takeClub(id){S.clubId=id;S.tac=defaultTactic(id);S.boardTrust=50;S.offers=[];S.fans=55;S.riv={};addNews('🤝',`${S.manager} převzal klub ${myClub().n}.`);saveGame();closeModal();render();}
// ===================== ULOŽENÍ =====================
function migrateSave(s){if(!s||typeof s!=='object')return s;s.v=s.v||1;
 const D={news:[],inbox:[],offers:[],fin:{log:[]},history:[],training:{focus:'bal',int:2},cohesion:55,boardTrust:60,gone:{},trophies:[],settings:{speed:2,sound:false},nextId:1,seasonLog:[],bets:[],betBank:0,achievements:{},wallet:10000,slip:[],betStats:{st:0,won:0,n:0,nw:0},cal:[],prevRank:null,domW:null};
 for(const k in D)if(s[k]==null)s[k]=JSON.parse(JSON.stringify(D[k]));
 if(!s.settings.speed)s.settings.speed=2;if(s.settings.betLimit==null)s.settings.betLimit=5000;if(s.settings.betChat==null)s.settings.betChat=true;if(!s.cups)s.cups={list:[],poMade:0,legacy:1};if(!Array.isArray(s.bets))s.bets=[];
 for(const code in s.leagues||{}){const L=s.leagues[code];if(L.base==null)L.base=-1;if(L.grp===undefined)L.grp=null;if(!L.code)L.code=code;}if(!s.finSeason)s.finSeason={inc:0,exp:0,gate:0,tv:0,wages:0,tr_in:0,tr_out:0,prize:0};
 for(const id in s.players||{}){const p=s.players[id];if(!p.st)p.st={ap:0,g:0,as:0,yc:0,rc:0,rt:0,cs:0,min:0};if(!p.form)p.form=[];if(!p.car)p.car={ap:0,g:0};if(p.cond==null)p.cond=100;if(p.mor==null)p.mor=70;if(p.inj==null)p.inj=0;if(p.sus==null)p.sus=0;if(p.yc==null)p.yc=0;if(!p.a)p.a=[50,50,50,50,50,50];}
 for(const id in s.clubs||{}){const c=s.clubs[id];if(!c.pl)c.pl=[];if(c.money==null)c.money=0;if(!c.cap)c.cap=5000;if(!c.ticket)c.ticket=10;if(c.tv==null)c.tv=0;if(c.wageBase==null)c.wageBase=c.tv;}
 if(s.tac){const t=s.tac;if(!t.ment)t.ment='bal';if(!t.press)t.press='mid';if(!t.style)t.style='short';if(!t.bench)t.bench=[];if(!FORMS[t.form])t.form='4-4-2';}
 s.v=FM_VER;return s;}
function saveGame(){if(!S)return;try{S.v=FM_VER;if(S.news.length>90)S.news.length=90;const js=JSON.stringify(S,(k,v)=>typeof v==='number'&&v%1!==0?Math.round(v*100)/100:v);
 if(!STORE.set(SAVE_KEY,js)&&!S._warned){S._warned=1;toast('⚠️ Hru nelze uložit do prohlížeče (soukromý režim?). Použij Export.');}}catch(e){console.warn('save',e);}}
function loadGame(){try{const raw=STORE.get(SAVE_KEY);if(!raw)return false;S=migrateSave(JSON.parse(raw));if(!S||!S.clubs||!S.players||!S.clubId||!S.clubs[S.clubId])throw new Error('poškozené uložení');if(!S.tac)S.tac=defaultTactic(S.clubId);purgeTmp();return true;}catch(e){console.warn(e);S=null;return false;}}
function postLoad(){if(!S)return;if(typeof v4init==='function')v4init();fans();if(S.tac)tacDefaults(S.tac);if(S.training)trDefaults();if(!S.riv)S.riv={};if(S.settings&&S.settings.crowd==null)S.settings.crowd=true;if(S.settings&&S.settings.press==null)S.settings.press=true;for(const code in S.leagues){const L=S.leagues[code];if(L.done==null){L.done=Math.min(S.round,L.fix.length);L.tot=S.maxRound;}}if(!S.W){initWorld();if(S.round>0){wPlayTo();addNews('🌍','Nově se souběžně hrají i ligy v ostatních zemích. Domácí a evropské poháry začnou od příští sezóny.');}else{initCups();}saveGame();}
 if(!S.cal)S.cal=[];autoEvents();}
function resetGame(){STORE.del(SAVE_KEY);S=null;}
function exportSave(){try{const blob=new Blob([JSON.stringify(S)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fotbal-manazer-'+seasonLabel(S.season).replace('/','-')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}catch(e){toast('Export se nepovedl.');}}
function importSave(inp){const f=inp.files&&inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const s=migrateSave(JSON.parse(r.result));if(!s.clubs||!s.players||!s.clubId)throw 0;S=s;saveGame();UI.tab='home';render();toast('Hra načtena ✓');}catch(e){toast('Soubor není platné uložení hry.');}};r.readAsText(f);}

// ===================== v3: fanoušci, počasí, zvuk stadionu, rozhodčí, tisk, rozšířená taktika a trénink =====================
// ----- nálada fanoušků -----
function fans(){if(S.fans==null)S.fans=60;return S.fans;}
function fansAdd(d,why){const o=fans();S.fans=clamp(Math.round((o+d)*10)/10,0,100);if(why&&Math.abs(d)>=4)addNews(d>0?'📣':'😠',why,Math.abs(d)<6?1:0);}
function fansLabel(v){v=v==null?fans():v;return v<20?'Bouří se':v<40?'Nespokojení':v<58?'Klidní':v<78?'Spokojení':'Nadšení';}
function fansIc(v){v=v==null?fans():v;return v<20?'😡':v<40?'😠':v<58?'😐':v<78?'🙂':'🤩';}
function fansCls(v){v=v==null?fans():v;return v<40?'bad':v>=70?'good':'';}
function fansAfterMatch(M){const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const opp=M.sides[1-ui].cid;
 const diff=(clubStr(opp)-(myClub().rep||60));let d=my>th?3.5+clamp(diff/4,-1.5,3):my===th?(diff>3?1:-1):-3.5+clamp(diff/5,-1,2);
 if(my-th>=3)d+=1.5;if(th-my>=3)d-=2.5;if(M.F&&M.F.type==='cup'&&M.ko&&M.ko.decide)d*=1.4;
 const r=S.riv&&S.riv[opp];if(r>=4)d*=1.3;fansAdd(d);}
function fansWeek(){const f=fans();S.fans=clamp(f+(56-f)*0.025,0,100);
 const me=myClub();if(me&&me.ticket){const base=me.ticketBase||me.ticket;const ratio=me.ticket/base;if(ratio>1.15)S.fans=clamp(S.fans-(ratio-1.1)*2.2,0,100);else if(ratio<0.9)S.fans=clamp(S.fans+0.3,0,100);}
 S.boardTrust=clamp(Math.round((S.boardTrust+(S.fans-55)/90)*10)/10,0,100);
 if(S.fans<18&&RNG()<0.25){addNews('🪧',isOwn()?(S.role==='owner'?'Fanoušci vyvěsili na tribuně transparent s výzvou k odchodu trenéra.':'Fanoušci vyvěsili na tribuně transparent: „Majiteli, odejdi!“'):'Fanoušci vyvěsili na tribuně transparent s výzvou k odchodu trenéra. Vedení je nervózní.');S.boardTrust=clamp(S.boardTrust-2,0,100);}
 if(S.fans>85&&RNG()<0.15)addNews('🎶','Kotel celý zápas zpíval a fanoušci po hře děkovali hráčům. Nálada kolem klubu je skvělá.',1);}
function fansCard(){const f=fans();return `<div class="card"><h3>📣 Nálada fanoušků</h3><div class="row"><span style="font-size:30px">${fansIc()}</span><div style="flex:1"><b class="${fansCls()}">${fansLabel()}</b> <span class="mut small">${Math.round(f)} / 100</span><div class="bar" style="margin-top:5px"><i style="width:${f}%"></i></div></div></div>
 <div class="tiny mut" style="margin-top:8px;line-height:1.5">Nálada stoupá s výhrami, hlavně nad silnějšími soupeři a rivaly, a klesá po porážkách, prodeji opor a při drahých vstupenkách. Ovlivňuje návštěvnost, příjmy ze vstupného i ${isOwn()?'náladu fanoušků':'důvěru vedení'}.</div>
 <div class="small mut" style="margin:10px 0 6px">Cena vstupenky: <b>${fmtMoney(myClub().ticket)}</b></div><div class="seg">${[[0.8,'Levná'],[1,'Běžná'],[1.25,'Dražší'],[1.5,'Drahá']].map(([k,l])=>{const me=myClub();const base=me.ticketBase||me.ticket;const v=Math.max(3,Math.round(base*k));return `<button class="${me.ticket===v?'on':''}" onclick="setTicket(${k})">${l}</button>`;}).join('')}</div></div>`;}
function setTicket(k){const me=myClub();if(!me.ticketBase)me.ticketBase=me.ticket;me.ticket=Math.max(3,Math.round(me.ticketBase*k));saveGame();render();toast('Cena vstupenek upravena ✓');}
// ----- počasí -----
const CLIM={N:['SE','NO','FI','IE','GB-SCT','DK','IS'],C:['CZ','SK','DE','AT','CH','PL','HU','NL','BE','GB-ENG','FR','SI','RO','UA','RS','BA','BG','HR'],S:['ES','PT','IT','GR','TR','CY','IL'],SA:['BR','AR','UY','CL','AU'],T:['CO','MX'],D:['SA'],A:['JP','KR','CN'],U:['US']};
function climOf(cc){for(const k in CLIM)if(CLIM[k].includes(cc))return k;return 'C';}
const WX={sun:{ic:'☀️',n:'Slunečno'},cloud:{ic:'⛅',n:'Polojasno'},rain:{ic:'🌧️',n:'Déšť'},snow:{ic:'🌨️',n:'Sněžení'},wind:{ic:'💨',n:'Silný vítr'},heat:{ic:'🥵',n:'Vedro'},fog:{ic:'🌫️',n:'Mlha'}};
function seasonMonth(cc){const cal=['BR','AR','UY','CL','CO','JP','KR','CN','US','SE','NO','FI','IE'].includes(cc);const f=S.maxRound?S.round/S.maxRound:0;return cal?Math.min(11,2+Math.floor(f*9)):((7+Math.floor(f*10))%12);}
function matchWeather(hid,F){const c=CL(hid);const cc=c&&c.foreign?clubCC(hid):S.cc;const z=climOf(cc);const m=seasonMonth(cc);
 const rnd=mulberry(hashStr(String(S.season)+'|'+S.round+'|'+hid+'|'+(F&&F.e?F.e.c+F.e.i+F.e.l:'lg')));
 const BASE={N:[-3,-2,1,6,11,15,17,16,12,7,2,-1],C:[0,1,5,10,15,18,20,20,15,10,5,1],S:[9,10,13,16,20,25,28,28,24,19,14,10],SA:[27,27,25,22,19,16,16,18,20,22,24,26],T:[19,20,21,22,22,21,21,21,21,20,20,19],D:[17,20,24,29,34,36,37,37,34,30,24,19],A:[3,4,8,13,18,22,26,27,23,17,11,5],U:[2,4,9,14,19,24,27,26,22,16,10,4]}[z];
 const t=Math.round(BASE[m]+(rnd()-0.5)*8);const rainP={N:0.32,C:0.24,S:0.14,SA:0.22,T:0.34,D:0.03,A:0.24,U:0.2}[z];
 let k='sun';const r=rnd();if(t<=1&&r<0.38)k='snow';else if(r<rainP)k='rain';else if(r<rainP+0.08)k='wind';else if(t>=30&&r<rainP+0.5)k='heat';else if(t<8&&r<rainP+0.15)k='fog';else if(r<rainP+0.45)k='cloud';
 return {k,t};}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function wxFx(w){const k=w?w.k:'sun';return {rate:k==='snow'?0.88:k==='heat'?0.94:k==='fog'?0.95:k==='rain'?1.05:1,acc:k==='wind'?0.88:k==='rain'?0.96:1,drain:k==='heat'?1.28:k==='snow'?1.1:1,inj:k==='snow'?1.35:k==='rain'?1.15:1,short:k==='rain'||k==='snow'?-0.8:0};}
function wxText(w){if(!w)return '';return `${WX[w.k].ic} ${WX[w.k].n}, ${w.t} °C`;}
const WX_FILL={rain:['Déšť zesílil, míč na mokrém trávníku klouže.','Hráči v dešti často padají, rozhodčí má plné ruce práce.','Kaluže před brankou dělají obráncům potíže.'],snow:['Sněží čím dál víc, pořadatelé vynesli oranžový míč.','Na trávníku přibývá sněhu, kombinace se lámou.'],wind:['Vítr si pohrává s dlouhými míči.','Silný poryv větru odnesl centr až za postranní čáru.'],heat:['Rozhodčí kvůli vedru nařídil přestávku na pití.','Horko je znát, tempo hry opadá.'],fog:['Mlha houstne, z tribun je sotva vidět na druhou branku.']};
const WX_INTRO={sun:'Hraje se za krásného slunečného počasí.',cloud:'Nad stadionem je polojasno, ideální podmínky pro fotbal.',rain:'Hraje se v dešti, trávník bude kluzký.',snow:'Sněží! Pořadatelé museli před zápasem odklízet sníh z čar.',wind:'Stadionem se prohání silný vítr, dlouhé míče budou nevyzpytatelné.',heat:'Panuje velké vedro, hráči budou rychleji unavení.',fog:'Nad stadionem leží mlha, viditelnost je horší.'};
// ----- zvuk stadionu (Web Audio, spouští se až po klepnutí uživatele) -----
let CROWD=null;
function crowdOn(){return S&&S.settings&&S.settings.sound&&S.settings.crowd!==false;}
function crowdStart(M){crowdStop();if(!crowdOn())return;try{const ac=getAC();if(!ac)return;if(ac.state==='suspended'&&ac.resume)ac.resume().catch(()=>{});
 const len=ac.sampleRate*3;const buf=ac.createBuffer(1,len,ac.sampleRate);const d=buf.getChannelData(0);let b0=0,b1=0,b2=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=0.997*b0+w*0.029;b1=0.985*b1+w*0.032;b2=0.95*b2+w*0.048;d[i]=(b0+b1+b2)*0.35;}
 const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=700;bp.Q.value=0.6;const g=ac.createGain();
 const lfo=ac.createOscillator();lfo.frequency.value=0.18;const lg=ac.createGain();
 const fill=clamp((M.att||5000)/Math.max(1000,(S.clubs[M.h.cid]&&S.clubs[M.h.cid].cap)||M.att||5000),0.2,1);const inten=clamp(0.35+fill*0.4+(M.h.user?(fans()-50)/160:0),0.2,1);
 const base=0.018+0.05*inten;g.gain.value=base;lg.gain.value=base*0.35;lfo.connect(lg);lg.connect(g.gain);src.connect(bp);bp.connect(g);g.connect(ac.destination);src.start();lfo.start();
 CROWD={ac,src,g,bp,lfo,base,inten};}catch(e){CROWD=null;}}
function crowdSwell(mul,dur,freq){if(!CROWD)return;try{const {ac,g,bp,base}=CROWD;const t=ac.currentTime;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(Math.min(0.5,base*mul),t+0.25);g.gain.linearRampToValueAtTime(base,t+dur);
 if(freq){bp.frequency.cancelScheduledValues(t);bp.frequency.setValueAtTime(bp.frequency.value,t);bp.frequency.linearRampToValueAtTime(freq,t+0.2);bp.frequency.linearRampToValueAtTime(700,t+dur);}}catch(e){}}
function crowdEvents(M,ev){if(!CROWD)return;for(const e of ev){const home=e.s===0;
  if(e.t==='goal')crowdSwell(home?5:2.4,home?4.5:2.5,home?1100:850);else if(e.t==='save'||e.t==='post'||e.t==='miss')crowdSwell(home?2.4:1.5,1.6,950);
  else if(e.t==='pen'||e.t==='pk')crowdSwell(2.2,2,900);else if(e.t==='yel'||e.t==='red')crowdSwell(e.s===0?1.8:1.4,1.4,600);else if(e.t==='ht'||e.t==='ft')crowdSwell(1.6,2.5,650);}}
function crowdStop(){if(!CROWD)return;try{const {ac,g,src,lfo}=CROWD;const t=ac.currentTime;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(0,t+0.5);src.stop(t+0.6);lfo.stop(t+0.6);}catch(e){}CROWD=null;}
// ----- podplácení rozhodčího (satirická herní mechanika) -----
const BRIBE=[[0,'Nic'],[1,'Drobná pozornost'],[2,'Tlustá obálka'],[3,'Kufřík']];
function bribeCost(l){const me=myClub();const sal=clamp(200+(me.tv||0)*0.0006,200,2500);const base=Math.round(clamp(sal*3,800,7500)/100)*100;return [0,base,base*3,base*7][l];}
function bribeSheet(){const F=UI.F;if(!F)return;const cur=UI.bribe||0;
 modal(`<h2>🤫 Obálka pro rozhodčího</h2><div class="small mut" style="margin-bottom:8px">Satirická herní mechanika, jen s herními penězi. Ve skutečném fotbale je to trestný čin a skončil bys před soudem.</div>
 <div class="card" style="padding:10px 12px"><div class="small">Rozhodčí bude v hraničních situacích malinko nakloněný tvému týmu: o něco častěji odpíská penaltu ve tvůj prospěch a dá kartu soupeři. <b>Hrozí ale skandál:</b> pokuta, odečet bodů, propad ${isOwn()?'pověsti':'důvěry vedení'} i fanoušků a v horším případě vyhazov.</div>
 <div class="small mut" style="margin-top:8px">Na osobním kontě máš ${fmtMoney(S.wallet)} · podezření svazu: ${bribeHeatTxt()}</div></div>
 ${BRIBE.map(([l,n])=>`<button class="btn ${cur===l?'gold':'ghost'} w100" style="margin-bottom:8px;justify-content:space-between" onclick="UI.bribe=${l};closeModal();preMatch()"><span>${n}</span><b>${l?fmtMoney(bribeCost(l))+' · riziko '+bribeRisk(l)+' %':'bez rizika'}</b></button>`).join('')}`);}
function bribeRisk(l){if(!l)return 0;const h=(S.bribe&&S.bribe.heat)||0;return Math.round(clamp(5+l*4+h*3,0,60));}
function bribeHeatTxt(){const h=(S.bribe&&S.bribe.heat)||0;return h<1?'žádné':h<3?'mírné':h<5?'zvýšené':'vysoké';}
function bribeApply(M){const l=UI.bribe||0;UI.bribe=0;if(!l)return;const cost=bribeCost(l);if(S.wallet<cost){toast('Na obálku nemáš dost peněz na osobním kontě.');return;}
 S.wallet-=cost;M.bribe={side:userSide(M),l};S.bribe=S.bribe||{heat:0,n:0,cases:[]};S.bribe.n++;
 if(RNG()*100<bribeRisk(l)){S.bribe.cases.push({r:S.round+rint(1,4),s:S.season,l,cost,opp:M.sides[1-userSide(M)].cid});}S.bribe.heat+=l*0.6;}
function bribeWeek(){if(!S.bribe)return;S.bribe.heat=Math.max(0,S.bribe.heat-0.12);const due=S.bribe.cases.filter(c=>c.s===S.season&&c.r<=S.round||c.s<S.season);if(!due.length)return;S.bribe.cases=S.bribe.cases.filter(c=>!due.includes(c));
 due.forEach(c=>{const me=myClub();const fine=Math.round(Math.max(100000,(me.tv||0)*6*c.l)/1e4)*1e4;const ded=3*c.l;money(-fine,'prize','Pokuta za ovlivňování zápasu');
  const L=S.leagues[me.lg];if(L&&L.table[S.clubId]){L.table[S.clubId].pts-=ded;L.ded=(L.ded||0)+ded;}
  S.boardTrust=clamp(S.boardTrust-(15+7*c.l),0,100);fansAdd(-(10+5*c.l));S.scandal={s:S.season,r:S.round,l:c.l};
  addNews('🚨',`SKANDÁL! Média zveřejnila nahrávky, na kterých ${mgrRef()} domlouvá „pozornost“ pro rozhodčího. Disciplinární komise: pokuta ${fmtMoney(fine)} a odečet ${ded} bodů.`);
  if(!isOwn()&&S.boardTrust<=8){addNews('🧾','Vedení klubu po skandálu zvažuje okamžité odvolání trenéra. Další chyba už se neodpouští.');}
  if(isOwn()?(c.l>=3&&S.own.rep<15):S.boardTrust<=0)S.sackNow=1;});}
// ----- tisková konference -----
const PRESS_Q={
 preStrong:['Soupeř je výrazně silnější. Na co se dnes chystáte?',[['Budeme hrát odvážně a půjdeme po výhře.',{mor:2,fans:2,board:-1}],['Chceme hlavně dobře bránit a překvapit.',{mor:1,fans:0,board:1}],['Upřímně, bod by byl úspěch.',{mor:-2,fans:-2,board:1}]]],
 preWeak:['Jste jasný favorit. Nemáte strach z podcenění?',[['Respektujeme každého soupeře.',{mor:1,fans:0,board:1}],['Chceme vyhrát jasně, nic jiného nebereme.',{mor:2,fans:2,board:0,riv:2}],['Favorit? Fotbal se hraje na hřišti, ne na papíře.',{mor:0,fans:1,board:0}]]],
 preForm:['Tým má teď slabší formu. Jak to chcete zlomit?',[['Věřím hráčům, v kabině je dobrá atmosféra.',{mor:3,fans:0,board:0}],['Někteří hráči musí přidat, jinak půjdou na lavičku.',{mor:-2,fans:2,board:1}],['Jde jen o smůlu, výkony nejsou špatné.',{mor:1,fans:-2,board:-1}]]],
 preRival:['Čeká vás rival, se kterým to v médiích jiskří. Vzkážete jim něco?',[['Ať se připraví, dnes je porazíme.',{mor:2,fans:4,board:-1,riv:3}],['Je to jen další zápas o tři body.',{mor:0,fans:-1,board:1,riv:-1}],['Respekt k soupeři, ale doma jsme silní.',{mor:1,fans:2,board:0,riv:0}]]],
 postWin:['Gratulujeme k výhře. Co rozhodlo?',[['Celý tým odvedl skvělou práci.',{mor:3,fans:1,board:0}],['Taktika vyšla přesně podle plánu.',{mor:0,fans:1,board:2}],['Pořád máme co zlepšovat, nejsem úplně spokojený.',{mor:-1,fans:0,board:1}]]],
 postLoss:['Po porážce jsou fanoušci zklamaní. Co jim vzkážete?',[['Omlouváme se, příště to bude lepší.',{mor:0,fans:3,board:0}],['Hráči dnes nepodali výkon, se kterým bych byl spokojen.',{mor:-3,fans:2,board:1}],['Rozhodčí nám dnes nepomohl.',{mor:1,fans:1,board:-2,riv:1}]]],
 postDraw:['Remíza. Berete bod, nebo ztrácíte dva?',[['Bod bereme, soupeř byl kvalitní.',{mor:1,fans:-1,board:1}],['Ztratili jsme dva body, to nás mrzí.',{mor:0,fans:2,board:0}],['Výsledek je zasloužený pro oba týmy.',{mor:1,fans:0,board:0}]]],
 transfer:['Spekuluje se o odchodu vaší opory. Je to pravda?',[['Nikoho prodávat nechceme.',{mor:2,fans:3,board:-1}],['Za dobrou nabídku se může jednat o každém.',{mor:-2,fans:-3,board:2}],['Přestupy nekomentuji.',{mor:0,fans:0,board:0}]]],
 scandal:['Jak se vyjádříte ke skandálu s rozhodčím?',[['Bylo to selhání, omlouvám se klubu i fanouškům.',{mor:0,fans:4,board:4}],['Jde o vykonstruovanou kauzu, budeme se bránit.',{mor:1,fans:-3,board:-4}],['K probíhajícímu řízení se nevyjádřím.',{mor:0,fans:-1,board:0}]]],
 bribeRumor:['Kolují zvěsti, že s rozhodčími máte nadstandardní vztahy. Co na to?',[['To je nesmysl, vyhráváme poctivě.',{mor:0,fans:1,board:0}],['Bez komentáře.',{mor:0,fans:-1,board:-1}],['Ať novináři raději píšou o fotbale.',{mor:1,fans:0,board:-1}]]]};
function pressPick(kind,F,M){const opp=F?(F.h===S.clubId?F.a:F.h):M?M.sides[1-userSide(M)].cid:null;
 if(S.scandal&&S.scandal.s===S.season&&S.round-S.scandal.r<=3&&!S.scandal.asked){S.scandal.asked=1;return 'scandal';}
 if(kind==='pre'){if(S.bribe&&S.bribe.heat>=3&&RNG()<0.3)return 'bribeRumor';if(S.riv&&opp&&Math.abs(S.riv[opp]||0)>=3)return 'preRival';const top=clubPlayers(S.clubId).sort((a,b)=>b.ovr-a.ovr)[0];if(top&&transferWindow()&&RNG()<0.25)return 'transfer';
  const fm=(S.leagues[myClub().lg].table[S.clubId]||{}).form||[];if(fm.slice(-3).filter(x=>x==='P').length>=2)return 'preForm';return clubStr(opp)>(myClub().rep||60)+2?'preStrong':'preWeak';}
 const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];return my>th?'postWin':my<th?'postLoss':'postDraw';}
function pressHtml(kind,F,M){if(!S.settings||S.settings.press===false)return '';const key=UI.pressKey&&UI.pressKey[kind];if(key==='done')return UI.pressDone&&UI.pressDone[kind]?`<div class="card" style="padding:8px 12px"><div class="tiny mut">🎤 ${esc(UI.pressDone[kind])}</div></div>`:'';
 let q=key;if(!q){if(RNG()>(kind==='pre'?0.38:0.5)){UI.pressKey=Object.assign(UI.pressKey||{},{[kind]:'done'});return '';}q=pressPick(kind,F,M);UI.pressKey=Object.assign(UI.pressKey||{},{[kind]:q});UI.pressOpp=F?(F.h===S.clubId?F.a:F.h):M.sides[1-userSide(M)].cid;}
 const [txt,ans]=PRESS_Q[q];return `<div class="card press" style="padding:10px 12px"><h3>🎤 ${kind==='pre'?'Tisková konference před zápasem':'Rozhovor po zápase'}</h3><div class="small" style="margin-bottom:8px">„${esc(txt)}“</div>${ans.map((a,i)=>`<button class="btn ghost w100 pans" style="margin-bottom:6px;text-align:left;justify-content:flex-start;white-space:normal;height:auto;min-height:44px" onclick="pressAnswer('${kind}','${q}',${i})">${esc(a[0])}</button>`).join('')}</div>`;}
function pressAnswer(kind,q,i){const a=PRESS_Q[q][1][i];const fx=a[1];const opp=UI.pressOpp;
 if(fx.mor)clubPlayers(S.clubId).forEach(p=>p.mor=clamp(p.mor+fx.mor,5,100));if(fx.fans)fansAdd(fx.fans);if(fx.board)S.boardTrust=clamp(Math.round(S.boardTrust+fx.board),0,100);
 if(fx.riv&&opp){S.riv=S.riv||{};S.riv[opp]=clamp((S.riv[opp]||0)+fx.riv,-10,10);}
 const eff=[fx.mor?`morálka ${fx.mor>0?'+':''}${fx.mor}`:'',fx.fans?`fanoušci ${fx.fans>0?'+':''}${fx.fans}`:'',fx.board&&!isOwn()?`vedení ${fx.board>0?'+':''}${fx.board}`:'',fx.riv?'rivalita roste':''].filter(Boolean).join(' · ');
 UI.pressKey[kind]='done';UI.pressDone=Object.assign(UI.pressDone||{},{[kind]:`Odpověděl jsi: „${a[0]}“${eff?' ('+eff+')':''}`});
 if(Math.random()<0.4){const head={postWin:'Trenér po výhře: ',postLoss:'Trenér po porážce: ',postDraw:'Trenér po remíze: '}[q]||'Trenér na tiskovce: ';addNews('🎤',head+'„'+a[0]+'“',1);}
 saveGame();if(kind==='pre'){closeModal();preMatch();}else{const c=document.querySelector('.press');if(c)c.outerHTML=`<div class="card" style="padding:8px 12px"><div class="tiny mut">🎤 ${esc(UI.pressDone[kind])}</div></div>`;}}
function rivBonus(cid){const r=S.riv&&S.riv[cid]||0;return clamp(r*0.12,0,1.2);}
// ----- rozšířená taktika -----
const T_LINE={low:'Hluboko',mid:'Střed',high:'Vysoko'},T_WIDTH={narrow:'Úzko',norm:'Normálně',wide:'Široko'},T_TEMPO={slow:'Pomalé',norm:'Normální',fast:'Rychlé'};
const ROLES={'':'Bez pokynu',att:'Víc dopředu',def:'Držet pozici',free:'Volná role',mark:'Osobní obrana'};
function tacDefaults(t){if(!t)return t;if(!t.line)t.line='mid';if(!t.width)t.width='norm';if(!t.tempo)t.tempo='norm';if(t.trap==null)t.trap=false;if(!t.roles)t.roles={};if(t.sp===undefined)t.sp=null;return t;}
function tacMods(t,xi){const o={att:0,def:0,mid:0};if(!t)return o;
 if(t.line==='high'){o.mid+=0.9;o.def-=0.9;o.att+=0.3;}else if(t.line==='low'){o.def+=1;o.mid-=0.7;o.att-=0.5;}
 if(t.width==='wide'){o.att+=0.5;o.mid-=0.4;}else if(t.width==='narrow'){o.mid+=0.6;o.att-=0.4;}
 if(t.tempo==='fast'){o.att+=0.6;o.def-=0.3;}else if(t.tempo==='slow'){o.mid+=0.5;o.att-=0.5;}
 const R=t.roles||{};(xi||[]).forEach(id=>{const r=R[id];if(r==='att'){o.att+=0.35;o.def-=0.3;}else if(r==='def'){o.def+=0.3;o.att-=0.25;}else if(r==='free'){o.att+=0.25;o.mid+=0.15;o.def-=0.2;}else if(r==='mark'){o.def+=0.25;o.mid-=0.1;}});
 if(t.cap&&(xi||[]).includes(t.cap)){const c=P(t.cap);if(c){const b=clamp((c.ovr-60)/40+(ageOf(c)>=28?0.3:0),0,0.9);o.att+=b*0.4;o.def+=b*0.4;o.mid+=b*0.4;}}
 return o;}
function tacRate(t){return t&&t.tempo==='fast'?1.1:t&&t.tempo==='slow'?0.9:1;}
function tacDrain(t){return (t&&t.tempo==='fast'?1.12:t&&t.tempo==='slow'?0.92:1)*(t&&t.line==='high'?1.05:1);}
function renderTacExtra(){const t=tacDefaults(S.tac);const ps=t.xi.map(P).filter(Boolean);const seg=(k,obj)=>`<div class="seg">${Object.entries(obj).map(([v,l])=>`<button class="${t[k]===v?'on':''}" onclick="S.tac.${k}='${v}';saveGame();render()">${l}</button>`).join('')}</div>`;
 const sel=(k,lbl,hint)=>`<div class="row small" style="margin-top:8px"><span style="flex:1">${lbl}${hint?`<div class="tiny mut">${hint}</div>`:''}</span><select style="max-width:58%" onchange="S.tac.${k}=this.value||null;saveGame();render()"><option value="">Automaticky</option>${ps.map(p=>`<option value="${p.id}" ${t[k]===p.id?'selected':''}>${esc(p.n)}</option>`).join('')}</select></div>`;
 return `<div class="card"><h3>Obranná linie</h3>${seg('line',T_LINE)}<h3 style="margin-top:12px">Šířka hry</h3>${seg('width',T_WIDTH)}<h3 style="margin-top:12px">Tempo</h3>${seg('tempo',T_TEMPO)}
 <div class="row" style="margin-top:12px"><span style="flex:1"><b>Ofsajdová past</b><div class="tiny mut">Soupeř bude častěji v ofsajdu, ale když past nevyjde, jde sám na brankáře.</div></span><button class="btn ${t.trap?'gold':'ghost'} sm" style="min-width:88px" onclick="S.tac.trap=!S.tac.trap;saveGame();render()">${t.trap?'Zapnutá':'Vypnutá'}</button></div>
 <div class="tiny mut" style="margin-top:8px">Vysoká linie a rychlé tempo víc tlačí, ale unavují a pouští soupeře do brejků. Široká hra přinese víc centrů a rohů.</div></div>
 <div class="card"><h3>Kapitán a standardky</h3>${sel('cap','Kapitán','Zkušený kapitán zvedá výkon celého týmu.')}${sel('pk','Penalty')}${sel('sp','Rohy a přímé kopy','Dobrý exekutor přidá šance po standardkách.')}</div>
 <div class="card"><h3>Individuální pokyny</h3>${ps.map(p=>`<div class="row small" style="padding:4px 0">${posB(p.pos)}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.n)}</span><select style="max-width:48%" onchange="if(this.value)S.tac.roles['${p.id}']=this.value;else delete S.tac.roles['${p.id}'];saveGame()">${Object.entries(ROLES).filter(([k])=>k!=='mark'||GRP(p.pos)!=='F').map(([k,l])=>`<option value="${k}" ${(t.roles[p.id]||'')===k?'selected':''}>${l}</option>`).join('')}</select></div>`).join('')}</div>`;}
// ----- rozšířený trénink -----
const DAYS=['Po','Út','St','Čt','Pá'];const SESS={rest:'Volno',fit:'Kondice',att:'Útok',def:'Obrana',tech:'Technika',tac:'Taktika',sp:'Standardky'};
const IND={'':'Podle týmu',sho:'Zakončení',pas:'Přihrávky',dri:'Technika',def:'Bránění',phy:'Fyzička',pac:'Rychlost'};
function trDefaults(){const tr=S.training;if(!tr.plan)tr.plan=['tac','att','rest','def','fit'];if(tr.sp==null)tr.sp=40;return tr;}
function trInjRisk(){const tr=trDefaults();const n=tr.plan.filter(x=>x!=='rest').length;const r=(tr.int===3?2.2:tr.int===1?0.6:1.2)*(n/4);return r<0.9?['nízké','good']:r<1.7?['střední','']:['vysoké','bad'];}
function trWeek(){const tr=trDefaults();const cnt={};tr.plan.forEach(x=>cnt[x]=(cnt[x]||0)+1);
 const top=Object.entries(cnt).filter(([k])=>k!=='rest').sort((a,b)=>b[1]-a[1])[0];tr.focus=top?top[0]==='sp'?'bal':top[0]:'fit';
 const rest=cnt.rest||0;const work=5-rest;clubPlayers(S.clubId).forEach(p=>{p.cond=clamp(p.cond+rest*3-Math.max(0,work-3)*2,0,100);});
 if(cnt.tac)S.cohesion=clamp(S.cohesion+cnt.tac*0.5,0,100);tr.sp=clamp(tr.sp+(cnt.sp||0)*1.6-0.4,10,100);
 const risk=(tr.int===3?0.004:tr.int===1?0.001:0.002)*Math.max(0,work-2);clubPlayers(S.clubId).forEach(p=>{if(p.inj<=0&&RNG()<risk){p.inj=rint(1,3);addNews('🤕',`${p.n} se zranil na tréninku a bude chybět ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.`);}
  if(p.tf&&RNG()<0.07+(ageOf(p)<=23?0.05:0)){const k={pac:0,sho:1,pas:2,dri:3,def:4,phy:5}[p.tf];if(k!=null&&p.a[k]<95){p.a[k]++;if(RNG()<0.25)p._xp=(p._xp||0)+0.3;}}
  if(p.rtr){p.rtr.prog=Math.min(100,p.rtr.prog+(ageOf(p)<=24?9:ageOf(p)<=29?6:4)*(tr.int===3?1.2:tr.int===1?0.8:1));if(p.rtr.prog>=100){p.pos2=p.rtr.to;addNews('🔁',`${p.n} se přeučil na pozici ${POS_FULL[p.rtr.to]||p.rtr.to} a může tam hrát naplno.`);delete p.rtr;}}});}
function renderTraining(){const tr=trDefaults();const [rk,rc]=trInjRisk();
 return `<div class="card"><h3>📅 Týdenní plán tréninku</h3>${DAYS.map((d,i)=>`<div class="row small" style="padding:4px 0"><b style="width:32px">${d}</b><select style="flex:1" onchange="S.training.plan[${i}]=this.value;saveGame();render()">${Object.entries(SESS).map(([k,l])=>`<option value="${k}" ${tr.plan[i]===k?'selected':''}>${l}</option>`).join('')}</select></div>`).join('')}
 <h3 style="margin-top:12px">Intenzita</h3><div class="seg">${[[1,'Lehká'],[2,'Normální'],[3,'Tvrdá']].map(([k,l])=>`<button class="${tr.int===k?'on':''}" onclick="S.training.int=${k};saveGame();render()">${l}</button>`).join('')}</div>
 <div class="grid2" style="margin-top:10px"><div class="tile"><div class="k">Riziko zranění</div><div class="v ${rc}">${rk}</div></div><div class="tile"><div class="k">Nacvičené standardky</div><div class="v">${Math.round(tr.sp)} %</div></div></div>
 <div class="tiny mut" style="margin-top:8px;line-height:1.5">Volné dny zrychlí regeneraci, taktika zvyšuje sehranost a nácvik standardek přinese víc gólů z rohů a přímých kopů. Víc tréninkových dní a tvrdší intenzita zrychlí rozvoj, ale zvyšují riziko zranění.</div></div>
 <div class="card"><h3>🎯 Individuální trénink</h3><div class="tiny mut" style="margin-bottom:6px">Vyber hráčům vlastní zaměření nebo je přeuč na novou pozici (v kartě hráče).</div>${clubPlayers(S.clubId).sort((a,b)=>b.ovr-a.ovr).map(p=>`<div class="row small" style="padding:4px 0">${posB(p.pos)}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="playerSheet('${p.id}')">${esc(p.n)}${p.rtr?` <span class="tag y">→ ${POS_CZ[p.rtr.to]} ${Math.round(p.rtr.prog)} %</span>`:p.pos2?` <span class="tag">${POS_CZ[p.pos2]}</span>`:''}</span><select style="max-width:42%" onchange="P('${p.id}').tf=this.value||null;saveGame()">${Object.entries(IND).filter(([k])=>k!=='dri'||p.pos!=='GK').map(([k,l])=>`<option value="${k}" ${(p.tf||'')===k?'selected':''}>${l}</option>`).join('')}</select></div>`).join('')}</div>`;}
function retrainHtml(p){if(p.cl!==S.clubId)return '';const opts=Object.keys(POS_FULL).filter(k=>k!==p.pos&&(p.pos==='GK')===(k==='GK'));
 return `<div class="card" style="padding:10px 12px"><h3>🔁 Přeučení na pozici</h3>${p.rtr?`<div class="small">Přeučuje se na <b>${POS_FULL[p.rtr.to]}</b> · ${Math.round(p.rtr.prog)} %</div><div class="bar" style="margin:6px 0"><i style="width:${p.rtr.prog}%"></i></div><button class="btn ghost w100" onclick="delete P('${p.id}').rtr;saveGame();closeModal();playerSheet('${p.id}')">Zrušit přeučení</button>`:`<select class="w100" onchange="if(this.value){P('${p.id}').rtr={to:this.value,prog:0};saveGame();closeModal();playerSheet('${p.id}');toast('Přeučení zahájeno ✓')}"><option value="">${p.pos2?'Druhá pozice: '+POS_FULL[p.pos2]+' · vybrat jinou':'Vyber novou pozici…'}</option>${opts.map(k=>`<option value="${k}">${POS_FULL[k]}</option>`).join('')}</select><div class="tiny mut" style="margin-top:6px">Mladší hráči se přeučí rychleji (obvykle 10–25 týdnů).</div>`}</div>`;}
function posFitP(p,slot){if(!p)return 0;const a=posFit(p.pos,slot);return p.pos2?Math.max(a,posFit(p.pos2,slot)*0.98):a;}
// ----- porovnání hráčů a skauting -----
function compareSheet(id){const p=P(id);if(!p)return;const pool=clubPlayers(S.clubId).filter(x=>x.id!==id&&GRP(x.pos)===GRP(p.pos)).sort((a,b)=>b.ovr-a.ovr);
 modal(`<h2>⚖️ Porovnat: ${esc(p.n)}</h2><div class="small mut" style="margin-bottom:8px">Vyber hráče ze svého kádru na podobném postu.</div>${pool.length?pool.map(x=>`<div class="pl-row" onclick="closeModal();compareView('${id}','${x.id}')">${posB(x.pos)}<div class="nm"><b>${esc(x.n)}</b><small>${ageOf(x)} let · potenciál ${x.pot}</small></div>${ovrB(x.ovr)}</div>`).join(''):'<div class="empty">V kádru není hráč na podobném postu.</div>'}`);}
function compareView(a,b){const x=P(a),y=P(b);if(!x||!y)return;const row=(k,u,v,fmt)=>`<div class="stt"><b class="${u>v?'good':''}">${fmt?fmt(u):u}</b><span class="k">${k}</span><b class="r ${v>u?'good':''}">${fmt?fmt(v):v}</b><div class="dbar"><i style="width:${u/(u+v||1)*100}%"></i><i style="width:${v/(u+v||1)*100}%"></i></div></div>`;
 const sx=x.st,sy=y.st;modal(`<h2>⚖️ Porovnání hráčů</h2><div class="row small" style="justify-content:space-between;margin-bottom:6px"><b>${esc(x.n)}</b><b>${esc(y.n)}</b></div>
 <div class="card" style="padding:10px 12px">${row('Celkem',x.ovr,y.ovr)}${row('Potenciál',x.pot,y.pot)}${row('Věk',ageOf(x),ageOf(y))}${x.a.map((_,i)=>row((x.pos==='GK'?ATTR_GK:ATTR_CZ)[i],x.a[i],y.a[i])).join('')}</div>
 <div class="card" style="padding:10px 12px"><h3>Sezóna</h3>${row('Zápasy',sx.ap,sy.ap)}${row('Góly',sx.g,sy.g)}${row('Asistence',sx.as,sy.as)}${row('Průměrná známka',sx.ap?Math.round(sx.rt/sx.ap*10)/10:0,sy.ap?Math.round(sy.rt/sy.ap*10)/10:0,v=>String(v).replace('.',','))}${row('Kondice',Math.round(x.cond),Math.round(y.cond))}</div>
 <button class="btn ghost w100" onclick="closeModal()">Zavřít</button>`);}
function scoutCost(p){return Math.round(clamp((p.ovr-50)*400,3000,40000)/1000)*1000;}
function scoutHtml(p){if(p.cl===S.clubId)return '';S.scout=S.scout||{};const sc=S.scout[p.id];
 if(sc)return `<div class="card" style="padding:10px 12px"><h3>🔎 Zpráva skauta</h3><div class="small">${esc(sc.t)}</div><div class="tiny mut" style="margin-top:4px">Odhad potenciálu: ${sc.lo}–${sc.hi} · ${sc.fit}</div></div>`;
 return `<div class="card" style="padding:10px 12px"><h3>🔎 Skauting</h3><div class="tiny mut" style="margin-bottom:6px">Skaut hráče sleduje a odhadne jeho potenciál a povahu. Platí klub.</div><button class="btn ghost w100" onclick="doScout('${p.id}')">Poslat skauta (${fmtMoney(scoutCost(p))})</button></div>`;}
function doScout(id){const p=P(id)||(typeof MK!=='undefined'&&MK.tmp&&MK.tmp[id]);if(!p)return;const c=scoutCost(p);if(myClub().money<c){toast('Klub na skauta nemá peníze.');return;}money(-c,'tr_out','Skauting: '+p.n);
 const err=rint(2,5);const lo=Math.max(p.ovr,p.pot-err),hi=Math.min(99,p.pot+err);const ag=ageOf(p);
 const tr=[p.mor>75?'v kabině je oblíbený a táhne ostatní':'je spíš introvert, ale profesionál',p.a[0]>80?'velkou zbraní je jeho rychlost':p.a[1]>78?'umí se prosadit střelou z dálky':p.a[2]>78?'vidí přihrávky, které ostatní nevidí':p.a[4]>78?'je nepříjemný v osobních soubojích':'je univerzální a pracovitý',ag<=21?'ještě má velký prostor růst':ag>=31?'nejlepší roky už má za sebou':'je v nejlepším fotbalovém věku'];
 const fit=(()=>{const mine=clubPlayers(S.clubId).filter(x=>GRP(x.pos)===GRP(p.pos)).map(x=>x.ovr).sort((a,b)=>b-a);const k=mine.filter(v=>v>p.ovr).length;return k===0?'byl by u nás jasnou oporou':k<=2?'bojoval by o základní sestavu':'u nás by byl spíš náhradník';})();
 S.scout=S.scout||{};S.scout[id]={t:`Skaut píše: ${tr[0]}, ${tr[1]} a ${tr[2]}.`,lo,hi,fit};const ks=Object.keys(S.scout);if(ks.length>60)delete S.scout[ks[0]];saveGame();closeModal();playerSheet(id);toast('Zpráva skauta je hotová ✓');}
// ----- týdenní háčky -----
function extraWeek(){try{fansWeek();trWeek();bribeWeek();}catch(e){console.warn(e);}}

// ===================== CHAT SÁZKAŘŮ (v3) =====================
// Postavy: opt optimista, pes pesimista, stat statistik, fanH/fanA fanoušci týmů, troll, nov nováček, vet ostřílený tipař
const CH_NICK={opt:['Věčný_optimista','Usměvavý_Luboš','Zítra_to_vyjde','Pohodář_Míra','Sluníčko_Jarda','Veselý_Vojta'],
 pes:['Černý_Kuba','Pesimista_Ota','Zase_nic','Smolař_Vláďa','Mračoun_Igor','Věčná_smůla'],
 stat:['Statistik_Pavel','Čísla_nelžou','Tabulkář_Tomáš','Analytik_Radek','Tabulkový_Petr','Průměr_Honza'],
 troll:['Rýpal_z_Prahy','Provokatér_Bob','Šťoural_Vena','Kverulant_Zbyněk','Kibic_Karas'],
 nov:['Nováček_Adam','První_tiket','Student_Matěj','Začátečník_Eda','Zkouším_to_Ríša'],
 vet:['Starý_tipař','Děda_Kurz','Mazák_Jirka','Veterán_Karel','Tipuju_od_devadesátek','Zkušený_Franta']};
const CH_FAN=['Srdcem_{c}','Kotel_{c}','Navždy_{c}','Věrný_{c}','{c}_do_hrobu','Permanentka_{c}'];
const CH_PER={opt:'optimista',pes:'pesimista',stat:'statistik',fanH:'fanoušek',fanA:'fanoušek',troll:'rýpal',nov:'nováček',vet:'mazák'};
const CH={
 start:['Mám {stake} na tip {tip}, kurz {odds}. Dneska to sedne.','Tip: {tip}, kurz {odds}, vklad {stake}. Jdeme na to.','Vsazeno {stake} na tip {tip} ({odds}). Možná výhra {win}.','Tip {tip} za {odds}? To se nedalo nechat ležet.','Tiket podaný, tip {tip}, kurz {odds}. Teď už jen nervy.','Dneska poctivě jeden tip: {tip}, kurz {odds}, žádné AKO.'],
 start_opt:['Tip {tip} za {odds}, to je skoro zadarmo. Výhra {win} je moje!','Mám dobrý pocit, fakt dobrý. Tip {tip}, {stake}. Kdo jde se mnou?','Sluníčko svítí, kurz {odds} na tip {tip} svítí taky. Pohoda.'],
 start_pes:['Vsadil jsem {stake} na tip {tip}, ale stejně to zase nevyjde.','Kurz {odds}… to bude zase jedna z těch sázek, co padnou v devadesáté.','Mám tip {tip}. Už teď vím, že toho budu litovat.'],
 start_stat:['{h} má očekávané góly kolem {xgh}, {a} kolem {xga}. Proto tip {tip} za {odds}.','Podle mých tabulek je kurz {odds} na tip {tip} nadhodnocený. Vklad {stake}.','Posledních deset zápasů obou týmů mluví jasně, tip {tip}. Kurz {odds}.'],
 start_fan:['{c} do toho! Vsadil jsem {stake}, proti svým nesázím nikdy.','Kurz {odds} na tip {c}? Sázkovka nás podceňuje, uvidí.','Srdce nebo rozum? Srdce. {c} za {odds}, vklad {stake}.','Celý týden jsem se těšil. {c} vyhraje, basta. Kurz {odds}.'],
 start_troll:['Vsadil jsem {stake} na tip {tip} jen proto, abych vás tu mohl štvát.','Kdo tu má tip na {h}? Tak to už se omlouvám předem 😏','Dneska budu fandit tomu, kdo vám nejvíc pokazí tiket.'],
 start_nov:['Ahoj, je to můj první tiket. Tip {tip}, kurz {odds}. Je to dobrý kurz?','Dal jsem {stake} na tip {tip}. Snad jsem to vyplnil správně 😅','Kamarád říkal, že tip {tip} je jistota. Uvidíme, kurz {odds}.'],
 start_vet:['Za třicet let jsem se naučil jedno: nikdy nevěř favoritovi, který hraje třetí zápas za týden. Dneska tip {tip} za {odds}.','Malý vklad, rozumný kurz. Tip {tip}, {odds}. Žádné hrdinství.','Vidím tam hodnotu. Tip {tip} za {odds}, {stake} a jdu si pro čaj.'],
 start_ako:['Mám AKO o {legs} zápasech, tohle je poslední díl. Kurz celkem {odds}!','AKO na {legs} zápasů, zatím všechno sedí. Teď už jen tip {tip}.','Tiket o {legs} zápasech za {win}. Prosím, ať to nepokazí zrovna poslední zápas.'],
 wx_rain:['Leje jak z konve, to bude bahno a spousta náhod.','V dešti se špatně chytá, tipuju nějakou brankářskou chybu.','Mokrý trávník, rychlý míč. Na víc gólů ideální počasí.'],
 wx_snow:['Sněží! Kdo vsadil na krásný fotbal, prohrál hned na začátku.','Oranžový míč a sníh, to bude loterie.','Na sněhu nikdo nic neudrží, beru to jako výhodu pro outsidera.'],
 wx_wind:['Ten vítr bude dělat s centry psí kusy.','Při takovém větru padne gól z rohu, uvidíte.','Fouká, takže dlouhé míče můžeme rovnou zapomenout.'],
 wx_heat:['V tom vedru odpadnou po hodině, druhý poločas bude divočina.','Pětatřicet ve stínu, na konci budou chodit pěšky.','V horku se hraje pomalu, sázka na málo gólů dává smysl.'],
 wx_fog:['Mlha jak v pohádce, rozhodčí snad uvidí aspoň půlku hřiště.','V té mlze ani nevidím, kdo dal gól, jen kurz se hýbe.'],
 goal_good:['GÓÓÓL! {p} to tam poslal, {score}! Tiket žije!','Ano! {p}! To je přesně ono, {score}.','Říkal jsem to, {p} umí. {score} a kurz na můj tip spadl na {lo}.','Krása! {tm} skóruje a já si začínám počítat výhru {win}.','{p}, tebe miluju! {score} v {min}. minutě.','Takhle se to dělá! {score}, peníze cinkají.','Gól! Teď už to jen udržet, {score}.','Konečně! {p} rozvlnil síť a já dýchám. {score}.'],
 goal_bad:['Ne, ne, ne… {p} mi to pokazil. {score}.','Zrovna {p}? Celý zápas nic a teď tohle. {score}.','Gól do mého tiketu. {score}, kurz na můj tip vylétl na {lo}.','{tm} skóruje a já se jdu projít kolem baráku.','A je to tady. {score}. Proč já vůbec sázím?','Tak to bolí. {p} v {min}. minutě. Ještě je čas, ale…','Obrana spala jak na lehátku. {score}.','Cítil jsem to. Jak {p} dostal míč, věděl jsem, že je zle.'],
 goal_neu:['Gól! {score}, zápas se otevírá.','{p} skóruje, {score}. Kurzy se zase přepisují.','No vida, {score}. Mně je to zatím jedno, ale je to zajímavější.'],
 goal_good_stat:['Očekávané góly to předpovídaly. {score}, nic překvapivého.','Statisticky to přišlo přesně včas. {p} střílí z nejlepší pozice v zápase.'],
 goal_bad_pes:['Věděl jsem to. Vždycky to tak dopadne. {score}.','Přesně tohle jsem předpovídal. Nejsem prorok, jen smolař.'],
 goal_good_fan:['JÉÉÉ! {p}! {c} do toho! {score}!','Kotel řve, já řvu, soused klepe na zeď. {score}!','Tohle je můj tým! {p}, ty jsi legenda!'],
 goal_bad_fan:['To snad není možný, zase obrana… {score}.','{c}, probuďte se! {score}.','Fandím jim dvacet let a pořád mě takhle trápí.'],
 goal_good_troll:['Hahaha, kdo měl tip proti? Ozvěte se 😂','{p} skóruje a někdo tady právě brečí do klávesnice.'],
 goal_good_nov:['Počkat, to je dobře pro mě? Jo! Je to dobře! {score}!','Můj první gól na tiketu! Takhle to chodí vždycky?'],
 goal_good_vet:['Klid, pánové. Teprve {min}. minuta. Ale ano, je to příjemné.','Gól, hezký. Ale tiket se počítá až po závěrečném hvizdu.'],
 lategoal_good:['V {min}. MINUTĚ! {p}!!! Já se roztřesu!','Na poslední chvíli! {score}! Tohle je lepší než film!','{p} v nastavení! Nevěřím, prostě nevěřím! {score}!','Tohle si budu pamatovat roky. {min}. minuta, {score}!'],
 lategoal_bad:['V {min}. minutě? To si děláte legraci… {score}.','Takhle umírají tikety. {p}, za co?','Měl jsem to doma a v {min}. minutě je to pryč. {score}.','Už jsem měl v ruce peníze a {p} mi je vytrhl. {score}.'],
 pen_good:['PENALTA! Teď to {p} hlavně nepokaz!','Penalta pro {tm}! Tohle musí jít dovnitř.','Jo! Pokutový kop! Kurz na můj tip už padá.'],
 pen_bad:['Penalta? Vždyť to byl dotek jak pohlazení!','Tohle nemůže být penalta… a jestli jo, jsem v háji.','{p} jde na penaltu. Prosím, brankáři, chyť to!'],
 pen_troll:['Penalta! Teď se ukáže, kdo má tiket z ocele 😏'],
 pengoal_good:['Proměněno! {p} chladnokrevně, {score}.','{p} poslal brankáře na špatnou stranu. {score}!','Penalta sedla, tiket letí! {score}.'],
 pengoal_bad:['Proměnil… samozřejmě, že proměnil. {score}.','{p} se ani nezapotil. {score}, já ano.'],
 penmiss_good:['CHYTIL TO! {k}, tobě postavím sochu!','Neproměnil! {p} kopnul vedle a já slavím!','Penalta nedaná! Spravedlnost existuje!'],
 penmiss_bad:['{p}, jak můžeš nedat penaltu?! Jak?!','Penalta vedle. Moje peníze taky.','Zahodit penaltu v takovém zápase… {p} bude mít doma dusno.'],
 var_good:['Videorozhodčí to vzal zpátky! Děkuju ti, monitore!','Penalta odvolána! Tak přece jen má někdo oči.','Ufff. Video zachránilo můj tiket.'],
 var_bad:['Penaltu odvolali u monitoru? Na co se tam koukali, na předpověď počasí?','Už jsem se radoval a pak tohle video. Bez šance.','Video zase rozhodlo proti mně. Jako vždycky.'],
 var_troll:['Nejvíc mě baví, když se sudí jde podívat k monitoru a půlka chatu omdlí 😂'],
 miss_good:['Ufff, to jsem si oddechl. Vedle!','Tohle byla stoprocentní šance a nic. Děkuju, {p}!','Brankář by to nechytil, ale {p} to naštěstí trefil do tribuny.'],
 miss_bad:['Jak tohle mohl {p} nedat?! Tutovka!','Z metru vedle… {p}, ty mě zabiješ.','Taková šance! Kdyby to dal, byl by kurz na můj tip pod {lo}.','Moje babička by to dala. A to nehraje fotbal.'],
 post_good:['Tyč! Bůh je dneska se mnou.','Břevno! Tohle bylo o milimetry, srdce mi stálo.','Tyčka… dobře, beru jako znamení, že to vyjde.'],
 post_bad:['TYČ! Proč?! {p}, o centimetr!','Hliník mě dneska nemá rád. Už druhá šance, co skončila na tyči… nebo mi to tak aspoň přijde.','Břevno. Kdyby to šlo o kousek níž, slavil bych.'],
 save_good:['{k} chytá jak o život! Díky!','Paráda, {k}! Tohle byl zákrok zápasu.','Brankář drží můj tiket nad vodou.'],
 save_bad:['{k} chytá všechno, co jde. Neskutečný.','Jak to {k} mohl chytit? Vždyť už to byl gól!','Ten brankář je dneska zeď. Smůla.'],
 red_good:['Červená! {p} jde ze hřiště a teď už to nemůžou ustát.','Vyloučení! Kurz na můj tip právě spadl na {lo}.','{p} jde do sprchy. Lepší zprávu jsem dneska nedostal.'],
 red_bad:['Červená? Za tohle? Sudí si snad taky vsadil!','{p}, ty hlupáku. Deset proti jedenácti a já s nimi.','Vyloučení… tak teď to bude utrpení.'],
 red_troll:['Červená a půlka chatu už píše stížnost na svaz 😂'],
 yel:['Žlutá karta: {p}. Teď musí hrát opatrně.','{p} už má žlutou, ještě jednu a je ze hry.','Rozhodčí vytahuje karty jak na trhu.','Žlutá? Za tohle by u nás v okresu nepískli ani faul.'],
 inj:['Zranění, {p} nemůže dál. To je rána.','Chudák {p}, snad to není nic vážného.','Nosítka, {p} končí… tohle zamíchá kartami.'],
 inj_bad:['{p} zraněný? Byl to náš nejlepší hráč! Tiket se klepe.'],
 sub:['Střídání: {pin} za {pout}. Zajímavý tah.','{pout} jde ven? Vždyť byl nejaktivnější.','Konečně {pin}, na něj čekám celý zápas.','Trenér stahuje {pout}. Asi ví víc než my.'],
 ht_good:['Poločas {score}. Zatím to vypadá dobře, jdu si pro pivo.','Pauza a tiket žije. {score}, kurz {lo}.','Půlka hotová, {score}. Ještě 45 minut a jsem v plusu.'],
 ht_bad:['Poločas {score}. Druhou půli prosím úplně jinak.','{score} do šaten. Potřebuju zázrak, nebo aspoň dva panáky.','Poločas a já v mínusu. Kurz na můj tip {lo}.'],
 ht_neu:['Poločas {score}. Zatím nic rozhodnutého.','{score} v poločase, střely {sh}. Druhá půle rozhodne.','Pauza. Kdo si přisazuje? Já zatím ne.'],
 ht_stat:['Statistika poločasu: střely {sh}, očekávané góly {xg}. Skóre {score} úplně neodpovídá hře.','Poločas {score}. Podle čísel to má být spíš {xg}.'],
 et:['Prodloužení! Moje nervy na tohle nejsou stavěné.','Třicet minut navíc. Sázky na základní dobu jsou stejně rozhodnuté, ale napětí trvá.','Prodloužení… jdu pro další kafe.'],
 pso:['Penalty! Tady už rozhoduje jen štěstí.','Penaltový rozstřel, nedívám se. Řekněte mi, jak to dopadlo.','Rozstřel! Brankáři, teď je to na tobě.'],
 late_good:['Posledních pár minut. Hlavně nic nepokazte!','Už jen odkopávat. Klidně do tribuny!','Rozhodčí, píšťalku do pusy, prosím!','Ještě chvilku… ještě chvilku… a peníze jsou doma.'],
 late_bad:['Potřebuju gól. Jeden jediný. Nebo zázrak.','Posledních pár minut a já pořád v mínusu.','Ještě je šance, ještě je šance… nebo není?','Útok, útok! Všichni dopředu, i brankář!'],
 odds:['Kurzy lítají: domácí {lh}, remíza {lx}, hosté {la}.','Sázkovka právě přepsala kurzy, na domácí už jen {lh}.','Můj tip je teď za {lo}. Nevím, jestli se mám smát, nebo brečet.','Domácí {lh}, hosté {la}. Před zápasem to vypadalo úplně jinak.'],
 amb_good:['Takhle si to užívám. Tiket v pohodě, pivo studené.','Zatím to jde podle plánu. Kurz na můj tip {lo}.','Krásný večer. Hlavně to nezakřiknout.','Hrají přesně tak, jak jsem si to představoval.'],
 amb_bad:['Tohle je utrpení. {score} a nic se neděje.','Ještě jednou budu sázet na tenhle tým a smažu si účet.','Kurz na můj tip {lo}. To znamená, že tomu nevěří ani sázkovka.','Kdyby hráli s takovým zápalem, jako já sázím…'],
 amb_neu:['Zatím takové oťukávání, nic moc.','{score}, střely {sh}. Čekám, kdo první zariskuje.','Hraje se hlavně ve středu hřiště, nuda.','Kdo se dívá taky v hospodě? U nás je narváno.'],
 amb_stat:['Střely {sh}, očekávané góly {xg}. Čísla zatím odpovídají mému tipu.','Držení míče je vyrovnané, ale z čísel je vidět, kdo je nebezpečnější: {xg}.','Zajímavost: v {min}. minutě padá v téhle lize nejvíc gólů. Jen tak na okraj.'],
 amb_troll:['Ticho tady. Asi všichni počítáte, kolik prohrajete 😏','Koukám, že tipaři na {h} nějak zmlkli.','Já bych na vašem místě už teď mazal aplikaci.'],
 amb_nov:['Můžu se zeptat, co znamená kurz {lo}? Že je to dobře, nebo špatně?','Je normální, že mám takovou trému z tiketu?','Takže když padne ještě gól, tak… počkat, musím si to spočítat.'],
 amb_vet:['Mladí, nesázejte nikdy víc, než můžete prohrát. Rada zdarma.','Viděl jsem tisíc takových zápasů. Rozhodne to standardka.','Klid, trpělivost, čaj. Tak se sází.'],
 amb_fan:['{c} do toho, hrajte dopředu!','Kotel zpívá, slyším to až sem. {c}!','Nechápu, proč trenér nestřídá. Takhle to nepůjde.'],
 amb_pes:['Stejně to nějak pokazí, uvidíte.','Ještě nedostali gól, ale přijde, vždycky přijde.','Mám pocit, že sázkovka ví něco, co já ne.'],
 amb_opt:['Neboj, ještě to otočí! Vždycky to otočí!','Čím déle to trvá, tím sladší bude výhra.','Já věřím, ať se děje cokoliv.'],
 ako_bust:['Tak a je to. V jiném zápase mi nevyšel tip {leg} a moje AKO je v háji.','AKO padlo, tip {leg} nevyšel. Takový dobrý kurz… škoda mluvit.','Tip {leg} mi zbořil celé AKO. Teď už fandím jen pro radost.','Kdo vymyslel AKO o {legs} zápasech? Aha, já. Tip {leg} nevyšel.'],
 ako_alive:['AKO pořád žije! Všech {legs} zápasů zatím sedí.','Tip {leg} už vyšel, AKO stojí jen na tomhle zápase. Nervy!','Všechno ostatní z AKO už vyšlo. Teď jen tenhle zápas a beru {win}.'],
 cashout:['Vybral jsem to předčasně za {co}. Radši vrabce v hrsti.','Stáhl jsem sázku předčasně, beru {co}. Nervy mám jen jedny.','Předčasné vyplacení za {co}. Kdo chce, ať se trápí do konce.'],
 co_regret:['A samozřejmě to vyšlo. Kdybych nevybíral předčasně, mám {win}. Sakra.','Vybral jsem to předčasně a teď koukám, jak by mi to vyšlo celé.'],
 co_glad:['Jak dobře, že jsem to vybral předčasně! Mít {co} je lepší než nic.','Předčasný výběr mi zachránil večer. Tiket by prohrál.'],
 ft_good:['Konec! Tiket vyšel, {stake} krát {odds} je {win}!','Máme to! Dneska platím rundu.','Vyšlo to! Tip {tip} nezklamal. Jdu slavit.','Peníze doma. Takhle se sází, pánové.','Závěrečný hvizd a já jsem o {win} bohatší!'],
 ft_bad:['Tak tohle mě stálo {stake}. Příště jinak.','Prohraný tiket. Už nikdy nesázím… do zítřka.','Konec. Tip {tip} mě dneska zradil.','Nevadí, zítra je další zápas. Ale stejně to bolí.','{score}. Nic dalšího k tomu nemám.'],
 ft_good_nov:['Vyhrál jsem první tiket v životě! Je to tak snadné?','Já to dal! Tak a teď už jsem profík.'],
 ft_bad_nov:['Tak to bylo poučné. Už chápu, proč máma říkala, ať nesázím.'],
 ft_good_vet:['Hotovo. Malý zisk, čisté svědomí. Dobrou noc, pánové.'],
 ft_bad_vet:['Taky se to stává. Kdo neumí prohrávat, nemá sázet.'],
 ft_good_troll:['Vyhrál jsem a vy ne. Krásný večer 😏'],
 ft_bad_pes:['Říkal jsem to. Od začátku jsem to říkal.'],
 ft_good_pes:['Vyhrál jsem? Asi se mi to zdá. To se mi nikdy nestává.'],
 scandal:['Hlavně ať zase někdo nenosí rozhodčímu obálky. Prý se to u {me} řešilo 😏','Po tom skandálu s obálkou se na rozhodčí v zápasech {me} dívám úplně jinak.','Koukám na sudího a přemýšlím, jestli dneska něco nedostal od lidí z {me}.','Svaz prý teď trenéry z {me} hlídá. Já bych taky.'],
 r_agree:['@{to} přesně! Mám to stejně.','@{to} drž se, jsme v tom spolu.','@{to} souhlas, dneska to vyjde.','@{to} tohle podepisuju.','@{to} my dva to dneska vyhrajeme, uvidíš.'],
 r_banter:['@{to} brzo se radovat, kamaráde. Zápas ještě neskončil.','@{to} tvůj tiket bude za chvíli v koši, věř mi.','@{to} tak uvidíme na konci, kdo bude platit rundu.','@{to} kdo se směje naposled…','@{to} klidně si to užij, dlouho to trvat nebude.'],
 r_troll:['@{to} a tomu se říká tipař? 😂','@{to} já bych ti radši poslal na ten tiket pár drobných na kapesníky.','@{to} piš, piš, pobavíš celý chat.','@{to} kdo ti radil? Kamarád z hospody?'],
 r_vet:['@{to} klid, chlapče. Kdo panikaří, prohrává.','@{to} nikdy nesázej srdcem, sázej hlavou.','@{to} za tohle bych dal maximálně polovinu vkladu.'],
 r_nov:['@{to} kurz {lo} znamená, že za každou stovku bys teď dostal {lo}krát víc. Zatím dobrý.','@{to} vítej v klubu. Hlavně nesázej víc, než unese peněženka.','@{to} neboj, první tiket vždycky bolí, i když vyjde.'],
 r_pes:['@{to} to nezakřikni, prosím tě.','@{to} radost předčasná, vím, o čem mluvím.']
};
function chSurn(id){const p=P(id);return p?pSurname(p):'hráč';}
function chProbs(M,sc){const tot=M.et?120:90;const rem=Math.max(0,tot-M.min)/90;const xh=(M.xg?M.xg[0]:1.3)*rem,xa=(M.xg?M.xg[1]:1.1)*rem;const pf=(l,k)=>{let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f;};
 const s=sc||M.score;const r={'1':0,'X':0,'2':0,o25:0,u25:0,gg:0,ng:0};let t=0;
 for(let i=0;i<8;i++)for(let j=0;j<8;j++){const p=pf(xh,i)*pf(xa,j);t+=p;const a=s[0]+i,b=s[1]+j;if(a>b)r['1']+=p;else if(a===b)r.X+=p;else r['2']+=p;if(a+b>2)r.o25+=p;else r.u25+=p;if(a>0&&b>0)r.gg+=p;else r.ng+=p;}
 for(const k in r)r[k]/=t||1;return r;}
function chOdd(p){return roundOdd(1/(Math.max(0.01,p)*1.07));}
function chTip(M,u){return u.mk==='1'?S.clubs[M.h.cid].n:u.mk==='2'?S.clubs[M.a.cid].n:u.mk==='X'?'remíza':u.mk==='o25'?'víc než 2,5 gólu':u.mk==='u25'?'míň než 2,5 gólu':u.mk==='gg'?'oba týmy dají gól':'aspoň jeden tým bez gólu';}
function chSide(M,u){return u.per==='fanH'?M.h.cid:u.per==='fanA'?M.a.cid:null;}
function chWord(n){return (n||'').split(/\s+/).filter(w=>w.length>2&&!/^(FC|FK|SK|AC|SC|CF|CD|UD|SV|TJ|MFK|SFC|1\.)$/i.test(w))[0]||n;}
function initBetChat(M){const od=matchOdds(M.h.cid,M.a.cid,'live'+M.h.cid);const used=new Set();
 const nick=per=>{if(per==='fanH'||per==='fanA'){const cn=S.clubs[per==='fanH'?M.h.cid:M.a.cid].n;const c=(cn.length<=14?cn:chWord(cn)).replace(/\s+/g,'_').replace(/[^\p{L}\p{N}_]/gu,'');return pick(CH_FAN).replace('{c}',c);}let n;let g=0;do{n=pick(CH_NICK[per]);}while(used.has(n)&&g++<20);used.add(n);return n;};
 const pr=chProbs(M);const fav=pr['1']>=pr['2']?'1':'2';const dog=fav==='1'?'2':'1';
 const pers=['fanH','fanA'].concat(shuffle(['opt','pes','stat','troll','nov','vet'])).concat([pick(['opt','stat','vet','pes'])]);
 const users=pers.map(per=>{let mk;
  if(per==='fanH')mk='1';else if(per==='fanA')mk='2';else if(per==='opt')mk=pick([fav,fav,'o25','gg']);else if(per==='pes')mk=pick([dog,'X','u25']);else if(per==='stat')mk=pr.o25>0.55?'o25':pr.o25<0.45?'u25':pick(['gg','X',fav]);else if(per==='nov')mk=fav;else if(per==='vet')mk=pick(['X',dog,'u25','gg']);else mk=pick(['1','X','2','o25','u25','gg']);
  const st={nov:[20,150],vet:[100,600],opt:[200,1500],pes:[50,400],stat:[150,800],troll:[50,500],fanH:[100,900],fanA:[100,900]}[per];
  const u={n:nick(per),per,mk,stake:Math.round(rnd(st[0],st[1])/10)*10,odds:od[mk]||2,mood:0,last:-9,co:0};
  if((per==='opt'||per==='vet'||per==='troll')&&RNG()<0.5){const L=S.leagues[myClub().lg];const pool=(L?L.clubs:Object.keys(S.clubs)).filter(id=>id!==M.h.cid&&id!==M.a.cid);const legs=rint(3,6);u.ako={legs,leg:S.clubs[pick(pool)]?S.clubs[pick(pool)].n:'soupeř',bust:RNG()<0.45?rint(15,88):0,said:0};u.odds=Math.round(u.odds*rnd(3,12)*100)/100;}
  return u;});
 users.forEach(u=>u.p=chProbs(M)[u.mk]);
 MS.chat={lines:[],users,used:{},mc:{},lh:chOdd(pr['1'])};
 const C=MS.chat;const ss=shuffle(users.slice());[0,1,2].forEach(i=>{if(i<2||RNG()<0.7)chSay(M,ss[i],ss[i].ako?'start_ako':'start',{},true);});
 if(M.wx&&CH['wx_'+M.wx.k]&&RNG()<0.75)chSay(M,pick(users),'wx_'+M.wx.k);
 const me=myClub();if(S.scandal&&S.scandal.s===S.season&&RNG()<0.6)chSay(M,users.find(u=>u.per==='troll')||pick(users),'scandal',{me:me.n});}
function chPool(u,key){const out=[];const base=CH[key]||[];base.forEach((t,i)=>out.push([key+'#'+i,t]));
 const pk=u.per==='fanH'||u.per==='fanA'?'fan':u.per;const sp=CH[key+'_'+pk];if(sp)sp.forEach((t,i)=>{out.push([key+'_'+pk+'#'+i,t]);out.push([key+'_'+pk+'#'+i,t]);});
 if(key==='start'&&CH['start_'+pk]){CH['start_'+pk].forEach((t,i)=>{for(let r=0;r<3;r++)out.push(['start_'+pk+'#'+i,t]);});}
 return out;}
function chSay(M,u,key,extra,force){const C=MS&&MS.chat;if(!C||!u||S.settings.betChat===false)return null;const m=M.min;C.mc[m]=(C.mc[m]||0);if(!force&&C.mc[m]>=3)return null;
 let pool=chPool(u,key);if(!pool.length)return null;let fr=pool.filter(x=>!C.used[x[0]]);if(!fr.length){pool.forEach(x=>delete C.used[x[0]]);fr=pool;}
 const [id,t]=pick(fr);C.used[id]=1;const pr=chProbs(M);const lo=chOdd(pr[u.mk]);const lo3=[chOdd(pr['1']),chOdd(pr.X),chOdd(pr['2'])];const st=M.stats||[{},{}];
 const side=chSide(M,u);const d=Object.assign({tip:chTip(M,u),stake:fmtMoney(u.stake),odds:czOdd(u.odds),win:fmtMoney(Math.round(u.stake*u.odds)),score:M.score[0]+':'+M.score[1],min:m,lo:czOdd(lo),lh:czOdd(lo3[0]),lx:czOdd(lo3[1]),la:czOdd(lo3[2]),
  h:S.clubs[M.h.cid].n,a:S.clubs[M.a.cid].n,c:side?S.clubs[side].n:S.clubs[M.h.cid].n,xg:fmtXg(st[0].xg)+' : '+fmtXg(st[1].xg),xgh:fmtXg(M.xg?M.xg[0]:1.3),xga:fmtXg(M.xg?M.xg[1]:1.1),sh:(st[0].sh||0)+':'+(st[1].sh||0),legs:u.ako?u.ako.legs:3,leg:u.ako?u.ako.leg:'',co:fmtMoney(u.co||0),me:myClub().n},extra||{});
 let tx=t.replace(/\{(\w+)\}/g,(_,k)=>d[k]!=null?d[k]:'');tx=tx.charAt(0).toUpperCase()+tx.slice(1);C.mc[m]++;u.last=m;C.lines.push({m:String(minLbl(M))+"'",n:u.n,per:u.per,t:tx});if(C.lines.length>60)C.lines.shift();return u;}
function fmtXg(x){return (Math.round((x||0)*10)/10).toFixed(1).replace('.',',');}
function chReply(M,u0,pr){const C=MS.chat;if(RNG()>(pr||0.38))return;const others=C.users.filter(x=>x!==u0&&!x.co);if(!others.length)return;const r=pick(others);
 const s0=chBen(M,u0,0),s1=chBen(M,r,0);let key;
 if(r.per==='troll')key='r_troll';else if(u0.per==='nov'&&(r.per==='vet'||r.per==='stat'))key='r_nov';else if(r.per==='vet'&&RNG()<0.6)key='r_vet';else if(r.per==='pes'&&RNG()<0.5)key='r_pes';else key=(s0>0)===(s1>0)?'r_agree':'r_banter';
 chSay(M,r,key,{to:u0.n});}
// o kolik by se zlepšila šance tipu, kdyby skórovala strana s
function chBen(M,u,s){const sc=M.score.slice();sc[s]++;return chProbs(M,sc)[u.mk]-chProbs(M)[u.mk];}
function chMoodKey(u,p){return p>0.62?'good':p<0.33?'bad':'neu';}
function chOnEvent(M,e){const C=MS.chat;const U=C.users.filter(u=>!u.co);const live=U.length?U:C.users;const late=M.min>=85;
 const bySign=(s)=>{const g=[],b=[];live.forEach(u=>{const v=chBen(M,u,s);if(v>0.03)g.push(u);else if(v<-0.03)b.push(u);});return [g,b];};
 if(e.t==='goal'){const pen=C.pen===e.s&&C.penM>=M.min-1;C.pen=null;const pid=e.p;const ex={p:chSurn(pid)+(e.og?' (vlastní gól)':''),tm:S.clubs[M.sides[e.s].cid].n};
  const now=chProbs(M);const ranked=live.map(u=>({u,d:now[u.mk]-u.p})).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  const goods=ranked.filter(x=>x.d>0.03),bads=ranked.filter(x=>x.d<-0.03);
  const kg=pen?'pengoal_good':late?'lategoal_good':'goal_good',kb=pen?'pengoal_bad':late?'lategoal_bad':'goal_bad';
  let first=null;if(goods.length){first=chSay(M,goods[0].u,kg,ex,true);}
  if(bads.length&&RNG()<0.85){const b=chSay(M,bads[0].u,kb,ex,true);if(!first)first=b;}
  if(!first)first=chSay(M,pick(live),'goal_neu',ex,true);
  if(goods.length>1&&RNG()<0.35)chSay(M,goods[1].u,kg,ex);
  if(first)chReply(M,first,0.45);
  goods.concat(bads).forEach(x=>x.u.mood+=x.d>0?1:-1);return;}
 if(e.t==='pen'){C.pen=e.s;C.penM=M.min;const [g,b]=bySign(e.s);const ex={p:chSurn(e.p),tm:S.clubs[M.sides[e.s].cid].n};if(g.length)chSay(M,pick(g),'pen_good',ex,true);if(b.length&&RNG()<0.8)chSay(M,pick(b),'pen_bad',ex,true);return;}
 if((e.t==='miss'||e.t==='save')&&C.pen===e.s&&C.penM>=M.min-1){C.pen=null;const [g,b]=bySign(e.s);const ex={p:chSurn(e.p),k:chSurn(gkOf(M.sides[1-e.s]))};if(b.length)chSay(M,pick(b),'penmiss_good',ex,true);if(g.length&&RNG()<0.8)chSay(M,pick(g),'penmiss_bad',ex,true);return;}
 if(e.t==='var'){const [g,b]=bySign(e.s);const vp=e.vg?'vargoal':'var';if(b.length)chSay(M,pick(b),vp+'_good',{},true);if(g.length)chSay(M,pick(g),vp+'_bad',{},true);const tr=live.find(u=>u.per==='troll');if(tr&&RNG()<0.4)chSay(M,tr,'var_troll');return;}
 if(e.t==='post'||e.t==='miss'||e.t==='save'){const prb=e.t==='post'?0.6:e.t==='save'?0.22:0.18;if(RNG()>prb)return;const [g,b]=bySign(e.s);const ex={p:chSurn(e.p),k:chSurn(gkOf(M.sides[1-e.s]))};
  const kind=e.t;if(g.length&&(RNG()<0.6||!b.length))chSay(M,pick(g),kind+'_bad',ex);else if(b.length)chSay(M,pick(b),kind+'_good',ex);return;}
 if(e.t==='red'){const [g,b]=bySign(1-e.s);const ex={p:chSurn(e.p)};if(g.length)chSay(M,pick(g),'red_good',ex,true);if(b.length)chSay(M,pick(b),'red_bad',ex,true);const tr=live.find(u=>u.per==='troll');if(tr&&RNG()<0.3)chSay(M,tr,'red_troll');return;}
 if(e.t==='yel'){if(RNG()<0.1)chSay(M,pick(live),'yel',{p:chSurn(e.p)});return;}
 if(e.t==='inj'){if(RNG()<0.55){const [g]=bySign(e.s);const fan=g.find(u=>u.per==='fanH'||u.per==='fanA');chSay(M,fan&&RNG()<0.5?fan:pick(live),fan&&RNG()<0.5?'inj_bad':'inj',{p:chSurn(e.p)});}return;}
 if(e.t==='sub'){if(e.pin&&RNG()<0.14)chSay(M,pick(live),'sub',{pin:chSurn(e.pin),pout:chSurn(e.pout)});return;}
 if(e.t==='ht'){const sp=shuffle(live.slice()).slice(0,2);sp.forEach((u,i)=>chSay(M,u,i===1&&u.per==='stat'?'ht_stat':'ht_'+chMoodKey(u,chProbs(M)[u.mk]),{},true));return;}
 if(e.t==='et'&&!C.et){C.et=1;chSay(M,pick(live),'et',{},true);return;}
 if(e.t==='pso'&&!C.pso){C.pso=1;chSay(M,pick(live),'pso',{},true);return;}
 if(e.t==='ft'&&!C.ft){C.ft=1;chFinal(M);}}
function chFinal(M){const C=MS.chat;const pr=chProbs(M);const won=u=>pr[u.mk]>0.99;
 const ako=C.users.filter(u=>u.ako&&!u.ako.bust);C.users.forEach(u=>{if(u.ako&&u.ako.bust)u.lost=1;});
 const order=shuffle(C.users.slice());let n=0;
 for(const u of order){if(n>=4)break;if(u.lost&&RNG()<0.7)continue;
  if(u.co){chSay(M,u,won(u)?'co_regret':'co_glad',{},true);n++;continue;}
  chSay(M,u,won(u)&&!u.lost?'ft_good':'ft_bad',{},true);n++;}
 const w=order.find(u=>won(u)&&!u.co);if(w)chReply(M,w,0.6);}
function chatOnEvents(M,evs){if(!MS||!MS.chat||S.settings.betChat===false)return;const C=MS.chat;
 for(const e of evs){try{chOnEvent(M,e);}catch(err){}}
 if(M.ended)return;const m=M.min;const pr=chProbs(M);
 // kurzové výkyvy
 const lh=chOdd(pr['1']);if(m>8&&m<86&&(C.on||0)<3&&(lh>C.lh*1.6||lh<C.lh/1.6)){C.lh=lh;C.on=(C.on||0)+1;const aff=C.users.slice().sort((a,b)=>Math.abs(pr[b.mk]-b.p)-Math.abs(pr[a.mk]-a.p))[0];chSay(M,aff,'odds');}
 // AKO
 C.users.forEach(u=>{if(u.ako&&u.ako.bust&&m>=u.ako.bust&&!u.ako.said){u.ako.said=1;chSay(M,u,'ako_bust',{},true);if(RNG()<0.5)chReply(M,u,1);}});
 if(m===70&&!C.ak){C.ak=1;const a=C.users.find(u=>u.ako&&!u.ako.bust);if(a)chSay(M,a,'ako_alive');}
 // předčasný výběr
 if(m>=60&&m%5===0)C.users.forEach(u=>{if(u.co||u.ako)return;const p=pr[u.mk];if(p>0.78&&p<0.97&&(u.per==='pes'||u.per==='nov'||u.per==='opt'&&RNG()<0.3)&&RNG()<0.35){u.co=Math.round(u.stake*u.odds*p*0.9/10)*10;chSay(M,u,'cashout',{},true);if(RNG()<0.5)chReply(M,u,1);}});
 // napínavý závěr
 if(m===83&&!C.late){C.late=1;const g=C.users.filter(u=>!u.co&&pr[u.mk]>0.6),b=C.users.filter(u=>!u.co&&pr[u.mk]<0.4&&pr[u.mk]>0.02);if(g.length)chSay(M,pick(g),'late_good');if(b.length)chSay(M,pick(b),'late_bad');}
 // běžné povídání
 const rate=m<10?0.04:m>75?0.06:0.035;if(RNG()<rate){const cand=C.users.filter(u=>m-u.last>6);const u=pick(cand.length?cand:C.users);const p=pr[u.mk];
  const pk=u.per==='fanH'||u.per==='fanA'?'fan':u.per;const key=RNG()<0.45&&CH['amb_'+pk]?'amb_'+pk:'amb_'+chMoodKey(u,p);const s=chSay(M,u,key);if(s)chReply(M,s,0.3);}
 C.users.forEach(u=>u.p=pr[u.mk]);}
function chatHtml(M){const C=MS&&MS.chat;const lo=chProbs(M);const head=`<div class="card" style="padding:8px 12px"><div class="small mut">Živé kurzy na tento zápas</div><div class="oddrow"><span>1 <b>${M.ended?'—':czOdd(chOdd(lo['1']))}</b></span><span>X <b>${M.ended?'—':czOdd(chOdd(lo.X))}</b></span><span>2 <b>${M.ended?'—':czOdd(chOdd(lo['2']))}</b></span></div><div class="tiny mut">Na zápasy vlastního týmu sázet nesmíš – jen sleduješ, co píšou ostatní.</div></div>`;
 if(S.settings.betChat===false)return head+'<div class="empty">Chat sázkařů je vypnutý v nastavení.</div>';
 if(!C||!C.lines.length)return head+'<div class="empty">Sázkaři zatím mlčí.</div>';
 return head+`<div class="card" style="padding:6px 10px">${C.lines.slice().reverse().map(l=>`<div class="chatl"><span class="tiny mut">${esc(String(l.m))}</span> <b class="cp-${l.per}">${esc(l.n)}</b> <span class="tiny mut">· ${CH_PER[l.per]||''}</span><div>${esc(l.t)}</div></div>`).join('')}</div>`;}

// ===================== v4: zázemí, personál, smlouvy, kabina, kariéra, živé sázky, média =====================
const _v4Data={};
function v4init(){if(!S)return;S.v4=S.v4||{};const V=S.v4;
 if(V.mrep==null){const me=myClub();V.mrep=clamp(Math.round(30+(((me&&me.rep)||60)-50)*0.6),10,80);}
 V.jobs=V.jobs||[];V.lb=V.lb||{};V.hof=V.hof||{};V.career=V.career||{w:0,d:0,l:0,unb:0,best:0,seasons:0,clubs:1};V.ach=V.ach||{};V.intl=V.intl||{};
 S.cl4=S.cl4||{};S.req=S.req||[];
 if(V.pmRefund){S.wallet+=V.pmRefund;addNews('🎲',`Živé sázky z nedokončeného zápasu byly zrušeny, vklad ${fmtMoney(V.pmRefund)} se vrací.`,1);V.pmRefund=0;}
 v4Preload();}
function me4(){S.cl4=S.cl4||{};const k=S.clubId;return S.cl4[k]||(S.cl4[k]={fac:{st:0,pi:0,tr:0,yo:0},build:[],staff:{as:0,sc:0,ph:0,fi:0}});}
function tvW(){const me=myClub();return Math.max(15000,(me&&me.tv)||15000);}
// ----- zázemí -----
const FAC={st:{n:'Stadion',ic:'🏟️',max:5,c:7,wk:5,d:'Každá úroveň přidá zhruba 8 % míst na tribunách.'},pi:{n:'Trávník a zavlažování',ic:'🌱',max:3,c:2.5,wk:2,d:'Doma méně zranění a o něco přesnější kombinace.'},
 tr:{n:'Tréninkové centrum',ic:'🏋️',max:5,c:4,wk:4,d:'Hráči se na tréninku rychleji zlepšují.'},yo:{n:'Akademie mládeže',ic:'🎓',max:5,c:3,wk:4,d:'Z akademie přicházejí talentovanější odchovanci.'}};
function facLv(k){return (me4().fac[k])||0;}
function facCost(k){const l=facLv(k);return Math.round(tvW()*FAC[k].c*(l+1)*Math.pow(1.25,l)/1e4)*1e4;}
function facBuild(k){const c=me4();if(c.build.some(b=>b.k===k)){toast('Tahle stavba už probíhá.');return;}if(facLv(k)>=FAC[k].max){toast('Už je na nejvyšší úrovni.');return;}
 const cost=facCost(k);const me=myClub();if(me.money<cost){toast('Klub na to nemá peníze.');return;}money(-cost,'other',FAC[k].n+': rozšíření');
 const wk=FAC[k].wk+facLv(k);c.build.push({k,left:wk});addNews('🏗️',`Začala stavba: ${FAC[k].n} (úroveň ${facLv(k)+1}). Hotovo za ${wk} ${czPlural(wk,'týden','týdny','týdnů')}.`);saveGame();render();}
// ----- personál -----
const STAFF={as:{n:'Asistent trenéra',ic:'🧑‍🏫',d:'Zlepšuje sehranost a před zápasem radí, jak na soupeře.'},sc:{n:'Skautské oddělení',ic:'🔭',d:'Levnější a přesnější skauting, odhalí skutečný potenciál.'},
 ph:{n:'Fyzioterapeut',ic:'🩺',d:'Zranění hráči se vracejí dřív.'},fi:{n:'Kondiční trenér',ic:'🏃',d:'Rychlejší regenerace a o něco méně zranění v zápasech.'}};
const STAFF_LV=['nikdo','průměrný','zkušený','špičkový'];
function stLv(k){return (me4().staff[k])||0;}
function staffWage(k,l){l=l==null?stLv(k):l;return l?Math.round(tvW()*0.006*Math.pow(l,1.35)/100)*100:0;}
function staffHire(k,l){const c=me4();const cur=stLv(k);if(l===cur)return;const fee=l>cur?staffWage(k,l)*4:0;const me=myClub();if(fee>me.money){toast('Klub na to nemá peníze.');return;}
 if(fee)money(-fee,'other',STAFF[k].n+': podpisový bonus');c.staff[k]=l;addNews(STAFF[k].ic,l?`${STAFF[k].n}: angažován ${STAFF_LV[l]} odborník.`:`${STAFF[k].n}: spolupráce ukončena.`,1);saveGame();render();}
function renderFacilities(){const c=me4();let h=`<div class="card"><h3>🏗️ Zázemí klubu</h3>`;
 for(const k in FAC){const f=FAC[k];const l=facLv(k);const b=c.build.find(x=>x.k===k);
  h+=`<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><div class="row"><span style="font-size:22px">${f.ic}</span><div style="flex:1;min-width:0"><b>${f.n}</b> <span class="tiny mut">úroveň ${l}/${f.max}</span><div class="tiny mut">${f.d}${k==='st'?` Kapacita: ${fmtNum(myClub().cap)} míst.`:''}</div></div></div>
  ${b?`<div class="tiny warn" style="margin-top:4px">🚧 Staví se, hotovo za ${b.left} ${czPlural(b.left,'týden','týdny','týdnů')}.</div>`:l>=f.max?'<div class="tiny good" style="margin-top:4px">Nejvyšší úroveň ✓</div>':`<button class="btn ghost w100" style="margin-top:6px" onclick="facBuild('${k}')">Rozšířit za ${fmtMoney(facCost(k))}</button>`}</div>`;}
 const maint=facMaint();h+=`<div class="tiny mut" style="margin-top:8px">Údržba zázemí: ${fmtMoney(maint)} týdně.</div></div>`;
 h+=`<div class="card"><h3>👥 Realizační tým</h3>`;
 for(const k in STAFF){const s=STAFF[k];const l=stLv(k);
  h+=`<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)"><div class="row"><span style="font-size:22px">${s.ic}</span><div style="flex:1;min-width:0"><b>${s.n}</b> <span class="tiny mut">· ${STAFF_LV[l]}${l?' · '+fmtMoney(staffWage(k))+' týdně':''}</span><div class="tiny mut">${s.d}</div></div></div>
  <div class="seg" style="margin-top:6px">${STAFF_LV.map((n,i)=>`<button class="${l===i?'on':''}" onclick="staffHire('${k}',${i})">${i?['','Průměr','Zkušený','Špička'][i]:'Nikdo'}</button>`).join('')}</div></div>`;}
 return h+`<div class="tiny mut" style="margin-top:8px">Lepší odborník chce vyšší mzdu a při podpisu bonus ve výši čtyř týdenních platů.</div></div>`;}
function facMaint(){const f=me4().fac;let s=0;for(const k in f)s+=f[k];return Math.round(s*tvW()*0.004/100)*100;}
// ----- smlouvy -----
function v4ctr(p){if(!p)return p;if(p.cy==null){p.cy=S.season+1+(hashStr(String(p.id))%4);}if(p.wm==null)p.wm=1;if(p.hap==null)p.hap=62;return p;}
function ctrLabel(p){v4ctr(p);return seasonLabel(p.cy);}
function baseWage(p){return playerWage(p)/(p.wm||1);}
function ctrDemand(p){v4ctr(p);const sq=clubPlayers(S.clubId).sort((a,b)=>b.ovr-a.ovr);const rk=sq.indexOf(p);const age=ageOf(p);
 let f=1.08+(rk>=0&&rk<5?0.22:rk<11?0.12:0)+(age<=24&&p.pot>p.ovr+5?0.1:0)-(age>=32?0.15:0)-((p.hap||60)-60)/250-((S.v4.mrep||50)-50)/400;f=clamp(f,0.85,1.6);
 const w=Math.round(baseWage(p)*f/100)*100;const yrs=age>=32?1:age>=29?2:3;const agent=Math.round(playerValue(p)*(0.04+((hashStr(p.id+'a')%6)/100))/1e3)*1e3;return {w,yrs,agent,f};}
function ctrSheet(id){const p=v4ctr(P(id));if(!p||p.cl!==S.clubId)return;const d=ctrDemand(p);const att=p.ctrTry&&p.ctrTry.r===S.round?p.ctrTry.n:0;
 if(att>=3){modal(`<h2>📝 ${esc(p.n)}</h2><div class="small">Agent hráče dnes další jednání odmítl. Zkus to po příštím kole.</div><button class="btn big" style="margin-top:12px" onclick="closeModal()">Rozumím</button>`);return;}
 const cur=playerWage(p);
 modal(`<h2>📝 Smlouva: ${esc(p.n)}</h2><div class="small mut" style="margin-bottom:8px">Současná smlouva do ${ctrLabel(p)} · mzda ${fmtMoney(cur)} týdně · spokojenost ${hapTxt(p)}</div>
 <div class="card" style="padding:10px 12px"><div class="small">Agent požaduje:</div><div class="small" style="margin-top:4px">• mzda <b>${fmtMoney(d.w)}</b> týdně<br>• délka <b>${d.yrs} ${czPlural(d.yrs,'rok','roky','let')}</b> (do ${seasonLabel(p.cy+d.yrs)})<br>• odměna agentovi <b>${fmtMoney(d.agent)}</b></div></div>
 <button class="btn big gold" onclick="ctrOffer('${id}',1)">Přijmout požadavky</button><div style="height:8px"></div>
 <div class="grid2"><button class="btn ghost" onclick="ctrOffer('${id}',0.92)">Nabídnout −8 %</button><button class="btn ghost" onclick="ctrOffer('${id}',0.82)">Nabídnout −18 %</button></div>
 <div class="tiny mut" style="margin-top:8px">Nižší nabídka může projít, když je hráč v klubu spokojený. Neúspěch ho ale naštve.</div>`);}
function ctrOffer(id,k){const p=v4ctr(P(id));if(!p)return;const d=ctrDemand(p);const me=myClub();if(me.money<d.agent){toast('Klub nemá na odměnu agentovi.');return;}
 const ch=k>=1?1:clamp(0.25+((p.hap||60)-50)/80+(k>0.9?0.3:0)+((S.v4.mrep||50)-50)/200,0.03,0.9);
 if(RNG()<ch){p.cy=p.cy+d.yrs;const nw=Math.round(d.w*k/100)*100;p.wm=Math.max(0.5,nw/Math.max(1,baseWage(p)));money(-d.agent,'other','Odměna agentovi: '+p.n);p.hap=clamp((p.hap||60)+8,0,100);p.ctrWarn=0;
  addNews('📝',`${p.n} prodloužil smlouvu do ${seasonLabel(p.cy)}, mzda ${fmtMoney(playerWage(p))} týdně.`);closeModal();saveGame();render();
  modal(`<div class="c"><div style="font-size:44px">🤝</div><h2>Podepsáno</h2><div class="small">${esc(p.n)} má novou smlouvu do ${seasonLabel(p.cy)}.</div></div><button class="btn big" style="margin-top:12px" onclick="closeModal()">Super</button>`);}
 else{p.ctrTry={r:S.round,n:((p.ctrTry&&p.ctrTry.r===S.round)?p.ctrTry.n:0)+1};p.hap=clamp((p.hap||60)-6,0,100);closeModal();saveGame();
  modal(`<div class="c"><div style="font-size:44px">😤</div><h2>Odmítnuto</h2><div class="small">Agent hráče ${esc(p.n)} tvou nabídku odmítl a hráč je teď méně spokojený.</div></div><button class="btn big" style="margin-top:12px" onclick="closeModal();ctrSheet('${id}')">Jednat znovu</button>`);}}
// ----- spokojenost, kabina, požadavky -----
function hapTxt(p){const h=p.hap==null?62:p.hap;return h>=75?'😄 nadšený':h>=55?'🙂 spokojený':h>=35?'😐 nejistý':'😠 nespokojený';}
function squadRank(){const sq=clubPlayers(S.clubId).sort((a,b)=>b.ovr-a.ovr);const r={};sq.forEach((p,i)=>r[p.id]=i);return r;}
function leaders(){const t=S.tac||{};return clubPlayers(S.clubId).map(p=>({p,s:ageOf(p)*1.2+p.ovr*0.8+((p.car&&p.car.ap)||0)*0.02+(p.caps||0)*0.4+(t.cap===p.id?8:0)})).sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.p);}
function hapWeek(){const rk=squadRank();const ps=clubPlayers(S.clubId);const tm=Math.max(1,...ps.map(p=>p.st?p.st.ap:0));
 for(const p of ps){v4ctr(p);const r=rk[p.id];const exp=r<11?0.75:r<16?0.4:0.15;const act=tm>=3?p.st.ap/tm:exp;
  let tg=58+(act-exp)*55+(p.mor-60)*0.25-(p.cy<S.season+1&&S.round>S.maxRound*0.6?6:0)-(p.prom&&p.prom.r<S.round?8:0);
  p.hap=clamp(Math.round((p.hap+(tg-p.hap)*0.15)*10)/10,0,100);p.mor=clamp(p.mor+(p.hap-p.mor)*0.04,5,100);
  if(p.prom&&S.round>=p.prom.r){if((p.st.ap-p.prom.ap)>=2){p.hap=clamp(p.hap+6,0,100);}else{p.hap=clamp(p.hap-20,0,100);addNews('😠',`${p.n} je naštvaný – slibované minuty nedostal.`);ps.forEach(x=>x.mor=clamp(x.mor-1.5,5,100));}p.prom=null;}
  if(p.hap<28&&r<18&&!S.req.some(q=>q.p===p.id)&&(p.reqR==null||S.round-p.reqR>6)&&!p.loan){p.reqR=S.round;S.req.push({p:p.id,r:S.round,k:r<11?'role':'odchod'});addNews('🗣️',`${p.n} chce mluvit s trenérem: ${r<11?'je nespokojený se svou rolí':'zvažuje odchod z klubu'}.`);}}
 const L=leaders();const lh=L.reduce((s,p)=>s+(p.hap||60),0)/Math.max(1,L.length);
 if(L.some(p=>(p.hap||60)<35))ps.forEach(x=>x.mor=clamp(x.mor-0.8,5,100));if(lh>66)S.cohesion=clamp(S.cohesion+0.5,0,100);if(S.tac&&L.some(p=>p.id===S.tac.cap))S.cohesion=clamp(S.cohesion+0.3,0,100);
 S.req=S.req.filter(q=>P(q.p)&&P(q.p).cl===S.clubId&&S.round-q.r<=6);}
function reqAnswer(i,a){const q=S.req[i];if(!q)return;const p=P(q.p);S.req.splice(i,1);if(!p){render();return;}
 if(a==='min'){p.hap=clamp(p.hap+15,0,100);p.prom={r:S.round+6,ap:p.st.ap};addNews('🗣️',`Slíbil jsi hráči ${p.n} víc minut. Do šesti kol by měl dostat šanci.`,1);}
 else if(a==='list'){p.tl=1;p.hap=clamp(p.hap+10,0,100);addNews('📋',`${p.n} je na přestupové listině.`,1);}
 else{p.hap=clamp(p.hap-10,0,100);if(leaders().includes(p))clubPlayers(S.clubId).forEach(x=>x.mor=clamp(x.mor-2,5,100));addNews('🗣️',`${p.n} odešel z kanceláře nespokojený.`,1);}
 saveGame();render();}
function kabinaHtml(){const L=leaders();const ps=clubPlayers(S.clubId);ps.forEach(v4ctr);const avg=ps.reduce((s,p)=>s+p.hap,0)/Math.max(1,ps.length);const exp=ps.filter(p=>p.cy<S.season+1).length;
 return `<div class="card"><h3>🧑‍🤝‍🧑 Kabina</h3><div class="small">Lídři: ${L.map(p=>`<b>${esc(pSurname(p))}</b> ${hapTxt(p).split(' ')[0]}`).join(', ')}</div>
 <div class="small" style="margin-top:4px">Nálada v kabině: <b class="${avg>=60?'good':avg<40?'bad':''}">${avg>=70?'výborná':avg>=55?'dobrá':avg>=40?'napjatá':'špatná'}</b> (${Math.round(avg)} %)${S.req.length?` · <span class="warn">${S.req.length} ${czPlural(S.req.length,'hráč chce','hráči chtějí','hráčů chce')} mluvit</span>`:''}</div>
 ${exp?`<button class="btn ghost w100" style="margin-top:8px" onclick="ctrList()">📝 Končící smlouvy: ${exp}</button>`:''}<div class="tiny mut" style="margin-top:6px">Nespokojení lídři kazí morálku celého týmu, spokojení zvyšují sehranost.</div></div>`;}
function ctrList(){const ps=clubPlayers(S.clubId).map(v4ctr).filter(p=>p.cy<S.season+1).sort((a,b)=>b.ovr-a.ovr);
 modal(`<h2>📝 Končící smlouvy</h2><div class="small mut" style="margin-bottom:8px">Tihle hráči po sezóně ${seasonLabel(S.season)} odejdou zadarmo, pokud jim smlouvu neprodloužíš.</div>${ps.map(p=>`<div class="pl-row" onclick="closeModal();ctrSheet('${p.id}')">${posB(p.pos)}<div class="nm"><b>${esc(p.n)}</b><small>${ageOf(p)} let · ${hapTxt(p)}</small></div>${ovrB(p.ovr)}</div>`).join('')||'<div class="empty">Nikomu smlouva nekončí.</div>'}`);}
// ----- reprezentace -----
const NAT_T1=['ES','FR','DE','GB-ENG','BR','AR','IT','PT','NL','BE'],NAT_T2=['HR','UY','CO','DK','CH','US','MX','JP','KR','SN','MA','RS','PL','TR','AT','NO','SE','UA','CZ','GB-SCT','EC','NG','CI','GH','CM','DZ','EG','IR','AU','CL','PY'];
function intlWeek(){const mr=S.maxRound;const br=[0.2,0.45,0.72].map(f=>Math.max(2,Math.round(mr*f)));const k=br.indexOf(S.round);if(k<0)return;const key=S.season+'_'+k;if(S.v4.intl[key])return;S.v4.intl[key]=1;
 const out=[];for(const p of clubPlayers(S.clubId)){if(p.inj>0)continue;const th=NAT_T1.includes(p.nat)?79:NAT_T2.includes(p.nat)?72:66;const th2=p.nat===S.cc?th-2:th;
  if(p.ovr>=th2&&RNG()<0.85){out.push(p);p.caps=(p.caps||0)+rint(1,2);p.cond=clamp(p.cond-10,10,100);p.mor=clamp(p.mor+5,5,100);if(RNG()<0.06){p.inj=rint(1,3);addNews('🤕',`${p.n} se zranil na srazu reprezentace a bude chybět ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.`);}}}
 if(out.length){addNews('🌍',`Reprezentační pauza: do národních týmů ${out.length===1?'byl povolán':'byli povoláni'} ${out.slice(0,6).map(p=>p.n+' ('+natName(p.nat)+')').join(', ')}${out.length>6?' a další':''}.`);ach('repre');}
 else addNews('🌍','Reprezentační pauza: z tvého kádru nikdo povolán nebyl.',1);}
// ----- hostování a výkupní klauzule -----
function relClause(p){if(!p||p.cl===S.clubId)return 0;const c=S.clubs[p.cl];if(!c||c.tmp)return 0;const li=leagueInfo(c.lg);const es=li&&li.cc==='ES';if(!es&&hashStr(p.id+'rc')%4)return 0;return Math.round(playerValue(p)*(es?2.2:1.7)*(1+(hashStr(p.id)%10)/10)/1e5)*1e5;}
function payClause(id){const p=P(id);const rc=relClause(p);if(!rc)return;if(!transferWindow()){toast('Přestupové okno je zavřené.');return;}const me=myClub();if(me.money<rc){toast('Na klauzuli nemáš peníze.');return;}
 if(clubPlayers(S.clubId).length>=36){toast('Kádr je plný (max. 36 hráčů).');return;}
 const myRep=me.rep||60;const will=clamp(0.9-Math.max(0,(p.ovr-myRep)-4)*0.08+((S.v4.mrep||50)-50)/250,0.05,0.97);closeModal();
 if(RNG()>will){modal(`<div class="c"><div style="font-size:42px">🤷</div><h2>Hráč odmítl</h2><div class="small mut">Klauzuli bys zaplatil, ale ${esc(p.n)} o přestup nestojí.</div></div><button class="btn big" style="margin-top:12px" onclick="closeModal()">Škoda</button>`);return;}
 const from=S.clubs[p.cl];money(-rc,'tr_out','Výkupní klauzule: '+p.n);from.money+=rc;movePlayer(p,S.clubId);p.mor=80;p.cy=S.season+rint(2,4);p.wm=1;p.hap=75;fansAdd(4);
 addNews('💥',`Bomba! ${p.n} přichází z klubu ${from.n} po zaplacení výkupní klauzule ${fmtMoney(rc)}.`);saveGame();render();toast('Klauzule zaplacena ✓');}
function loanIn(id){const p=P(id);if(!p||p.cl===S.clubId)return;if(!transferWindow()){toast('Přestupové okno je zavřené.');return;}const c=S.clubs[p.cl];if(!c||c.tmp){toast('Hostování jde jen u klubů z tvé země.');return;}
 if(clubPlayers(S.clubId).length>=36){toast('Kádr je plný.');return;}const top=clubPlayers(p.cl).sort((a,b)=>b.ovr-a.ovr).slice(0,5);closeModal();
 if(top.includes(p)){modal(`<div class="c"><div style="font-size:42px">🙅</div><h2>Bez šance</h2><div class="small mut">${esc(c.n)} svou oporu na hostování nepustí.</div></div><button class="btn big" style="margin-top:12px" onclick="closeModal()">Rozumím</button>`);return;}
 const fee=Math.round(playerValue(p)*0.08/1e4)*1e4;const me=myClub();if(me.money<fee){toast('Na poplatek za hostování nemáš.');return;}
 if((me.rep||60)<c.rep-10&&RNG()<0.6){modal(`<div class="c"><div style="font-size:42px">🤷</div><h2>Hráč nemá zájem</h2><div class="small mut">${esc(p.n)} nechce na hostování do slabšího klubu.</div></div><button class="btn big" style="margin-top:12px" onclick="closeModal()">Škoda</button>`);return;}
 money(-fee,'tr_out','Hostování: '+p.n);c.money+=fee;p.loan={from:p.cl,s:S.season,in:1};movePlayer(p,S.clubId);p.mor=75;addNews('🔄',`${p.n} přichází na hostování z klubu ${c.n} do konce sezóny (poplatek ${fmtMoney(fee)}).`);saveGame();render();}
function loanOut(id){const p=P(id);if(!p||p.cl!==S.clubId||p.loan)return;if(!transferWindow()){toast('Přestupové okno je zavřené.');return;}if(clubPlayers(S.clubId).length<=17){toast('Kádr musí mít aspoň 17 hráčů.');return;}
 const cand=Object.keys(S.clubs).filter(id=>id!==S.clubId&&!S.clubs[id].tmp&&!S.clubs[id].b&&Math.abs(S.clubs[id].rep-p.ovr)<=6&&clubPlayers(id).length<30);
 if(!cand.length){toast('O hráče teď nikdo nestojí.');return;}const to=pick(cand);p.loan={from:S.clubId,s:S.season};movePlayer(p,to);
 if(S.tac){S.tac.xi=S.tac.xi.map(x=>x===p.id?null:x);S.tac.bench=S.tac.bench.filter(x=>x!==p.id);}closeModal();
 addNews('🔄',`${p.n} odchází na hostování do klubu ${S.clubs[to].n}. Mzdu platí nový klub a hráč bude sbírat zápasové minuty.`);saveGame();render();}
function loansReturn(){for(const id in S.players){const p=S.players[id];if(!p.loan)continue;const back=p.loan.from;const was=p.cl;delete p.loan;
  if(S.clubs[back]){movePlayer(p,back);if(back===S.clubId)addNews('🔙',`${p.n} se vrací z hostování (${S.clubs[was]?S.clubs[was].n:''}).`,1);else if(was===S.clubId)addNews('🔙',`${p.n} se po hostování vrací do klubu ${S.clubs[back].n}.`,1);}}
 if(S.tac){S.tac.xi=S.tac.xi.map(x=>P(x)&&P(x).cl===S.clubId?x:null);S.tac.bench=S.tac.bench.filter(x=>P(x)&&P(x).cl===S.clubId);}}
// ----- souboj o hráče -----
function bidWar(id,fee){const p=P(id);if(!p||p.cl===S.clubId)return false;const me=myClub();if(p.ovr<(me.rep||60)-4||RNG()>0.28)return false;
 const rv=Object.keys(S.clubs).filter(k=>k!==S.clubId&&k!==p.cl&&!S.clubs[k].tmp&&S.clubs[k].rep>=(me.rep||60)-8&&S.clubs[k].money>fee*1.3);if(!rv.length)return false;
 const r=S.clubs[pick(rv)];const their=Math.round(fee*rnd(1.08,1.25)/1e4)*1e4;const top=Math.round(their*1.05/1e4)*1e4;closeModal();
 modal(`<div class="c"><div style="font-size:42px">⚔️</div><h2>Souboj o hráče</h2><div class="small">O hráče ${esc(p.n)} se přihlásil i klub <b>${esc(r.n)}</b> a nabízí ${fmtMoney(their)}.</div></div>
 <div style="height:12px"></div><button class="btn big gold" onclick="UI._bw=1;makeBid('${id}',${top})">Přeplatit na ${fmtMoney(top)}</button><div style="height:8px"></div><button class="btn ghost w100" onclick="bidLost('${id}','${r.id}',${their})">Stáhnout se</button>`,{noClose:true});return true;}
function bidLost(id,rid,fee){closeModal();const p=P(id);const r=S.clubs[rid];if(p&&r&&r.money>=fee&&S.clubs[p.cl]){S.clubs[p.cl].money+=fee;r.money-=fee;const from=S.clubs[p.cl].n;movePlayer(p,rid);addNews('🔁',`${p.n} nakonec míří do klubu ${r.n} (${from} → ${r.n}) za ${fmtMoney(fee)}.`);}saveGame();render();}
// ----- den uzávěrky -----
function deadlineWeek(){const half=Math.floor(S.maxRound/2);if(S.round!==3&&S.round!==half+1)return;
 addNews('📺','Den uzávěrky přestupů! Kluby na poslední chvíli doplňují kádry, okno se po tomto týdnu zavírá.');
 for(let i=0;i<4;i++)aiTransfers();
 const mine=clubPlayers(S.clubId).filter(p=>p.inj<=0&&!p.loan);if(mine.length>17){const n=RNG()<0.5?2:1;
  for(let k=0;k<n;k++){const p=wpick(mine,x=>Math.pow(x.ovr/60,5)*(x.tl?3:1));if(!p||S.offers.some(o=>o.p===p.id))continue;const others=Object.keys(S.clubs).filter(id=>id!==S.clubId&&!S.clubs[id].tmp&&S.clubs[id].rep>=p.ovr-6);
   const buyer=others.length?pick(others):null;const fee=Math.round(playerValue(p)*rnd(1.1,1.5)/1e4)*1e4;S.offers.push({id:'o'+Date.now()+rint(0,999),p:p.id,buyer,bn:buyer?S.clubs[buyer].n:foreignClubName(p),fee,r:S.round,dl:1});
   addNews('⏰',`Nabídka na poslední chvíli: ${p.n} za ${fmtMoney(fee)}. Rozhodni se ještě tento týden!`);}}
 // výkupní klauzule u tvých hráčů (jen klauzule ze španělských soutěží)
 if(S.cc==='ES'){const stars=clubPlayers(S.clubId).filter(p=>p.ovr>=78&&!p.loan);for(const p of stars){if(RNG()>0.05)continue;const rc=Math.round(playerValue(p)*2.2/1e5)*1e5;
   const rich=Object.keys(S.clubs).filter(id=>id!==S.clubId&&S.clubs[id].money>rc*1.2&&S.clubs[id].rep>=p.ovr-4);if(!rich.length)continue;const b=S.clubs[pick(rich)];b.money-=rc;money(rc,'tr_in','Výkupní klauzule: '+p.n);movePlayer(p,b.id);
   if(S.tac){S.tac.xi=S.tac.xi.map(x=>x===p.id?null:x);S.tac.bench=S.tac.bench.filter(x=>x!==p.id);}fansAdd(-6);addNews('💥',`Šok! ${b.n} zaplatil výkupní klauzuli ${fmtMoney(rc)} a ${p.n} odchází.`);break;}}}
// ----- reputace, nabídky práce, úspěchy, síň slávy -----
function mrepTxt(){const r=S.v4.mrep;return r>=85?'světová hvězda':r>=70?'uznávaný trenér':r>=55?'respektovaný':r>=40?'slibný':r>=25?'neznámý':'zkrachovalý';}
function jobsGen(n){const me=myClub();const mx=45+S.v4.mrep*0.55;const ids=Object.keys(S.clubs).filter(id=>id!==S.clubId&&!S.clubs[id].tmp&&!S.clubs[id].b&&S.clubs[id].rep>(me.rep||60)&&S.clubs[id].rep<=mx&&!S.v4.jobs.some(j=>j.id===id));
 shuffle(ids).slice(0,n).forEach(id=>{S.v4.jobs.push({id,s:S.season,r:S.round});addNews('📨',`Nabídka práce: ${S.clubs[id].n} (${leagueLabel(S.clubs[id].lg)}) by tě rád viděl na lavičce.`);});}
function jobTake(i){const j=S.v4.jobs[i];if(!j||!S.clubs[j.id])return;const old=myClub().n;S.v4.jobs=[];S.v4.career.clubs=(S.v4.career.clubs||1)+1;S.req=[];takeClub(j.id);addNews('👋',`${S.manager} odchází z klubu ${old}.`);}
function jobDecline(i){const j=S.v4.jobs[i];S.v4.jobs.splice(i,1);if(j&&S.clubs[j.id])addNews('📨',`Nabídku z klubu ${S.clubs[j.id].n} jsi odmítl. Vedení si toho cení.`,1);S.boardTrust=clamp(S.boardTrust+3,0,100);saveGame();render();}
const ACH={vyhra1:['🥇','První výhra','Vyhraj první soutěžní zápas.'],vyhry50:['🎖️','Padesát výher','Dosáhni 50 výher v kariéře.'],kanonada:['💥','Kanonáda','Vyhraj o pět a více gólů.'],derby:['🔥','Král derby','Vyhraj derby.'],
 neporaz:['🛡️','Neporazitelní','Odehraj 10 zápasů v řadě bez porážky.'],trofej:['🏆','První trofej','Získej jakoukoli trofej.'],mistr:['👑','Mistr ligy','Vyhraj ligu.'],postup:['⬆️','Postup','Postup do vyšší soutěže.'],
 pohar:['🏆','Pohárový král','Vyhraj domácí pohár.'],evropa:['⭐','Mezi elitou','Zahraj si skupinovou fázi kontinentální soutěže.'],sezony5:['📅','Věrný trenér','Odtrénuj pět sezón.'],sazkar:['🎲','Šťastná ruka','Vyhraj sázku za 10 000 € a víc.'],
 vyprodano:['🎟️','Vyprodáno','Hraj doma před plným stadionem.'],odchovanec:['🎓','Vlastní odchovanec','Odchovanec dá gól za první tým.'],repre:['🌍','Reprezentanti','Tvůj hráč dostane pozvánku do národního týmu.'],stavitel:['🏗️','Stavitel','Rozšiř zázemí klubu.'],
 skandal:['🧾','Hanba','Nech se chytit při podplácení rozhodčího.']};
function ach(k){if(!S.v4||S.v4.ach[k])return;S.v4.ach[k]=S.season;const a=ACH[k];if(a)addNews('🏅',`Úspěch odemčen: ${a[1]} – ${a[2]}`);}
function hofAdd(){for(const p of clubPlayers(S.clubId)){if(!p.st||!p.st.ap)continue;const h=S.v4.hof[p.id]||(S.v4.hof[p.id]={n:p.n,g:0,ap:0,as:0,s:0,c:''});h.n=p.n;h.g+=p.st.g||0;h.ap+=p.st.ap||0;h.as+=p.st.as||0;h.s++;h.c=myClub().n;}
 const e=Object.entries(S.v4.hof);if(e.length>80){e.sort((a,b)=>(b[1].g*3+b[1].ap)-(a[1].g*3+a[1].ap));S.v4.hof=Object.fromEntries(e.slice(0,80));}}
function renderCareer(){const V=S.v4;const C=V.career;const tr=S.trophies||[];
 let h=`<div class="card"><h3>🧑‍💼 ${esc(S.manager)}</h3><div class="row small"><span>Reputace: <b>${Math.round(V.mrep)}</b> / 100 · ${mrepTxt()}</span></div><div class="bar" style="margin-top:6px"><i style="width:${V.mrep}%"></i></div>
 <div class="grid3" style="margin-top:10px"><div class="tile"><div class="k">Výhry</div><div class="v good">${C.w}</div></div><div class="tile"><div class="k">Remízy</div><div class="v">${C.d}</div></div><div class="tile"><div class="k">Prohry</div><div class="v bad">${C.l}</div></div></div>
 <div class="tiny mut" style="margin-top:6px">Nejdelší série bez porážky: ${C.best} · kluby v kariéře: ${C.clubs||1}. Vyšší reputace přiláká lepší nabídky práce i hráče.</div></div>`;
 h+=`<div class="card"><h3>🏆 Vitrína trofejí</h3>${tr.length?tr.slice().reverse().map(t=>`<div class="row small" style="padding:4px 0"><span>🏆</span><span style="flex:1">${esc(t.t)}</span><span class="mut">${seasonLabel(t.s)}</span></div>`).join(''):'<div class="small mut">Vitrína je zatím prázdná.</div>'}</div>`;
 const hs=(S.history||[]);h+=`<div class="card"><h3>📜 Historie sezón</h3>${hs.length?`<table class="tbl"><tr><th>Sezóna</th><th class="l">Soutěž</th><th>Místo</th><th>B</th></tr>${hs.map(r=>`<tr style="cursor:default"><td>${seasonLabel(r.season)}</td><td class="nm">${esc(leagueLabel(r.lg))}</td><td>${r.pos}.</td><td class="b">${r.pts}</td></tr>`).join('')}</table>`:'<div class="small mut">První sezóna právě běží.</div>'}</div>`;
 const hof=Object.values(V.hof).sort((a,b)=>(b.g*3+b.ap)-(a.g*3+a.ap)).slice(0,10);
 h+=`<div class="card"><h3>🌟 Síň slávy</h3>${hof.length?hof.map((x,i)=>`<div class="row small" style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span class="mut" style="width:18px">${i+1}.</span><span style="flex:1;min-width:0"><b>${esc(x.n)}</b> <span class="mut">· ${esc(x.c)}</span></span><span>${x.ap} záp. · ${x.g} gólů</span></div>`).join(''):'<div class="small mut">Po první sezóně se sem zapíšou tvoji nejlepší hráči.</div>'}</div>`;
 const got=Object.keys(ACH).filter(k=>V.ach[k]).length;
 h+=`<div class="card"><h3>🏅 Úspěchy ${got}/${Object.keys(ACH).length}</h3>${Object.entries(ACH).map(([k,a])=>`<div class="row small" style="padding:4px 0;opacity:${V.ach[k]?1:0.45}"><span style="font-size:18px">${V.ach[k]?a[0]:'🔒'}</span><span style="flex:1"><b>${a[1]}</b><div class="tiny mut">${a[2]}</div></span>${V.ach[k]?`<span class="tiny mut">${seasonLabel(V.ach[k])}</span>`:''}</div>`).join('')}</div>`;
 return h;}
// ----- týdenní a sezónní háčky -----
function v4Week(){if(!S.v4)v4init();const c=me4();
 c.build.forEach(b=>b.left--);c.build.filter(b=>b.left<=0).forEach(b=>{c.fac[b.k]=(c.fac[b.k]||0)+1;if(b.k==='st'){const me=myClub();me.cap=Math.round(me.cap*1.08/100)*100;}addNews('🏗️',`Hotovo: ${FAC[b.k].n} je na úrovni ${c.fac[b.k]}.${b.k==='st'?' Stadion má nově '+fmtNum(myClub().cap)+' míst.':''}`);ach('stavitel');});c.build=c.build.filter(b=>b.left>0);
 const cost=facMaint()+Object.keys(STAFF).reduce((s,k)=>s+staffWage(k),0);if(cost>0)money(-cost,'wages','Realizační tým a údržba zázemí');
 S.cohesion=clamp(S.cohesion+0.35*stLv('as'),0,100);
 for(const p of clubPlayers(S.clubId)){if(p.inj>0&&RNG()<0.22*stLv('ph'))p.inj--;p.cond=clamp(p.cond+2*stLv('fi'),0,100);}
 for(const id in S.players){const p=S.players[id];if(p.loan&&p.loan.from===S.clubId&&ageOf(p)<=24)p._xp=(p._xp||0)+0.05;}
 hapWeek();intlWeek();deadlineWeek();
 const exp=clubPlayers(S.clubId).filter(p=>p.cy<S.season+1&&!p.loan);if(S.round===Math.max(1,S.maxRound-8)&&exp.length)addNews('📝',`Končící smlouvy: ${exp.slice(0,5).map(p=>p.n).join(', ')}${exp.length>5?' a další':''}. Bez prodloužení po sezóně odejdou zadarmo.`);
 if(S.round===Math.floor(S.maxRound/2)&&S.v4.mrep>=45&&RNG()<0.35)jobsGen(1);
 S.v4.jobs=S.v4.jobs.filter(j=>S.clubs[j.id]&&(j.s<S.season||S.round-j.r<=5));
 if((S.betStats.best||0)>=10000)ach('sazkar');if(S.scandal)ach('skandal');}
function v4PreSeasonEnd(){if(!S.v4)v4init();hofAdd();}
function v4SeasonEnd(rep){const V=S.v4;V.career.seasons=(V.career.seasons||0)+1;
 let d=(rep.exp-rep.pos)*2.5+(rep.pos===1?8:0)+(rep.myMove>0?6:rep.myMove<0?-8:0);const tr=(S.trophies||[]).filter(t=>t.s===rep.season).length;d+=tr*5;if(S.scandal&&S.scandal.s===rep.season)d-=12;if(rep.fired)d-=10;
 V.mrep=clamp(Math.round(V.mrep+d),0,100);rep.mrep=V.mrep;rep.mrepD=Math.round(d);
 if(rep.pos===1)ach('mistr');if(rep.myMove>0)ach('postup');if(tr)ach('trofej');if((rep.cups||[]).some(c=>c.n==='Pohár'&&c.r==='vítěz'))ach('pohar');if(V.career.seasons>=5)ach('sezony5');
 loansReturn();
 // konce smluv
 rep.freeGone=[];for(const p of clubPlayers(S.clubId)){v4ctr(p);if(p.cy<S.season){rep.freeGone.push(p.n);movePlayer(p,null);delete S.players[p.id];}}
 if(rep.freeGone.length){addNews('👋',`Po vypršení smlouvy odcházejí zadarmo: ${rep.freeGone.join(', ')}.`);if(S.tac){S.tac.xi=S.tac.xi.map(x=>S.players[x]?x:null);S.tac.bench=S.tac.bench.filter(x=>S.players[x]);}}
 S.req=[];v4Inject(rep);
 if(!rep.fired&&V.mrep>=40){V.jobs=[];jobsGen(RNG()<0.5?2:1);}}
// ----- nové soutěže do starších uložených her -----
function v4Preload(){if(!S||!S.cc)return;countryLeagues(S.cc,true).filter(l=>!S.leagues[l.code]&&!_v4Data[l.code]).forEach(l=>{try{loadLeague(l.code).then(d=>{_v4Data[l.code]=d;}).catch(()=>{});}catch(e){}});}
function v4Inject(rep){const miss=countryLeagues(S.cc,true).filter(l=>!S.leagues[l.code]);for(const l of miss){const d=_v4Data[l.code];if(!d)continue;const ids=[];
  d.clubs.forEach(c=>{const id=clubId(c.n+'|'+l.code);if(S.clubs[id])return;const club={id,n:c.n,s:c.s,c:c.c,b:c.b,lg:l.code,pl:[],money:0,rep:0};if(c.z!=null)club.z=c.z;S.clubs[id]=club;ids.push(id);c.p.forEach((arr,k)=>{const p=mkPlayer(arr,id,k);club.pl.push(p.id);});});
  S.leagues[l.code]={code:l.code,clubs:ids,fix:[],res:[],table:{}};
  for(const id of ids){const c=S.clubs[id];c.rep=Math.round(teamStrength(id).ovr);const wb=clubPlayers(id).reduce((s,p)=>s+playerWage(p),0);c.wageBase=wb;c.tv=Math.round(wb*1.02/100)*100;const r=c.rep;c.cap=Math.round(clamp(2500+Math.exp((r-55)*0.135)*2600,2500,75000)/100)*100;c.ticket=Math.round(clamp(6+(r-55)*1.6,5,90));const sq=clubPlayers(id).reduce((s,p)=>s+playerValue(p),0);c.money=Math.round(sq*0.12/1e4)*1e4+Math.round(wb*8/1e4)*1e4;}
  addNews('🆕',`Do hry přibyla nová soutěž: ${l.name} (${ids.length} klubů).`);if(rep)(rep.added=rep.added||[]).push(l.name);}
 _wAt=null;}
function v4WorldAdd(){if(!S.W||!WD)return;for(const l of FM_CAT.leagues){if(l.cc===S.cc||!WD[l.code]||S.W.lg[l.code])continue;const cl=WD[l.code].map((_,i)=>l.code+':'+i);S.W.lg[l.code]={cl,ord:[],t:{},r:0};
  if(l.zn){const Z={};cl.forEach(k=>{const r=wRow(k);Z[k]=r&&r[7]!=null?r[7]:0;});S.W.lg[l.code].z=Z;}cl.forEach(k=>{S.W.str[k]=Math.round((wRow(k)[4]+gauss()*0.6)*10)/10;});S.W.prev[l.code]=cl.slice().sort((a,b)=>S.W.str[b]-S.W.str[a]);}}
// ----- derby -----
const DERBY_PAIRS=[['liverpool','everton'],['arsenal','tottenham'],['celtic','rangers'],['boca','river'],['fenerbah','galatasaray'],['beşiktaş','galatasaray'],['beşiktaş','fenerbah'],['olympiakos','panathinaikos'],['benfica','sporting'],['porto','benfica'],['barcelona','espanyol'],['sevilla','betis'],['dortmund','schalke'],['ajax','feyenoord'],['roma','lazio'],['juventus','torino'],['genoa','sampdoria'],['inter','milán'],['flamengo','fluminense'],['corinthians','palmeiras'],['partizan','crven'],['dinamo zagreb','hajduk'],['ferencváros','újpest'],['slovan','trnava'],['sparta','slavia'],['baník','sigma'],['real madrid','atlético'],['bayern','1860'],['hamburg','st. pauli'],['nacional','peñarol'],['colo-colo','universidad de chile'],['américa','guadalajara'],['ulsan','pohang'],['urawa','gamba'],['al-hilal','al-nassr'],['wisła','cracovia'],['legia','polonia'],['rapid','austria wien'],['zürich','grasshopper'],['basel','zürich'],['köbenhavn','brøndby'],['aik','djurgården'],['steaua','dinamo bucure'],['fcsb','dinamo bucure'],['levski','cska sofia'],['dynamo kyiv','shakhtar'],['maccabi tel','hapoel tel'],['apoel','omonia'],['nottingham','derby county'],['sheffield united','sheffield wed'],['bristol city','bristol rovers']];
const DERBY_STOP=new Set(['fc','ac','sk','fk','cf','cd','ud','sc','sv','club','city','united','real','sporting','atlético','athletic','dynamo','dinamo','lokomotiv','spartak','olympique','racing','deportivo','union','stade','town','rovers','wanderers','albion','hotspur','inter','calcio','county','north','south','west','east','1.','tsg','vfl','vfb','afc','rcd','cska','ofk','nk','hnk','mfk','tj','sfc','ss','us','as','rc','sd','ca','cr','se','ec','sociedad','unión','universidad','santa','san','saint','st.','new','hapoel','maccabi','beitar','fc.','fk.','b','ii','castilla','u23','u21']);
function derbyTok(n){return n.toLowerCase().replace(/[()]/g,' ').split(/\s+/).filter(w=>w.length>=4&&!DERBY_STOP.has(w));}
function isDerby(h,a){const A=CL(h),B=CL(a);if(!A||!B||A.b||B.b)return false;const x=A.n.toLowerCase(),y=B.n.toLowerCase();
 for(const [p,q] of DERBY_PAIRS)if((x.includes(p)&&y.includes(q))||(x.includes(q)&&y.includes(p)))return true;const tx=derbyTok(A.n);return derbyTok(B.n).some(t=>tx.includes(t));}
// ----- komentář navíc -----
T_GOAL.push('{S} vyměnil si míč se spoluhráčem a z první zakončil k tyči.','{S} kličkou poslal obránce na zem a pak i brankáře.','{S} dostal míč do běhu, nezaváhal a trefil horní roh.','Parádní akce! {S} zakončil po kombinaci na tři doteky.','{S} vystihl rozehrávku, vyrazil sám na branku a nekompromisně skóroval.','{S} se opřel do míče z voleje a síť se zavlnila.','{S} obloučkem přehodil vybíhajícího brankáře.','Střela z otočky! {S} překvapil úplně všechny.','{S} uklidil odražený míč z hranice malého vápna.','{S} poslal míč technickou střelou na zadní tyč.');
T_GOAL_HEAD.push('{S} si naběhl na přední tyč a hlavou usměrnil centr do sítě.','Centr z křídla a {S} se trefil hlavou k tyči.','{S} vyskočil mezi dvěma obránci a hlavičkou nedal brankáři šanci.','{S} zamířil po standardce hlavou přesně k tyči.');
T_SAVE.push('{K} se natáhl jak struna a střelu, kterou vyslal {S}, vytáhl.','{S} mířil k tyči, {K} ale reagoval bleskově.','{K} vyrazil nebezpečnou střelu před sebe a obránci odvrátili.','{S} pálil z voleje, {K} byl na místě.','{K} zneškodnil samostatný únik, kterým se řítil {S}.','{K} vytáhl ránu {S} na břevno a pak za čáru.');
T_MISS.push('{S} si míč ve vápně přešlápl a šance je pryč.','{S} pálil přes celou bránu.','Velká šance! {S} však trefil jen stojícího obránce.','{S} zakončoval zpoza vápna, míč šel metr nad.','{S} chtěl místo střely ještě přihrávat a akce skončila.','{S} se do míče opřel, ale ten skončil na tribuně.');
T_POST.push('{S} zasáhl tyč a míč se odrazil zpět do pole!','Břevno! Střela, kterou vyslal {S}, ještě dlouho duní.','Tyčka! {S} se jen nevěřícně drží za hlavu.');
T_BLOCK.push('{S} vystřelil, obránce se ale vrhl do střely.','Střelu, kterou poslal {S}, srazil obránce na roh.','{S} to zkusil zpoza vápna, ale narazil na obětavou obranu.');
T_FILL.push('{T} kombinují na malém prostoru, ale chybí poslední přihrávka.','{T} přenášejí hru ze strany na stranu.','Trenéři u lavičky gestikulují, něco se jim nelíbí.','{T} rozehrávají od brankáře a nespěchají.','Na tribunách se rozjíždí chorál, stadion se otřásá.','{T} napadají už na polovině soupeře.','Hra je teď hodně kouskovaná, rozhodčí píská jeden faul za druhým.','{T} zkoušejí dlouhé míče za obranu.','Střídající hráči se rozcvičují u postranní čáry.','{T} se zatáhli a čekají na brejk.','Taktický souboj ve středu pole, nikdo nechce udělat chybu.','{T} dostali míč do vápna, ale odkop přišel včas.');
// ----- videorozhodčí u gólu -----
function varGoalP(M,i){const b=M.bribe;let p=0.03;if(b)p*=b.side===i?0.3:1.8;return p;}
function varGoalTx(M,i){return `⚽ Míč je v síti… ale 📺 videorozhodčí! Sudí si situaci přehrál u monitoru a gól ${pick(['kvůli těsnému ofsajdu','kvůli faulu v předchozí akci','kvůli ruce útočníka'])} neuznal.`;}
// ----- média: trenér soupeře a fórum fanoušků -----
const RQ={pre_fav:['Respektujeme je, ale jedeme pro tři body.','Jsme ve formě a nemáme se koho bát.','Kdo chce hrát nahoře, musí takové zápasy vyhrávat.','Doma chceme diktovat tempo od první minuty.'],
 pre_dog:['Nikdo nám nevěří, a to je naše výhoda.','Budeme bojovat o každý metr trávníku.','Favorit je jasný, ale fotbal se hraje na hřišti, ne na papíře.','Když podržíme nulu dlouho, můžeme je zlomit.'],
 pre_derby:['Derby se nehrají, derby se vyhrávají.','Tohle je zápas pro fanoušky. Prohrát nesmíme.','Celé město žije jen tímhle zápasem. Kluci vědí, o co jde.'],
 pre_riv:['Na slova jejich trenéra odpovíme na hřišti.','Viděl jsem, co o nás říkali. Motivovat nás nemusím.'],
 post_win:['Zasloužená výhra, byli jsme lepší celý zápas.','Kluci odvedli skvělou práci, jsem na ně pyšný.','Splnili jsme plán do posledního detailu.'],
 post_loss:['Dneska nám to nevyšlo, musíme to rychle hodit za hlavu.','Rozhodly detaily a pár sporných situací.','Soupeř byl efektivnější, my jsme šance nedali.','Gratuluji soupeři, ale my se zvedneme.'],
 post_draw:['Bod beru, i když jsme chtěli víc.','Remíza odpovídá průběhu zápasu.','Měli jsme šance na výhru, ale i bod se počítá.']};
function rivalQuote(kind,opp){return pick(RQ[kind]||RQ.pre_fav);}
const FN=['Kotelník','Věrný_od_dětství','Permanentkář','Severní_tribuna','StaryFanda','Holka_z_kotle','Šála_na_krku','Sektor_B','Tribuna_jih','Hlas_lidu','Vlajkonoš','Bubeník'];
const FORUM={win:['Tohle je můj tým! Takhle hrát každý týden.','{B} dneska nejlepší na hřišti, bez debat.','Trenér to konečně trefil, sestava jak má být.','Paráda, jdeme slavit!','Konečně fotbal, na který se dá koukat.','Kdo kritizoval trenéra, ať se teď stydí.'],
 bigwin:['{SC}! Tohle si budu pamatovat roky.','Rozdrtili jsme je. Takhle se hraje doma.'],
 loss:['Ostuda. {W} dneska úplně mimo.','Za tohle jsem platil {T}? Příště zůstanu doma.','Trenér musí něco změnit, takhle to dál nejde.','Žádná bojovnost, žádný nápad.','Zase jsme to prohráli v hlavách.','Bolí to, ale pořád jsme s vámi.'],
 draw:['Bod je bod, ale chtělo to víc odvahy.','Remíza nikoho nezahřeje.','Na výhru jsme neměli, buďme rádi.','{B} držel tým nad vodou.'],
 derby_win:['DERBY JE NAŠE! Celé město je naše!','Výhra v derby je víc než tři body.'],derby_loss:['Prohrát derby? To se neodpouští.','Celý týden se nebudu moct ukázat v práci.'],
 rain:['V tom slejváku jsem promokl na kost, ale stálo to za to.'],snow:['Na sněhu to byl spíš hokej, ale zážitek.'],heat:['V tom vedru jsem vypil pět piv a pořád žízeň.'],
 ticket:['Vstupné je drahé jak v Londýně, to klub přehnal.'],scandal:['Po té aféře s obálkou se na trenéra dívám skrz prsty.'],
 scorer:['{G} – střelec jak má být!','Gól, který dal {G}, byl čistá krása.']};
function forumHtml(M){const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const res=my>th?'win':my<th?'loss':'draw';const mine=Object.keys(M.played).filter(id=>P(id)&&P(id).cl===S.clubId).sort((a,b)=>finite(M.rt[b])-finite(M.rt[a]));
 const B=mine[0]?pSurname(P(mine[0])):'brankář',W=mine.length?pSurname(P(mine[mine.length-1])):'obrana';const gs=M.ev.filter(e=>e.t==='goal'&&e.s===ui&&!e.og);const G=gs.length?pSurname(P(gs[0].p)||{n:'útočník'}):null;
 const d={B,W,G,SC:my+':'+th,T:fmtMoney(myClub().ticket)};const pool=[];const add=(k,n)=>{if(FORUM[k])for(let i=0;i<(n||1);i++)pool.push(FORUM[k]);};
 add(res,3);if(res==='win'&&my-th>=3)add('bigwin',2);if(M.derby)add(res==='win'?'derby_win':res==='loss'?'derby_loss':'draw',2);if(M.wx&&FORUM[M.wx.k])add(M.wx.k);if(myClub().ticketBase&&myClub().ticket>myClub().ticketBase*1.2)add('ticket');if(S.scandal&&S.scandal.s===S.season)add('scandal');if(G&&res!=='loss')add('scorer');
 const used=new Set();const nk=shuffle(FN.slice());const posts=[];for(let k=0;k<3&&pool.length;k++){let t,g=0;do{t=pick(pick(pool));}while(used.has(t)&&g++<20);used.add(t);t=t.replace(/\{(\w+)\}/g,(_,x)=>d[x]||'');posts.push(`<div class="chatl"><b class="cp-fanH">${nk[k]}</b><div>${esc(t)}</div></div>`);}
 return `<div class="card" style="padding:8px 12px"><h3>💬 Fórum fanoušků</h3>${posts.join('')}</div>`;}
function keyMoments(M){const K=M.ev.filter(e=>['goal','red','var','pen','post','inj','pso'].includes(e.t)||(e.t==='save'&&/penalt/i.test(e.tx||'')));if(!K.length)return '';
 return `<div class="card" style="padding:8px 12px"><h3>🎬 Klíčové momenty</h3>${K.slice(0,14).map(e=>`<div class="row small" style="padding:3px 0;align-items:flex-start"><b class="mut" style="min-width:34px">${e.m}'</b><span style="flex:1">${esc(String(e.tx||'').replace(/^⚽ /,'⚽ '))}</span></div>`).join('')}</div>`;}
function v4PreHtml(F){const opp=F.h===S.clubId?F.a:F.h;const oc=CL(opp);if(!oc)return '';const der=isDerby(F.h,F.a);const sm=clubStr(S.clubId),so=clubStr(opp);
 const kind=der?'pre_derby':(S.riv&&S.riv[opp]>=3)?'pre_riv':so>=sm?'pre_fav':'pre_dog';
 let tip='';if(stLv('as')){const sdo=so-sm;tip=`<div class="tiny" style="margin-top:6px">🧑‍🏫 Asistent: ${sdo>4?'Soupeř je silnější, zkus nižší obrannou linii a protiútoky.':sdo<-4?'Jsme favorit, vysoký presink a rychlé tempo by je měly zlomit.':'Vyrovnaný zápas, rozhodnout mohou standardky.'}${M_wxTip(F)}</div>`;}
 return `<div class="card" style="padding:8px 12px">${der?'<div class="small warn" style="margin-bottom:4px">🔥 Derby! Vyprodaný stadion, vyhrocená atmosféra a víc karet.</div>':''}<div class="small">🗣️ Trenér soupeře (${esc(oc.n)}): „${esc(rivalQuote(kind))}“</div>${tip}</div>`;}
function M_wxTip(F){try{const w=matchWeather(F.h,F);return w.k==='rain'||w.k==='snow'?' Kvůli počasí hraj spíš přímočaře.':w.k==='heat'?' Ve vedru šetři síly, nižší presink.':w.k==='wind'?' Ve větru se vyhni dlouhým míčům.':'';}catch(e){return '';}}
function v4PostHtml(M){if(M._v4h)return M._v4h;const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const opp=CL(M.sides[1-ui].cid);const k=my>th?'post_loss':my<th?'post_win':'post_draw';
 M._v4h=keyMoments(M)+`<div class="card" style="padding:8px 12px"><div class="small">🗣️ Trenér soupeře (${esc(opp.n)}): „${esc(rivalQuote(k))}“</div></div>`+forumHtml(M);return M._v4h;}
function v4AfterMatch(M){if(!S.v4)v4init();const C=S.v4.career;const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];
 if(my>th){C.w++;ach('vyhra1');if(C.w>=50)ach('vyhry50');if(my-th>=5)ach('kanonada');if(M.derby)ach('derby');}else if(my===th)C.d++;else C.l++;
 C.unb=my>=th?(C.unb||0)+1:0;C.best=Math.max(C.best||0,C.unb);if(C.unb>=10)ach('neporaz');
 if(M.sides[ui]===M.h&&M.att>=myClub().cap*0.98)ach('vyprodano');if(M.ev.some(e=>e.t==='goal'&&e.s===ui&&!e.og&&P(e.p)&&P(e.p).yth))ach('odchovanec');
 const best=motm(M);const bp=P(best);if(bp&&bp.cl===S.clubId){bp.car=bp.car||{};bp.car.motm=(bp.car.motm||0)+1;bp.hap=clamp((bp.hap||60)+2,0,100);}
 if(M.F&&M.F.type==='cup'&&cupById(M.F.cup)&&cupById(M.F.cup).kind==='grp')ach('evropa');
 if(RNG()<0.5){const opp=CL(M.sides[1-ui].cid);addNews('🗣️',`Trenér soupeře (${opp.n}): „${rivalQuote(my>th?'post_loss':my<th?'post_win':'post_draw')}“`,1);}}
// ----- živé sázky na souběžný zápas -----
let PM=null;
function pmStart(M){PM=null;if(!M.F||M.F.type==='cup')return;const myLg=myClub().lg;const codes=[myLg].concat(Object.keys(S.leagues).filter(c=>c!==myLg));
 for(const code of codes){const r=lgDue(code);if(r<0)continue;const fx=(S.leagues[code].fix[r]||[]).filter(f=>f[0]!==S.clubId&&f[1]!==S.clubId);if(!fx.length)continue;const f=fx.slice().sort((a,b)=>clubStr(b[0])+clubStr(b[1])-clubStr(a[0])-clubStr(a[1]))[0];
  const save={};[...clubPlayers(f[0]),...clubPlayers(f[1])].forEach(p=>save[p.id]=[p.cond,p.inj,p.sus]);
  const pm=createMatch(f[0],f[1],{h:f[0],a:f[1],type:'lg',code,r});pm.code=code;pm.r=r;pm._save=save;PM={M:pm,bets:[],done:0};S.v4.pmRefund=0;return;}}
function pmTick(M){if(!PM||PM.done)return;const pm=PM.M;let g=0;while(!pm.ended&&pm.min<M.min&&g++<5){stepMinute(pm);}}
function pmEnd(){if(!PM||PM.done)return;const pm=PM.M;let g=0;while(!pm.ended&&g++<300)stepMinute(pm);PM.done=1;
 const sc={};sc[pm.h.cid]=[];sc[pm.a.cid]=[];pm.ev.filter(e=>e.t==='goal').forEach(e=>sc[pm.sides[e.s].cid].push(e.og?{og:e.p}:e.p));
 S._forced=S._forced||{};S._forced[pm.h.cid+'|'+pm.a.cid]={gh:pm.score[0],ga:pm.score[1],sc};
 for(const id in pm._save){const p=P(id);if(!p)continue;[p.cond,p.inj,p.sus]=pm._save[id];delete p._myc;delete p._mred;}
 const pr=chProbs(pm);for(const b of PM.bets){if(b.co)continue;if(pr[b.mk]>0.99){const w=Math.round(b.stake*b.o);S.wallet+=w;S.betStats.won+=w;S.betStats.nw++;const hs=betSeasonStat();hs.won+=w;hs.nw++;if(w>(S.betStats.best||0)){S.betStats.best=w;S.betStats.bestO=b.o;}b.res='won';addNews('🎲',`Živá sázka vyšla! ${pmTitle()}: výhra ${fmtMoney(w)}.`,1);}else b.res='lost';}
 S.v4.pmRefund=0;}
function pmTitle(){const pm=PM&&PM.M;return pm?CL(pm.h.cid).n+' – '+CL(pm.a.cid).n:'';}
const PM_MK={'1':'Domácí','X':'Remíza','2':'Hosté',o25:'Víc než 2,5',u25:'Míň než 2,5'};
function pmOdds(mk){const pr=chProbs(PM.M);return chOdd(pr[mk]);}
function pmBet(mk){if(!PM||PM.done||PM.M.ended){toast('Zápas už skončil.');return;}const st=UI.lbStake||200;if(S.wallet<st){toast('Na osobním kontě nemáš dost peněz.');return;}
 if(typeof betLimitLeft==='function'&&betLimitLeft()<st){toast('Překročil bys limit sázek na kolo.');return;}if(PM.M.min>=88){toast('Sázky na tento zápas jsou už uzavřené.');return;}
 const o=pmOdds(mk);S.wallet-=st;S.betStats.st+=st;S.betStats.n++;const hs=betSeasonStat();hs.st+=st;hs.n++;PM.bets.push({mk,o,stake:st,min:PM.M.min});S.v4.pmRefund=PM.bets.filter(b=>!b.co).reduce((s,b)=>s+b.stake,0);
 if(typeof updLive==='function')updLive();toast(`Živá sázka přijata: ${PM_MK[mk]} za ${czOdd(o)}`);}
function pmCoVal(b){const pr=chProbs(PM.M)[b.mk];return Math.max(0,Math.round(b.stake*b.o*pr*0.9/10)*10);}
function pmCashout(i){const b=PM&&PM.bets[i];if(!b||b.co||PM.done)return;const v=pmCoVal(b);b.co=v;S.wallet+=v;S.betStats.won+=v;const hs=betSeasonStat();hs.won+=v;S.v4.pmRefund=PM.bets.filter(x=>!x.co).reduce((s,x)=>s+x.stake,0);
 addNews('🎲',`Předčasný výběr živé sázky: ${fmtMoney(v)} (${pmTitle()}).`,1);if(typeof updLive==='function')updLive();toast('Vybráno '+fmtMoney(v));}
function pmHtml(){if(!PM)return '';const pm=PM.M;const st=UI.lbStake||200;const end=PM.done||pm.ended;
 return `<div class="card" style="padding:8px 12px"><div class="row small"><b>📡 Souběžný zápas</b><span class="sp"></span><span class="mut">${end?'konec':minLbl(pm)+"'"}</span></div>
 <div class="row" style="margin:6px 0;gap:8px"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis" class="small">${esc(CL(pm.h.cid).n)}</span><b style="font-size:18px">${pm.score[0]}:${pm.score[1]}</b><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;text-align:right" class="small">${esc(CL(pm.a.cid).n)}</span></div>
 ${end?'':`<div class="seg" style="margin-bottom:6px">${[100,200,500,1000].map(v=>`<button class="${st===v?'on':''}" onclick="UI.lbStake=${v};updLive()">${fmtMoney(v)}</button>`).join('')}</div>
 <div class="grid3" style="gap:6px">${['1','X','2'].map(k=>`<button class="odd" onclick="pmBet('${k}')"><small>${PM_MK[k]}</small><b>${czOdd(pmOdds(k))}</b></button>`).join('')}</div><div class="grid2" style="gap:6px;margin-top:6px">${['o25','u25'].map(k=>`<button class="odd" onclick="pmBet('${k}')"><small>${PM_MK[k]} gólu</small><b>${czOdd(pmOdds(k))}</b></button>`).join('')}</div>`}
 ${PM.bets.map((b,i)=>`<div class="row small" style="padding:5px 0;border-top:1px solid rgba(255,255,255,.06);margin-top:6px"><span style="flex:1">${PM_MK[b.mk]} · ${czOdd(b.o)} · ${fmtMoney(b.stake)} <span class="tiny mut">(${b.min}')</span></span>${b.co?`<span class="tiny good">vybráno ${fmtMoney(b.co)}</span>`:b.res?`<span class="tiny ${b.res==='won'?'good':'bad'}">${b.res==='won'?'výhra '+fmtMoney(Math.round(b.stake*b.o)):'prohra'}</span>`:end?'':`<button class="btn ghost" style="min-height:44px;padding:0 10px" onclick="pmCashout(${i})">Vybrat ${fmtMoney(pmCoVal(b))}</button>`}</div>`).join('')}
 <div class="tiny mut" style="margin-top:6px">Živé sázky jen na cizí zápas, který se hraje ve stejnou dobu. Předčasný výběr vyplatí hned část výhry podle aktuálního stavu.</div></div>`;}
// ----- žebříček sázkařů -----
function lbUpdate(){const C=MS&&MS.chat;if(!C)return;const pr=chProbs(MS.M);const L=S.v4.lb;for(const u of C.users){const won=pr[u.mk]>0.99&&!(u.ako&&u.ako.bust);const prof=u.co?u.co-u.stake:won?Math.round(u.stake*(u.odds-1)):-u.stake;
  const e=L[u.n]||(L[u.n]={p:0,n:0,w:0,per:u.per});e.p+=prof;e.n++;if(prof>0)e.w++;}
 const ks=Object.keys(L);if(ks.length>70){ks.sort((a,b)=>Math.abs(L[a].p)-Math.abs(L[b].p)).slice(0,ks.length-70).forEach(k=>delete L[k]);}}
function lbHtml(){const L=S.v4.lb;const me={n:S.manager+' (ty)',p:S.betStats.won-S.betStats.st,n_:S.betStats.n,w:S.betStats.nw,me:1};
 const all=Object.entries(L).map(([n,e])=>({n,p:e.p,n_:e.n,w:e.w,per:e.per})).concat([me]).sort((a,b)=>b.p-a.p);const myI=all.findIndex(x=>x.me);
 return `<div class="card"><h3>🏅 Žebříček sázkařů</h3><div class="small mut" style="margin-bottom:6px">Sázkaři z chatu během tvých zápasů a ty. Tvoje pozice: <b>${myI+1}.</b> z ${all.length}</div>
 ${all.slice(0,15).map((x,i)=>`<div class="row small" style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)${x.me?';background:rgba(62,230,138,.08)':''}"><span class="mut" style="width:22px">${i+1}.</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis"><b class="${x.per?'cp-'+x.per:''}">${esc(x.n)}</b> <span class="tiny mut">${x.per?'· '+(CH_PER[x.per]||''):''} · ${x.n_} ${czPlural(x.n_,'tiket','tikety','tiketů')}</span></span><b class="${x.p>=0?'good':'bad'}">${x.p>=0?'+':''}${fmtMoney(x.p)}</b></div>`).join('')}
 ${myI>=15?`<div class="row small" style="padding:5px 0"><span class="mut" style="width:22px">${myI+1}.</span><span style="flex:1"><b>${esc(me.n)}</b></span><b class="${me.p>=0?'good':'bad'}">${me.p>=0?'+':''}${fmtMoney(me.p)}</b></div>`:''}</div>`;}
// ----- chat: reakce na střídání trenéra, derby, gól zrušený videem -----
Object.assign(CH,{
 vargoal_good:['Gól neplatí! Video, já tě miluju!','Ofsajd! Věděl jsem, že tam něco bylo. Tiket žije.','Zrušený gól! Dneska stojí štěstí na mé straně.'],
 vargoal_bad:['Cože? Zrušili gól? Na videu jsem nic neviděl!','Už jsem slavil a teď tohle. Ofsajd o nehet.','Gól neplatí… já snad sázení zabalím.'],
 derby:['Derby! Tady se kurzy nepočítají, tady rozhoduje srdce.','V derby nikdy nevíš. Proto sázím jen malé částky.','Derby, plný stadion, tohle bude jízda.'],
 usub:['Trenér stahuje {pout} a posílá {pin}. Uvidíme, jestli to zabere.','{pin} jde na hřiště? Odvážné rozhodnutí.','{pout} ven, {pin} dovnitř. Konečně nějaká změna.','Proč stahuje zrovna {pout}? Hrál dobře.'],
 usub_fan:['Dobrý tah, trenére! {pin} přinese čerstvé nohy.','{pout} měl dneska těžké nohy, střídání dává smysl.','Trenére, {pin} je přesně to, co jsme potřebovali!'],
 usub_troll:['Trenér střídá jak v hospodské lize 😏','Teď to {pin} určitě otočí… nebo taky ne.'],
 usub_stat:['{pin} má v posledních zápasech nejvíc střel na branku z celé lavičky. Rozumné.']});
CH.start_ako=CH.start_ako||[];
function chUserSub(M,e){const C=MS&&MS.chat;if(!C||!e||S.settings.betChat===false)return;const ui=userSide(M);const fan=C.users.find(u=>u.per===(ui===0?'fanH':'fanA'));const ex={pin:chSurn(e.pin),pout:chSurn(e.pout)};
 const u=fan&&RNG()<0.5?fan:pick(C.users);chSay(M,u,u===fan?'usub_fan':'usub',ex,true);if(RNG()<0.35){const t=C.users.find(x=>x.per==='troll');if(t&&t!==u)chSay(M,t,'usub_troll',ex);}}
// ----- domovská obrazovka -----
function v4HomeCards(){if(!S.v4)return '';let h='';
 S.v4.jobs.forEach((j,i)=>{const c=S.clubs[j.id];if(!c)return;h+=`<div class="card" style="border-color:var(--gold)"><h3>📨 Nabídka práce</h3><div class="small"><b>${esc(c.n)}</b> (${esc(leagueLabel(c.lg))}, síla ${c.rep}) ti nabízí místo hlavního trenéra.</div><div class="grid2" style="margin-top:8px"><button class="btn ghost" onclick="jobDecline(${i})">Odmítnout</button><button class="btn gold" onclick="jobTake(${i})">Přijmout</button></div></div>`;});
 S.req.forEach((q,i)=>{const p=P(q.p);if(!p)return;h+=`<div class="card"><h3>🗣️ ${esc(p.n)} chce mluvit</h3><div class="small">${q.k==='role'?'Je nespokojený, že nehraje tolik, kolik by chtěl.':'Zvažuje odchod, v klubu se necítí dobře.'} Spokojenost: ${hapTxt(p)}.</div>
  <div class="grid3" style="margin-top:8px;gap:6px"><button class="btn ghost" onclick="reqAnswer(${i},'min')">Slíbit minuty</button><button class="btn ghost" onclick="reqAnswer(${i},'list')">Na listinu</button><button class="btn ghost" onclick="reqAnswer(${i},'no')">Odmítnout</button></div></div>`;});
 const half=Math.floor(S.maxRound/2);if((S.round===3||S.round===half+1)&&transferWindow()&&!seasonOver())h+=`<div class="card" style="padding:8px 12px"><div class="small">📺 <b>Den uzávěrky přestupů!</b> Po tomto kole se přestupové okno zavře.</div></div>`;
 return h;}
// ----- karta hráče -----
function v4MineHtml(p){v4ctr(p);const ex=p.cy<S.season+1;return `<div class="card" style="padding:8px 12px;margin-top:10px"><div class="small">📝 Smlouva do <b class="${ex?'warn':''}">${ctrLabel(p)}</b> · ${hapTxt(p)}${p.caps?` · 🌍 ${p.caps} ${czPlural(p.caps,'start','starty','startů')} za reprezentaci`:''}${p.car&&p.car.motm?` · ⭐ ${p.car.motm}× hráč zápasu`:''}${p.loan&&p.loan.in?` · na hostování z klubu ${esc(CL(p.loan.from).n)}`:''}</div>
 <div class="grid2" style="margin-top:8px"><button class="btn ghost" onclick="closeModal();ctrSheet('${p.id}')" ${p.loan?'disabled':''}>📝 Smlouva</button><button class="btn ghost" onclick="loanOut('${p.id}')" ${p.loan?'disabled':''}>🔄 Na hostování</button></div></div>`;}
function v4OtherHtml(p){if(!S.players[p.id])return '';const rc=relClause(p);const c=S.clubs[p.cl];
 return `<div class="card" style="padding:8px 12px;margin-top:10px">${rc?`<div class="small">💥 Výkupní klauzule: <b>${fmtMoney(rc)}</b></div>`:'<div class="small mut">Hráč nemá výkupní klauzuli.</div>'}
 <div class="grid2" style="margin-top:8px">${rc?`<button class="btn ghost" onclick="payClause('${p.id}')">Zaplatit klauzuli</button>`:'<span></span>'}${c&&!c.tmp?`<button class="btn ghost" onclick="loanIn('${p.id}')">🔄 Hostování</button>`:''}</div></div>`;}
// ----- obaly existujících funkcí -----
(function(){
 const _sm=stepMinute;stepMinute=function(M){const out=_sm(M);
  if(M.half===2&&M.min<90){const n=out.filter(e=>e.t==='goal'||e.t==='inj'||e.t==='red'||e.t==='sub'||e.t==='var').length;if(n){M._adA=(M._adA||0)+n*0.4;if(M._adA>=1){const k=Math.floor(M._adA);M._adA-=k;M.added[1]=Math.min(9,M.added[1]+k);}}}
  if(!M._ann){M._ann={};}
  const ann=(h,mm,a)=>{if(M.half===h&&M.min===mm&&!M._ann[h]){M._ann[h]=1;const e={m:mm,t:'fill',tx:`⏱️ Čtvrtý rozhodčí ukazuje nastavení: +${a} ${czPlural(a,'minuta','minuty','minut')}.`};out.push(e);M.ev.push(e);}};
  ann(1,45,M.added[0]);ann(2,90,M.added[1]);return out;};
 const _cm=createMatch;createMatch=function(h,a,F){const M=_cm(h,a,F);try{M.derby=isDerby(h,a);const us=M.h.user?0:M.a.user?1:-1;
  if(M.derby){const c=S.clubs[h];if(c&&c.cap)M.att=Math.min(c.cap,Math.round(M.att*1.15));if(M.ev[0])M.ev[0].tx+=' 🔥 Derby! Atmosféra se dá krájet.';}
  if(us===0&&M.fx){const l=facLv('pi');M.fx.inj*=1-0.08*l;M.fx.acc*=1+0.01*l;}
  if(us>=0&&M.fx)M.fx.inj*=1-0.06*stLv('fi');}catch(e){}return M;};
 const _bcm=bribeCardMul;bribeCardMul=function(M,i){return _bcm(M,i)*(M.derby?1.3:1);};
 const _fam=fansAfterMatch;fansAfterMatch=function(M){const f0=fans();_fam(M);if(M.derby){const d=fans()-f0;fansAdd(d*0.6);}};
 const _yp=youthPlayer;youthPlayer=function(cid){const y=_yp(cid);if(cid===S.clubId&&y){const l=facLv('yo');if(l){y.pot=Math.min(94,y.pot+2*l);y.ovr=Math.min(y.pot,y.ovr+Math.round(l*0.8));}y.cy=S.season+2;y.wm=1;}return y;};
 const _sc=scoutCost;scoutCost=function(p){return Math.round(_sc(p)*(1-0.22*stLv('sc'))/100)*100;};
 const _es=endSeason;endSeason=function(){v4PreSeasonEnd();return _es();};
 const _ng=newGame;newGame=async function(o){const r=await _ng(o);v4init();return r;};
 const _ws=wStartSeason;wStartSeason=function(){v4WorldAdd();return _ws();};
 const _cf=chFinal;chFinal=function(M){_cf(M);try{lbUpdate();}catch(e){}};
 const _ch=chatHtml;chatHtml=function(M){return pmHtml()+_ch(M);};
 const _ib=initBetChat;initBetChat=function(M){_ib(M);if(M.derby&&MS.chat)chSay(M,pick(MS.chat.users),'derby',{},true);};
 const _tc=takeClub;takeClub=function(id){_tc(id);S.v4&&(S.v4.jobs=[]);};})();

// ===== v4b: povahy hráčů, proslovy, příprava, jednání s vedením, dresy, rivalové, události, tip týdne =====
const PERS={vu:['👑','Vůdce','Zvedá morálku kabiny a pomáhá při proslovech.'],pro:['🧘','Profesionál','Trénuje naplno, rychleji se zlepšuje a méně fauluje.'],hh:['🌋','Horká hlava','Častěji dostává karty a mívá výkyvy nálady.'],fl:['😴','Flákač','Na tréninku šetří síly a zlepšuje se pomaleji.']};
function pers(p){if(!p)return null;const h=hashStr('ps'+p.n+p.by)%100;return h<9?'vu':h<21?'pro':h<31?'hh':h<38?'fl':null;}
function persHtml(p){const k=pers(p);if(!k)return `<div class="tiny mut" style="margin:6px 0">Povaha: vyrovnaná, bez výrazných výkyvů.</div>`;const x=PERS[k];return `<div class="small" style="margin:6px 0">${x[0]} Povaha: <b>${x[1]}</b><div class="tiny mut">${x[2]}</div></div>`;}
function persCardMul(id){const k=pers(P(id));return k==='hh'?2.2:k==='pro'?0.6:1;}
function persDevMul(p){const k=pers(p);return k==='pro'?1.2:k==='fl'?0.75:1;}
function nLeaders(){return clubPlayers(S.clubId).filter(p=>pers(p)==='vu'&&p.inj<=0).length;}
// ----- proslovy -----
const TALK={kl:['😌','V klidu','Hrajte svou hru, nikam nespěchejte.'],po:['👏','Povzbudit','Věřím vám, jděte do toho naplno!'],tl:['😤','Zvýšit hlas','Tohle mi nestačí, chci vidět víc!']};
function talkEff(M,k,ht){const ui=userSide(M);const d=ht?M.score[ui]-M.score[1-ui]:Math.round((clubStr(S.clubId)-clubStr(M.sides[1-ui].cid))/4);const L=Math.min(2,nLeaders());let b=0,ok=1;
 if(k==='kl'){b=d>=1?0.8:d<=-1?-0.3:0.4;ok=d>=0;}
 else if(k==='po'){b=d<=-2?0.4:d>=2?0.3:1.0;}
 else{const ch=(d<=0?0.62:0.3)+L*0.1;ok=RNG()<ch;b=ok?(d<=0?1.9:0.9):-1.0;}
 b*=1+L*0.15;
 const tx=b>=1.2?'Hráči vybíhají jako vyměnění, proslov zabral!':b>=0.5?'Hráči reagují dobře, nálada v kabině je pozitivní.':b>=0?'Proslov vyzněl do ztracena, hráči jen pokývali hlavou.':'Hráči jsou z proslovu rozladění, v kabině to zaskřípalo.';
 M.tb=M.tb||[0,0];M.tb[ui]+=b;onPitch(M.sides[ui]).forEach(id=>{const p=P(id);if(p)p.mor=clamp((p.mor||60)+Math.round(b*3),0,100);});recalc(M);return {b,tx};}
function htTalk(M){if(!M||M._ht2)return;M._ht2=1;const ui=userSide(M);
 modal(`<h2>🗣️ Proslov o poločase</h2><div class="small mut" style="margin-bottom:10px">Stav ${M.score[ui]}:${M.score[1-ui]}. Co řekneš hráčům v kabině?${nLeaders()?' Vůdci v týmu pomohou slova podpořit.':''}</div>
 ${Object.entries(TALK).map(([k,t])=>`<button class="btn ghost big" style="margin-bottom:8px;text-align:left" onclick="htApply('${k}')">${t[0]} <b>${t[1]}</b><div class="tiny mut">„${t[2]}“</div></button>`).join('')}`);}
function htApply(k){if(!MS)return closeModal();const r=talkEff(MS.M,k,1);closeModal();MS.M.ev.push({m:45,t:'ht',tx:'🗣️ '+r.tx});try{updLive();}catch(e){}toast(r.tx);}
function talkSeg(){const t=UI.talk||'';return `<div class="small" style="margin-top:8px">🗣️ Proslov v kabině před zápasem:</div><div class="seg talk" style="margin-top:4px">${Object.entries(TALK).map(([k,x])=>`<button class="${t===k?'on':''}" onclick="UI.talk='${k}';this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${x[0]} ${x[1]}</button>`).join('')}</div>`;}
// ----- vzájemné zápasy a rivalové -----
function h2h(opp){return (S.v4.h2h||{})[opp];}
function h2hTxt(opp){const x=h2h(opp);if(!x)return 'Proti tomuto soupeři zatím nemáš žádný zápas.';return `Vzájemná bilance: ${x.w} výher, ${x.d} remíz, ${x.l} proher (skóre ${x.gf}:${x.ga}).${x.last.length?' Naposledy: '+x.last.slice(-3).join(', ')+'.':''}`;}
function h2hAdd(opp,my,th){const H=S.v4.h2h||(S.v4.h2h={});const x=H[opp]||(H[opp]={w:0,d:0,l:0,gf:0,ga:0,last:[]});if(my>th)x.w++;else if(my===th)x.d++;else x.l++;x.gf+=my;x.ga+=th;x.last.push(my+':'+th);if(x.last.length>5)x.last.shift();
 const k=Object.keys(H);if(k.length>120){k.sort((a,b)=>(H[a].w+H[a].d+H[a].l)-(H[b].w+H[b].d+H[b].l));delete H[k[0]];}}
function rivalsHtml(){const H=S.v4.h2h||{};const ids=Object.keys(H).filter(id=>CL(id));if(!ids.length)return `<div class="card"><h3>⚔️ Rivalové a vzájemné zápasy</h3><div class="small mut">Po prvních zápasech se tu ukáže bilance proti soupeřům.</div></div>`;
 ids.sort((a,b)=>(isDerby(S.clubId,b)?100:0)+(H[b].w+H[b].d+H[b].l)-((isDerby(S.clubId,a)?100:0)+(H[a].w+H[a].d+H[a].l)));
 return `<div class="card"><h3>⚔️ Rivalové a vzájemné zápasy</h3><table class="tbl"><tr><th class="l">Soupeř</th><th>V</th><th>R</th><th>P</th><th>Skóre</th></tr>${ids.slice(0,10).map(id=>{const x=H[id];return `<tr style="cursor:default"><td class="nm">${isDerby(S.clubId,id)?'🔥 ':''}${esc(CL(id).n)}</td><td>${x.w}</td><td>${x.d}</td><td>${x.l}</td><td>${x.gf}:${x.ga}</td></tr>`;}).join('')}</table><div class="tiny mut" style="margin-top:6px">🔥 = derby</div></div>`;}
// ----- příprava: soustředění a přátelské zápasy -----
const CAMP={al:['🏔️','Alpy','Kondice a odolnost: méně zranění na začátku sezóny, menší náklady.',0.7,5,3],es:['☀️','Španělsko','Skvělé podmínky, sehranost a nálada jdou nahoru.',1.4,9,8],tr:['🌴','Turecko','Levná varianta, solidní podmínky.',0.45,4,3]};
function campCost(k){return Math.max(15000,Math.round((myClub().tv||20000)*CAMP[k][3]/1000)*1000);}
function campGo(k){const V=S.v4;if(V.pre&&V.pre.s===S.season&&V.pre.camp)return;const c=CAMP[k];const cost=campCost(k);if(myClub().money<cost){toast('Klub nemá na soustředění dost peněz.');return;}
 money(-cost,'wages','Soustředění: '+c[1]);S.cohesion=clamp(S.cohesion+c[4],0,100);clubPlayers(S.clubId).forEach(p=>{p.mor=clamp((p.mor||60)+c[5],0,100);p.cond=100;if(k==='al')p.inj=Math.max(0,p.inj-1);});
 V.pre=Object.assign(V.pre&&V.pre.s===S.season?V.pre:{s:S.season},{camp:k});addNews(c[0],`Tým odjel na soustředění (${c[1]}). Sehranost +${c[4]}, nálada v kabině se zlepšila.`);saveGame();render();}
function friendlies(){const V=S.v4;if(V.pre&&V.pre.s===S.season&&V.pre.fr)return;const pool=S.W?Object.keys(S.W.str).filter(r=>CL(r)&&r!==S.clubId):[];const me=myClub();const res=[];
 for(let i=0;i<2&&pool.length;i++){const sm=clubStr(S.clubId);const cand=pool.filter(r=>Math.abs(clubStr(r)-sm)<=8);const o=pick(cand.length?cand:pool);const [xh,xa]=xgPair(strOf(S.clubId),strOf(o));const [gh,ga]=segGoals(xh,xa);res.push(`${CL(o).n} ${gh}:${ga}`);S.cohesion=clamp(S.cohesion+2,0,100);}
 const inc=Math.round(((me.cap||8000)*0.25*8)/100)*100;money(inc,'gate','Přípravné zápasy');V.pre=Object.assign(V.pre&&V.pre.s===S.season?V.pre:{s:S.season},{fr:res});
 addNews('🤝',`Přípravné zápasy: ${res.join(', ')}. Sehranost +4, vstupné ${fmtMoney(inc)}.`);saveGame();render();}
// ----- jednání s vedením -----
function boardNeg(k){const me=myClub();const V=S.v4;if(V.bneg===S.season)return;V.bneg=S.season;const n=zoneSize(me.lg,S.clubId);const amt=Math.max(30000,Math.round((me.tv||20000)*3/10000)*10000);
 if(k==='up'){me.expect=Math.max(1,me.expect-2);money(amt,'tv','Navýšení rozpočtu od vedení');S.boardTrust=clamp(S.boardTrust+3,0,100);addNews('👔',`Vedení navýšilo rozpočet o ${fmtMoney(amt)}. Nový cíl: ${expectText(me.expect)}.`);}
 else if(k==='down'){me.expect=Math.min(n,me.expect+2);money(-Math.round(amt/2),'tv','Snížení rozpočtu');S.boardTrust=clamp(S.boardTrust-4,0,100);addNews('👔',`Vedení přijalo nižší cíl (${expectText(me.expect)}), ale ubralo z rozpočtu ${fmtMoney(Math.round(amt/2))}.`);}
 else addNews('👔',`Cíl sezóny potvrzen: ${expectText(me.expect)}.`);saveGame();render();}
// ----- dresy -----
const KIT_COL=['#c8102e','#0b3d91','#ffffff','#111111','#ffd200','#00843d','#6cabdd','#7a263a','#f47a20','#5b2c83'];
function kitSet(i,c){const me=myClub();S.v4.kitO=S.v4.kitO||me.c.slice();me.c=me.c.slice();me.c[i]=c;saveGame();render();}
function kitHtml(){const me=myClub();const c=me.c||['#555','#fff'];const row=i=>`<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:4px">${KIT_COL.map(x=>`<button aria-label="Barva" onclick="kitSet(${i},'${x}')" style="width:44px;height:44px;border-radius:10px;border:${c[i]===x?'3px solid var(--gold)':'1px solid rgba(255,255,255,.25)'};background:${x}"></button>`).join('')}</div>`;
 return `<div class="card"><h3>👕 Dresy a klubové barvy</h3><div class="row small" style="gap:10px">${badge(me,'')}<span>Aktuální barvy klubu</span></div><div class="small" style="margin-top:8px">Hlavní barva</div>${row(0)}<div class="small" style="margin-top:8px">Doplňková barva</div>${row(1)}${S.v4.kitO?`<button class="btn ghost" style="margin-top:8px" onclick="myClub().c=S.v4.kitO.slice();delete S.v4.kitO;saveGame();render()">Vrátit původní barvy</button>`:''}</div>`;}
// ----- náhodné události -----
function v4Events(){if(S.round<1||seasonOver())return;const ps=clubPlayers(S.clubId).filter(p=>!p.loan);if(ps.length<12)return;const r=RNG();
 const hh=ps.filter(p=>pers(p)==='hh');const pk=a=>pick(a.length?a:ps);
 if(r<0.03){const p=pk(hh.concat(ps.filter(p=>ageOf(p)<25)));p.mor=clamp((p.mor||60)-15,0,100);const fine=Math.round(playerWage(p)*0.5/100)*100;money(fine,'tv','Pokuta hráči');fansAdd(-2);addNews('🍾',`${p.n} byl v noci přistižen v baru. Klub mu udělil pokutu ${fmtMoney(fine)} a nálada v kabině utrpěla.`);}
 else if(r<0.05){const p=pk(ps.filter(p=>p.inj<=0));if(p.inj<=0){p.inj=rint(1,2);addNews('🤕',`Nepříjemná kolize na tréninku: ${p.n} bude chybět ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.`);}}
 else if(r<0.06){fansAdd(4);S.boardTrust=clamp(S.boardTrust+2,0,100);addNews('🤝','Cena fair play! Fanoušci soupeře ocenili gesto tvých hráčů, o klubu se píše v dobrém.');}
 else if(r<0.064){const p=pick(ps);p.sus=Math.max(p.sus||0,rint(3,5));fansAdd(-4);S.boardTrust=clamp(S.boardTrust-3,0,100);addNews('💉',`Dopingový skandál! ${p.n} měl pozitivní test na zakázaný stimulant a dostal zákaz na ${p.sus} zápasy.`);}
 else if(r<0.08&&hh.length){const p=pick(hh);p.mor=clamp((p.mor||60)-10,0,100);S.cohesion=clamp(S.cohesion-2,0,100);addNews('🌋',`${p.n} se na tréninku pohádal se spoluhráčem. Sehranost mírně klesla.`);}
 else if(r<0.095){const p=pick(ps);p.hap=clamp((p.hap||60)+5,0,100);fansAdd(2);addNews('❤️',`${p.n} navštívil dětskou nemocnici. Fanoušci jsou nadšení.`);}}
function v4bWeek(){const L=Math.min(2,nLeaders());if(L)S.cohesion=clamp(S.cohesion+0.3*L,0,100);v4Events();tipEval();betAch();}
// ----- tip týdne a úspěchy sázkaře -----
function tipGen(){const V=S.v4;if(V.tip&&V.tip.s===S.season&&V.tip.r===S.round)return V.tip;let best=null;
 for(const g of betGroups()){if(g.world)continue;for(const m of g.ms){const o=matchOdds(m.h,m.a,m.mid);for(const mk of ['1','2']){const x=o[mk];if(x>=1.35&&x<=2.3&&(!best||Math.abs(x-1.7)<Math.abs(best.o-1.7)))best={mid:m.mid,mk,o:x};}}}
 V.tip=best?Object.assign(best,{s:S.season,r:S.round}):{s:S.season,r:S.round,none:1};return V.tip;}
function tipRes(t){const m=parseMid(t.mid);if(m.t!=='L')return null;const L=S.leagues[m.code];if(!L||!L.res||!L.res[m.r])return null;const x=L.res[m.r].find(z=>z.h===m.h&&z.a===m.a);return x?legResult({mk:t.mk},x):null;}
function tipEval(){const V=S.v4;const t=V.tip;if(!t||t.none||t.ev)return;const r=tipRes(t);if(r==null)return;t.ev=1;V.tipS=V.tipS||[0,0];V.tipS[0]++;if(r)V.tipS[1]++;}
function tipHtml(){let t;try{t=tipGen();}catch(e){return '';}if(!t||t.none)return '';const V=S.v4;const st=V.tipS||[0,0];
 return `<div class="card" style="padding:10px 12px;border-color:var(--gold)"><div class="small">🎩 <b>Tip týdne</b> od Vlasty, který sází už čtyřicet let:</div><div class="row small" style="margin-top:6px"><span style="flex:1;min-width:0"><b>${esc(midTitle(t.mid))}</b><div class="tiny mut">${MK_LBL[t.mk]} · „${t.o<1.6?'Tohle je jistota, na to bych vsadil i chalupu.':'Kurz má hodnotu, tady bych to risknul.'}“</div></span><b class="gold">${czOdd(t.o)}</b><button class="btn ghost sm" style="min-height:44px;margin-left:6px" onclick="toast(addToSlip('${t.mid}','${t.mk}')||'Přidáno na sázenku.');saveGame();render()">Vsadit</button></div>${st[0]?`<div class="tiny mut" style="margin-top:4px">Vlastovy tipy: ${st[1]} z ${st[0]} vyšlo.</div>`:''}</div>`;}
function betAch(){const bs=S.bets||[];if(bs.length>=50)ach('sazky50');for(const b of bs){if(b.st!=='won')continue;ach('sazka1');if(b.legs.length>=3)ach('ako3');if(b.o>=5)ach('odvaha');}}
Object.assign(ACH,{sazka1:['🎟️','První výhra u sázek','Vyhraj první sázku.'],ako3:['🧩','Trefa AKO','Vyhraj AKO alespoň se třemi zápasy.'],odvaha:['🦁','Odvaha','Vyhraj sázku s kurzem 5,00 a víc.'],sazky50:['📒','Pravidelný sázkař','Podej 50 sázek.']});
// ----- karty na úvodní obrazovce -----
function v4bHomeCards(){const V=S.v4;const me=myClub();let h='';if(S.round===0&&!seasonOver()){const pre=V.pre&&V.pre.s===S.season?V.pre:{};
  if(!pre.camp)h+=`<div class="card"><h3>🏕️ Letní příprava – soustředění</h3><div class="small mut" style="margin-bottom:6px">Vyber, kam tým pojede. Ovlivní to sehranost, kondici a náladu.</div>${Object.entries(CAMP).map(([k,c])=>`<button class="btn ghost" style="display:block;margin-bottom:6px;text-align:left;width:100%;padding:8px 12px" onclick="campGo('${k}')"><div>${c[0]} <b>${c[1]}</b> <span class="gold">· ${fmtMoney(campCost(k))}</span></div><div class="tiny mut" style="font-weight:400">${c[2]}</div></button>`).join('')}</div>`;
  if(!pre.fr)h+=`<div class="card" style="padding:10px 12px"><div class="row small"><span style="flex:1">🤝 <b>Přípravné zápasy</b><div class="tiny mut">Dva přátelské zápasy proti podobně silným soupeřům: sehranost a vstupné.</div></span><button class="btn ghost sm" style="min-height:44px" onclick="friendlies()">Odehrát</button></div></div>`;}
 if(S.round<=2&&V.bneg!==S.season&&!seasonOver()){const amt=Math.max(30000,Math.round((me.tv||20000)*3/10000)*10000);
  h+=`<div class="card"><h3>👔 Jednání s vedením</h3><div class="small">Vedení čeká: <b class="gold">${expectText(me.expect)}</b>. Můžeš si vyjednat jiný cíl a rozpočet.</div><div style="margin-top:8px">${me.expect>1?`<button class="btn ghost" style="width:100%;margin-bottom:6px" onclick="boardNeg('up')">📈 Slíbit lepší umístění (+${fmtMoney(amt)} do rozpočtu)</button>`:''}<button class="btn" style="width:100%;margin-bottom:6px" onclick="boardNeg('ok')">✅ Přijmout cíl</button><button class="btn ghost" style="width:100%" onclick="boardNeg('down')">📉 Snížit cíl (−${fmtMoney(Math.round(amt/2))} z rozpočtu)</button></div></div>`;}
 return h;}
// ----- napojení -----
(function(){
 const _hc=v4HomeCards;v4HomeCards=function(){let h='';try{h=v4bHomeCards();}catch(e){}return h+_hc();};
 const _wk=v4Week;v4Week=function(){_wk();try{v4bWeek();}catch(e){console.warn(e);}};
 const _ph=v4PreHtml;v4PreHtml=function(F){const opp=F.h===S.clubId?F.a:F.h;return _ph(F)+`<div class="card" style="padding:8px 12px"><div class="small">📊 ${esc(h2hTxt(opp))}</div>${talkSeg()}</div>`;};
 const _am=v4AfterMatch;v4AfterMatch=function(M){_am(M);const ui=userSide(M);h2hAdd(M.sides[1-ui].cid,M.score[ui],M.score[1-ui]);UI.talk=null;};
 const _rf=renderFacilities;renderFacilities=function(){return _rf()+kitHtml();};
 const _rc2=renderCareer;renderCareer=function(){return _rc2()+rivalsHtml();};
 const _mh=v4MineHtml;v4MineHtml=function(p){return persHtml(p)+_mh(p);};
 const _oh=v4OtherHtml;v4OtherHtml=function(p){return persHtml(p)+_oh(p);};
 const _re=recalc;recalc=function(M){_re(M);if(M.tb&&M.str)M.str.forEach((s,i)=>{const b=M.tb[i]||0;if(b){s.att+=b;s.def+=b;s.mid+=b;}});if(M.tb&&M.str)M.xg=xgPair(M.str[0],M.str[1]);};
 const _cm=createMatch;createMatch=function(h,a,F){const M=_cm(h,a,F);if((h===S.clubId||a===S.clubId)&&UI.talk&&TALK[UI.talk]){const r=talkEff(M,UI.talk,0);M.ev.push({m:0,t:'ko',tx:'🗣️ '+TALK[UI.talk][1]+': '+r.tx});}return M;};
})();

// ===== Prodej zápasu (satirická herní mechanika, jen herní peníze) =====
const FIXK={lose:['Prohra','Tvůj tým zápas prohraje.',1],lose2:['Prohra o 2 a více gólů','Soupeř musí vyhrát alespoň o dva góly.',1.8],first:['Soupeř dá první gól','Stačí, aby soupeř skóroval jako první.',0.6]};
const FIXL={1:['Nenápadně','Pár zaváhání v obraně, nic okatého. Menší šance na úspěch, menší riziko.',5],2:['Okatě','Hráči hrají vyloženě na prohru. Výrazně vyšší šance na „správný“ výsledek, ale velké riziko odhalení.',14]};
const FIX_BETS=[0,500,2000,5000];
function fixS(){if(!S.fix)S.fix={heat:0,n:0,cases:[],conv:0,ban:0,pr:null,ref:0,ok:0,tips:[]};return S.fix;}
function fixBase(){return Math.round(clamp(200+(myClub().tv||0)*0.0006,200,2500)*15/100)*100;}
function fixPay(k){return Math.round(fixBase()*FIXK[k][2]/100)*100;}
function fixOppOdd(F){const o=matchOdds(F.h,F.a,'fix'+F.h+F.a);return F.h===S.clubId?o['2']:o['1'];}
function fixRisk(d){if(!d)return 0;const f=fixS();return Math.round(clamp(4+8*d.l+(d.bet?14+d.bet/700:0)+f.heat*5+f.conv*6,0,90));}
function fixHeatTxt(){const h=fixS().heat;return h<1?'žádné':h<3?'mírné':h<5?'zvýšené':'vysoké';}
function fixAllowed(F){const f=fixS();return F&&!f.ban&&!(f.pr&&f.pr.forced===0);}
function fixSheet(){const F=UI.F;if(!F)return;const f=fixS();if(f.ban>0){toast('Máš zákaz vedení týmu, s nikým se teď nebav.');return;}
 const d=UI.fxd||(UI.fxd=UI.fix?Object.assign({},UI.fix):{k:'lose',l:1,bet:0});const od=fixOppOdd(F);const deal=!!UI.fix;
 const opt=(arr,cur,fn)=>arr.map(([v,t,s])=>`<button class="btn ${cur===v?'gold':'ghost'} w100" style="margin-bottom:6px;display:block;text-align:left;padding:8px 12px" onclick="${fn}(${typeof v==='string'?`'${v}'`:v})"><b>${t}</b>${s?`<div class="tiny" style="font-weight:400;opacity:.85">${s}</div>`:''}</button>`).join('');
 modal(`<h2>🕴️ Nabídka „prodat“ zápas</h2><div class="small mut" style="margin-bottom:8px">Satirická herní mechanika, jen s herními penězi. Ve skutečném fotbale je ovlivňování zápasů trestný čin.</div>
 <div class="card" style="padding:10px 12px"><div class="small">Muž z podezřelé sázkařské skupiny ti nabízí peníze na osobní konto, když zápas dopadne podle jejich přání. Záloha 30 % hned, zbytek po zápase. <b>Když to nevyjde, budou chtít zálohu zpátky i s úroky.</b></div></div>
 <div class="small" style="margin:8px 0 4px"><b>Co chtějí</b></div>${opt(Object.entries(FIXK).map(([k,x])=>[k,x[0]+' · '+fmtMoney(fixPay(k)),x[1]]),d.k,'fixPickK')}
 <div class="small" style="margin:8px 0 4px"><b>Jak moc to hrát</b></div>${opt(Object.entries(FIXL).map(([k,x])=>[+k,x[0],x[1]]),d.l,'fixPickL')}
 <div class="small" style="margin:8px 0 4px"><b>Vsadit si proti vlastnímu týmu</b> <span class="tiny mut">(kurz na soupeře ${czOdd(od)})</span></div><div class="grid2" style="gap:6px">${FIX_BETS.map(b=>`<button class="btn ${d.bet===b?'gold':'ghost'}" ${b>S.wallet?'disabled':''} onclick="fixPickB(${b})">${b?fmtMoney(b):'Nesázet'}</button>`).join('')}</div>
 <div class="small" style="margin-top:10px">Riziko odhalení: <b class="${fixRisk(d)>35?'bad':'warn'}">${fixRisk(d)} %</b> · podezření svazu: ${fixHeatTxt()}${f.conv?` · dřívější tresty: ${f.conv}`:''}</div>
 <div class="tiny mut" style="margin-top:4px">Poctiví hráči (profesionálové a vůdci) můžou odmítnout a věc vynést ven. Sázka proti sobě riziko výrazně zvyšuje.</div>
 <div class="grid2" style="margin-top:10px;gap:8px">${deal?`<button class="btn ghost" onclick="fixCancel()">Zrušit dohodu</button>`:`<button class="btn ghost" onclick="UI.fxd=null;closeModal();preMatch()">Odmítnout</button>`}<button class="btn gold" onclick="fixAccept()">${deal?'Upravit dohodu':'Domluvit'}</button></div>`);}
function fixPickK(k){UI.fxd.k=k;fixSheet();}function fixPickL(l){UI.fxd.l=l;fixSheet();}function fixPickB(b){if(b>S.wallet)return;UI.fxd.bet=b;fixSheet();}
function fixAccept(){const d=UI.fxd;if(!d)return;UI.fix={k:d.k,l:d.l,bet:d.bet,pay:fixPay(d.k),odd:fixOppOdd(UI.F)};UI.fxd=null;closeModal();toast('Dohodnuto. Teď už není cesty zpět…');preMatch();}
function fixCancel(){const x=UI.fix;UI.fix=null;UI.fxd=null;if(x&&!x.forced){const f=fixS();f.pr={owe:Math.round(x.pay*0.3/100)*100,forced:null,r:S.round,s:S.season,why:'cancel'};addNews('📞','Telefonát z neznámého čísla: „Dohoda je dohoda, trenére. Za zrušení se platí.“');}closeModal();preMatch();}
function fixOfferCard(F){const f=fixS();if(!F||f.ban||UI.fix||(f.pr&&f.pr.owe))return '';const h=hashStr('of'+S.season+'|'+S.round+'|'+F.h+F.a)%100;if(h>=13||UI.fixNo===S.round+'|'+S.season)return '';
 return `<div class="card" style="padding:10px 12px;border-color:var(--warn,#e9b949)"><div class="small">📞 <b>Neznámé číslo:</b> „Trenére, máme pro vás nabídku na ${fmtMoney(fixPay('lose'))}. Stačí, když zítra prohrajete.“</div><div class="grid2" style="margin-top:8px;gap:8px"><button class="btn ghost" onclick="fixRefuse()">Odmítnout</button><button class="btn ghost" onclick="fixSheet()">Vyslechnout</button></div></div>`;}
function fixRefuse(){const f=fixS();f.ref++;UI.fixNo=S.round+'|'+S.season;if(f.ref>=3)ach('nezlomny');addNews('🙅',`${S.manager} odmítl podezřelou nabídku na ovlivnění zápasu.`,1);preMatch();}
// použití v zápase
function fixApply(M){const f=fixS();const ui=userSide(M);if(f.ban>0){M.fixBan=1;}
 let d=UI.fix;UI.fix=null;if(!d&&f.pr&&f.pr.forced===1)d={k:'lose',l:1,bet:0,pay:0,odd:1,forced:1};if(!d)return;const xi=onPitch(M.sides[ui]);const hon=xi.filter(id=>{const k=pers(P(id));return k==='pro'||k==='vu';});const ref=hon.filter(()=>RNG()<(d.l===2?0.5:0.3));
 const eff=Math.max(0.4,1-0.15*ref.length);const sm=clubStr(S.clubId),so=clubStr(M.sides[1-ui].cid);
 if(d.bet){if(S.wallet<d.bet)d.bet=0;else S.wallet-=d.bet;}
 const adv=d.forced?0:Math.round(d.pay*0.3/100)*100;if(adv)S.wallet+=adv;
 M.fix=Object.assign({},d,{side:ui,eff,ref,adv,fav:sm-so});M.fixPen=FIXL[d.l][2]*eff;f.n++;f.heat+=d.l*0.8+(d.bet?0.8:0);
 xi.forEach(id=>{const p=P(id);if(p)p.hap=clamp((p.hap||60)-3,0,100);});recalc(M);}
function fixMet(M){const x=M.fix,ui=x.side;const my=M.score[ui],th=M.score[1-ui];if(x.k==='lose')return my<th;if(x.k==='lose2')return th-my>=2;const g=M.ev.find(e=>e.t==='goal');return !!g&&g.s!==ui;}
function fixSettle(M){const f=fixS();if(f.ban>0){f.ban--;if(!f.ban)addNews('✅','Trest skončil, trenér se vrací na lavičku.');}if(f.box>0){f.box--;if(!f.box)addNews('✅','Zákaz vstupu do lóže skončil. Zase můžeš na trenéra křičet zblízka.');}
 const x=M.fix;if(!x||x._done)return;x._done=1;const ui=x.side;const my=M.score[ui],th=M.score[1-ui];const ok=fixMet(M);const res=[];
 if(x.bet){if(th>my){const w=Math.round(x.bet*x.odd);S.wallet+=w;res.push(`Sázka proti vlastnímu týmu vyšla: +${fmtMoney(w)}.`);}else res.push(`Sázka proti vlastnímu týmu propadla (−${fmtMoney(x.bet)}).`);}
 if(x.forced){if(!f.pr){}else if(ok){f.pr=null;res.push('Mafie je spokojená, dluh je smazaný.');}else{f.pr.owe=Math.round(f.pr.owe*1.3/100)*100;f.pr.forced=null;res.push('Ani tentokrát to nevyšlo. Dluh u mafie roste.');}}
 else if(ok){const rest=x.pay-x.adv;S.wallet+=rest;res.push(`„Obchod“ vyšel: celkem ${fmtMoney(x.pay)} na osobní konto.`);f.ok++;}
 else{const owe=x.adv*2;f.pr={owe,forced:null,r:S.round,s:S.season,why:'fail'};res.push(`Zápas nedopadl podle dohody. Mafie chce zpátky ${fmtMoney(owe)}.`);addNews('📞',`Výhrůžný telefonát: „Trenére, dohodli jsme se jinak. Do příštího zápasu chceme ${fmtMoney(owe)}.“`);}
 x.ref.forEach(id=>{const p=P(id);if(p){p.hap=clamp((p.hap||60)-12,0,100);addNews('🙅',`${p.n} odmítl hrát na prohru a v kabině je dusno.`,1);}});
 const obvious=(x.fav>3&&th-my>=3)||x.l===2;let risk=4+8*x.l+(x.bet?14+x.bet/700:0)+f.heat*5+f.conv*6+(obvious?12:0)+x.ref.length*8+(M.rd?10:0);risk=clamp(risk,0,92);
 if(RNG()*100<risk){const sev=x.l+(x.bet?1:0)+(obvious?1:0)+(x.ref.length?1:0);f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(3,5),st:0,sev,opp:CL(M.sides[1-ui].cid).n,sc:my+':'+th,bet:x.bet});}
 else if(ok)ach('prodano');
 if(th>my&&obvious)fansAdd(-5,'Fanoušci po zápase pískali: „Prodali jste to!“ Na tribunách to vřelo.');
 M._fixRes={ok,res};}
function fixWeek(){const f=fixS();f.heat=Math.max(0,f.heat-0.1);
 for(const c of f.cases.slice()){if(c.s<S.season){c.s=S.season;c.r0=Math.min(c.r0,1);c.r1=Math.max(2,c.r1-S.maxRound);}
  if(c.st===0&&S.round>=c.r0){c.st=1;addNews('🔎',c.why==='ref'?`Disciplinární komise prošetřuje kontakty trenéra s rozhodčím kolem zápasu s týmem ${c.opp} (${c.sc}).`:c.why==='kom'?`Disciplinární komise zahájila řízení kvůli pokusu o její podplacení.`:c.why==='own'?`Disciplinární komise prošetřuje majitele klubu kvůli kontaktům s rozhodčím (zápas s týmem ${c.opp}).`:`Disciplinární komise zahájila prošetřování podezřelých sázek na zápas s týmem ${c.opp} (${c.sc}). Kurzy se před zápasem hýbaly podivně.`);fansAdd(-3);S.boardTrust=clamp(S.boardTrust-4,0,100);}
  else if(c.st===1&&S.round>=c.r1){f.cases=f.cases.filter(z=>z!==c);const guilty=RNG()<clamp(0.3+0.07*c.sev+(c.bet?0.08:0)+0.04*f.conv,0,0.75);
   if(!guilty){addNews('📁',`Disciplinární komise zastavila řízení kvůli nedostatku důkazů. Pověst ale utrpěla.`);fansAdd(-3);if(S.v4)S.v4.mrep=clamp(S.v4.mrep-3,0,100);continue;}
   const me=myClub();const sev=c.sev+f.conv;const rf=c.red?0.5:1;const ko=c.why==='kom';const fine=Math.round(clamp((me.tv||0)*3*sev*rf,100000*rf,Math.max(200000,(me.money||0)*0.1))/1e4)*1e4;const L0=S.leagues[me.lg];const dedSo=L0&&L0.dedS===S.season?(L0.ded||0):0;const ded=Math.max(0,Math.min(Math.round((1+1.5*c.sev+f.conv)*rf),ko?2:6,12-dedSo));const ban=Math.max(1,Math.min(ko?2:5,Math.round((c.sev+f.conv)*rf)));const oo=typeof ownOnly==='function'&&ownOnly();const dedA=oo&&!(sev>=3||f.conv>=2)?0:ded;const tbW=oo?2*ban+2:0;
   money(-fine,'prize','Pokuta za ovlivňování zápasu');const L=S.leagues[me.lg];if(L&&L.table&&L.table[S.clubId]){if(dedA){L.table[S.clubId].pts-=dedA;if(L.dedS!==S.season){L.dedS=S.season;L.ded=0;}L.ded=(L.ded||0)+dedA;}}
   if(oo){f.box=Math.max(f.box||0,ban+1);f.tb={s:S.season,r:S.round+tbW};ownRepAdd(-Math.round((4+3*sev)*rf));}else f.ban=Math.max(f.ban,ban);f.conv++;if(S.v4)S.v4.mrep=clamp(S.v4.mrep-6*sev*rf,0,100);fansAdd(-Math.round((8+4*sev)*rf));S.boardTrust=clamp(S.boardTrust-Math.round((14+6*sev)*rf),0,100);
   clubPlayers(S.clubId).forEach(p=>{p.hap=clamp((p.hap||60)-8,0,100);p.mor=clamp((p.mor||60)-8,0,100);});S.scandal={s:S.season,r:S.round,l:Math.min(3,sev),fix:1};ach('chycen');
   addNews('🚨',`SKANDÁL! ${mgrRef(1)} usvědčen ${ko?'z pokusu o podplacení disciplinární komise':c.why==='ref'||c.why==='own'?'z ovlivňování rozhodčího':'z prodeje zápasu'}${ko?'':` (zápas s týmem ${c.opp})`}${c.red?', komise byla nečekaně mírná':''}. Trest: pokuta ${fmtMoney(fine)}${oo?`${dedA?`, odečet ${dedA} ${czPlural(dedA,'bodu','bodů','bodů')}`:''}, zákaz vstupu do lóže na ${ban+1} ${czPlural(ban+1,'zápas','zápasy','zápasů')} a zákaz přestupů a jednání na ${tbW} ${czPlural(tbW,'týden','týdny','týdnů')}`:`, odečet ${ded} bodů a zákaz vedení týmu na ${ban} ${czPlural(ban,'zápas','zápasy','zápasů')}`}.`);
   if(sev>=5||f.conv>=4||(!isOwn()&&S.boardTrust<=0)){S.sackNow=1;S.sackWhy='Po usvědčení z prodeje zápasu';}}}
 const p=f.pr;if(p&&p.owe&&p.forced==null&&(S.round-p.r>=3||p.s<S.season)){p.r=S.round;p.s=S.season;fixMafiaHit();}}
function fixMafiaHit(){const f=fixS();const r=RNG();const ps=clubPlayers(S.clubId);
 if(r<0.35){const loss=Math.min(S.wallet,Math.round(f.pr.owe*0.5/100)*100);S.wallet-=loss;addNews('🔥',`Někdo ti v noci podpálil auto. Škoda ${fmtMoney(loss)} z osobního konta. Vzkaz za stěračem: „Dluh trvá.“`);}
 else if(r<0.7){ps.forEach(p=>p.mor=clamp((p.mor||60)-6,0,100));addNews('😨','Před tréninkem postávali neznámí muži a hráčům vyhrožovali. Nálada v kabině je pod psa.');}
 else{f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(2,4),st:0,sev:2,opp:'neznámým soupeřem',sc:'?',bet:0});addNews('📰','Novináři dostali anonymní tip na trenéra, který „spolupracuje se sázkaři“. Začíná se o tom mluvit.');}}
function fixPay2(){const f=fixS();const p=f.pr;if(!p)return;if(S.wallet<p.owe){toast('Na osobním kontě nemáš dost peněz.');return;}S.wallet-=p.owe;f.pr=null;addNews('💸','Dluh u sázkařské mafie je splacený. Snad už dají pokoj.');saveGame();render();}
function fixThrow(){const f=fixS();if(!f.pr)return;f.pr.forced=1;toast('Příští zápas máš „prohrát“. Dluh se tím smaže.');saveGame();render();}
function fixDefy(){const f=fixS();if(!f.pr)return;f.pr.r=S.round;fixMafiaHit();if(RNG()<0.5){f.pr=null;addNews('🛡️','Mafie po čase přestala volat. Prý našla jiného trenéra.');}saveGame();render();}
function fixHomeCard(){const f=fixS();let h='';const p=f.pr;
 if(p&&p.owe&&p.forced==null)h+=`<div class="card" style="border-color:var(--red,#e5484d)"><h3>📞 Mafie chce peníze</h3><div class="small">${p.why==='cancel'?'Zrušil jsi domluvený zápas.':'Prodaný zápas nedopadl podle dohody.'} Chtějí ${fmtMoney(p.owe)}. Na osobním kontě máš ${fmtMoney(S.wallet)}.</div>
  <button class="btn ghost w100" style="margin-top:8px" onclick="fixPay2()">💸 Zaplatit ${fmtMoney(p.owe)}</button><button class="btn ghost w100" style="margin-top:6px" onclick="fixThrow()">🎭 Prohrát příští zápas místo placení</button><button class="btn ghost w100" style="margin-top:6px" onclick="fixDefy()">🙅 Odmítnout a riskovat</button></div>`;
 else if(p&&p.forced===1)h+=`<div class="card" style="padding:10px 12px"><div class="small">🎭 Mafie čeká, že příští zápas prohraješ. Dluh: ${fmtMoney(p.owe)}.</div></div>`;
 if(f.ban>0)h+=`<div class="card" style="padding:10px 12px"><div class="small">⛔ <b>Zákaz vedení týmu:</b> ještě ${f.ban} ${czPlural(f.ban,'zápas','zápasy','zápasů')}. Tým vede asistent, ty zápas sleduješ z tribuny.</div></div>`;
 const open=f.cases.filter(c=>c.st===1).length;if(open)h+=`<div class="card" style="padding:10px 12px"><div class="small">🔎 Disciplinární komise prošetřuje ${open===1?'jeden tvůj zápas':open+' tvoje zápasy'}. Verdikt přijde v příštích týdnech.</div></div>`;
 return h;}
function fixPostHtml(M){const r=M._fixRes;if(!r)return '';return `<div class="card" style="padding:8px 12px"><h3>🕴️ Prodaný zápas</h3>${r.res.map(t=>`<div class="small" style="padding:2px 0">${esc(t)}</div>`).join('')}</div>`;}
Object.assign(ACH,{prodano:['🕶️','Šedá eminence','Prodej zápas a nenech se chytit.'],chycen:['⚖️','Před komisí','Dostaň trest za prodej zápasu.'],nezlomny:['🛡️','Nezlomný','Odmítni tři nabídky na prodej zápasu.'],vlasta:['🎩','Na radu veterána','Vyhraj sázku podle Vlastova tipu týdne.']});
Object.assign(CH,{fix_odds:['Kurzy na tenhle zápas se před výkopem hýbaly hodně divně. Někdo tam naházel velké peníze na {a}…','Koukám na pohyb kurzů a něco tu smrdí. Tohle není normální.','Data jsou jasná: během hodiny spadl kurz o třetinu. Tohle se jen tak nestane.'],
 fix_vet:['Čtyřicet let sázím a tenhle pohyb kurzů znám. Na tohle bych nesázel ani korunu.','Kluci, opatrně. Když se kurz takhle propadne, ví někdo víc než my.'],
 fix_goal:['To je prodaný jak prase, podívejte se na tu obranu!','Brankář se ani nehnul. Komise by si to měla pustit zpátky.','To snad nehrají vážně. Tohle je divadlo, ne fotbal.','Ten zákrok v obraně… tohle by nezahrál ani dorost. Něco tu nehraje.']});
FORUM.fixed=['Tohle byl prodaný zápas, jasný jak facka.','Hráli jak bez nohou. Ať se na to podívá komise.','Za tohle chci vrátit vstupné. Ostuda!','Kdo dneska vydělal, to se jednou dozvíme.'];
(function(){
 const _ba=bribeApply;bribeApply=function(M){_ba(M);try{fixApply(M);}catch(e){console.warn(e);}};
 const _re=recalc;recalc=function(M){_re(M);if(M.str&&(M.fixPen||M.fixBan)){const i=M.fix?M.fix.side:userSide(M);const s=M.str[i];const p=(M.fixPen||0)+(M.fixBan?2:0);s.att-=p;s.def-=p;s.mid-=p;M.xg=xgPair(M.str[0],M.str[1]);}};
 const _am=v4AfterMatch;v4AfterMatch=function(M){try{fixSettle(M);}catch(e){console.warn(e);}_am(M);};
 const _pp=v4PostHtml;v4PostHtml=function(M){return fixPostHtml(M)+_pp(M);};
 const _ph=v4PreHtml;v4PreHtml=function(F){let x='';try{const f=fixS();x=fixOfferCard(F);if(f.pr&&f.pr.forced===1&&!UI.fix)UI.fix={k:'lose',l:1,bet:0,pay:0,odd:1,forced:1};if(UI.fix)x+=`<div class="card" style="padding:8px 12px"><div class="small">🕴️ Domluveno: <b>${esc(FIXK[UI.fix.k][0].toLowerCase())}</b>, ${esc(FIXL[UI.fix.l][0].toLowerCase())}${UI.fix.bet?`, sázka proti sobě ${fmtMoney(UI.fix.bet)}`:''}.</div></div>`;if(f.ban>0)x+=`<div class="card" style="padding:8px 12px"><div class="small">⛔ Máš zákaz vedení týmu. Tým vede asistent, ty zápas sleduješ z tribuny.</div></div>`;}catch(e){}return x+_ph(F);};
 const _hc=v4HomeCards;v4HomeCards=function(){let h='';try{h=fixHomeCard();}catch(e){}return h+_hc();};
 const _wk=v4Week;v4Week=function(){_wk();try{fixWeek();}catch(e){console.warn(e);}};
 const _sl=startLive;startLive=function(){const b=S.fix&&S.fix.ban>0;const r=_sl.apply(this,arguments);if(b&&MS&&MS.M){MS.M.autoUser=true;MS.ban=1;toast('Máš zákaz vedení týmu. Sleduješ z tribuny, tým vede asistent.');try{updLive();}catch(e){}}return r;};
 const _ib=initBetChat;initBetChat=function(M){_ib(M);try{if(M.fix&&MS&&MS.chat){const U=MS.chat.users;chSay(M,U.find(u=>u.per==='stat')||U[0],'fix_odds',{},true);if(RNG()<0.7)chSay(M,U.find(u=>u.per==='vet')||U[1],'fix_vet',{},true);}}catch(e){}};
 const _co=chatOnEvents;chatOnEvents=function(M,ev){_co(M,ev);try{if(M.fix&&MS&&MS.chat&&ev.some(e=>e.t==='goal'&&e.s!==M.fix.side)&&RNG()<0.6){const U=MS.chat.users;chSay(M,U.find(u=>u.per==='troll')||pick(U),'fix_goal',{},true);}}catch(e){}};
 const _fh=forumHtml;forumHtml=function(M){if(M.fix){const o=FORUM.scandal;FORUM.scandal=FORUM.fixed;const s0=S.scandal;S.scandal={s:S.season};const h=_fh(M);FORUM.scandal=o;S.scandal=s0;return h;}return _fh(M);};
 const _tg=tipGen;tipGen=function(){const t=_tg();try{if(t&&!t.none){const f=fixS();const k=t.mid+'|'+t.mk;if(!f.tips.includes(k)){f.tips.push(k);if(f.tips.length>30)f.tips.shift();}}}catch(e){}return t;};
 const _ba2=betAch;betAch=function(){_ba2();const f=fixS();for(const b of S.bets||[]){if(b.st==='won'&&b.legs.some(l=>f.tips.includes(l.mid+'|'+l.mk))){ach('vlasta');break;}}};
})();

// ===== Režie ovlivněných zápasů: prodej zápasu a obálka pro rozhodčího =====
function fxReached(M){const x=M.fix;const u=x.side;const my=M.score[u],th=M.score[1-u];if(x.k==='lose')return th>my;if(x.k==='lose2')return th-my>=2;return M._firstG!=null&&M._firstG!==u;}
function fxDead(M){const x=M.fix;return x.k==='first'&&M._firstG!=null;}
function fxRat(id,d,M){if(id)M.rt[id]=(M.rt[id]||6)+d;}
function fxGoal(M,j,tx,out,shooter,og){const sd=M.sides[j];const sh=og||shooter||shooterOf(sd);if(!sh)return;M.score[j]++;M.stats[j].sh++;M.stats[j].sot++;M.stats[j].xg+=og?0.1:0.45;if(!og)fxRat(sh.id,0.8,M);
 const e={m:M.min,t:'goal',s:j,p:sh.id,pen:false,tx:tx.replace('{S}',pSurname(sh)),sc:M.score.slice(),fx:1};if(og)e.og=1;out.push(e);if(M._firstG==null)M._firstG=j;}
function pickDef(sd){const ids=onPitch(sd).filter(id=>GRP(P(id).pos)==='D');return P(pick(ids.length?ids:onPitch(sd)));}
const FXT={gk:['⚽ GÓL! Nevídaná hrubka: {K} pustil lehkou střelu, kterou poslal {S}, mezi rukama do sítě.','⚽ GÓL! {K} vyběhl z branky naprosto zbytečně a {S} míč jen poslal do prázdné sítě.','⚽ GÓL! {K} chtěl kličkovat ve vlastním vápně, přišel o míč a {S} skóroval.'],
 og:['⚽ GÓL! Vlastní gól! {D} si nešťastně, nebo možná šťastně, srazil centr do vlastní branky.','⚽ GÓL! Vlastní gól! {D} odvracel tak nešikovně, že míč skončil ve vlastní síti.','⚽ GÓL! Vlastní gól! {D} si nedomluvil malou domů a míč se dokutálel do prázdné branky.'],
 pen:['Hrubá chyba! {D} úplně zbytečně sestřelil soupeře ve vlastním vápně.','{D} zahrál ve vápně rukou, jako by chtěl, aby to sudí viděl.'],
 miss:['{S} netrefil prázdnou bránu z dvou metrů! Tohle snad ani nejde.','{S} šel sám na brankáře a místo střely přihrál soupeři.','{S} měl gól na noze, ale kopl míč vysoko nad břevno. Fanoušci se chytají za hlavu.'],
 pas:['Hráči týmu {T} jen pasivně posouvají míč, do útoku se nikomu nechce.','Tým {T} hraje podivně ustrašeně, obrana stojí a jen přihlíží.','Fanoušci pískají: hráči týmu {T} jako by ani nechtěli vyhrát.'],
 drift:['Trenér týmu {T} nečekaně stáhl celý tým do hluboké obrany. Na tribunách to nikdo nechápe.']};
function fxStep(M,out){const x=M.fix;if(!x||M.ended)return;const u=x.side,o=1-u;const reached=fxReached(M);
 const want=reached||fxDead(M)?0.45:1;if(M._fxW!==want){M._fxW=want;M.fixPen=FIXL[x.l][2]*x.eff*want;recalc(M);}
 if(reached||fxDead(M))return;const late=M.min>=70?1.9:M.min>=55?1.3:1;if(M._fxG==null){const su=clubStr(M.sides[u].cid),so=clubStr(M.sides[o].cid);M._fxG=clamp(Math.exp((su-so)/11),0.5,3.5);}let pT=(x.l===2?0.024:0.0115)*x.eff*late*M._fxG*(x.k==='lose2'?(x.l===2?1.25:1.45):x.k==='first'?(x.l===2?0.55:0.6):1);
 if(x.k==='lose2'&&M.score[o]-M.score[u]===1)pT*=1.2;if(RNG()>=pT)return;
 const sd=M.sides[u],op=M.sides[o];const gk=P(gkOf(sd));const df=pickDef(sd);const K=gk?pSurname(gk):'brankář',D=df?pSurname(df):'obránce',T=S.clubs[sd.cid].n;const r=RNG();
 if(r<0.3){fxGoal(M,o,pick(FXT.gk).replace('{K}',K),out);if(gk)fxRat(gk.id,-1.2,M);}
 else if(r<0.47){if(df){fxGoal(M,o,pick(FXT.og).replace('{D}',D),out,null,df);fxRat(df.id,-1,M);}}
 else if(r<0.68){out.push({m:M.min,t:'fill',s:u,fx:1,tx:'⚠️ '+pick(FXT.pen).replace('{D}',D)});if(df)fxRat(df.id,-0.6,M);M._fp=o;const ev=chance(M,o);M._fp=null;ev.forEach(e=>{out.push(e);if(e.t==='goal'&&M._firstG==null)M._firstG=o;});}
 else if(r<0.86){const sh=shooterOf(sd);if(sh){M.stats[u].sh++;M.stats[u].xg+=0.6;fxRat(sh.id,-0.7,M);out.push({m:M.min,t:'miss',s:u,p:sh.id,fx:1,tx:pick(FXT.miss).replace('{S}',pSurname(sh))});}}
 else if(!M._fxDrift&&RNG()<0.5){M._fxDrift=1;sd.tac=Object.assign({},sd.tac,{ment:'def'});recalc(M);out.push({m:M.min,t:'fill',s:u,fx:1,tx:pick(FXT.drift).replace('{T}',T)});}
 else out.push({m:M.min,t:'fill',s:u,fx:1,tx:pick(FXT.pas).replace('{T}',T)});}
const BRW=[0,0.4,1.2,2.2];
const BRT={pen:['Sporný pád ve vápně… a sudí bez váhání ukazuje na penaltový bod! Hráči soupeře nevěří vlastním očím.','Lehký kontakt, útočník padá jako podťatý a rozhodčí píská penaltu. Videorozhodčí mlčí.'],
 red:['🟥 Přísná červená! Sudí vyloučil hráče {S} po úplně běžném souboji. Lavička soupeře šílí.','🟥 Nepochopitelné! {S} dostává přímou červenou za skluz, který trefil čistě míč.'],
 add:['⏱️ Sudí nastavuje podezřele dlouho, i když se skoro nezdržovalo. Fanoušci soupeře pískají.'],
 var:['⚽ Míč je v síti… ale gól neplatí! Asistent mává ofsajd, přestože opakovaný záběr žádný ofsajd neukazuje.','⚽ Gól… ne! Sudí po konzultaci s videorozhodčím odpískal faul útočníka, který na záznamu nikdo nevidí.']};
function brStep(M,out){const b=M.bribe;if(!b||M.ended)return;const u=b.side,o=1-u;const my=M.score[u],th=M.score[1-u];const need=my<=th?1.6:my-th===1?0.8:0.35;
 if(RNG()<0.0013*BRW[b.l]*need){out.push({m:M.min,t:'fill',s:u,br:1,tx:'🤔 '+pick(BRT.pen)});M._fp=u;const ev=chance(M,u);M._fp=null;ev.forEach(e=>{e.br=1;out.push(e);if(e.t==='goal'&&M._firstG==null)M._firstG=u;});}
 if(!M._brRed&&RNG()<0.0006*BRW[b.l]*need&&M.min<85){const ids=onPitch(M.sides[o]).filter(id=>GRP(P(id).pos)!=='G');const id=pick(ids);if(id){M._brRed=1;M.stats[o].rc++;fxRat(id,-1.5,M);P(id)._mred=1;out.push({m:M.min,t:'red',s:o,p:id,br:1,tx:pick(BRT.red).replace('{S}',nm(id))});removeFromPitch(M,o,id);M.sides[o].red++;}}
 if(M.half===2&&M.min===88&&!M._brAdd&&my<=th){M._brAdd=1;M.added[1]=Math.min(10,M.added[1]+b.l);out.push({m:M.min,t:'fill',s:u,br:1,tx:pick(BRT.add)});}}
Object.assign(CH,{fix_miss:['Ten to netrefil z metru? To se nedá netrefit, ani kdyby chtěl… ledaže by chtěl.','Tohle si pusťte zpomaleně. Takhle nezahazuje ani okresní přebor.','Moje babička by to dala. Tady někdo hraje na jiný výsledek.'],
 bribe_pen:['Tohle že je penalta? Sudí má asi novou chatu.','Kolik stála ta penalta? Ptám se jen tak.','To je skandál, pád jako ve filmu a sudí píská. Vracím tiket.'],
 bribe_red:['Červená za tohle? Rozhodčí dneska píská jen na jednu stranu.','Sudí si dneska vydělal, to je jasný. Tohle nebyla ani žlutá.'],
 bribe_var:['Ofsajd? Kde? Tohle je loupež za bílého dne.','Gól neplatí a nikdo neví proč. Tohle by měla řešit komise.'],
 bribe_add:['Takové nastavení? Sudí snad čeká, až to vyrovnají.','Hraje se, dokud to nevyjde, nebo co? Tohle je ostuda.']});
(function(){
 const _sm=stepMinute;stepMinute=function(M){const out=_sm(M);if(M._firstG==null){const g=out.find(e=>e.t==='goal');if(g)M._firstG=g.s;}if(M.ended||(!M.fix&&!M.bribe))return out;const post=[];try{if(M.fix)fxStep(M,post);if(M.bribe)brStep(M,post);}catch(e){console.warn(e);}
  post.forEach(e=>M.ev.push(e));return out.concat(post);};
 const _ch=chance;chance=function(M,i,kind){if(M.fix&&i===M.fix.side&&M._fp==null&&!fxReached(M)&&!fxDead(M)&&RNG()<(M.fix.l===2?0.5:0.25)*(M.fix.k==='first'?0.55:1)*M.fix.eff*Math.min(1.8,M._fxG||1)){const sh=shooterOf(M.sides[i],kind);if(sh){M.stats[i].sh++;M.stats[i].xg+=0.15;return [{m:M.min,t:'miss',s:i,p:sh.id,fx:1,tx:pick(FXT.miss).replace('{S}',pSurname(sh))}];}}return _ch(M,i,kind);};
 const _pm=bribePenMul;bribePenMul=function(M,i){if(M._fp===i)return 999;const b=M.bribe;if(!b)return _pm(M,i);return b.side===i?1+0.4*BRW[b.l]:Math.max(0.4,1-0.18*BRW[b.l]);};
 const _cm=bribeCardMul;bribeCardMul=function(M,i){const b=M.bribe;if(!b)return _cm(M,i);return b.side===i?Math.max(0.45,1-0.15*BRW[b.l]):1+0.3*BRW[b.l];};
 const _vg=varGoalP;varGoalP=function(M,i){const b=M.bribe;if(b&&b.side!==i){M._brVar=1;return 0.04+0.045*BRW[b.l];}M._brVar=0;return _vg(M,i);};
 const _vt=varGoalTx;varGoalTx=function(M,i){if(M._brVar)return pick(BRT.var);return _vt(M,i);};
 const _co=chatOnEvents;chatOnEvents=function(M,ev){_co(M,ev);try{if(!MS||!MS.chat)return;const U=MS.chat.users;const tr=U.find(u=>u.per==='troll')||pick(U);const fa=U.find(u=>u.per===(M.bribe&&M.bribe.side===0?'fanA':'fanH'))||pick(U);
  for(const e of ev){if(M.fix&&e.fx&&e.t==='miss'&&RNG()<0.6)chSay(M,tr,'fix_miss',{},true);
   if(M.bribe){if(e.br&&e.t==='pen')chSay(M,fa,'bribe_pen',{},true);else if(e.br&&e.t==='red')chSay(M,fa,'bribe_red',{},true);else if(e.br&&e.t==='fill'&&/nastavuje/.test(e.tx))chSay(M,tr,'bribe_add',{},true);else if(e.t==='var'&&e.vg&&e.s!==M.bribe.side)chSay(M,fa,'bribe_var',{},true);}}}catch(x){}};
})();

// ===== Živé sázky (vlastní i souběžný zápas) a objem sázek =====
const LV_MK={'1':'Domácí','X':'Remíza','2':'Hosté',nx_h:'Další gól: domácí',nx_a:'Další gól: hosté',nx_0:'Už žádný gól',o15:'Víc než 1,5 gólu',u15:'Míň než 1,5 gólu',o25:'Víc než 2,5 gólu',u25:'Míň než 2,5 gólu',o35:'Víc než 3,5 gólu',u35:'Míň než 3,5 gólu',gg:'Oba týmy dají gól',ng:'Aspoň jeden tým nedá gól'};
const LV_SH={'1':'Domácí','X':'Remíza','2':'Hosté',nx_h:'Domácí',nx_a:'Hosté',nx_0:'Nikdo',o15:'Víc 1,5',u15:'Míň 1,5',o25:'Víc 2,5',u25:'Míň 2,5',o35:'Víc 3,5',u35:'Míň 3,5',gg:'Ano',ng:'Ne'};
const LV_G=[['res','Výsledek',['1','X','2']],['nx','Další gól',['nx_h','nx_0','nx_a']],['ou','Góly',['o15','u15','o25','u25','o35','u35']],['bt','Oba dají gól',['gg','ng']]];
function lvGoals(M){return M.ev.filter(e=>e.t==='goal');}
function lvRate(M,i){const tot=M.et?120:90;const rem=M.ended?0:Math.max(0,tot-M.min)/90;const sd=M.sides?M.sides[i]:(i?M.a:M.h),op=M.sides?M.sides[1-i]:(i?M.h:M.a);
 const my=M.score[i],th=M.score[1-i];const g=typeof gsMul==='function'?gsMul(my,th,M.min>=60):1;const late=M.min>80&&my<th?1.12:1;
 return (M.xg?M.xg[i]:(i?1.1:1.3))*0.88*rem*g*late*((op&&op.red)?0.85:1);}
function lvProbs(M){let xh=lvRate(M,0),xa=lvRate(M,1);
 const pf=(l,k)=>{let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f;};const s=M.score;const r={};for(const k in LV_MK)r[k]=0;let t=0;
 const MX=[[0.7,0.25],[1,0.5],[1.35,0.25]];const ph=[],pa=[];for(let i=0;i<9;i++){ph[i]=0;pa[i]=0;for(const [f,w] of MX){ph[i]+=w*pf(xh*f,i);pa[i]+=w*pf(xa*f,i);}}
 for(let i=0;i<9;i++)for(let j=0;j<9;j++){const p=ph[i]*pa[j];t+=p;const a=s[0]+i,b=s[1]+j,n=a+b;r[a>b?'1':a===b?'X':'2']+=p;r[n>1?'o15':'u15']+=p;r[n>2?'o25':'u25']+=p;r[n>3?'o35':'u35']+=p;r[a>0&&b>0?'gg':'ng']+=p;}
 for(const k in r)r[k]/=t||1;const l=xh+xa;const p0=Math.exp(-l);r.nx_0=p0;r.nx_h=l>0?(1-p0)*xh/l:0;r.nx_a=l>0?(1-p0)*xa/l:0;return r;}
const LV_HI=[21,23,26,29,34,41,51];
function lvOdd0(p){p=Math.max(0.0005,Math.min(0.9995,+p||0));const m=1+0.065*Math.min(1,(1-p)*4);let o=1/Math.min(0.995,p*m);
 if(o<2)o=Math.round(o*100)/100;else if(o<3)o=Math.round(o*50)/50;else if(o<5)o=Math.round(o*20)/20;else if(o<10)o=Math.round(o*10)/10;else if(o<20)o=Math.round(o*2)/2;else o=LV_HI.reduce((b,v)=>Math.abs(v-o)<Math.abs(b-o)?v:b,21);
 return Math.max(1.01,Math.min(51,o));}
function lvOdd(p){return lvOdd0(p);}
// stav jedné sázky: 'won' | 'lost' | null (ještě běží)
function lvState(M,b){if(b.mk.startsWith('nx_')){const g=lvGoals(M);if(g.length>b.gc){const s=g[b.gc].s;return (b.mk==='nx_h'&&s===0)||(b.mk==='nx_a'&&s===1)?'won':'lost';}if(M.ended)return b.mk==='nx_0'?'won':'lost';return null;}
 const p=lvProbs(M)[b.mk];if(M.ended)return p>0.5?'won':'lost';if(p>0.9999)return 'won';if(p<0.0001)return 'lost';return null;}
function lvOpen(M,mk){if(M.ended||M.min>=(M.et?118:88))return false;const p=lvProbs(M)[mk];return p>0.005&&p<0.995;}
function lvList(w){return w==='pm'?(PM?PM.bets:[]):(MS&&MS.lv?MS.lv:[]);}
function lvM(w){return w==='pm'?(PM&&PM.M):(MS&&MS.M);}
function lvTitle(w){const M=lvM(w);return M?CL(M.h.cid).n+' – '+CL(M.a.cid).n:'';}
function lvSyncRefund(){if(!S||!S.v4)return;S.v4.pmRefund=(PM&&!PM.done?PM.bets:[]).filter(b=>!b.co&&!b.res).reduce((s,b)=>s+b.stake,0);S.v4.lvRefund=(MS&&!MS.done&&MS.lv?MS.lv:[]).filter(b=>!b.co&&!b.res).reduce((s,b)=>s+b.stake,0);}
function lvPay(b,w){const v=Math.round(b.stake*b.o);b.res='won';b.win=v;S.wallet+=v;S.betStats.won+=v;S.betStats.nw++;const hs=betSeasonStat();hs.won+=v;hs.nw++;if(v>(S.betStats.best||0)){S.betStats.best=v;S.betStats.bestO=b.o;}addNews('🎲',`Živá sázka vyšla! ${lvTitle(w)} – ${LV_MK[b.mk]}: výhra ${fmtMoney(v)}.`,1);}
function lvSettle(w){const M=lvM(w);if(!M)return;let ch=0;for(const b of lvList(w)){if(b.co||b.res)continue;const st=lvState(M,b);if(st==='won'){lvPay(b,w);ch=1;}else if(st==='lost'){b.res='lost';ch=1;}}if(ch)lvSyncRefund();}
function lvUserSide(M){return M.h.cid===S.clubId?0:M.a.cid===S.clubId?1:-1;}
function lvAgainst(M,mk){const u=lvUserSide(M);if(u<0)return false;return u===0?(mk==='2'||mk==='nx_a'):(mk==='1'||mk==='nx_h');}
function lvBet(w,mk){const M=lvM(w);if(!M){toast('Zápas není k dispozici.');return;}if(!lvOpen(M,mk)){toast('Tahle sázka už je uzavřená.');return;}const st=UI.lbStake||200;
 if(S.wallet<st){toast('Na osobním kontě nemáš dost peněz.');return;}if(typeof betLimitLeft==='function'&&betLimitLeft()<st){toast('Překročil bys limit sázek na kolo.');return;}
 const o=lvOdd(lvProbs(M)[mk]);S.wallet-=st;S.betStats.st+=st;S.betStats.n++;const hs=betSeasonStat();hs.st+=st;hs.n++;
 const b={mk,o,stake:st,min:M.min,gc:lvGoals(M).length};if(w==='pm')PM.bets.push(b);else{MS.lv=MS.lv||[];MS.lv.push(b);}
 if(lvAgainst(M,mk)&&typeof fixS==='function'){const f=fixS();f.heat+=0.4;b.ag=1;if(RNG()<0.1)f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(3,5),st:0,sev:1,opp:CL(M.sides[1-lvUserSide(M)].cid).n,sc:'?',bet:st});}
 lvSyncRefund();if(typeof updLive==='function')updLive();toast(`Živá sázka přijata: ${LV_MK[mk]} za ${czOdd(o)}`);}
function lvCoVal(w,b){const M=lvM(w);if(!M)return 0;const p=lvState(M,b)?0:(b.mk.startsWith('nx_')?lvProbs(M)[b.mk]:lvProbs(M)[b.mk]);return Math.max(0,Math.round(b.stake*b.o*p*0.9/10)*10);}
function lvCashout(w,i){const b=lvList(w)[i];const M=lvM(w);if(!b||b.co||b.res||!M||M.ended)return;const v=lvCoVal(w,b);if(v<=0){toast('Tuhle sázku teď nejde vybrat.');return;}b.co=v;S.wallet+=v;S.betStats.won+=v;const hs=betSeasonStat();hs.won+=v;lvSyncRefund();
 addNews('🎲',`Předčasný výběr živé sázky: ${fmtMoney(v)} (${lvTitle(w)}).`,1);if(typeof updLive==='function')updLive();toast('Vybráno '+fmtMoney(v));}
// ----- objem sázek simulovaných sázkařů -----
function volPool(h,a){return clamp(Math.round(Math.exp((clubStr(h)+clubStr(a)-120)/12)*40000/1000)*1000,8000,3000000);}
function volSplit(pr,seed,keys){const w=keys.map(k=>Math.pow(Math.max(0.01,pr[k]),0.8)*(1+((hashStr(seed+k)%100)/100-0.5)*0.25));const t=w.reduce((x,y)=>x+y,0)||1;return w.map(x=>x/t);}
function volPre(h,a,seed){const o=matchOdds(h,a,seed||'');const inv=k=>1/o[k];const s3=inv('1')+inv('X')+inv('2'),s2=inv('o25')+inv('u25');const pr={'1':inv('1')/s3*1.08,'X':inv('X')/s3*0.9,'2':inv('2')/s3,o25:inv('o25')/s2,u25:inv('u25')/s2};
 const P0=volPool(h,a);return {pool:P0,res:volSplit(pr,seed+'r',['1','X','2']).map(x=>Math.round(P0*x/10)*10),ou:volSplit(pr,seed+'o',['o25','u25']).map(x=>Math.round(P0*0.45*x/10)*10)};}
function volAcc(M){const h=M.h.cid,a=M.a.cid,seed=h+a+S.season;let V=M.vol;
 if(!V){const base=volPre(h,a,seed);V=M.vol={pool:base.pool,pre:base.res.map(x=>x/base.pool),ouPre:base.ou.map(x=>x/(base.ou[0]+base.ou[1]||1)),res:base.res.slice(),ou:base.ou.slice(),nx:[0,0,0],ng:0,m:0};}
 const tgt=Math.min(M.min,125);if(V.m>=tgt)return V;const lp=lvProbs(M);const ng=lvGoals(M).length;if(ng!==V.ng){V.ng=ng;V.nx=[0,0,0];}
 for(let m=V.m+1;m<=tgt;m++){const r=V.pool/40*(0.85+((hashStr(seed+'m'+m)%100)/100)*0.3)*(m>75?1.25:1);
  const w=Math.min(0.6,0.15+0.5*m/90);const lv=volSplit(lp,seed+'l'+Math.floor(m/5),['1','X','2']);
  for(let i=0;i<3;i++)V.res[i]+=r*(V.pre[i]*(1-w)+lv[i]*w);
  const ol=volSplit(lp,seed+'q'+Math.floor(m/5),['o25','u25']);for(let i=0;i<2;i++)V.ou[i]+=r*0.45*(V.ouPre[i]*(1-w)+ol[i]*w);
  const nl=volSplit(lp,seed+'n'+ng,['nx_h','nx_0','nx_a']);for(let i=0;i<3;i++)V.nx[i]+=r*0.2*nl[i];}
 V.m=tgt;return V;}
function volLive(M,w){const V=volAcc(M);const R=x=>Math.round(x/10)*10;const res=V.res.map(R),ou=V.ou.map(R),nx=V.nx.map(R);
 for(const b of lvList(w)){const k={'1':[res,0],'X':[res,1],'2':[res,2],o25:[ou,0],u25:[ou,1],nx_h:[nx,0],nx_0:[nx,1],nx_a:[nx,2]}[b.mk];if(k)k[0][k[1]]+=b.stake;}
 return {res,ou,nx};}
function volPct(vals){const t=vals.reduce((x,y)=>x+y,0);if(!t)return vals.map(()=>Math.round(100/vals.length));const raw=vals.map(v=>v/t*100);const fl=raw.map(Math.floor);let rest=100-fl.reduce((x,y)=>x+y,0);
 raw.map((v,i)=>[v-fl[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([_,i])=>{if(rest>0){fl[i]++;rest--;}});return fl;}
function volBar(vals,labels){const t=vals.reduce((x,y)=>x+y,0)||1;const cls=['vb1','vbx','vb2'];
 const pc=volPct(vals);return `<div class="vbar">${vals.map((v,i)=>`<span class="${cls[i%3]}" style="width:${Math.max(4,pc[i])}%"></span>`).join('')}</div><div class="vlbl">${vals.map((v,i)=>`<span>${esc(labels[i])} <b>${pc[i]} %</b><small>${fmtMoney(v)}</small></span>`).join('')}</div>`;}
function volCard(v,title,M){return `<div class="card" style="padding:8px 12px"><div class="row small"><b>💶 ${esc(title||'Kolik vsadili ostatní sázkaři')}</b><span class="sp"></span><span class="tiny mut">celkem ${fmtMoney(v.res.reduce((x,y)=>x+y,0))}</span></div>
 <div class="tiny mut" style="margin:4px 0 2px">Výsledek zápasu</div>${volBar(v.res,['Domácí','Remíza','Hosté'])}<div class="tiny mut" style="margin:6px 0 2px">Počet gólů</div>${volBar(v.ou,['Víc než 2,5','Míň než 2,5'])}${v.nx?`<div class="tiny mut" style="margin:6px 0 2px">Další gól</div>${volBar(v.nx,['Domácí','Nikdo','Hosté'])}`:''}</div>`;}
// ----- panel živých sázek -----
function lvPanel(w){const M=lvM(w);if(!M)return '';const end=M.ended||(w==='pm'&&PM.done);const st=UI.lbStake||200;UI.lvG=UI.lvG||{};const g=UI.lvG[w]||'res';const G=LV_G.find(x=>x[0]===g)||LV_G[0];const pr=lvProbs(M);
 const own=w==='own';const u=lvUserSide(M);
 let h=`<div class="card" style="padding:8px 12px"><div class="row small"><b>${own?'🎯 Živé sázky na tvůj zápas':'📡 Souběžný zápas'}</b><span class="sp"></span><span class="mut">${end?'konec':minLbl(M)+"'"}</span></div>
 <div class="row" style="margin:6px 0;gap:8px"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" class="small">${esc(CL(M.h.cid).n)}</span><b style="font-size:18px">${M.score[0]}:${M.score[1]}</b><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right" class="small">${esc(CL(M.a.cid).n)}</span></div>`;
 if(!end){h+=`<div class="seg" style="margin-bottom:6px">${LV_G.map(x=>`<button class="${x[0]===g?'on':''}" onclick="UI.lvG['${w}']='${x[0]}';updLive()">${x[1]}</button>`).join('')}</div>
  <div class="seg" style="margin-bottom:6px">${[100,200,500,1000].map(v=>`<button class="${st===v?'on':''}" onclick="UI.lbStake=${v};updLive()">${fmtMoney(v)}</button>`).join('')}</div>
  <div class="${G[2].length===2?'grid2':'grid3'}" style="gap:6px">${G[2].map(k=>{const op=lvOpen(M,k);return `<button class="odd" ${op?`onclick="lvBet('${w}','${k}')"`:'disabled style="opacity:.45"'}><small>${LV_SH[k]}</small><b>${op?czOdd(lvOdd(pr[k])):'—'}</b></button>`;}).join('')}</div>`;
  if(M.min>=(M.et?118:88))h+=`<div class="tiny mut" style="margin-top:6px">Sázky jsou v závěru zápasu uzavřené.</div>`;}
 if(own&&typeof v14LvHtml==='function')h+=v14LvHtml(M);
 const L=lvList(w);h+=L.map((b,i)=>`<div class="row small" style="padding:5px 0;border-top:1px solid rgba(255,255,255,.06);margin-top:6px;gap:6px"><span style="flex:1;min-width:0">${LV_MK[b.mk]} · ${czOdd(b.o)} · ${fmtMoney(b.stake)} <span class="tiny mut">(${b.min}')</span></span>${b.co?`<span class="tiny good">vybráno ${fmtMoney(b.co)}</span>`:b.res?`<span class="tiny ${b.res==='won'?'good':'bad'}">${b.res==='won'?'výhra '+fmtMoney(b.win||Math.round(b.stake*b.o)):'prohra'}</span>`:end?'<span class="tiny mut">vyhodnocuje se</span>':`<button class="btn ghost" style="min-height:44px;padding:0 10px" onclick="lvCashout('${w}',${i})">Vybrat ${fmtMoney(lvCoVal(w,b))}</button>`}</div>`).join('');
 h+=`<div class="tiny mut" style="margin-top:6px">${own?(u>=0?'Kurzy se mění každou minutu podle skóre, času a vyloučení. Sázka proti vlastnímu týmu je velké riziko, disciplinární komise si jí může všimnout.':''):'Zápas, který se hraje ve stejnou dobu jako ten tvůj.'} Předčasný výběr vyplatí hned část výhry podle aktuálního stavu.${M.ko&&M.ko.decide?' Sázky na výsledek a góly platí včetně prodloužení.':''}</div></div>`;
 return h;}
(function(){
 const _sl=startLive;startLive=function(){const r=_sl.apply(this,arguments);if(MS&&!MS.lv)MS.lv=[];return r;};
 const _tk=pmTick;pmTick=function(M){_tk(M);try{lvSettle('own');if(PM&&!PM.done)lvSettle('pm');}catch(e){console.warn(e);}};
 const _pe=pmEnd;pmEnd=function(){if(!PM||PM.done)return _pe();const keep=PM.bets;PM.bets=[];_pe();PM.bets=keep;try{lvSettle('pm');}catch(e){console.warn(e);}lvSyncRefund();};
 const _el=endLive;endLive=function(M,quick){if(MS&&!MS.done&&MS.M){try{if(MS.M.ended){lvSettle('own');}else{for(const b of MS.lv||[])if(!b.co&&!b.res){b.res='ref';S.wallet+=b.stake;}}}catch(e){console.warn(e);}if(S.v4)S.v4.lvRefund=0;}return _el.apply(this,arguments);};
 pmHtml=function(){return PM?lvPanel('pm'):'';};
 chatHtml=function(M){const C=MS&&MS.chat;let h=lvPanel('own')+(PM?lvPanel('pm'):'');try{h+=volCard(volLive(M,'own'),'Kolik vsadili ostatní na tvůj zápas',M);}catch(e){}
  if(S.settings.betChat===false)return h+'<div class="empty">Chat sázkařů je vypnutý v nastavení.</div>';if(!C||!C.lines.length)return h+'<div class="empty">Sázkaři zatím mlčí.</div>';
  return h+`<div class="card" style="padding:6px 10px">${C.lines.slice().reverse().map(l=>`<div class="chatl"><span class="tiny mut">${esc(String(l.m))}</span> <b class="cp-${l.per}">${esc(l.n)}</b> <span class="tiny mut">· ${CH_PER[l.per]||''}</span><div>${esc(l.t)}</div></div>`).join('')}</div>`;};
 const _v=v4init;v4init=function(){_v.apply(this,arguments);try{const V=S&&S.v4;if(V&&V.lvRefund){S.wallet+=V.lvRefund;addNews('🎲',`Živé sázky na nedohraný zápas byly zrušeny, vklad ${fmtMoney(V.lvRefund)} se vrací.`,1);V.lvRefund=0;}}catch(e){}};
 const _pre=v4PreHtml;v4PreHtml=function(F){let x=_pre.apply(this,arguments)||'';try{if(F&&F.h&&F.a)x+=volCard(volPre(F.h,F.a,F.h+F.a+S.season),'Kolik zatím vsadili sázkaři');}catch(e){}return x;};
 const _ss=sideSetup;sideSetup=function(cid,isUser){if(isUser&&!clubPlayers(cid).some(p=>p.pos==='GK'&&available(p))){UI._forceGK=1;try{const y=youthPlayer(cid);if(y){addNews('🧤',`Nouze v brance! Všichni brankáři chybí, z akademie byl povolán ${y.n}.`);}}finally{UI._forceGK=0;}}return _ss.apply(this,arguments);};
})();
function volMini(h,a,mid){try{const v=volPre(h,a,mid);const t=v.res.reduce((x,y)=>x+y,0)||1;return `<div class="vbar">${v.res.map((x,i)=>`<span class="${['vb1','vbx','vb2'][i]}" style="width:${Math.max(4,Math.round(x/t*100))}%"></span>`).join('')}</div><div class="tiny mut" style="margin-top:3px">Vsazeno ${fmtMoney(t)}: domácí ${volPct(v.res)[0]} %, remíza ${volPct(v.res)[1]} %, hosté ${volPct(v.res)[2]} %</div>`;}catch(e){return '';}}

(function(){const _sm=stepMinute;stepMinute=function(M){const out=_sm(M);try{if(M&&M.vol)volAcc(M);}catch(e){}return out;};
 const _sl=startLive;startLive=function(){const r=_sl.apply(this,arguments);try{if(MS&&MS.M)volAcc(MS.M);}catch(e){}return r;};})();

// ===== Výtržnosti fanoušků na stadionu =====
function chS(){if(!S.chaos)S.chaos={n:0,ns:S.season,calm:0,sec:0,doors:0,away:0};const c=S.chaos;if(c.ns!==S.season){c.ns=S.season;c.n=0;}return c;}
const CHX={pyro:{w:30,p:[0.55,2,5],ab:0.1,f:[0.6,1.4],t:['🔥 {G} ({T}) zapálili světlice a na trávník létá pyrotechnika.','🔥 Kotel týmu {T} se rozzářil světlicemi, pár jich skončilo až u postranní čáry.']},
 smoke:{w:16,p:[1,3,7],ab:0.08,f:[0.8,1.6],t:['💨 {G} ({T}) hodili na hřiště dýmovnice a stadion zahalil hustý dým.','💨 Fanoušci týmu {T} zahalili stadion barevným dýmem, hráči nevidí ani na vlastní bránu.']},
 throw:{w:17,p:[0.8,2,4],ab:0.3,f:[1,2],t:['🥤 Fanoušci týmu {T} házejí na hřiště kelímky a zapalovače, jeden zasáhl asistenta rozhodčího.','🥤 {G} ({T}) zasypali hráče při rohovém kopu kelímky a mincemi.']},
 invader:{w:14,p:[0.7,1,3],ab:0,f:[0.4,0.8],t:['🏃 Na hřiště vběhl fanoušek týmu {T} a pořadatelé ho honí přes půl hřiště. Hráči se smějí.','🏃 Vběhlík v dresu týmu {T} se snažil obejmout hráče, než ho odvedla ochranka.']},
 fight:{w:10,p:[0.9,4,9],ab:0.35,f:[1.3,2.5],t:['👊 Na tribuně se poprali fanoušci obou týmů a zasahuje policie. Začali s tím {g} ({T}).','👊 {G} ({T}) prolomili oddělení sektorů a strhla se hromadná rvačka.']},
 racism:{w:7,p:[1,2,4],ab:0.12,f:[1.5,2.5],t:['🚫 Od fanoušků týmu {T} se ozývají rasistické pokřiky. Rozhodčí přerušil hru a hlasatel vyzývá ke klidu.']},
 laser:{w:6,p:[0.6,1,2],ab:0,f:[0.5,1],t:['🔦 Někdo z fanoušků týmu {T} svítí laserem do očí brankáři {K}. Sudí na chvíli přerušil hru.']}};
const CH_PAUSE=['⏸️ Rozhodčí přerušil zápas a poslal hráče ke středovému kruhu. Hra stojí {N} {MIN}.','⏸️ Sudí odvedl hráče do bezpečí, zápas je přerušený zhruba na {N} {MIN}.'];
const CH_RESUME=['▶️ Hra pokračuje. Rozhodčí to připočte do nastavení.','▶️ Pořadatelé uklidili trávník a zápas pokračuje.'];
const CH_AB='⛔ Rozhodčí po dohodě s delegátem zápas předčasně ukončil! O výsledku rozhodne disciplinární komise.';
function chFanLbl(i,lower){const s=i===0?'domácí fanoušci':'hostující fanoušci';return lower?s:s[0].toUpperCase()+s.slice(1);}
function chRisk(M){// vrací [riziko domácích, riziko hostů] pro zápas
 const c=chS();const ui=M.h.user?0:M.a.user?1:-1;const r=[0.6,0.4];const derby=M.derby||(typeof isDerby==='function'&&isDerby(M.h.cid,M.a.cid));if(derby){r[0]*=2.2;r[1]*=2.2;}
 const fill=(M.att||0)/Math.max(1000,(S.clubs[M.h.cid]&&S.clubs[M.h.cid].cap)||M.att||5000);if(fill>0.95){r[0]*=1.3;r[1]*=1.2;}if(!M.att){r[0]=0;r[1]*=0.1;}
 for(let i=0;i<2;i++){const sd=M.sides[i],o=M.sides[1-i];const d=clubStr(o.cid)-clubStr(sd.cid);if(d>5)r[i]*=1.25;}
 if(ui>=0){const f=fans();const k=f<20?2.2:f<35?1.6:f<50?1.15:f>75?0.8:1;r[ui]*=k;if(c.calm)r[ui]*=0.45;if(ui===1&&c.away>0)r[ui]=0;
  if(M.bribe&&M.bribe.side===ui)r[1-ui]*=1.5;if(S.riv&&Math.abs(S.riv[M.sides[1-ui].cid]||0)>=4){r[0]*=1.3;r[1]*=1.3;}}
 if(M.F&&M.F.type==='cup'){r[0]*=1.15;r[1]*=1.15;}return r;}
function chPlan(M){if(!(M.h.user||M.a.user))return;const r=chRisk(M);M.chRisk=r;const base=0.05;const pr=[base*r[0],base*r[1]].map(x=>clamp(x,0,0.35));M.chPlan=[];
 for(let i=0;i<2;i++)if(RNG()<pr[i]){const ks=Object.keys(CHX);const k=wpick(ks,x=>CHX[x].w*(x==='fight'&&!M.derby?0.6:1));M.chPlan.push({s:i,k,m:rint(8,86)});}
 // druhý incident je vzácný
 if(M.chPlan.length===2&&RNG()<0.6)M.chPlan.pop();}
function chTxt(t,M,i){const sd=M.sides[i],o=M.sides[1-i];const gk=P(gkOf(o));return t.replace('{G}',chFanLbl(i)).replace('{g}',chFanLbl(i,1)).replace(/\{T\}/g,S.clubs[sd.cid].n).replace('{K}',gk?pSurname(gk):'');}
function chFire(M,pl,out){const X=CHX[pl.k];const i=pl.s;const ev={m:M.min,t:'fill',ch:pl.k,s:i,tx:chTxt(pick(X.t),M,i)};out.push(ev);
 const ui=M.h.user?0:1;const losing=M.score[i]<M.score[1-i];let ab=X.ab*0.95*(losing?1.4:0.8)*(M.F&&M.F.type==='cup'?0:1)*(M.derby?1.3:1);
 const inc={k:pl.k,s:i,m:M.min,pause:0,ab:0};M.chaos=M.chaos||[];M.chaos.push(inc);
 if(RNG()<ab){inc.ab=1;M.ended=true;const g=i,n=1-i;const marg=M.score[n]-M.score[g];if(marg<3){M.score[g]=0;M.score[n]=3;}M.chAb={s:g,m:M.min};
  out.push({m:M.min,t:'fill',ch:'ab',s:i,tx:CH_AB});out.push({m:M.min,t:'ft',tx:`Zápas ukončen v ${M.min}. minutě. Komise ho kontumuje ${M.score[0]}:${M.score[1]} (${S.clubs[M.h.cid].n} – ${S.clubs[M.a.cid].n}).`});finishMatch(M);return;}
 if(RNG()<X.p[0]){const mins=rint(X.p[1],X.p[2]);inc.pause=mins;const h=Math.max(0,Math.min(3,M.half-1));M.added[h]=Math.min(15,(M.added[h]||1)+mins);out.push({m:M.min,t:'fill',ch:'pause',s:i,tx:(pl.k==='invader'||pl.k==='laser'?'⏸️ Hra stojí {N} {MIN}, než pořadatelé situaci vyřeší.':pick(CH_PAUSE)).replace('{N}',mins).replace('{MIN}',czPlural(mins,'minutu','minuty','minut'))});M._chRes=M.min+1;}}
(function(){
 const _cm=createMatch;createMatch=function(h,a,F){const M=_cm.apply(this,arguments);try{if(M.h.user||M.a.user){const c=chS();
   if(M.h.user&&c.doors>0){M.att=0;M.gate=0;M.chDoors=1;M.ev.push({m:0,t:'fill',tx:'🔒 Za trest se hraje bez diváků. Stadion je prázdný a je slyšet každé slovo z lavičky.'});}
   else if(M.h.user&&c.sec>0){M.att=Math.round(M.att*0.8);M.gate=Math.round(M.gate*0.8);M.chSec=1;M.ev.push({m:0,t:'fill',tx:'🚧 Jeden sektor domácího kotle zůstává za trest zavřený.'});}
   if(M.a.user&&c.away>0){M.chAway=1;M.ev.push({m:0,t:'fill',tx:'🚫 Tvoji fanoušci mají zákaz výjezdů, hostující sektor zeje prázdnotou.'});}
   chPlan(M);}}catch(e){console.warn(e);}return M;};
 const _sm=stepMinute;stepMinute=function(M){const out=_sm(M);if(!M.chPlan||M.ended)return out;const add=[];try{
   if(M._chRes&&M.min>=M._chRes){M._chRes=0;add.push({m:M.min,t:'fill',ch:'res',tx:pick(CH_RESUME)});}
   if(!M.ended)for(const pl of M.chPlan){if(pl.done||M.min<pl.m)continue;pl.done=1;// když tým jasně vede, jen oslavné světlice
    if(M.score[pl.s]-M.score[1-pl.s]>=2&&RNG()<0.5){add.push({m:M.min,t:'fill',ch:'joy',s:pl.s,tx:`🎆 ${chFanLbl(pl.s)} (${S.clubs[M.sides[pl.s].cid].n}) slaví vedení světlicemi. Pořadatelé jen kroutí hlavou.`});M.chaos=M.chaos||[];M.chaos.push({k:'pyro',s:pl.s,m:M.min,pause:0,ab:0,joy:1});break;}
    chFire(M,pl,add);break;}
   // vyhrocené chvíle: červená nebo zrušený gól můžou rozpálit ochozy
   for(const e of out){if((e.t==='red'||(e.t==='var'&&e.vg))&&!M.chaos&&RNG()<0.03){const s=e.t==='red'?e.s:e.s;M.chPlan.push({s,k:pick(['throw','pyro','throw','invader']),m:M.min,done:1});chFire(M,M.chPlan[M.chPlan.length-1],add);break;}}
  }catch(e){console.warn(e);}add.forEach(e=>{out.push(e);M.ev.push(e);});return out;};
 const _ce=crowdEvents;crowdEvents=function(M,ev){_ce(M,ev);try{for(const e of ev){if(!e.ch)continue;if(e.ch==='pause'||e.ch==='ab')crowdSwell(3,4,420);else if(e.ch==='joy'||e.ch==='invader')crowdSwell(2.6,2.5,1000);else crowdSwell(2.8,3.5,520);}}catch(x){}};
 const _co=chatOnEvents;chatOnEvents=function(M,ev){_co(M,ev);try{if(!MS||!MS.chat)return;const U=MS.chat.users;for(const e of ev){if(!e.ch||e.ch==='res')continue;const key=e.ch==='ab'?'chaos_ab':e.ch==='pause'?'chaos_pause':e.ch==='joy'||e.ch==='invader'?'chaos_fun':'chaos';chSay(M,pick(U),key,{},true);if(e.ch==='ab'||e.ch==='fight')chSay(M,pick(U),'chaos_bet',{},true);}}catch(x){}};
 const _af=v4AfterMatch;v4AfterMatch=function(M){const r=_af.apply(this,arguments);try{chAfter(M);}catch(e){console.warn(e);}return r;};
 const _fh=forumHtml;forumHtml=function(M){let h=_fh(M);try{const ui=userSide(M);const mine=(M.chaos||[]).find(x=>x.s===ui&&!x.joy),th=(M.chaos||[]).find(x=>x.s!==ui&&!x.joy);const t=mine?pick(FORUM_CH.mine):th?pick(FORUM_CH.theirs):M.chDoors?pick(FORUM_CH.doors):null;
   if(t)h=h.replace('<h3>💬 Fórum fanoušků</h3>',`<h3>💬 Fórum fanoušků</h3><div class="chatl"><b class="cp-fanH">${esc(pick(FN))}</b><div>${esc(t)}</div></div>`);}catch(e){}return h;};
 const _pp=pressPick;pressPick=function(kind,F,M){try{if(kind==='post'&&M&&(M.chaos||[]).some(x=>x.s===userSide(M)&&!x.joy))return 'chaosPost';if(kind==='pre'&&F&&!chS().calm&&chPreRisk(F)>=2&&RNG()<0.6)return 'chaosPre';}catch(e){}return _pp.apply(this,arguments);};
 const _pa=pressAnswer;pressAnswer=function(kind,q,i){try{const a=PRESS_Q[q][1][i];if(a&&a[1].calm)chS().calm=1;}catch(e){}return _pa.apply(this,arguments);};
 const _pre=v4PreHtml;v4PreHtml=function(F){let x=_pre.apply(this,arguments)||'';try{x+=chPreCard(F);}catch(e){}return x;};
 const _ew=extraWeek;extraWeek=function(){_ew.apply(this,arguments);try{chWorldNews();}catch(e){}};
})();
Object.assign(PRESS_Q,{chaosPre:['Před zápasem se mluví o možných výtržnostech na tribunách. Máte vzkaz pro fanoušky?',[['Vyzývám fanoušky ke klidu. Podporujte nás, ale bez pyrotechniky.',{fans:-3,board:2,calm:1}],['Naši fanoušci jsou nejlepší v lize, vím, že nás poženou dopředu.',{fans:3,board:-1}],['To je věc klubu a policie, já řeším fotbal.',{fans:0,board:0}]]],
 chaosPost:['Vaši fanoušci dnes způsobili výtržnosti. Co jim vzkážete?',[['Omlouvám se za ně, tohle do fotbalu nepatří. Odsuzuju to.',{fans:-3,board:3,calm:1}],['Atmosféra byla vyhrocená, ale rozhodčí k tomu svým pískáním přispěl.',{fans:2,board:-2}],['Nechci to komentovat, počkáme na rozhodnutí komise.',{fans:0,board:0}]]]});
Object.assign(CH,{chaos:['Kotel to zase rozjel, tohle bude pěkně drahá pokuta.','To je ostuda, kvůli pár magorům to schytá celý klub.','Na tribuně je víc kouře než fotbalu.','Komise už si chystá pero a fakturu.'],
 chaos_pause:['Přerušeno? Tak to si radši dojdu pro pivo.','Nastavení bude nekonečné, kdo má tiket na méně gólů, ten se potí.','Stojí se, hráči tuhnou. Tohle zamíchá kurzy.'],
 chaos_ab:['Ukončeno?! A co moje tikety? Kontumace, tomu nevěřím!','Konec, zápas se nedohraje. Sázkovky budou mít dneska krušné ráno.','Tohle se v tomhle stadionu nestalo roky. Ostuda.'],
 chaos_fun:['Ten vběhlík měl lepší kličku než náš útok 😂','Nejlepší akce zápasu zatím, ochranka by nedala ani gól do prázdné.','Aspoň je na co koukat.'],
 chaos_bet:['Sázet na tenhle zápas byla chyba, teď rozhoduje policie.','Kurzy skáčou jak blázen, nikdo neví, jestli se to dohraje.']});
const FORUM_CH={mine:['Pár idiotů z kotle zase zaplatí klub. Pokuta půjde z peněz na hráče.','Za to přerušení se stydím. Takhle se fandit nemá.','Atmosféra byla super, ale ty dýmovnice si mohli odpustit.','Komise nás zase napálí. Díky, vy hrdinové s pyrotechnikou.'],
 theirs:['Hosté se předvedli, doufám, že jim komise zavře sektor.','Co to vyvádějí jejich fanoušci? Ať si to řeší doma.','Naši byli v klidu, ostudu udělali ti druzí.'],
 doors:['Prázdný stadion je smutný pohled. Snad jsme se poučili.','Bez fanoušků to není ono, hráči byli jak na tréninku.']};
function chPreRisk(F){const M={h:{user:F.h===S.clubId,cid:F.h},a:{user:F.a===S.clubId,cid:F.a},F,derby:typeof isDerby==='function'&&isDerby(F.h,F.a),att:1,bribe:null};M.sides=[M.h,M.a];const g=gateIncome(F.h);M.att=g.att;const r=chRisk(M);const ui=F.h===S.clubId?0:1;const v=r[0]+r[1];return v>=2.2?3:v>=1.4?2:1;}
function chPreCard(F){if(!F||!F.h||!F.a)return '';const c=chS();const lv=chPreRisk(F);const notes=[];const home=F.h===S.clubId;
 if(home&&c.doors>0)notes.push(`🔒 Trest: hraje se bez diváků (ještě ${c.doors} ${czPlural(c.doors,'zápas','zápasy','zápasů')}).`);else if(home&&c.sec>0)notes.push(`🚧 Trest: zavřený sektor (ještě ${c.sec} ${czPlural(c.sec,'domácí zápas','domácí zápasy','domácích zápasů')}).`);
 if(!home&&c.away>0)notes.push(`🚫 Zákaz výjezdů tvých fanoušků (ještě ${c.away} ${czPlural(c.away,'zápas','zápasy','zápasů')}).`);
 if(lv<2&&!notes.length)return '';const L=['','nízké','zvýšené','vysoké'][lv];
 return `<div class="card" style="padding:8px 12px"><div class="row small"><b>🚨 Riziko výtržností: ${L}</b></div>${notes.map(n=>`<div class="tiny mut" style="margin-top:4px">${n}</div>`).join('')}
  ${lv>=2?(c.calm?`<div class="tiny good" style="margin-top:6px">Vyzval jsi fanoušky ke klidu, riziko je nižší.</div>`:`<button class="btn ghost w100" style="min-height:44px;margin-top:6px" onclick="chCalm()">📢 Vyzvat fanoušky ke klidu (nálada −3)</button>`):''}</div>`;}
function chCalm(){const c=chS();if(c.calm)return;c.calm=1;fansAdd(-3);addNews('📢',`${mgrRef(1)} vyzval fanoušky, aby podporovali tým bez pyrotechniky a výtržností.`,1);toast('Fanoušci dostali vzkaz. Část kotle je naštvaná, ale riziko výtržností klesá.');if(typeof preMatch==='function'&&document.getElementById('pmgo'))preMatch();}
function chAfter(M){const c=chS();const ui=userSide(M);c.calm=0;
 if(M.chDoors)c.doors=Math.max(0,c.doors-1);else if(M.chSec)c.sec=Math.max(0,c.sec-1);if(M.chAway)c.away=Math.max(0,c.away-1);
 const L=(M.chaos||[]).filter(x=>!x.joy);if(!L.length)return;const me=myClub();const lvl=clamp(Math.exp(((me.rep||60)-60)/15),0.3,4);
 for(const inc of L){const X=CHX[inc.k];const club=S.clubs[M.sides[inc.s].cid];const mine=inc.s===ui;
  let fine=Math.round((20000+rint(0,20000))*(X.f[0]+RNG()*(X.f[1]-X.f[0]))*(inc.pause?2:1)*(inc.ab?5:1)*lvl/1000)*1000;const pun=[];
  if(mine){c.n++;fine=Math.round(fine*(1+0.25*(c.n-1))/1000)*1000;money(-fine,'prize','Pokuta za chování fanoušků');pun.push('pokuta '+fmtMoney(fine));
   if(inc.ab){const d=rint(1,2);c.doors=Math.max(c.doors,d);c.away=Math.max(c.away,2);pun.push(`${d} ${czPlural(d,'zápas','zápasy','zápasů')} bez diváků`,'zákaz výjezdů na 2 zápasy');}
   else if(inc.k==='racism'||(inc.pause&&c.n>=2)||(inc.k==='fight'&&inc.pause)){const d=inc.k==='racism'?2:1;c.sec=Math.max(c.sec,d);pun.push(`zavřený sektor na ${d} ${czPlural(d,'domácí zápas','domácí zápasy','domácích zápasů')}`);if(c.n>=3&&!M.h.user){c.away=Math.max(c.away,1);pun.push('zákaz výjezdů na 1 zápas');}}
   if(c.n>=3&&!inc.ab&&!c.doors&&c.n%3===0){c.doors=1;pun.push('jeden zápas bez diváků za opakované prohřešky');}
   S.boardTrust=clamp(S.boardTrust-(inc.ab?10:inc.pause?4:2),0,100);if(inc.ab)fansAdd(-4);
   addNews('⚖️',`Disciplinární komise potrestala klub ${club.n} za výtržnosti fanoušků: ${pun.join(', ')}.`);}
  else addNews('⚖️',`Klub ${club.n} dostal pokutu ${fmtMoney(fine)} za chování svých fanoušků v zápase s týmem ${S.clubs[M.sides[ui].cid].n}.`,1);}
 if(M.chAb)addNews('⛔',`Zápas ${S.clubs[M.h.cid].n} – ${S.clubs[M.a.cid].n} byl předčasně ukončen. Komise ho kontumovala ${M.score[0]}:${M.score[1]}.`);}
function chWorldNews(){if(RNG()>0.22)return;const codes=Object.keys(S.leagues).filter(k=>S.leagues[k].clubs&&S.leagues[k].clubs.length);if(!codes.length)return;const L=S.leagues[pick(codes)];const cid=pick(L.clubs.filter(x=>x!==S.clubId));const c=S.clubs[cid];if(!c)return;
 const k=wpick(Object.keys(CHX),x=>CHX[x].w);const fine=Math.round(rint(15,90)*clamp(Math.exp(((c.rep||60)-60)/15),0.3,4))*1000;
 const T={pyro:`Fanoušci klubu ${c.n} odpálili pyrotechniku, klub zaplatí pokutu ${fmtMoney(fine)}.`,smoke:`Dýmovnice fanoušků klubu ${c.n} přerušily zápas na několik minut. Pokuta ${fmtMoney(fine)}.`,throw:`Fanoušci klubu ${c.n} házeli na hřiště předměty. Komise uložila pokutu ${fmtMoney(fine)}.`,invader:`Do zápasu klubu ${c.n} vběhl fanoušek, klub dostal pokutu ${fmtMoney(fine)}.`,fight:`Rvačka fanoušků po zápase klubu ${c.n}: pokuta ${fmtMoney(fine)} a zavřený sektor.`,racism:`Kvůli rasistickým pokřikům fanoušků klubu ${c.n} se další zápas hraje se zavřeným sektorem.`,laser:`Fanoušek klubu ${c.n} svítil laserem na brankáře. Klub zaplatí ${fmtMoney(fine)}.`};
 addNews('🚨',T[k],1);}

// Migrace starých uložených her: skuteční hráči místo vymyšlených a opravy jmen (generováno: tools/gen_realfix.py)
const RF_MAP=[{"c":"Olympiakos Nicosia","o":"APOEL","ob":2006,"i":0,"n":"George Tziortzis"},{"c":"Celta Vigo B","o":"Iván Marín","ob":2002,"n":"Caio Barone","by":2006,"pos":"GK","nat":"BR","a":[62,28,45,32,25,60]},{"c":"Celta Vigo B","o":"Carlos Nieto","ob":2004,"n":"Pablo Meixús","by":2003,"pos":"CB","nat":"ES","a":[59,48,58,47,69,70]},{"c":"Celta Vigo B","o":"Aritz Delgado","ob":2000,"n":"Germain Milla","by":2006,"pos":"RM","nat":"CM","a":[72,65,52,60,41,55]},{"c":"Celta Vigo B","o":"Andrés Forés","ob":2002,"n":"Quique Ribes","by":2004,"pos":"CB","nat":"ES","a":[55,42,56,51,75,65]},{"c":"Celta Vigo B","o":"Jorge Valverde","ob":2006,"n":"Adrià Capdevila","by":2004,"pos":"CM","nat":"ES","a":[56,57,69,58,54,61]},{"c":"Celta Vigo B","o":"Juan Arana","ob":2000,"n":"Seyni Ndiaye","by":2005,"pos":"CB","nat":"SN","a":[51,39,51,47,70,65]},{"c":"Celta Vigo B","o":"Rubén Gutiérrez","ob":2003,"n":"Mateo Sobral","by":2009,"pos":"CM","nat":"ES","a":[56,50,53,65,47,62]},{"c":"Celta Vigo B","o":"Jordi Puerto","ob":1996,"n":"Marcos González","by":2006,"pos":"GK","nat":"ES","a":[57,27,50,27,25,48]},{"c":"Celta Vigo B","o":"Víctor Puig","ob":2002,"n":"Pablo Gavián","by":2006,"pos":"RB","nat":"ES","a":[66,47,61,58,60,53]},{"c":"Celta Vigo B","o":"Óscar Delgado","ob":2002,"n":"Aldrine Kibet","by":2007,"pos":"AM","nat":"KE","a":[66,54,69,67,37,60]},{"c":"PAOK B","o":"Christos kostoglou","ob":2006,"i":0,"n":"Vasileios Papageorgiou"},{"c":"FC Tokyo","o":"DSP","ob":2007,"i":0,"n":"Tsuna Kominato"},{"c":"Omiya Ardija","o":"DSP","ob":2006,"i":0,"n":"Soma Furukawa"},{"c":"Omiya Ardija","o":"DSP","ob":2006,"i":1,"n":"Simon Yu Mendy"},{"c":"FC Anyang","o":"Kim Jeong hoon","ob":2001,"i":0,"n":"Kim Jeong-hoon"},{"c":"FC Anyang","o":"Kim kang","ob":2007,"i":0,"n":"Kim Kang"},{"c":"FC Twente","o":"Lucas Vennegoor of Hess.","ob":2006,"i":0,"n":"Lucas Vennegoor of Hesselink"},{"c":"Moreirense FC","o":"Rúben Schutte","ob":2005,"n":"Leonardo Vonić","by":2003,"pos":"ST","nat":"HR","a":[70,64,54,68,25,69]},{"c":"Moreirense FC","o":"Martim Lacximicant","ob":2000,"n":"Aranha","by":2005,"pos":"GK","nat":"BR","a":[64,34,53,35,40,64]},{"c":"Moreirense FC","o":"Daniel Marques","ob":2000,"n":"Kevyn","by":2005,"pos":"CB","nat":"BR","a":[56,43,64,51,68,68]},{"c":"Moreirense FC","o":"Luís Namora","ob":1998,"n":"Tiago Andrade","by":2005,"pos":"LW","nat":"PT","a":[71,63,68,67,45,60]},{"c":"Moreirense FC","o":"Tiago Miguel","ob":2006,"n":"Janderson","by":2005,"pos":"CB","nat":"BR","a":[50,40,50,40,64,63]},{"c":"Liptovský Mikuláš","o":"Daniel Hrdina","ob":1995,"n":"Jakub Novák","by":2003,"pos":"GK","nat":"SK","a":[50,27,34,25,25,40]},{"c":"Liptovský Mikuláš","o":"Oliver Maroši","ob":1995,"n":"Peter Majerčík","by":2006,"pos":"LB","nat":"SK","a":[51,25,35,41,52,38]},{"c":"Liptovský Mikuláš","o":"David Surovčík","ob":1995,"n":"Alex Blaho","by":2008,"pos":"RB","nat":"SK","a":[46,25,37,35,44,44]},{"c":"Liptovský Mikuláš","o":"Alex Straka","ob":1998,"n":"Lukáš Fedor","by":2008,"pos":"RB","nat":"SK","a":[51,25,35,42,37,35]},{"c":"Kayserispor","o":"Enes Tulgay U19 eligibility","ob":2004,"n":"Enes Tulgay"},{"c":"Kayserispor","o":"Efe Arslan Düzgün U19 eligibility","ob":2006,"n":"Efe Arslan Düzgün"},{"c":"Kayserispor","o":"Kayra Cihan U19 eligibility","ob":2007,"n":"Kayra Cihan"},{"c":"Kayserispor","o":"Hasan Kaan Yalçı U19 eligibility","ob":2004,"n":"Hasan Kaan Yalçı"},{"c":"Kayserispor","o":"Enes Melih Gökçek U19 eligibility","ob":2006,"n":"Enes Melih Gökçek"},{"c":"Kayserispor","o":"Aras Çelik U17 eligibility","ob":2005,"n":"Aras Çelik"},{"c":"Gangwon FC","o":"Choi Ji nam","ob":2007,"i":0,"n":"Choi Ji-nam"},{"c":"Gimcheon Sangmu","o":"Hong Won jin","ob":2000,"i":0,"n":"Hong Won-jin"},{"c":"Gwangju FC","o":"Kang Hui su","ob":2003,"i":0,"n":"Kang Hui-su"},{"c":"Žilina B","o":"Dominik Kmet'","ob":2006,"i":0,"n":"Dominik Kmeť"}];
const RF_ADD=[{"code":"ESP2","c":"Celta Vigo B","p":[["Álvaro Marín","ST",2003,66,71,"ES",[70,63,65,65,30,72],0],["Alexis Olmedo","CB",2006,61,70,"ES",[54,39,47,50,65,62],0],["Ángel Davila","ST",2007,58,76,"ES",[57,67,49,59,25,65],0]]},{"code":"POR1","c":"Moreirense FC","p":[["Manuel Mendonça","AM",2005,66,75,"PT",[69,68,65,71,36,53],0],["Landerson","LW",2006,63,74,"BR",[69,55,61,58,30,54],0]]},{"code":"SK2","c":"Liptovský Mikuláš","p":[["Tomáš Hak","AM",2003,52,54,"SK",[53,54,52,61,26,39],0]]}];
function rfMigrate(){if(!S||S.rf>=1)return;let n=0;const used=new Set();
 for(const id in S.players){const p=S.players[id];if(!p||!p.n)continue;let k=-1;for(let i=0;i<RF_MAP.length;i++){const x=RF_MAP[i];if(!used.has(i)&&x.o===p.n&&(x.ob==null||x.ob===p.by)&&(!x.pos||p.gen)){k=i;break;}}if(k<0)continue;
  const e=RF_MAP[k];used.add(k);p.n=e.n;if(e.pos){p.pos=e.pos;p.by=e.by;p.nat=e.nat;p.a=e.a.slice();p.gen=0;}n++;}
 for(const A of RF_ADD){const c=Object.values(S.clubs).find(x=>x.n===A.c&&x.lg===A.code);if(!c||c.pl.length>=30)continue;
  for(const arr of A.p){if(Object.values(S.players).some(q=>q.n===arr[0]&&q.by===arr[2]))continue;const p=mkPlayer(arr,c.id);c.pl.push(p.id);n++;}}
 S.rf=1;return n;}
(function(){const _v=v4init;v4init=function(){_v.apply(this,arguments);try{rfMigrate();}catch(e){console.warn(e);}};})();

// ===== Domluva s rozhodčím (satirická herní mechanika, jen herní peníze) =====
// Rozhodčí jsou smyšlené postavy (nejde o skutečné osoby), aby se nikomu nepřipisovala korupce.
const RF_NAMES={cz:['Tomáš Vrba','Pavel Kudrna','Jiří Machala','Martin Hloušek','Petr Zeman','Lukáš Bednařík','Radek Šimeček','Ondřej Kolář'],
 es:['Javier Molina','Carlos Ortega','Sergio Navas','Diego Ferrer','Raúl Peña','Andrés Vidal','Pablo Quintana','Mario Castell'],
 pt:['Rui Calado','Nuno Ferraz','Tiago Lobo','Bruno Seixas','Paulo Amaral','Ricardo Moita','Hugo Viana','André Pinho'],
 en:['Mark Dawlish','Paul Kettering','Simon Hale','Gary Thornton','Neil Ashby','Craig Weller','Stuart Penrose','Lee Granger'],
 de:['Markus Brehm','Tobias Wendt','Jan Seidler','Stefan Kroll','Florian Haas','Daniel Reuter','Sven Lorenz','Patrick Uhl'],
 it:['Marco Ferretti','Luca Bandini','Paolo Sarti','Davide Rinaldi','Andrea Moretto','Simone Galli','Fabio Cortese','Matteo Lanza'],
 fr:['Julien Morel','Thomas Garnier','Nicolas Faure','Benoît Leclerc','Antoine Royer','Cédric Vasseur','Olivier Brunet','Damien Joly'],
 jp:['Takeshi Morioka','Kenji Arakawa','Hiroshi Nagai','Daisuke Ueno','Yuta Kamiya','Shota Ishida'],
 kr:['Park Jin-seok','Kim Do-hyun','Lee Sang-woo','Choi Min-ho','Jung Tae-yang','Han Seung-jae'],
 x:['Adrian Kovač','Mihai Dobre','Nikola Perić','Kristian Holm','Erik Lindqvist','Dariusz Wolny','Levente Szabó','Andriy Kravets','Emre Aydın','Yannis Petrou','Lars Bakke','Dejan Marić']};
function rfPool(lg){const c=String(lg||'').replace(/\d+$/,'');return /^(CZ|SK)$/.test(c)?'cz':/^(ESP|ARG|MEX|COL|CHI|URU|PER|PAR|ECU|BOL|VEN)$/.test(c)?'es':/^(POR|BRA)$/.test(c)?'pt':/^(ENG|SCO|IRL|WAL|NIR|USA|AUS)$/.test(c)?'en':/^(GER|AUT|SUI)$/.test(c)?'de':c==='ITA'?'it':/^(FRA|BEL)$/.test(c)?'fr':c==='JPN'?'jp':c==='KOR'?'kr':'x';}
const RF_PERS={cor:['zkorumpovaný','prý se s ním dá mluvit',0.75,0.93],gre:['chamtivý','říká se, že nikdy nemá dost',1.35,0.78],cau:['opatrný','dává si pozor na každé slovo',1.05,0.85],hon:['poctivý','pověst neúplatného sudího',9,0]};
function rfKey(F){return [S.season,S.round,F.h,F.a,F.title||''].join('|');}
function rfRef(F){const me=myClub();const pool=RF_NAMES[rfPool((S.clubs[F.h]||me).lg)]||RF_NAMES.x;const h=hashStr('rf|'+rfKey(F));const n=pool[h%pool.length];
 const ph=hashStr('rfp|'+n+'|'+S.season)%100;const per=ph<24?'cor':ph<50?'gre':ph<78?'cau':'hon';return {n,per,sn:n.split(' ').slice(-1)[0]};}
// položky dohody: [název, popis, cenový koeficient, pro koho (me = pro můj tým, opp = pro soupeře při prodeji)]
const RFI={win:['Výhra','Postará se, abyste vyhráli: penalty, karty i nastavení podle potřeby.',3.4,'me'],draw:['Aspoň remíza','Když budete prohrávat, pomůže vám k vyrovnání.',2.1,'me'],
 help:['Obecně nadržovat','V hraničních situacích bude pískat pro vás.',1.4,'me'],pen:['Penalta pro nás','Jednou ukáže na penaltový bod ve váš prospěch.',1.2,'me'],
 red:['Červená pro soupeře','Vyloučí jednoho hráče soupeře.',1.1,'me'],var:['Zrušit gól soupeře','Najde důvod, proč gól soupeře neplatí.',1.0,'me'],
 add:['Dlouhé nastavení','Když nebudete vyhrávat, nastaví hodně dlouho.',0.5,'me'],soft:['Shovívavost k našim','Vašim hráčům bude odpouštět karty.',0.6,'me'],
 sell:['Pomoct soupeři','Bude pískat pro soupeře, aby dohoda s mafií vyšla.',1.4,'opp'],penA:['Penalta proti nám','Nařídí penaltu proti tvému týmu.',1.0,'opp'],
 redA:['Červená pro mého hráče','Vyloučí jednoho tvého hráče.',0.8,'opp'],varA:['Zrušit náš gól','Neuzná gól tvého týmu.',0.8,'opp']};
function rfSelling(){return !!(UI.fix||(S.fix&&S.fix.pr&&S.fix.pr.forced===1));}
function rfBase(){const b0=typeof bribeCost==='function'?bribeCost(1):2000;const me=myClub();let v=Math.max(b0,(me.tv||0)*0.08);if(typeof ownMode==='function'&&ownMode())v+=clubPrice(S.clubId)*0.0002;return Math.round(v/100)*100;}
function rfPend(F){const p=S.rdPend;return p&&F&&p.key===rfKey(F)?p:null;}
function rfState(F){const k=rfKey(F);if(!UI.rc||UI.rc.key!==k){const r=rfRef(F);UI.rc={key:k,ref:r,log:[],st:'open',items:[],ask:0,res:0,pat:r.per==='gre'?4:3,tone:0};
  const old=S.rdChat&&S.rdChat.key===k?S.rdChat:null;if(old){UI.rc.log=old.log||[];UI.rc.st=old.st||'open';}}return UI.rc;}
function rfSave(){const c=UI.rc;if(!c)return;S.rdChat={key:c.key,log:c.log.slice(-30),st:c.st==='done'||c.st==='end'?c.st:'open'};}
function rfSay(w,t){UI.rc.log.push({w,t});}
const RFT={
 op_soft:'Dobrý den, pane rozhodčí. Nedáte si se mnou po rozcvičce kávu? Rád bych si promluvil.',
 op_dir:'Pane rozhodčí, mohli bychom se o zítřejším zápase nějak domluvit?',
 op_hard:'Mám pro vás obálku. Zajímá vás to, nebo ne?',
 r_open:{cor:['Kafe si dám rád. A o čem přesně byste chtěl mluvit? Ať se zbytečně nezdržujeme.','Pro vás si čas udělám. Co potřebujete?'],
  gre:['Mluvit se dá o všem. Jde jen o to, kolik to komu stojí.','Hm. Zajímavé. Povídejte, ale levné to nebude.'],
  cau:['Opatrně, telefony mají uši. Co přesně myslíte?','Já nic neslyšel… ale klidně pokračujte. Potichu.'],
  hon:['Pane trenére, tohle jsme si snad neřekli. Uvidíme se na hřišti.','Na tohle vám nemám co říct. A doporučuju vám už nic dalšího neříkat.']},
 r_hon_rep:'Tohle jsem si nahrál. Zprávu posílám rovnou na svaz.',
 r_cau_scared:'Ne, ne. Je toho na mě moc, svaz teď sleduje každého. Nechte mě být.',
 ask:'Za tohle chci {P}. A nesmlouvejte moc.',
 ask_cau:'Dobře, ale je to riskantní. {P} a ani o korunu míň.',
 ask_gre:'To vás bude stát {P}. Kvalita něco stojí.',
 acc:['Domluveno. Na hřišti uvidíte.','Platí. A nikomu ani slovo.','Beru. Zítra to bude zajímavý zápas.'],
 cnt:['Tohle je málo. Řekněme {P}.','Za tohle riskuju kariéru. {P}, poslední slovo… skoro.','Hm, přidejte trochu. {P} a jsme domluvení.'],
 ins:['Urážíte mě. Za tohle ani nevstanu z gauče.','To myslíte vážně? S takovou nabídkou za mnou nechoďte.'],
 more:'Ještě jedna věc, trenére. Riziko je větší, než jsem čekal. Chci o {P} víc, jinak z toho nic nebude.',
 bye:'Tak nic. Uvidíme se na hřišti a nic jsme si neřekli.',
 left:'S tebou už nemluví.'};
function rfFill(t){const c=UI.rc;return t.replace('{R}',c.ref.sn).replace('{P}',fmtMoney(c.ask));}
function rfPrice(items){return Math.round(items.reduce((s,k)=>s+RFI[k][2],0)*rfBase()/100)*100;}
function rfSheet(){const F=UI.F;if(!F)return;const c=rfState(F);const pend=rfPend(F);const R=c.ref;
 const bub=l=>`<div class="rcb ${l.w==='me'?'me':''}"><b>${l.w==='me'?'Ty':'🧑‍⚖️ '+esc(R.n)}</b><div>${esc(l.t)}</div></div>`;
 const btn=(t,fn,dis,cls)=>`<button class="btn ${cls||'ghost'} w100" style="margin-bottom:6px;display:block;text-align:left;padding:8px 12px;white-space:normal" ${dis?'disabled':''} onclick="${fn}">${t}</button>`;
 let act='';
 if(pend)act=`<div class="small" style="padding:4px 0">✅ Domluveno: <b>${pend.items.map(k=>RFI[k][0].toLowerCase()).join(', ')}</b> za ${fmtMoney(pend.paid)}.</div>${btn('Zavřít','closeModal();preMatch()')}`;
 else if(c.st==='end')act=`<div class="small mut" style="padding:4px 0">${RFT.left}</div>${btn('Zavřít','closeModal();preMatch()')}`;
 else if(c.st==='open')act=`<div class="small" style="margin:4px 0"><b>Napiš mu</b></div>${btn(rfFill(RFT.op_soft),"rfOpen('soft')")}${btn(rfFill(RFT.op_dir),"rfOpen('dir')")}${btn(esc(RFT.op_hard),"rfOpen('hard')")}${btn('Radši nic','closeModal();preMatch()')}`;
 else if(c.st==='items'){const sell=rfSelling();const keys=Object.keys(RFI).filter(k=>sell?(RFI[k][3]==='opp'||k==='soft'):RFI[k][3]==='me');
  act=`<div class="small" style="margin:4px 0"><b>Co po něm chceš</b> <span class="tiny mut">(můžeš vybrat víc věcí)</span></div><div class="grid2" style="gap:6px">${keys.map(k=>`<button class="btn ${c.items.includes(k)?'gold':'ghost'}" style="white-space:normal;line-height:1.2" onclick="rfTog('${k}')">${RFI[k][0]}</button>`).join('')}</div>
  ${c.items.length?`<div class="tiny mut" style="margin:6px 0">${c.items.map(k=>RFI[k][1]).join(' ')}</div>`:''}<div style="height:6px"></div>${btn('💬 Napsat mu, co chci',"rfAsk()",!c.items.length,'gold')}${btn('Ukončit rozhovor',"rfBye()")}`;}
 else if(c.st==='neg'){const offs=[0.6,0.8,0.95].map(f=>Math.round(c.ask*f/100)*100).filter((v,i,a)=>v>0&&a.indexOf(v)===i);
  act=`<div class="small" style="margin:4px 0">Chce <b>${fmtMoney(c.ask)}</b> · na osobním kontě máš ${fmtMoney(S.wallet)}</div>${offs.map(v=>btn(`Nabídnout ${fmtMoney(v)}`,`rfOffer(${v})`,v>S.wallet)).join('')}${btn(`Přistoupit na ${fmtMoney(c.ask)}`,`rfOffer(${c.ask})`,c.ask>S.wallet,'gold')}${btn('Tohle je moc, končím',"rfBye()")}`;}
 else if(c.st==='more'){act=`${btn(`Přidat ${fmtMoney(c.more)}`,'rfMore(1)',c.more>S.wallet,'gold')}${btn('Nepřidám, ať to udělá za domluvenou cenu','rfMore(0)')}`;}
 modal(`<h2>🧑‍⚖️ Rozhovor s rozhodčím</h2><div class="small mut" style="margin-bottom:6px">Satirická herní mechanika jen s herními penězi a smyšlenými rozhodčími. Ve skutečnosti je ovlivňování zápasu trestný čin.</div>
 <div class="card" style="padding:8px 12px"><div class="small">Rozhodčí: <b>${esc(R.n)}</b> · ${RF_PERS[R.per][1]}</div><div class="tiny mut">Podezření svazu: ${bribeHeatTxt()}${UI.bribe?' · máš připravenou i obálku':''}${rfSelling()?' · zápas je prodaný':''}</div></div>
 <div class="card rcchat" id="rcchat" style="padding:8px 10px">${c.log.length?c.log.map(bub).join(''):'<div class="small mut">Zatím jste si nic nenapsali.</div>'}</div>${act}`);
 const el=document.getElementById('rcchat');if(el)el.scrollTop=el.scrollHeight;}
function rfReport(why){const f=fixS();const opp=UI.F?CL(UI.F.h===S.clubId?UI.F.a:UI.F.h):null;f.heat+=2;
 f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(2,4),st:0,sev:1+(why==='hard'?1:0),opp:opp?opp.n:'soupeřem',sc:'před zápasem',bet:0,why:S.role==='owner'?'own':'ref'});
 addNews('🚨',`Rozhodčí ${UI.rc.ref.n} oznámil svazu, že se ho ${mgrRef()} pokusil ovlivnit. Komise to bude prošetřovat.`);fansAdd(-3);S.boardTrust=clamp(S.boardTrust-6,0,100);}
function rfOpen(k){const c=UI.rc;rfSay('me',rfFill(RFT['op_'+k]));const p=c.ref.per;c.tone=k==='soft'?0:k==='dir'?1:2;
 if(p==='hon'){rfSay('ref',pick(RFT.r_open.hon));if(RNG()<(k==='hard'?0.75:k==='dir'?0.45:0.15)){rfSay('ref',RFT.r_hon_rep);rfReport(k);}c.st='end';}
 else if(p==='cau'&&k==='hard'&&RNG()<0.35){rfSay('ref',RFT.r_cau_scared);c.st='end';}
 else{rfSay('ref',pick(RFT.r_open[p]));c.st='items';}rfSave();saveGame();rfSheet();}
function rfTog(k){const c=UI.rc;const i=c.items.indexOf(k);if(i>=0)c.items.splice(i,1);else c.items.push(k);if(k==='win')c.items=c.items.filter(x=>x!=='draw'||k!=='win');if(k==='draw')c.items=c.items.filter(x=>x!=='win');rfSheet();}
function rfAsk(){const c=UI.rc;if(!c.items.length)return;const per=c.ref.per;const heat=fixS().heat+((S.bribe&&S.bribe.heat)||0);
 rfSay('me','Potřeboval bych: '+c.items.map(k=>RFI[k][0].toLowerCase()).join(', ')+'.');
 if(per==='cau'&&(c.items.length>=3||heat>=4)&&RNG()<0.6){rfSay('ref','Tolik věcí najednou? To by bylo moc nápadné. Vyberte míň, nebo nic.');c.items=[];rfSave();return rfSheet();}
 const val=rfPrice(c.items);c.res=Math.round(val*RF_PERS[per][2]/100)*100;c.ask=Math.round(c.res*(1.2+RNG()*0.25)/100)*100;
 rfSay('ref',rfFill(per==='cau'?RFT.ask_cau:per==='gre'?RFT.ask_gre:RFT.ask));c.st='neg';rfSave();rfSheet();}
function rfOffer(v){const c=UI.rc;if(v>S.wallet){toast('Na osobním kontě nemáš dost peněz.');return;}rfSay('me',v>=c.ask?`Dobře, ${fmtMoney(v)}. Platí.`:`Dám vám ${fmtMoney(v)}.`);
 if(v>=c.ask||(v>=c.res&&RNG()<0.6)){if(c.ref.per==='gre'&&RNG()<0.3){c.more=Math.round(v*0.2/100)*100;c.agreed=v;rfSay('ref',RFT.more.replace('{P}',fmtMoney(c.more)));c.st='more';rfSave();return rfSheet();}return rfDeal(v);}
 if(v>=c.res*0.6){c.pat--;c.ask=Math.max(c.res,Math.round((c.ask+v)/2/100)*100);if(c.pat<=0){rfSay('ref',RFT.bye);c.st='end';}else rfSay('ref',rfFill(pick(RFT.cnt)));}
 else{c.pat-=2;rfSay('ref',pick(RFT.ins));if(c.pat<=0){rfSay('ref',RFT.bye);c.st='end';if(c.ref.per==='cau'&&RNG()<0.15){rfSay('ref',RFT.r_hon_rep);rfReport('dir');}}}
 rfSave();saveGame();rfSheet();}
function rfMore(y){const c=UI.rc;if(y){if(S.wallet<c.agreed+c.more){toast('Na osobním kontě nemáš dost peněz.');return;}rfSay('me',`Dobře, přidám ${fmtMoney(c.more)}.`);return rfDeal(c.agreed+c.more);}
 rfSay('me','Domluvili jsme se jinak. Ani korunu navíc.');if(RNG()<0.55){rfSay('ref','No dobře… tak za původní cenu. Ale jste lakomec.');return rfDeal(c.agreed);}rfSay('ref',RFT.bye);c.st='end';rfSave();saveGame();rfSheet();}
function rfDeal(v){const c=UI.rc;S.wallet-=v;rfSay('ref',pick(RFT.acc));c.st='done';
 S.rdPend={key:c.key,items:c.items.slice(),paid:v,ref:c.ref,tone:c.tone};S.rdN=(S.rdN||0)+1;rfSave();saveGame();toast('Domluveno s rozhodčím.');rfSheet();}
function rfBye(){const c=UI.rc;rfSay('me','Víte co, zapomeňte na to.');rfSay('ref',RFT.bye);c.st='end';rfSave();saveGame();rfSheet();}
// ---- v zápase ----
function rdApply(M){const F=M.F||UI.F;const p=F?rfPend(F):null;if(!p){M.rd=null;return;}S.rdPend=null;const u=userSide(M);
 const opp=p.items.some(k=>RFI[k][3]==='opp');const side=opp?1-u:u;const r=RNG();const dl=r<RF_PERS[p.ref.per][3];
 const D={items:p.items.slice(),paid:p.paid,ref:p.ref,side,u,dl,done:{},tm:{}};p.items.forEach(k=>{D.tm[k]=rint(18,80);});M.rd=D;
 if(dl){const lv=p.items.includes('win')?3:p.items.includes('draw')||p.items.includes('help')||p.items.includes('sell')?2:0;
  if(lv){if(M.bribe&&M.bribe.side===side)M.bribe.l=Math.min(3,Math.max(M.bribe.l,lv)+(M.bribe.l>=lv?1:0));else if(!M.bribe)M.bribe={side,l:lv,rd:1};}}
 const H=fixS();H.heat+=0.4*p.items.length;}
function rdLead(M){const D=M.rd;return M.score[D.side]-M.score[1-D.side];}
function rdPen(M,out,k){const D=M.rd,s=D.side;D.done[k]=1;out.push({m:M.min,t:'fill',s,rd:1,tx:`🤔 Sporný souboj ve vápně a rozhodčí ${D.ref.sn} bez zaváhání ukazuje na penaltový bod! ${s===D.u?'Hráči soupeře':'Tvoji hráči'} obklopili sudího.`});
 M._fp=s;const ev=chance(M,s);M._fp=null;ev.forEach(e=>{e.rd=1;out.push(e);if(e.t==='goal'){D.done[k]=2;if(M._firstG==null)M._firstG=s;}});}
function rdRed(M,out,k){const D=M.rd,o=1-D.side;const ids=onPitch(M.sides[o]).filter(id=>GRP(P(id).pos)!=='G');const id=pick(ids);if(!id)return;D.done[k]=1;
 M.stats[o].rc++;fxRat(id,-1.5,M);P(id)._mred=1;out.push({m:M.min,t:'red',s:o,p:id,rd:1,tx:`🟥 Rozhodčí ${D.ref.sn} vylučuje hráče ${nm(id)}! Za úplně běžný souboj. ${o===D.u?'Tvoje lavička':'Lavička soupeře'} nevěří vlastním očím.`});removeFromPitch(M,o,id);M.sides[o].red++;}
function rdStep(M,out){const D=M.rd;if(!D||!D.dl||M.ended)return;const L=rdLead(M);
 for(const k of D.items){if(D.done[k])continue;
  if((k==='pen'||k==='penA')&&M.min>=D.tm[k]&&L<2)rdPen(M,out,k);
  else if((k==='red'||k==='redA')&&M.min>=D.tm[k]&&M.min<88&&L<2)rdRed(M,out,k);
  else if(k==='add'&&M.half===2&&M.min===88&&L<=0){D.done[k]=1;M.added[1]=Math.min(12,(M.added[1]||0)+rint(4,6));out.push({m:M.min,t:'fill',s:D.side,rd:1,tx:`⏱️ Rozhodčí ${D.ref.sn} nastavuje neuvěřitelně dlouho. Fanoušci soupeře zuří.`});}}
 if(D.items.includes('win')&&M.half===2){if(M.min>=68&&L<=0&&!D._w1){D._w1=1;rdPen(M,out,'_w1');}else if(M.min>=80&&L<=0&&!D._w2){D._w2=1;rdRed(M,out,'_w2');}else if(M.min>=88&&L<=0&&!D._w3){D._w3=1;M.added[1]=Math.min(12,(M.added[1]||0)+5);out.push({m:M.min,t:'fill',s:D.side,rd:1,tx:`⏱️ Rozhodčí ${D.ref.sn} přidává pět minut navíc. Tady se bude hrát, dokud to nebude „správně“.`});}}
 if(D.items.includes('draw')&&M.half===2&&L<0){if(M.min>=72&&!D._d1){D._d1=1;rdPen(M,out,'_d1');}else if(M.min>=88&&!D._d2){D._d2=1;M.added[1]=Math.min(12,(M.added[1]||0)+4);out.push({m:M.min,t:'fill',s:D.side,rd:1,tx:`⏱️ Rozhodčí ${D.ref.sn} nastavuje podezřele dlouho.`});}}
 if(D.items.includes('sell')&&M.half===2&&M.min>=75&&L<=0&&!D._s1){D._s1=1;rdPen(M,out,'_s1');}}
function rdOutcome(M){const D=M.rd;const L=rdLead(M);const r=[];
 for(const k of D.items){const n=RFI[k][0];let ok;
  if(k==='win')ok=L>0;else if(k==='draw')ok=L>=0;else if(k==='help'||k==='sell')ok=D.dl;else if(k==='soft')ok=D.dl&&!M.ev.some(e=>e.t==='red'&&e.s===D.u&&!e.rd);else ok=D.done[k]?true:D.dl?null:false;
  r.push([n,ok,k==='pen'||k==='penA'?(D.done[k]===2?'proměněno':D.done[k]?'neproměněno':''):'']);}return r;}
function rdSettle(M){const D=M.rd;if(!D||D._done)return;D._done=1;const res=rdOutcome(M);D.res=res;const okN=res.filter(x=>x[1]!==false).length;
 if(!D.dl){addNews('💸',`Rozhodčí ${D.ref.n} si nechal ${fmtMoney(D.paid)} a z domluvy neudělal vůbec nic. Stěžovat si nemůžeš nikde.`);}
 const f=fixS();const obvious=M.ev.filter(e=>e.rd).length;let risk=(D.ref.per==='cau'?3:D.ref.per==='cor'?6:9)+4*D.items.length+obvious*4+(M.fix?12:0)+(M.bribe&&!M.bribe.rd?8:0)+f.heat*2+((S.bribe&&S.bribe.heat)||0)*2;risk=clamp(risk,0,85);D.risk=Math.round(risk);
 if(RNG()*100<risk){const ui=D.u;f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(3,5),st:0,sev:1+(D.items.length>=3?1:0)+(obvious>=2?1:0)+(M.fix?1:0),opp:CL(M.sides[1-ui].cid).n,sc:M.score[ui]+':'+M.score[1-ui],bet:0,why:S.role==='owner'?'own':'ref'});}
 else if(D.dl&&okN===res.length&&res.length)ach('pistalka');}
function rdPostHtml(M){const D=M.rd;if(!D||!D.res)return '';return `<div class="card" style="padding:8px 12px"><h3>🧑‍⚖️ Domluva s rozhodčím ${esc(D.ref.n)}</h3><div class="tiny mut" style="margin-bottom:4px">Zaplaceno ${fmtMoney(D.paid)}${D.dl?'':' · peníze si nechal a nic neudělal'}</div>
 ${D.res.map(([n,ok,x])=>`<div class="row small" style="padding:3px 0"><span style="flex:1">Slíbil: ${esc(n.toLowerCase())}</span><b class="${ok?'good':ok===null?'mut':'bad'}">${ok?'✅ splněno':ok===null?'➖ nebylo potřeba':'❌ nesplněno'}${x?' · '+x:''}</b></div>`).join('')}</div>`;}
Object.assign(ACH,{pistalka:['🧑‍⚖️','Kamarád s píšťalkou','Domluv se s rozhodčím, ať splní všechno, a nenech se chytit.']});
Object.assign(CH,{rd_leak:['Prý se s dnešním sudím někdo bavil už včera večer. Jen říkám, co jsem slyšel…','Kamarád viděl sudího v hotelu s nějakým chlápkem od klubu. Uvidíme.','Dneska bych na tenhle zápas nesázel. Sudí má prý „domluvenou“ práci.'],
 rd_pen:['Tohle že je penalta?! Sudí je zaplacený, jasná věc.','A je to tady, domluvená penalta. Kolik to stálo?','Ani kontakt nebyl! Tohle by měla řešit komise.'],
 rd_red:['Červená za nic. Tenhle sudí dneska píská za peníze.','Tak tohle je vyloučení na objednávku. Ostuda!'],
 rd_add:['Nastavení podle toho, jak se komu hodí. Sudí čeká na gól.','Kolik se ještě bude hrát? Do půlnoci?'],
 rd_var:['Zase zrušený gól? Tohle není náhoda, to je domluva.','Sudí dneska ruší góly jen na jedné straně. Divné, že?']});
FORUM.ref=['Ten sudí byl dneska koupený, to viděl i slepý.','Ať se na rozhodčího podívá komise. Tohle nebyl fotbal.','Penalta, červená, nastavení… všechno na jednu stranu. Náhoda? Těžko.'];
(function(){
 const _ba=bribeApply;bribeApply=function(M){_ba(M);try{rdApply(M);}catch(e){console.warn(e);}};
 const _sm=stepMinute;stepMinute=function(M){const out=_sm(M);if(!M.rd||M.ended)return out;const post=[];try{rdStep(M,post);}catch(e){console.warn(e);}post.forEach(e=>M.ev.push(e));return out.concat(post);};
 const _vg=varGoalP;varGoalP=function(M,i){const D=M.rd;if(D&&D.dl&&i!==D.side){const k=D.items.find(x=>(x==='var'||x==='varA')&&!D.done[x]);if(k){D.done[k]=1;M._rdVar=1;return 1;}}M._rdVar=0;return _vg(M,i);};
 const _vt=varGoalTx;varGoalTx=function(M,i){if(M._rdVar){M._rdVar=0;return `⚽ Míč je v síti… ale rozhodčí ${M.rd.ref.sn} gól neuznává! Údajný faul, který na záznamu nikdo nevidí.`;}return _vt(M,i);};
 const _cm=bribeCardMul;bribeCardMul=function(M,i){const D=M.rd;let m=_cm(M,i);if(D&&D.dl&&D.items.includes('soft')&&i===D.u)m*=0.3;return m;};
 const _am=v4AfterMatch;v4AfterMatch=function(M){try{rdSettle(M);}catch(e){console.warn(e);}_am(M);};
 const _pp=v4PostHtml;v4PostHtml=function(M){let h='';try{h=rdPostHtml(M);}catch(e){}return h+_pp(M);};
 const _ph=v4PreHtml;v4PreHtml=function(F){let x='';try{const p=rfPend(F);const r=rfRef(F);x=`<div class="card" style="padding:8px 12px"><div class="row small" style="gap:8px"><span style="flex:1">🧑‍⚖️ Rozhodčí: <b>${esc(r.n)}</b><span class="tiny mut"> · ${RF_PERS[r.per][1]}</span></span></div>${p?`<div class="small" style="margin-top:4px">Domluveno: <b>${esc(p.items.map(k=>RFI[k][0].toLowerCase()).join(', '))}</b> · zaplaceno ${fmtMoney(p.paid)}</div>`:''}<button class="btn ghost w100" style="margin-top:6px" onclick="rfSheet()">💬 ${p?'Zobrazit domluvu':'Napsat rozhodčímu'}</button></div>`;}catch(e){}return x+_ph(F);};
 const _ib=initBetChat;initBetChat=function(M){_ib(M);try{if(M.rd&&MS&&MS.chat&&RNG()<0.55){const U=MS.chat.users;chSay(M,U.find(u=>u.per==='vet')||pick(U),'rd_leak',{},true);}}catch(e){}};
 const _co=chatOnEvents;chatOnEvents=function(M,ev){_co(M,ev);try{if(!M.rd||!MS||!MS.chat)return;const U=MS.chat.users;const tr=U.find(u=>u.per==='troll')||pick(U);const fa=U.find(u=>u.per===(M.rd.side===0?'fanA':'fanH'))||pick(U);
  for(const e of ev){if(!e.rd&&!(e.t==='var'&&e.vg&&M.rd.done&&(M.rd.done.var||M.rd.done.varA)&&!e._rc))continue;e._rc=1;const k=e.t==='fill'&&/penaltov/.test(e.tx)?'rd_pen':e.t==='red'?'rd_red':e.t==='var'?'rd_var':e.t==='fill'&&/nastavuje|přidává/.test(e.tx)?'rd_add':null;if(k)chSay(M,RNG()<0.5?tr:fa,k,{},true);}}catch(x){}};
 const _fh=forumHtml;forumHtml=function(M){if(M.rd&&M.rd.dl&&M.ev.some(e=>e.rd)&&!M.fix){const o=FORUM.scandal;FORUM.scandal=FORUM.ref;const s0=S.scandal;S.scandal={s:S.season};const h=_fh(M);FORUM.scandal=o;S.scandal=s0;return h;}return _fh(M);};
})();

// ===== Majitel klubu =====
// Trenéři ve hře jsou smyšlené postavy, sponzoři a dodavatelé dresů jsou smyšlené značky.
const OWN_FORT=[[5e6,'Podnikatel'],[5e7,'Milionář'],[4e8,'Magnát'],[3e9,'Miliardář']];
const OWN_FN={cz:[['Zdeněk','Radim','Bohumil','Vlastimil','Miloš','Luboš','Stanislav','Jaroslav'],['Kratochvíl','Doležal','Pospíšil','Hrubeš','Vaněček','Štěpánek','Konečný','Bartoš']],
 es:[['Ernesto','Rodrigo','Gonzalo','Ignacio','Joaquín','Esteban'],['Salvatierra','Montoya','Echeverría','Ibarra','Lozano','Valdivia']],
 pt:[['Abel','Joaquim','Rogério','Fernando','Vítor','Sérgio'],['Coutinho Lemos','Barreto','Magalhães','Teixeira','Quaresma Dias','Fontes']],
 en:[['Graham','Russell','Clive','Trevor','Malcolm','Derek'],['Ashworth','Pennington','Hollis','Bradshaw','Whitcombe','Fenwick']],
 de:[['Reinhard','Volker','Dieter','Wolfgang','Ulrich','Holger'],['Brandauer','Kessler','Lindemann','Vogelsang','Hartwig','Ebner']],
 it:[['Gianluca','Massimo','Roberto','Sandro','Claudio','Renzo'],['Bellandi','Ferraresi','Ottaviani','Magnaghi','Tosatti','Caputi']],
 fr:[['Gérard','Philippe','Alain','Laurent','Didier','Hervé'],['Delmas','Fournier-Roux','Lemaire','Chauvet','Barbier','Peyrat']],
 jp:[['Masaru','Tetsuya','Yoshinori','Kazuhiro'],['Hasegawa','Kurosawa','Tanimoto','Ogura']],kr:[['Seo','Yoon','Bae','Ahn'],['Jae-won','Min-kyu','Sung-ho','Dong-wook']],
 x:[['Viktor','Goran','Henrik','Mirko','Stefan','Bogdan','Anders','Jurij'],['Halvorsen','Petković','Andersson','Novaković','Dimitrov','Lindholm','Szymański','Horvath']]};
const OWN_BR=[['Velora','Tarnex','Korvia','Lumio','Brixel','Zentra','Ostavia','Dorvan','Marlex','Quvana'],['Energie','Pojišťovna','Stavby','Banka','Logistika','Telekom','Pivovar','Reality','Strojírny','Investice']];
const OWN_KIT=['Strixa','Valko Sport','Kordeo','Brava Kits','Ombrix','Teralo','Nordvik Wear','Pantero'];
const OWN_STY={att:'útočný',bal:'vyvážený',def:'defenzivní'};
function ownMode(){return !!(S&&S.own&&(S.role==='owner'||S.role==='both'));}
function ownOnly(){return !!(S&&S.own&&S.role==='owner');}
function ownAf(a){return a<=19?1.7:a<=21?1.55:a<=24?1.3:a<=28?1:a<=30?0.75:a<=32?0.48:a<=34?0.28:0.15;}
function ownPriceF(sq,rep,cash){const cap=clamp(2500+Math.exp((rep-55)*0.135)*2600,2500,75000);const tk=clamp(6+(rep-55)*1.6,5,90);const gate=cap*0.8*tk*19;return Math.max(5e5,Math.round((sq*0.8+gate*4+Math.max(0,cash)*0.5)/1e5)*1e5);}
function ownDataPrice(c){let sq=0;const ovs=[];for(const p of c.p){const a=2026-p[2];let v=150000*Math.exp((p[3]-50)*0.17)*ownAf(a)*(1+Math.max(0,p[4]-p[3])*(a<=24?0.045:0.02));sq+=v;ovs.push(p[3]);}
 const top=ovs.sort((a,b)=>b-a).slice(0,16);const rep=top.reduce((s,x)=>s+x,0)/Math.max(1,top.length);return ownPriceF(sq,rep,sq*0.12);}
function clubPrice(id){const c=S.clubs[id];if(!c)return 0;const sq=clubPlayers(id).reduce((s,p)=>s+playerValue(p),0);let v=ownPriceF(sq,c.rep||60,c.money||0);
 const f=S.cl4&&S.cl4[id];if(f)v*=1+0.05*((f.fac.st||0)+(f.fac.tr||0)*0.5+(f.fac.yo||0)*0.5);return Math.round(v/1e5)*1e5;}
function ownDebt(){return S.own?(S.own.loans||[]).reduce((s,l)=>s+l.a,0):0;}
function ownSaleValue(f){const o=S.own||{};return Math.max(0,Math.round((clubPrice(S.clubId)*(f||1)*(1-(o.inv||0))-ownDebt())/1e4)*1e4);}
function ownNews(ic,t){if(!S||!S.own)return;const o=S.own;if(o){o.news=o.news||[];o.news.unshift({ic,t,s:S.season,r:S.round});if(o.news.length>40)o.news.length=40;}addNews(ic,t);}
function ownRepAdd(d){if(!S||!S.own)return;const o=S.own;if(!o)return;o.rep=clamp(Math.round((o.rep+d)*10)/10,0,100);}
function ownRepTxt(r){return r>=80?'milovaný':r>=65?'oblíbený':r>=50?'respektovaný':r>=35?'kontroverzní':r>=20?'neoblíbený':'nenáviděný';}
// ----- trenéři -----
function coachGen(seed,lvl){const pool=OWN_FN[rfPool(myClub().lg)]||OWN_FN.x;const h=hashStr('co|'+seed);const fn=pool[0][h%pool[0].length],ln=pool[1][(h>>>5)%pool[1].length];
 const base=(myClub().rep||60)+(lvl||0);const rep=clamp(Math.round(base-8+((h>>>9)%25)),30,95);const st=['att','bal','def'][(h>>>13)%3];const age=38+((h>>>16)%28);
 const wage=Math.round(Math.max(1500,(myClub().tv||20000)*0.06*Math.exp((rep-60)*0.05))/100)*100;return {n:fn+' '+ln,rep,st,age,wage,yrs:1+((h>>>20)%3),pat:70,s0:S.season,r0:S.round,form:null};}
function ownPool(){const o=S.own;if(!o.pool||o.pool.s!==S.season||o.pool.r!==S.round&&o.pool.used){o.pool={s:S.season,r:S.round,c:[0,1,2,3,4].map(i=>coachGen(S.season+'|'+S.round+'|'+i+'|'+(o.fired||0),[-6,-2,2,6,10][i]))};}return o.pool.c;}
function ownCoachBonus(){const c=S.own&&S.own.coach;if(!c)return -2;return clamp((c.rep-60)/6,-4,4);}
function ownCoachTac(){if(!ownOnly())return;const o=S.own;const c=o.coach;const form=(c&&c.form)||bestForm(S.clubId);const t=defaultTactic(S.clubId);t.form=form;const l=autoLineup(S.clubId,form);t.xi=l.xi;t.bench=l.bench;t.ment=c?c.st:'bal';
 for(const id of (o.force||[])){const p=P(id);if(!p||p.cl!==S.clubId||!available(p)||t.xi.includes(id))continue;let k=-1,lo=999;const slots=FORMS[form];
  t.xi.forEach((x,i)=>{const q=P(x);if(!q||q.pos==='GK'&&p.pos!=='GK')return;if(o.force.includes(x))return;const same=GRP(slots[i][0])===GRP(p.pos)?0:30;const v=q.ovr+same;if(v<lo){lo=v;k=i;}});
  if(k>=0){const out=t.xi[k];t.xi[k]=id;t.bench=t.bench.filter(b=>b!==id);if(out&&!t.bench.includes(out))t.bench.unshift(out);if(t.bench.length>9)t.bench.length=9;}}
 const old=S.tac||{};S.tac=Object.assign({},old,t,{cap:old.cap&&t.xi.includes(old.cap)?old.cap:null,pk:old.pk&&t.xi.includes(old.pk)?old.pk:null});if(typeof tacDefaults==='function')tacDefaults(S.tac);}
function ownHire(i){if(!S||!S.own)return;const o=S.own;const c=ownPool()[i];if(!c)return;const me=myClub();if(c.rep>(me.rep||60)+12&&RNG()<0.5){toast(`${c.n} nabídku odmítl. Klub je pro něj málo atraktivní.`);o.pool.used=1;c.no=1;saveGame();render();return;}
 if(c.no){toast('Tenhle trenér už odmítl.');return;}o.coach=Object.assign({},c,{s0:S.season,r0:S.round,pat:70});o.pool.c.splice(i,1);ownNews('🤝',`Klub ${me.n} má nového trenéra: ${c.n} (${OWN_STY[c.st]} styl, reputace ${c.rep}).`);ownCoachTac();saveGame();render();}
function ownFire(){if(!S||!S.own)return;const o=S.own;const c=o.coach;if(!c)return;const left=Math.max(0,c.yrs*(S.maxRound||30)-((S.season-c.s0)*(S.maxRound||30)+S.round-c.r0));const comp=Math.round(Math.min(30,left)*c.wage/1e3)*1e3;
 money(-comp,'wages','Odstupné pro trenéra');o.fired=(o.fired||0)+1;o.coach=null;o.force=[];ownRepAdd(-2);if(o.fired>=3)ach('own_fire');
 ownNews('🚪',`Odvolal jsi trenéra ${czGen(c.n)}. Odstupné ${fmtMoney(comp)}. Do příchodu nového trenéra vede tým asistent.`);saveGame();render();}
function ownForce(id){if(!S||!S.own)return;const o=S.own;o.force=o.force||[];const i=o.force.indexOf(id);if(i>=0){o.force.splice(i,1);}else{if(o.force.length>=3){toast('Můžeš trvat nejvýš na třech hráčích.');return;}o.force.push(id);
  const c=o.coach;if(c){const p=P(id);const xi=autoLineup(S.clubId,c.form||bestForm(S.clubId)).xi;const ok=xi.includes(id);c.pat=clamp(c.pat-(ok?2:9),0,100);
   ownNews('🗣️',ok?`Trenér ${c.n}: „${p.n} by hrál i tak. Ale dobře, šéfe.“`:`Trenér ${c.n} nesouhlasí, že má hrát ${p.n}: „Sestavu dělám já.“ Vztah s majitelem se zhoršil.`);}}
 ownCoachTac();saveGame();render();}
// ----- start nové kariéry -----
function ownStartConfirm(code,ci){const c=DATA[code].clubs[ci];const st=UI.start;const price=ownDataPrice(c);const fort=st.fort||OWN_FORT[1][0];st.inv=st.inv||0;st.loan=st.loan==null?0.2:st.loan;
 const need=Math.round(price*(1-st.inv-st.loan)/1e4)*1e4;const ok=need<=fort;const seg=(arr,cur,fn)=>`<div class="seg">${arr.map(([v,l])=>`<button class="${cur===v?'on':''}" onclick="${fn}(${v})">${l}</button>`).join('')}</div>`;
 modal(`<div class="hero" style="margin-bottom:10px">${badge(c,'lg')}<div><h2 style="margin:0">${esc(c.n)}</h2><div class="small mut">${esc(leagueLabel(code))} · cena klubu <b class="gold">${fmtMoney(price)}</b></div></div></div>
 <div class="card"><h3>Financování koupě</h3><div class="small mut">Tvůj kapitál: <b>${fmtMoney(fort)}</b></div>
 <div class="small" style="margin:8px 0 4px">Podíl investorů</div>${seg([[0,'Žádní'],[0.2,'20 %'],[0.35,'35 %'],[0.49,'49 %']],st.inv,'ownStInv')}
 <div class="small" style="margin:8px 0 4px">Úvěr na klub</div>${seg([[0,'Bez úvěru'],[0.1,'10 %'],[0.2,'20 %'],[0.3,'30 %']],st.loan,'ownStLoan')}
 <div class="small" style="margin-top:8px">Z vlastních peněz zaplatíš <b class="${ok?'good':'bad'}">${fmtMoney(need)}</b>${ok?` · zbude ti ${fmtMoney(fort-need)}`:' · na to nemáš'}</div>
 <div class="tiny mut" style="margin-top:4px">Investoři mají podíl na zisku z prodeje klubu a nemají rádi ztráty. Úvěr splácí klub i s úroky.</div></div>
 <button class="btn big gold" id="cgo" ${ok?'':'disabled'}>${ok?'Koupit klub':'Na tento klub nemáš'}</button>`);
 const b=$('#cgo');if(b&&ok)b.onclick=async()=>{b.disabled=true;b.textContent='Podepisuji smlouvy…';try{await newGame({cc:st.cc,clubName:c.n,manager:st.name,role:st.role,fort,inv:st.inv,loan:st.loan,price});closeModal();UI.tab='home';render();window.scrollTo(0,0);setTimeout(()=>welcomeModal(),200);}catch(e){console.error(e);b.disabled=false;b.textContent='Koupit klub';toast('⚠️ '+(e.message||'Chyba při načítání'));}};
 UI.ownSt=[code,ci];}
function ownStInv(v){UI.start.inv=v;ownStartConfirm(...UI.ownSt);}function ownStLoan(v){UI.start.loan=v;ownStartConfirm(...UI.ownSt);}
function ownInit(role,price,inv,loan,news){const me=myClub();S.role=role;const maxW=clubPlayers(S.clubId).reduce((m,p)=>Math.max(m,playerWage(p)),0);
 S.own={rep:50,since:S.season,price0:price,inv:inv||0,loans:loan?[{a:Math.round(price*loan/1e4)*1e4,r:0.055,n:'Akviziční úvěr'}]:[],coach:null,force:[],goal:me.expect||1,
  tb:Math.round(Math.max(0,me.money)*0.6/1e4)*1e4,wc:Math.round(maxW*1.2/100)*100,sp:null,kit:null,offers:null,stk:0,news:[],fired:0,ffp:0,inj:0,lic:'ok',bud:'bal'};
 if(role==='owner'){S.own.coach=coachGen('start|'+S.clubId,0);}ownOffersGen();if(news!==false)ownNews('💼',`${S.manager} koupil klub ${me.n} za ${fmtMoney(price)}.${S.own.coach?` Trenérem zůstává ${S.own.coach.n}.`:' Klub povede sám jako majitel i trenér.'}`);
 ach('own_buy');}
// ----- koupě z kariéry trenéra / převzetí jiného klubu -----
function ownBuySheet(id,mode){id=id||S.clubId;const c=S.clubs[id];const price=clubPrice(id);const sale=ownMode()&&id!==S.clubId?ownSaleValue():0;UI.obl=UI.obl==null?0.2:UI.obl;
 const need=Math.round(price*(1-UI.obl)/1e4)*1e4;const have=S.wallet+sale;const ok=need<=have;
 modal(`<h2>💼 ${id===S.clubId?'Koupit svůj klub':'Převzít klub'}</h2><div class="card"><div class="row" style="gap:10px">${badge(c)}<div><b>${esc(c.n)}</b><div class="small mut">${esc(leagueLabel(c.lg))} · cena ${fmtMoney(price)}</div></div></div></div>
 <div class="card"><div class="small" style="margin-bottom:4px">Úvěr na klub</div><div class="seg">${[[0,'Bez úvěru'],[0.1,'10 %'],[0.2,'20 %'],[0.3,'30 %']].map(([v,l])=>`<button class="${UI.obl===v?'on':''}" onclick="UI.obl=${v};ownBuySheet('${id}')">${l}</button>`).join('')}</div>
 <div class="small" style="margin-top:8px">Na osobním kontě: ${fmtMoney(S.wallet)}${sale?` · z prodeje současného klubu: ${fmtMoney(sale)}`:''}</div><div class="small">Zaplatíš: <b class="${ok?'good':'bad'}">${fmtMoney(need)}</b></div></div>
 ${S.role==='coach'||!S.role?`<div class="small mut" style="margin-bottom:8px">Staneš se majitelem a dál budeš i trénovat.</div>`:''}
 <button class="btn big gold" ${ok?'':'disabled'} onclick="ownBuy('${id}')">${ok?'Podepsat koupi':'Na to nemáš peníze'}</button>`);}
function ownBuy(id){const price=clubPrice(id);const need=Math.round(price*(1-UI.obl)/1e4)*1e4;const loan=UI.obl;
 if(ownMode()&&id!==S.clubId){const sale=ownSaleValue();if(S.wallet+sale<need){toast('Na to nemáš peníze.');return;}const old=myClub().n;S.wallet+=sale;const role=S.role;ownNews('🤝',`${S.manager} prodal klub ${old} za ${fmtMoney(sale)} (po odečtení dluhů a podílu investorů).`);
  S.wallet-=need;takeClub(id);ownInit(role,price,0,loan);ach('own_take');}
 else{if(S.wallet<need){toast('Na to nemáš peníze.');return;}S.wallet-=need;ownInit(S.role==='owner'?'owner':'both',price,0,loan);}
 closeModal();UI.tab='own';saveGame();render();window.scrollTo(0,0);}
function ownTakeList(){const me=myClub();const ids=Object.keys(S.clubs).filter(id=>id!==S.clubId&&!S.clubs[id].tmp).sort((a,b)=>S.clubs[b].rep-S.clubs[a].rep);const have=S.wallet+ownSaleValue();
 const list=ids.map(id=>[id,clubPrice(id)]).filter(([id,p])=>p*0.7<=have*1.6).slice(0,14);
 modal(`<h2>🔄 Převzít jiný klub</h2><div class="small mut" style="margin-bottom:8px">Současný klub prodáš za zhruba ${fmtMoney(ownSaleValue())}. Na osobním kontě máš ${fmtMoney(S.wallet)}.</div>
 ${list.length?list.map(([id,p])=>{const c=S.clubs[id];return `<button class="lgpick" onclick="ownBuySheet('${id}')">${badge(c)}<span class="t"><b>${esc(c.n)}</b><small>${esc(leagueLabel(c.lg))} · cena ${fmtMoney(p)}${p*0.7<=have?'':' · zatím moc drahé'}</small></span></button>`;}).join(''):'<div class="empty">Na žádný klub teď nemáš.</div>'}`);}
function ownSell(forced){if(!S||!S.own)return;const v=ownSaleValue(forced?0.7:1);const old=myClub().n;const prof=v-(S.own.price0||0)*(1-(S.own.inv||0));
 S.wallet+=v;if(!forced&&prof>0)ach('own_sell');addNews('🤝',`${S.manager} ${forced?'byl donucen prodat':'prodal'} klub ${old} za ${fmtMoney(v)}.`);
 const ids=Object.keys(S.clubs).filter(id=>id!==S.clubId&&!S.clubs[id].tmp).map(id=>[id,clubPrice(id)]).filter(([id,p])=>p*0.7<=S.wallet).sort((a,b)=>b[1]-a[1]).slice(0,10);
 const role=S.role;S.ownLast={role,s:S.season};
 modal(`<div class="c"><div style="font-size:44px">🤝</div><h2>Klub prodán</h2><div class="small">Na osobní konto ti přišlo ${fmtMoney(v)}. Teď máš ${fmtMoney(S.wallet)}.</div></div>
 <div class="small" style="margin:10px 0 6px"><b>Koupit jiný klub</b> (s úvěrem 30 %)</div>${ids.length?ids.map(([id,p])=>{const c=S.clubs[id];return `<button class="lgpick" onclick="ownAfterSell('${id}')">${badge(c)}<span class="t"><b>${esc(c.n)}</b><small>${esc(leagueLabel(c.lg))} · cena ${fmtMoney(p)}</small></span></button>`;}).join(''):'<div class="small mut">Na žádný klub teď nemáš.</div>'}
 <button class="btn ghost w100" style="margin-top:8px" onclick="ownBecomeCoach()">Vrátit se k trénování</button>`,{noClose:true});}
function ownAfterSell(id){const role=S.ownLast&&S.ownLast.role||'owner';const price=clubPrice(id);const need=Math.round(price*0.7/1e4)*1e4;if(S.wallet<need){toast('Na to nemáš peníze.');return;}S.wallet-=need;takeClub(id);ownInit(role,price,0,0.3);ach('own_take');closeModal();UI.tab='own';saveGame();render();}
function ownBecomeCoach(){S.role='coach';S.own=null;closeModal();firedPick();}
// ----- obchod: sponzoři, dresy, permanentky -----
function ownSpBase(){const me=myClub();return Math.max(60000,Math.round((me.tv||20000)*9*Math.exp(((me.rep||60)-60)*0.02)/1e4)*1e4);}
function ownOffersGen(){const o=S.own;const b=ownSpBase();const h=n=>hashStr('sp|'+S.clubId+'|'+S.season+'|'+n);const bn=n=>OWN_BR[0][h(n)%OWN_BR[0].length]+' '+OWN_BR[1][(h(n)>>>6)%OWN_BR[1].length];
 const k=(n,f)=>Math.round(b*f*(0.75+(h(n)%50)/100)*(0.8+(o.rep||50)/250)/1e4)*1e4;
 o.offers={s:S.season,sp:o.sp?[]:[0,1,2].map(i=>({n:bn('s'+i),amt:k('s'+i,1),yrs:1+i})),kit:o.kit?[]:[0,1,2].map(i=>({n:OWN_KIT[h('k'+i)%OWN_KIT.length],amt:k('k'+i,0.4),yrs:1+i}))};
 o.offers.kit=o.offers.kit.filter((x,i,a)=>a.findIndex(y=>y.n===x.n)===i);}
function ownSign(t,i){if(!S||!S.own)return;const o=S.own;const x=(o.offers[t]||[])[i];if(!x)return;o[t]={n:x.n,amt:x.amt,yrs:x.yrs,s:S.season};o.offers[t]=[];ownNews(t==='sp'?'✍️':'👕',t==='sp'?`Nový hlavní sponzor: ${x.n}, ${fmtMoney(x.amt)} za sezónu na ${x.yrs} ${czPlural(x.yrs,'rok','roky','let')}.`:`Nový dodavatel dresů: ${x.n}, ${fmtMoney(x.amt)} za sezónu.`);saveGame();render();}
function ownStk(v){if(!S||!S.own)return;const o=S.own;if(S.round>0){toast('Permanentky se prodávají jen před začátkem sezóny.');return;}o.stk=v;ownStkSell();saveGame();render();}
function ownStkSell(){if(!S||!S.own)return;const o=S.own;const me=myClub();if(o.stkS===S.season)return;if(!o.stk)return;o.stkS=S.season;const home=Math.ceil((S.maxRound||30)/2);const n=Math.round(me.cap*o.stk);const inc=Math.round(n*me.ticket*0.7*home/1e3)*1e3;
 money(inc,'gate','Permanentky');fansAdd(o.stk*8);ownNews('🎫',`Prodáno ${n.toLocaleString('cs-CZ')} permanentek, příjem ${fmtMoney(inc)}.`);}
// ----- finance -----
function ownBud(k){if(!S||!S.own)return;const o=S.own;const me=myClub();const B={low:[0.3,1.0],bal:[0.6,1.2],hi:[0.9,1.5],all:[1.0,2.0]}[k];const maxW=clubPlayers(S.clubId).reduce((m,p)=>Math.max(m,playerWage(p)),0);
 o.bud=k;o.tb=Math.round(Math.max(0,me.money)*B[0]/1e4)*1e4;o.wc=Math.round(maxW*B[1]/100)*100;if(o.coach){o.coach.pat=clamp(o.coach.pat+(k==='low'?-6:k==='hi'||k==='all'?4:0),0,100);}saveGame();render();}
function ownTb(d){if(!S||!S.own)return;const o=S.own;const st=Math.max(1e4,Math.round(Math.max(1e5,myClub().money)*0.1/1e4)*1e4);o.tb=Math.max(0,o.tb+d*st);saveGame();render();}
function ownWc(d){if(!S||!S.own)return;const o=S.own;o.wc=Math.max(500,Math.round(o.wc*(d>0?1.15:0.87)/100)*100);saveGame();render();}
function ownTbLeft(){return Math.max(0,S.own.tb-(S.finSeason.tr_out||0)+(S.finSeason.tr_in||0)*0.5);}
function ownInject(v){if(v>S.wallet){toast('Na osobním kontě nemáš dost peněz.');return;}S.wallet-=v;money(v,'other','Vklad majitele');S.own.inj=(S.own.inj||0)+v;ownRepAdd(1.5);ownNews('💶',`Majitel vložil do klubu ${fmtMoney(v)}.`);saveGame();render();}
function ownDiv(v){const me=myClub();if(me.money<v){toast('Klub na to nemá.');return;}money(-v,'other','Dividenda majiteli');const mine=Math.round(v*(1-(S.own.inv||0)));S.wallet+=mine;ownRepAdd(-3);fansAdd(-4,'Fanoušky naštvalo, že si majitel vyplatil dividendu.');ownNews('💸',`Majitel si vyplatil dividendu ${fmtMoney(mine)}.`);saveGame();render();}
function ownLoan(f){if(!S||!S.own)return;const o=S.own;const v=Math.round(clubPrice(S.clubId)*f/1e4)*1e4;const d=ownDebt();const r=Math.round((0.045+Math.min(0.08,d/Math.max(1,clubPrice(S.clubId))*0.12))*1000)/1000;
 if(d+v>clubPrice(S.clubId)*0.8){toast('Banka už další úvěr nedá. Klub je příliš zadlužený.');return;}o.loans.push({a:v,r,n:'Bankovní úvěr'});money(v,'other','Úvěr');ownNews('🏦',`Klub si vzal úvěr ${fmtMoney(v)} s úrokem ${(r*100).toLocaleString('cs-CZ')} % ročně.`);saveGame();render();}
function ownRepay(i){if(!S||!S.own)return;const o=S.own;const l=o.loans[i];if(!l)return;const me=myClub();const v=Math.min(l.a,Math.max(0,me.money));if(v<=0){toast('Klub nemá na splátku.');return;}money(-v,'other','Splátka úvěru');l.a-=v;if(l.a<=0)o.loans.splice(i,1);ownNews('🏦',`Klub splatil ${fmtMoney(v)} z úvěru.`);saveGame();render();}
function ownBuyout(){if(!S||!S.own)return;const o=S.own;const v=Math.round(clubPrice(S.clubId)*o.inv/1e4)*1e4;if(S.wallet<v){toast('Na odkup podílu nemáš.');return;}S.wallet-=v;o.inv=0;ownNews('🤝',`Majitel odkoupil podíl investorů za ${fmtMoney(v)}. Klub teď patří jen jemu.`);saveGame();render();}
function ownGoal(p){if(!S||!S.own)return;const o=S.own;o.goal=p;const me=myClub();if(o.coach){const d=(me.expect||p)-p;o.coach.pat=clamp(o.coach.pat-(d>=3?10:d>=1?3:-2),0,100);ownNews('🎯',d>=3?`Trenér ${o.coach.n} považuje cíl „${expectText(p)}“ za nereálný.`:`Majitel stanovil trenérovi cíl: ${expectText(p)}.`);}saveGame();render();}
// ----- týdenní a sezónní chod -----
function ownWeek(){const o=S.own;if(!o)return;const me=myClub();const R=Math.max(1,S.maxRound||30);
 if(o.sp)money(Math.round(o.sp.amt/R),'other','Sponzor '+o.sp.n);if(o.kit)money(Math.round(o.kit.amt/R),'other','Dresy '+o.kit.n);
 const int=o.loans.reduce((s,l)=>s+l.a*l.r/R,0);if(int>0)money(-Math.round(int),'other','Úroky z úvěrů');
 const c=o.coach;if(c&&S.role==='owner'){money(-c.wage,'wages','Mzda trenéra');const L=S.leagues[me.lg];const form=L&&L.table[S.clubId]?L.table[S.clubId].form||[]:[];const last=form.slice(-3).join('');
  if(last==='LLL'&&RNG()<0.5){c.pat=clamp(c.pat-4,0,100);ownNews('📉',`Trenér ${c.n} je po třech porážkách pod tlakem. Fanoušci volají po změně.`);}
  if(transferWindow()&&RNG()<0.05&&c.reqR!==S.season+'|'+(S.round<S.maxRound/2?0:1)){c.reqR=S.season+'|'+(S.round<S.maxRound/2?0:1);const g=pick(['obrany','zálohy','útoku','brány']);ownNews('🧑‍💼',`Trenér ${c.n} žádá posilu do ${g}. Zbývá ${fmtMoney(ownTbLeft())} z přestupového rozpočtu.`);}
  if(c.pat<=10){ownNews('🚪',`Trenér ${c.n} rezignoval: „S tímhle majitelem se pracovat nedá.“`);o.coach=null;o.force=[];ownRepAdd(-3);}}
 const tk=me.ticketBase?me.ticket/me.ticketBase:1;const mood=fans();
 if((mood<25||o.rep<25||(tk>=1.4&&mood<45))&&RNG()<0.3&&(o.protR==null||S.round-o.protR>=4||S.round<o.protR)){o.protR=S.round;o.protN=(o.protN||0)+1;ownRepAdd(-2);ownNews('🪧',pick([`Fanoušci klubu ${me.n} protestovali před stadionem proti majiteli: „Prodej klub a jdi!“`,'Stovky fanoušků pochodovaly městem s transparenty proti majiteli klubu.',`Fanoušci vyhlásili bojkot: „Dokud klub vlastní ${S.manager}, nepřijdeme.“`]));}
 if(S.scandal&&S.scandal.s===S.season&&o.scK!==S.scandal.r+'|'+S.scandal.s){o.scK=S.scandal.r+'|'+S.scandal.s;ownRepAdd(-10);}
 if(tk<=0.85)ownRepAdd(0.2);if(fans()>70)ownRepAdd(0.15);}
function ownSeasonEnd(){const o=S.own;if(!o)return null;const me=myClub();const pos=tablePos(S.clubId);const n=zoneSize(me.lg,S.clubId);const f=S.finSeason;const res=[];
 const met=pos<=o.goal;ownRepAdd(met?4:-3);if(pos===1){ownRepAdd(6);ach('own_title');}
 if(o.coach&&S.role==='owner'){const c=o.coach;c.rep=clamp(c.rep+(met?3:-2),25,95);c.pat=clamp(c.pat+(met?10:-5),0,100);res.push(met?`Trenér ${c.n} splnil cíl (${expectText(o.goal)}).`:`Trenér ${c.n} cíl nesplnil (${pos}. místo, cíl ${expectText(o.goal)}).`);c.yrs--;if(c.yrs<=0){if(met&&RNG()<0.75){c.yrs=2;c.wage=Math.round(c.wage*1.12/100)*100;res.push(`${c.n} podepsal novou smlouvu na 2 roky.`);}else{res.push(`Trenér ${c.n} odchází, skončila mu smlouva. Najdi nového v Kanceláři majitele.`);o.coach=null;o.force=[];}}}
 else res.push(met?`Cíl splněn: ${expectText(o.goal)}.`:`Cíl nesplněn: ${pos}. místo.`);
 const inc=(f.inc||0)-(o.inj||0),exp=f.exp||0;const op=inc-exp;if(op>0){ach('own_black');ownRepAdd(2);}
 if(op<-Math.max(2e6,inc*0.3)){o.ffp=(o.ffp||0)+1;if(o.ffp>=2){const fine=Math.round(Math.abs(op)*0.05/1e4)*1e4;money(-fine,'other','Pokuta za finanční fair play');o.tban=S.season+1;res.push(`⚖️ Finanční fair play: ztráta ${fmtMoney(-op)}. Pokuta ${fmtMoney(fine)} a zákaz nákupů v letním okně.`);ownNews('⚖️',`Svaz potrestal klub ${me.n} za porušení finančního fair play: pokuta ${fmtMoney(fine)} a zákaz přestupů.`);}else{res.push(`⚖️ Finanční fair play: varování kvůli ztrátě ${fmtMoney(-op)}.`);ownNews('⚖️',`Svaz varoval klub ${me.n}: ztráta ${fmtMoney(-op)} porušuje pravidla finančního fair play.`);}}
 else if(o.ffp>0)o.ffp--;
 if(me.money<0&&ownDebt()>clubPrice(S.clubId)*0.6){o.lic='no';o.licDed=S.season+1;res.push('🚫 Licence: klub ji nedostal kvůli dluhům. Do nové sezóny začne s odečtem 6 bodů.');ownNews('🚫',`Klub ${me.n} neprošel licenčním řízením. Trest: odečet 6 bodů.`);ownRepAdd(-8);}
 else if(me.money<0){o.lic='cond';res.push('⚠️ Licence udělena jen podmínečně. Klub musí snížit dluh.');}else o.lic='ok';
 if(o.sp){o.sp.yrs--;if(o.sp.yrs<=0){res.push(`Smlouva se sponzorem ${o.sp.n} skončila.`);o.sp=null;}}if(o.kit){o.kit.yrs--;if(o.kit.yrs<=0){res.push(`Smlouva s dodavatelem dresů ${o.kit.n} skončila.`);o.kit=null;}}
 if(o.inv&&op<0){ownRepAdd(-2);res.push('Investoři jsou nespokojení se ztrátou.');}
 if(facLv('st')>=3)ach('own_stad');o.inj=0;o.res={s:S.season,res,rep:Math.round(o.rep)};return res;}
function ownSeasonStart(){const o=S.own;if(!o)return;ownOffersGen();o.stkS=null;if(o.licDed===S.season){const L=S.leagues[myClub().lg];if(L&&L.table[S.clubId]){L.table[S.clubId].pts-=6;L.ded=(L.ded||0)+6;L.dedS=S.season;}o.licDed=null;}
 const me=myClub();o.tb=Math.round(Math.max(0,me.money)*({low:0.3,bal:0.6,hi:0.9,all:1}[o.bud||'bal'])/1e4)*1e4;}
// ----- obrazovky -----
function ownHomeCard(){if(!S)return '';if(!ownMode()){const p=clubPrice(S.clubId);if(S.wallet>=p*0.7)return `<div class="card" style="border-color:var(--gold)"><h3>💼 Můžeš koupit klub</h3><div class="small">Na osobním kontě máš ${fmtMoney(S.wallet)}. Klub ${esc(myClub().n)} stojí ${fmtMoney(p)}.</div><button class="btn gold w100" style="margin-top:8px" onclick="ownBuySheet()">Koupit klub</button></div>`;return '';}
 const o=S.own;return `<div class="card" style="padding:10px 12px"><div class="row small" style="gap:8px"><span style="flex:1">💼 <b>Majitel</b> · ${ownRepTxt(o.rep)} (${Math.round(o.rep)})${ownOnly()?` · trenér: ${o.coach?esc(o.coach.n):'<b class="bad">chybí</b>'}`:''}</span></div><button class="btn ghost w100" style="margin-top:6px" onclick="go('own')">Kancelář majitele</button></div>`;}
function renderOwner(){if(!ownMode())return `<div class="card"><h3>💼 Majitel</h3><div class="small">Klub zatím nevlastníš. Klub ${esc(myClub().n)} stojí ${fmtMoney(clubPrice(S.clubId))}, na osobním kontě máš ${fmtMoney(S.wallet)}.</div><button class="btn gold w100" style="margin-top:8px" onclick="ownBuySheet()">Koupit klub</button></div>`;
 const o=S.own;const me=myClub();const t=UI.ownTab||'pre';const tabs=[['pre','Přehled'],['fin','Finance']].concat(ownOnly()?[['coach','Trenér']]:[]).concat([['biz','Obchod'],['fed','Svaz'],['deal','Prodej']]);
 let h=`<div class="seg" style="margin-bottom:10px">${tabs.map(([k,l])=>`<button class="${t===k?'on':''}" onclick="UI.ownTab='${k}';render()">${l}</button>`).join('')}</div>`;
 const row=(a,b,cls)=>`<div class="row small" style="padding:4px 0"><span style="flex:1">${a}</span><b class="${cls||''}">${b}</b></div>`;
 const B=(t,fn,cls,dis)=>`<button class="btn ${cls||'ghost'}" ${dis?'disabled':''} onclick="${fn}">${t}</button>`;
 if(t==='pre'){h+=`<div class="card"><h3>💼 ${esc(S.manager)}, majitel klubu ${esc(me.n)}</h3>${row('Pověst majitele',ownRepTxt(o.rep)+' · '+Math.round(o.rep)+' / 100',o.rep<35?'bad':o.rep>=65?'good':'')}<div class="bar" style="margin:4px 0 6px"><i style="width:${o.rep}%"></i></div>
  ${row('Osobní majetek',fmtMoney(S.wallet))}${row('Hodnota klubu',fmtMoney(clubPrice(S.clubId)))}${row('Tvůj podíl',Math.round((1-(o.inv||0))*100)+' %')}${row('Dluhy klubu',fmtMoney(ownDebt()),ownDebt()>0?'warn':'')}${row('Nálada fanoušků',fansLabel(),fansCls())}${o.protN?row('Protesty proti majiteli',o.protN+'×','bad'):''}
  ${o.res&&o.res.s===S.season-1?`<div class="tiny mut" style="margin-top:6px">${o.res.res.map(esc).join('<br>')}</div>`:''}</div>
  <div class="card"><h3>📰 Zprávy majitele</h3>${(o.news||[]).length?(o.news||[]).slice(0,15).map(n=>`<div class="small" style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">${n.ic} ${esc(n.t)} <span class="tiny mut">${seasonLabel(n.s)}, ${n.r}. týden</span></div>`).join(''):'<div class="small mut">Zatím nic.</div>'}</div>`;}
 if(t==='fin'){const f=S.finSeason;h+=`<div class="card"><h3>📊 Rozpočet sezóny</h3><div class="seg">${[['low','Úsporný'],['bal','Vyrovnaný'],['hi','Ambiciózní'],['all','Vše na jednu kartu']].map(([k,l])=>`<button class="${o.bud===k?'on':''}" onclick="ownBud('${k}')">${l}</button>`).join('')}</div>
  ${row('Peníze klubu',fmtMoney(me.money),me.money<0?'bad':'')}${row('Přestupový rozpočet',fmtMoney(o.tb))}${row('Zbývá k utracení',fmtMoney(ownTbLeft()))}<div class="grid2" style="gap:6px;margin:4px 0">${B('− Ubrat','ownTb(-1)')}${B('+ Přidat','ownTb(1)')}</div>
  ${row('Strop týdenní mzdy hráče',fmtMoney(o.wc))}<div class="grid2" style="gap:6px;margin-top:4px">${B('− Snížit','ownWc(-1)')}${B('+ Zvýšit','ownWc(1)')}</div>
  ${row('Příjmy / výdaje sezóny',fmtMoney(f.inc||0)+' / '+fmtMoney(f.exp||0))}</div>
  <div class="card"><h3>💶 Peníze majitele</h3><div class="small mut">Na osobním kontě: ${fmtMoney(S.wallet)}</div><div class="grid2" style="gap:6px;margin-top:6px">${[0.05,0.2].map(x=>{const v=Math.max(1e4,Math.round(Math.max(S.wallet,0)*x/1e4)*1e4);return B('Vložit '+fmtMoney(v),`ownInject(${v})`,'',v>S.wallet);}).join('')}${[0.05,0.15].map(x=>{const v=Math.max(1e4,Math.round(Math.max(me.money,0)*x/1e4)*1e4);return B('Dividenda '+fmtMoney(v),`ownDiv(${v})`,'',v>me.money);}).join('')}</div>
  ${o.inv?`<div class="small" style="margin-top:8px">Investoři vlastní ${Math.round(o.inv*100)} %.</div><button class="btn ghost w100" style="margin-top:6px" onclick="ownBuyout()">Odkoupit podíl za ${fmtMoney(Math.round(clubPrice(S.clubId)*o.inv/1e4)*1e4)}</button>`:''}</div>
  <div class="card"><h3>🏦 Úvěry</h3>${o.loans.length?o.loans.map((l,i)=>`<div class="row small" style="padding:4px 0;gap:8px"><span style="flex:1">${esc(l.n)} · ${fmtMoney(l.a)} · ${(l.r*100).toLocaleString('cs-CZ')} %</span><button class="btn ghost sm" onclick="ownRepay(${i})">Splatit</button></div>`).join(''):'<div class="small mut">Klub nemá žádné úvěry.</div>'}
  <div class="grid2" style="gap:6px;margin-top:6px">${B('Úvěr 10 % hodnoty','ownLoan(0.1)')}${B('Úvěr 25 % hodnoty','ownLoan(0.25)')}</div></div>`;}
 if(t==='coach'){const c=o.coach;h+=c?`<div class="card"><h3>🧑‍💼 Trenér ${esc(c.n)}</h3>${row('Reputace',c.rep)}${row('Styl',OWN_STY[c.st])}${row('Věk',c.age+' let')}${row('Mzda',fmtMoney(c.wage)+' týdně')}${row('Smlouva',c.yrs+' '+czPlural(c.yrs,'rok','roky','let'))}${row('Vztah s majitelem',c.pat>=60?'dobrý':c.pat>=35?'napjatý':'na bodu mrazu',c.pat<35?'bad':'')}
   <button class="btn red w100" style="margin-top:8px" onclick="ownFire()">Odvolat trenéra</button></div>`:`<div class="card" style="border-color:var(--bad)"><h3>🧑‍💼 Klub nemá trenéra</h3><div class="small">Tým zatím vede asistent a hraje hůř. Vyber nového trenéra.</div></div>`;
  h+=`<div class="card"><h3>🎯 Cíl pro trenéra</h3><div class="small mut" style="margin-bottom:6px">Očekávání podle síly kádru: ${expectText(me.expect)}</div>${(()=>{const n=zoneSize(me.lg,S.clubId);const opts=[1,3,Math.ceil(n/2),Math.max(1,n-3)].filter((v,i,a)=>a.indexOf(v)===i);return `<div class="grid2" style="gap:6px">${opts.map(p=>B(esc(expectText(p)),`ownGoal(${p})`,o.goal===p?'gold':'ghost')).join('')}</div>`;})()}</div>`;
  if(!c||UI.ownPool)h+=`<div class="card"><h3>📋 Volní trenéři</h3>${ownPool().map((x,i)=>`<div class="row small" style="padding:6px 0;gap:8px;border-bottom:1px solid rgba(255,255,255,.05)"><span style="flex:1"><b>${esc(x.n)}</b><div class="tiny mut">reputace ${x.rep} · ${OWN_STY[x.st]} styl · ${x.age} let · ${fmtMoney(x.wage)} týdně${x.no?' · odmítl':''}</div></span><button class="btn ghost sm" ${x.no?'disabled':''} onclick="ownHire(${i})">Najmout</button></div>`).join('')}</div>`;
  else h+=`<button class="btn ghost w100" style="margin-bottom:10px" onclick="UI.ownPool=1;render()">Ukázat volné trenéry</button>`;
  h+=`<div class="card"><h3>⭐ Na kom trváš</h3><div class="tiny mut" style="margin-bottom:6px">Trenér je musí postavit do základu. Moc zasahování mu ale vadí.</div>${clubPlayers(S.clubId).sort((a,b)=>b.ovr-a.ovr).slice(0,22).map(p=>`<div class="row small" style="padding:3px 0;gap:8px">${posB(p.pos)}<span style="flex:1">${esc(p.n)}${S.tac&&S.tac.xi.includes(p.id)?' <span class="tiny good">v základu</span>':''}</span>${ovrB(p.ovr)}<button class="btn ${(o.force||[]).includes(p.id)?'gold':'ghost'} sm" onclick="ownForce('${p.id}')">${(o.force||[]).includes(p.id)?'Trvám ✓':'Trvat'}</button></div>`).join('')}</div>`;}
 if(t==='biz'){const off=o.offers||{sp:[],kit:[]};const tk=me.ticketBase?me.ticket/me.ticketBase:1;
  h+=`<div class="card"><h3>✍️ Hlavní sponzor</h3>${o.sp?row(esc(o.sp.n),fmtMoney(o.sp.amt)+' / sezóna · ještě '+o.sp.yrs+' '+czPlural(o.sp.yrs,'rok','roky','let')):(off.sp||[]).map((x,i)=>`<div class="row small" style="padding:6px 0;gap:8px"><span style="flex:1"><b>${esc(x.n)}</b><div class="tiny mut">${fmtMoney(x.amt)} za sezónu · ${x.yrs} ${czPlural(x.yrs,'rok','roky','let')}</div></span><button class="btn ghost sm" onclick="ownSign('sp',${i})">Podepsat</button></div>`).join('')||'<div class="small mut">Nové nabídky přijdou příští sezónu.</div>'}</div>
  <div class="card"><h3>👕 Dodavatel dresů</h3>${o.kit?row(esc(o.kit.n),fmtMoney(o.kit.amt)+' / sezóna'):(off.kit||[]).map((x,i)=>`<div class="row small" style="padding:6px 0;gap:8px"><span style="flex:1"><b>${esc(x.n)}</b><div class="tiny mut">${fmtMoney(x.amt)} za sezónu · ${x.yrs} ${czPlural(x.yrs,'rok','roky','let')}</div></span><button class="btn ghost sm" onclick="ownSign('kit',${i})">Podepsat</button></div>`).join('')||'<div class="small mut">Nové nabídky přijdou příští sezónu.</div>'}</div>
  <div class="card"><h3>🎟️ Vstupenky a permanentky</h3>${row('Cena vstupenky',fmtMoney(me.ticket))}<div class="seg">${[[0.8,'Levná'],[1,'Běžná'],[1.25,'Dražší'],[1.5,'Drahá']].map(([k,l])=>`<button class="${Math.abs(tk-k)<0.02?'on':''}" onclick="setTicket(${k})">${l}</button>`).join('')}</div>
  <div class="small" style="margin:8px 0 4px">Permanentky (podíl kapacity, sleva 30 %)${S.round>0?' <span class="tiny mut">· prodávají se před sezónou</span>':''}</div><div class="seg">${[[0,'Žádné'],[0.2,'20 %'],[0.35,'35 %'],[0.5,'50 %']].map(([v,l])=>`<button class="${(o.stk||0)===v?'on':''}" onclick="ownStk(${v})">${l}</button>`).join('')}</div>
  <div class="tiny mut" style="margin-top:6px">Drahé vstupenky zvednou příjmy, ale sníží návštěvnost a naštvou fanoušky. Permanentky přinesou peníze hned a fanoušci je mají rádi.</div></div>
  <div class="card"><h3>🏟️ Stadion a zázemí</h3><div class="small">Kapacita ${(me.cap||0).toLocaleString('cs-CZ')} míst · stadion úroveň ${facLv('st')}</div><button class="btn ghost w100" style="margin-top:8px" onclick="UI.clubTab='zaz';go('club')">Stavět a rozšiřovat</button></div>`;}
 if(t==='fed'){const f=fixS();h+=`<div class="card"><h3>⚖️ Svaz a licence</h3>${row('Licence',o.lic==='no'?'neudělena':o.lic==='cond'?'podmínečná':'v pořádku',o.lic==='no'?'bad':o.lic==='cond'?'warn':'good')}${row('Finanční fair play',o.ffp?(o.ffp>=2?'trest':'varování'):'v pořádku',o.ffp?'warn':'good')}${o.tban===S.season?row('Zákaz přestupů','letní okno','bad'):''}${row('Podezření svazu',bribeHeatTxt())}${row('Otevřená řízení',f.cases.filter(c=>c.st===1).length)}
  <div class="tiny mut" style="margin-top:6px;line-height:1.5">Licenci klub nedostane, když má záporný účet a dluhy přes 60 % hodnoty klubu. Fair play hlídá provozní ztrátu sezóny, vklady majitele se do příjmů nepočítají.</div></div>
  <div class="card"><h3>🤫 Zákulisí</h3><div class="small">I jako majitel můžeš před zápasem napsat rozhodčímu, poslat obálku nebo zápas prodat. Riziko je stejné a skandál ti zničí pověst.</div></div>`;}
 if(t==='deal'){h+=`<div class="card"><h3>🤝 Prodat klub</h3><div class="small">Za klub bys po odečtení dluhů a podílu investorů dostal <b>${fmtMoney(ownSaleValue())}</b>. Koupil jsi ho za ${fmtMoney(o.price0||0)}.</div><button class="btn ghost w100" style="margin-top:8px" onclick="if(confirm('Opravdu prodat klub?'))ownSell()">Prodat klub</button></div>
  <div class="card"><h3>🔄 Převzít jiný klub</h3><div class="small">Prodáš současný klub a koupíš jiný.</div><button class="btn ghost w100" style="margin-top:8px" onclick="ownTakeList()">Vybrat klub</button></div>`;}
 return h;}
function ownCoachView(){if(!S||!S.own)return;const o=S.own;const c=o.coach;ownCoachTac();const t=S.tac;const slots=FORMS[t.form];
 return `<div class="card"><h3>🧑‍💼 ${c?'Trenér '+esc(c.n):'Asistent trenéra (dočasně)'}</h3><div class="small mut">Sestavu a taktiku určuje trenér. Jako majitel můžeš trvat na konkrétních hráčích v Kanceláři majitele.</div>
 <div class="small" style="margin-top:6px">Rozestavení <b>${esc(t.form)}</b> · styl ${OWN_STY[t.ment]||'vyvážený'}</div></div>
 <div class="card"><h3>Základní sestava</h3>${t.xi.map((id,i)=>{const p=P(id);return p?`<div class="row small" style="padding:3px 0;gap:8px">${posB(slots[i][0])}<span style="flex:1">${esc(p.n)}${(o.force||[]).includes(id)?' ⭐':''}</span>${ovrB(p.ovr)}</div>`:'';}).join('')}</div>
 <button class="btn gold w100" onclick="UI.ownTab='coach';go('own')">Kancelář majitele</button>`;}
Object.assign(ACH,{own_buy:['💼','Nový majitel','Kup fotbalový klub.'],own_title:['👑','Šampioni pod mým vedením','Vyhraj ligu jako majitel.'],own_black:['📈','Černá nula','Skonči sezónu jako majitel v provozním zisku.'],
 own_stad:['🏗️','Stavitel','Rozšiř stadion na 3. úroveň.'],own_sell:['💰','Výhodný exit','Prodej klub se ziskem.'],own_fire:['🪓','Řezník','Odvolej tři trenéry.'],own_take:['🏰','Impérium','Převezmi jiný klub.']});
(function(){
 const _ng=newGame;newGame=async function(o){const r=await _ng(o);if(o&&o.role&&o.role!=='coach'){const pr=o.price||clubPrice(S.clubId);S.news=S.news.filter(n=>!/novým trenérem/.test(n.t));ownInit(o.role,pr,o.inv||0,o.loan||0);S.wallet=Math.max(0,Math.round((o.fort||pr)-pr*(1-(o.inv||0)-(o.loan||0))));if(S.role==='owner')ownCoachTac();}else S.role='coach';return r;};
 const _sc=startConfirm;startConfirm=function(code,ci){const r=UI.start&&UI.start.role;if(r==='owner'||r==='both')return ownStartConfirm(code,ci);return _sc(code,ci);};
 const _cm=createMatch;createMatch=function(h,a,F){if(ownOnly()&&(h===S.clubId||a===S.clubId))try{ownCoachTac();}catch(e){console.warn(e);}const M=_cm(h,a,F);if(ownOnly()&&(h===S.clubId||a===S.clubId))M.autoUser=1;return M;};
 const _re=recalc;recalc=function(M){_re(M);if(ownOnly()&&M.str){const i=M.h.user?0:M.a.user?1:-1;if(i>=0){const b=ownCoachBonus();const s=M.str[i];s.att+=b;s.def+=b;s.mid+=b;M.xg=xgPair(M.str[0],M.str[1]);}}};
 const _wk=v4Week;v4Week=function(){_wk();try{ownWeek();}catch(e){console.warn(e);}};
 const _es=endSeason;endSeason=function(){let r0=null;try{r0=ownSeasonEnd();}catch(e){console.warn(e);}const rep=_es();if(ownMode()){rep.fired=false;rep.own=r0;}return rep;};
 const _ss=startSeason;startSeason=function(first){_ss(first);try{if(S.own){ownSeasonStart();}}catch(e){console.warn(e);}};
 const _bs=betSalary;betSalary=function(){if(ownOnly()){S.salary=0;return;}_bs();};
 const _jg=jobsGen;jobsGen=function(n){if(ownMode())return;_jg(n);};
 const _sk=sackModal;sackModal=function(){if(!ownMode())return _sk();S.sackNow=0;const why=S.sackWhy||'Po skandálu';S.sackWhy=null;modal(`<div class="c"><div style="font-size:46px">🧾</div><h2>Musíš prodat klub</h2><div class="small">${esc(why)} svaz i fanoušci tlačí, abys klub prodal. Kupec nabízí jen 70 % ceny.</div></div><button class="btn big red" style="margin-top:12px" onclick="closeModal();ownSell(1)">Prodat klub</button>`,{noClose:true});};
 const _rt=renderTactics;renderTactics=function(){if(ownOnly())return ownCoachView();return _rt();};
 const _rtab=renderTab;renderTab=function(){if(UI.tab==='own')return renderOwner();return _rtab();};
 const _li=lineupIssues;lineupIssues=function(){if(ownOnly())return '';return _li();};
 const _hc=v4HomeCards;v4HomeCards=function(){let h='';try{h=ownHomeCard();}catch(e){}return h+_hc();};
 const _bh=v4bHomeCards;v4bHomeCards=function(){const h=_bh();if(!ownMode())return h;return h.replace(/<div class="card"><h3>👔 Jednání s vedením[\s\S]*$/,'');};
 const _mb=makeBid;makeBid=function(id,fee){if(ownMode()){const o=S.own;const p=id.startsWith('t_')?MK.tmp[id]:P(id);if(o.tban===S.season&&S.round<Math.floor(S.maxRound/2)){toast('Klub má od svazu zákaz přestupů.');return;}
   if(fee>ownTbLeft()){toast(`Překračuje to přestupový rozpočet (zbývá ${fmtMoney(ownTbLeft())}).`);return;}if(p&&!S.inf&&playerWage(p)>o.wc){toast(`Hráč chce víc, než je mzdový strop (${fmtMoney(o.wc)}).`);return;}}
  const n0=clubPlayers(S.clubId).length;const r=_mb(id,fee);try{if(ownOnly()&&S.own.coach&&clubPlayers(S.clubId).length>n0&&RNG()<0.4){S.own.coach.pat=clamp(S.own.coach.pat-3,0,100);ownNews('🗣️',`Trenér ${S.own.coach.n}: „Tohohle hráče jsem nechtěl, ale majitel rozhodl.“`);}}catch(e){}return r;};
 const _gi=gateIncome;gateIncome=function(h){const g=_gi(h);if(h===S.clubId&&S.own){const me=myClub();let att=g.att;if(S.own.protR!=null&&S.round-S.own.protR<=1)att=Math.round(att*0.8);const st=Math.round((me.cap||0)*(S.own.stk||0));att=Math.max(att,Math.min(me.cap||att,st));const paid=Math.max(0,att-st);return {att,inc:paid*me.ticket};}return g;};
 const _sm=stepMinute;stepMinute=function(M){const out=_sm(M);try{if(S.own&&M.min===2&&!M._ownP&&M.sides[0].cid===S.clubId&&S.own.protR!=null&&S.round-S.own.protR<=1){M._ownP=1;const e={m:M.min,t:'fill',s:0,tx:'🪧 Na tribuně visí obří transparent „Majiteli, prodej klub a zmiz!“ a kotel píská na čestnou lóži.'};M.ev.push(e);out.push(e);}}catch(e){}return out;};
 const _wm=welcomeModal;welcomeModal=function(){if(!ownMode())return _wm();const me=myClub();const o=S.own;modal(`<div class="c"><div style="font-size:44px">💼</div><h2>Vítej, majiteli klubu ${esc(me.n)}</h2></div><div class="small" style="line-height:1.5">Klub stál <b>${fmtMoney(o.price0)}</b>. Na osobním kontě ti zbývá <b>${fmtMoney(S.wallet)}</b>, klub má ${fmtMoney(me.money)}${ownDebt()?` a dluh ${fmtMoney(ownDebt())}`:''}.<br><br>${ownOnly()?`Tým vede trenér <b>${esc(o.coach.n)}</b>. Ty určuješ rozpočet, cíle, sponzory, vstupné a stadion. Vše najdeš v <b>Kanceláři majitele</b> na přehledu.`:'Jsi majitel i trenér: staráš se o sestavu i o finance klubu. Kancelář majitele najdeš na přehledu.'}</div><button class="btn big gold" style="margin-top:12px" onclick="closeModal();UI.tab='own';render()">Do kanceláře</button>`);};
})();

// ===== v8: trenér řídí zápas za majitele, křik z lóže, podplácení disciplinární komise =====
const CO_PER={posl:['poslušný',0.85,1],dipl:['diplomat',0.6,2],tvrd:['tvrdohlavý',0.3,3],vybu:['výbušný',0.45,4]};
function coPer(c){if(!c)return 'dipl';if(!c.per)c.per=['posl','dipl','tvrd','vybu'][hashStr('per|'+c.n)%4];return c.per;}
function coName(){const c=S.own&&S.own.coach;return c?'Trenér '+c.n:'Asistent trenéra';}
// ----- poločas a taktika řízené trenérem -----
function coHalfTime(M){M._ht2=1;const ui=userSide(M);const d=M.score[ui]-M.score[1-ui];const c=S.own&&S.own.coach;const per=coPer(c);
 const k=d>0?'kl':d<0?(per==='vybu'||per==='tvrd'?'tl':'po'):(per==='vybu'?'tl':'po');const r=talkEff(M,k,1);
 const q={kl:'Hrajte v klidu svou hru, nic nepouštějte.',po:'Věřím vám, druhý poločas je náš!',tl:'Tohle je ostuda! Chci vidět úplně jiný tým!'}[k];
 M.ev.push({m:45,t:'fill',tx:`🗣️ ${coName()} v kabině: „${q}“ ${r.tx}`});try{updLive();}catch(e){}toast(`${coName()} mluvil v kabině. ${r.tx}`);}
function coStep(M,out){const c=S.own&&S.own.coach;const ui=userSide(M);const sd=M.sides[ui];const d=M.score[ui]-M.score[1-ui];const N=c?c.n:'asistent';
 const sw=(m,tx)=>{sd.tac=Object.assign({},sd.tac,{ment:m});recalc(M);out.push({m:M.min,t:'fill',s:ui,co:1,tx:'🧑‍💼 '+tx});};
 if(M.half===2&&!M._coA&&M.min>=62&&d<0&&sd.tac.ment!=='att'){M._coA=1;sw('att',`${coName()} reaguje na nepříznivý stav a posílá tým do útoku.`);}
 else if(M.half===2&&!M._coD&&M.min>=80&&d===1&&sd.tac.ment==='att'){M._coD=1;sw('bal',`${coName()} stahuje tým dozadu, chce udržet těsné vedení.`);}
 else if(M.half===2&&!M._coD&&M.min>=84&&d===1&&c&&c.st==='def'){M._coD=1;sw('def',`${coName()} zavírá obranu a hraje na čas.`);}}
// ----- křik z lóže -----
function coGrp(p){return p==='GK'?'G':/^(CB|LB|RB|LWB|RWB)$/.test(p)?'D':/^(LW|RW|ST|CF)$/.test(p)?'A':'M';}
const BOX={att:['⚔️','Do útoku, ať to otočíme!'],def:['🧱','Zavřete to vzadu!'],press:['🔥','Víc presinku, napadejte je!'],wake:['😤','Trenére, probuď se!']};
function boxSheet(){if(!MS)return;const M=MS.M;if(M.ended)return;if(!document.getElementById('mbg'))MS._bxwp=MS.paused;MS.paused=true;clearTimeout(MS.timer);const ui=userSide(M);const sd=M.sides[ui];const c=S.own.coach;
 const on=onPitch(sd).map(P).filter(p=>p&&p.pos!=='GK').sort((a,b)=>(M.rt[a.id]||6)-(M.rt[b.id]||6)).slice(0,3);const bn=sd.bench.map(P).filter(p=>p&&p.pos!=='GK').sort((a,b)=>b.ovr-a.ovr).slice(0,3);const canSub=sd.subs<sd.maxSubs;
 const B=(t,fn,dis)=>`<button class="btn ghost w100" style="margin-bottom:6px;text-align:left;white-space:normal" ${dis?'disabled':''} onclick="${fn}">${t}</button>`;
 const bg=modal(`<h2>📣 Křik z lóže</h2><div class="small mut" style="margin-bottom:8px">Střídá a mění taktiku ${c?'trenér <b>'+esc(c.n)+'</b> ('+CO_PER[coPer(c)][0]+')':'asistent trenéra'}. Ty můžeš jen křičet z lóže. Moc křiku mu ale vadí.${c?` Vztah: ${c.pat>=60?'dobrý':c.pat>=35?'napjatý':'na bodu mrazu'}.`:''}</div>
 ${Object.entries(BOX).map(([k,x])=>B(`${x[0]} „${x[1]}“`,`boxSay('${k}')`)).join('')}
 <div class="small" style="margin:8px 0 4px"><b>Vystřídej ho!</b>${canSub?'':' <span class="tiny mut">(už nemá střídání)</span>'}</div>${on.map(p=>B(`🔻 ${esc(p.n)} <span class="tiny mut">známka ${(M.rt[p.id]||6).toFixed(1).replace('.',',')}</span>`,`boxSay('out','${p.id}')`,!canSub)).join('')}
 <div class="small" style="margin:8px 0 4px"><b>Pošli na hřiště</b></div>${bn.map(p=>B(`🔺 ${esc(p.n)} <span class="tiny mut">${p.pos} · ${p.ovr}</span>`,`boxSay('in','${p.id}')`,!canSub)).join('')}
 <button class="btn big" style="margin-top:6px" onclick="boxClose()">Zpět k zápasu</button>`,{noClose:true});bg.style.zIndex=120;}
function boxClose(){closeModal();if(MS){MS.paused=MS._bxwp;updLive();schedule();}}
function boxSay(k,id){const M=MS.M;const ui=userSide(M);const sd=M.sides[ui];const o=S.own;const c=o.coach;const per=coPer(c);const txt=k==='out'?`Stáhni ho, ${pSurname(P(id))} je dneska k ničemu!`:k==='in'?`Pošli tam ${pSurname(P(id))}!`:BOX[k][1];
 const spam=M._boxM!=null&&M.min-M._boxM<5;M._boxM=M.min;M._boxN=(M._boxN||0)+1;const ev=[{m:M.min,t:'fill',s:ui,box:1,tx:`📣 Majitel křičí z lóže: „${txt}“`}];
 let p=c?CO_PER[per][1]*clamp(c.pat/70,0.3,1.25):0.7;if(spam)p*=0.4;if(k==='wake')p=0;const ok=RNG()<p;let res='';
 if(ok){if(k==='att'||k==='def'){sd.tac=Object.assign({},sd.tac,{ment:k});recalc(M);res=`${coName()} přikývl a ${k==='att'?'posílá tým dopředu':'stahuje tým do obrany'}.`;}
  else if(k==='press'){sd.tac=Object.assign({},sd.tac,{press:'high'});recalc(M);res=`${coName()} gestikuluje na hráče, ať víc napadají.`;}
  else if(k==='out'||k==='in'){let outId=id,inId=null;if(k==='out'){const kk=sd.xi.indexOf(id);inId=kk>=0?bestBenchFor(sd,sd.slots[kk]):null;}else{inId=id;const g=coGrp(P(id).pos);const cand=onPitch(sd).map(P).filter(q=>q&&q.pos!=='GK'&&coGrp(q.pos)===g).sort((a,b)=>(M.rt[a.id]||6)-(M.rt[b.id]||6));const alt=onPitch(sd).map(P).filter(q=>q&&q.pos!=='GK').sort((a,b)=>(M.rt[a.id]||6)-(M.rt[b.id]||6));outId=(cand[0]||alt[0]||{}).id;}
   const e=outId&&inId?doSub(M,ui,outId,inId,true):null;if(e){ev.push(e);res=`${coName()} po chvíli váhání střídá.`;}else res=`${coName()} by vystřídal, ale nejde to.`;}
  if(c)c.pat=clamp(c.pat-(per==='posl'?0.5:1.5)-(spam?2:0),0,100);}
 else{if(k==='wake')res=`${coName()} se k lóži ani neotočil.`;else res=pick([`${coName()} jen mávl rukou a nic nemění.`,`${coName()} dělá, že neslyší.`,`${coName()} kroutí hlavou: sestavu dělá on.`]);
  if(c){c.pat=clamp(c.pat-(spam?5:3)-(per==='tvrd'?1:0),0,100);if(per==='vybu'&&RNG()<0.35){res=`${coName()} se otočil k lóži a něco nevybíravého zakřičel. Kamery to zabraly!`;c.pat=clamp(c.pat-5,0,100);M._boxFight=1;}}}
 ev.push({m:M.min,t:'fill',s:ui,box:1,tx:'🧑‍💼 '+res});ev.forEach(e=>{if(!M.ev.includes(e))M.ev.push(e);});try{chatOnEvents(M,ev);}catch(e){}
 if(M._boxN===4)ach('own_box');boxClose();toast(res);}
// ----- disciplinární komise -----
const KOM_NAMES=['JUDr. Karel Vacek','Ing. Milena Horská','Mgr. Ivan Rýdl','Doc. Petr Šafránek','JUDr. Hana Kopecká','Ing. Ludvík Brož','Mgr. Dana Tichá','PhDr. Oldřich Mareš'];
const KOM_PERS={cor:['prospěchář','prý není proti „rozumné dohodě“',0.8,0.82],gre:['chamtivý','říká se, že má drahé koníčky',1.3,0.72],cau:['opatrný','bojí se o místo',1.05,0.68],hon:['zásadový','pověst neúplatného',9,0]};
const KOM_GOAL={stop:['Zastavit řízení','Případ skončí pro nedostatek důkazů.',1],red:['Zmírnit trest','Trest bude zhruba poloviční.',0.5],del:['Odložit verdikt','Rozhodnutí se odsune o čtyři týdny.',0.3]};
function komA(m){return /Milena|Hana|Dana/.test(m.n)?'a':'';}
function komS(){if(!S.kom)S.kom={n:0,ok:0,log:{},fan:null,leak:null,chat:null};return S.kom;}
function komCases(){const f=fixS();const out=[];f.cases.forEach((c,i)=>{if(c.st===1)out.push({id:'f'+i+'|'+c.r0+'|'+c.opp,kind:c.why==='kom'?'kom':c.why==='ref'||c.why==='own'?'ref':'fix',c,sev:c.sev||1,t:c.why==='kom'?'pokus o podplacení komise':c.why==='ref'||c.why==='own'?'kontakty s rozhodčím':'podezřelé sázky a prodej zápasu',opp:c.opp});});
 const k=komS();const F=k.fan;if(F&&(F.s===S.season&&S.round<=F.until)&&(F.doors||F.sec))out.push({id:'fan|'+F.s+'|'+F.r,kind:'fan',c:F,sev:1+(F.doors?1:0),t:'výtržnosti fanoušků',opp:F.opp});return out;}
function komPrice(cs,g){const me=myClub();let b=Math.max(30000,(me.tv||20000)*2.5);if(typeof ownMode==='function'&&ownMode())b+=clubPrice(S.clubId)*0.004;return Math.round(b*(0.6+0.5*cs.sev)*KOM_GOAL[g][2]*(cs.kind==='fan'?0.5:1)/1000)*1000;}
function komMember(cs){const h=hashStr('kom|'+cs.id+'|'+S.season);const n=KOM_NAMES[h%KOM_NAMES.length];const ph=(h>>>7)%100;return {n,sn:n.split(' ').slice(-1)[0],per:ph<28?'cor':ph<55?'gre':ph<82?'cau':'hon'};}
function komSheet(i){const L=komCases();const cs=L[i==null?(UI.komI||0):i];if(!cs){toast('Žádné otevřené řízení.');return;}UI.komI=L.indexOf(cs);const k=komS();
 if(!UI.kc||UI.kc.id!==cs.id){const old=k.chat&&k.chat.id===cs.id?k.chat:null;UI.kc={id:cs.id,m:komMember(cs),log:old?old.log:[],st:old?old.st:'open',g:null,ask:0,res:0,pat:3};}
 const c=UI.kc;const R=c.m;const bub=l=>`<div class="rcb ${l.w==='me'?'me':''}"><b>${l.w==='me'?'Ty':'⚖️ '+esc(R.n)}</b><div>${esc(l.t)}</div></div>`;
 const btn=(t,fn,dis,cls)=>`<button class="btn ${cls||'ghost'} w100" style="margin-bottom:6px;display:block;text-align:left;padding:8px 12px;white-space:normal" ${dis?'disabled':''} onclick="${fn}">${t}</button>`;let act='';
 if(c.st==='open')act=`<div class="small" style="margin:4px 0"><b>Napiš mu</b></div>${btn('„Dobrý den, nešlo by se sejít mimo úřad? Jen tak, na oběd.“',"komOpen('soft')")}${btn('„Ten náš případ by se snad dal nějak vyřešit, ne?“',"komOpen('dir')")}${btn('„Kolik chcete, aby to celé zmizelo?“',"komOpen('hard')")}${btn('Radši nic','closeModal()')}`;
 else if(c.st==='goal')act=`<div class="small" style="margin:4px 0"><b>Co chceš</b></div>${Object.entries(KOM_GOAL).filter(([g])=>!(cs.kind==='fan'&&g==='del')).map(([g,x])=>btn(`<b>${x[0]}</b> · zhruba ${fmtMoney(komPrice(cs,g))}<div class="tiny mut">${x[1]}</div>`,`komGoal('${g}')`)).join('')}${btn('Ukončit rozhovor','komBye()')}`;
 else if(c.st==='neg'){const offs=[0.6,0.8,0.95].map(f=>Math.round(c.ask*f/1000)*1000).filter((v,i,a)=>v>0&&a.indexOf(v)===i);act=`<div class="small" style="margin:4px 0">Chce <b>${fmtMoney(c.ask)}</b> · na osobním kontě máš ${fmtMoney(S.wallet)}</div>${offs.map(v=>btn('Nabídnout '+fmtMoney(v),`komOffer(${v})`,v>S.wallet)).join('')}${btn('Přistoupit na '+fmtMoney(c.ask),`komOffer(${c.ask})`,c.ask>S.wallet,'gold')}${btn('Tohle je moc, končím','komBye()')}`;}
 else act=`<div class="small mut" style="padding:4px 0">${c.st==='done'?'Dohodnuto. Teď už jen čekat.':'Rozhovor skončil.'}</div>${btn('Zavřít','closeModal();render()')}`;
 modal(`<h2>⚖️ Rozhovor s komisí</h2><div class="small mut" style="margin-bottom:6px">Satirická herní mechanika jen s herními penězi a smyšlenými postavami. Ve skutečnosti je to trestný čin.</div>
 <div class="card" style="padding:8px 12px"><div class="small">Případ: <b>${esc(cs.t)}</b>${cs.opp?` · ${esc(cs.opp)}`:''}</div><div class="small">Člen komise: <b>${esc(R.n)}</b> · ${KOM_PERS[R.per][1]}</div><div class="tiny mut">Dřívější pokusy o podplacení: ${k.n}${k.n?' · riziko odhalení roste':''}</div></div>
 <div class="card rcchat" id="kcchat" style="padding:8px 10px">${c.log.length?c.log.map(bub).join(''):'<div class="small mut">Zatím jste si nic nenapsali.</div>'}</div>${act}`);const el=document.getElementById('kcchat');if(el)el.scrollTop=el.scrollHeight;}
function komSay(w,t){UI.kc.log.push({w,t});}
function komSave(){const c=UI.kc;komS().chat={id:c.id,log:c.log.slice(-30),st:c.st==='neg'||c.st==='goal'?'open':c.st};saveGame();}
function komCase(){return komCases().find(x=>x.id===UI.kc.id);}
function komNewCase(why,sev,txt){const f=fixS();f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(3,5),st:0,sev,opp:'disciplinární komisí',sc:'mimo hřiště',bet:0,why:'kom'});komS().leak={s:S.season,r:S.round};addNews('🚨',txt);fansAdd(-3);if(S.own)ownRepAdd(-4);}
function komOpen(t){const c=UI.kc;const p=c.m.per;komSay('me',{soft:'Dobrý den, nešlo by se sejít mimo úřad? Jen tak, na oběd.',dir:'Ten náš případ by se snad dal nějak vyřešit, ne?',hard:'Kolik chcete, aby to celé zmizelo?'}[t]);
 if(p==='hon'){komSay('ref','Tohle jste mi neměl psát. Nechám to zapsat do spisu.');if(RNG()<({soft:0.1,dir:0.25,hard:0.4})[t]){const cs=komCase();if(cs&&cs.kind!=='fan')cs.c.sev=(cs.c.sev||1)+1;komNewCase('kom',1,`${c.m.n} z disciplinární komise nahlásil${komA(c.m)} pokus o ovlivnění, za kterým stojí ${mgrRef()}. Komise otevírá další řízení.`);}c.st='end';}
 else{komSay('ref',pick({cor:['Oběd? Proč ne. O čem si budeme povídat?','Všechno se dá vyřešit, když se chce.'],gre:['Vyřešit se dá leccos. Otázka je, za kolik.','Hm. Mluvte, ale levné to nebude.'],cau:['Opatrně, prosím. Co přesně máte na mysli?','Tohle nikdo neslyšel… ale pokračujte.']}[p]));c.st='goal';}komSave();komSheet();}
function komGoal(g){const c=UI.kc;const cs=komCase();if(!cs)return closeModal();c.g=g;komSay('me',`Šlo by ${KOM_GOAL[g][0].toLowerCase()}?`);const per=c.m.per;const v=komPrice(cs,g);c.res=Math.round(v*KOM_PERS[per][2]/1000)*1000;c.ask=Math.round(c.res*(1.15+RNG()*0.2)/1000)*1000;
 komSay('ref',`To by šlo zařídit. ${fmtMoney(c.ask)} a nikdo se nic nedozví.`);c.st='neg';komSave();komSheet();}
function komOffer(v){const c=UI.kc;if(v>S.wallet){toast('Na osobním kontě nemáš dost peněz.');return;}komSay('me',v>=c.ask?`Dobře, ${fmtMoney(v)}.`:`Dám vám ${fmtMoney(v)}.`);
 if(v>=c.ask||(v>=c.res&&RNG()<0.7))return komDeal(v);
 if(v>=c.res*0.6){c.pat--;c.ask=Math.max(c.res,Math.round((c.ask+v)/2/1000)*1000);if(c.pat<=0){komSay('ref','Tak to se nedohodneme. Uvidíme se při jednání.');c.st='end';}else komSay('ref',pick([`Málo. Řekněme ${fmtMoney(c.ask)}.`,`Riskuju místo. ${fmtMoney(c.ask)}.`]));}
 else{c.pat-=2;komSay('ref','To je skoro urážka.');if(c.pat<=0){komSay('ref','Konec rozhovoru.');c.st='end';}}komSave();komSheet();}
function komDeal(v){const c=UI.kc;const cs=komCase();const k=komS();if(!cs){closeModal();return;}S.wallet-=v;k.n++;komSay('ref','Dobrá. Nechte to na mně.');c.st='done';
 const dl=RNG()<KOM_PERS[c.m.per][3];const G=c.g;
 if(dl){if(cs.kind==='fan'){const ch=chS();if(G==='stop'){ch.doors=0;ch.sec=0;}else{ch.doors=Math.floor((ch.doors||0)/2);ch.sec=Math.floor((ch.sec||0)/2);}k.fan=null;addNews('📁',G==='stop'?'Odvolací komise nečekaně zrušila tresty za výtržnosti fanoušků.':'Odvolací komise zmírnila tresty za výtržnosti fanoušků.');}
  else if(G==='stop'){const f=fixS();f.cases=f.cases.filter(x=>x!==cs.c);addNews('📁','Disciplinární komise nečekaně zastavila řízení. Prý pro nedostatek důkazů.');ach('komise');k.ok++;}
  else if(G==='red'){cs.c.red=1;addNews('📁','Z komise prosakuje, že trest bude mírnější, než se čekalo.',1);k.ok++;}
  else{cs.c.r1=(cs.c.r1||S.round)+4;addNews('📁','Disciplinární komise odložila rozhodnutí o čtyři týdny.',1);k.ok++;}}
 else{k.stiff=(k.stiff||0)+1;addNews('💸',`${c.m.n} si peníze nechal${komA(c.m)}, ale v komisi neprosadil${komA(c.m)} nic. Stěžovat si nemůžeš nikde.`);}
 const risk=clamp(6+6*(k.n-1)+fixS().heat*2+(c.m.per==='gre'?4:0),0,60);if(RNG()*100<risk)komNewCase('kom',1,`SKANDÁL! Novináři zjistili, že ${mgrRef()} platil členovi disciplinární komise. Svaz otevírá nové řízení.`);
 komSave();komSheet();}
function komBye(){const c=UI.kc;komSay('me','Zapomeňte na to.');komSay('ref','Jak myslíte.');c.st='end';komSave();komSheet();}
function komHomeCard(){const L=komCases();if(!L.length)return '';return `<div class="card" style="padding:10px 12px;border-color:var(--warn,#e9b949)"><div class="small">⚖️ <b>Otevřená řízení:</b> ${L.map(x=>esc(x.t)).join(', ')}.</div>${L.map((x,i)=>`<button class="btn ghost w100" style="margin-top:6px" onclick="UI.kc=null;komSheet(${i})">🤝 Promluvit s komisí: ${esc(x.t)}</button>`).join('')}</div>`;}
Object.assign(ACH,{komise:['🗂️','Dohoda u zeleného stolu','Nech komisi zastavit řízení.'],own_box:['📣','Hlas z lóže','Zakřič na trenéra čtyřikrát v jednom zápase.']});
Object.assign(CH,{box_on:['Majitel zase řve z lóže. Chudák trenér.','Kdo tady vlastně trénuje, majitel, nebo trenér?','Tohle křičení z lóže znám, to nikdy nekončí dobře.'],
 box_fight:['Trenér se pohádal s majitelem přímo během zápasu! To se jen tak nevidí.','Ten trenér tu dlouho nebude, to je jasný.'],
 kom_talk:['Slyšeli jste, že komise zase něco „ztratila“ ze spisu? Fotbal je fotbal.','Prý se v komisi platí. Kdo má peníze, ten má pravdu.','Ten případ s komisí smrdí na sto honů.']});
FORUM.kom=['Komise je zkorumpovaná, to ví každý.','Kolik stálo, aby se to zametlo pod koberec?','Tohle je ostuda celého fotbalu, ne jenom klubu.'];
(function(){
 const _ht=htTalk;htTalk=function(M){if(ownOnly()&&M&&!M._ht2)return coHalfTime(M);return _ht(M);};
 const _sm=stepMinute;stepMinute=function(M){const out=_sm(M);try{if(ownOnly()&&!M.ended&&(M.h.user||M.a.user)){const post=[];coStep(M,post);post.forEach(e=>M.ev.push(e));return out.concat(post);}}catch(e){console.warn(e);}return out;};
 const _ul=updLive;updLive=function(full){_ul(full);try{if(ownOnly()&&MS&&!MS.M.ended){const f=document.getElementById('mvfoot');if(f){f.querySelectorAll('button').forEach(b=>{const oc=b.getAttribute('onclick')||'';if(oc==='subSheet()'){b.setAttribute('onclick','boxSheet()');b.textContent='📣 Lóže';}else if(oc==='liveTac()')b.remove();});}}}catch(e){}};
 const _ss=subSheet;subSheet=function(slot,auto){if(ownOnly()){toast('Střídá trenér. Můžeš mu leda zakřičet z lóže.');return;}return _ss(slot,auto);};
 const _lt=liveTac;liveTac=function(){if(ownOnly()){toast('Taktiku během zápasu řídí trenér.');return;}return _lt();};
 const _co=chatOnEvents;chatOnEvents=function(M,ev){_co(M,ev);try{if(!MS||!MS.chat)return;const U=MS.chat.users;for(const e of ev){if(e.box&&/křičí/.test(e.tx)&&RNG()<0.6)chSay(M,U.find(u=>u.per==='troll')||pick(U),'box_on',{},true);if(e.box&&/nevybíravého/.test(e.tx))chSay(M,pick(U),'box_fight',{},true);}}catch(x){}};
 const _ib=initBetChat;initBetChat=function(M){_ib(M);try{const k=komS();if(k.leak&&k.leak.s===S.season&&S.round-k.leak.r<=3&&MS&&MS.chat)chSay(M,MS.chat.users.find(u=>u.per==='vet')||MS.chat.users[0],'kom_talk',{},true);}catch(e){}};
 const _fh=forumHtml;forumHtml=function(M){const k=S.kom;if(k&&k.leak&&k.leak.s===S.season&&S.round-k.leak.r<=2&&!M.fix){const o=FORUM.scandal;FORUM.scandal=FORUM.kom;const s0=S.scandal;S.scandal={s:S.season};const h=_fh(M);FORUM.scandal=o;S.scandal=s0;return h;}return _fh(M);};
 const _hc=v4HomeCards;v4HomeCards=function(){let h='';try{h=komHomeCard();}catch(e){}return h+_hc();};
 const _ca=chAfter;chAfter=function(M){const c=chS();const d0=c.doors,s0=c.sec;_ca(M);try{if((c.doors>d0||c.sec>s0)){komS().fan={s:S.season,r:S.round,until:S.round+3,doors:c.doors,sec:c.sec,opp:S.clubs[M.sides[1-userSide(M)].cid].n};}}catch(e){}};
})();

(function(){const _vi=v4init;v4init=function(){_vi.apply(this,arguments);try{const fx=t=>typeof t==='string'?t.replace(/^Majitel .+? odvolal trenéra (.+?)\. /,(m,n)=>`Odvolal jsi trenéra ${czGen(n)}. `):t;
 (S.news||[]).forEach(n=>n.t=fx(n.t));if(S.own&&S.own.news)S.own.news.forEach(n=>n.t=fx(n.t));if(typeof S.boardTrust==='number')S.boardTrust=Math.round(S.boardTrust*10)/10;}catch(e){console.warn(e);}};})();

// ===== v9: neomezený rozpočet, tresty pro majitele, zákaz vedení = sledování z tribuny =====
const INF_R=1e11;
function infOn(){return typeof S!=='undefined'&&S?!!S.inf:!!(typeof UI!=='undefined'&&UI.start&&UI.start.inf);}
function infTop(){if(!S||!S.inf||!S.clubId)return;const me=myClub();if(!me)return;if(!(me.money>=INF_R))me.money=INF_R;if(!(S.wallet>=INF_R))S.wallet=INF_R;}
function infSet(on){if(!S)return;const me=myClub();if(on&&!S.inf){S.infSave={money:Math.min(me.money,INF_R/10),wallet:Math.min(S.wallet||0,INF_R/10)};S.inf=1;infTop();addNews('♾️','Zapnul jsi neomezený rozpočet. Peníze ti nikdy nedojdou.');}
 else if(!on&&S.inf){const sv=S.infSave||{money:Math.min(me.money,5e7),wallet:Math.min(S.wallet,1e6)};S.inf=0;me.money=sv.money;S.wallet=sv.wallet;S.infSave=null;addNews('💶','Vypnul jsi neomezený rozpočet. Vrací se finance z doby, kdy jsi ho zapnul.');}
 saveGame();render();}
function infCard(){return `<div class="card"><h3>♾️ Neomezený rozpočet</h3><div class="small mut" style="margin-bottom:8px">Klubu ani tobě nikdy nedojdou peníze: přestupy, platy, stadion, sázky, úplatky i koupě klubů. Dluhy, licence a finanční fair play se neřeší.</div><button class="btn ${S.inf?'gold':'ghost'} w100" onclick="infSet(${S.inf?0:1})">${S.inf?'Zapnuto · vypnout':'Vypnuto · zapnout'}</button></div>`;}
function startInf(){const n=$('#mgr');if(n)UI.start.name=(n.value||'').trim();UI.start.inf=!UI.start.inf;render();}
// ----- tresty majitele -----
function tbOn(){const f=S&&S.fix;return !!(f&&f.tb&&f.tb.s===S.season&&S.round<f.tb.r);}
function tbLeft(){return tbOn()?S.fix.tb.r-S.round:0;}
function tbMsg(){toast(`Máš zákaz přestupů a jednání ještě ${tbLeft()} ${czPlural(tbLeft(),'týden','týdny','týdnů')}.`);}
(function(){
 const _fm=fmtMoney;fmtMoney=function(v){if(infOn()&&Math.abs(finite(v))>=1e10)return '∞';return _fm(v);};
 const _mo=money;money=function(){const r=_mo.apply(this,arguments);infTop();return r;};
 const _rd=render;render=function(){try{infTop();}catch(e){}return _rd.apply(this,arguments);};
 const _cp=clubPrice;clubPrice=function(id){if(S&&S.inf&&id===S.clubId){const c=S.clubs[id];const m=c.money;c.money=S.infSave?S.infSave.money:0;try{return _cp(id);}finally{c.money=m;}}return _cp(id);};
 const _tl=ownTbLeft;ownTbLeft=function(){if(S&&S.inf)return Infinity;return _tl();};
 const _ng=newGame;newGame=async function(opts){const inf=!!(UI.start&&UI.start.inf);const r=await _ng.apply(this,arguments);if(inf&&S){const me=myClub();S.infSave={money:me.money,wallet:S.own?Math.max(0,Math.round(((UI.start.fort||OWN_FORT[1][0])-(opts&&opts.price||0)*(1-(opts.inv||0)-(opts.loan||0)))/1e4)*1e4):S.wallet};S.inf=1;infTop();if(S.own)S.own.tb=INF_R;saveGame();}return r;};
 if(typeof ownStartConfirm==='function'){const _os=ownStartConfirm;ownStartConfirm=function(code,ci){const st=UI.start;if(st&&st.inf){const f0=st.fort;st.fort=INF_R;try{return _os(code,ci);}finally{st.fort=f0;}}return _os(code,ci);};}
 const _rs=renderStart;renderStart=function(){let h=_rs.apply(this,arguments);const st=UI.start;if(st&&st.step===0){const on=!!st.inf;h=h.replace('<div style="height:12px"></div><button class="btn big" id="st1">',`<div class="small mut" style="margin:12px 0 6px">Rozpočet</div><button class="btn ${on?'gold':'ghost'} w100" onclick="startInf()">♾️ Neomezený rozpočet: ${on?'zapnuto':'vypnuto'}</button><div class="tiny mut" style="margin-top:6px">${on?'Peníze ti nikdy nedojdou. Dá se vypnout v nastavení.':'Běžná hra, s penězi musíš hospodařit.'}</div><div style="height:12px"></div><button class="btn big" id="st1">`);}return h;};
 const _rc=renderClub;renderClub=function(){const h=_rc.apply(this,arguments);if((UI.clubTab||'fin')==='set')return h.replace('<div class="card"><h3>⚙️ Nastavení a uložení',infCard()+'<div class="card"><h3>⚙️ Nastavení a uložení');return h;};
 // vlastník: licence a fair play se v neomezeném režimu neřeší
 const _se=ownSeasonEnd;ownSeasonEnd=function(){if(S&&S.inf&&S.own){const o=S.own;const f=S.finSeason;const i0=f.inc,e0=f.exp;f.inc=Math.max(f.inc||0,f.exp||0);const r=_se.apply(this,arguments);f.inc=i0;f.exp=e0;o.ffp=0;o.lic='ok';o.licDed=null;if(o.tban===S.season+1)o.tban=null;return r;}return _se.apply(this,arguments);};
 // zákaz přestupů a jednání
 const TBW=f=>function(){if(tbOn()){tbMsg();return;}return f.apply(this,arguments);};bidSheet=TBW(bidSheet);makeBid=TBW(makeBid);ctrSheet=TBW(ctrSheet);ctrOffer=TBW(ctrOffer);payClause=TBW(payClause);loanIn=TBW(loanIn);acceptOffer=TBW(acceptOffer);
 // zákaz lóže
 const _bs=boxSheet;boxSheet=function(){const f=S.fix;if(f&&f.box>0){toast(`Máš zákaz vstupu do lóže ještě ${f.box} ${czPlural(f.box,'zápas','zápasy','zápasů')}. Sleduješ z tribuny.`);return;}return _bs();};
 // zákaz vedení: sledovat z tribuny bez ovládání
 const _ul=updLive;updLive=function(full){_ul(full);try{if(MS&&MS.ban&&!MS.M.ended){const ft=document.getElementById('mvfoot');if(ft)ft.querySelectorAll('button').forEach(b=>{const oc=b.getAttribute('onclick')||'';if(/^(subSheet|liveTac|boxSheet)\(/.test(oc))b.remove();});}else if(MS&&!MS.M.ended&&S.fix&&S.fix.box>0&&ownOnly()){const ft=document.getElementById('mvfoot');if(ft)ft.querySelectorAll('button').forEach(b=>{if((b.getAttribute('onclick')||'')==='boxSheet()'){b.textContent='🏟️ Tribuna';}});}}catch(e){}};
 const _ss=subSheet;subSheet=function(){if(MS&&MS.ban){toast('Máš zákaz vedení týmu, střídá asistent.');return;}return _ss.apply(this,arguments);};
 const _lt=liveTac;liveTac=function(){if(MS&&MS.ban){toast('Máš zákaz vedení týmu, taktiku řídí asistent.');return;}return _lt.apply(this,arguments);};
 const _ht=htTalk;htTalk=function(M){if(MS&&MS.ban&&M&&!M._ht2)return coHalfTime(M);return _ht(M);};
 const _sm=stepMinute;stepMinute=function(M){const out=_sm(M);try{if(MS&&MS.ban&&MS.M===M&&!M.ended&&!ownOnly()){const post=[];coStep(M,post);post.forEach(e=>M.ev.push(e));return out.concat(post);}}catch(e){}return out;};
 // migrace: starý zákaz vedení u majitele převést na tresty majitele
 const _vi=v4init;v4init=function(){_vi.apply(this,arguments);try{const f=S.fix;if(f&&f.ban>0&&ownOnly()){const n=f.ban;f.box=Math.max(f.box||0,n+1);f.tb={s:S.season,r:S.round+2*n+2};f.ban=0;addNews('⚖️',`Komise upravila trest: jako majitel nemáš zákaz vedení týmu, ale zákaz vstupu do lóže na ${n+1} ${czPlural(n+1,'zápas','zápasy','zápasů')} a zákaz přestupů na ${2*n+2} ${czPlural(2*n+2,'týden','týdny','týdnů')}.`);}if(S.inf)infTop();}catch(e){console.warn(e);}};
 // karty na přehledu
 const _hc=v4HomeCards;v4HomeCards=function(){let h='';try{const f=S.fix;if(f&&f.box>0)h+=`<div class="card" style="padding:10px 12px"><div class="small">🏟️ <b>Zákaz vstupu do lóže:</b> ještě ${f.box} ${czPlural(f.box,'zápas','zápasy','zápasů')}. Zápasy sleduješ z tribuny, na trenéra křičet nemůžeš.</div></div>`;if(tbOn())h+=`<div class="card" style="padding:10px 12px"><div class="small">🚫 <b>Zákaz přestupů a jednání:</b> ještě ${tbLeft()} ${czPlural(tbLeft(),'týden','týdny','týdnů')}.</div></div>`;}catch(e){}return h+_hc();};
})();

// ===== v10: méně opakování v chatech, hádky sázkařů, editor hráčů =====
// --- obecný výběr bez opakování ---
function vHist(k){S.vRec=S.vRec||{};const h=S.vRec[k]||(S.vRec[k]=[]);return h;}
function vKey(x){if(typeof x!=='string'||x.length<10)return x;let h=0;for(let i=0;i<x.length;i++)h=(h*31+x.charCodeAt(i))|0;return '#'+(h>>>0).toString(36);}
function vPick(arr,k,n){if(!arr||!arr.length)return '';const h=vHist(k);const N=Math.min(n||14,Math.max(0,arr.length-1));const rec=h.slice(-N);let fr=arr.filter(x=>{const q=vKey(x);return !rec.includes(q)&&!rec.includes(x);});if(!fr.length)fr=arr;const t=pick(fr);h.push(vKey(t));const cap=Math.max(N+2,8);if(h.length>cap)h.splice(0,h.length-cap);return t;}
function vAddr(){return isOwn()?'šéfe':'trenére';}
function vAddrP(){return isOwn()?'pane majiteli':'pane trenére';}
function vEsc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
// skupiny: t = původní šablony (jak je píše starý kód), v = varianty; {P} cena, {I} věci, {G} cíl, {A} oslovení, {AP} oslovení s "pane"
function vMkRe(t){const keys=[];const re=new RegExp('^'+vEsc(t).replace(/\\\{(\w+)\\\}/g,(_,k)=>{keys.push(k);return '(.+?)';})+'$');return {re,keys};}
function vRewrite(groups,t,hk,ctx){for(const g of groups){if(!g._r)g._r=g.t.map(vMkRe);for(const r of g._r){const m=t.match(r.re);if(!m)continue;const d=Object.assign({A:vAddr(),AC:isOwn()?"Šéfe":"Trenére",AP:vAddrP()},ctx||{});r.keys.forEach((k,i)=>d[k]=m[i+1]);
   let pool=g.no?g.v.slice():g.v.concat(g.t);if(g.per&&ctx&&ctx.per&&g.per[ctx.per])pool=pool.concat(g.per[ctx.per],g.per[ctx.per]);
   pool=pool.filter(x=>(x.match(/\{(\w+)\}/g)||[]).every(z=>d[z.slice(1,-1)]!=null));if(!pool.length)return t;
   const x=vPick(pool,hk,12);return x.replace(/\{(\w+)\}/g,(_,k)=>d[k]);}}return t;}

// --- rozhodčí ---
const V_RF=[
 {t:['Kafe si dám rád. A o čem přesně byste chtěl mluvit? Ať se zbytečně nezdržujeme.','Pro vás si čas udělám. Co potřebujete?','Mluvit se dá o všem. Jde jen o to, kolik to komu stojí.','Hm. Zajímavé. Povídejte, ale levné to nebude.','Opatrně, telefony mají uši. Co přesně myslíte?','Já nic neslyšel… ale klidně pokračujte. Potichu.'],v:[],
  per:{cor:['Kafe? Klidně dvě. Tak co máte na srdci?','Vy jste mi chyběl. O co jde tentokrát?','Sedněte si. Já mám čas, když jde o rozumnou věc.','No konečně někdo, kdo ví, jak to chodí. Poslouchám.','Zítra pískám já, takže to dává smysl. Povídejte.','Ruku vám nepodám, kamery. Ale poslouchám.','S vámi se vždycky dobře povídá. Co by to mělo být?','Hm, kavárna za rohem nemá kamery. Tak spusťte.'],
   gre:['Za poslouchání neplatíte. Za zbytek ano. Tak co?','Povídejte. Ale počítejte, že já počítám.','Zadarmo ani kuře nehrabe, {A}. Co chcete?','Rád pomůžu. Za rozumný obnos, samozřejmě.','Já jsem otevřený všemu, co se vyplatí. Mluvte.','Čas jsou peníze. Moje obzvlášť. Co to bude?','Hm, zajímá mě jediná věc. Kolik.','Tak sem s tím. A rovnou mi řekněte, jak moc to pro vás znamená.'],
   cau:['Tady ne. Napište mi to krátce a pak to smažte.','Hlavně potichu. Víte, kolik kolegů teď vyšetřují?','Mám strach, ale poslouchám. Co přesně?','Jestli je to něco velkého, tak ne. Jestli malého… uvidíme.','Telefon nechte v autě. A teď povídejte.','Nikdo nás nesmí vidět. O co jde?','No… jen opatrně. Svaz má oči všude.','Rychle, za chvíli tu bude delegát.']}},
 {t:['Pane trenére, tohle jsme si snad neřekli. Uvidíme se na hřišti.','Na tohle vám nemám co říct. A doporučuju vám už nic dalšího neříkat.'],
  v:['{AP}, tohle jste radši neměl psát. Uvidíme se na hřišti.','S tímhle za mnou nechoďte. Pískám podle pravidel a hotovo.','Dělám tu práci dvacet let a nikdy jsem nic nevzal. Nezačnu u vás.','Tohle nechci slyšet. Ani teď, ani nikdy.','Jestli máte námitky k mému výkonu, pište na svaz. Oficiálně.','Zapomenu, že jste to napsal. Jednou. Podruhé ne.','Ne. A vážně vám radím, abyste přestal.','Hrajte fotbal a nechte rozhodování na mně.']},
 {t:['Tohle jsem si nahrál. Zprávu posílám rovnou na svaz.'],v:['Mám to celé uložené. Svaz to dostane ještě dnes.','Screenshot je hotový. Komise už ví, s kým má tu čest.','Tohle jde přímo delegátovi. Hezký den.','Nahlásil jsem to. Takhle se fotbal dělat nebude.','Zprávu jsem právě odeslal na svaz. Vysvětlujte to jim.']},
 {t:['Ne, ne. Je toho na mě moc, svaz teď sleduje každého. Nechte mě být.'],v:['Ne, tohle je na mě moc ostré. Mám rodinu.','Takhle přímo? Zbláznil jste se? Končím.','Obálka? Tady? Ne, ne, ne. Nechte mě být.','Tohle ne. Kolega kvůli tomu letos skončil. Sbohem.','Na tohle nemám nervy. Zapomeňte, že jste mě znal.']},
 {t:['Za tohle chci {P}. A nesmlouvejte moc.','Dobře, ale je to riskantní. {P} a ani o korunu míň.','To vás bude stát {P}. Kvalita něco stojí.'],
  v:['Udělám to za {P}. Rozumná cena za klidný spánek.','{P}. A rychle, než si to rozmyslím.','Řekněme {P}. Za to dostanete přesně, co chcete.','Moje cena je {P}. Smlouvat můžete, ale nevyplatí se to.','Za {P} se to dá zařídit.','{P} v obálce a jsme domluvení.','Tohle je práce za {P}. Levněji to nikdo neudělá.','Dobře. {P}, hotově, žádné převody.'],
  per:{cau:['Je to riziko… {P}. Míň nejde, fakt ne.','Kdyby to prasklo, končím. Proto {P}.','{P}, a pak se týden neozývejte.'],gre:['{P}. Kvalita se platí, {A}.','Za {P} vám to udělám s úsměvem.','Hm, {P}. A to vám dávám slevu.'],cor:['Pro vás {P}. Známe se, ne?','{P} a máte to v suchu.','Za {P} to bude vypadat úplně přirozeně.']}},
 {t:['Domluveno. Na hřišti uvidíte.','Platí. A nikomu ani slovo.','Beru. Zítra to bude zajímavý zápas.'],
  v:['Ruku na to. Teda… obrazně.','Dobře. Hlavně se pak netvařte nápadně.','Platí. A tenhle chat smažte.','Domluveno. Vy hrajte, já se postarám o zbytek.','Výborně. Uvidíte, že se to vyplatí.','Beru. A po zápase se neznáme.','Hotovo. Píšťalku mám naladěnou.','Tak jo. Zítra to bude vypadat jako normální zápas.','Dohodnuto. Delegát nic nepozná.','Fajn. Na vaší straně budu, jak jen to půjde.']},
 {t:['Tohle je málo. Řekněme {P}.','Za tohle riskuju kariéru. {P}, poslední slovo… skoro.','Hm, přidejte trochu. {P} a jsme domluvení.'],
  v:['Tak to ne. {P} a ani o korunu míň.','Málo, {A}. Co takhle {P}?','Ještě kousek. {P} a můžeme si podat ruce.','Myslíte, že pískám za drobné? {P}.','Pod {P} nejdu. Mám taky nějakou hrdost.','Zkuste to znovu. {P}.','Blíží se to. Ale {P} je moje cena.','S tímhle mě nenalákáte. Řekněme {P}.','Já mám hypotéku, {A}. {P}.']},
 {t:['Urážíte mě. Za tohle ani nevstanu z gauče.','To myslíte vážně? S takovou nabídkou za mnou nechoďte.'],
  v:['Za tohle si ani nezavážu tkaničky.','To je spropitné, ne nabídka.','Děláte si legraci? Tolik mám v peněžence na oběd.','Za tolik pískám jen okresní přebor. A to ještě nerad.','Tohle si nechte na pivo.','Hm. Myslel jsem, že mluvím s profesionálem.']},
 {t:['Ještě jedna věc, trenére. Riziko je větší, než jsem čekal. Chci o {P} víc, jinak z toho nic nebude.'],
  v:['Ještě jedna věc, {A}. Delegát bude nový a přísný. O {P} víc, jinak nic.','Zjistil jsem, že na zápas dorazí kamery navíc. Chci přidat {P}.','Kolega z VAR chce taky svůj díl. {P} navíc.','Situace se změnila, {A}. Bez {P} navíc to neudělám.','Svaz teď sleduje i mě. Přidejte {P}, nebo z toho sejde.','Promiňte, ale tohle je dražší, než jsem myslel. Ještě {P}.']},
 {t:['Tak nic. Uvidíme se na hřišti a nic jsme si neřekli.'],v:['Jak chcete. Nic se nestalo, nic jsme si nepsali.','Dobře. Tenhle rozhovor nikdy neproběhl.','Škoda. Tak zítra na hřišti, jako by nic.','Tak se mějte. A smažte si to.','Fajn, končíme. Ani slovo nikomu.','Nevadí. Pískám, jak pískám.']},
 {t:['Tolik věcí najednou? To by bylo moc nápadné. Vyberte míň, nebo nic.'],v:['Všechno najednou? To by poznal i slepý delegát. Míň.','Tohle by bylo vidět až na tribuně. Vyberte jen něco.','Zbláznil jste se? Tohle by šlo hned na svaz. Míň věcí.','Moc toho chcete. Jedna, dvě věci, víc ne.']},
 {t:['No dobře… tak za původní cenu. Ale jste lakomec.'],v:['Tak dobře, za domluvenou cenu. Ale příště ne.','No jo, platí to původní. Škrt jeden.','Hm. Dobře, udělám to za původně dohodnutou cenu. Ale jste lakomec.','Tak teda bez přídavku. Ale nadšený nejsem.']},
 // vlastní repliky (nemění, co hráč zvolil)
 {t:['Dobře, {P}. Platí.'],v:['Beru, {P}. Platí.','Ok, {P}. Dohodnuto.','{P} je v pořádku. Ruku na to.']},
 {t:['Dám vám {P}.'],v:['Můžu nabídnout {P}.','Co takhle {P}?','Mám pro vás {P}.','{P} a ani o korunu víc.']},
 {t:['Dobře, přidám {P}.'],v:['Tak jo, přidám {P}.','Dobře, dalších {P}. Ale už nic víc.','Přidávám {P}. Ať to stojí za to.']},
 {t:['Domluvili jsme se jinak. Ani korunu navíc.'],v:['Dohoda byla jasná. Nepřidám.','Na tohle nepřistoupím. Původní cena.','Ne. Domluvili jsme se a basta.']},
 {t:['Potřeboval bych: {I}.'],no:1,v:['Moje přání: {I}.','Šlo by zařídit tohle: {I}?','Co potřebuju: {I}.','Mám jednoduchý seznam: {I}.']},
 {t:['Víte co, zapomeňte na to.'],v:['Nechme to být. Zapomeňte na to.','Víte co, radši ne.','Tak nic, rozmyslel jsem si to.']}
];
(function(){const _rs=rfSay;rfSay=function(w,t){try{const per=UI.rc&&UI.rc.ref?UI.rc.ref.per:null;t=vRewrite(V_RF,String(t),'rf_'+w,{per});}catch(e){}return _rs(w,t);};})();

// --- komise ---
const V_KOM=[
 {t:['Tohle jste mi neměl psát. Nechám to zapsat do spisu.'],v:['Tohle si přečte celá komise. Do spisu s tím.','Myslíte, že jsem úplatný? Zapisuji si to.','Tohle už je další přestupek. Zapsáno.','Ne. A ten pokus o kontakt přidávám k vašemu případu.','To jste přehnal. O tomhle se dozví předseda.','Neslušné a hloupé. Jde to do spisu.']},
 {t:['Oběd? Proč ne. O čem si budeme povídat?','Všechno se dá vyřešit, když se chce.','Vyřešit se dá leccos. Otázka je, za kolik.','Hm. Mluvte, ale levné to nebude.','Opatrně, prosím. Co přesně máte na mysli?','Tohle nikdo neslyšel… ale pokračujte.'],v:[],
  per:{cor:['Oběd mám rád. A ještě radši rozumné lidi.','Spis je tlustý, ale stránky se dají ztratit. Povídejte.','Komise je jen parta lidí. A lidi se dají přesvědčit.','Dobře, že jste se ozval. Co pro vás můžu udělat?','Váš případ znám. Dá se s ním pracovat.','Sejdeme se v klidu. Co byste potřeboval?'],
   gre:['Za sníženou pokutu chci něco i já. Mluvte.','Pomůžu. Ale moje pomoc není levná.','Ve spisu jsou nepříjemné věci. Kolik vám stojí, aby tam nebyly?','Mám tři děti a chatu. Povídejte.','Tak co nabízíte? Ať nemarníme čas.','Hm, čtu váš spis. Bude to dražší.'],
   cau:['Píšete mi z vlastního telefonu? Šílenství. Rychle.','Ne tady. Nebo dobře… ale krátce.','Kdyby se to provalilo, letím já i vy. Co chcete?','Hlavně žádné převody. Co přesně?','Mám strach, ale poslouchám.','Šeptem, prosím. Kolegové tu chodí kolem.']}},
 {t:['To by šlo zařídit. {P} a nikdo se nic nedozví.'],v:['Dá se to udělat. Za {P}.','Za {P} se spis ztratí… aspoň trochu.','Řekněme {P} a uvidíte, jak jsme shovívaví.','{P}. Komise je pak velmi chápavá.','Moje cena je {P}. A smažte tuhle konverzaci.','{P} a verdikt bude příjemnější, než čekáte.','Za {P} se dá na leccos zapomenout.']},
 {t:['Málo. Řekněme {P}.','Riskuju místo. {P}.'],v:['Tohle nestačí. {P}.','Hm, přidejte. {P}.','Kolegové chtějí taky svůj díl. {P}.','Pod {P} to nejde.','Za tohle riskuju funkci. {P}.','Ještě kousek. {P} a dohodneme se.']},
 {t:['To je skoro urážka.'],v:['Tohle je spíš urážka než nabídka.','S tímhle za mnou nechoďte.','Za to si u nás ani nevyzvednete razítko.','Vtipné. Další návrh?','To snad nemyslíte vážně.']},
 {t:['Tak to se nedohodneme. Uvidíme se při jednání.'],v:['Pak se uvidíme u jednání. A přísně.','Tak nic. Komise rozhodne podle spisu.','Škoda. Na jednání vám to nepomůže.','Dobře. Ať rozhodnou paragrafy.']},
 {t:['Konec rozhovoru.'],v:['Tím končím.','Nemám vám co dalšího říct.','Sbohem.','Na tohle už nebudu odpovídat.']},
 {t:['Dobrá. Nechte to na mně.'],v:['Dohodnuto. Spis se trochu ztenčí.','Výborně. Uvidíte, že komise bude mírná.','Platí. A nikde to neříkejte.','Dobře. Na jednání se zatvařte zkroušeně.','Beru. Zbytek zařídím.','Domluveno. Ani slovo, ani zpráva.']},
 {t:['Jak myslíte.'],v:['Vaše volba.','Dobře. Uvidíme se na jednání.','Fajn. Spis zůstává, jak je.','Jak chcete. Já nic nevím.']},
 {t:['Zapomeňte na to.'],v:['Nechme to být.','Radši ne, zapomeňte na to.','Tak nic, díky.']},
 {t:['Dobře, {P}.'],v:['Beru, {P}.','Platí, {P}.','{P} je v pořádku.']},
 {t:['Dám vám {P}.'],v:['Můžu dát {P}.','Co takhle {P}?','Nabízím {P}.']}
];
(function(){const _ks=komSay;komSay=function(w,t){try{let per=null;try{per=UI.kc&&UI.kc.mem?UI.kc.mem.per:null;}catch(e){}t=vRewrite(V_KOM,String(t),'kom_'+w,{per});}catch(e){}return _ks(w,t);};})();

// --- mafie / novinky ---
const V_NEWS=[
 {t:['Telefonát z neznámého čísla: „Dohoda je dohoda, trenére. Za zrušení se platí.“'],v:['Telefonát z neznámého čísla: „Dohoda je dohoda, {A}. Za zrušení se platí.“','SMS bez podpisu: „Couvnout se nedá. Zaplatíš.“','Do schránky ti někdo hodil obálku s fotkou tvého auta a vzkazem: „Dohoda platí.“','Telefonát po půlnoci: „Myslel sis, že nám jen tak utečeš? Za zrušení se platí.“']},
 {t:['Výhrůžný telefonát: „Trenére, dohodli jsme se jinak. Do příštího zápasu chceme {P}.“'],v:['Výhrůžný telefonát: „{AC}, dohodli jsme se jinak. Do příštího zápasu chceme {P}.“','SMS z neznámého čísla: „Zápas nedopadl, jak měl. Vrať {P}, jinak to bude bolet.“','Před stadionem tě zastavili dva chlapi: „Do dalšího kola {P}. Žádné výmluvy.“','Hlas v telefonu: „Prohrál jsi nám peníze. {P} do příštího zápasu.“']},
 {t:['Někdo ti v noci podpálil auto. Škoda {P} z osobního konta. Vzkaz za stěračem: „Dluh trvá.“'],v:['V noci ti někdo zapálil auto. Škoda {P} z osobního konta. Na plotě visel vzkaz: „Dluh trvá.“','Někdo ti rozbil okna v domě. Oprava za {P} jde z osobního konta. Vzkaz: „Pořád dlužíš.“','Ráno jsi našel auto bez kol a s rozbitým sklem. Škoda {P}. Na sedadle lísteček: „Dluh trvá.“']},
 {t:['Před tréninkem postávali neznámí muži a hráčům vyhrožovali. Nálada v kabině je pod psa.'],v:['U tréninkového hřiště postávali neznámí muži a hráčům vyhrožovali. V kabině je dusno.','Hráčům někdo v noci volal a vyhrožoval. Tým je nervózní.','Na parkovišti někdo propíchal hráčům pneumatiky. V kabině panuje strach.']},
 {t:['Novináři dostali anonymní tip na trenéra, který „spolupracuje se sázkaři“. Začíná se o tom mluvit.'],v:['Bulvár dostal anonymní tip, že klub „spolupracuje se sázkaři“. Lidi si začínají šuškat.','Na sociálních sítích koluje anonymní příspěvek o „dohodách se sázkaři“. Novináři čmuchají.','Redakce sportovního deníku prý má zprávu od „dobře informovaného zdroje“. Začíná se o tom mluvit.']},
 {t:['Dluh u sázkařské mafie je splacený. Snad už dají pokoj.'],v:['Dluh u mafie je splacený. Telefon snad konečně zmlkne.','Zaplaceno do koruny. Snad už je s mafií konec.']},
 {t:['Mafie po čase přestala volat. Prý našla jiného trenéra.'],v:['Mafie po čase přestala volat. Prý našla jiný klub.','Telefony z neznámých čísel utichly. Zdá se, že mafie má jiné starosti.']}
];
(function(){const _an=addNews;addNews=function(ic,t){try{if(typeof t==='string'&&(t.indexOf('„')>=0||/neznámí muži|Mafie po čase|sázkařské mafie/.test(t)))t=vRewrite(V_NEWS,t,'news',{});}catch(e){}return _an.apply(this,[ic,t].concat([].slice.call(arguments,2)));};})();

// --- chat sázkařů: víc hlášek ---
const CH_ADD={
 start:['Dneska to cítím, {tip} za {odds}. Nevěřte mi.','Tiket podán, {stake} na {tip}. Jdeme na to.','Sedím u streamu, pivo v ruce, {tip}. Ať to stojí za to.','Kdo jede {h}? Kdo {a}? Ozvěte se, ať vím, s kým se budu hádat.','{stake} na {tip}. Jestli to nevyjde, prodávám kolo.','Zase sázím za poslední peníze. {tip}, kurz {odds}.'],
 start_fan:['{c} do toho! Vsadil jsem {stake} a srdce k tomu.','Za {c} dýchám, za {c} sázím. {stake}.','Jestli dneska {c} nevyhraje, jdu kopat sám.'],
 start_troll:['Vsadil jsem na {tip}, jen abych vás mohl potom zesměšňovat.','Pánové, připravte si kapesníčky.'],
 start_pes:['{tip}. Stejně to zase posrou, znám je.','Dneska prohraju, cítím to v kostech. {tip}.'],
 goal_good:['GÓÓÓL! {p}! Do prdele, to je krása!','{p}, ty jsi bůh! Tiket žije!','Kurva, to byl gól! {tm} jede!','No konečně! Já věděl, že {p} to tam dá!','Ano! Ano! ANO! {score}!','To je ono! Tohle jsem chtěl vidět!','{p} tě miluju! Hned ti posílám pusu.','Hahaha, tak kdo se tady smál? {score}!','Takhle se to dělá! {tm} do toho!','Gól! Už jen ať to dotáhnou.'],
 goal_bad:['Do prdele! Kdo tam pustil {p}?!','Kurva, to snad ne. Obrana jak ze sýra.','To je hovado, ten náš stoper. Spí!','{p}… kéž bys zakopl o vlastní tkaničku.','Ne, ne, ne. Tohle je vražda tiketu.','Tak to je konec. Gólman z okresu.','Do háje s tím! {score}, to nemyslí vážně.','Kdo to trénuje?! Bránit neumí nikdo!','Sbohem, {stake}. Bylo mi s tebou dobře.','To je hanba! Ani si to nezaslouží!','Ten gól má na svědomí náš trenér, ne {p}.','Mám chuť hodit ovladač do televize.'],
 goal_neu:['Gól! {p} za {tm}. Mně je to fuk, ale pěkný.','{score}. Zápas se rozjíždí.','Tak tohle je fotbal, ne nuda.','{p} se trefil. Dobrý.'],
 lategoal_good:['V {min}. minutě! Kurva, já brečím!','Takhle pozdě?! To je nejlepší den mýho života!','{p} v závěru! Tiket jde do pokladny!','Na poslední chvíli! Mám infarkt, ale šťastnej!'],
 lategoal_bad:['V {min}. minutě?! Do prdele, to je zlodějna!','Tohle mě zabije. Takhle pozdě?!','Ne, to snad ne… {p} v závěru. Jdu spát.','Kurva, zase na konci. Pokaždý!'],
 miss_good:['Hahaha, {p} by netrefil ani vrata od stodoly.','Vedle! Díky, {p}.','Uff. Tohle mohl být průšvih.'],
 miss_bad:['{p}, ty dřevo! To musí být gól!','Do prdele, odtamtud dá gól i moje babička!','Jak to proboha nedal?!','Tohle je hovado, ne útočník.'],
 save_good:['{k}, ty jsi zeď!','Chytá jak drak! Díky, {k}.','Bůh v bráně, {k}!'],
 save_bad:['Kurva, {k} chytá i to, co se chytit nedá.','Ten gólman má magnet v rukavicích.','Proč zrovna dneska musí {k} chytat jak Buffon?'],
 post_good:['Tyčka! Fotbalový bůh je s námi.','Tyč! Díky, díky, díky.'],
 post_bad:['Tyčka, do prdele! Centimetr!','Zase tyč! Já tenhle sport nesnáším.'],
 red_good:['Červená! Konečně, ten řezník měl jít ven dávno.','Sbohem, {p}! Teď je to naše.','Výborně, hrajou o deseti!'],
 red_bad:['Červená?! Rozhodčí je zloděj!','To je skandál, kolik mu dali?!','{p}, ty idiote, co to děláš?!','Sudí je kupenej, to vidí každej.'],
 yel:['Žlutá pro {p}. Ať se trochu krotí.','{p} má žlutou. Další faul a jde.','Sudí rozdává karty jak na pokeru.'],
 sub:['{pin} za {pout}? Trenér je génius, nebo idiot. Uvidíme.','Konečně střídá. {pout} byl dneska tragický.','{pin} jde na hřiště. Ať něco předvede.','Střídat {pout}? Vždyť byl jediný, kdo hrál!'],
 ht_good:['Poločas a jsem v klidu. Zatím.','Přestávka. Jdu pro pivo, zatím to sedí.','Takhle ať to dohrajou.'],
 ht_bad:['Poločas. Kurva, tohle se musí zlepšit.','Kdyby měl trenér koule, střídá tři hráče.','Takhle ne, pánové. Takhle fakt ne.','Ve druhém poločase chci vidět fotbal, ne procházku.'],
 ht_neu:['Poločas. Nic moc, ale nic není ztraceno.','Přestávka, {score}. Zatím šedivé.','Dvacet minut nudy a pak dva náznaky. Hezký.'],
 late_good:['Ještě pár minut, vydržte! Prosím!','Už jen ať nikdo nic neposere.','Zavřete to tam, kurva, ať je klid!'],
 late_bad:['Potřebuju zázrak. Nebo dva.','Už nevěřím. Ale kouká se dál.','Dejte aspoň jeden, vy lemry!'],
 odds:['Kurz na domácí je teď {lh}. Někdo něco ví?','Kurzy lítají jak blázen: {lh} – {lx} – {la}.','Ty kurzy mi dělají vrásky. {lo} na můj tip.','Bookmakeři se zbláznili. {lh}/{lx}/{la}.'],
 amb_good:['Jde to podle plánu. Já to říkal.','Kdo nevěřil, ať se teď stydí.','Tenhle tiket mi zaplatí dovolenou.','Klid, kluci, to je moje.'],
 amb_bad:['Proč já vždycky vsadím na ty lemry?','Mám pocit, že hrajou proti mně osobně.','Tohle už nevydržím. Kdo mi půjčí na další tiket?','Hrajou jak důchodci na procházce.','To je fotbal pro slepé.','Kurva, ať se aspoň snaží.'],
 amb_neu:['Zatím nic, ale bude to.','Nuda. Probuďte se tam!','Hraje se, ale bez šancí.','Čekám na něco pořádného.','Tak co, kluci, kdo věří svýmu tipu?'],
 amb_fan:['Pojďte, {c}! Jedeme!','{c} je jediná láska, kurva!','Celej stadion řve a my tu sedíme u telefonu.'],
 amb_troll:['Vy se tu hádáte a já jen žeru popcorn.','Za pět minut tu někdo bude brečet. Sázím na to.','Kdo tady prohraje nejvíc? Tipuju tebe.'],
 amb_pes:['Stejně to skončí špatně. Jako vždycky.','Nedělejte si naděje, prosím vás.'],
 amb_stat:['Podle xG {xg} by to mělo vypadat jinak.','Střely {sh}. Čísla neodpovídají skóre.'],
 amb_vet:['Za mých časů se hrálo ostřeji.','Tohle už jsem viděl stokrát. Klid.'],
 amb_opt:['Věřím, kluci! Bude to dobré!','Pohoda, ještě je času dost.'],
 amb_nov:['Je normální, že se tak nervuju?','Ještě se v tom učím. Proč se tu všichni hádají?'],
 ft_good:['Konec! Peníze doma! Kdo chce pivo?','Ha! Kdo se smál, ten teď pláče. {win} je moje!','Vyhrál jsem, kurva! Konečně!','Tak, a je to. Já to celou dobu říkal.','Výplata! Kluci, dneska platím.','Hotovo. Tiket zelený jak tráva.'],
 ft_bad:['Konec. Do prdele s tímhle sportem.','Zase jsem prodělal. Už nikdy nesázím. Do zítřka.','Hanba. Mrzí mě každá koruna.','Kurva, kurva, kurva. Nic jinýho říct nejde.','Tohle bylo naposled. Asi.','Smažu tuhle apku. Fakt.'],
 r_agree:['@{to} přesně! Konečně někdo normální.','@{to} souhlas, brácho.','@{to} jo, tohle sedí.','@{to} podepisuju.'],
 r_banter:['@{to} drž hubu, ještě se nehraje ani hodina.','@{to} ty tak víš houby.','@{to} to říká ten správnej.','@{to} počkej, až tě to semele.','@{to} ty fandíš i vlastní babičce, když prohrává.','@{to} jasně, a já jsem papež.'],
 r_troll:['@{to} hahaha, ty jsi to dneska zase vyhrál.','@{to} pláčeš už teď?','@{to} já tvůj tiket rovnou tisknu na zeď hanby.','@{to} a kolik ses vsadil? Ať se pobavím.'],
 r_vet:['@{to} chlapče, tohle jsem prožil stokrát.','@{to} klid, zápas má devadesát minut.','@{to} ještě se něco stane, uvidíš.'],
 r_nov:['@{to} neboj, časem se to naučíš. Prohrávat hlavně.','@{to} vítej v klubu, tady se pláče denně.'],
 r_pes:['@{to} neraduj se, ještě to otočí.','@{to} já bych to tak nehrotil.']
};
// hádky a navazující výměny
const CH_TH={
 mock:['@{to} tak co, pořád věříš na {ttip}? 😂','@{to} hahaha, kde je teď ta tvoje jistota?','@{to} brečíš? Já ti říkal, že {ttip} je blbost.','@{to} jdi si koupit kapesníky.','@{to} tvůj tiket právě umřel. Upřímnou soustrast.','@{to} a kdo tady říkal, že to je jistota?','@{to} to bolí, co? Za {stake} by sis koupil něco užitečnýho.','@{to} sbal si to, dneska tvůj den není.','@{to} jestli chceš, dám ti tip na příště. Zadarmo.','@{to} ty a tvoje „jistota“. Hahaha.'],
 angry:['@{to} drž hubu, ještě se hraje.','@{to} ty jsi taky kurva odborník, co?','@{to} počkej, až to otočí, pak si promluvíme.','@{to} běž do prdele, máš štěstí a nic víc.','@{to} tvůj tip je čistej hazard, ne fotbal.','@{to} ty se raduj, já se směju poslední.','@{to} ještě jedno slovo a…','@{to} vyhraj si tu svou almužnu a mlč.'],
 defend:['@{to} {tip} pořád dává smysl, xG mluví jasně.','@{to} jeden gól nic neznamená. Uvidíme na konci.','@{to} já si za svým tipem stojím. Klidně ještě přisadím.','@{to} pamatuj si to, až to otočí.','@{to} to byla náhoda, ne fotbal.'],
 ref:['@{to} to není tvoje zásluha, to je sudí. Zloděj!','@{to} jasně, když píská vaši stranu. Kupenej!','@{to} ten rozhodčí by měl dostat doživotí.','@{to} bez sudího bys teď plakal ty.'],
 coach:['@{to} kdyby náš trenér nebyl hovado, tak to tam máme.','@{to} za tohle může trenér, ne hráči.','@{to} s takovou sestavou bych prohrál i já.'],
 join_g:['@{to} haha, nech ho, ať si pobrečí.','@{to} přesně, já jsem to taky říkal.','Přidávám se. {to}, dneska tvůj den není.','@{to} kapesník ti nepošlu, ale soustrast jo.'],
 join_b:['@{to} nech ho, ještě není konec.','@{to} klid, taky jsem v mínusu.','Kluci, nehádejte se. Stejně to otočí.','@{to} jo, ten sudí je fakt divnej.'],
 calm:['Kluci, klid. Je to jen fotbal.','Uklidněte se, ještě se hraje.','Hádáte se jak u piva. Sledujte zápas.','Vy dva se sejděte po zápase a vyřiďte si to.'],
 mock2:['@{to} jo jo, už jsem slyšel. Sbohem, tvůj tiket.','@{to} nervy, co? 😂','@{to} řekni mi to, až skončí zápas.','@{to} hlavně se nerozbreč.'],
 arg:['@{to} {ttip}? Vážně? To je nejhorší tip dne.','@{to} na {ttip} bych nevsadil ani korunu.','@{to} vsadit na {ttip} chce fakt odvahu. Nebo hloupost.','@{to} hej, ty si fakt myslíš, že {ttip}?','@{to} ještě můžeš tiket smazat, než bude pozdě.'],
 argr:['@{to} a ty jsi kdo? Expert z hospody?','@{to} uvidíme na konci, chytráku.','@{to} já mám {tip} za {odds}, ty máš jen kecy.','@{to} sázím dýl, než ty chodíš.','@{to} nech si ty rady, prosím tě.','@{to} drž se svýho a mně dej pokoj.'],
 sub:['To střídání je katastrofa. Trenér je hovado.','Proč stahuje zrovna jeho?! Nechápu.','Konečně střídá, už jsem myslel, že usnul.'],
 subr:['@{to} trenér ví, co dělá. Ty ne.','@{to} souhlas, trenér je mimo.','@{to} počkej, ten nový to rozsekne.']
};
(function(){for(const k in CH_ADD){CH[k]=(CH[k]||[]).concat(CH_ADD[k]);}for(const k in CH_TH)CH['th_'+k]=CH_TH[k];})();
const CH_OP={fan:['Kurva.','Do prdele!','Ty vole.','No ty kráso.'],troll:['Hahaha.','Ty jo.','Kluci, kluci.'],pes:['Do háje.','Bože.','Jak jinak.','Sakra.'],opt:['Pohoda.','Hele.'],vet:['Hele.','Povím vám…'],stat:['Čistě věcně:','Podle čísel:'],nov:['Hm.','Jéžiš.']};
const CH_CL={fan:['Kurva!','Hanba!','Do prdele.'],troll:['😂','Brečte.','Hahaha.'],pes:['Typický.','Jak vždycky.'],opt:['💪','Věřím!'],vet:['Pamatujte si to.'],stat:['Čísla nelžou.'],nov:['😅']};
// anti-repeat napříč zápasy + otvíráky/zavírače
(function(){const _cp=chPool;chPool=function(u,key){const out=_cp(u,key);const rec=S.chRec||[];if(!rec.length)return out;const f=out.filter(x=>!rec.includes(x[0]));return f.length?f:out;};
 const _cs=chSay;chSay=function(M,u,key,extra,force){const C=MS&&MS.chat;const n0=C?C.lines.length:0;const last=C?C.lines.slice(-30).map(l=>l.t):[];
  let r=_cs(M,u,key,extra,force);if(!r||!C||C.lines.length<=n0&&C.lines.length<60)return r;let L=C.lines[C.lines.length-1];
  if(last.includes(L.t)){C.lines.pop();C.mc[M.min]=Math.max(0,(C.mc[M.min]||1)-1);r=_cs(M,u,key,extra,true);if(!r)return r;L=C.lines[C.lines.length-1];}
  try{S.chRec=S.chRec||[];const ids=Object.keys(C.used);const nid=ids[ids.length-1];if(nid&&!S.chRec.includes(nid)){S.chRec.push(nid);if(S.chRec.length>160)S.chRec.splice(0,S.chRec.length-160);}}catch(e){}
  const pk=u.per==='fanH'||u.per==='fanA'?'fan':u.per;
  if(!/^@/.test(L.t)&&key.indexOf('th_')!==0){const x=RNG();C.oc=C.oc||[];
   if(x<0.22&&CH_OP[pk]){const o=vPick(CH_OP[pk],'chop_'+pk,3);if(!C.oc.slice(-4).includes(o)&&!L.t.startsWith(o.replace(/[.!:…]+$/,''))){L.t=o+' '+L.t;C.oc.push(o);}}
   else if(x>0.82&&CH_CL[pk]){const o=vPick(CH_CL[pk],'chcl_'+pk,3);if(!C.oc.slice(-4).includes(o)&&!/[😂💪😅]$/.test(L.t)){L.t=L.t.replace(/\s*$/,'')+' '+o;C.oc.push(o);}}}
  return r;};})();
// hádky po událostech
function chThread(M,s,kind){const C=MS.chat;const live=C.users.filter(u=>!u.co);if(live.length<2)return;
 const now=chProbs(M);const r=live.map(u=>({u,d:now[u.mk]-(u.p!=null?u.p:now[u.mk])})).filter(x=>Math.abs(x.d)>0.04);
 const G=r.filter(x=>x.d>0).sort((a,b)=>b.d-a.d).map(x=>x.u),B=r.filter(x=>x.d<0).sort((a,b)=>a.d-b.d).map(x=>x.u);
 if(!G.length||!B.length)return;const w=G[0].per==='troll'||RNG()<0.6?G[0]:pick(G);const l=B[0];
 if(!chSay(M,w,'th_mock',{to:l.n,ttip:chTip(M,l),stake:fmtMoney(l.stake)},true))return;
 const rk=kind==='red'||kind==='var'||kind==='pen'?(RNG()<0.7?'th_ref':'th_angry'):RNG()<0.25?'th_coach':RNG()<0.35?'th_defend':'th_angry';
 chSay(M,l,rk,{to:w.n},true);const x=RNG();
 if(x<0.35){const o=live.filter(u=>u!==w&&u!==l);if(o.length){const c=pick(o);const gw=G.includes(c);chSay(M,c,gw?'th_join_g':'th_join_b',{to:gw?l.n:w.n},true);}}
 else if(x<0.6)chSay(M,w,'th_mock2',{to:l.n},true);
 else if(x<0.72){const o=live.filter(u=>u!==w&&u!==l&&(u.per==='vet'||u.per==='opt'||u.per==='stat'));if(o.length)chSay(M,pick(o),'th_calm',{},true);}}
(function(){const _co=chOnEvent;chOnEvent=function(M,e){_co(M,e);try{const C=MS.chat;if(!C||M.ended&&e.t!=='ft')return;
  if(e.t==='goal'&&RNG()<0.7)chThread(M,e.s,'goal');else if((e.t==='red'||e.t==='var'||e.t==='pen')&&RNG()<0.45)chThread(M,e.s,e.t);
  else if(e.t==='sub'&&RNG()<0.1){const live=C.users.filter(u=>!u.co);const a=pick(live);if(chSay(M,a,'th_sub',{})&&RNG()<0.6){const b=pick(live.filter(u=>u!==a));if(b)chSay(M,b,'th_subr',{to:a.n},true);}}}catch(err){}};
 const _ce=chatOnEvents;chatOnEvents=function(M,evs){_ce(M,evs);try{if(!MS||!MS.chat||M.ended||S.settings.betChat===false)return;const C=MS.chat;const m=M.min;
  if(m>5&&m<88&&m-(C.argM||-20)>12&&RNG()<0.028){const live=C.users.filter(u=>!u.co);const a=pick(live);const o=live.filter(u=>u!==a&&u.mk!==a.mk);if(!o.length)return;const b=pick(o);
   C.argM=m;if(chSay(M,a,'th_arg',{to:b.n,ttip:chTip(M,b)},true)){chSay(M,b,'th_argr',{to:a.n},true);if(RNG()<0.45)chSay(M,a,'th_mock2',{to:b.n},true);}}}catch(err){}};})();

// --- ✏️ Editor hráčů ---
const ED_F=[['ovr','Celkové hodnocení',1,99],['pot','Potenciál',1,99],['age','Věk',15,45],['cond','Kondice',0,100],['mor','Morálka',0,100],['hap','Spokojenost',0,100],['frm','Forma (průměrná známka)',1,10],['cy','Smlouva do roku',0,0],['wm','Mzda (násobek)',0.3,5]];
function edGet(p,k){if(k==='age')return ageOf(p);if(k==='frm'){const f=p.form||[];return f.length?Math.round(f.reduce((a,b)=>a+b,0)/f.length*2)/2:6.5;}
 if(k==='hap')return p.hap!=null?Math.round(p.hap):70;if(k==='cy')return p.cy||S.season+2;if(k==='wm')return Math.round((p.wm||1)*10)/10;return Math.round(p[k]||0);}
function edSet(p,k,v){const f=ED_F.find(x=>x[0]===k);let lo=f?f[2]:0,hi=f?f[3]:99;if(k==='cy'){lo=S.season;hi=S.season+8;}v=clamp(v,lo,hi);
 if(k==='age')p.by=S.season-Math.round(v);else if(k==='frm'){const x=Math.round(v*2)/2;p.form=[x,x,x,x,x];}else if(k==='wm')p.wm=Math.round(v*10)/10;
 else{p[k]=Math.round(v);if(k==='ovr'&&p.pot<p.ovr)p.pot=p.ovr;if(k==='pot'&&p.pot<p.ovr)p.pot=p.ovr;}p.ed=1;}
function edAfter(p){try{const c=S.clubs[p.cl];if(c&&p.cl!==S.clubId&&!c.tmp)c.rep=Math.round(teamStrength(p.cl).ovr);}catch(e){}saveGame();}
function edStep(id,k,d){const p=P(id);if(!p)return;if(k.indexOf('a')===0&&k.length<=2){const i=+k.slice(1);p.a[i]=clamp(Math.round(p.a[i]+d),1,99);p.ed=1;}else edSet(p,k,edGet(p,k)+d);edAfter(p);edSheet(id);}
function edQuick(id,q){const p=P(id);if(!p)return;
 if(q==='p5'){p.a=p.a.map(v=>clamp(v+5,1,99));p.ovr=clamp(p.ovr+5,1,99);p.pot=Math.max(p.pot,p.ovr);}
 else if(q==='max'){p.a=p.a.map(()=>99);p.ovr=99;p.pot=99;}
 else if(q==='all'){p.a=p.a.map(v=>clamp(v+10,1,99));p.ovr=clamp(p.ovr+10,1,99);p.pot=clamp(Math.max(p.pot+10,p.ovr),1,99);p.cond=100;p.mor=100;p.hap=100;p.form=[8,8,8,8,8];}
 else if(q==='heal'){p.inj=0;p.sus=0;p.cond=100;}
 else if(q==='young'){p.by=S.season-Math.max(15,ageOf(p)-5);}
 else if(q==='ctr'){p.cy=S.season+5;}
 p.ed=1;edAfter(p);toast('Uloženo ✓');edSheet(id);}
function edPos(id,which,v){const p=P(id);if(!p)return;if(which===1){if(POS_FULL[v])p.pos=v;}else{p.pos2=v&&POS_FULL[v]&&v!==p.pos?v:undefined;if(!p.pos2)delete p.pos2;}p.ed=1;edAfter(p);edSheet(id);}
function edRow(id,k,lbl,val,sm){const b=(d,t)=>`<button class="btn ghost edb" onclick="edStep('${id}','${k}',${d})">${t}</button>`;const s=sm?[0.5,0.5]:k==='wm'?[0.1,0.5]:[1,5];
 return `<div class="edr"><div class="edl">${lbl}</div><div class="edc">${b(-s[1],'−'+String(s[1]).replace('.',','))}${b(-s[0],'−'+String(s[0]).replace('.',','))}<b class="edv">${String(val).replace('.',',')}</b>${b(s[0],'+'+String(s[0]).replace('.',','))}${b(s[1],'+'+String(s[1]).replace('.',','))}</div></div>`;}
function edSheet(id){const p=P(id);if(!p)return;const c=S.clubs[p.cl];const L=p.pos==='GK'?ATTR_GK:ATTR_CZ;
 const opt=(sel,none)=>(none?`<option value="">— žádná —</option>`:'')+Object.keys(POS_FULL).map(k=>`<option value="${k}" ${k===sel?'selected':''}>${k} · ${POS_FULL[k]}</option>`).join('');
 const sc=document.querySelector('.modal')?document.querySelector('.modal').scrollTop:0;
 modal(`<h2>✏️ Editor hráčů</h2><div class="hero" style="margin-bottom:8px">${posB(p.pos)}<div style="flex:1;min-width:0"><b>${esc(p.n)}</b><div class="small mut">${c?esc(c.n):'bez klubu'} · ${ageOf(p)} let</div></div>${ovrB(p.ovr)}</div>
 <div class="grid3" style="margin-bottom:8px"><div class="tile"><div class="k">Hodnota</div><div class="v" style="font-size:13px">${fmtMoney(playerValue(p))}</div></div><div class="tile"><div class="k">Mzda/týden</div><div class="v" style="font-size:13px">${fmtMoney(playerWage(p))}</div></div><div class="tile"><div class="k">Potenciál</div><div class="v" style="font-size:13px">${p.pot}</div></div></div>
 <div class="grid2" style="gap:6px;margin-bottom:8px"><button class="btn gold" onclick="edQuick('${id}','all')">⚡ Vylepšit vše</button><button class="btn ghost" onclick="edQuick('${id}','p5')">+5 ke všemu</button><button class="btn ghost" onclick="edQuick('${id}','max')">🔝 Max (99)</button><button class="btn ghost" onclick="edQuick('${id}','heal')">🩹 Vyléčit a zregenerovat</button><button class="btn ghost" onclick="edQuick('${id}','young')">⏪ Omladit o 5 let</button><button class="btn ghost" onclick="edQuick('${id}','ctr')">📝 Smlouva na 5 let</button></div>
 <div class="card" style="padding:8px 10px"><div class="small" style="margin-bottom:4px"><b>Základ</b></div>${ED_F.map(f=>edRow(id,f[0],f[1],edGet(p,f[0]),f[0]==='frm')).join('')}</div>
 <div class="card" style="padding:8px 10px"><div class="small" style="margin-bottom:4px"><b>Atributy</b></div>${p.a.map((v,i)=>edRow(id,'a'+i,L[i],v)).join('')}</div>
 <div class="card" style="padding:8px 10px"><div class="small" style="margin-bottom:4px"><b>Pozice</b></div><label class="tiny mut">Hlavní pozice</label><select class="edsel" onchange="edPos('${id}',1,this.value)">${opt(p.pos)}</select><label class="tiny mut">Vedlejší pozice</label><select class="edsel" onchange="edPos('${id}',2,this.value)">${opt(p.pos2,1)}</select></div>
 <div class="tiny mut" style="margin:4px 2px 8px">Změny se ukládají hned a platí i v zápasech. Hodnota a mzda se přepočítají samy.</div>
 <div class="grid2" style="gap:6px"><button class="btn ghost" onclick="closeModal();edList()">👥 Jiný hráč</button><button class="btn gold" onclick="closeModal();playerSheet('${id}')">Hotovo</button></div>`);
 const m=document.querySelector('.modal');if(m&&sc)m.scrollTop=sc;}
function edList(q){UI.edq=q!=null?q:(UI.edq||'');const s=UI.edq.trim().toLowerCase();let L;
 const fold=x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(!s)L=clubPlayers(S.clubId).slice().sort((a,b)=>b.ovr-a.ovr);else{const f=fold(s);L=Object.values(S.players).filter(p=>fold(p.n).includes(f)).sort((a,b)=>b.ovr-a.ovr).slice(0,40);}
 const rows=L.map(p=>{const c=S.clubs[p.cl];return `<button class="btn ghost w100 edli" onclick="closeModal();edSheet('${p.id}')">${posB(p.pos)}<span style="flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.n)}<span class="tiny mut"> · ${c?esc(c.s||c.n):''}</span></span>${p.ed?'<span class="tag">upraveno</span>':''}<b>${p.ovr}</b></button>`;}).join('')||'<div class="empty">Nikdo takový.</div>';
 if(document.getElementById('edres')&&q!=null){document.getElementById('edres').innerHTML=rows;return;}
 modal(`<div class="edhead"><h2>✏️ Editor hráčů</h2><div class="small mut" style="margin-bottom:6px">Vyber hráče z kádru, nebo vyhledej kohokoli z databáze.</div><input id="edq" class="edsel" placeholder="Hledat hráče podle jména…" value="${esc(UI.edq)}" oninput="edList(this.value)"></div><div id="edres" style="margin-top:6px">${rows}</div><button class="btn ghost w100" style="margin-top:6px" onclick="closeModal()">Zavřít</button>`);}
function edCard(){return `<div class="card"><h3>✏️ Editor hráčů</h3><div class="small mut" style="margin:0 0 8px">Uprav atributy, hodnocení, potenciál, věk, pozice, formu i smlouvu kteréhokoli hráče.</div><button class="btn gold w100" onclick="edList('')">✏️ Otevřít editor hráčů</button></div>`;}
(function(){const _ps=playerSheet;playerSheet=function(id){const r=_ps.apply(this,arguments);try{const m=document.querySelector('.modal');if(m&&P(id)&&!m.querySelector('.edopen')){const d=document.createElement('div');d.innerHTML=`<button class="btn ghost w100 edopen" style="margin-top:8px" onclick="closeModal();edSheet('${id}')">✏️ Editor hráčů</button>`;m.appendChild(d.firstChild);}}catch(e){}return r;};
 const _rc=renderClub;renderClub=function(){const h=_rc.apply(this,arguments);try{const k='<div class="card"><h3>⚙️ Nastavení a uložení';if(typeof h==='string'&&(UI.clubTab||'fin')==='set'&&h.indexOf(k)>=0)return h.replace(k,edCard()+k);}catch(e){}return h;};})();

// ===== v11: komentář bez opakování, efekty v zápase, média, ocenění, kapitán, rozhovory, agenti, ošetřovna, trávník, fanshop, legendy, výměny, MS a Euro =====
function v11(){if(!S.v11)S.v11={};const V=S.v11;V.feed=V.feed||[];V.aw=V.aw||[];V.rec=V.rec||{};V.prom=V.prom||{};V.talk=V.talk||{};V.ret=V.ret||{};V.tour=V.tour||[];V.potm=V.potm||[];V.med=V.med||{};
 if(V.pitch==null)V.pitch=88;V.shop=V.shop||{kit:'klas',sc:'pruh',last:0,tot:0};return V;}
function v11Fill(t,d){return t.replace(/\{(\w+)\}/g,(_,k)=>d[k]!=null?d[k]:'');}
function shortN(n){return chWord?chWord(n):n;}

// ---------- 1) komentář: víc vět a žádné opakování ----------
(function(){const add=(a,l)=>{if(Array.isArray(a))l.forEach(x=>{if(!a.includes(x))a.push(x);});};
 add(T_GOAL,['{S} si posunul míč na silnější nohu a zavěsil k tyči.','{S} vyťukal obranu a technickou střelou skóroval.','{S} trefil z voleje – nádherná trefa!','Rychlý protiútok a {S} ho v klidu zakončil.','{S} prostřelil brankáři jesličky.','{S} se prosadil po přečíslení, gólman neměl šanci.','{S} vystřelil z otočky a míč se zavrtal k tyči.','Ten míč snad měl oči! {S} trefil přesně do šibenice.','{S} zakončil po rychlé kombinaci na jeden dotek.','Chyba v rozehrávce a {S} nezaváhal.']);
 add(T_GOAL_HEAD,['{S} se prosadil hlavou po standardní situaci.','Centr na zadní tyč a {S} hlavou nemířil vedle.','{S} se vznesl nad obránce a hlavou skóroval pod břevno.']);
 add(T_SAVE,['{K} se natáhl jak kočka a vyškrábl střelu, kterou poslal {S}.','{S} pálil z voleje, {K} ale stál dobře.','{K} vyrazil tvrdou ránu, kterou vyslal {S}, nohou.','{S} zkoušel lobovat, {K} ale ucouvl a chytil to.','Skvělý zákrok! {K} zneškodnil {S} v situaci jeden na jednoho.','{K} pěstí odvrátil nebezpečnou střelu, kterou poslal {S}.']);
 add(T_MISS,['{S} se položil do střely, ale míč letěl vysoko nad.','{S} to zkusil patičkou, ale minul.','{S} měl volnou hlavu, míč ale skončil vedle tyče.','{S} vystřelil z otočky, jen těsně vedle.','{S} nabíhal na centr, ale minul míč o centimetry.','Obrovská šance! {S} ale trefil jen do diváků.']);
 add(T_POST,['{S} trefil spojnici tyče a břevna!','Míč se po střele, kterou poslal {S}, otřel o tyč a šel do zámezí.','Tyčka! {S} se drží za hlavu.']);
 add(T_BLOCK,['{S} vystřelil, ale obránce se vrhl do střely.','Střela, kterou vyslal {S}, se odrazila od obránce na roh.']);
 add(T_FILL,['{T} kombinují na malém prostoru, ale přesný pas chybí.','{T} hrají dlouhé míče za obranu.','Hra je kouskovaná, rozhodčí často píská.','{T} na chvíli přebírají otěže zápasu.','Míč je hodně ve vzduchu, hraje se o odražené míče.','{T} se zatáhli a čekají na brejk.','Trenér {T} něco důrazně vysvětluje u lajny.','Obrana {T} drží linii a soupeř chytá ofsajdy.','{T} zkoušejí střídat strany a rozhýbat obranu.','Diváci tleskají povedené kličce, ze které ale nic nebylo.']);
 [T_GOAL,T_GOAL_HEAD,T_SAVE,T_MISS,T_POST,T_BLOCK,T_FILL].forEach(a=>{if(a)Object.defineProperty(a,'_nr',{value:1,enumerable:false});});
 try{for(const k in WX_FILL)if(Array.isArray(WX_FILL[k]))Object.defineProperty(WX_FILL[k],'_nr',{value:1,enumerable:false});}catch(e){}
 const _pk=pick;pick=function(a){if(a&&a._nr&&a.length>2){const r=a._r||(Object.defineProperty(a,'_r',{value:[],enumerable:false}),a._r);const N=Math.min(a.length-1,Math.max(2,Math.floor(a.length*0.7)));const rec=r.slice(-N);let fr=a.filter(x=>!rec.includes(x));if(!fr.length)fr=a;const t=_pk(fr);r.push(t);if(r.length>60)r.splice(0,20);return t;}return _pk(a);};})();
// pokřiky a stav trávníku v komentáři
const V11_CHANT=['🎶 Kotel zpívá: „Do toho, {c}, do toho!“','🎶 Celý stadion skanduje jméno klubu – {c}!','🎶 Z tribuny se ozývá: „Bojovat, bojovat!“','🎶 Fanoušci rozvinuli obří choreo a zpívají klubovou hymnu.','🎶 Hostující sektor odpovídá vlastním chorálem.','🎶 „Kdo neskáče, není…!“ – skáče celý kotel.','🎶 Bubny duní, kotel tlačí svůj tým dopředu.','🎶 Stadion tleská do rytmu, atmosféra je skvělá.','🎶 Pískot! Fanoušci nejsou spokojení s tím, co vidí.','🎶 „Ještě jeden!“ ozývá se z ochozů.'];
const V11_PITCH=['🌱 Trávník je rozbitý, míč nepříjemně poskakuje.','🌱 Hráči kloužou po rozměklém terénu.','🌱 Na rozbitém pažitu je těžké hrát po zemi.','🌱 Přihrávka se na hrbolatém trávníku odrazila mimo hráče.'];
(function(){const _sm=stepMinute;stepMinute=function(M){const out=_sm.apply(this,arguments);try{if(M&&!M.ended&&M.min>3&&M.min<=90){const h=hashStr('ch'+M.h.cid+M.a.cid+M.min+S.season)%100;
   if(h<6){const c=S.clubs[(M.score[0]<M.score[1]&&h<2)?M.a.cid:M.h.cid];if(c)M.ev.push({m:M.min,t:'fill',tx:v11Fill(vPick(V11_CHANT,'chant',6),{c:shortN(c.n)})});}
   else if(h<9&&M.wx&&M.wx.pitch!=null&&M.wx.pitch<55)M.ev.push({m:M.min,t:'fill',tx:vPick(V11_PITCH,'pitch',3)});}}catch(e){}return out;};})();

// ---------- 2) efekty v zápase (gól, karta, VAR, penalta) ----------
function v11Flash(e,M){const w=document.querySelector('.mv-wrap')||document.body;const old=document.getElementById('evfx');if(old)old.remove();
 let cls='g',big='⚽ GÓL!',sm='';const nmP=id=>{const p=P(id);return p?p.n:'';};const tm=i=>S.clubs[M.sides[i].cid]?S.clubs[M.sides[i].cid].n:'';
 if(e.t==='goal'){sm=(e.og?'vlastní gól · ':'')+nmP(e.p)+' · '+tm(e.s);big=M.score[0]+':'+M.score[1]+' ⚽ GÓL!';}
 else if(e.t==='red'){cls='r';big='🟥 ČERVENÁ';sm=nmP(e.p);}else if(e.t==='var'){cls='v';big='📺 VAR';sm=e.vg?'Gól se přezkoumává…':'Rozhodčí jde k monitoru';}
 else if(e.t==='pen'){cls='p';big='🎯 PENALTA';sm=tm(e.s);}else return;
 const d=document.createElement('div');d.id='evfx';d.className='evfx '+cls;d.innerHTML=`<b>${esc(big)}</b>${sm?`<small>${esc(sm)}</small>`:''}`;w.appendChild(d);setTimeout(()=>{if(d.parentNode)d.remove();},1800);}
(function(){const _ul=updLive;updLive=function(full){const r=_ul.apply(this,arguments);try{if(MS&&MS.M){const M=MS.M;const n=M.ev.length;if(MS._fxN==null||MS.ff){MS._fxN=n;return r;}
  if(n>MS._fxN){const ne=M.ev.slice(MS._fxN).filter(e=>['goal','red','var','pen'].includes(e.t));MS._fxN=n;if(ne.length&&!M.ended)v11Flash(ne[ne.length-1],M);}}}catch(e){}return r;};
 const _el=endLive;endLive=function(){if(MS)MS.ff=1;return _el.apply(this,arguments);};})();

// ---------- 3) média: noviny a sociální sítě ----------
const V11_J={bigw:['Demolice! {me} – {opp} {sc}. Soupeř neměl nárok.','{me} nedal týmu {opp} šanci: {sc} a fanoušci šílí.','Kanonáda! {me} – {opp} {sc}, hosté odjíždějí s ručníkem v ruce.','Exhibice v podání {me}. Výsledek {sc} mluví za vše.'],
 w:['{me} zvládl zápas s týmem {opp} a bere tři body ({sc}).','Výhra {sc}! {p} táhl {me} k důležitému vítězství.','{me} – {opp} {sc}. Klíčovým mužem zápasu byl {p}.','Tři body a nálada stoupá: {me} – {opp} {sc}.','Pracovní výhra: {me} přetlačil soupeře {sc}.'],
 d:['Dělba bodů: {me} – {opp} {sc}.','{me} a {opp} se rozešli smírně ({sc}).','Remíza {sc}. {me} si body s týmem {opp} rozdělil.','Bod, který nikoho nenadchl: {me} – {opp} {sc}.'],
 l:['{me} padl v zápase s týmem {opp} {sc}. Přijde krize?','Prohra {sc}. {me} na soupeře nestačil.','Zklamání: {me} – {opp} {sc}.','Body si odvezl soupeř. {me} – {opp} {sc}.'],
 bigl:['Debakl! {me} – {opp} {sc}.','Ostuda! {me} schytal {sc} a v kabině bude dusno.','Výprask {sc}. Fanoušci klubu {me} chtějí vysvětlení.'],
 derby:['Derby ovládl {me}! Výsledek {sc} slaví celé město.','Prestižní souboj pro {me}: {sc} nad rivalem.'],
 derbyl:['Derby pro rivala. {me} prohrál {sc} a město truchlí.']};
const V11_FAN={pos:['Takhle se to hraje! 💪','{p} je kus chlapa, makal za tři.','Konečně fotbal, na který se dá dívat.','Ty vole, to byla jízda! Další zápas jdu zase.','Trenére, díky. Tohle jsme chtěli vidět.','Kotel dneska jel na sto procent a tým taky.','{p} dneska nehrál fotbal, ten čaroval.','Tabulka vypadá krásně. Jedeme dál!'],
 neu:['Bod je bod, ale čekal jsem víc.','Nic moc, ale aspoň neprohráli.','Takhle nudný zápas jsem dlouho neviděl.','Bylo tam víc, škoda zahozených šancí.'],
 neg:['Tohle byla hanba. Do prdele, za co ty lidi platíme?','Trenér out! Takhle to dál nejde.','Obrana jak cedník. Kurva, zase.','Kdo tam proboha posílá tyhle lidi?','Vracím permanentku. Fakt.','Hrajou bez srdce. Fanoušci si to nezaslouží.','{p} dneska vůbec nebyl na hřišti.','Ještě jedna taková a jdu fandit hokeji.']};
const V11_NICK=['Kotelník_Pepa','Zelený_Mirek','Fanda_od_piva','Permanentka_17','Ultras_Jirka','Babička_z_tribuny','Statistik_Zdeněk','Kapitán_Kotle','Mlady_fanda','Věrný_od_1998'];
const V11_RUM=['🗞️ Šeptanda: {p} ({c}) prý zaujal skauty klubu {c2}.','🗞️ Podle novinářů má {c2} zájem o útočnou posilu. Na seznamu je prý {p} ({c}).','🗞️ {c2} údajně chystá nabídku. Cíl: {p} ({c}).','🗞️ Hráčův agent byl viděn na stadionu klubu {c2}. Jde prý o to, kam zamíří {p} ({c}).','🗞️ Spekuluje se o přestupu: {p} by mohl zamířit do klubu {c2}.'];
const V11_RUMME=['🗞️ Bulvár tvrdí, že {c2} má zájem o tvou oporu. Jméno? {p}.','🗞️ Skauti klubu {c2} byli na tvém zápase. Prý kvůli tomu, jak hraje {p}.','🗞️ V kabině se mluví o tom, že {p} zaujal klub {c2}.'];
function v11Post(ic,who,t){const V=v11();V.feed.unshift({ic,who,t,s:S.season,r:S.round});if(V.feed.length>60)V.feed.length=60;}
function v11MatchMedia(M){const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const me=CL(M.sides[ui].cid),opp=CL(M.sides[1-ui].cid);if(!me||!opp)return;
 const b=P(motm(M));const sc=my+':'+th;const d={me:me.n,opp:opp.n,sc,p:b&&b.cl===S.clubId?b.n:(clubPlayers(S.clubId)[0]||{}).n||'kapitán'};
 const k=M.derby?(my>th?'derby':my<th?'derbyl':(my-th>=3?'bigw':'d')):my-th>=3?'bigw':my>th?'w':my===th?'d':th-my>=3?'bigl':'l';
 v11Post('📰','Sportovní deník',v11Fill(vPick(V11_J[k]||V11_J.d,'j_'+k,4),d));
 const fk=my>th?'pos':my===th?'neu':'neg';if(fk==='neg'){let w=null,wv=99;for(const id in M.played){const q=P(id);if(q&&q.cl===S.clubId&&(M.rt[id]||6)<wv){wv=M.rt[id]||6;w=q;}}if(w)d.p=w.n;}const n=1+(RNG()<0.6?1:0);for(let i=0;i<n;i++)v11Post('💬','@'+vPick(V11_NICK,'nick',5),v11Fill(vPick(V11_FAN[i&&RNG()<0.3?(fk==='pos'?'neu':fk):fk],'fan_'+fk,6),d));}
function v11Rumour(){const V=v11();if(RNG()>0.35)return;const ids=Object.keys(S.clubs).filter(id=>!S.clubs[id].tmp&&id!==S.clubId);if(ids.length<3)return;
 if(RNG()<0.35){const ps=clubPlayers(S.clubId).filter(p=>p.ovr>=teamStrength(S.clubId).ovr);if(!ps.length)return;const p=pick(ps);const c2=pick(ids.filter(id=>(S.clubs[id].rep||0)>=(myClub().rep||0)));if(!c2)return;
  v11Post('🗞️','Přestupové spekulace',v11Fill(vPick(V11_RUMME,'rumme',2),{p:p.n,c2:S.clubs[c2].n}));p.hap=clamp((p.hap||60)-2,0,100);return;}
 const c=pick(ids);const ps=clubPlayers(c).sort((a,b)=>b.ovr-a.ovr).slice(0,3);if(!ps.length)return;const p=pick(ps);const big=ids.filter(id=>(S.clubs[id].rep||0)>(S.clubs[c].rep||0)+2);if(!big.length)return;
 v11Post('🗞️','Přestupové spekulace',v11Fill(vPick(V11_RUM,'rum',3),{p:p.n,c:S.clubs[c].n,c2:S.clubs[pick(big)].n}));}
function v11FeedHtml(n){const V=v11();const L=V.feed.slice(0,n);if(!L.length)return '<div class="small mut">Zatím nikdo nic nenapsal. Po prvním zápase se ozvou novináři i fanoušci.</div>';
 return L.map(x=>`<div class="feedl"><span class="fic">${x.ic}</span><div style="flex:1;min-width:0"><div class="tiny mut">${esc(x.who)} · ${x.r?x.r+'. kolo':'příprava'}</div><div class="small">${esc(x.t)}</div></div></div>`).join('');}
function v11FeedSheet(){modal(`<h2>📰 Média a sociální sítě</h2>${v11FeedHtml(40)}<button class="btn ghost w100" style="margin-top:8px" onclick="closeModal()">Zavřít</button>`);}

// ---------- 4) ocenění, hráč měsíce, rekordy ----------
function v11Pts(p,maxAp){const a=p.st.rt/p.st.ap;return a+p.st.g*0.05+(p.st.as||0)*0.025+(p.st.ap/Math.max(1,maxAp))*0.35;}
function v11Awards(){const me=myClub();const L=S.leagues[me.lg];if(!L)return null;const ps=[];L.clubs.forEach(cid=>{if(S.clubs[cid])clubPlayers(cid).forEach(p=>{if(p.st&&p.st.ap>=4)ps.push(p);});});if(ps.length<15)return null;
 const maxAp=Math.max(...ps.map(p=>p.st.ap));const el=ps.filter(p=>p.st.ap>=maxAp*0.45);const sc=p=>v11Pts(p,maxAp);const best=(a,f)=>a.slice().sort((x,y)=>f(y)-f(x))[0];
 const pack=(p,v)=>p?{id:p.id,n:p.n,c:CL(p.cl)?CL(p.cl).n:'',v,pos:p.pos,mine:p.cl===S.clubId?1:0}:null;
 const zm=best(el,sc);const ks=best(ps,p=>p.st.g*10-p.st.ap*0.01);const tal=best(el.filter(p=>ageOf(p)<=21),sc);const gk=best(el.filter(p=>GRP(p.pos)==='G'),p=>p.st.rt/p.st.ap+(p.st.cs||0)*0.04);
 const xi=[];const pickG=(g,n)=>el.filter(p=>GRP(p.pos)===g&&!xi.includes(p)).sort((a,b)=>sc(b)-sc(a)).slice(0,n).forEach(p=>xi.push(p));pickG('G',1);pickG('D',4);pickG('M',3);pickG('F',3);
 const A={s:S.season,lg:me.lg,zm:pack(zm,(zm.st.rt/zm.st.ap).toFixed(2).replace('.',',')),ks:pack(ks,ks.st.g),tal:pack(tal,tal?(tal.st.rt/tal.st.ap).toFixed(2).replace('.',','):''),gk:pack(gk,gk?(gk.st.cs||0):0),xi:xi.map(p=>pack(p,''))};
 const V=v11();V.aw=V.aw.filter(x=>x.s!==S.season);V.aw.push(A);if(V.aw.length>30)V.aw.shift();
 addNews('🏆',`Zlatý míč ligy za sezónu ${seasonLabel(S.season)} získal ${A.zm.n} (${A.zm.c}). Králem střelců je ${A.ks.n} s ${A.ks.v} ${czPlural(A.ks.v,'gólem','góly','góly')}.`);
 [A.zm,A.ks,A.tal,A.gk].concat(A.xi).forEach(x=>{if(x&&x.mine){const p=P(x.id);if(p){p.mor=clamp((p.mor||60)+4,0,100);p.hap=clamp((p.hap||60)+4,0,100);}}});
 // klubový rekord střelce
 const my=clubPlayers(S.clubId).sort((a,b)=>(b.st.g||0)-(a.st.g||0))[0];if(my&&my.st.g){const R=V.rec;if(!R.sg||my.st.g>R.sg.g)R.sg={n:my.n,g:my.st.g,s:S.season};}
 return A;}
function v11AwHtml(A,full){if(!A)return '';const row=(ic,l,x,suf)=>x?`<div class="row small" style="padding:4px 0"><span style="font-size:18px">${ic}</span><span style="flex:1;min-width:0"><b>${l}</b><div class="tiny mut">${esc(x.n)} · ${esc(x.c)}${suf?' · '+suf:''}</div></span>${x.mine?'<span class="tag y">tvůj hráč</span>':''}</div>`:'';
 return `<div class="card" style="padding:10px 12px"><h3 style="margin-bottom:4px">🏆 Ocenění ${seasonLabel(A.s)}</h3><div class="tiny mut" style="margin-bottom:4px">${esc(leagueLabel(A.lg))}</div>${row('🥇','Zlatý míč',A.zm,'průměrná známka '+A.zm.v)}${row('👟','Král střelců',A.ks,A.ks.v+' '+czPlural(A.ks.v,'gól','góly','gólů'))}${row('🌱','Objev sezóny',A.tal,A.tal?'známka '+A.tal.v:'')}${row('🧤','Nejlepší brankář',A.gk,A.gk?A.gk.v+' čistých kont':'')}
 ${full!==false?`<div class="small" style="margin-top:6px"><b>⭐ Nejlepší jedenáctka</b></div><div class="xi11">${A.xi.map(x=>`<span class="${x.mine?'mine':''}">${POS_CZ?(POS_CZ[x.pos]||x.pos):x.pos} ${esc(pSurnameN(x.n))}</span>`).join('')}</div>`:''}</div>`;}
function pSurnameN(n){const a=String(n).split(' ');return a.length>1?a.slice(1).join(' '):n;}
function v11Potm(){if(S.round<4||S.round%4!==0)return;const V=v11();const key=S.season+'_'+S.round;if(V.potm.some(x=>x.k===key))return;const L=S.leagues[myClub().lg];if(!L)return;
 const ps=[];L.clubs.forEach(cid=>{if(S.clubs[cid])clubPlayers(cid).forEach(p=>{if(p.form&&p.form.length>=3)ps.push(p);});});if(!ps.length)return;
 const av=p=>p.form.slice(-4).reduce((a,b)=>a+b,0)/Math.min(4,p.form.length);const b=ps.sort((x,y)=>av(y)-av(x))[0];
 V.potm.push({k:key,s:S.season,r:S.round,n:b.n,c:CL(b.cl).n,v:av(b).toFixed(2).replace('.',','),mine:b.cl===S.clubId?1:0});if(V.potm.length>40)V.potm.shift();
 addNews('🏅',b.cl===S.clubId?`Tvůj hráč ${b.n} byl vyhlášen hráčem měsíce ligy! Průměrná známka ${av(b).toFixed(2).replace('.',',')}.`:`Hráčem měsíce ligy je ${b.n} (${CL(b.cl).n}).`,b.cl===S.clubId?0:1);
 if(b.cl===S.clubId){b.mor=clamp((b.mor||60)+6,0,100);b.hap=clamp((b.hap||60)+5,0,100);v11Post('📰','Liga',vmGen(()=>'🏅 '+vmFill(vmP(['{p} je hráčem měsíce!','Hráčem měsíce se stal {p}.','Cenu pro hráče měsíce bere {p} (průměrná známka {a}).','{p} ovládl anketu o hráče měsíce.','Měsíc patřil jednomu jménu: {p}.','Liga vyhlásila hráče měsíce – je jím {p}.'],'potm'),{p:b.n,a:av(b).toFixed(2).replace('.',',')})+(S.round?' ('+S.round+'. kolo)':'')));}}
function v11Records(M){const V=v11();const R=V.rec;const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const opp=CL(M.sides[1-ui].cid);const o=opp?opp.n:'';const x={sc:my+':'+th,opp:o,s:S.season};
 if(my-th>0&&(!R.bw||my-th>R.bw.d||(my-th===R.bw.d&&my>+R.bw.sc.split(':')[0])))R.bw=Object.assign({d:my-th},x);
 if(th-my>0&&(!R.bl||th-my>R.bl.d))R.bl=Object.assign({d:th-my},x);
 if(!R.gm||my+th>R.gm.n)R.gm=Object.assign({n:my+th},x);
 if(M.att&&M.sides[ui]===M.h&&(!R.att||M.att>R.att.n))R.att=Object.assign({n:M.att},x);}
function v11RecHtml(){const R=v11().rec;const r=(l,x,v)=>x?`<div class="row small" style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="flex:1">${l}</span><span><b>${v}</b> <span class="tiny mut">${esc(x.opp||x.n||'')} · ${seasonLabel(x.s)}</span></span></div>`:'';
 const h=(S.history||[]).slice().sort((a,b)=>b.pts-a.pts)[0];
 return `<div class="card"><h3>📊 Klubové rekordy</h3>${r('Nejvyšší výhra',R.bw,R.bw&&R.bw.sc)}${r('Nejvyšší prohra',R.bl,R.bl&&R.bl.sc)}${r('Nejvíc gólů v zápase',R.gm,R.gm&&R.gm.sc)}${r('Rekordní návštěva',R.att,R.att&&R.att.n.toLocaleString('cs-CZ'))}${R.sg?`<div class="row small" style="padding:4px 0"><span style="flex:1">Nejvíc gólů za sezónu</span><span><b>${R.sg.g}</b> <span class="tiny mut">${esc(R.sg.n)} · ${seasonLabel(R.sg.s)}</span></span></div>`:''}${h?`<div class="row small" style="padding:4px 0"><span style="flex:1">Nejvíc bodů v sezóně</span><span><b>${h.pts}</b> <span class="tiny mut">${seasonLabel(h.season)}</span></span></div>`:''}${!R.bw&&!R.gm?'<div class="small mut">Rekordy se zapíšou po prvních zápasech.</div>':''}</div>`;}

// ---------- 5) kapitán, rozhovory, sliby, agenti ----------
function v11Cap(){const V=v11();if(V.cap&&(!P(V.cap)||P(V.cap).cl!==S.clubId)){const n=V.capN;V.cap=null;if(n)addNews('©️',`Klub přišel o kapitána (${n}). Vyber nového.`);}return V.cap;}
function v11SetCap(id){const V=v11();const p=P(id);if(!p||p.cl!==S.clubId)return;const old=V.cap&&P(V.cap);if(old&&old.id!==id){old.hap=clamp((old.hap||60)-8,0,100);}
 V.cap=id;V.capN=p.n;p.hap=clamp((p.hap||60)+10,0,100);p.mor=clamp((p.mor||60)+5,0,100);const lead=pers(p)==='vu'||ageOf(p)>=28;clubPlayers(S.clubId).forEach(x=>{if(x!==p)x.mor=clamp((x.mor||60)+(lead?2:-1),0,100);});
 addNews('©️',`Novým kapitánem je ${p.n}. ${lead?'Kabina volbu přijala s respektem.':'Někteří zkušení hráči se tváří kysele.'}`);saveGame();toast('©️ '+p.n+' je kapitán');closeModal();playerSheet(id);}
const V11_TALK={praise:['Díky, trenére. Budu makat ještě víc.','To mě fakt potěšilo. Nezklamu vás.','Jsem rád, že to vidíte. Jedeme dál.'],praiseBad:['Pochvala? Teď? Nevím, jestli to myslíte vážně.','Hm, díky… ale sám vím, že to nebylo ono.'],
 push:['Máte pravdu. Ukážu vám, že na to mám.','Beru to. Příští zápas uvidíte jiného hráče.','Rozumím. Zaberu.'],pushBad:['To si nezasloužím. Makám jako všichni.','Takhle se se mnou mluvit nebude.','Jestli mi nevěříte, řekněte to rovnou.'],
 calm:['Díky, že jste si na mě udělal čas. Je mi líp.','Potřeboval jsem to slyšet. Díky.','Dobře, zkusím hodit hlavu do klidu.'],
 fut:['V klubu jsem spokojený, ale chci hrát o víc.','Chci tu vyhrát něco velkého.','Zatím o odchodu nepřemýšlím.'],futBad:['Upřímně? Přemýšlím, co dál.','Můj agent má pár nabídek. Uvidíme.'],
 prom:['Platí. Ale budu vás držet za slovo.','Díky! Dokážu, že si to zasloužím.','Tak jo. Uvidíme, jestli to dodržíte.']};
function v11Avg(p){const f=p.form||[];return f.length?f.reduce((a,b)=>a+b,0)/f.length:6.5;}
function v11TalkSheet(id,res){const p=P(id);if(!p)return;const V=v11();const cd=V.talk[id]!=null&&V.talk[id]+'|'===S.season+'_'+S.round+'|';const pr=V.prom[id];
 const b=(k,t,dis)=>`<button class="btn ghost w100" style="margin-bottom:6px;text-align:left;white-space:normal" ${dis?'disabled':''} onclick="v11Talk('${id}','${k}')">${t}</button>`;
 modal(`<h2>🗣️ Rozhovor: ${esc(p.n)}</h2><div class="small mut" style="margin-bottom:8px">Morálka ${Math.round(p.mor||0)} · ${hapTxt(p)} · forma ${v11Avg(p).toFixed(1).replace('.',',')}</div>
 ${res?`<div class="rcb" style="margin-bottom:8px"><b>${esc(p.n)}</b><div>${esc(res)}</div></div>`:''}
 ${cd?'<div class="small mut" style="margin-bottom:8px">S hráčem jsi tento týden už mluvil. Další rozhovor po příštím kole.</div>':''}
 ${b('praise','👏 Pochválit za výkony',cd)}${b('push','📢 Zatlačit na něj, ať přidá',cd)}${b('calm','🤝 Podpořit a uklidnit',cd)}${b('fut','🔮 Probrat budoucnost v klubu',cd)}${b('prom',pr?`⏱️ Slib minut už platí (do ${pr.until}. kola)`:'⏱️ Slíbit víc minut na hřišti',cd||!!pr)}
 <button class="btn gold w100" onclick="closeModal();playerSheet('${id}')">Hotovo</button>`);}
function v11Talk(id,k){const p=P(id);if(!p)return;const V=v11();V.talk[id]=S.season+'_'+S.round;const f=v11Avg(p);const hh=pers(p)==='hh';let t;
 const M_=(d)=>p.mor=clamp((p.mor||60)+d,0,100),H_=(d)=>p.hap=clamp((p.hap||60)+d,0,100);
 if(k==='praise'){if(f>=6.8||RNG()<0.45){M_(7);H_(3);t=vPick(V11_TALK.praise,'tk_pr',2);}else{M_(-2);t=vPick(V11_TALK.praiseBad,'tk_pb',1);}}
 else if(k==='push'){if((f<6.5&&RNG()<(hh?0.35:0.65))||RNG()<0.25){M_(8);t=vPick(V11_TALK.push,'tk_pu',2);}else{M_(-6);H_(-5);t=vPick(V11_TALK.pushBad,'tk_pub',2);}}
 else if(k==='calm'){H_((p.hap||60)<50?8:3);M_(2);t=vPick(V11_TALK.calm,'tk_c',2);}
 else if(k==='fut'){if((p.hap||60)>=55&&(p.cy||0)>=S.season+1){H_(3);t=vPick(V11_TALK.fut,'tk_f',2);}else{H_(-1);t=vPick(V11_TALK.futBad,'tk_fb',1);}}
 else if(k==='prom'){V.prom[id]={ap0:p.st?p.st.ap:0,s:S.season,until:Math.min(S.maxRound,S.round+5),r0:S.round};H_(12);M_(4);t=vPick(V11_TALK.prom,'tk_pm',2);}
 saveGame();v11TalkSheet(id,t);}
function v11PromWeek(){const V=v11();for(const id in V.prom){const pr=V.prom[id];const p=P(id);if(!p||p.cl!==S.clubId||pr.s!==S.season){delete V.prom[id];continue;}
 if(S.round>=pr.until||seasonOver()){const got=(p.st?p.st.ap:0)-pr.ap0;delete V.prom[id];
  if(got>=3){p.hap=clamp((p.hap||60)+6,0,100);addNews('✅',`Slib splněn: ${p.n} dostal šanci (${got} zápasy) a je spokojený.`,1);}
  else{p.hap=clamp((p.hap||60)-25,0,100);p.mor=clamp((p.mor||60)-12,0,100);S.cohesion=clamp((S.cohesion||50)-2,0,100);p.wantOut=1;addNews('💢',`${p.n} se cítí podvedený: slíbil jsi mu minuty, ale odehrál jen ${got} ${czPlural(got,'zápas','zápasy','zápasů')}. Chce odejít a v kabině je dusno.`);v11Post('🗞️','Bulvár',`Rozkol v kabině! ${p.n} prý veřejně kritizuje trenéra za nedodržený slib.`);}}}}
function v11AgentWeek(){const V=v11();if(V.agent){const a=V.agent;if(!P(a.id)||P(a.id).cl!==S.clubId){V.agent=null;}else if(S.round-a.r>=3||a.s!==S.season){v11Agent('no',1);}return;}
 if(S.round<2||seasonOver()||RNG()>0.05)return;const avg=teamStrength(S.clubId).ovr;const c=clubPlayers(S.clubId).filter(p=>!p.loan&&p.ovr>=avg+1&&((p.hap||60)<75||v11Avg(p)>=7));if(!c.length)return;const p=pick(c);
 V.agent={id:p.id,pct:rint(20,45),r:S.round,s:S.season};addNews('🕴️',`Agent hráče ${p.n} požaduje zvýšení mzdy o ${V.agent.pct} %. Jinak prý začne jednat s jinými kluby.`);}
function v11Agent(k,auto){const V=v11();const a=V.agent;if(!a)return;const p=P(a.id);V.agent=null;if(!p){render();return;}
 if(k==='yes'){p.wm=Math.round((p.wm||1)*(1+a.pct/100)*100)/100;p.hap=clamp((p.hap||60)+15,0,100);p.mor=clamp((p.mor||60)+5,0,100);addNews('🕴️',`Dohoda s agentem: ${p.n} má o ${a.pct} % vyšší mzdu (${fmtMoney(playerWage(p))} týdně).`);}
 else if(k==='half'){if(RNG()<0.55){const h=Math.round(a.pct/2);p.wm=Math.round((p.wm||1)*(1+h/100)*100)/100;p.hap=clamp((p.hap||60)+6,0,100);addNews('🕴️',`Kompromis s agentem: ${p.n} bere o ${h} % víc.`);}else{p.hap=clamp((p.hap||60)-10,0,100);addNews('🕴️',`Agent hráče ${p.n} kompromis odmítl a odešel naštvaný.`);if(RNG()<0.4){p.wantOut=1;addNews('💼',`${p.n} chce přestoupit.`);}}}
 else{p.hap=clamp((p.hap||60)-18,0,100);p.mor=clamp((p.mor||60)-8,0,100);addNews('🕴️',auto?`Agent hráče ${p.n} se nedočkal odpovědi. Hráč je naštvaný.`:`Odmítl jsi agenta hráče ${p.n}. Hráč je naštvaný.`);if(RNG()<0.4){p.wantOut=1;addNews('💼',`${p.n} chce přestoupit, agent už obvolává kluby.`);v11Post('🗞️','Přestupové spekulace',vmGen(()=>vmFill(vmP(['{p} se prý po sporu o smlouvu poohlíží po novém klubu.','Spor o plat: {p} je prý naštvaný a chce pryč.','{p} a jeho agent prý už jednají s jinými kluby.','V kabině se šušká, že {p} po neúspěšném jednání o smlouvě zvažuje odchod.','Jednání o mzdě skončilo fiaskem. {p} prý myslí na přestup.'],'agrum'),{p:p.n})+(RNG()<0.5?' '+vmP(['Klub mlčí.','Fanoušci jsou nervózní.','Agent se k tomu nevyjádřil.','Situace se může rychle vyhrotit.'],'agrum2'):'')));}}
 saveGame();if(!auto)render();}

// ---------- 6) ošetřovna ----------
function v11MedWeek(){const V=v11();clubPlayers(S.clubId).forEach(p=>{const m=V.med[p.id];
 if(p.inj>0){if(!m)V.med[p.id]={w0:p.inj,d:p.inj>=3?0:2};else if(p.inj>m.w0)m.w0=p.inj;}
 else if(m){if(m.d===1){p.cond=100;p.mor=clamp((p.mor||60)+3,0,100);}delete V.med[p.id];}
 if(p._fr&&p.inj<=0){if(S.round>p._fr||p._frs!==S.season){delete p._fr;delete p._frs;}else if(RNG()<0.1){p.inj=rint(2,5);delete p._fr;addNews('🚑',`${p.n} se po uspěchaném návratu znovu zranil. Bude chybět ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.`);}}});
 for(const id in V.med){const p=P(id);if(!p||p.cl!==S.clubId)delete V.med[id];}}
function v11Med(id,k){const V=v11();const m=V.med[id];const p=P(id);if(!m||!p)return;
 if(k==='rush'){p.inj=Math.max(1,Math.ceil(p.inj/2));m.w0=Math.max(m.w0,p.inj);p._fr=S.round+8;p._frs=S.season;m.d=2;addNews('💉',`${p.n} půjde na urychlenou léčbu a vrátí se za ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}. Hrozí ale návrat zranění.`,1);}
 else{m.d=1;addNews('🩺',`${p.n} se doléčí v klidu. Vrátí se plně fit.`,1);}saveGame();render();}
function v11MedHtml(){const V=v11();const inj=clubPlayers(S.clubId).filter(p=>p.inj>0).sort((a,b)=>b.inj-a.inj);if(!inj.length)return '';
 return `<div class="card"><h3>🏥 Ošetřovna</h3>${inj.map(p=>{const m=V.med[p.id]||{w0:p.inj,d:2};const pct=Math.round(100*(1-p.inj/Math.max(p.inj,m.w0)));
  return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)"><div class="row small"><span style="flex:1;min-width:0">${posB(p.pos)} <b>${esc(p.n)}</b></span><span class="tiny mut">ještě ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}</span></div><div class="bar" style="margin-top:4px"><i style="width:${Math.max(4,pct)}%"></i></div>
  ${m.d===0?`<div class="tiny mut" style="margin:6px 0 4px">Lékař: „Můžeme ho dát dohromady rychleji, ale hrozí, že se zranění vrátí.“</div><div class="grid2" style="gap:6px"><button class="btn ghost" onclick="v11Med('${p.id}','rush')">⚡ Uspíšit návrat</button><button class="btn ghost" onclick="v11Med('${p.id}','rest')">🛌 Nechat doléčit</button></div>`:`<div class="tiny mut" style="margin-top:3px">${m.d===1?'Doléčuje se v klidu, vrátí se plně fit.':p._fr?'Urychlená léčba – po návratu hrozí recidiva.':'Standardní léčba.'}</div>`}</div>`;}).join('')}</div>`;}

// ---------- 7) trávník ----------
function v11PitchCost(k){const tv=myClub().tv||20000;return Math.max(10000,Math.round(tv*(k==='new'?2.2:0.6)/1000)*1000);}
function v11PitchFix(k){const V=v11();const c=v11PitchCost(k);if(myClub().money<c&&!S.inf){toast('Na to klub nemá peníze.');return;}money(-c,'wages',k==='new'?'Nový hybridní trávník':'Oprava trávníku');V.pitch=k==='new'?100:clamp(V.pitch+35,0,100);addNews('🌱',k==='new'?'Na stadionu je nový hybridní trávník.':'Greenkeepeři opravili rozbitá místa na trávníku.',1);saveGame();render();}
function v11PitchTxt(v){return v>=85?'výborný':v>=65?'dobrý':v>=45?'opotřebovaný':v>=25?'rozbitý':'tankodrom';}
function v11PitchHtml(){const v=Math.round(v11().pitch);return `<div class="card"><h3>🌱 Trávník na stadionu</h3><div class="row small"><span style="flex:1">Stav: <b class="${v<45?'bad':v<65?'warn':'good'}">${v11PitchTxt(v)}</b> (${v} %)</span></div><div class="bar" style="margin:6px 0"><i style="width:${v}%"></i></div><div class="tiny mut" style="margin-bottom:6px">Domácí zápasy a špatné počasí trávník ničí. Na rozbitém terénu je hra nepřesná a hráči se častěji zraní.</div><div class="grid2" style="gap:6px"><button class="btn ghost" ${v>=95?'disabled':''} onclick="v11PitchFix('fix')">🔧 Opravit · ${fmtMoney(v11PitchCost('fix'))}</button><button class="btn ghost" ${v>=98?'disabled':''} onclick="v11PitchFix('new')">✨ Nový trávník · ${fmtMoney(v11PitchCost('new'))}</button></div></div>`;}
(function(){const _cm=createMatch;createMatch=function(h,a,F){const M=_cm.apply(this,arguments);try{if(h===S.clubId&&M.wx)M.wx=Object.assign({},M.wx,{pitch:v11().pitch});}catch(e){}return M;};
 const _wf=wxFx;wxFx=function(w){const r=_wf.apply(this,arguments);try{if(w&&w.pitch!=null&&w.pitch<60){const f=0.9+0.1*w.pitch/60;r.acc=(r.acc||1)*f;r.inj=(r.inj||1)*1.25;}}catch(e){}return r;};})();

// ---------- 8) fanshop ----------
const V11_KIT={klas:['Klasika','Čistý střih v klubových barvách.',1,0],pruh:['Pruhovaný','Svislé pruhy, které fanoušci milují.',1.12,0.4],retro:['Retro 90. léta','Široký límec a výrazné vzory.',1.2,0.6],gold:['Limitovaná zlatá edice','Zlatý lem a číslovaná série.',1.32,1.1]};
const V11_SC={pruh:['Pruhovaná šála',1,0],kotel:['Kotelní šála „Až do konce!“',1.08,0.2],zim:['Zimní pletená šála',1.05,0.15],derby:['Derby edice',1.12,0.3]};
function v11ShopCost(k,sc){return Math.round((myClub().tv||20000)*((sc?V11_SC[k][2]:V11_KIT[k][3]))/1000)*1000;}
function v11Shop(k,sc){const V=v11();const S2=V.shop;if((sc?S2.sc:S2.kit)===k)return;const c=v11ShopCost(k,sc);if(c&&myClub().money<c&&!S.inf){toast('Na výrobu nové kolekce nejsou peníze.');return;}if(c)money(-c,'wages',sc?'Nová šála':'Nová kolekce dresů');if(sc)S2.sc=k;else S2.kit=k;
 addNews('👕',sc?`Fanshop začal prodávat novou šálu: ${V11_SC[k][0]}.`:`Klub představil nové dresy: ${V11_KIT[k][0]}. Fanoušci je okamžitě rozebírají.`,1);if(!sc)v11Post('💬','@'+vPick(V11_NICK,'nick',5),pick(['Nový dres je pecka, beru hned dva!','Ten nový dres… no, zvyknu si.','Konečně pořádný dres, jdu do fanshopu.']));saveGame();render();}
function v11ShopMul(){const V=v11();return (V11_KIT[V.shop.kit]||V11_KIT.klas)[2]*(V11_SC[V.shop.sc]||V11_SC.pruh)[1];}
function v11ShopWeek(){const V=v11();const me=myClub();const top=clubPlayers(S.clubId).reduce((m,p)=>Math.max(m,p.ovr),0);const star=top>=82?1.3:top>=75?1.12:1;
 const fan=(typeof fans==='function'?fans():60)/60;const inc=Math.round(((me.cap||8000)*0.55*fan*v11ShopMul()*star*(0.85+RNG()*0.3))/100)*100;if(inc>0){money(inc,'gate','Fanshop');V.shop.last=inc;V.shop.tot=(V.shop.ts===S.season?V.shop.tot:0)+inc;V.shop.ts=S.season;V.shop.n=Math.round(inc/65);}}
function v11Shirt(kit){const me=myClub();const c=me.c||['#c8102e','#ffffff'];const a=c[0],b=c[1]||'#fff';
 const pat=kit==='pruh'?`<path d="M38 22h8v62h-8zM54 22h8v62h-8zM70 22h8v62h-8z" fill="${b}" opacity=".9"/>`:kit==='retro'?`<path d="M26 40 L94 60 L94 70 L26 50z" fill="${b}" opacity=".85"/><path d="M44 14 L60 30 L76 14" stroke="${b}" stroke-width="7" fill="none"/>`:kit==='gold'?`<path d="M30 84h60" stroke="#f2c84b" stroke-width="5"/><path d="M44 14 L60 28 L76 14" stroke="#f2c84b" stroke-width="5" fill="none"/>`:`<path d="M44 14 L60 26 L76 14" stroke="${b}" stroke-width="5" fill="none"/>`;
 return `<svg viewBox="0 0 120 96" width="74" height="60" aria-hidden="true"><path d="M44 12 L28 18 L8 34 L20 50 L30 42 L30 88 L90 88 L90 42 L100 50 L112 34 L92 18 L76 12 Q60 22 44 12z" fill="${a}" stroke="rgba(0,0,0,.35)" stroke-width="2"/><clipPath id="sc${kit}"><path d="M44 12 L28 18 L8 34 L20 50 L30 42 L30 88 L90 88 L90 42 L100 50 L112 34 L92 18 L76 12 Q60 22 44 12z"/></clipPath><g clip-path="url(#sc${kit})">${pat}</g></svg>`;}
function v11ShopHtml(){const V=v11();const S2=V.shop;const b=(k,a,sc)=>{const on=(sc?S2.sc:S2.kit)===k;const c=v11ShopCost(k,sc);return `<button class="btn ${on?'gold':'ghost'} shopb" onclick="v11Shop('${k}',${sc?1:0})">${sc?'🧣':v11Shirt(k)}<span><b>${a[0]}</b><span class="tiny" style="display:block;font-weight:400">${on?'v prodeji':c?'výroba '+fmtMoney(c):'zdarma'}</span></span></button>`;};
 return `<div class="card"><h3>🛍️ Fanshop</h3><div class="small" style="margin-bottom:6px">Minulý týden: <b class="gold">${fmtMoney(S2.last||0)}</b>${S2.n?` · prodáno asi ${S2.n} kusů`:''}${S2.ts===S.season?` · sezóna celkem ${fmtMoney(S2.tot||0)}`:''}</div><div class="tiny mut" style="margin-bottom:6px">Prodej roste s náladou fanoušků, hvězdami v kádru a atraktivním designem.</div>
 <div class="small"><b>Dres</b></div><div class="grid2" style="gap:6px;margin:4px 0 8px">${Object.entries(V11_KIT).map(([k,a])=>b(k,a,0)).join('')}</div><div class="small"><b>Šála</b></div><div class="grid2" style="gap:6px;margin-top:4px">${Object.entries(V11_SC).map(([k,a])=>b(k,a,1)).join('')}</div></div>`;}

// ---------- 9) legendy a vyřazená čísla ----------
function v11Num(id){const V=v11();const used=new Set(Object.values(V.ret).map(x=>x.num));let n=2+hashStr('num'+id)%28;let g=0;while(used.has(n)&&g++<40)n=n%34+2;return n;}
function v11Legends(){const H=(S.v4&&S.v4.hof)||{};return Object.entries(H).filter(([id,x])=>x.ap>=70||x.g>=30).sort((a,b)=>(b[1].g*3+b[1].ap)-(a[1].g*3+a[1].ap)).slice(0,12);}
function v11Retire(id){const V=v11();const H=(S.v4&&S.v4.hof)||{};const x=H[id];if(!x||V.ret[id])return;const num=v11Num(id);V.ret[id]={n:x.n,num,s:S.season};fansAdd(3);addNews('🎽',`Klub navždy vyřadil dres s číslem ${num} na počest legendy ${x.n}.`);v11Post('💬','@'+vPick(V11_NICK,'nick',5),`Číslo ${num} už nikdo neobleče. ${x.n}, díky za všechno! ❤️`);saveGame();render();}
function v11LegHtml(){const V=v11();const L=v11Legends();const R=Object.values(V.ret);
 return `<div class="card"><h3>🎖️ Legendy klubu</h3>${L.length?L.map(([id,x])=>`<div class="row small" style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="flex:1;min-width:0"><b>${esc(x.n)}</b><div class="tiny mut">${x.ap} zápasů · ${x.g} gólů</div></span>${V.ret[id]?`<span class="tag y">č. ${V.ret[id].num} vyřazeno</span>`:`<button class="btn ghost sm" style="min-height:44px" onclick="v11Retire('${id}')">🎽 Vyřadit dres</button>`}</div>`).join(''):'<div class="small mut">Legendou se stane hráč, který za klub odehraje aspoň 70 zápasů nebo dá 30 gólů.</div>'}
 ${R.length?`<div class="small" style="margin-top:8px"><b>Vyřazená čísla:</b> ${R.map(r=>`${r.num} (${esc(r.n)})`).join(', ')}</div>`:''}</div>`;}

// ---------- 10) psychologická válka s trenérem soupeře ----------
const V11_MG={prov:['„Tenhle tým se nás bojí. Ve čtvrtek to uvidíte.“','„Jejich trenér může mluvit, my budeme hrát.“','„Na jejich stadionu jsme doma. Přijedeme si pro tři body.“'],
 resp:['Trenér soupeře: „Ať si mluví. Odpovíme na hřišti.“','Trenér soupeře: „Velká slova. Uvidíme, kdo se bude smát po zápase.“','Trenér soupeře: „Takové řeči nás jen nabudily. Děkuju mu.“','Trenér soupeře: „Asi má strach, když potřebuje mluvit tolik.“'],
 resp2:['Trenér soupeře: „Díky za uznání. Bude to férový souboj.“','Trenér soupeře: „Respekt je vzájemný.“']};
function v11Rival(F){if(!F||F.type==='cup')return false;const o=F.h===S.clubId?F.a:F.h;try{if(isDerby(S.clubId,o))return true;}catch(e){}const L=S.leagues[myClub().lg];if(!L)return false;const t=sortedTable(myClub().lg).map(r=>r.id||r.cid||r);const i=t.indexOf(o),j=t.indexOf(S.clubId);return i>=0&&(i<3||Math.abs(i-j)<=1);}
function v11MindGo(k){const V=v11();const F=nextMatch();if(!F)return;const o=F.h===S.clubId?F.a:F.h;V.mg={r:S.round,s:S.season,k,o};const me=clubPlayers(S.clubId);
 if(k==='prov'){const back=RNG()<0.35;me.forEach(p=>p.mor=clamp((p.mor||60)+(back?-2:5),0,100));v11Post('🎤',mgrRef?mgrRef(1):'Trenér',vPick(V11_MG.prov,'mgp',2));v11Post('🎤',CL(o).n,vPick(V11_MG.resp,'mgr',3));addNews('🎤',back?'Tvoje provokace se v kabině nesetkala s nadšením – hráči jsou spíš nervózní.':'Tvoje slova nabudila kabinu. Hráči se nemůžou dočkat výkopu.',1);}
 else if(k==='praise'){me.forEach(p=>p.mor=clamp((p.mor||60)+1,0,100));v11Post('🎤',CL(o).n,vPick(V11_MG.resp2,'mgr2',1));}
 saveGame();render();}
function v11MindHtml(){const V=v11();const F=seasonOver()?null:nextMatch();if(!F||!v11Rival(F))return '';if(V.mg&&V.mg.r===S.round&&V.mg.s===S.season)return '';const o=CL(F.h===S.clubId?F.a:F.h);if(!o)return '';
 return `<div class="card"><h3>🎤 Psychologická válka</h3><div class="small mut" style="margin-bottom:6px">Před zápasem s týmem ${esc(o.n)} čekají novináři na tvoje slova.</div><div class="col" style="gap:6px"><button class="btn ghost w100" onclick="v11MindGo('prov')">🔥 Rýpnout si do soupeře</button><button class="btn ghost w100" onclick="v11MindGo('praise')">🤝 Pochválit soupeře</button><button class="btn ghost w100" onclick="v11MindGo('none')">🤐 Bez komentáře</button></div></div>`;}
function v11MindAfter(M){const V=v11();const mg=V.mg;if(!mg||mg.k!=='prov'||mg.s!==S.season||mg.r!==S.round)return;const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];
 if(my>th){fansAdd(4);v11Post('📰','Sportovní deník','Slova dotažená do konce! Provokace před zápasem vyšla.');}else if(my<th){fansAdd(-4);v11Post('📰','Sportovní deník','Velká slova, malé činy. Provokace se vymstila.');}V.mg.k='done';}

// ---------- 11) výměna hráčů ----------
function v11SwapNeed(t,m){return Math.max(0,Math.round((playerValue(t)*1.08-playerValue(m)*0.92)/1e4)*1e4);}
function v11SwapList(id){const t=P(id);if(!t)return;const mine=clubPlayers(S.clubId).filter(p=>!p.loan&&p.id!==v11().cap).sort((a,b)=>playerValue(b)-playerValue(a)).slice(0,12);
 modal(`<h2>🔁 Výměna: ${esc(t.n)}</h2><div class="small mut" style="margin-bottom:8px">Nabídni hráče z kádru a případný doplatek. ${esc(CL(t.cl).n)} chce za ${esc(t.n)} asi ${fmtMoney(Math.round(playerValue(t)*1.08/1e4)*1e4)}.</div>
 ${mine.map(m=>{const cash=v11SwapNeed(t,m);const dis=cash>myClub().money&&!S.inf;return `<button class="btn ghost w100 edli" ${dis?'disabled':''} onclick="v11Swap('${id}','${m.id}',${cash})">${posB(m.pos)}<span style="flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.n)} <span class="tiny mut">· ${fmtMoney(playerValue(m))}</span></span><span class="tiny">${cash?'+ '+fmtMoney(cash):'bez doplatku'}</span></button>`;}).join('')}<button class="btn ghost w100" onclick="closeModal()">Zavřít</button>`);}
function v11Swap(tid,mid,cash){const t=P(tid),m=P(mid);if(!t||!m)return;if(typeof tbOn==='function'&&tbOn()){toast(typeof tbMsg==='function'?tbMsg():'Máš zákaz přestupů.');return;}if(!transferWindow()){toast('Přestupové okno je zavřené.');return;}
 if(cash>myClub().money&&!S.inf){toast('Na doplatek nemáš peníze.');return;}const from=t.cl;const fc=S.clubs[from];
 let ok=0.55+(m.ovr-t.ovr)*0.03-(ageOf(m)>31?0.25:0)+(GRP(m.pos)===GRP(t.pos)?0.1:0);if(t.ovr>=(fc.rep||60)+3)ok-=0.15;ok=clamp(ok,0.08,0.92);
 const will=clamp(0.7-Math.max(0,(t.ovr-(myClub().rep||60))-3)*0.08,0.1,0.95);closeModal();
 if(RNG()>ok){addNews('🔁',`Vedení klubu ${fc.n} výměnu odmítlo: ${m.n} + ${fmtMoney(cash)} za hráče ${t.n} je pro ně málo.`);render();return;}
 if(RNG()>will){addNews('🔁',`${fc.n} by výměnu bral, ale ${t.n} k vám přestoupit nechce.`);render();return;}
 if(cash){money(-cash,'tr_in','Výměna: '+t.n);money(0,'tr_out','');}movePlayer(m,from);movePlayer(t,S.clubId);t.cy=S.season+rint(2,4);
 addNews('🔁',`Výměna hotová! ${t.n} přichází z klubu ${fc.n}, opačným směrem míří ${m.n}${cash?` a doplatek ${fmtMoney(cash)}`:''}.`);v11Post('🗞️','Přestupové zprávy',`Výměna roku? ${t.n} za ${m.n}${cash?' a '+fmtMoney(cash):''}.`);saveGame();render();toast('🔁 Výměna dokončena');}

// ---------- 12) MS a Euro ----------
const V11_NT={'AR':90,'FR':90,'ES':90,'GB-ENG':88,'BR':88,'PT':87,'NL':85,'DE':85,'IT':83,'BE':83,'HR':82,'UY':80,'CO':80,'MA':80,'CH':79,'DK':79,'NO':78,'AT':78,'JP':78,'TR':77,'US':77,'MX':77,'SN':77,'EC':76,'CZ':75,'PL':75,'RS':75,'KR':75,'UA':75,'SE':75,'NG':74,'CI':74,'AU':73,'IR':73,'CA':73,'SK':73,'HU':73,'GB-SCT':72,'EG':72,'PY':72,'SI':71,'RO':71,'GE':71,'GR':72,'DZ':72,'TN':70,'GH':70,'SA':68,'QA':66,'GB-WLS':71,'IE':70};
const V11_EU=['ES','FR','GB-ENG','PT','DE','NL','IT','BE','HR','DK','CH','AT','TR','CZ','PL','RS','UA','SE','SK','HU','SI','NO','GB-SCT','GE'];
const V11_WC=['AR','FR','ES','GB-ENG','BR','PT','NL','DE','IT','BE','HR','UY','CO','MA','CH','DK','JP','US','MX','SN','EC','CZ','KR','NG','AU','IR','CA','EG','SA','QA','GH','TN'];
function v11NSquad(iso){return Object.values(S.players).filter(p=>p.nat===iso&&p.cl&&S.clubs[p.cl]&&!S.clubs[p.cl].tmp&&!p.yth).sort((a,b)=>b.ovr-a.ovr).slice(0,23);}
function v11NStr(iso){const base=V11_NT[iso]||68;const sq=v11NSquad(iso);if(sq.length>=11){const av=sq.slice(0,11).reduce((s,p)=>s+p.ovr,0)/11;return base*0.6+(av+4)*0.4;}return base;}
function v11Tour(kind,year){const T=kind==='eu'?V11_EU:V11_WC;const str={};const sq={};T.forEach(i=>{str[i]=v11NStr(i);sq[i]=v11NSquad(i);});const goals={};
 const g=(a,b)=>{const x=1.3*Math.exp((str[a]-str[b])/16),y=1.3*Math.exp((str[b]-str[a])/16);const [ga,gb]=segGoals(x,y);[[a,ga],[b,gb]].forEach(([t,n])=>{const s=sq[t];if(s.length>=11)for(let k=0;k<n;k++){const p=pickScorer(s.slice(0,14).map(p=>p.id));if(p)goals[p.id]=(goals[p.id]||0)+1;}});return [ga,gb];};
 const seeded=T.slice().sort((a,b)=>str[b]-str[a]);const ng=kind==='eu'?6:8;const G=[...Array(ng)].map(()=>[]);seeded.forEach((t,i)=>{const r=Math.floor(i/ng);G[r%2?ng-1-(i%ng):i%ng].push(t);});
 const tables=G.map(gr=>{const tb={};gr.forEach(t=>tb[t]={t,p:0,gf:0,ga:0});for(let i=0;i<gr.length;i++)for(let j=i+1;j<gr.length;j++){const [x,y]=g(gr[i],gr[j]);const A=tb[gr[i]],B=tb[gr[j]];A.gf+=x;A.ga+=y;B.gf+=y;B.ga+=x;if(x>y)A.p+=3;else if(y>x)B.p+=3;else{A.p++;B.p++;}}
  return Object.values(tb).sort((a,b)=>b.p-a.p||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||RNG()-0.5);});
 let q=[];tables.forEach(t=>q.push(t[0]));tables.forEach(t=>q.push(t[1]));if(kind==='eu'){const th=tables.map(t=>t[2]).sort((a,b)=>b.p-a.p||(b.gf-b.ga)-(a.gf-a.ga));q=q.concat(th.slice(0,4));}
 let ko=q.map(x=>x.t);const stage={};T.forEach(t=>stage[t]='skupina');const rounds=['osmifinále','čtvrtfinále','semifinále','finále'];let fin=null;const path=[];
 rounds.forEach((rn,ri)=>{const nx=[];const n=ko.length;for(let i=0;i<n/2;i++){const a=ko[i],b=ko[n-1-i];stage[a]=rn;stage[b]=rn;let [x,y]=g(a,b);let note='';if(x===y){const [e1,e2]=g(a,b).map(v=>Math.round(v/3));x+=e1;y+=e2;if(x===y){note=' pen.';if(RNG()<0.5+(str[a]-str[b])/100)x+=0.1;else y+=0.1;}else note=' po prodl.';}
  const w=x>y?a:b;nx.push(w);const sc=`${Math.floor(x)}:${Math.floor(y)}${note}`;if(ri===3)fin={a,b,sc,w};if(a==='CZ'||b==='CZ'||a==='SK'||b==='SK')path.push(`${rn}: ${natName(a)} – ${natName(b)} ${sc}`);}ko=nx;});
 stage[fin.w]='vítěz';const known=Object.entries(goals).sort((a,b)=>b[1]-a[1]);const ts=known[0]?{n:P(known[0][0]).n,nat:P(known[0][0]).nat,g:known[0][1]}:null;
 const my=[];T.forEach(t=>sq[t].forEach(p=>{if(p.cl===S.clubId)my.push({id:p.id,n:p.n,nat:t,g:goals[p.id]||0,st:stage[t]});}));
 const R={k:kind,y:year,win:fin.w,fin,stage,cz:stage.CZ||null,sk:stage.SK||null,path,ts,my,grp:tables.map(t=>t.map(x=>[x.t,x.p,x.gf,x.ga]))};
 my.forEach(x=>{const p=P(x.id);if(!p)return;p.mor=clamp((p.mor||60)+(x.st==='vítěz'?15:x.st==='skupina'?-3:4),0,100);p.hap=clamp((p.hap||60)+(x.st==='vítěz'?10:2),0,100);p.cond=Math.min(p.cond||100,78);});
 const V=v11();V.tour=V.tour.filter(x=>!(x.k===kind&&x.y===year));V.tour.push(R);if(V.tour.length>12)V.tour.shift();
 const nm=kind==='eu'?'Euro':'Mistrovství světa';addNews('🌍',`${nm} ${year}: vítězem je ${natName(fin.w)}! Finále: ${natName(fin.a)} – ${natName(fin.b)} ${fin.sc}.${R.cz?` Česko: ${R.cz}.`:''}`);
 if(my.length)addNews('🌍',`Na turnaji hrálo ${my.length} ${czPlural(my.length,'tvůj hráč','tvoji hráči','tvých hráčů')}: ${my.slice(0,5).map(x=>x.n+' ('+natName(x.nat)+(x.g?', '+x.g+' '+czPlural(x.g,'gól','góly','gólů'):'')+')').join(', ')}.`,1);return R;}
function v11TourHtml(R,full){if(!R)return '';const nm=R.k==='eu'?'🇪🇺 Euro':'🌍 Mistrovství světa';
 return `<div class="card" style="padding:10px 12px"><h3 style="margin-bottom:4px">${nm} ${R.y}</h3><div class="small">🏆 Vítěz: <b>${esc(natName(R.win))}</b></div><div class="small mut">Finále: ${esc(natName(R.fin.a))} – ${esc(natName(R.fin.b))} ${R.fin.sc}</div>
 ${R.cz?`<div class="small" style="margin-top:4px">🇨🇿 Česko: <b>${R.cz}</b></div>`:'<div class="small mut" style="margin-top:4px">🇨🇿 Česko se na turnaj nekvalifikovalo.</div>'}${R.sk?`<div class="small">🇸🇰 Slovensko: <b>${R.sk}</b></div>`:''}
 ${full!==false&&R.path.length?`<div class="tiny mut" style="margin-top:4px">${R.path.map(esc).join('<br>')}</div>`:''}${R.ts?`<div class="small" style="margin-top:4px">👟 Nejlepší střelec z tvých lig: ${esc(R.ts.n)} (${esc(natName(R.ts.nat))}, ${R.ts.g} ${czPlural(R.ts.g,'gól','góly','gólů')})</div>`:''}
 ${R.my.length?`<div class="small" style="margin-top:4px">Tvoji hráči: ${R.my.map(x=>esc(x.n)+' – '+esc(natName(x.nat))).join(', ')}</div>`:''}
 ${full!==false?`<details style="margin-top:6px"><summary class="small" style="min-height:44px;display:flex;align-items:center">Skupiny</summary>${R.grp.map((g,i)=>`<div class="tiny" style="margin:4px 0"><b>Skupina ${String.fromCharCode(65+i)}:</b> ${g.map(x=>`${esc(natName(x[0]))} ${x[1]} b.`).join(', ')}</div>`).join('')}</details>`:''}</div>`;}
function v11TourKind(y){return y%4===2?'wc':y%4===0?'eu':null;}

// ---------- 13) přátelské zápasy podle výběru ----------
function v11FrOpts(){const me=myClub();const pool=S.W?Object.keys(S.W.str).filter(r=>CL(r)&&r!==S.clubId):Object.keys(S.clubs).filter(id=>id!==S.clubId&&!S.clubs[id].tmp);const sm=clubStr(S.clubId);
 const h=hashStr('fr'+S.season+S.clubId);const by=(lo,hi)=>pool.filter(r=>{const d=clubStr(r)-sm;return d>=lo&&d<=hi;});const pk=(a,i)=>a.length?a[(h+i*7)%a.length]:null;
 return [['💪 Silnější soupeř',pk(by(5,25),1)],['⚖️ Vyrovnaný soupeř',pk(by(-4,4),2)],['🙂 Slabší soupeř',pk(by(-25,-5),3)]].filter(x=>x[1]);}
function v11FrSheet(res){const V=S.v4;const pre=V.pre&&V.pre.s===S.season?V.pre:(V.pre={s:S.season});const L=pre.frL||[];const left=3-L.length;
 modal(`<h2>🤝 Přípravné zápasy</h2><div class="small mut" style="margin-bottom:8px">Vyber si soupeře (max. 3 zápasy). Silnější soupeř víc prověří tým, slabší zvedne sebevědomí.</div>
 ${res?`<div class="card" style="padding:8px 12px">${res}</div>`:''}${L.length?`<div class="small" style="margin-bottom:6px">Odehráno: ${L.map(esc).join(' · ')}</div>`:''}
 ${left>0?v11FrOpts().map(([l,r])=>`<button class="btn ghost w100" style="margin-bottom:6px;text-align:left" onclick="v11FrPlay('${r}')">${l}: <b>${esc(CL(r).n)}</b></button>`).join(''):'<div class="small">Přípravu máš hotovou.</div>'}
 <button class="btn gold w100" onclick="v11FrDone()">${left>0&&L.length?'Ukončit přípravu':'Hotovo'}</button>`);}
function v11FrPlay(r){const V=S.v4;const pre=V.pre;pre.frL=pre.frL||[];if(pre.frL.length>=3)return;const o=CL(r);const [xh,xa]=xgPair(strOf(S.clubId),strOf(r));const [gh,ga]=segGoals(xh,xa);
 const xi=autoLineup(S.clubId,S.clubs[S.clubId].form||bestForm(S.clubId)).xi.filter(Boolean);const sc=[];for(let i=0;i<gh;i++){const p=pickScorer(xi);if(p)sc.push(pSurname(p));}
 const d=clubStr(r)-clubStr(S.clubId);S.cohesion=clamp((S.cohesion||50)+2,0,100);const ps=clubPlayers(S.clubId);const md=gh>ga?(d>0?5:2):gh<ga?(d>0?0:-3):1;ps.forEach(p=>p.mor=clamp((p.mor||60)+md,0,100));
 let inj='';if(RNG()<0.06){const p=pick(ps);if(p&&p.inj<=0){p.inj=1;inj=` ${p.n} si přivodil lehké zranění.`;}}
 const inc=Math.round(((myClub().cap||8000)*0.2*6)/100)*100;money(inc,'gate','Přátelský zápas');const line=`${o.n} ${gh}:${ga}`;pre.frL.push(line);
 const res=`<div class="small"><b>${esc(myClub().n)} – ${esc(o.n)} ${gh}:${ga}</b></div>${sc.length?`<div class="tiny mut">Góly: ${sc.map(esc).join(', ')}</div>`:''}<div class="tiny mut">Sehranost +2 · vstupné ${fmtMoney(inc)}.${esc(inj)}</div>`;
 if(pre.frL.length>=3){pre.fr=pre.frL.slice();addNews('🤝',`Přípravné zápasy: ${pre.frL.join(', ')}.`);}saveGame();v11FrSheet(res);}
function v11FrDone(){const pre=S.v4.pre;if(pre&&pre.frL&&pre.frL.length&&!pre.fr){pre.fr=pre.frL.slice();addNews('🤝',`Přípravné zápasy: ${pre.frL.join(', ')}.`);}closeModal();saveGame();render();}
friendlies=function(){v11FrSheet();};

// ---------- napojení na hru ----------
(function(){
 const _am=v4AfterMatch;v4AfterMatch=function(M){const r=_am.apply(this,arguments);try{v11MatchMedia(M);v11Records(M);v11MindAfter(M);if(M.sides[userSide(M)]===M.h){const V=v11();const k=M.wx&&M.wx.k;V.pitch=clamp(V.pitch-rint(3,5)-(k==='rain'||k==='snow'?3:0),5,100);}}catch(e){console.warn(e);}return r;};
 const _wt=weekTick;weekTick=function(){const r=_wt.apply(this,arguments);try{const V=v11();V.pitch=clamp(V.pitch+1.5,0,100);v11Cap();v11MedWeek();v11PromWeek();v11AgentWeek();v11ShopWeek();v11Potm();v11Rumour();
  const c=V.cap&&P(V.cap);if(c&&S.tac&&S.tac.xi&&S.tac.xi.includes(c.id)){S.cohesion=clamp((S.cohesion||50)+0.15,0,100);if((c.mor||60)<35)clubPlayers(S.clubId).forEach(p=>p.mor=clamp((p.mor||60)-0.5,0,100));}}catch(e){console.warn(e);}return r;};
 const _es=endSeason;endSeason=function(){let A=null;try{A=v11Awards();}catch(e){console.warn(e);}const rep=_es.apply(this,arguments);try{const V=v11();V.pitch=clamp(V.pitch+35,0,100);rep.v11aw=A;const y=rep.season+1;const k=v11TourKind(y);if(k)rep.v11t=v11Tour(k,y);}catch(e){console.warn(e);}return rep;};
 const _ue=uiEndSeason;uiEndSeason=function(){let rep=null;const _e2=endSeason;endSeason=function(){rep=_e2.apply(this,arguments);return rep;};let r;try{r=_ue.apply(this,arguments);}finally{endSeason=_e2;}
  try{const m=document.querySelector('.modal');if(m&&rep){const d=document.createElement('div');d.innerHTML=(rep.v11aw?v11AwHtml(rep.v11aw):'')+(rep.v11t?v11TourHtml(rep.v11t,false):'');const btn=m.querySelector('.btn.big,.mstick');if(btn)btn.parentNode.insertBefore(d,btn);else m.appendChild(d);}}catch(e){console.warn(e);}return r;};
 const _hc=v4HomeCards;v4HomeCards=function(){let h=_hc.apply(this,arguments);try{h=v11HomeTop()+h+v11MindHtml()+v11MedHtml()+v11MediaCard();}catch(e){console.warn(e);}return h;};
 const _rc=renderCareer;renderCareer=function(){let h=_rc.apply(this,arguments);try{const V=v11();const aw=V.aw.slice().reverse();const tr=V.tour.slice().reverse();
  h=v11RecHtml()+h+(aw.length?aw.slice(0,3).map(a=>v11AwHtml(a)).join(''):'<div class="card"><h3>🏆 Ocenění ligy</h3><div class="small mut">Po skončení sezóny se tu objeví Zlatý míč, král střelců a nejlepší jedenáctka.</div></div>')
   +(V.potm.length?`<div class="card"><h3>🏅 Hráči měsíce</h3>${V.potm.slice(-6).reverse().map(x=>`<div class="row small" style="padding:3px 0"><span style="flex:1">${esc(x.n)} <span class="tiny mut">· ${esc(x.c)}</span></span><span class="tiny mut">${x.r}. kolo ${seasonLabel(x.s)}</span></div>`).join('')}</div>`:'')
   +v11LegHtml()+(tr.length?tr.map(t=>v11TourHtml(t)).join(''):`<div class="card"><h3>🌍 Velké turnaje</h3><div class="small mut">Mistrovství světa a Euro se hrají v létě po sezóně (nejbližší: ${v11NextTour()}). Uvidíš, kdo z tvých hráčů pojede.</div></div>`);}catch(e){console.warn(e);}return h;};
 const _rcl=renderClub;renderClub=function(){const h=_rcl.apply(this,arguments);try{if((UI.clubTab||'fin')==='fin'&&typeof h==='string')return h+v11ShopHtml()+v11PitchHtml();}catch(e){console.warn(e);}return h;};
 const _ps=playerSheet;playerSheet=function(id){const r=_ps.apply(this,arguments);try{const p=P(id);const m=document.querySelector('.modal');if(p&&m&&!m.querySelector('.v11act')){const d=document.createElement('div');d.className='v11act';
   if(p.cl===S.clubId){const cap=v11Cap()===id;d.innerHTML=`<div class="grid2" style="gap:6px;margin-top:8px"><button class="btn ghost" onclick="closeModal();v11TalkSheet('${id}')">🗣️ Promluvit si</button><button class="btn ${cap?'gold':'ghost'}" ${cap?'disabled':''} onclick="v11SetCap('${id}')">${cap?'©️ Kapitán týmu':'©️ Jmenovat kapitánem'}</button></div>${v11().prom[id]?`<div class="tiny mut" style="margin-top:4px">⏱️ Slíbil jsi mu víc minut (do ${v11().prom[id].until}. kola).</div>`:''}${p.wantOut?'<div class="tiny bad" style="margin-top:4px">💼 Hráč chce odejít.</div>':''}`;}
   else if(S.clubs[p.cl]&&!S.clubs[p.cl].tmp&&transferWindow())d.innerHTML=`<button class="btn ghost w100" style="margin-top:8px" onclick="closeModal();v11SwapList('${id}')">🔁 Nabídnout výměnu hráčů</button>`;
   const ed=m.querySelector('.edopen');if(ed)m.insertBefore(d,ed);else m.appendChild(d);}}catch(e){console.warn(e);}return r;};
})();
function v11NextTour(){for(let y=S.season+1;y<S.season+6;y++){const k=v11TourKind(y);if(k)return (k==='eu'?'Euro ':'MS ')+y;}return '';}
function v11HomeTop(){const V=v11();const items=[];if(seasonOver())return '';
 if(!v11Cap())items.push(`<div class="row small todo"><span style="flex:1">©️ Tým nemá kapitána.</span><button class="btn ghost sm" style="min-height:44px" onclick="go('squad')">Vybrat</button></div>`);
 const exp=clubPlayers(S.clubId).filter(p=>!p.loan&&(p.cy||0)<=S.season).length;if(exp&&S.round>=Math.floor(S.maxRound/2))items.push(`<div class="row small todo"><span style="flex:1">📝 ${exp} ${czPlural(exp,'hráči končí','hráčům končí','hráčům končí')} smlouva.</span><button class="btn ghost sm" style="min-height:44px" onclick="go('squad')">Kádr</button></div>`);
 const a=V.agent&&P(V.agent.id);let ag='';if(a)ag=`<div class="card"><h3>🕴️ Agent hráče ${esc(a.n)}</h3><div class="small mut" style="margin-bottom:6px">Chce zvýšení mzdy o <b>${V.agent.pct} %</b> (z ${fmtMoney(playerWage(a))} týdně). Jinak začne jednat s jinými kluby.</div><div class="col" style="gap:6px"><button class="btn ghost w100" onclick="v11Agent('yes')">✅ Přijmout</button><button class="btn ghost w100" onclick="v11Agent('half')">🤝 Nabídnout polovinu</button><button class="btn ghost w100" onclick="v11Agent('no')">❌ Odmítnout</button></div></div>`;
 const pr=Object.entries(V.prom).map(([id,x])=>{const p=P(id);return p?`<div class="row small todo"><span style="flex:1">⏱️ Slib: ${esc(p.n)} – ${(p.st?p.st.ap:0)-x.ap0}/3 zápasů do ${x.until}. kola</span></div>`:'';}).join('');
 return (items.length||pr?`<div class="card" style="padding:10px 12px"><h3 style="margin-bottom:4px">📋 Úkoly</h3>${items.join('')}${pr}</div>`:'')+ag;}
function v11MediaCard(){const V=v11();if(!V.feed.length)return '';return `<div class="card"><h3>📰 Média a sociální sítě</h3>${v11FeedHtml(3)}<button class="btn ghost w100" style="margin-top:6px" onclick="v11FeedSheet()">Zobrazit vše</button></div>`;}

// v11m: média a sociální sítě – skládané texty, různé redakce a persony, trvalá kontrola opakování
const VM_OUT={
 ser:[['📰','Sportovní deník'],['📰','Fotbalový týdeník'],['📻','Rádio Sport'],['📰','Deník Hřiště']],
 tab:[['🗞️','Bulvár Šťáva'],['🗞️','Večerník Senzace'],['🗞️','Drbna ze šatny']],
 sta:[['📊','@Čísla_a_góly'],['📊','@xG_Analytik']]};
const VM_H={ser:{
 bigw:['Jasná záležitost: {me} – {opp} {sc}','{TM} rozstřílel soupeře, skončilo to {sc}','Suverénní výkon: {me} – {opp} {sc}','{TM} nedal soupeři šanci a vyhrál {sc}','Gólové hody: {me} – {opp} {sc}','Výsledek {sc} odpovídá průběhu, {tm} byl o třídu lepší','Kanonáda v podání týmu {me}: {sc}','{me} – {opp} {sc}. Zápas bez debat','Soupeř {opp} odjíždí s výpraskem {sc}','Demonstrace síly: {me} – {opp} {sc}'],
 w:['{me} – {opp} {sc}, tři body jsou doma','{TM} zvládl zápas se soupeřem {opp} ({sc})','Výhra {sc}: {tm} je spokojený','{TM} přetlačil soupeře {opp} {sc}','Tři body pro {me} po výsledku {sc}','{me} – {opp} {sc}. Pracovní, ale důležitá výhra','{TM} zvítězil {sc} a jde dál','Těsně, ale vítězně: {me} – {opp} {sc}','{TM} si poradil se soupeřem {opp} ({sc})','Vítězství {sc} drží {tm} v laufu'],
 d:['Dělba bodů: {me} – {opp} {sc}','{me} a {opp} se rozešli smírně ({sc})','Remíza {sc}, se kterou nikdo neodchází nadšený','{me} – {opp} {sc}. Bod pro každého','Nerozhodně {sc}: {tm} nedokázal soupeře zlomit','Body se dělily: {me} – {opp} {sc}','{TM} remizoval {sc}, šance na víc tu byly','Smírný výsledek {sc} mezi týmy {me} a {opp}'],
 l:['{me} – {opp} {sc}. Body jsou pryč','Prohra {sc}: {tm} na soupeře nestačil','{TM} odchází z utkání se soupeřem {opp} poražen ({sc})','Zaváhání: {me} – {opp} {sc}','{TM} padl {sc} a má o čem přemýšlet','Body bere soupeř {opp}, {tm} prohrál {sc}','{me} – {opp} {sc}. Výkon, který nestačil','Porážka {sc} mrzí, {tm} hrál pod svoje možnosti'],
 bigl:['Debakl: {me} – {opp} {sc}','{TM} schytal výprask {sc}','Krutá lekce: {me} – {opp} {sc}','{TM} se pod náporem soupeře sesypal ({sc})','Noc, na kterou {me} rychle zapomene: {sc}','Propadák: {me} – {opp} {sc}','Výsledek {sc} bolí. {TM} byl bez šance'],
 derby:['Derby je doma! {me} – {opp} {sc}','{TM} vyhrál prestižní souboj {sc}','Město patří týmu {me}: derby skončilo {sc}','{TM} ovládl derby se soupeřem {opp} ({sc})','Derby pro {me}, rival {opp} padl {sc}'],
 derbyl:['Derby pro rivala: {me} – {opp} {sc}','{TM} prohrál derby {sc}','Bolestné derby: {opp} slaví, {tm} prohrál {sc}','{TM} v derby neuspěl ({sc})']},
tab:{
 bigw:['ŠOK PRO SOUPEŘE! {TM} nasázel {sc}!','MASAKR! Soupeř {opp} smeten {sc}!','Tohle nikdo nečekal: {me} – {opp} {sc}!','Gólová smršť! {TM} drtí {sc}!','Hosté brečí, {tm} tančí: {sc}!','Ponížení! {opp} padá {sc}!'],
 w:['{TM} slaví, výhra {sc}!','Hurá! {TM} bere tři body ({sc})!','Úleva! {TM} vyhrál {sc}!','Šampaňské do šatny: {me} – {opp} {sc}!','Vítězný tanec: {me} – {opp} {sc}!','Takhle se vyhrává! {me} {sc}!'],
 d:['Nuda, nebo drama? {me} – {opp} {sc}','Ani ryba, ani rak: {sc}!','Remíza, která naštvala fanoušky: {sc}','Bod? Fanoušci chtěli víc! {me} – {opp} {sc}','Ztráta, nebo zisk? {TM} remizoval {sc}','Plichta! {me} – {opp} {sc}'],
 l:['KRIZE?! {TM} prohrál {sc}!','Šatna v šoku: {tm} padl {sc}!','Fanoušci zuří! {me} – {opp} {sc}','Průšvih! {TM} ztratil body ({sc})!','Kdo za to může? {TM} prohrál {sc}','Zase prohra! {me} – {opp} {sc}'],
 bigl:['OSTUDA! {TM} schytal {sc}!','Hanba roku! {me} – {opp} {sc}!','Totální rozklad! {TM} padl {sc}!','Tohle se nedá omluvit: {sc}!','Fanoušci chtějí hlavy! {me} – {opp} {sc}!'],
 derby:['DERBY! {TM} ponížil rivala {sc}!','Město šílí! {me} – {opp} {sc}!','Rival na kolenou! Derby skončilo {sc}!','Hospody praskají ve švech: {tm} vyhrál derby {sc}!'],
 derbyl:['Pohroma v derby! {me} – {opp} {sc}!','Rival se směje, {tm} prohrál {sc}!','Derby jako noční můra: {sc}!']}};
const VM_D={
 sc1:['Jediný gól dal {s} v {m}. minutě.','Rozhodla trefa, kterou dal v {m}. minutě {s}.','O výsledku rozhodl {s} ({m}.).','Gól zápasu: {s}, {m}. minuta.','Jedinou branku zaznamenal {s} v {m}. minutě.'],
 scn:['Střelci: {list}.','Na listinu střelců se zapsali {list}.','Branky: {list}.','Góly dali {list}.','Skórovali {list}.'],
 brace:['{s} se blýskl dvěma góly.','Dvakrát se trefil {s}.','{s} skóroval dvakrát a byl k nezastavení.','Dvougólový večer zažil {s}.'],
 hat:['{s} zaznamenal hattrick!','Hattrick! {s} dal tři góly.','Tři góly jednoho hráče: {s} si odnáší míč domů.'],
 late:['Vítěznou branku dal {s} až v {m}. minutě.','Rozhodnutí přišlo až v {m}. minutě, postaral se o něj {s}.','Drama do konce: {s} skóroval v {m}. minutě.','V {m}. minutě vystřelil body {s}.'],
 latel:['Inkasovaný gól v {m}. minutě rozhodl.','Body utekly v {m}. minutě.','Rána z milosti přišla v {m}. minutě.'],
 comeb:['Tým otočil zápas po vedení soupeře.','Tým dokázal otočit nepříznivý stav.','Obrat jako z učebnice: tým prohrával, a přesto vyhrál.','Z prohry výhra – mužstvo prokázalo charakter.'],
 blown:['Tým přitom vedl, ale náskok neudržel.','Vedení se nakonec nepodařilo udržet.','Tým ztratil vedení a s ním i body.'],
 redme:['Velkou roli sehrála červená karta: {s} musel předčasně pod sprchu.','{s} viděl červenou a tým to výrazně oslabilo.','{s} byl vyloučen a to zamíchalo kartami.','Po červené kartě, kterou viděl {s}, hrál tým v deseti.'],
 redop:['Soupeř dohrával v deseti, červenou viděl {s}.','Hostům nepomohlo vyloučení, které schytal {s}.','Klíčovým momentem byla červená karta, kterou viděl {s}.'],
 cs:['Brankář {s} udržel čisté konto.','{s} v brance nepustil nic.','Nula vzadu – v brance zářil {s}.','{s} vychytal nulu.'],
 motm:['Hráčem zápasu byl {s} se známkou {r}.','Nejlépe hodnoceným mužem byl {s} ({r}).','{s} si vysloužil známku {r}.','{s} odehrál zápas na známku {r}.'],
 motml:['Jediný světlý bod: {s} se známkou {r}.','I v porážce zaujal {s} ({r}).'],
 wst:['Je to už {n}. výhra v řadě.','Série vítězství se natáhla na {n} {zap}.','{TM} vyhrál {n} {zap} za sebou.','Vítězná šňůra trvá už {n} utkání.','Výhra číslo {n} v řadě!'],
 ust:['Tým je bez porážky už {n} {zap}.','Neporazitelnost trvá {n} utkání.','Už {n} {zap} bez prohry.','Prohra? Ta nepřišla už {n} {zap}.'],
 lst:['Je to už {n}. prohra v řadě.','Krize se prohlubuje: {n} {por} za sebou.','{n} {proh} po sobě – alarm v kabině.','Černá série: {n}. porážka za sebou.'],
 nwst:['Tým nevyhrál už {n} {zap}.','Na výhru se čeká {n} utkání.','{n} {zap} bez vítězství – trpělivost dochází.'],
 pos1:['{TM} vede tabulku.','Po {r}. kole je {me} na čele.','Tabulce kraluje {me}.','{TM} se drží na prvním místě.'],
 posT:['{TM} je po {r}. kole {pos}. v tabulce.','V tabulce to znamená {pos}. místo.','Aktuálně {pos}. příčka.','Tým se drží na {pos}. místě.'],
 posB:['V tabulce to je {pos}. místo a sestupové starosti.','{TM} je {pos}. a dole začíná být horko.','Pohled na tabulku nepotěší: {pos}. místo.'],
 shots:['Střely {sh}:{osh}, na branku {sot}.','Statistiky: střely {sh}:{osh}, na branku {sot}.','Střelecky to bylo {sh}:{osh}.','Na střely to skončilo {sh}:{osh}.'],
 xg:['Očekávané góly (xG) {xg}:{oxg}.','Podle xG to bylo {xg}:{oxg}.','Hodnota xG {xg}:{oxg} ukazuje, kdo měl víc šancí.'],
 att:['Zápas sledovalo {att} diváků.','Na stadionu bylo {att} lidí.','Návštěva: {att} diváků.','Atmosféru vytvořilo {att} fanoušků.'],
 pen:['Jeden z gólů padl z penalty.','Penalta sehrála svou roli.','Na výsledku se podepsal i pokutový kop.'],
 wx:['Hrálo se v nepříjemném počasí.','Počasí zápasu nepřálo.','Déšť a vítr hráčům nic neusnadnily.']};
const VM_C={ser:{g:['Na tenhle výkon se dá navázat.','Kabina má na čem stavět.','Výkon dává naději do dalších kol.','Trenér může být spokojený.','Takhle si to fanoušci představují.','Nálada v klubu jde nahoru.','Tým potvrdil, že patří k lepší polovině ligy.'],
 n:['Příští kolo ukáže, kam tým směřuje.','Tým teď čeká týden tréninku.','Uvidíme, jak na to tým naváže.','Trenér bude chtít víc.','Na zlepšení je pořád prostor.'],
 b:['Trenér má o čem přemýšlet.','Analýza zápasu bude dlouhá.','Kabina potřebuje reakci.','Takhle se o horní patra hrát nedá.','Vedení bude chtít vysvětlení.','Týden tréninku bude náročný.']},
 tab:{g:['Prý se slavilo do rána!','Fanoušci už píšou na sítě!','Hospody to řeší do rána!','Tohle nemá obdoby!','V šatně prý létalo šampaňské!'],
 n:['Tohle se bude probírat celý týden!','Sledujte, co se bude dít dál!','Fanoušci si šuškají!'],
 b:['Šatna prý bouří!','Prý tekly slzy!','Hrozí prý velký úklid v kádru!','Fanoušci už píšou na sítě!','V kabině prý létaly lahve!']}};
const VM_P={ultra:{n:['Ultras_Jirka','Kapitán_Kotle','Kotelník_Pepa','Bubeník_Láďa','Pyro_Marek','Tribuna_Sever'],
  pos:['Kotel dneska jel, tým taky!','Zpívali jsme 90 minut a stálo to za to!','Tohle je náš klub, tohle je náš stadion!','Takhle se hraje před kotlem!','Šály nahoru, dneska se slaví!','Hlasivky v háji, ale to je jedno!','Pivo na mě, chlapi!'],
  neu:['Zpívali jsme za dva, kluci hráli za půl.','Kotel makal víc než záloha.','Bod beru, ale srdce chci vidět víc.','Stáli jsme za nima, příště chceme výhru.'],
  neg:['Takhle ne, pánové. Kotel si to nezaslouží.','Dresy dolů, jestli hrajete takhle!','Platíme vstupný a dostaneme tohle? Kurva.','Kotel ztichne, dokud se nezačnete rvát!','Až přijdete pod kotel, něco si řekneme.','Za tenhle výkon by se styděl i dorost.']},
 hater:{n:['Kritik_Karel','Věčně_nespokojený','Nadávač_Ota','Skeptik_Mira','Hejtr_z_Brna'],
  pos:['Výhra, no a? Proti takovýmu soupeři by vyhrál i dorost.','Hezký, ale za týden to zase pokazí.','Neusínat na vavřínech, tohle nic neznamená.','Furt mě nepřesvědčili.','Jednou vyhrajou a všichni jsou nadšení. Já ne.'],
  neu:['Remíza = prohra. Hotovo.','Trenére, kdy konečně něco změníš?','Typická šeď. Proč tam furt hraje stejná sestava?','Nuda. Šel jsem domů v 70. minutě.'],
  neg:['Trenér out! Hned!','Do prdele, tohle už se nedá sledovat.','Prodat půlku kádru a začít znova.','Kdo podepsal tyhle smlouvy?!','Obrana jak cedník, záloha jak turisti.','Ani zadarmo bych na to nešel.','Vracím permanentku. Fakt.']},
 opt:{n:['Věčný_optimista','Zelený_Mirek','Mladej_fanda','Babička_z_tribuny','Rodinná_tribuna'],
  pos:['Já to říkal! Tohle mužstvo má na všechno!','Krásnej fotbal, děkujeme! ❤️','Tohle je začátek něčeho velkého.','Vnoučata jásala, já taky!','Mistrovská forma, nikdo nás nezastaví!'],
  neu:['Bod je bod, jedeme dál!','Hlavu vzhůru, příště to bude lepší.','Aspoň neprohráli. Věřím jim!','Pořád věřím, sezóna je dlouhá.'],
  neg:['Nevadí, kluci, další zápas to zlomíme.','Jsme s vámi i v těžkých chvílích.','Každý má špatný den. Hlavu vzhůru!','I tak vás mám rád. Ale bolí to.']},
 vet:{n:['Věrný_od_1998','Pamětník_Jarda','Starej_Franta','Permanentka_od_80'],
  pos:['Tohle mi připomnělo nejlepší časy klubu.','Za mých mladých let se hrálo podobně. Krása.','Takový zápas jsem tu neviděl roky.','Konečně tým, který má koule.'],
  neu:['Viděl jsem horší, viděl jsem lepší.','Dřív se hrálo s větším srdcem.','Na tribuně sedím 30 let, tohle je průměr.'],
  neg:['Za 30 let fandění tohle patří k nejhorším.','Kdyby to viděli staří kluci, otočili by se v hrobě.','Takhle to vypadalo naposledy, když jsme sestupovali.']},
 meme:{n:['Fanda_od_piva','Mémař_Tonda','Fotbalový_vtipálek','Gifový_Pavel'],
  pos:['Moje reakce na ten gól: 🤯🤯🤯','POV: jsi fanoušek a konečně se máš dobře 😎','Soupeř dneska hrál jak na FIFA na nejlehčí obtížnost 😂','Tenhle zápas dostane vlastní Netflix seriál.'],
  neu:['Šel jsem pro pivo a o nic jsem nepřišel 🍺','Remíza, aneb jak vydělat na nule nervů 😴','Hráli jsme na ničem nezáleží mód.'],
  neg:['Naše obrana právě pozvala soupeře na čaj ☕','Brankář dneska chytal jen bacily 🤧','Moje víra v tenhle tým: 📉📉📉','Kdo potřebuje horor, stačí se dívat na nás 👻']},
 stat:{n:['Statistik_Zdeněk','Tabulkový_Honza','Datový_Martin'],
  pos:['Výhra sedí i v číslech: střely {sh}:{osh}.','Výsledek odpovídá xG {xg}:{oxg}.','Čísla nelžou, tohle byl dominantní výkon.'],
  neu:['{sh}:{osh} na střely a stejně jen remíza.','xG {xg}:{oxg} – remíza je spravedlivá.','Statisticky vyrovnaný zápas.'],
  neg:['Střely na branku: {sot} ze {sh}. To nestačí.','xG {xg}:{oxg} – a stejně se to nepovedlo proměnit.','Čísla jsou neúprosná, hráli jsme špatně.']}};
const VM_FT={sc:['{s}, klobouk dolů!','{s}, ty jsi legenda!','{s} – tohle číslo do dresu chci!','{s} si dneska zaslouží pivo.','Ten gól, co dal {s}… mazec.'],
 bad:['{s} dneska vůbec nebyl na hřišti.','{s} hrál jak ve snu. Ve zlým snu.','Prosím, ať už {s} v sestavě není.','{s}? Fakt nevím, co tam dělal.'],
 ref:['Sudí zase pískal pro druhou stranu.','Rozhodčí potřebuje brýle.','Tu kartu nechápu ani po desátém opakování.'],
 opp:['Fanoušci soupeře už ztichli 🤫','Pozdrav hostům, příště zase!','Ať se soupeř připraví na odvetu.']};
const VM_E=['','','',' 💪',' 🔥',' ⚽',' 😤',' 🤬',' 😂',' ❤️',' 👏',' 🙈'];
const VM_OPP={n:['Hostující_fanda','Z_druhé_strany','Návštěvník_z_ciziny','Fanoušek_rivala','Cizí_šála','Jen_na_skok','Výjezdář_Tonda'],
 w:['Gratuluju, dneska jste byli lepší.','Ještě se potkáme, neusínejte.','Měli jste štěstí, nic víc.','Bolí to, ale zasloužili jste si to.','Sudí vám dneska pomohl, ale budiž.','Smekám, dneska to bylo vaše.','Tohle jsme vám darovali.','Fajn, užijte si to, dlouho to nevydrží.','Gratulace, i když to skřípe.','Jo, jo, vyhráli jste. Spokojení?'],
 l:['Díky za tři body, přijedeme zas.','Tohle jste od nás potřebovali?','Doma a takhle? Ostuda.','Pozdravujeme tribunu, bylo to krásný!','Takhle se hraje fotbal, učte se.','Váš kotel dneska ztichl brzo.','Jedeme domů s úsměvem.','Rádi jsme přijeli, ještě radši odjíždíme.','Hezký stadion, škoda toho týmu.','To byla procházka růžovým sadem.'],
 d:['Bod beru, víc jste si nezasloužili.','Remíza, nikdo nikomu nic nedluží.','Bylo to vyrovnaný, fair play.','Bod z venku je vždycky dobrej.','Dneska nikdo nebyl lepší.','Spravedlivá plichta.','Mohlo to být i horší, pro vás i pro nás.']};
const VM_OPP2={w:['Odveta bude jiná.','Příště vás doma rozstřílíme.','Uvidíme se v tabulce.','Ale jen díky štěstí.'],l:['Hlavně se nezlobte.','Tabulka nelže.','Na odvetu se těšíme.','Vaše obrana nám dneska udělala radost.'],d:['Uvidíme v odvetě.','Příště to rozhodneme.','Bod a jedeme dál.']};
function vmHash(t){let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return (h>>>0).toString(36);}
function vmSeen(t){const V=v11();V.mh=V.mh||[];return V.mh.includes(vmHash(t));}
function vmMark(t){const V=v11();V.mh=V.mh||[];V.mh.push(vmHash(t));if(V.mh.length>4000)V.mh.splice(0,V.mh.length-4000);}
function vmGen(fn){for(let i=0;i<16;i++){const t=fn();if(t&&!vmSeen(t)){vmMark(t);return t;}}return '';}
function vmSur(n){if(!n)return '';const a=String(n).split(' ');return a.length>1?a.slice(1).join(' '):n;}
function vmP(arr,k){return vPick(arr,'vm_'+k,Math.min(30,arr.length-1));}
function vmFill(t,d){return v11Fill(t,d).replace(/\s+/g,' ').trim();}
function vmFacts(M){const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const me=CL(M.sides[ui].cid),opp=CL(M.sides[1-ui].cid);
 const gs=M.ev.filter(e=>e.t==='goal');const mine=gs.filter(e=>e.s===ui),theirs=gs.filter(e=>e.s!==ui);
 const cnt={};mine.forEach(e=>cnt[e.p]=(cnt[e.p]||0)+1);
 let lead=0,wasBehind=false,wasAhead=false;gs.forEach(e=>{lead+=e.s===ui?1:-1;if(lead<0)wasBehind=true;if(lead>0)wasAhead=true;});
 const last=gs[gs.length-1];const st=M.stats||[{},{}];const xg=M.xg||[0,0];
 const reds=M.ev.filter(e=>e.t==='red');const V=v11();V.rs=V.rs||[];const res=my>th?'W':my<th?'L':'D';V.rs.push(res);if(V.rs.length>12)V.rs.shift();
 const run=c=>{let n=0;for(let i=V.rs.length-1;i>=0&&c(V.rs[i]);i--)n++;return n;};
 let pos=0;try{if(lgOf(S.clubId)&&S.round>=3)pos=tablePos(S.clubId);}catch(e){}
 let nCl=0;try{nCl=S.leagues[lgOf(S.clubId)].clubs.length;}catch(e){}
 const mo=P(motm(M));const ratedMine=Object.keys(M.played||{}).map(P).filter(q=>q&&q.cl===S.clubId);
 let worst=null,wv=99;ratedMine.forEach(q=>{const r=(M.rt||{})[q.id]||6;if(r<wv){wv=r;worst=q;}});
 const gk=ratedMine.find(q=>GRP(q.pos)==='G');
 return {derby:!!M.derby,ui,my,th,me,opp,mine,theirs,cnt,wasBehind,wasAhead,last,reds,res,wst:run(x=>x==='W'),ust:run(x=>x!=='L'),lst:run(x=>x==='L'),nwst:run(x=>x!=='W'),pos,nCl,
  mo:mo&&mo.cl===S.clubId?mo:null,mor:mo?((M.rt||{})[mo.id]||7).toFixed(1).replace('.',','):'',worst,gk,
  d:{me:me.n,TM:'Tým '+me.n,tm:'tým '+me.n,opp:opp.n,sc:my+':'+th,r:S.round,pos,sh:(st[ui]||{}).sh||0,osh:(st[1-ui]||{}).sh||0,sot:(st[ui]||{}).sot||0,
   xg:(xg[ui]||0).toFixed(1).replace('.',','),oxg:(xg[1-ui]||0).toFixed(1).replace('.',','),att:M.att?Math.round(M.att).toLocaleString('cs-CZ'):''}};}
function vmDetails(F,tone){const d=F.d,out=[];const nm=id=>vmSur((P(id)||{}).n);
 const add=(k,x)=>{x=x||{};if(x.n!=null){x.zap=czPlural(x.n,'zápas','zápasy','zápasů');x.por=czPlural(x.n,'porážka','porážky','porážek');x.proh=czPlural(x.n,'prohra','prohry','proher');}out.push(()=>vmFill(vmP(VM_D[k],k),Object.assign({},d,x)));};
 if(F.mine.length===1)add('sc1',{s:nm(F.mine[0].p),m:F.mine[0].m});
 else if(F.mine.length>1){const L=F.mine.slice(0,5).map(e=>nm(e.p)+' ('+e.m+'.)');add('scn',{list:L.slice(0,-1).join(', ')+' a '+L[L.length-1]});}
 for(const id in F.cnt){if(F.cnt[id]>=3)add('hat',{s:nm(id)});else if(F.cnt[id]===2)add('brace',{s:nm(id)});}
 if(F.last&&F.last.m>=83&&Math.abs(F.my-F.th)===1){if(F.res==='W'&&F.last.s===F.ui)add('late',{s:nm(F.last.p),m:F.last.m});if(F.res==='L')add('latel',{m:F.last.m});}
 if(F.res==='W'&&F.wasBehind)add('comeb');if(F.res!=='W'&&F.wasAhead)add('blown');
 F.reds.forEach(e=>{const q=P(e.p);if(!q)return;add(q.cl===S.clubId?'redme':'redop',{s:vmSur(q.n)});});
 if(F.th===0&&F.gk)add('cs',{s:vmSur(F.gk.n)});
 if(F.mo&&F.res!=='L')add('motm',{s:vmSur(F.mo.n),r:F.mor});if(F.mo&&F.res==='L')add('motml',{s:vmSur(F.mo.n),r:F.mor});
 if(F.wst>=3)add('wst',{n:F.wst});else if(F.ust>=4)add('ust',{n:F.ust});if(F.lst>=2)add('lst',{n:F.lst});else if(F.nwst>=4)add('nwst',{n:F.nwst});
 if(F.pos===1)add('pos1');else if(F.pos&&F.nCl&&F.pos>F.nCl-3)add('posB');else if(F.pos)add('posT');
 if(tone!=='tab'){if(d.sh)add('shots');add('xg');}
 if(d.att&&RNG()<0.4)add('att');if(F.mine.concat(F.theirs).some(e=>e.pen))add('pen');
 for(let i=out.length-1;i>0;i--){const j=Math.floor(RNG()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function vmKey(F,M){const df=F.my-F.th;return M.derby&&df!==0?(df>0?'derby':'derbyl'):df>=3?'bigw':df>0?'w':df===0?'d':df<=-3?'bigl':'l';}
function vmArticle(F,M,tone){const k=vmKey(F,M);return vmGen(()=>{const det=vmDetails(F,tone);const n=tone==='tab'?1+(RNG()<0.5?1:0):1+(RNG()<0.7?1:0)+(RNG()<0.3?1:0);
 let t=vmFill(vmP(VM_H[tone][k],tone+k),F.d);if(!/[.!?]$/.test(t))t+='.';for(let i=0;i<Math.min(n,det.length);i++)t+=' '+det[i]();
 if(RNG()<0.45){const cg=F.res==='W'?'g':F.res==='L'?'b':'n';t+=' '+vmP(VM_C[tone][cg],'c'+tone+cg);}return t;});}
const VM_G={pos:['Tohle je ten fotbal, kvůli kterému chodím na stadion.','Jsem hrdej na tenhle tým!','Kluci, smekám.','Dneska se mi bude dobře spát.','Na tohle jsme čekali.','Krásná práce, takhle dál!','Tohle si pustím ještě jednou ze záznamu.','Jdu to oslavit do hospody.','Kdo tohle neviděl, může litovat.','Výkon jak z Ligy mistrů.','Hráli s hlavou i se srdcem.','Tenhle tým má něco do sebe.','Soupeř nevěděl, kde mu hlava stojí.','Takovou radost jsem dlouho neměl.','Bomba zápas!'],
 neu:['Nic moc, ale aspoň něco.','Šance byly, góly ne.','Čekal jsem víc, upřímně.','Takovej normální zápas, nic extra.','Ani nadšení, ani zklamání.','Do dalšího zápasu bych chtěl víc agresivity.','Zahodili jsme dvě body, nebo získali jeden?','Remíza nikoho nezabije, ale nadšený nejsem.','Hrálo se, ale bez nápadu.','Polovina zápasu dobrá, polovina na nic.'],
 neg:['Tohle bolí.','Nemám slov. Teda mám, ale jsou sprostý.','Takhle se to hrát nedá.','Zase jsme to pokazili.','Ztráta času a nervů.','Kluci, takhle ne.','Chci vidět, že se rvou. Dneska nic.','Hrůza. Jdu spát.','Kde je ta parta z minulé sezóny?','Tohle už není smůla, to je systém.','Dneska fakt hanba.','Vrať mi někdo ty dvě hodiny života.']};
const VM_FF={wst:['Už {n}. výhra v řadě, kdo nás zastaví?','Série {n} výher – ať to nekončí!','{n} výhry/výher po sobě, to se jen tak nevidí.'],
 lst:['Už {n}. prohra za sebou. Co se to děje?','{n}. porážka v řadě, alarm!'],
 nwst:['Už {n} zápasů bez výhry. Tohle se musí zlomit.'],
 pos1:['Jsme první! Ať si všichni zvyknou.','Pohled na tabulku je dneska nádhera, jsme na čele.','Čelo tabulky nám sluší.'],
 posB:['Jsme {pos}., tohle smrdí sestupem.','{pos}. místo? To snad ne.'],
 posT:['Jsme {pos}., furt je na čem pracovat.','{pos}. místo, může to být lepší.'],
 late:['Ten gól v {m}. minutě! Řval jsem jak blázen.','Gól v {m}. minutě, srdce mi skoro vyskočilo.'],
 latel:['Inkasovat v {m}. minutě, to je fakt na palici.','Gól v {m}. minutě nás zabil.'],
 comeb:['Prohrávat a vyhrát, to je charakter!','Ten obrat byl lepší než film.'],
 blown:['Vedli jsme a zase to pustili. Typický.','Jak můžeš ztratit vedení takhle?'],
 cs:['Nula vzadu, {s} v bráně jako zeď.','{s} dneska nepustil ani myš.'],
 derby:['Derby je naše, město je naše!','Rival brečí, my slavíme!'],
 derbyl:['Prohrát derby, nejhorší pocit na světě.','Derby prohrát nesmíš. Nikdy.'],
 sc:['{sc}, a to je přesně to, co jsme chtěli.','Výsledek {sc} mluví za vše.']};
const VM_EM={pos:['',' 💪',' 🔥',' ⚽',' ❤️',' 👏',' 😎',' 🙌',' 🍺'],neu:['',' 😐',' 🤷',' 😴',' 🙈',' 😬'],neg:['',' 😤',' 🤬',' 😡',' 👎',' 💩',' 😭']};
function vmFan(F,per,fk){const P0=VM_P[per];return vmGen(()=>{const base=(per==='stat'||RNG()<0.55)?vmP(P0[fk],per+fk):vmP(VM_G[fk],'g'+fk);let t=vmFill(base,F.d);
 const ff=[];const L=F.last,nm=id=>vmSur((P(id)||{}).n);const x=(k,d)=>ff.push([k,Object.assign({},F.d,d||{})]);
 if(F.wst>=3)x('wst',{n:F.wst});if(F.lst>=2)x('lst',{n:F.lst});else if(F.nwst>=4)x('nwst',{n:F.nwst});
 if(F.pos===1)x('pos1');else if(F.pos&&F.nCl&&F.pos>F.nCl-3)x('posB');else if(F.pos&&RNG()<0.3)x('posT');
 if(L&&L.m>=83&&Math.abs(F.my-F.th)===1){if(F.res==='W'&&L.s===F.ui)x('late',{m:L.m});if(F.res==='L')x('latel',{m:L.m});}
 if(F.res==='W'&&F.wasBehind)x('comeb');if(F.res!=='W'&&F.wasAhead)x('blown');if(F.th===0&&F.gk&&fk!=='neg')x('cs',{s:vmSur(F.gk.n)});
 if(F.derby)x(F.res==='W'?'derby':F.res==='L'?'derbyl':'sc');x('sc');
 if(ff.length&&RNG()<0.5){const f=ff[Math.floor(RNG()*ff.length)];t+=' '+vmFill(vmP(VM_FF[f[0]],'ff'+f[0]),f[1]).replace('výhry/výher',czPlural(F.wst,'výhra','výhry','výher'));}
 const r=RNG();
 if(fk==='pos'&&F.mine.length&&r<0.4)t+=' '+vmFill(vmP(VM_FT.sc,'ftsc'),{s:nm(F.mine[Math.floor(RNG()*F.mine.length)].p)});
 else if(fk==='neg'&&F.worst&&r<0.4)t+=' '+vmFill(vmP(VM_FT.bad,'ftbad'),{s:vmSur(F.worst.n)});
 else if(fk!=='pos'&&r<0.55&&(F.reds.length||RNG()<0.35))t+=' '+vmP(VM_FT.ref,'ftref');
 else if(fk==='pos'&&r<0.55)t+=' '+vmP(VM_FT.opp,'ftopp');
 return (t+VM_EM[fk][Math.floor(RNG()*VM_EM[fk].length)]).trim();});}
function v11MatchMedia(M){const F=vmFacts(M);if(!F.me||!F.opp)return;
 const o1=vmP(VM_OUT.ser,'oser');v11Post(o1[0],o1[1],vmArticle(F,M,'ser'));
 const big=Math.abs(F.my-F.th)>=2||M.derby||F.reds.length||F.lst>=2||F.wst>=3;
 if(big||RNG()<0.45){const o=vmP(VM_OUT.tab,'otab');v11Post(o[0],o[1],vmArticle(F,M,'tab'));}
 const fk=F.res==='W'?'pos':F.res==='D'?'neu':'neg';
 const pers=Object.keys(VM_P).filter(x=>x!=='stat'||F.d.sh);const n=1+(RNG()<0.7?1:0)+(RNG()<0.35?1:0);
 for(let i=0;i<n;i++){const per=vmP(pers,'per');let f=fk;if(per==='hater'&&fk==='pos'&&RNG()<0.3)f='neu';v11Post(per==='stat'?'📊':'💬','@'+vmP(VM_P[per].n,'n'+per),vmFan(F,per,f));}
 if(RNG()<0.35){const ok=F.res==='W'?'l':F.res==='L'?'w':'d';const em=VM_EM[ok==='l'?'pos':ok==='w'?'neg':'neu'];v11Post('💬','@'+vmP(VM_OPP.n,'nopp')+' ('+F.opp.n+')',vmGen(()=>vmP(VM_OPP[ok],'opp'+ok)+(RNG()<0.5?' '+vmP(VM_OPP2[ok],'opq'+ok):'')+em[Math.floor(RNG()*em.length)]));}}
const VM_RS=['Šeptá se, že','Podle zdrojů z kabiny','Zahraniční média píší, že','Bulvár tvrdí, že','Na sítích koluje zpráva, že','Podle dobře informovaného zdroje','Novináři zjistili, že','Hráčův agent naznačil, že','Spekuluje se, že','Z kuloárů se ozývá, že'];
const VM_RC=['klub {c2} bedlivě sleduje, jak hraje {p} ({c})','{p} ({c}) je na seznamu klubu {c2}','klub {c2} chystá nabídku a cílem je {p} ({c})','skauti klubu {c2} přijeli kvůli tomu, jak hraje {p} ({c})','{p} ({c}) by mohl v létě zamířit do klubu {c2}','klub {c2} je ochoten dát kolem {fee} a jméno na seznamu zní {p} ({c})','{p} ({c}) má víc nápadníků, mezi nimi i klub {c2}','klub {c2} poslal pozorovatele, kteří mají zmapovat, jak hraje {p} ({c})'];
const VM_RE=['','',' Klub {c} zatím mlčí.',' Oficiální nabídka prý ještě nepřišla.',' Hráč se k tomu odmítl vyjádřit.',' Uvidíme, co na to vedení.',' Fanoušci jsou nervózní.'];
const VM_RM=['klub {c2} pošilhává po tvé opoře a jméno zní {p}','tvůj hráč {p} zaujal klub {c2}','klub {c2} by do kádru rád dostal tvou oporu – {p}','skauti klubu {c2} přijeli na tvůj zápas kvůli tomu, jak hraje {p}'];
function v11Rumour(){if(RNG()>0.35)return;const ids=Object.keys(S.clubs).filter(id=>!S.clubs[id].tmp&&id!==S.clubId);if(ids.length<3)return;
 const mk=(arr,k,d)=>vmGen(()=>vmFill(vmP(VM_RS,'rs')+' '+vmP(arr,k)+'.'+vmP(VM_RE,'re'),d));
 if(RNG()<0.35){const ps=clubPlayers(S.clubId).filter(p=>p.ovr>=teamStrength(S.clubId).ovr);if(!ps.length)return;const p=pick(ps);const c2=pick(ids.filter(id=>(S.clubs[id].rep||0)>=(myClub().rep||0)));if(!c2)return;
  v11Post('🗞️','Přestupové spekulace',mk(VM_RM,'rm',{p:p.n,c2:S.clubs[c2].n,c:myClub().n}));p.hap=clamp((p.hap||60)-2,0,100);return;}
 const c=pick(ids);const ps=clubPlayers(c).sort((a,b)=>b.ovr-a.ovr).slice(0,3);if(!ps.length)return;const p=pick(ps);const big=ids.filter(id=>(S.clubs[id].rep||0)>(S.clubs[c].rep||0)+2);if(!big.length)return;
 v11Post('🗞️','Přestupové spekulace',mk(VM_RC,'rc',{p:p.n,c:S.clubs[c].n,c2:S.clubs[pick(big)].n,fee:fmtMoney(playerValue(p))}));}

const _v11PostM=v11Post;v11Post=function(ic,who,t){if(!t)return;return _v11PostM.apply(this,arguments);};

// v12: taktické šablony, analýza soupeře, předpověď sezóny, nálada fanoušků, skautská síť, milníky, příspěvky hráčů, časová osa klubu
function v12(){if(!S.v12)S.v12={};const V=S.v12;V.tl=V.tl||[];V.ms=V.ms||{};V.rep=V.rep||[];V.fm=V.fm||[];return V;}
function v12Tl(ic,t){const V=v12();V.tl.unshift({ic,t,s:S.season,r:S.round});if(V.tl.length>150)V.tl.length=150;}
function v12Club(){return myClub().n;}
// ---------- 1) taktické šablony ----------
const V12_PRE=[
 {k:'bal',n:'⚖️ Vyvážená',d:'Bezpečný základ pro většinu zápasů.',f:'4-2-3-1',t:{ment:'bal',press:'mid',style:'short',line:'mid',width:'norm',tempo:'norm'}},
 {k:'bus',n:'🚌 Autobus',d:'Hluboká obrana a čekání na brejky. Na silné soupeře.',f:'5-3-2',t:{ment:'def',press:'low',style:'counter',line:'low',width:'narrow',tempo:'slow'}},
 {k:'gp',n:'🔥 Gegenpressing',d:'Vysoký presink a rychlé tempo. Hodně šancí, ale i rizika.',f:'4-3-3',t:{ment:'att',press:'high',style:'direct',line:'high',width:'norm',tempo:'fast'}},
 {k:'tt',n:'🎯 Tiki-taka',d:'Krátké přihrávky, držení míče, trpělivost.',f:'4-3-3',t:{ment:'bal',press:'high',style:'short',line:'high',width:'narrow',tempo:'slow'}},
 {k:'ct',n:'⚡ Protiútoky',d:'Nízký blok a bleskové výpady po křídlech.',f:'4-4-2',t:{ment:'bal',press:'low',style:'counter',line:'low',width:'wide',tempo:'fast'}},
 {k:'wing',n:'🪽 Křídla',d:'Široká hra, centry a útok přes krajní hráče.',f:'4-4-2',t:{ment:'att',press:'mid',style:'direct',line:'mid',width:'wide',tempo:'norm'}}];
function v12CurPre(){const t=S.tac||{};return V12_PRE.find(p=>p.f===t.form&&Object.keys(p.t).every(k=>(t[k]||({ment:'bal',press:'mid',style:'short',line:'mid',width:'norm',tempo:'norm'})[k])===p.t[k]));}
function v12Preset(k,back){const p=V12_PRE.find(x=>x.k===k);if(!p||!S.tac)return;const r0=render;let n=0;render=function(){n++;};try{if(S.tac.form!==p.f&&FORMS[p.f])setForm(p.f);}finally{render=r0;}
 Object.assign(S.tac,p.t);saveGame();toast('Taktika: '+p.n+' ✓');if(back){preMatch();}else render();}
function v12PreHtml(){const c=v12CurPre();return `<div class="card"><h3>🧩 Taktické šablony</h3><div class="small mut" style="margin-bottom:8px">Jedním ťuknutím nastavíš rozestavení i pokyny. Sestavu pak můžeš doladit.</div>
 <div class="pre12">${V12_PRE.map(p=>`<button class="${c&&c.k===p.k?'on':''}" onclick="v12Preset('${p.k}')"><b>${p.n}</b><span>${p.f} · ${esc(p.d)}</span></button>`).join('')}</div></div>`;}
// ---------- 2) analýza soupeře ----------
function v12OppId(){const F=UI.F||nextMatch();if(!F)return null;return F.h===S.clubId?F.a:F.h;}
function v12Rec(me,op){if(op.att>me.def+3&&op.mid>me.mid+1)return ['bus','Soupeř je silnější v útoku i v záloze. Zavři prostor a čekej na brejky.'];
 if(op.att>me.def+3)return ['ct','Jejich útok je nebezpečný. Stáhni obranu níž a hraj na rychlé protiútoky.'];
 if(op.mid>me.mid+3)return ['ct','Zálohu asi neovládneš. Přeskoč ji přímými balóny a protiútoky.'];
 if(me.att>op.def+4)return ['gp','Jejich obrana je slabší. Vysoký presink a rychlé tempo by je mohly rozložit.'];
 if(me.mid>op.mid+3)return ['tt','Záloha je tvoje silná stránka. Drž míč a nech soupeře běhat.'];
 if(op.def>me.att+3)return ['wing','Středem se přes jejich obranu nedostaneš. Zkus hru po křídlech.'];
 return ['bal','Vyrovnaný soupeř. Vyvážená taktika je nejbezpečnější volba.'];}
function v12Opp(){const id=v12OppId();const C=id&&S.clubs[id];if(!C){toast('Soupeře teď nejde analyzovat.');return;}
 const me=teamStrength(S.clubId),op=teamStrength(id);const ps=clubPlayers(id);const L=C.lg&&S.leagues[C.lg];const T=L&&L.table&&L.table[id];
 const form=(T&&T.form||[]).slice(-5);const fc={V:'good',R:'',P:'bad'};
 const gs=ps.slice().sort((a,b)=>(b.st&&b.st.g||0)-(a.st&&a.st.g||0))[0];const as=ps.slice().sort((a,b)=>(b.st&&b.st.as||0)-(a.st&&a.st.as||0))[0];
 const avf=p=>p.form&&p.form.length?p.form.reduce((a,b)=>a+b,0)/p.form.length:6;
 const hot=ps.filter(available).sort((a,b)=>(avf(b)*8+b.ovr)-(avf(a)*8+a.ovr)).slice(0,3);const inj=ps.filter(p=>!available(p)).sort((a,b)=>b.ovr-a.ovr).slice(0,4);
 const fm=C.form||bestForm(id);const tc=C.tac||{};const ML={def:'defenzivní',bal:'vyvážený',att:'útočný'},SL={short:'krátké přihrávky',direct:'přímočarý fotbal',counter:'protiútoky'};
 const [rk,rt]=v12Rec(me,op);const pr=V12_PRE.find(p=>p.k===rk);
 const bar=(k,x,y)=>`<div class="stt"><b>${Math.round(x)}</b><span class="k">${k}</span><b class="r">${Math.round(y)}</b><div class="dbar"><i style="width:${x/(x+y)*100}%"></i><i style="width:${y/(x+y)*100}%"></i></div></div>`;
 const st=T&&T.p?`${T.p} ${czPlural(T.p,'zápas','zápasy','zápasů')} · skóre ${T.gf}:${T.ga} · průměrně ${(T.p?T.gf/T.p:0).toFixed(1).replace('.',',')} gólu za zápas`:(T?'Soupeř v lize zatím nehrál.':'Soupeř z jiné soutěže – ligové statistiky nejsou k dispozici.');
 modal(`<h2>🔎 Analýza soupeře</h2><div class="row" style="gap:10px;margin:6px 0 10px">${badge(C,'')}<div><b>${esc(C.n)}</b><div class="tiny mut">${C.lg?esc(leagueLabel(C.lg)):''}${T?' · '+tablePos(id)+'. místo':''}</div></div></div>
 <div class="card" style="padding:10px 12px"><h3>Forma</h3><div class="row" style="gap:6px;margin:4px 0">${form.length?form.map(f=>`<span class="fbx ${fc[f]||''}">${f}</span>`).join(''):'<span class="small mut">Zatím bez zápasů.</span>'}</div><div class="tiny mut">${st}</div></div>
 <div class="card" style="padding:10px 12px"><h3>Ty vs. soupeř</h3>${bar('Útok',me.att,op.att)}${bar('Záloha',me.mid,op.mid)}${bar('Obrana',me.def,op.def)}</div>
 <div class="card" style="padding:10px 12px"><h3>Jak hrají</h3><div class="small">Rozestavení <b>${esc(fm)}</b>${tc.ment?`, ${ML[tc.ment]||'vyvážený'} přístup`:''}${tc.style?`, preferují ${SL[tc.style]||'kombinační hru'}`:''}.</div>
 ${gs&&gs.st&&gs.st.g?`<div class="small" style="margin-top:4px">⚽ Nejlepší střelec: <b>${esc(gs.n)}</b> (${gs.st.g} ${czPlural(gs.st.g,'gól','góly','gólů')})</div>`:''}${as&&as.st&&as.st.as?`<div class="small">🅰️ Nejvíc asistencí: <b>${esc(as.n)}</b> (${as.st.as})</div>`:''}</div>
 <div class="card" style="padding:10px 12px"><h3>Ve formě</h3>${hot.map(p=>`<div class="row small" style="padding:3px 0">${posB(p.pos)}<span style="flex:1">${esc(p.n)}</span><span class="tiny mut">forma ${avf(p).toFixed(1).replace('.',',')}</span>${ovrB(p.ovr)}</div>`).join('')}
 ${inj.length?`<div class="tiny mut" style="margin-top:6px">Chybí: ${inj.map(p=>esc(p.n)+(p.inj>0?' (zraněný)':' (trest)')).join(', ')}</div>`:''}</div>
 <div class="card" style="padding:10px 12px;border-color:var(--acc)"><h3>💡 Doporučení asistenta</h3><div class="small">${esc(rt)}</div><button class="btn w100" style="margin-top:8px" onclick="v12Preset('${rk}',1)">Použít: ${pr.n}</button></div>
 <button class="btn ghost w100" onclick="preMatch()">← Zpět k zápasu</button>`);}
function v12PmInject(){const m=document.querySelector('.modal');const go=m&&m.querySelector('#pmgo');if(!go||m.querySelector('.opp12'))return;const b=document.createElement('button');b.className='btn ghost w100 opp12';b.style.marginBottom='8px';b.textContent='🔎 Analýza soupeře a doporučená taktika';b.onclick=()=>v12Opp();
 const host=go.closest('.mstick')||go.parentNode;host.parentNode.insertBefore(b,host);}
// ---------- 3) předpověď sezóny ----------
const V12_PVQ={fav:['Experti nemají pochyby: titul je povinnost.','Na papíře nejsilnější kádr ligy. Tlak bude obrovský.','Sázkové kanceláře vás vidí jako jasného favorita.'],
 top:['Boj o evropské poháry je reálný cíl.','Horní polovina tabulky je minimum, s trochou štěstí i víc.','Experti čekají souboj o medaile.'],
 mid:['Klidný střed tabulky – tak to vidí většina novinářů.','Experti čekají sezónu bez velkých výkyvů.','Na čele se asi neudržíte, ale ani sestup nehrozí.'],
 low:['Experti tipují boj o záchranu.','Podle novinářů vás čeká dlouhá a těžká sezóna.','Většina expertů vás řadí mezi kandidáty na sestup.']};
function v12Pv(){const V=v12();if(V.pv&&V.pv.s===S.season)return V.pv;if(S.round>3)return null;const me=myClub();const L=S.leagues[me.lg];if(!L)return null;
 let h=0;const hs=x=>{for(const c of String(x))h=(h*31+c.charCodeAt(0))|0;return ((h>>>0)%1000)/1000;};
 const sc=L.clubs.map(id=>{const t=teamStrength(id);return [id,(t.att+t.mid+t.def)/3+(S.clubs[id].rep||0)*0.04+(hs(id+S.season)-0.5)*3];}).sort((a,b)=>b[1]-a[1]);
 const pos=sc.findIndex(x=>x[0]===S.clubId)+1;const n=sc.length;V.pv={s:S.season,lg:me.lg,my:pos,n,top:sc.slice(0,3).map(x=>S.clubs[x[0]].n),last:S.clubs[sc[n-1][0]].n,
  q:vPick(V12_PVQ[pos===1?'fav':pos<=Math.ceil(n*0.3)?'top':pos<=Math.ceil(n*0.75)?'mid':'low'],'pvq',2)};return V.pv;}
function v12PvHtml(){if(S.round>8)return '';const p=v12Pv();if(!p)return '';return `<div class="card"><h3>🔮 Předpověď expertů ${seasonLabel(S.season)}</h3>
 <div class="row" style="gap:12px;align-items:center"><div class="pv12"><b>${p.my}.</b><span>místo</span></div><div class="small" style="flex:1">${esc(p.q)}<div class="tiny mut" style="margin-top:4px">Favorité: ${p.top.map(esc).join(', ')} · Nejvíc ohrožený: ${esc(p.last)}</div></div></div></div>`;}
function v12PvEnd(rep){const V=v12();const p=V.pv;if(!p||p.s!==rep.season||p.lg!==rep.lg)return null;const d=p.my-rep.pos;const r={pred:p.my,real:rep.pos,d};
 if(d>=3){V.cnt=V.cnt||{};V.cnt.pvb=(V.cnt.pvb||0)+1;fansAdd(4);v12Tl('🔮',`Sezóna ${seasonLabel(rep.season)}: experti tipovali ${p.my}. místo, tým skončil ${rep.pos}.`);}
 else if(d<=-3)fansAdd(-3);V.pvr=r;return r;}
function v12PvEndHtml(r){if(!r)return '';const t=r.d>=3?'Překonal jsi očekávání! Fanoušci jsou nadšení.':r.d>=1?'O kousek lepší, než čekali experti.':r.d===0?'Přesně podle předpovědi.':r.d>=-2?'Mírně pod očekáváním.':'Výrazně pod očekáváním. Kritika na sebe nenechá čekat.';
 return `<div class="card"><h3>🔮 Předpověď vs. realita</h3><div class="row" style="justify-content:space-around;text-align:center"><div><div class="tiny mut">Experti</div><b style="font-size:22px">${r.pred}.</b></div><div><div class="tiny mut">Skutečnost</div><b style="font-size:22px" class="${r.d>0?'good':r.d<0?'bad':''}">${r.real}.</b></div></div><div class="small c" style="margin-top:6px">${t}</div></div>`;}
// ---------- 4) nálada fanoušků ----------
const V12_BAN=['Hrajte za dres, ne za výplatu!','Chceme vidět srdce!','Takhle ne!','Vedení, probuďte se!','Dost bylo ostudy!','Tohle není náš klub!','Vraťte nám fotbal!'];
const V12_PROT=['Před stadionem se sešlo několik stovek fanoušků. Na transparentu stálo: „{b}“','Kotel otočil záda hřišti a vyvěsil transparent „{b}“','Fanoušci po zápase pískali a skandovali proti vedení. Transparent hlásal: „{b}“','Část fanoušků čekala na hráče u autobusu. Na plotě visel nápis „{b}“'];
const V12_CEL=['Kotel připravil velkolepé choreo přes celou tribunu!','Fanoušci slavili s hráči ještě dlouho po zápase.','Město žije fotbalem – v hospodách se slavilo do rána.','Fanoušci vyprodali fanshop a zpívali až do noci.','Před stadionem se konal spontánní průvod s vlajkami.'];
function v12FanAfter(M){const V=v12();const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const f=fans();const key=S.season*100+S.round;
 V.fm.push(Math.round(f));if(V.fm.length>12)V.fm.shift();
 if(my<th&&f<28&&(!V.lp||key-V.lp>=4)){V.lp=key;const t=vmGen(()=>vmFill(vmP(V12_PROT,'prot'),{b:vmP(V12_BAN,'ban')}))||'Fanoušci po zápase hlasitě protestovali.';addNews('😡','Protest fanoušků! '+t);v11Post('📢','Fanouškovská iniciativa',t);
  S.boardTrust=clamp((S.boardTrust||50)-3,0,100);clubPlayers(S.clubId).forEach(p=>p.mor=clamp((p.mor||60)-2,0,100));V.fev={k:'p',t,s:S.season,r:S.round};v12Tl('😡','Protest fanoušků po prohře '+my+':'+th+'.');}
 else if(my>th&&f>82&&(M.derby||my-th>=3||(V.fm.length>=3&&V.fm.slice(-3).every(x=>x>80)))&&(!V.lc||key-V.lc>=5)){V.lc=key;const t=vmGen(()=>vmP(V12_CEL,'cel')+vmP(['',' Hráči děkovali kotli.',' Atmosféra jako za starých časů.',' Kapitán vzal megafon a zpíval s nimi.',' Takovou euforii tu dlouho nikdo nezažil.',' Trenér si to natáčel na mobil.'],'cel2'));if(!t)return;addNews('🎉',t,1);v11Post('📢','Fanouškovská iniciativa',t);
  clubPlayers(S.clubId).forEach(p=>p.mor=clamp((p.mor||60)+2,0,100));V.fev={k:'c',t,s:S.season,r:S.round};}}
function v12FanHtml(){const f=fans();const V=v12();const fm=V.fm;const tr=fm.length>=3?fm[fm.length-1]-fm[Math.max(0,fm.length-4)]:0;const ev=V.fev&&V.fev.s===S.season&&S.round-V.fev.r<=3?V.fev:null;
 const hint=f<28?'Hrozí protesty. Výhry a dobrá práce s fanoušky to otočí.':f<45?'Fanoušci jsou nervózní. Potřebují vidět výsledky.':f<70?'Nálada je v pohodě.':f<83?'Fanoušci jsou spokojení a chodí ve velkém.':'Euforie! Při dalších výhrách se chystají oslavy.';
 return `<div class="card"><h3>🎺 Nálada fanoušků</h3><div class="row" style="gap:10px;align-items:center"><span style="font-size:28px">${fansIc()}</span><div style="flex:1"><div class="row small" style="justify-content:space-between"><b class="${fansCls()}">${fansLabel()}</b><span class="tiny mut">${Math.round(f)}/100 ${tr>2?'▲':tr<-2?'▼':'▬'}</span></div><div class="meter12"><i style="width:${100-f}%"></i></div></div></div>
 <div class="tiny mut" style="margin-top:6px">${hint}</div>${ev?`<div class="small" style="margin-top:6px">${ev.k==='p'?'😡':'🎉'} ${esc(ev.t)}</div>`:''}</div>`;}
// ---------- 5) skautská síť ----------
const V12_LV=[{n:'Základní',c:60000,w:3,e:6,k:4},{n:'Rozšířená',c:180000,w:2,e:3,k:6},{n:'Elitní',c:450000,w:1,e:1,k:8}];
function v12ScFoci(){const o=[['u21','🌱 Talenty do 21 let'],['gk','🧤 Brankáři'],['def','🛡️ Obránci'],['mid','🎯 Záložníci'],['att','⚽ Útočníci'],['cheap','💸 Levné posily']];Object.keys(S.leagues).forEach(c=>o.push(['lg:'+c,'🏟️ '+leagueLabel(c)]));return o;}
function v12ScGo(k,l){const V=v12();if(V.sc){toast('Skauti už na jedné misi jsou.');return;}const L=V12_LV[l];const me=myClub();if(isFinite(me.money)&&me.money<L.c){toast('Na skautskou misi nemáš peníze.');return;}
 money(-L.c,'other','Skautská mise');V.sc={k,l,s:S.season,done:S.round+L.w};addNews('🔭',`Skauti vyrazili na misi: ${v12ScFoci().find(x=>x[0]===k)[1].replace(/^\S+ /,'')}. Zpráva dorazí za ${L.w} ${czPlural(L.w,'týden','týdny','týdnů')}.`,1);saveGame();closeModal();render();}
function v12ScSheet(){const fo=v12ScFoci();modal(`<h2>🔭 Nová skautská mise</h2><div class="small mut" style="margin-bottom:8px">Vyber zaměření a úroveň. Lepší skauti jsou rychlejší a jejich odhad je přesnější.</div>
 <label class="small">Zaměření</label><select id="sc12k" class="w100" style="margin:4px 0 10px">${fo.map(x=>`<option value="${x[0]}">${esc(x[1])}</option>`).join('')}</select>
 ${V12_LV.map((L,i)=>`<button class="btn ${i===1?'':'ghost'} w100" style="margin-bottom:8px;flex-direction:column;align-items:flex-start;text-align:left" onclick="v12ScGo(document.getElementById('sc12k').value,${i})"><b>${L.n} · ${fmtMoney(L.c)}</b><span class="tiny" style="opacity:.8;font-weight:600">${L.k} hráčů · ${L.w} ${czPlural(L.w,'týden','týdny','týdnů')} · přesnost ±${L.e}</span></button>`).join('')}
 <button class="btn ghost w100" onclick="closeModal()">Zavřít</button>`);}
const V12_STR=['rychlý jako blesk','umí zakončit','vidí přihrávky, které jiní ne','technicky výborně vybavený','tvrdý v soubojích','fyzicky velmi silný'];
const V12_STRG=['skvělý na čáře','spolehlivé ruce','přesný výkop','bleskové reflexy','výborné postavení','odvážně vybíhá'];
function v12ScWeek(){const V=v12();const sc=V.sc;if(!sc)return;if(sc.s===S.season&&S.round<sc.done)return;const L=V12_LV[sc.l]||V12_LV[0];V.sc=null;
 const me=myClub();const budget=isFinite(me.money)?me.money:1e12;
 let pool=Object.values(S.players).filter(p=>p.cl&&p.cl!==S.clubId&&S.clubs[p.cl]&&!S.clubs[p.cl].tmp&&!p.yth);
 const k=sc.k;if(k==='u21')pool=pool.filter(p=>ageOf(p)<=21);else if(['gk','def','mid','att'].includes(k)){const g={gk:'G',def:'D',mid:'M',att:'F'}[k];pool=pool.filter(p=>GRP(p.pos)===g);}
 else if(k==='cheap')pool=pool.filter(p=>playerValue(p)<=budget*0.25);else if(k.startsWith('lg:')){const c=k.slice(3);pool=pool.filter(p=>S.clubs[p.cl].lg===c);}
 const myT=teamStrength(S.clubId);const lvl=(myT.att+myT.mid+myT.def)/3;
 pool=pool.map(p=>[p,(k==='u21'?p.pot*1.2:p.pot*0.5+p.ovr*0.7)-Math.max(0,playerValue(p)-budget)/Math.max(budget,1)*8-(p.ovr<lvl-10&&k!=='u21'?15:0)+RNG()*8]).sort((a,b)=>b[1]-a[1]).slice(0,L.k).map(x=>x[0]);
 const items=pool.map(p=>{const e=L.e;const eo=clamp(Math.round(p.ovr+(RNG()*2-1)*e),30,99),ep=clamp(Math.round(Math.max(p.pot,p.ovr)+(RNG()*2-1)*e),eo,99);const a=p.a||[];let bi=0;a.forEach((v,i)=>{if(v>a[bi])bi=i;});
  return {id:p.id,o:eo,p:ep,t:(GRP(p.pos)==='G'?V12_STRG:V12_STR)[bi]||''};});
 V.rep.unshift({s:S.season,r:S.round,k,l:sc.l,items});V.cnt=V.cnt||{};V.cnt.scn=(V.cnt.scn||0)+1;if(V.rep.length>3)V.rep.length=3;addNews('🔭',`Skautská zpráva je hotová: ${items.length} ${czPlural(items.length,'hráč','hráči','hráčů')} k prověření. Najdeš ji v Přestupech.`);}
function v12ScHtml(){const V=v12();const r=V.rep[0];const sc=V.sc;const fo=v12ScFoci();
 let h=`<div class="card"><h3>🔭 Skautská síť</h3>`;
 if(sc){const left=Math.max(0,sc.done-S.round);h+=`<div class="small">Skauti jsou na misi: <b>${esc((fo.find(x=>x[0]===sc.k)||['',''])[1])}</b> (${V12_LV[sc.l].n.toLowerCase()} úroveň). Zpráva dorazí ${left<=0?'po příštím kole':'za '+left+' '+czPlural(left,'týden','týdny','týdnů')}.</div>`;}
 else h+=`<button class="btn w100" onclick="v12ScSheet()">Vyslat skauty</button>`;
 if(r){const its=r.items.map(x=>({x,p:P(x.id)})).filter(o=>o.p);h+=`<div class="tiny mut" style="margin:10px 0 4px">Poslední zpráva · ${r.r?r.r+'. kolo':'příprava'} ${seasonLabel(r.s)} · ${esc((fo.find(x=>x[0]===r.k)||['',''])[1])}</div>`+
  its.map(({x,p})=>{const c=S.clubs[p.cl];const mine=p.cl===S.clubId;return `<div class="pl-row scr12" onclick="playerSheet('${p.id}')">${posB(p.pos)}<div style="flex:1;min-width:0"><div class="small"><b>${esc(p.n)}</b> <span class="tiny mut">${ageOf(p)} let</span></div><div class="tiny mut">${mine?'už je tvůj':esc(c?c.n:'volný hráč')} · ${fmtMoney(playerValue(p))}${x.t?' · '+esc(x.t):''}</div></div><div class="tiny c" style="min-width:58px">odhad<br><b>${x.o}</b> → <b class="good">${x.p}</b></div></div>`;}).join('');}
 return h+'</div>';}
// ---------- 6) milníky a příspěvky hráčů ----------
const V12_MA=[50,100,150,200,250,300,400,500],V12_MG=[10,25,50,75,100,150,200];
function v12Handle(p){const b=String(p.n).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');return '@'+b+'_'+(v11Num?v11Num(p.id):'')+'';}
const V12_IG={goal:['Tři body a gól! Díky za podporu, jste nejlepší ⚽❤️','Pro tyhle chvíle hraju fotbal. Jedeme dál! 💪','Gól pro vás, fanoušci! 🙌','Skvělý týmový výkon, jsem rád, že jsem pomohl gólem.','Na tenhle gól nezapomenu. Díky, kluci! 🔥','Makali jsme celý týden a vyplatilo se to. ⚽','Ta atmosféra! Díky, že jste nás hnali dopředu. 📣','Gól je super, ale ty tři body jsou důležitější. 💯'],
 motm:['Hráč zápasu? Hlavně tým! 🏅','Díky za hlasy! Bez kluků by to nešlo. 🙏','Jeden z mých nejlepších zápasů. A to je teprve začátek. 😤','Ocenění věnuju rodině a vám všem. ❤️'],
 loss:['Tohle bolí. Omlouváme se, musíme být lepší. 🙏','Hlavy vzhůru, příště to napravíme.','Nebyl to náš den. Díky, že jste tam byli i tak.','Žádné výmluvy. Makat a vrátit se silnější. 💪','Bereme to na sebe. Vy jste byli skvělí, my ne.','Takový zápas se nesmí opakovat. Slibuju, že dáme všechno.'],
 big:['Jaký večer! Tohle si zapamatujeme. 🔥🔥','Takhle se to dělá! Celý tým byl dneska neskutečný. 🙌','Dneska se všechno povedlo. Užívejte si to s námi! 🎉','Parta, která drží spolu. Tohle je náš fotbal! ⚽'],
 debut:['Splněný sen – můj první zápas za áčko! ✨','Debut! Děkuju trenérovi za důvěru. Jdeme na to. 💪','Na tenhle den jsem čekal celý život. ❤️'],
 ms:['{n} zápasů pod naším trenérem! Děkuju za důvěru. 🙏','Už {n} zápasů s touhle partou. A chci další! 💪','{n} zápasů. Čas letí, ale chuť zůstává. ❤️'],
 msg:['Už {n} gólů pod naším trenérem! A nekončím. ⚽','{n} gólů s touhle partou. Díky všem, co mi nahrávali! 🙌','Číslo {n}! Každý gól je pro vás, fanoušci. ❤️'],
 sign:['Nová kapitola začíná. Jsem hrdý, že jsem tady! ✍️','Ahoj, noví fanoušci! Nemůžu se dočkat prvního zápasu. 👋','Podpis hotový. Teď už jen fotbal. ⚽','Velký den pro mě i rodinu. Dám do toho všechno! 💪'],
 inj:['Malá pauza, budu zpátky silnější. 💪','Zranění k fotbalu patří. Brzy na viděnou na hřišti! 🙏','Díky za všechny zprávy. Makám na rehabilitaci každý den.','Nejhorší je dívat se z tribuny. Brzy jsem zpátky! ⏳']};
function v12Ig(p,k,d){if(!p)return;const t=vmGen(()=>vmFill(vmP(V12_IG[k],'ig'+k),d||{}));if(t)v11Post('📸',v12Handle(p),t);}
function v12AfterMatch(M){const V=v12();const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const mine=Object.keys(M.played||{}).map(P).filter(p=>p&&p.cl===S.clubId);
 V.cnt=V.cnt||{};const K=V.cnt;{let ld=0,beh=false;M.ev.forEach(e=>{if(e.t==='goal'){ld+=e.s===ui?1:-1;if(ld<0)beh=true;}});if(my>th){if(M.derby)K.dw=(K.dw||0)+1;if(beh)K.cb=(K.cb||0)+1;if(my-th>=4)K.bw=(K.bw||0)+1;}}
 V.cc=V.cc||{};const gl={};M.ev.forEach(e=>{if(e.t==='goal'&&e.s===ui)gl[e.p]=(gl[e.p]||0)+1;});
 mine.forEach(p=>{const c=V.cc[p.id]||(V.cc[p.id]={a:0,g:0});c.a++;c.g+=gl[p.id]||0;
  if(p.yth&&(p.car||{}).ap===1&&!V.ms[p.id+':deb']){V.ms[p.id+':deb']=1;V.cnt.yd=(V.cnt.yd||0)+1;addNews('🌱',`${p.n} z akademie si odbyl debut v A-týmu.`,1);v12Tl('🌱',`Debut odchovance: ${p.n}.`);if(RNG()<0.7)v12Ig(p,'debut');}
  V12_MA.forEach(t=>{if(c.a===t){addNews('🎖️',`${p.n} odehrál pod tvým vedením už ${t} zápasů.`,1);if(t>=100)v12Tl('🎖️',`${p.n}: ${t} zápasů pod tvým vedením.`);if(RNG()<0.7)v12Ig(p,'ms',{n:t});}});
  V12_MG.forEach(t=>{if(c.g>=t&&c.g-(gl[p.id]||0)<t){addNews('🎖️',`${p.n} dal pod tvým vedením už ${t} ${czPlural(t,'gól','góly','gólů')}!`,1);if(t>=25)v12Tl('⚽',`${p.n}: ${t} ${czPlural(t,'gól','góly','gólů')} pod tvým vedením.`);if(RNG()<0.7)v12Ig(p,'msg',{n:t});}});});
 for(const id in V.cc){const q=P(id);if(!q||q.cl!==S.clubId)delete V.cc[id];}
 const sc=M.ev.filter(e=>e.t==='goal'&&e.s===ui).map(e=>P(e.p)).filter(p=>p&&p.cl===S.clubId);const mo=P(motm(M));
 if(my-th>=3&&RNG()<0.7)v12Ig(mine.length?mine[Math.floor(RNG()*mine.length)]:null,'big');
 else if(my>th&&sc.length&&RNG()<0.55)v12Ig(sc[Math.floor(RNG()*sc.length)],'goal');
 else if(mo&&mo.cl===S.clubId&&my>=th&&RNG()<0.35)v12Ig(mo,'motm');
 if(my<th&&RNG()<0.45){const c=(S.v11&&S.v11.cap&&P(S.v11.cap))||mine.sort((a,b)=>b.ovr-a.ovr)[0];if(c&&c.cl===S.clubId)v12Ig(c,'loss');}
 M.ev.filter(e=>e.t==='inj').map(e=>P(e.p)).filter(p=>p&&p.cl===S.clubId).forEach(p=>{if(RNG()<0.5)v12Ig(p,'inj');});
 try{v12FanAfter(M);}catch(e){console.warn(e);}}
// ---------- 7) časová osa klubu ----------
function v12TlItems(){const V=v12();const it=[];(S.history||[]).forEach(h=>{if(h&&h.season!=null)it.push({s:h.season,o:999,ic:'🏁',t:`${h.pos}. místo · ${leagueLabel(h.lg)} · ${h.pts} b.`});});
 (S.trophies||[]).forEach(t=>it.push({s:t.s,o:998,ic:'🏆',t:t.t}));V.tl.forEach(e=>it.push({s:e.s,o:e.r||0,ic:e.ic,t:e.t}));
 const aw=(S.v11&&S.v11.aw)||[];aw.forEach(a=>{['zm','ks','tal','gk'].forEach(k=>{const x=a[k];if(x&&x.c===v12Club())it.push({s:a.s,o:997,ic:'🏅',t:({zm:'Zlatý míč',ks:'Král střelců',tal:'Objev sezóny',gk:'Nejlepší brankář'})[k]+': '+x.n});});});
 return it.sort((a,b)=>b.s-a.s||b.o-a.o);}
function v12TlHtml(n){const it=v12TlItems();if(!it.length)return `<div class="card"><h3>🕰️ Časová osa klubu</h3><div class="small mut">Historie se teprve píše. Milníky, trofeje a velké okamžiky se budou objevovat tady.</div></div>`;
 let last=null,h='';it.slice(0,n||14).forEach(e=>{if(e.s!==last){last=e.s;h+=`<div class="tl12s">${seasonLabel(e.s)}</div>`;}h+=`<div class="tl12"><span>${e.ic}</span><div class="small">${esc(e.t)}</div></div>`;});
 return `<div class="card"><h3>🕰️ Časová osa klubu</h3>${h}${it.length>(n||14)?`<button class="btn ghost w100" style="margin-top:6px" onclick="v12TlSheet()">Celá historie (${it.length})</button>`:''}</div>`;}
function v12TlSheet(){modal(`<h2>🕰️ Časová osa klubu</h2>${v12TlHtml(400).replace(/<button[^]*<\/button>/,'')}<button class="btn ghost w100" onclick="closeModal()">Zavřít</button>`);}
// ---------- 7b) manažerské odznaky ----------
const V12_BD=[['🏆','Sběratel trofejí','trofeje',[1,3,10],()=>(S.trophies||[]).length],['✅','Vítěz','výhry',[25,100,300],()=>(S.v4&&S.v4.career.w)||0],
 ['🛡️','Neporazitelný','zápasů bez porážky v řadě',[5,12,25],()=>(S.v4&&S.v4.career.best)||0],['⚔️','Pán derby','vyhraná derby',[1,5,15],()=>(v12().cnt||{}).dw||0],
 ['🔄','Mistr obratů','otočené zápasy',[1,5,15],()=>(v12().cnt||{}).cb||0],['💥','Kanonáda','výhry o 4 a více gólů',[1,5,15],()=>(v12().cnt||{}).bw||0],
 ['🌱','Pěstitel talentů','debuty odchovanců',[1,5,15],()=>(v12().cnt||{}).yd||0],['🔭','Lovec talentů','skautské zprávy',[1,5,15],()=>(v12().cnt||{}).scn||0],
 ['🔮','Proti proudu','sezóny nad předpovědí expertů',[1,3,6],()=>(v12().cnt||{}).pvb||0],['📅','Věrnost','odtrénované sezóny',[2,5,10],()=>(S.v4&&S.v4.career.seasons)||0]];
function v12BdHtml(){const T=['bronz','stříbro','zlato'];let got=0;const it=V12_BD.map(b=>{const v=b[4]();let t=-1;b[3].forEach((x,i)=>{if(v>=x)t=i;});if(t>=0)got++;const nx=b[3][Math.min(t+1,2)];
  return `<div class="bd12 t${t}"><div class="bi">${b[0]}</div><b>${b[1]}</b><span>${t>=0?T[t]:'zamčeno'}</span><span class="tiny">${v}/${nx} ${esc(b[2])}</span></div>`;}).join('');
 return `<div class="card"><h3>🎖️ Manažerské odznaky · ${got}/${V12_BD.length}</h3><div class="bdg12">${it}</div></div>`;}
// ---------- 8) varování ke kádru ----------
function v12WarnHtml(){if(seasonOver())return '';const ps=clubPlayers(S.clubId);const g=x=>ps.filter(p=>GRP(p.pos)===x).length;const w=[];
 if(ps.length<18)w.push(`V kádru máš jen ${ps.length} ${czPlural(ps.length,'hráče','hráče','hráčů')}. Doporučeno je aspoň 20.`);if(g('G')<2)w.push('Chybí ti náhradní brankář.');if(g('D')<6)w.push('Máš málo obránců.');if(g('M')<5)w.push('Máš málo záložníků.');if(g('F')<3)w.push('Máš málo útočníků.');
 if(!w.length)return '';return `<div class="card warn12"><h3>⚠️ Kádr potřebuje posily</h3>${w.map(x=>`<div class="small">• ${esc(x)}</div>`).join('')}<button class="btn w100" style="margin-top:8px" onclick="go('market')">Do přestupů</button></div>`;}
// ---------- háčky ----------
(function(){
 const _am=v4AfterMatch;v4AfterMatch=function(M){const r=_am.apply(this,arguments);try{v12AfterMatch(M);}catch(e){console.warn(e);}return r;};
 const _wt=weekTick;weekTick=function(){const r=_wt.apply(this,arguments);try{v12ScWeek();v12Pv();}catch(e){console.warn(e);}return r;};
 const _es=endSeason;endSeason=function(){const rep=_es.apply(this,arguments);try{if(rep)rep.v12pv=v12PvEnd(rep);}catch(e){console.warn(e);}return rep;};
 const _ue=uiEndSeason;uiEndSeason=function(){let rep=null;const _e2=endSeason;endSeason=function(){rep=_e2.apply(this,arguments);return rep;};let r;try{r=_ue.apply(this,arguments);}finally{endSeason=_e2;}
  try{const m=document.querySelector('.modal');if(m&&rep&&rep.v12pv){const d=document.createElement('div');d.innerHTML=v12PvEndHtml(rep.v12pv);const b=m.querySelector('.btn.big,.mstick');if(b)b.parentNode.insertBefore(d,b);else m.appendChild(d);}}catch(e){console.warn(e);}return r;};
 const _hc=v4HomeCards;v4HomeCards=function(){let h=_hc.apply(this,arguments);try{h=v12WarnHtml()+v12PvHtml()+h+v12FanHtml();}catch(e){console.warn(e);}return h;};
 const _rt=renderTactics;renderTactics=function(){let h=_rt.apply(this,arguments);try{h=v12PreHtml()+h;}catch(e){console.warn(e);}return h;};
 const _rm=renderMarket;renderMarket=function(){let h=_rm.apply(this,arguments);try{h=v12ScHtml()+h;}catch(e){console.warn(e);}return h;};
 const _rc=renderCareer;renderCareer=function(){let h=_rc.apply(this,arguments);try{h=v12TlHtml()+v12BdHtml()+h;}catch(e){console.warn(e);}return h;};
 const _pm=preMatch;preMatch=function(){const r=_pm.apply(this,arguments);const f=()=>{try{v12PmInject();}catch(e){console.warn(e);}};if(r&&r.then)r.then(f);else f();return r;};
 const _mp=movePlayer;movePlayer=function(p,to){const from=p&&p.cl;const r=_mp.apply(this,arguments);try{if(S&&to===S.clubId&&from&&from!==to&&S.news&&S.news.length&&RNG()<0.75)v12Ig(p,'sign');}catch(e){}return r;};
})();
// ---------- 9) pestřejší krátké zprávy ----------
const V12_NW=[
 [/^(.+) je po zranění znovu k dispozici\.$/,['{1} je po zranění znovu k dispozici.','Dobrá zpráva z ošetřovny: {1} je zpátky.','{1} už je fit a může nastoupit.','{1} dostal od lékařů zelenou.','{1} se vrací do tréninku, zranění je zahojené.','Konec léčení: {1} je připravený hrát.']],
 [/^(.+) se na tréninku zlepšil \(celkem (\d+)\)\.$/,['{1} se na tréninku zlepšil (celkem {2}).','Trénink se vyplácí: {1} se posunul na {2}.','{1} udělal na tréninku pokrok, nově má {2}.','{1} roste před očima – hodnocení {2}.','Poctivá dřina: {1} se zlepšil na {2}.']],
 [/^(.+) dostal pátou žlutou kartu a jeden zápas nebude hrát\.$/,['{1} dostal pátou žlutou kartu a jeden zápas nebude hrát.','Pátá žlutá: {1} si jeden zápas odpočine.','{1} vynechá kvůli žlutým kartám příští zápas.','Karetní trest: {1} jeden zápas nenastoupí.']],
 [/^(.+) byl vyloučen a (jeden zápas|(\d+) zápasy) nebude hrát\.$/,['{1} byl vyloučen a {S} nebude hrát.','Po červené kartě {1} vynechá {S}.','Disciplinární trest: {1} nenastoupí {SA}.','{1} si po vyloučení odsedí {SA}.']],
 [/^(.+) se zranil a bude chybět (.+)\.$/,['{1} se zranil a bude chybět {2}.','Ošetřovna hlásí další zranění: {1} vynechá {2}.','{1} utrpěl zranění, pauza potrvá {2}.','Smůla: {1} bude kvůli zranění chybět {2}.','{1} musel ze hřiště a bude mimo {2}.']],
 [/^(.+) se zranil na tréninku a bude chybět (.+)\.$/,['{1} se zranil na tréninku a bude chybět {2}.','Nepříjemnost z tréninku: {1} vynechá {2}.','{1} si na tréninku přivodil zranění, mimo bude {2}.']]];
(function(){const _an=addNews;addNews=function(ic,t,minor){try{if(typeof t==='string'){for(let i=0;i<V12_NW.length;i++){const [re,arr]=V12_NW[i];const m=t.match(re);if(!m)continue;
 const n=m[3]?+m[3]:1;const S1=n===1?'jeden zápas':n+' '+czPlural(n,'zápas','zápasy','zápasů');
 t=vPick(arr,'nw'+i,arr.length-1).replace(/\{(\d|S|SA)\}/g,(_,k)=>k==='S'||k==='SA'?S1:m[+k]);break;}}}catch(e){}return _an.call(this,ic,t,minor);};})();
// ---------- 10) víc hlášek trenérů soupeře a fóra ----------
(function(){const add=(o,k,a)=>{if(o[k])o[k].push(...a.filter(x=>!o[k].includes(x)));};
 add(RQ,'pre_fav',['Soupeř je kvalitní, ale my jsme připravení.','Chceme pokračovat v sérii a potěšit fanoušky.','Respekt ano, strach ne.','Naše cíle jsou jasné: tři body.','Klíčem bude disciplína a trpělivost.']);
 add(RQ,'pre_dog',['Jsme outsider, ale v jednom zápase je možné všechno.','Kluci jsou hladoví, chtějí ukázat, že na to mají.','Musíme být kompaktní a počkat na svou šanci.','Tlak je na nich, ne na nás.','Pokud budeme efektivní, můžeme překvapit.']);
 add(RQ,'pre_derby',['Na tohle se těšíme celou sezónu.','Derby má vlastní pravidla. Forma nehraje roli.','Kdo zvládne hlavu, ten vyhraje.']);
 add(RQ,'post_win',['Tři body jsou zasloužené, kluci makali do konce.','Vyhráli jsme taktikou a nasazením.','Tohle je cesta, kterou chceme jít.','Jsem spokojený, ale je pořád co zlepšovat.','Soupeř nás potrápil, o to víc si výhry cením.']);
 add(RQ,'post_loss',['Nebyl to náš den, ale z toho se poučíme.','Prohra bolí, ale hlavu nesvěšujeme.','Udělali jsme moc chyb a soupeř je potrestal.','Musíme být v obou šestnáctkách důraznější.','Výkon nebyl špatný, výsledek ano.','Rozbor bude dlouhý, takhle hrát nechceme.']);
 add(RQ,'post_draw',['Remíza je spravedlivá, oba týmy měly své chvíle.','Chtěli jsme vyhrát, ale bod z tohohle zápasu bereme.','Zahodili jsme dvě body, nebo získali jeden? Uvidíme na konci sezóny.','Takový zápas se dá prohrát i vyhrát. Bod je fér.']);
 rivalQuote=function(kind,opp){return vPick(RQ[kind]||RQ.pre_fav,'rq_'+kind,6);};
 add(FORUM,'win',['Tohle byl fotbal s koulema!','Takhle si představuju sobotní odpoledne.','Konečně jsme hráli jako tým.','{B} to dneska táhl sám.','Kluci, díky, stálo to za to.']);
 add(FORUM,'loss',['Tohle se nedá koukat.','Hlavně že vstupné zase zdražili.','{W} by měl jít na lavičku.','Ještě jedna taková a jdu fandit jinam.','Bez nápadu, bez srdce, bez bodů.']);
 add(FORUM,'draw',['Polovičatý výkon, polovičatý výsledek.','Mohlo to být horší, mohlo to být lepší.','Bod, ale radost žádná.']);
})();

// v12b: proměnlivé počasí, hádky s rozhodčím, střety laviček, výpadek proudu, zranění sudího, choreo a pietní akty, nervozita ve velkých zápasech,
// realističtější přerušení kvůli fanouškům (protokol UEFA proti rasismu, vtrhnutí na hřiště) a nové otázky na tiskovkách
function v12F(t,d){return String(t||'').replace(/\{(\w)\}/g,(m,k)=>d&&d[k]!=null?d[k]:m);}
function v12Say(arr,key,d,n){return v12F(vPick(arr,key,n||6),d);}
function v12Live(M){return typeof MS!=='undefined'&&MS&&MS.M===M;}
function v12Hold(M,ms){if(v12Live(M))MS.hold=Math.max(MS.hold||0,ms);}
function v12Age(p){return p&&p.by?S.season-p.by:25;}
function v12Lvl(){const me=myClub();return clamp(Math.exp(((me.rep||60)-60)/15),0.3,4);}
function v12Gen(i){return i===0?'domácích':'hostů';}
function v12Big(M){const F=M.F||{};if(M.derby||F.ko||F.e||F.type==='cup'&&F.final)return true;
 try{const L=S.leagues[myClub().lg];if(L&&S.maxRound&&S.round>=S.maxRound-5){const t=Object.keys(L.table||{}).sort((a,b)=>(L.table[b].pts||0)-(L.table[a].pts||0));const ph=t.indexOf(String(M.h.cid)),pa=t.indexOf(String(M.a.cid));if(ph>=0&&pa>=0&&ph<3&&pa<3)return true;}}catch(e){}return false;}
function v12Ref(M){if(M.v12ref)return M.v12ref;let r=null;try{if(M.F&&typeof rfRef==='function')r=rfRef(M.F);}catch(e){}if(!r)r={n:'rozhodčí',sn:'',per:'hon'};M.v12ref={n:r.n,sn:r.sn||r.n,per:r.per||'hon'};return M.v12ref;}
function v12Snm(id){const p=P(id);if(!p)return '';return typeof pSurname==='function'?pSurname(p):p.n;}
// ================= 1) POČASÍ BĚHEM ZÁPASU =================
Object.assign(WX,{pour:{ic:'🌧️',n:'Liják'},storm:{ic:'⛈️',n:'Bouřka'}});
WX_INTRO.pour='Leje jako z konve, na trávníku stojí voda.';WX_INTRO.storm='Nad stadionem se blýská, hraje se v bouřce.';
WX_FILL.pour=['V kalužích se míč zastavuje, přihrávky po zemi nemají smysl.','Hráči v lijáku sotva vidí na krok.'];WX_FILL.storm=['Hromy přehlušují i kotel.','Blesky křižují oblohu, sudí nervózně pokukuje nahoru.'];
(function(){const _wf=wxFx;wxFx=function(w){const k=w&&w.k;if(k==='pour'||k==='storm'){const r=_wf(Object.assign({},w,{k:'rain'}));r.rate*=k==='pour'?1.04:1.02;r.acc*=0.93;r.inj*=1.12;r.drain*=1.06;r.short=-1.2;return r;}return _wf.apply(this,arguments);};})();
const V12_WXC={rain:['Nad stadionem se zatáhlo a spustil se déšť.','Přišla přeháňka, diváci na nekrytých místech vytahují pláštěnky.','Začíná pršet, míč bude na trávníku klouzat.','Z šedých mraků se spustil déšť a hra se zrychlila.','Začalo pršet. Trávník rychle těžkne a obránci si musí dávat pozor.'],
 pour:['Průtrž mračen! Leje jako z konve a na trávníku se tvoří kaluže.','Déšť zesílil v liják, míč se v kalužích zastavuje.','Liják! Každá přihrávka po zemi je teď loterie.','Voda stojí v pokutovém území, brankáři mají těžkou práci.'],
 storm:['⛈️ Nad stadionem se blýská a hřmí, přišla bouřka.','⛈️ Bouřka! Hromy přehlušily i kotel.','⛈️ Oblohu křižují blesky, delegát zápasu nervózně sleduje radar.'],
 snow:['Začalo sněžit! Pořadatelé chystají oranžový míč.','Do zápasu se snáší sníh a čáry jsou čím dál hůř vidět.','Sněhová přeháňka, hráči kloužou při každé otočce.'],
 fog:['Nad hřiště se snesla mlha, z tribun je vidět sotva k půlce.','Mlha houstne. Brankáři vidí střely až na poslední chvíli.','Přišla mlha a diváci za brankou mají problém sledovat hru.'],
 wind:['Zvedl se silný vítr, dlouhé míče dělají psí kusy.','Poryvy větru! Odkop brankáře plachtí úplně jinam.','Vítr sílí a centry se stáčejí za branku.'],
 heat:['Mraky se roztrhaly a pálí slunce, hráči začínají trpět vedrem.','Na hřiště se opřelo ostré slunce, tempo hry viditelně klesá.'],
 sun:['Déšť ustal a vysvitlo slunce.','Obloha se vyjasnila, podmínky se zlepšují.','Přestalo pršet a nad stadionem je modré nebe.'],
 cloud:['Zatáhlo se, ale zatím neprší.','Déšť přestal, obloha zůstává šedá.','Počasí se uklidnilo, nad stadionem je jen zataženo.'],
 fogoff:['Mlha se zvedla, konečně je vidět na celé hřiště.','Mlha řídne, hra je zase přehledná.']};
const V12_WXF=['Předpověď slibovala {F}, nad stadionem je ale {X}.','Meteorologové se netrefili: místo předpovězeného počasí ({F}) je {X}.','Kdo věřil předpovědi ({F}), teď kouká: {X}.'];
const V12_SLIP=['{P} uklouzl na mokrém trávníku a přišel o míč.','Kluzký trávník: {P} podklouzl při obratu.','{P} špatně odhadl odskok z mokré trávy a míč mu utekl.','Přihrávka se zastavila v kaluži a soupeř ji rád převzal.','Na mokrém trávníku padají hráči jeden přes druhého.','Míč na mokré trávě zrychlil a {P} ho nezpracoval.'];
const V12_SLIPS=['{P} se na sněhu nedokázal otočit a míč ztratil.','Sníh na trávníku zastavil přihrávku a hráči ji museli hledat.','{P} uklouzl na zasněženém trávníku.'];
const V12_GKE={wet:['Brankáři {G} vyklouzl mokrý míč z rukou!','{G} nezachytil kluzký míč a ten se odrazil před branku!','Hrubka! {G} pustil mokrý míč před sebe a hrozí dorážka!'],fog:['V mlze vyběhl brankář {G} pozdě a míč minul!','{G} v mlze ztratil míč z očí, před brankou je zmatek!'],wind:['Vítr změnil dráhu míče a {G} se na centr vůbec nedostal!']};
const V12_WIND=['Dlouhý míč vítr zastavil a vrátil ho na půlku.','Vítr odnesl centr až do zámezí.','Odkop brankáře se ve větru stočil do autu.','Proti větru hrají hráči raději po zemi.'];
const V12_HEATB=['Rozhodčí kvůli vedru nařídil přestávku na pití.','Přestávka na občerstvení – hráči se hrnou k lahvím s vodou.','Kvůli horku je přestávka na pití, trenéři toho využívají k pokynům.'];
const V12_STORMI=['⛈️ Kvůli blesku nad stadionem přerušil sudí zápas a poslal hráče do kabin. Dokud se blesky nevzdálí, hrát se nebude.','⛈️ Bouřka je přímo nad stadionem, hra je přerušena. Hráči odbíhají do kabin a diváci se kryjí pod střechou.','⛈️ Blesk udeřil kousek za stadionem. Rozhodčí neváhal a hráče stáhl do bezpečí kabin.','⛈️ Hromy duní přímo nad hlavami. Delegát s rozhodčím zápas přerušili, dokud bouřka nepřejde.'];
const V12_STORMR=['Bouřka přešla, hráči se po {N} minutách vracejí na hřiště a hra pokračuje.','Po {N} minutách čekání je zase klid, zápas pokračuje. Trávník je ale těžký.','Nebe se vyjasnilo, po {N} minutách se hráči znovu rozcvičují a sudí obnovuje hru.','Pořadatelé shrnuli vodu z vápna a po {N} minutách se znovu hraje.'];
function v12WxName(k){return (WX[k]||WX.sun).n.toLowerCase();}
function v12WxNext(k,t,z){const O={sun:[['rain',z==='D'?0.05:0.34],['cloud',0.3],['wind',0.14],['heat',t>=27?0.32:0],['storm',t>=19&&z!=='D'?0.12:0],['fog',t<8?0.08:0]],
 cloud:[['rain',z==='D'?0.05:0.4],['pour',0.08],['storm',t>=16?0.12:0],['wind',0.15],['sun',0.22],['snow',t<=1?0.4:0],['fog',t<9?0.12:0]],
 rain:[['pour',0.34],['storm',t>=15?0.2:0],['cloud',0.3],['snow',t<=2?0.22:0],['wind',0.1],['sun',0.1]],
 pour:[['storm',t>=14?0.3:0],['rain',0.55]],storm:[['pour',0.55],['rain',0.45]],snow:[['cloud',0.4],['rain',t>=1?0.3:0],['fog',0.2]],
 wind:[['rain',0.4],['sun',0.3],['storm',t>=16?0.15:0]],heat:[['storm',t>=24?0.45:0],['sun',0.4],['cloud',0.2]],fog:[['cloud',0.5],['sun',0.2],['rain',0.3]]}[k]||[['cloud',1]];
 const tot=O.reduce((s,x)=>s+x[1],0);let r=RNG()*tot;for(const [kk,w] of O){r-=w;if(r<=0)return kk;}return O[0][0];}
function v12WxPlan(M){if(!M.wx||!(M.h.user||M.a.user))return;let z='C';try{const c=CL(M.h.cid);const cc=c&&c.foreign?clubCC(M.h.cid):S.cc;z=climOf(cc);}catch(e){}
 M.wxF={k:M.wx.k,t:M.wx.t};M.fx0=Object.assign({},M.fx);M.wxPlan=[];
 if(RNG()<0.12){const k=v12WxNext(M.wx.k,M.wx.t,z);if(k!==M.wx.k){const f=M.wx.k;M.wx=Object.assign({},M.wx,{k,t:M.wx.t+(k==='storm'||k==='pour'?-2:k==='heat'?2:0)});M.fx=wxFx(M.wx);M.fx0=Object.assign({},M.fx);
  M.ev.push({m:0,t:'fill',wxf:1,tx:v12Say(V12_WXF,'wxf',{F:v12WxName(f),X:v12WxName(k)+', '+M.wx.t+' °C'},2)});}}
 const p=z==='D'?0.07:0.2;if(RNG()<p){let m=rint(12,75);M.wxPlan.push({m,z});if(RNG()<0.3)M.wxPlan.push({m:Math.min(88,m+rint(10,25)),z});}}
function v12WxStep(M,add){const pl=M.wxPlan;if(!pl||!pl.length||M.min<pl[0].m)return;const x=pl.shift();const from=M.wx.k;let k=v12WxNext(from,M.wx.t,x.z);if(k===from)return;
 const t=M.wx.t+(k==='storm'||k==='pour'?-rint(2,5):k==='heat'?rint(1,3):k==='snow'?-1:0);M.wx=Object.assign({},M.wx,{k,t});M.fx=wxFx(M.wx);M.wxc=(M.wxc||0)+1;if(k==='pour'||k==='storm'||k==='snow')M.wxh=1;
 const pool=from==='fog'&&k!=='fog'?V12_WXC.fogoff:V12_WXC[k]||V12_WXC.cloud;add.push({m:M.min,t:'wx',k,from,tx:`${WX[k].ic} `+vPick(pool,'wxc_'+k,3).replace(/^⛈️ /,'')});
 if(k==='storm'&&RNG()<0.35){const n=rint(10,30);const h=Math.max(0,Math.min(3,M.half-1));M.added[h]=Math.min(15,(M.added[h]||1)+Math.min(5,Math.round(n/6)));
  add.push({m:M.min,t:'wxint',n,tx:v12Say(V12_STORMI,'wxint',{N:n},2)});M.v12res={m:M.min+1,t:'wxres',tx:v12Say(V12_STORMR,'wxres',{N:n},2)};M.v12stop=(M.v12stop||0)+1;v12Hold(M,4200);}
 try{if(v12Live(M)&&MS.chat&&MS.chat.users&&MS.chat.users.length){const u=pick(MS.chat.users);chSay(M,u,'wx_'+k,{},true);if(typeof chReply==='function'&&RNG()<0.5)chReply(M,u,0.6);}}catch(e){}}
function v12WxExtra(M,add){const k=M.wx&&M.wx.k;if(!k||M.ended)return;const m=M.min;
 const wet=k==='rain'||k==='pour'||k==='storm',sn=k==='snow';
 if((wet||sn)&&RNG()<(k==='pour'?0.03:0.016)){const i=RNG()<0.5?0:1;const id=pick(onPitch(M.sides[i]).filter(x=>P(x)&&P(x).pos!=='GK'));if(id)add.push({m,t:'fill',s:i,wxe:1,tx:v12Say(sn?V12_SLIPS:V12_SLIP,sn?'slips':'slip',{P:nm(id)},4)});}
 if(k==='wind'&&RNG()<0.014)add.push({m,t:'fill',wxe:1,tx:vPick(V12_WIND,'wind',3)});
 if(k==='heat'&&(m===30||m===75)&&!(M.v12hb&&M.v12hb[m])){M.v12hb=M.v12hb||{};M.v12hb[m]=1;add.push({m,t:'fill',wxe:1,tx:vPick(V12_HEATB,'heatb',2)});const h=Math.max(0,Math.min(3,M.half-1));M.added[h]=Math.min(15,(M.added[h]||1)+1);}
 const gkp=k==='pour'||sn?0.0022:k==='rain'||k==='storm'?0.0012:k==='fog'?0.0012:k==='wind'?0.0008:0;
 for(let i=0;i<2&&!M.ended;i++){if(gkp&&RNG()<gkp){const g=gkOf(M.sides[1-i]);if(!g)continue;const pool=wet||sn?V12_GKE.wet:V12_GKE[k];add.push({m,t:'fill',s:i,gke:1,tx:v12Say(pool,'gke'+k,{G:nm(g)},3)});try{const r=chance(M,i);r.forEach(e=>add.push(e));}catch(e){}}}}
// kurzy reagují na počasí
function v12XgK(M){if(!M||!M.fx||!M.fx0)return 1;const a=(M.fx.rate||1)*(M.fx.acc||1),b=(M.fx0.rate||1)*(M.fx0.acc||1);const k=b?a/b:1;return isFinite(k)?clamp(k,0.7,1.4):1;}
(function(){['chProbs','lvProbs'].forEach(fn=>{if(typeof globalThis[fn]!=='function')return;const o=globalThis[fn];const w=function(M){const k=v12XgK(M);if(k===1||!M||!M.xg)return o.apply(this,arguments);const x=M.xg;M.xg=[x[0]*k,x[1]*k];try{return o.apply(this,arguments);}finally{M.xg=x;}};
 if(fn==='chProbs')chProbs=w;else lvProbs=w;});})();
Object.assign(CH,{wx_pour:['Liják jak blázen, teď rozhoduje náhoda, ne kvalita.','V tomhle bahně padne vlastňák, sázím na to.','Kurzy na víc gólů padají, v kalužích se brankáři trápí.','Kdo vsadil na technický fotbal, má smůlu. Teď se hraje vodní pólo.'],
 wx_storm:['Bouřka! Jestli to přeruší, můj live tiket se tu usmaží.','Blesky nad stadionem, sázkovky už určitě počítají s přerušením.','Hřmí, padá voda a já tu mám AKO. Super.'],
 wx_cloud:['Aspoň přestalo pršet, snad se teď začne hrát fotbal.','Počasí se uklidnilo, tak uvidíme, jestli se uklidní i favorit.'],
 wx_sun:['Vysvitlo slunce, technici teď budou mít navrch.','Konečně hezky. Teď už nemají výmluvu.'],
 wxint:['Přerušeno kvůli bouřce, tak jdu do lednice. Tiket počká.','Kurzy zamrzly, nikdo neví, kdy se bude pokračovat.','Čekání na bouřku je horší než penalty.'],
 refarg:['Ten sudí je dneska úplně mimo, a ještě se diví, že se hádají.','Hráči kolem sudího jak vosy. Ať se nediví, když to skončí kartou.','Takhle se nediskutuje, za chvíli tam bude červená a můj tiket v háji.','Sudí to zabil, ale hráči se musí ovládat. Žlutá jak vyšitá.','Kapitán aspoň myslí, ostatní by se nejradši poprali.','Viděl tu penaltu vůbec? Brýle mu kupte!'],
 bench:['Lavičky se hádají víc než hráči na hřišti 😂','Asistent trenéra by měl jít do ringu, ne na lavičku.','Takový cirkus u čáry jsem dlouho neviděl.']});
// ================= 2) HÁDKY S ROZHODČÍM =================
const V12_AR={
 pro:['Hráči {T} obklopili rozhodčího. Nemůžou uvěřit, že {D}.','{P} běží k sudímu a rozhazuje rukama. Podle něj sudí {D} úplně zbytečně.','Kolem sudího je hlouček hráčů {T}, nejhlasitěji křičí {P}.','{P} ukazuje na oči a pak na rozhodčího – naznačuje, že sudí snad nevidí.','Emoce vřou! {P} se se sudím dohaduje tváří v tvář.','Celá lavička {T} vyskočila. Že sudí {D}, tam nikdo nechápe.','{P} ironicky tleská sudímu. To se nemusí vyplatit.','Sudí {R} couvá před rozzlobeným hloučkem hráčů {T}.','{P} se drží za hlavu a pak vyráží za sudím. Protesty jsou hodně ostré.','Hráči {T} se nemůžou smířit s tím, že sudí {D}. Ten ale trvá na svém.','{P} vede protestující hlouček, sudí {R} gestem vrací hráče na místa.','{P} hlasitě nadává směrem k rozhodčímu. Sudí {R} si ho zatím jen zapamatoval.','Hodně ostrá debata: {P} by si se sudím rád vyříkal každý detail.','{P} pronásleduje sudího skoro až k čáře, sudí {R} ho musí odhánět.'],
 cap:['Kapitán {C} odtahuje spoluhráče od sudího, než bude pozdě.','{C} jako kapitán uklidňuje spoluhráče a se sudím mluví v klidu.','Rozumný zásah kapitána: {C} chytil spoluhráče kolem ramen a odvedl ho pryč.','{C} gestem krotí spoluhráče. Kapitánská páska zavazuje.','Kapitán {C} se sudímu omlouvá za chování spoluhráčů.','{C} si bere slovo, se sudím mluví jen kapitán. Ostatní se stáhli.','{C} odstrkuje vlastní spoluhráče od rozhodčího – ví, že další karta by bolela.','Kapitán {C} se snaží situaci zklidnit, i když je sám zjevně naštvaný.'],
 calm:['Sudí {R} hráče vyslechl, ale na svém rozhodnutí trvá.','Sudí {R} protesty ignoruje a ukazuje, ať se hraje dál.','{P} byl sudím důrazně napomenut. Tentokrát ještě bez karty.','Rozhodčí protesty utnul jediným gestem. Hraje se dál.','Sudí odhání hráče a píská. Karta nepřišla, další protest by ji ale znamenal.','Sudí {R} zůstává klidný a posílá hráče na místa.'],
 len:['Sudí {R} nad protesty jen mávl rukou. Dnes je k nim podivně shovívavý.','Za takové řeči by jindy padla karta, sudí {R} ale dělá, že nic neslyšel.','Sudí {R} protestující jen poplácal po rameni. Na tribunách se ozývá pískot.'],
 yel:['🟨 {P} dostává žlutou za protesty. Sudí {R} už toho měl dost.','🟨 Za řeči k sudímu vidí žlutou kartu {P}.','🟨 Sudí sahá do kapsy: {P} vidí žlutou za nesportovní chování.','🟨 {P} to přehnal s gestikulací a je napomínán žlutou kartou.','🟨 Žlutá karta: {P}. Nadávky směrem k rozhodčímu se nevyplácejí.','🟨 {P} zaplatil za protesty žlutou kartou.','🟨 {P} se nedokázal ovládnout a sudí {R} mu ukázal žlutou.'],
 red2:['🟥 Druhá žlutá za protesty a {P} jde do kabin! Zbytečné vyloučení.','🟥 {P} nepřestal protestovat a za druhou žlutou letí ze hřiště.','🟥 Neuvěřitelné! {P} už měl žlutou, dál protestoval a teď vidí červenou.','🟥 Sudí {R} neváhá: druhá žlutá a {P} musí pryč. Spoluhráči se chytají za hlavu.'],
 red:['🟥 Přímá červená! {P} sudího urazil a jde okamžitě pod sprchy.','🟥 {P} to přehnal – za urážku rozhodčího dostává rovnou červenou.','🟥 Tohle bude mít dohru u komise: {P} je vyloučen za hrubé urážky sudího.'],
 mass:['Do hloučku se přidali i hráči soupeře, chvíli to vypadá na hromadnou strkanici.','U sudího je teď skoro dvacet hráčů. Pořadatelé zpozorněli.','Strkání a pokřikování z obou stran, sudí {R} se snaží vše uklidnit.','Vyhrocená scéna: do strkanice se zapojil i {Q}.'],
 coach:['🗣️ Trenér {T} zuří u postranní čáry a křičí na čtvrtého rozhodčího.','🗣️ Na lavičce {T} to vře, trenér rozhazuje rukama a ukazuje na hodinky.','🗣️ Trenér {T} vyběhl až k čáře a hlasitě protestuje.','🗣️ Kouč {T} se nemůže uklidnit, čtvrtý rozhodčí ho musí krotit.','🗣️ Trenér {T} kopl do láhve s vodou. Tohle rozhodnutí ho rozpálilo.','🗣️ Asistenti drží trenéra {T}, aby nevběhl na hřiště.'],
 coachoff:['🟥 Sudí {R} poslal trenéra {T} na tribunu! Lavičku přebírá asistent.','🟥 Konec na lavičce: trenér {T} to s protesty přehnal a musí na tribunu.','🟥 Trenér {T} byl vykázán z lavičky, zbytek zápasu uvidí z tribuny.','🟥 Červená karta pro trenéra {T}! Za protesty musí opustit technickou zónu.'],
 bench:['Strkanice mezi lavičkami! Realizační týmy obou celků se do sebe pustily u postranní čáry.','U čáry to jiskří: asistenti obou trenérů na sebe pokřikují a čtvrtý rozhodčí je musí rozdělit.','Na lavičkách je dusno, kustod {T} se pustil do sporu s náhradníky soupeře.','Hádka mezi lavičkami, do technické zóny musel vstoupit i delegát zápasu.'],
 staffY:['🟨 Žlutou kartu dostává asistent trenéra {T} za nesportovní chování u lavičky.','🟨 Sudí udělil žlutou i členovi realizačního týmu {T}.'],
 staffR:['🟥 Asistent trenéra {T} je vykázán na tribunu za strkání s protivníkem.','🟥 Člen realizačního týmu {T} vidí červenou a musí opustit lavičku.']};
const V12_ARD={pen:'nařídil penaltu',red:'vyloučil jejich spoluhráče',var:'po videu změnil rozhodnutí',vg:'po videu gól neuznal',yel:'ukázal žlutou kartu',goal:'ten gól uznal',off:'odpískal ofsajd'};
function v12Temp(id){const k=typeof pers==='function'?pers(P(id)):null;return k==='hh'?3.2:k==='vu'?1.4:k==='pro'?0.5:k==='fl'?0.9:1;}
function v12Cap(M,s){const on=onPitch(M.sides[s]);if(M.sides[s].user&&typeof v11Cap==='function'){try{const c=v11Cap();if(c&&on.includes(c))return c;}catch(e){}}
 const vu=on.find(id=>typeof pers==='function'&&pers(P(id))==='vu');if(vu)return vu;let b=null,ba=0;on.forEach(id=>{const a=v12Age(P(id));if(a>ba){ba=a;b=id;}});return b;}
function v12A(M){if(!M.v12a)M.v12a={n:0,last:-99,dy:[0,0],dr:[0,0],coach:[0,0],coachOff:[0,0],staffY:[0,0],staffR:[0,0],mass:[0,0],ins:[],bench:0};return M.v12a;}
function v12CardAdd(M,s,id,kind,add,txt){const sd=M.sides[s];M.yc=M.yc||{};const A=v12A(M);
 if(kind==='yel'&&!M.yc[id]){M.yc[id]=1;M.stats[s].yc++;M.rt[id]=(M.rt[id]||6)-0.3;P(id)._myc=(P(id)._myc||0)+1;A.dy[s]++;add.push({m:M.min,t:'yel',s,p:id,dis:1,tx:txt});return 'y';}
 M.stats[s].rc++;M.rt[id]=(M.rt[id]||6)-1.5;P(id)._mred=kind==='red'?rint(2,3):1;removeFromPitch(M,s,id);sd.red++;A.dr[s]++;if(kind==='red')A.ins.push(id);add.push({m:M.min,t:'red',s,p:id,dis:1,tx:txt});return 'r';}
function v12Dispute(M,e,add){if(!(M.h.user||M.a.user)||M.ended)return;const A=v12A(M);if(A.n>=2||M.min-A.last<8)return;
 let tr=e.t,ps,base;if(e.dis||e.br&&e.t!=='pen')return;
 if(tr==='pen'){ps=1-e.s;base=0.2;}else if(tr==='red'){ps=e.s;base=0.2;}else if(tr==='var'){ps=e.s;base=0.35;if(e.vg)tr='vg';}else if(tr==='yel'){ps=e.s;base=0.015;}else if(tr==='goal'){if(e.pen)return;ps=1-e.s;base=0.01;}else if(tr==='off'){ps=e.s;base=0.01;}else return;
 const on=onPitch(M.sides[ps]).filter(id=>P(id)&&P(id).pos!=='GK');if(on.length<3)return;
 const hot=on.filter(id=>v12Temp(id)>3).length;let p=base*(M.derby?1.4:1)*(1+0.15*hot)*(M.min>75&&Math.abs(M.score[0]-M.score[1])<=1?1.2:1);
 p*=0.65;const R=v12Ref(M);if(M.bribe&&M.bribe.side!==ps)p*=1.3;if(RNG()>=p)return;
 A.n++;A.last=M.min;const L=wpick(on,id=>v12Temp(id)*(GRP(P(id).pos)==='D'?0.9:1.1));const d={P:nm(L),R:R.sn,T:v12Gen(ps),D:V12_ARD[tr]||'rozhodl takhle'};
 add.push({m:M.min,t:'arg',k:'pro',s:ps,p:L,tx:v12Say(V12_AR.pro,'ar_pro',d,8)});
 let card=(0.22+(v12Temp(L)>3?0.2:0))*(R.per==='cau'?1.15:1)*(M.yc&&M.yc[L]?0.75:1);let red=0.012+(v12Temp(L)>3?0.03:0);
 const C=v12Cap(M,ps);if(C&&C!==L&&RNG()<0.55){card*=v12Temp(C)===1.4?0.45:0.6;red*=0.5;add.push({m:M.min,t:'arg',k:'cap',s:ps,p:C,tx:v12Say(V12_AR.cap,'ar_cap',Object.assign({},d,{C:nm(C)}),5)});}
 let len=false;if(M.bribe&&M.bribe.side===ps){card*=0.4;red*=0.3;len=true;}else if(M.bribe){card*=1.3;}
 const r=RNG();if(r<red){v12CardAdd(M,ps,L,'red',add,v12Say(V12_AR.red,'ar_red',d,2));}
 else if(r<red+card){const two=M.yc&&M.yc[L];v12CardAdd(M,ps,L,two?'red2':'yel',add,v12Say(two?V12_AR.red2:V12_AR.yel,two?'ar_red2':'ar_yel',d,4));}
 else add.push({m:M.min,t:'arg',k:'calm',s:ps,p:L,tx:v12Say(len?V12_AR.len:V12_AR.calm,len?'ar_len':'ar_calm',d,4)});
 if(RNG()<0.1*(M.derby?1.6:1)){A.mass[ps]++;const oq=onPitch(M.sides[1-ps]).filter(id=>P(id)&&P(id).pos!=='GK');const Q=oq.length?wpick(oq,v12Temp):null;add.push({m:M.min,t:'arg',k:'mass',s:ps,p:L,tx:v12Say(V12_AR.mass,'ar_mass',Object.assign({},d,{Q:Q?nm(Q):'brankář'}),3)});
  if(Q&&RNG()<0.35)v12CardAdd(M,1-ps,Q,M.yc&&M.yc[Q]?'red2':'yel',add,v12Say(V12_AR.yel,'ar_yel',{P:nm(Q),R:R.sn},4));}
 const userBanned=M.sides[ps].user&&(v12Live(M)&&MS.ban||ownOnly());
 if(!userBanned&&RNG()<0.4){A.coach[ps]++;add.push({m:M.min,t:'arg',k:'coach',s:ps,tx:v12Say(V12_AR.coach,'ar_coach',d,4)});
  if(RNG()<0.11*(R.per==='cau'?1.3:1)){A.coachOff[ps]++;add.push({m:M.min,t:'arg',k:'coachoff',s:ps,tx:v12Say(V12_AR.coachoff,'ar_coff',d,2)});
   if(M.sides[ps].user&&!ownOnly()){v12().cban=1;if(v12Live(M)){MS.ban=1;M.autoUser=true;try{toast('Sudí tě poslal na tribunu. Zbytek zápasu vede asistent.');}catch(x){}}}}}
 if(RNG()<0.05)v12Bench(M,add,ps);
 try{if(v12Live(M)&&MS.chat&&MS.chat.users&&MS.chat.users.length)chSay(M,pick(MS.chat.users),'refarg',{},true);}catch(x){}}
function v12Bench(M,add,s){const A=v12A(M);if(A.bench)return;A.bench=1;if(s==null)s=RNG()<0.5?0:1;const d={T:v12Gen(s)};add.push({m:M.min,t:'arg',k:'bench',s,tx:v12Say(V12_AR.bench,'ar_bench',d,2)});
 const r=RNG();if(r<0.14){A.staffR[s]++;add.push({m:M.min,t:'arg',k:'staffR',s,tx:v12Say(V12_AR.staffR,'ar_sr',d,1)});}else if(r<0.6){A.staffY[s]++;add.push({m:M.min,t:'arg',k:'staffY',s,tx:v12Say(V12_AR.staffY,'ar_sy',d,1)});}
 try{if(v12Live(M)&&MS.chat&&MS.chat.users&&MS.chat.users.length)chSay(M,pick(MS.chat.users),'bench',{},true);}catch(x){}}
// ================= 3) VÝPADEK PROUDU, ZRANĚNÍ SUDÍHO =================
const V12_PW=['💡 Na stadionu vypadlo osvětlení! Sudí okamžitě přerušil zápas.','💡 Tma! Stožáry osvětlení zhasly a hráči stojí ve tmě. Hra je přerušena.','💡 Výpadek proudu – polovina reflektorů nesvítí a sudí hru zastavil.','💡 Stadion se ponořil do tmy. Rozhodčí svolal kapitány a hra stojí.','💡 Krátké zablikání a pak tma – vypadl hlavní rozvaděč. Sudí přerušil utkání.','💡 Jeden ze stožárů zhasl a na půlce hřiště není nic vidět. Rozhodčí hru zastavuje, hráči čekají u postranní čáry.'];
const V12_PWR=['💡 Po {N} minutách se reflektory znovu rozsvítily a hra pokračuje.','💡 Technici nahodili náhradní zdroj, po {N} minutách se hraje dál.','💡 Reflektory se postupně rozsvěcují. Po {N} minutách čekání se znovu hraje.','💡 Elektrikáři závadu našli, světla svítí a po {N} minutách pauzy hra pokračuje.','💡 Po {N} minutách je osvětlení zpět. Hráči se krátce rozběhali a sudí pískl.'];
const V12_PWD=['💡 Světla se nepodařilo opravit. Delegát rozhodl, že se zápas dohraje následující den od přerušené minuty.','💡 Ani po dlouhém čekání se světla nerozsvítila. Delegát svazu zápas přerušil, dohraje se zbytek utkání od přerušené minuty.'];
const V12_PWD2=['▶️ Dohrávka: zápas pokračuje druhý den od {M}. minuty před poloprázdným stadionem.'];
const V12_RI=['🚑 Sudí {R} si při sprintu natáhl sval a nemůže pokračovat. Píšťalku přebírá čtvrtý rozhodčí {Q}.','🚑 Zranění rozhodčího! Sudí {R} kulhá z hřiště, zápas dopíská čtvrtý rozhodčí {Q}.','🚑 Sudí {R} musel kvůli zranění střídat. Novým hlavním rozhodčím je {Q}, čtvrtým se stává náhradní asistent.','🚑 Rozhodčí {R} si sáhl na lýtko a dál nemůže. Zápas přebírá čtvrtý rozhodčí {Q}.','🚑 Sudího {R} zradilo koleno. Po krátkém ošetření odchází, píská čtvrtý rozhodčí {Q}.'];
function v12PwStep(M,add){const X=M.v12pw;if(!X||X.done||M.min<X.m)return;X.done=1;const n=RNG()<0.15?rint(40,70):rint(4,22);M.v12stop=(M.v12stop||0)+1;
 add.push({m:M.min,t:'pwr',n,tx:vPick(V12_PW,'pw',2)});const h=Math.max(0,Math.min(3,M.half-1));M.added[h]=Math.min(15,(M.added[h]||1)+Math.min(4,Math.round(n/8)));v12Hold(M,4500);
 if(n>=40){add.push({m:M.min,t:'fill',tx:pick(V12_PWD)});M.v12res={m:M.min+1,t:'pwres',tx:v12F(V12_PWD2[0],{M:M.min})};M.att=Math.round((M.att||0)*0.4);}
 else M.v12res={m:M.min+1,t:'pwres',tx:v12Say(V12_PWR,'pwr',{N:n},1)};M.v12pwH=M.h.user?1:0;}
function v12RiStep(M,add){const X=M.v12ri;if(!X||X.done||M.min<X.m)return;X.done=1;const R=v12Ref(M);let pool=['Petr Hrubý','Jan Sedláček','Martin Kalina'];try{const c=String((S.clubs[M.h.cid]||{}).lg||'');pool=(RF_NAMES[rfPool(c)]||RF_NAMES.x||pool).filter(x=>x!==R.n);}catch(e){}
 const Q=pick(pool)||'náhradník';add.push({m:M.min,t:'rinj',tx:v12Say(V12_RI,'ri',{R:R.sn,Q},2)});const h=Math.max(0,Math.min(3,M.half-1));M.added[h]=Math.min(15,(M.added[h]||1)+rint(2,4));
 M.v12ref={n:Q,sn:String(Q).split(' ').slice(-1)[0],per:'cau'};M.v12stop=(M.v12stop||0)+1;v12Hold(M,3000);}
// ================= 4) CHOREO, PIETNÍ AKTY =================
const V12_CHO=['🎨 Před výkopem rozvinul domácí kotel obří choreo přes celou tribunu: klubový znak a nápis „Tohle město je naše“.','🎨 Domácí tribuna se proměnila v mozaiku v klubových barvách. Choreo připravovali fanoušci několik týdnů.','🎨 Kotel přivítal hráče gigantickou plachtou s legendami klubu a tisíci barevných vlajek.','🎨 Hostující sektor odpověděl vlastním chorem a zpěvem, derby má od první minuty náboj.','🎨 Celý stadion zvedl barevné kartony – vznikla obří vlajka přes tři tribuny.'];
const V12_SIL=['🕯️ Před výkopem proběhla minuta ticha za zesnulého dlouholetého klubového maséra. Hráči nastoupili se smutečními páskami.','🕯️ Stadion držel minutu ticha za zesnulého správce stadionu, který v klubu sloužil přes čtyřicet let.','🕯️ Minutou ticha uctili hráči i fanoušci památku zesnulého dlouholetého vedoucího mládeže.','🕯️ Před výkopem se držela minuta ticha za bývalého hráče klubu, který zemřel minulý týden. Kotel stál se šálami nad hlavou.'];
const V12_REM='🕯️ Před výkopem proběhla minuta ticha k uctění obětí válek (Remembrance Day). Hráči mají na dresech vlčí máky.';
const V12_APL=['👏 V {N}. minutě tleská celý stadion na počest klubové legendy {L}, jejíž číslo {N} je vyřazené.','👏 {N}. minuta a fanoušci povstali: potlesk pro legendu {L} s vyřazeným číslem {N}.','👏 V {N}. minutě se stadionem nese potlesk pro {L}. Jeho číslo {N} už v klubu nikdo neobleče.'];
const V12_APLI=['👏 V 10. minutě tleská stadion na podporu zraněného spoluhráče – {P} se léčí z vážného zranění.','👏 Fanoušci v 10. minutě vyvěsili transparent a zatleskali: {P} se po těžkém zranění vrací do formy.'];
function v12Cere(M){if(!(M.h.user||M.a.user))return;const V=v12();
 if(M.derby&&(M.att||0)>0&&RNG()<0.55)M.ev.push({m:0,t:'fill',cer:'cho',tx:vPick(V12_CHO,'cho',3)});
 let lg='';try{lg=String((S.clubs[M.h.cid]||{}).lg||'');}catch(e){}
 try{if(/^ENG/.test(lg)&&seasonMonth('GB')===10&&V.rem!==S.season){V.rem=S.season;M.ev.push({m:0,t:'fill',cer:'sil',tx:V12_REM});}else if(RNG()<0.012)M.ev.push({m:0,t:'fill',cer:'sil',tx:vPick(V12_SIL,'sil',2)});}catch(e){}
 if(M.h.user&&RNG()<0.06){try{const R=Object.values((typeof v11==='function'&&v11().ret)||{}).filter(x=>x&&x.num>0&&x.num<=88);if(R.length){const r=pick(R);M.v12apl={m:r.num,tx:v12Say(V12_APL,'apl',{N:r.num,L:r.n},1)};}}catch(e){}}
 if(!M.v12apl&&RNG()<0.12){const inj=clubPlayers(S.clubId).filter(p=>(p.inj||0)>=6);if(inj.length)M.v12apl={m:10,tx:v12Say(V12_APLI,'apli',{P:pick(inj).n},1)};}}
// ================= 5) NERVOZITA VE VELKÉM ZÁPASE =================
const V12_NV=['{P} je ve velkém zápase poprvé a je to znát – první míče mu odskakují.','Mladý {P} působí nervózně, raději hraje jednoduše dozadu.','{P} v první velké bitvě tuhne, dvě přihrávky skončily u soupeře.','Na mladíkovi {P} je vidět tréma, v soubojích je opatrný.','{P} zatím na takovou kulisu nestačí, hraje bojácně.'];
const V12_NVC=['Zkušený {P} uklidňuje mladší spoluhráče a diriguje hru.','{P} má za sebou spoustu velkých zápasů a je to vidět, hraje s ledovým klidem.','Veterán {P} si bere míč a zklidňuje hru.'];
const V12_NVE=['{P} se už otřepal a hraje s větší jistotou.','Tréma opadla, {P} se konečně chytil.','{P} se postupně dostává do zápasu, už se nebojí převzít míč.'];
function v12Nerv(M){if(!(M.h.user||M.a.user)||!v12Big(M))return;const N={s:[[],[]],cal:[null,null],end:rint(22,35),m:rint(3,9)};let any=0;
 for(let s=0;s<2;s++){const xi=onPitch(M.sides[s]);const c=xi.filter(id=>{const p=P(id);return p&&(v12Age(p)<=20||(p.car&&p.car.ap<8));});
  c.forEach(id=>{const k=typeof pers==='function'?pers(P(id)):null;if(N.s[s].length<2&&RNG()<(k==='pro'||k==='vu'?0.2:0.45))N.s[s].push(id);});
  const vet=xi.filter(id=>v12Age(P(id))>=31);if(vet.length&&N.s[s].length)N.cal[s]=pick(vet);any+=N.s[s].length;}
 if(!any)return;M.v12nv=N;M.v12xg0=M.xg.slice();for(let s=0;s<2;s++){const n=N.s[s].length;if(!n)continue;M.xg[s]*=1-0.035*n;M.xg[1-s]*=1+0.025*n;N.s[s].forEach(id=>M.rt[id]=(M.rt[id]||6)-0.2);}}
function v12NervStep(M,add){const N=M.v12nv;if(!N)return;if(M.min===N.m){for(let s=0;s<2;s++){if(!N.s[s].length)continue;const id=N.s[s][0];if(onPitch(M.sides[s]).includes(id))add.push({m:M.min,t:'fill',s,nv:1,tx:v12Say(V12_NV,'nv',{P:nm(id)},4)});
   if(N.cal[s]&&RNG()<0.6&&onPitch(M.sides[s]).includes(N.cal[s]))add.push({m:M.min,t:'fill',s,tx:v12Say(V12_NVC,'nvc',{P:nm(N.cal[s])},3)});}}
 if(M.min===N.end&&M.v12xg0){M.xg=M.v12xg0.slice();M.v12xg0=null;for(let s=0;s<2;s++){const id=N.s[s][0];if(id&&onPitch(M.sides[s]).includes(id)&&RNG()<0.7)add.push({m:M.min,t:'fill',s,tx:v12Say(V12_NVE,'nve',{P:nm(id)},3)});}}}
// ================= 6) FANOUŠCI: realističtější přerušení =================
CHX.pitch={w:3,p:[1,8,22],ab:0.3,f:[2,3.5],t:['🚨 Desítky fanoušků týmu {T} přelezly plot a vtrhly na hřiště! Hráči utíkají do kabin, zasahuje policie.']};
const V12_CHT={pyro:['🔥 {G} ({T}) zapálili světlice, několik jich přistálo na trávníku. Pořadatelé je hasí pískem.','🔥 Kotel týmu {T} vzplál, na hřiště letí světlice. Sudí hráče stáhl od brány.','🔥 Pyrotechnika v sektoru týmu {T}! Dým se valí přes pokutové území.'],
 smoke:['💨 {G} ({T}) hodili na hřiště dýmovnice. Sudí čeká, až se dým rozplyne.','💨 Barevný dým z kotle týmu {T} zahalil celé pokutové území, hra stojí.','💨 Nad hřištěm visí hustý dým z dýmovnic fanoušků týmu {T}, nevidí ani brankář.'],
 throw:['🥤 Na brankáře {K} letí z ochozu týmu {T} kelímky a zapalovače. Sudí přerušil hru.','🥤 Fanoušci týmu {T} zasypali hráče u rohového praporku předměty, jeden zasáhl asistenta.','🥤 Z tribuny týmu {T} letí na hřiště mince. Sudí odvádí hráče do středového kruhu.'],
 invader:['🏃 Na hřiště vběhl fanoušek týmu {T}, pořadatelé ho honí přes půl hřiště.','🏃 Vběhlík v dresu týmu {T} se snažil udělat selfie s hráčem, než ho odvedla ochranka.','🏃 Fanoušek týmu {T} přeskočil reklamní panely a utíká k hráčům. Stewardi ho za chvíli srazili k zemi.'],
 fight:['👊 Na tribuně se poprali fanoušci obou týmů, zasahuje policie. Začali s tím {g} ({T}).','👊 {G} ({T}) prolomili oddělení sektorů a strhla se hromadná rvačka.','👊 Ultras týmu {T} zaútočili na sousední sektor, policejní těžkooděnci vbíhají na tribunu.'],
 laser:['🔦 Někdo z fanoušků týmu {T} svítí laserem do očí brankáři {K}. Sudí na chvíli přerušil hru.','🔦 Zelený laser z ochozu týmu {T} míří na brankáře {K}. Hlasatel vyzývá k ukončení.']};
const V12_RAC={s1:['🚫 Ze sektoru týmu {T} se ozývají rasistické urážky. Sudí podle protokolu UEFA zastavil hru (1. krok) a hlasatel vyzývá k ukončení.','🚫 Rasistické pokřiky z tribuny týmu {T}! Sudí zkřížil ruce – první krok protokolu UEFA. Hra stojí, hlasatel žádá klid.'],
 s2:['🚫 Urážky se opakují. Druhý krok protokolu UEFA: sudí posílá oba týmy do kabin, zápas je přerušen na {N} minut.','🚫 Ani výzva nepomohla. Sudí odvádí hráče do kabin (2. krok protokolu), stadion čeká v tichu.'],
 r2:['▶️ Hráči se po {N} minutách vracejí z kabin, hlasatel varuje: další urážky znamenají ukončení zápasu.'],
 s3:['⛔ Třetí krok protokolu UEFA: rasistické urážky neustaly a sudí po dohodě s delegátem zápas ukončil. Rozhodne disciplinární komise.'],
 end:['Rasistické pokřiky po zásahu pořadatelů ustaly, hra pokračuje bez dalších problémů.','Pořadatelé vyvedli několik výtržníků, z tribuny už se nic neozývá.']};
(function(){const _cf=chFire;chFire=function(M,pl,out){if(pl.k==='racism')return v12Racism(M,pl,out);const n0=out.length;const r=_cf.apply(this,arguments);
  try{const e=out[n0];if(e&&e.ch===pl.k&&V12_CHT[pl.k])e.tx=chTxt(vPick(V12_CHT[pl.k].concat(CHX[pl.k].t),'cht_'+pl.k,3),M,pl.s);
   const ps=out.slice(n0).find(x=>x.ch==='pause');if(ps){M.v12stop=(M.v12stop||0)+1;v12Hold(M,pl.k==='pitch'||pl.k==='fight'?4500:3200);if((pl.k==='smoke'||pl.k==='pyro')&&M.wx&&(M.wx.k==='fog'||M.wx.k==='rain'))ps.tx+=' Ve vlhkém vzduchu se dým drží dlouho.';else if((pl.k==='smoke'||pl.k==='pyro')&&M.wx&&M.wx.k==='wind')ps.tx+=' Vítr naštěstí dým rychle rozhání.';}}catch(e){}return r;};})();
function v12Racism(M,pl,out){const i=pl.s;const inc={k:'racism',s:i,m:M.min,pause:rint(2,4),ab:0};M.chaos=M.chaos||[];M.chaos.push(inc);
 out.push({m:M.min,t:'fill',ch:'racism',s:i,tx:chTxt(vPick(V12_RAC.s1,'rac1',1),M,i)});out.push({m:M.min,t:'fill',ch:'pause',s:i,tx:`⏸️ Hra stojí ${inc.pause} ${czPlural(inc.pause,'minutu','minuty','minut')}.`});
 const h=Math.max(0,Math.min(3,M.half-1));M.added[h]=Math.min(15,(M.added[h]||1)+inc.pause);M._chRes=M.min+1;M.v12rac={s:i,step:1,next:M.min+rint(5,16),inc};M.v12stop=(M.v12stop||0)+1;v12Hold(M,3200);}
function v12RacStep(M,add){const R=M.v12rac;if(!R||R.done||M.ended||M.min<R.next)return;
 const again=RNG()<(R.step===1?0.3:0.35);if(!again){R.done=1;add.push({m:M.min,t:'fill',tx:vPick(V12_RAC.end,'racend',1)});return;}
 if(R.step===1){R.step=2;const n=rint(8,15);R.inc.pause+=n;const h=Math.max(0,Math.min(3,M.half-1));M.added[h]=Math.min(15,(M.added[h]||1)+Math.min(6,n));add.push({m:M.min,t:'fill',ch:'pause',rac2:1,s:R.s,tx:v12F(vPick(V12_RAC.s2,'rac2',1),{N:n})});
  M.v12res={m:M.min+1,t:'fill',ch:'res',tx:v12F(V12_RAC.r2[0],{N:n})};R.next=M.min+rint(6,18);v12Hold(M,4500);return;}
 R.done=1;R.inc.ab=1;const g=R.s,n=1-g;M.ended=true;if(M.score[n]-M.score[g]<3){M.score[g]=0;M.score[n]=3;}M.chAb={s:g,m:M.min};
 add.push({m:M.min,t:'fill',ch:'ab',s:g,tx:V12_RAC.s3[0]});add.push({m:M.min,t:'ft',tx:`Zápas ukončen v ${M.min}. minutě. Komise ho kontumuje ${M.score[0]}:${M.score[1]} (${S.clubs[M.h.cid].n} – ${S.clubs[M.a.cid].n}).`});finishMatch(M);}
(function(){const _cr=chRisk;chRisk=function(M){const r=_cr.apply(this,arguments);try{let k=1;if(v12Big(M))k*=1.25;const w=M.wx&&M.wx.k;if(w==='rain'||w==='pour'||w==='snow'||w==='storm')k*=0.85;else if(w==='heat')k*=1.08;r[0]*=k;r[1]*=k;}catch(e){}return r;};})();
// ================= hlavní krok minuty =================
(function(){const _cm=createMatch;createMatch=function(h,a,F){const M=_cm.apply(this,arguments);try{if(M.h.user||M.a.user){if(M.derby==null&&typeof isDerby==='function')M.derby=isDerby(M.h.cid,M.a.cid);v12WxPlan(M);v12Cere(M);v12Nerv(M);
   if(RNG()<0.006)M.v12pw={m:rint(20,85)};if(RNG()<0.005)M.v12ri={m:rint(10,80)};if(RNG()<0.015)M.v12bm=rint(15,85);}}catch(e){console.warn(e);}return M;};
 const _sm=stepMinute;stepMinute=function(M){const out=_sm(M);if(!(M.h.user||M.a.user))return out;const add=[];try{
   if(M.v12res&&M.min>=M.v12res.m&&!M.ended){const r=M.v12res;M.v12res=null;add.push({m:M.min,t:r.t,ch:r.ch,tx:r.tx});}
   if(!M.ended){v12WxStep(M,add);v12PwStep(M,add);v12RiStep(M,add);v12RacStep(M,add);v12NervStep(M,add);}
   if(!M.ended){v12WxExtra(M,add);if(M.v12apl&&M.min===M.v12apl.m){add.push({m:M.min,t:'fill',cer:'apl',tx:M.v12apl.tx});M.v12apl=null;}
    if(M.v12bm&&M.min===M.v12bm){M.v12bm=0;if(RNG()<0.5)v12Bench(M,add);}
    for(const e of out.concat(add)){if(M.ended)break;if(e.t==='pen'||e.t==='red'||e.t==='var'||e.t==='yel'||e.t==='goal'||e.t==='off'){const tmp=[];v12Dispute(M,e,tmp);tmp.forEach(x=>add.push(x));if(tmp.length)break;}}}
  }catch(e){console.warn(e);}add.forEach(e=>{out.push(e);M.ev.push(e);});return out;};})();
// ================= po zápase: tresty, média, tiskovky =================
const V12_MDX={
 arg:{o:['Vyhrocený zápas {A} – {B} ({S}).','Emoce v zápase {A} – {B} přerostly přes hranu.','{A} proti {B}: víc než o fotbale se mluví o protestech.','Zápas {A} – {B} skončil {S}, ale řeší se hlavně chování hráčů.'],
  b:['Hráči klubu {A} se po sporném rozhodnutí sesypali na sudího {R}.','Sudí {R} musel krotit protestující hráče a sahat do kapsy.','Kolem rozhodčího {R} se v {M}. minutě strhla ostrá debata.','Protesty po verdiktu sudího {R} stály tým karty.'],
  c:['Disciplinární komise si to určitě nenechá ujít.','Klubu teď hrozí pokuta.','Trenér bude mít v kabině co vysvětlovat.','Fanoušci se na sítích přou, kdo měl pravdu.']},
 coach:{o:['Ostuda na lavičce v zápase {A} – {B}.','Trenér na tribuně: zápas {A} – {B} má dohru.','{A} – {B} {S} a vykázaný kouč.'],
  b:['Sudí {R} poslal v {M}. minutě trenéra klubu {A} na tribunu.','Trenér klubu {A} to s protesty přehnal a zbytek zápasu sledoval z tribuny.','Lavičku klubu {A} musel od {M}. minuty vést asistent.'],
  c:['Komise případ projedná na nejbližším zasedání.','Hrozí mu další zákaz.','Vedení klubu chce situaci řešit interně.']},
 wx:{o:['Počasí zamíchalo zápasem {A} – {B}.','{A} – {B} {S}: rozhodovaly i podmínky.','Diváci si z utkání {A} – {B} zapamatují hlavně pláštěnky.'],
  b:['Předpověď hlásila {F}, nakonec přišlo: {X}.','Začínalo se za jiných podmínek, než jaké byly na konci ({X}).','Po {M}. minutě se počasí změnilo – {X}.'],
  c:['Trávník dostal pořádně zabrat.','Kombinační fotbal šel stranou.','Hráči odcházeli promočení a vyčerpaní.']},
 stop:{o:['Zápas {A} – {B} se protáhl daleko za obvyklé nastavení.','Přerušený zápas {A} – {B} ({S}).','{A} – {B}: dlouhé čekání a studené svaly.'],
  b:['V {M}. minutě se kvůli {W} přestalo hrát.','Kvůli {W} se v {M}. minutě nehrálo.','Hráči museli kvůli {W} čekat a znovu se rozehřívat.'],
  c:['Delegát vše popíše ve zprávě.','Nastavení bylo nekonečné.','Diváci odcházeli domů až pozdě večer.']},
 ban:{o:['Klub {A} reaguje na výtržnosti.','Po incidentech v zápase s týmem {B} jedná klub {A} rychle.','{A} nechce za chuligány platit.'],
  b:['Vydal {N} zákazů vstupu identifikovaným výtržníkům.','{N} lidí z kamerových záznamů dostalo zákaz vstupu na stadion.','Bezpečnostní ředitel oznámil {N} zákazů vstupu.'],
  c:['Slibuje přísnější kontroly při vstupu.','Posílí počet stewardů u kotle.','S policií chce spolupracovat na dalším vyšetřování.']},
 calm:{o:['Klidná tiskovka po zápase {A} – {B}.','Trenér klubu {A} po zápase s týmem {B} krotil emoce.','Smířlivý tón po zápase {A} – {B}.'],b:['Nikoho neobviňoval a mluvil hlavně o svém týmu.','Chválil soupeře a vzal vinu na sebe.','Podle něj si tým musí zamést před vlastním prahem.'],c:['Titulky dnes nebudou.','Novináři odcházeli bez bombastického citátu.','Rozvážná slova ocenilo i vedení.']},
 hot:{o:['Ostrá slova po zápase {A} – {B}!','Trenér klubu {A} se po zápase s týmem {B} nebral servítky.','Bouřlivá tiskovka po zápase {A} – {B}.'],b:['Tvrdě se pustil do rozhodčích i organizace zápasu.','Zvýšil hlas a odešel dřív, než skončily otázky.','Jeho výroky už kolují po sociálních sítích.'],c:['Komise prý jeho slova sleduje.','Média mají titulek na celý týden.','Fanoušci ho podporují, vedení méně.']},
 neu:{o:['Diplomatická tiskovka po zápase {A} – {B}.','Trenér klubu {A} po zápase s týmem {B} volil slova opatrně.','Opatrné odpovědi po zápase {A} – {B}.'],b:['Na citlivé otázky odpovídal vyhýbavě.','Mluvil hlavně o dalším programu.','Přiznal chyby, ale nic nedramatizoval.'],c:['Velké titulky nečekejte.','Žurnalisté odcházeli trochu zklamaní.','Klid před dalším kolem.']}};
function v12Md(kind,d){const P=V12_MDX[kind];if(!P)return '';const f=()=>v12F(pick(P.o)+' '+pick(P.b)+' '+pick(P.c),d);return (typeof vmGen==='function'&&vmGen(f))||f();}
function v12MdD(M){const ui=userSide(M);const me=S.clubs[M.sides[ui].cid],op=S.clubs[M.sides[1-ui].cid];return {A:me?me.n:'',B:op?op.n:'',S:M.score[ui]+':'+M.score[1-ui],R:(M.v12ref||{}).sn||'rozhodčí',M:M.min};}
function v12Post(M){const ui=userSide(M);const A=M.v12a;const me=myClub();const lvl=v12Lvl();const V=v12();const d={T:v12Gen(ui),R:(M.v12ref||{}).sn||''};
 if(A){const parts=[];let fine=0;if(A.dy[ui]>=2){fine+=10000*A.dy[ui];parts.push(`${A.dy[ui]} ${czPlural(A.dy[ui],'žlutá karta','žluté karty','žlutých karet')} za protesty`);}
  if(A.dr[ui]){fine+=25000*A.dr[ui];parts.push('vyloučení za protesty');}if(A.coachOff[ui]){fine+=30000;parts.push('vykázání trenéra');}if(A.staffR[ui]){fine+=15000;parts.push('vykázání člena realizačního týmu');}else if(A.staffY[ui]){fine+=5000;parts.push('kartu pro člena realizačního týmu');}if(A.mass[ui]){fine+=20000;parts.push('hromadnou strkanici');}
  if(fine){fine=Math.round(fine*lvl*(0.8+RNG()*0.4)/1000)*1000;money(-fine,'other','Pokuta disciplinární komise');addNews('⚖️',`Disciplinární komise potrestala klub ${me.n} pokutou ${fmtMoney(fine)} za ${parts.join(', ')}.`);v12Tl('⚖️',`Pokuta ${fmtMoney(fine)} za chování vůči rozhodčímu.`);if(isOwn()&&typeof ownRepAdd==='function')ownRepAdd(-1);}
  A.ins.forEach(id=>{const p=P(id);if(p&&p.cl===S.clubId){addNews('⚖️',`${p.n} dostal za urážky rozhodčího zákaz na ${p._mred||2} ${czPlural(p._mred||2,'zápas','zápasy','zápasů')}.`);}});
  if(A.coachOff[ui]&&V.cban&&!ownOnly()){V.cban=0;try{const f=fixS();f.ban=Math.max(f.ban||0,1);addNews('⚖️','Komise: trenér si za vykázání odsedí jeden zápas na tribuně. Tým povede asistent.');}catch(e){}}else V.cban=0;
  if(A.n&&A.dy[ui]+A.dr[ui]+A.coach[ui]>0&&RNG()<0.6){const dd=v12MdD(M);const e=M.ev.find(x=>x.t==='arg'&&x.s===ui);if(e)dd.M=e.m;const t=v12Md(A.coachOff[ui]?'coach':'arg',dd);if(t)v11Post('📰','Sportovní deník',t);}
  const R=M.v12ref||{};if(A.n&&!M.bribe&&R.per==='cor'&&A.dy[ui]+A.dr[ui]+A.coach[ui]>0&&RNG()<0.3&&(V.rfh||0)<S.season*100+S.round-6){V.rfh=S.season*100+S.round;addNews('🤫',`Sudí ${R.sn} prý po zápase v tunelu naznačil, že příště by se „dalo leccos domluvit“. Rozhovor s rozhodčím najdeš před zápasem.`,1);}
  if(M.bribe&&M.bribe.side===ui&&A.dy[1-ui]+A.coach[1-ui]>0&&S.bribe){S.bribe.heat=(S.bribe.heat||0)+0.3;if(RNG()<0.4)addNews('🗞️','Soupeř po zápase veřejně zpochybnil výkon rozhodčího a média se začala ptát.',1);}}
 if(M.wxc&&RNG()<0.35){const dd=v12MdD(M);const e=M.ev.find(x=>x.t==='wx');dd.M=e?e.m:45;dd.F=M.wxF?v12WxName(M.wxF.k):'jiné počasí';dd.X=v12WxName(M.wx.k);const t=v12Md('wx',dd);if(t)v11Post('📰','Sportovní deník',t);}
 if(M.v12stop&&RNG()<0.4){const dd=v12MdD(M);const e=M.ev.find(x=>x.t==='wxint'||x.t==='pwr'||x.t==='rinj'||x.ch==='pause');dd.M=e?e.m:M.min;dd.W=!e?'přerušení':e.t==='wxint'?'bouřce':e.t==='pwr'?'výpadku proudu':e.t==='rinj'?'zranění sudího':'výtržnostem fanoušků';if(/^V \d/.test(''))0;const t=v12Md('stop',dd);if(t)v11Post('📰','Sportovní deník',t);}
 if(M.wxh&&M.sides[ui]===M.h){try{const W=v11();W.pitch=clamp((W.pitch||80)-2,5,100);}catch(e){}}
 if(M.v12pwH&&M.h.user){const c=Math.round(rint(30,90)*lvl)*1000;money(-c,'other','Oprava osvětlení');addNews('💡',`Výpadek osvětlení: oprava a pokuta za nedostatečné technické zajištění stály klub ${fmtMoney(c)}.`);if(isOwn()&&typeof ownRepAdd==='function')ownRepAdd(-1);}
 const L=(M.chaos||[]).filter(x=>!x.joy&&x.s===ui);if(L.length&&L.some(x=>x.pause||x.ab||x.k==='fight'||x.k==='racism'||x.k==='pitch')){const n=rint(3,25);addNews('🚫',`Klub ${me.n} udělil ${n} identifikovaným výtržníkům zákaz vstupu na stadion.`,1);{const dd=v12MdD(M);dd.N=n;const t=v12Md('ban',dd);if(t)v11Post('📰','Sportovní deník',t);}
  if(isOwn()&&typeof ownRepAdd==='function'){ownRepAdd(-(L.some(x=>x.ab)?6:2));if(L.some(x=>x.ab)){const loss=Math.round(rint(80,200)*lvl)*1000;money(-loss,'other','Sponzoři – sankce');addNews('💼',`Generální partner kvůli výtržnostem pozastavil bonus. Klub přichází o ${fmtMoney(loss)}.`);}}}}
(function(){const _af=v4AfterMatch;v4AfterMatch=function(M){const r=_af.apply(this,arguments);try{v12Post(M);}catch(e){console.warn(e);}return r;};})();
// tiskové konference: nové otázky
Object.assign(PRESS_Q,{postRef:['Po sporném rozhodnutí se vaši hráči sesypali na sudího. Jak to vidíte?',[['Emoce k fotbalu patří, ale takhle se chovat nesmíme. S hráči si to vyříkám.',{mor:-1,fans:0,board:2,media:'calm'}],['Sudí nám dnes vzal zápas. Řekněte mi, jak se máme ovládat?',{mor:2,fans:3,board:-2,ref:1,media:'hot'}],['K výkonu rozhodčích se nevyjadřuji, od toho je komise.',{mor:0,fans:-1,board:1,media:'neu'}]]],
 postWx:['Počasí se během zápasu úplně změnilo. Jak moc to ovlivnilo hru?',[['Podmínky byly stejné pro oba, žádná výmluva.',{mor:1,fans:1,board:1,media:'calm'}],['Na takovém terénu se fotbal hrát nedá, měl se přerušit dřív.',{mor:0,fans:1,board:-1,media:'hot'}],['Kluci se s tím poprali skvěle, za to jim patří dík.',{mor:2,fans:1,board:0,media:'neu'}]]],
 postYoung:['Mladí hráči byli ve velkém zápase zpočátku nervózní. Bylo to znát?',[['Tréma je normální, z takových zápasů se roste. Věřím jim.',{mor:2,fans:1,board:1,media:'calm',young:3}],['Musí se otrkat rychleji, na tuhle úroveň potřebujeme hotové hráče.',{mor:-2,fans:0,board:1,media:'hot',young:-4}],['Zkušení hráči je podrželi, tak to v týmu má fungovat.',{mor:1,fans:0,board:0,media:'neu'}]]],
 postStop:['Zápas byl dlouho přerušený. Jak jste to zvládali?',[['Hráči zůstali soustředění, to je obrovská síla týmu.',{mor:2,fans:0,board:1,media:'calm'}],['Takhle se fotbal hrát nedá, organizace selhala.',{mor:0,fans:1,board:-2,media:'hot'}],['Bezpečnost je přednější než fotbal, rozhodnutí sudího chápu.',{mor:0,fans:0,board:2,media:'neu'}]]],
 preBig:['Čeká vás zápas sezóny. Zvládnou mladí hráči tlak?',[['Na tohle se hraje fotbal, užijí si to.',{mor:2,fans:2,board:0,media:'neu',young:2}],['Vsadím na zkušené, mladí dostanou šanci jindy.',{mor:0,fans:0,board:1,media:'calm',young:-2}],['Tlak? Ten má soupeř. My chceme vyhrát.',{mor:1,fans:3,board:-1,media:'hot',riv:1}]]]});

(function(){const _pp=pressPick;pressPick=function(kind,F,M){const q=_pp.apply(this,arguments);try{if(q==='scandal'||q==='chaosPost'||q==='chaosPre'||q==='bribeRumor')return q;
  if(kind==='post'&&M){const ui=userSide(M);const A=M.v12a;if(A&&A.n&&A.dy[ui]+A.dr[ui]+A.coach[ui]+A.mass[ui]>0&&RNG()<0.65)return 'postRef';if(M.v12stop&&RNG()<0.55)return 'postStop';if(M.wxc&&RNG()<0.4)return 'postWx';if(M.v12nv&&M.v12nv.s[ui].length&&RNG()<0.5)return 'postYoung';}
  if(kind==='pre'&&F){const fake={h:{cid:F.h},a:{cid:F.a},F,derby:typeof isDerby==='function'&&isDerby(F.h,F.a),att:0};if(v12Big(fake)&&RNG()<0.35)return 'preBig';}}catch(e){}return q;};
 const _pa=pressAnswer;pressAnswer=function(kind,q,i){let fx=null;try{fx=PRESS_Q[q][1][i][1];}catch(e){}const r=_pa.apply(this,arguments);try{if(fx){
   if(fx.young){clubPlayers(S.clubId).filter(p=>v12Age(p)<=21).forEach(p=>p.mor=clamp(p.mor+fx.young,5,100));}
   if(fx.media&&typeof v11Post==='function'){const op=S.clubs[UI.pressOpp]||{};const t=v12Md(fx.media,{A:myClub().n,B:op.n||'soupeřem'});if(t)v11Post('🎤','Tisková konference',t);}
   if(fx.ref&&RNG()<0.3){const f=Math.round(rint(10,40)*v12Lvl())*1000;money(-f,'other','Pokuta za kritiku rozhodčích');addNews('⚖️',`Komise udělila klubu pokutu ${fmtMoney(f)} za veřejnou kritiku rozhodčího na tiskové konferenci.`);}}}catch(e){console.warn(e);}return r;};})();
(function(){if(typeof evHtml!=='function')return;const _eh=evHtml;evHtml=function(e,M){const h=_eh.apply(this,arguments);return e&&(e.t==='arg'||e.t==='wxint'||e.t==='pwr'||e.t==='rinj')?h.replace('class="ev ','class="ev '+(e.t==='arg'?'arg ':'big ')):h;};})();
// ================= pojistka: minimální kádr (nouzové povolání z akademie) =================
(function(){if(typeof weekTick!=='function')return;const _wt=weekTick;weekTick=function(){const r=_wt.apply(this,arguments);try{if(S&&S.clubId&&S.clubs[S.clubId]){const n=clubPlayers(S.clubId).length;if(n<16){const got=[];for(let k=n;k<16;k++){const y=youthPlayer(S.clubId);if(y)got.push(y.n);}
 if(got.length)addNews('🎓',got.length===1?`Kádr je příliš úzký, a tak trenér povolal z akademie ${got[0]}.`:`Kádr je příliš úzký. Z akademie do A-týmu přicházejí: ${got.join(', ')}.`);}}}catch(e){console.warn(e);}return r;};})();

// v13: víc hry ve středu pole – útoky, které nekončí střelou
try{T_FILL.push('{T} si míč posílají v obraně a čekají, až se soupeř otevře.','{T} kombinují ve středu pole, ale prostor před vápnem je zavřený.','Útok {T} skončil u stoperů soupeře, nic z toho nebylo.','{T} se dostali po křídle k vápnu, centr ale skončil v zámezí.','Dlouhá výměna přihrávek ve středu hřiště, nikdo nechce riskovat.','{T} vracejí míč až ke gólmanovi a začínají znovu.','Souboj o odražený míč ve středu pole vyhráli {T}.','{T} zkusili rychlý protiútok, ale poslední přihrávka byla nepřesná.','Hra na chvíli ztratila tempo, oba týmy si hlídají pozice.','{T} mají delší držení míče, šance ale zatím nepřichází.','Přihrávka za obranu byla moc dlouhá a míč doběhl do autu.','{T} napadají, soupeř to ale ustál a uklidnil hru.');}catch(e){}

// ================= v13: chybné kurzy sázkových kanceláří (palpable errors) =================
const V13_BK=['BetGol','Kurzovna','TipArena','SázkaPlus','GólBet','Tiposféra'];
const V13_TYPE={swap:'prohozené kurzy domácích a hostů',dec:'posunutá desetinná čárka',stale:'neaktualizovaný kurz po zprávách ze soupisky'};
const V13_NEWS=['🎰 Sázkaři na fórech hlásí podezřelý kurz u kanceláře {bk}: {t} za {o}. Vypadá to na chybu.','🎰 Kancelář {bk} zřejmě vypsala chybný kurz – {t} za {o}. Kdo chce riskovat, musí rychle, kancelář to brzy opraví.','🎰 Na sociálních sítích koluje screenshot: {bk} nabízí {t} za {o}. Experti se shodují, že jde o chybu.','🎰 Kurz {o} na {t} u {bk}? Podle tipařů jde o zjevnou chybu v nabídce.'];
const V13_CHAT=['kurz {o} na {t} u {bk}?? to je chyba jak blázen','{bk} má {t} za {o}, někdo jim tam usnul 😂','rychle, {bk} dává {t} za {o}, za minutu to opraví','to {o} na {t} je jasná chyba, stejně vám to zruší','vsadil jsem na {t} za {o} u {bk}, uvidíme jestli to uznají','{bk} a jejich kurzy… {t} za {o}, to snad ne','kdo hraje {t} za {o}, ať si přečte podmínky, zjevná chyba = storno','{o} na {t}? u {bk} zase spí trader'];
const V13_FIX=['🎰 {bk} kurz na {t} opravil – po náporu sázek je zpátky na {o}.','🎰 Chyba odhalena: {bk} stáhl kurz na {t} a vypsal správných {o}.','🎰 {bk} si všiml přívalu peněz a kurz na {t} srazil na {o}.'];
const V13_VOID=['❌ {bk} zrušil tvou sázku na {t} kvůli zjevné chybě v kurzu ({o}). Vklad {st} ti vrátil.','❌ Storno: podle obchodních podmínek {bk} jde o zjevnou chybu, sázka na {t} je neplatná a vklad {st} se vrací.'];
const V13_RES=['⚖️ {bk} přepočítal tvou sázku na {t} na správný kurz {f} (místo chybných {o}).','⚖️ Sázka na {t} u {bk} byla vyrovnána za opravený kurz {f}, ne za {o}.'];
const V13_HON=['✅ {bk} uznal tvou sázku na {t} za chybný kurz {o}. Tentokrát jsi měl štěstí.','✅ {bk} chybu přiznal, ale sázku na {t} za {o} ti vyplatil celou.'];
const V13_LIM='🚫 {bk} ti po opakovaných výhrách na chybných kurzech omezil vklady: do konce sezóny max. {cap} na jednu sázku.';
function v13(){if(!S.v13)S.v13={pe:[],ew:0,lim:0,n:0};return S.v13;}
function v13F(t,d){return String(t).replace(/\{(\w+)\}/g,(_,k)=>d[k]!=null?d[k]:'');}
function v13Pick(arr,key){const V=v13();V.u=V.u||{};const used=V.u[key]||(V.u[key]=[]);let fr=arr.filter(x=>!used.includes(x));if(!fr.length){used.length=0;fr=arr;}const t=pick(fr);used.push(t);if(used.length>arr.length-1)used.shift();return t;}
function v13Cap(){const V=v13();return V.lim===S.season?150:500;}
function v13Act(pe){if(pe.act)return pe.act;const r=RNG();pe.act=pe.type==='stale'?(r<0.45?'fix':'honor'):(r<0.55?'void':r<0.85?'fix':'honor');if(v13().lim===S.season&&pe.act==='honor')pe.act='fix';return pe.act;}
function v13On(pe){return pe&&!pe.done&&pe.s===S.season&&pe.r===S.round&&Date.now()<pe.exp;}
function v13Tip(pe){const H=CL(pe.h).n,A=CL(pe.a).n;return pe.mk==='1'?'tip 1 ('+H+')':pe.mk==='2'?'tip 2 ('+A+')':pe.mk==='X'?'remízu ('+H+' – '+A+')':pe.mk;}
// úprava kurzů
function v13Apply(pe,o){const r=Object.assign({},o);const R2=x=>Math.round(x*100)/100;if(pe.type==='swap'){const f=o['1']<=o['2']?'1':'2',u=f==='1'?'2':'1';r[f]=R2(Math.min(o[u],o[f]*2.6));r[u]=R2(Math.max(o[f],o[u]/2.6));}else if(pe.type==='dec'){r[pe.mk]=Math.min(16,R2(o[pe.mk]*10));}else r[pe.mk]=Math.min(15,R2(o[pe.mk]*pe.f));return r;}
function v13Find(mid){const V=v13();return (V.pe||[]).find(p=>p.mid===mid&&v13On(p));}
(function(){const _mo=matchOdds;matchOdds=function(h,a,seed){const o=_mo.apply(this,arguments);try{if(S&&S.v13&&seed){const pe=v13Find(seed);if(pe)return v13Apply(pe,o);}}catch(e){}return o;};window.__v13mo=_mo;})();
const V13_CHATL=['{bk} prohodil kurzy, rychle než to opraví!!','to je v live u {bk} úplně rozbitý, koukněte na kurzy','{bk} má live mimo, ale stejně to stornujou, znám je','kdo tam teď hodí prachy u {bk}, ten buď zbohatne, nebo dostane storno 😂','hele {bk} v live, to je jasná chyba, kurzy obráceně'];
function v13Chat(d,pool){try{const C=MS&&MS.chat;if(!C||S.settings.betChat===false)return;const u=pick(C.users||[])||{n:'tipař',per:'x'};C.lines.push({m:String(typeof minLbl==='function'?minLbl(MS.M):MS.M.min)+"'",n:u.n,per:u.per,t:v13F(v13Pick(pool||V13_CHAT,pool?'chatl':'chat'),d)});if(C.lines.length>60)C.lines.shift();}catch(e){}}
function v13Announce(pe,o){const d={bk:pe.bk,t:v13Tip(pe),o:czOdd(o)};addNews('🎰',v13F(v13Pick(V13_NEWS,'news'),d).replace(/^🎰 /,''));try{if(typeof v11Post==='function')v11Post('🎰','@'+pick(['kurzar_77','tiparna_cz','sazkar_franta','valuebet_pepa','betguru']),v13F(v13Pick(V13_CHAT,'chat'),d));}catch(e){}v13Chat(d);}
// vznik chyby: pár za sezónu
function v13Gen(){const V=v13();V.pe=(V.pe||[]).filter(p=>p.s===S.season&&S.round-p.r<=3);if(RNG()>0.11)return;
 let cand=[];let own=null;try{const f=myFixture();if(f)own={h:f[0],a:f[1]};}catch(e){}
 if(own&&RNG()<0.3){const o=window.__v13mo(own.h,own.a,'own');const fav=o['1']<=o['2']?'1':'2';const type=o[fav]<=1.6&&RNG()<0.4?'dec':RNG()<0.5?'swap':'stale';
  const pe={id:'pe'+(++V.n),own:1,mid:'U|'+S.season+'|'+S.round+'|'+own.h+'|'+own.a,h:own.h,a:own.a,s:S.season,r:S.round,bk:pick(V13_BK),type,mk:type==='stale'?(fav==='1'?'2':'1'):fav,f:1.45+RNG()*0.3,exp:Date.now()+rint(240,480)*1000};
  V.pe.push(pe);const shown=v13Apply(pe,o)[pe.mk];v13Announce(pe,shown);return;}
 try{for(const g of betGroups())for(const m of g.ms)cand.push(m);}catch(e){}if(!cand.length)return;const m=pick(cand);const o=window.__v13mo(m.h,m.a,m.mid);const fav=o['1']<=o['2']?'1':'2';
 let type=RNG()<0.35?'swap':RNG()<0.5?'dec':'stale';if(type==='dec'&&o[fav]>1.6)type='stale';if(type==='swap'&&Math.abs(o['1']-o['2'])<0.6)type='stale';
 const pe={id:'pe'+(++V.n),mid:m.mid,h:m.h,a:m.a,s:S.season,r:S.round,bk:pick(V13_BK),type,mk:type==='stale'?(fav==='1'?'2':'1'):fav,f:1.45+RNG()*0.3,exp:Date.now()+rint(240,480)*1000};V.pe.push(pe);
 v13Announce(pe,v13Apply(pe,o)[pe.mk]);}
(function(){const _sc=splitCheck;splitCheck=function(){const r=_sc.apply(this,arguments);try{if(S&&S.clubId)v13Gen();}catch(e){console.warn(e);}return r;};})();
// sázenka: kontrola kurzu, limit vkladu, označení sázek
(function(){const _pb=placeBet;placeBet=function(stake,mode){try{if(S&&S.slip&&S.slip.length){let ch=0;for(const x of S.slip){const m=parseMid(x.mid);const o=matchOdds(m.h,m.a,x.mid)[x.mk];if(o!==x.o){x.o=o;ch=1;}}
   if(ch){const pe=(v13().pe||[]).find(p=>S.slip.some(x=>x.mid===p.mid));return pe?`${pe.bk} kurz mezitím opravil. Zkontroluj sázenku, kurzy se změnily.`:'Kurzy se mezitím změnily, zkontroluj sázenku.';}
   const cap=v13Cap();const st=Math.round(+stake||0);const hit=S.slip.map(x=>v13Find(x.mid)).filter(Boolean);
   if(hit.length&&st>cap)return `${hit[0].bk} na tip s podezřelým kurzem přijme nejvýš ${fmtMoney(cap)}.`;if(v13().lim===S.season&&st>cap*4)return `Kancelář ti omezila vklady: max. ${fmtMoney(cap*4)} na sázku.`;
   const before=(S.bets||[]).length?S.bets[0]:null;const res=_pb.apply(this,arguments);
   if(hit.length&&/přijata/.test(res)){for(const b of S.bets){if(b===before)break;for(const l of b.legs){const pe=v13Find(l.mid);if(pe&&l.mk===pe.mk||pe&&pe.type==='swap'&&(l.mk==='1'||l.mk==='2')){const m=parseMid(l.mid);l.pe={bk:pe.bk,type:pe.type,fair:window.__v13mo(m.h,m.a,l.mid)[l.mk],act:null};l.pe.act=v13Act({type:pe.type});}}}
    hit.forEach(pe=>{if(RNG()<0.6){pe.done=1;const m=parseMid(pe.mid);setTimeout(()=>{},0);addNews('🎰',v13F(v13Pick(V13_FIX,'fix'),{bk:pe.bk,t:v13Tip(pe),o:czOdd(window.__v13mo(m.h,m.a,pe.mid)[pe.mk])}).replace(/^🎰 /,''));}});}
   return res;}}catch(e){console.warn(e);}return _pb.apply(this,arguments);};})();
function v13Ew(bk,won){const V=v13();if(!won)return;V.ew=(V.ew||0)+1;if(V.ew>=2&&V.lim!==S.season){V.lim=S.season;V.ew=0;addNews('🚫',v13F(V13_LIM,{bk,cap:fmtMoney(150)}).replace(/^🚫 /,''));}}
(function(){const _sb=settleBets;settleBets=function(final){try{for(const b of S.bets||[]){if(b.st!=='open')continue;for(const l of b.legs){if(!l.pe||l.pe.d||l.st!=='open')continue;const r=BETRES[l.mid];if(!r)continue;l.pe.d=1;const won=!r.ab&&legResult(l,r);const m=parseMid(l.mid);
    const d={bk:l.pe.bk,t:v13Tip({h:m.h,a:m.a,mk:l.mk}),o:czOdd(l.o),f:czOdd(l.pe.fair),st:fmtMoney(b.stake)};
    if(l.pe.act==='void'){l.st='void';l.res='zjevná chyba';addNews('🎰',v13F(v13Pick(V13_VOID,'void'),d).replace(/^❌ /,''));}
    else if(l.pe.act==='fix'){l.o=l.pe.fair;if(won){addNews('🎰',v13F(v13Pick(V13_RES,'res'),d).replace(/^⚖️ /,''));v13Ew(l.pe.bk,won);}}
    else if(won){addNews('🎰',v13F(v13Pick(V13_HON,'hon'),d).replace(/^✅ /,''));v13Ew(l.pe.bk,won);}}}}catch(e){console.warn(e);}return _sb.apply(this,arguments);};})();
// živé a předzápasové sázky na vlastní zápas
let __v13M=null,__v13P=null;
function v13OwnPe(M){if(!M||!S.v13)return null;return (S.v13.pe||[]).find(p=>p.own&&v13On(p)&&p.h===M.h.cid&&p.a===M.a.cid)||null;}
function v13LvAlt(M,mk,p){if(!M)return null;const pe=v13OwnPe(M);if(pe&&M.min<=5){if(pe.type==='swap'&&(mk==='1'||mk==='2')){const P2=__v13P&&__v13P[mk==='1'?'2':'1'];if(P2!=null){const fo=lvOdd0(p),so=lvOdd0(P2);const o=fo<so?Math.min(so,fo*2.6):Math.max(so,fo/2.6);return {pe,o:Math.round(o*100)/100};}}
  if(mk===pe.mk)return {pe,o:Math.round(clamp(pe.type==='dec'?lvOdd0(p)*10:lvOdd0(p)*pe.f,1.01,pe.type==='dec'?16:15)*100)/100};}
 const L=M.v13live;if(L&&M.min<=L.until&&!M.ended){const pe={bk:L.bk,type:L.kind==='stale'?'stale':'swap',own:1,live:1};
  if(L.kind==='stale'&&mk===L.mk&&L.p0)return {pe,o:Math.min(15,lvOdd0(p)*3,lvOdd0(L.p0))};
  const sw=L.kind==='swap'?{'1':'2','2':'1'}:L.kind==='tot'?{o25:'u25',u25:'o25',o15:'u15',u15:'o15'}:null;if(sw&&sw[mk]&&__v13P&&__v13P[sw[mk]]!=null){const fo=lvOdd0(p);const o=Math.round(Math.min(15,fo*2.6,lvOdd0(__v13P[sw[mk]]))*100)/100;if(o>fo+0.05)return {pe,o};}}return null;}
(function(){if(typeof lvProbs!=='function')return;const _lp=lvProbs;lvProbs=function(M){const r=_lp.apply(this,arguments);__v13M=M;__v13P=r;return r;};
 const _lo=lvOdd;lvOdd=function(p){const o=_lo.apply(this,arguments);try{const M=__v13M;if(M&&__v13P&&(M.h.user||M.a.user||(typeof PM!=='undefined'&&PM&&PM.M===M))){for(const mk in __v13P){if(__v13P[mk]===p){const a=v13LvAlt(M,mk,p);if(a)return Math.round(a.o*100)/100;break;}}}}catch(e){}return o;};
 const _lb=lvBet;lvBet=function(w,mk){let alt=null,M=null;try{M=lvM(w);if(M){const pr=lvProbs(M);alt=v13LvAlt(M,mk,pr[mk]);if(alt&&(UI.lbStake||200)>v13Cap()){toast(`${alt.pe.bk} na tenhle kurz přijme nejvýš ${fmtMoney(v13Cap())}.`);return;}}}catch(e){}
  const L=lvList(w);const n=L.length;const r=_lb.apply(this,arguments);
  try{if(alt&&L.length>n){const b=L[L.length-1];const pr=lvProbs(M);b.pe={bk:alt.pe.bk,type:alt.pe.type,fair:Math.round(_lo(pr[mk])*100)/100,act:v13Act({type:alt.pe.type})};
   const f=typeof fixS==='function'&&(M.h.user||M.a.user)?fixS():null;if(f){f.heat+=0.35;const fixed=!!(UI.fix||M.fix||M.bribe);if(fixed){f.heat+=1.2;if(RNG()<0.35)f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(3,5),st:0,sev:2,opp:CL(M.sides[1-lvUserSide(M)].cid).n,sc:'?',bet:b.stake});}
    addNews('👀',fixed?'Komise pro integritu sázek zaznamenala sázku na chybný kurz tvého vlastního zápasu, který je navíc podezřelý. Vyšetřování hrozí.':'Sázka na chybný kurz u vlastního zápasu neunikla pozornosti kanceláře. Komise si ji poznamenala.');}
   if(!alt.pe.live&&RNG()<0.6)alt.pe.done=1;if(alt.pe.live&&M.v13live)M.v13live.until=M.min-1;}}catch(e){console.warn(e);}return r;};
 const _pay=lvPay;lvPay=function(b,w){try{if(b.pe&&!b.pe.d){b.pe.d=1;const d={bk:b.pe.bk,t:LV_MK[b.mk]||b.mk,o:czOdd(b.o),f:czOdd(b.pe.fair),st:fmtMoney(b.stake)};
   if(b.pe.act==='void'){b.res='void';S.wallet+=b.stake;addNews('🎰',v13F(v13Pick(V13_VOID,'void'),d).replace(/^❌ /,''));return;}
   if(b.pe.act==='fix'){b.o=b.pe.fair;addNews('🎰',v13F(v13Pick(V13_RES,'res'),d).replace(/^⚖️ /,''));}else addNews('🎰',v13F(v13Pick(V13_HON,'hon'),d).replace(/^✅ /,''));v13Ew(b.pe.bk,1);}}catch(e){console.warn(e);}return _pay.apply(this,arguments);};
 if(typeof lvCoVal==='function'){const _co=lvCoVal;lvCoVal=function(w,b){if(b&&b.pe)return 0;return _co.apply(this,arguments);};}})();
// živě: chyby v live kurzech (pozdní suspendace po gólu/červené, prohozené kurzy, špatná gólová linie) – vzácné a krátké
const V13_LIVE={stale:['🎰 {bk} po {ev} nestihl zastavit sázky – kurz na „{t}“ pořád svítí {o}.','🎰 Suspendace přišla pozdě: {bk} ještě chvíli po {ev} nabízí „{t}“ za {o}.','🎰 Trader u {bk} spí – i po {ev} visí „{t}“ za {o}.'],
 swap:['🎰 {bk} v live nabídce na chvíli prohodil kurzy domácích a hostů!','🎰 Chyba v živé nabídce {bk}: kurzy na domácí a hosty jsou prohozené.'],
 tot:['🎰 {bk} má v živých sázkách prohozenou gólovou linii – „víc“ a „míň“ jsou obráceně.','🎰 Gólová linie u {bk} je chvíli nesmyslná, kurzy na víc a míň gólů jsou prohozené.']};
const V13_LIVEFIX=['🎰 {bk} živé kurzy opravil.','🎰 Chyba v live nabídce {bk} zmizela, kurzy jsou zase v pořádku.','🎰 {bk} kurzy srovnal, okno se zavřelo.'];
(function(){const _sm=stepMinute;stepMinute=function(M){let p0=null;const usr=M.h.user||M.a.user||(typeof PM!=='undefined'&&PM&&PM.M===M);try{if(usr&&typeof lvProbs==='function'&&!M.ended&&!M.v13live)p0=lvProbs(M);}catch(e){}const out=_sm.apply(this,arguments);
  try{if(!usr)return out;const L=M.v13live;if(L&&!L.off&&(M.min>L.until||M.ended)){L.off=1;const e={m:M.min,t:'fill',tx:v13F(v13Pick(V13_LIVEFIX,'lfix'),{bk:L.bk})};out.push(e);M.ev.push(e);}
   if(!L&&!M.ended&&M.min<85&&M.min>=3){let kind=null,mk=null,ev='';const g=out.filter(e=>e.t==='goal').pop(),rc=out.filter(e=>e.t==='red').pop();
    if(p0&&g&&RNG()<0.03){kind='stale';mk=g.s===0?'1':'2';ev='gólu';}else if(p0&&rc&&RNG()<0.05){kind='stale';mk=rc.s===0?'2':'1';ev='červené kartě';}
    else if(RNG()<0.0005){kind=RNG()<0.5?'swap':'tot';}
    if(kind){M.v13live={kind,mk,p0:kind==='stale'&&p0?p0[mk]:null,until:M.min+rint(1,2),bk:pick(V13_BK)};const d={bk:M.v13live.bk,t:mk?LV_MK[mk]:'',o:mk&&p0?czOdd(Math.min(15,lvOdd0(lvProbs(M)[mk])*3,lvOdd0(p0[mk]))):'',ev};
     const e={m:M.min,t:'fill',tx:v13F(v13Pick(V13_LIVE[kind],'l'+kind),d)};out.push(e);M.ev.push(e);v13Chat(d,kind==='stale'?null:V13_CHATL);}}}catch(e){}return out;};})();
// banner v sázkách
(function(){const _rb=renderBets;renderBets=function(){let h=_rb.apply(this,arguments);try{const L=(S.v13&&S.v13.pe||[]).filter(v13On);if(L.length){const rows=L.map(pe=>{const m=pe.own?null:parseMid(pe.mid);const o=pe.own?null:matchOdds(m.h,m.a,pe.mid)[pe.mk];
   return `<div class="small" style="margin-top:4px">⚠️ <b>${esc(pe.bk)}</b>: ${esc(v13Tip(pe))}${o?' za <b>'+czOdd(o)+'</b>':''} – ${esc(V13_TYPE[pe.type])}.${pe.own?' Je to tvůj zápas – chybný kurz uvidíš v živých sázkách na začátku utkání. Komise sázky na vlastní zápasy bedlivě sleduje.':''}</div>`;}).join('');
   h=`<div class="card" style="padding:10px 12px;border:1px solid rgba(255,196,0,.45)"><h3>🎰 Podezřelé kurzy</h3>${rows}<div class="tiny mut" style="margin-top:6px">Kancelář může kurz kdykoli opravit. Podle podmínek může sázku na zjevnou chybu zrušit, přepočítat na správný kurz, nebo ji uznat. Max. vklad na takový tip ${fmtMoney(v13Cap())}.</div></div>`+h;}}catch(e){console.warn(e);}return h;};})();

/* v12 – 2D zápas: pohled shora na canvasu, synchronizovaný s událostmi simulace */
const M2_KEY={goal:1,save:1,miss:1,post:1,block:1,pen:1,var:1,red:1,yel:1,pk:1,arg:1,wxint:1,pwr:1,rinj:1};
function m2IsKey(e){return M2_KEY[e.t]||e.ch==='pause'||e.ch==='ab'||e.ch==='racism'||e.ch==='pitch'||e.ch==='fight';}
function m2On(){return !S.settings||S.settings.m2d!==0;}
function m2KeyOnly(){return !!(S.settings&&S.settings.m2key);}
function m2Hex(c){c=String(c||'#888').replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');const n=parseInt(c.slice(0,6),16);return isFinite(n)?[(n>>16)&255,(n>>8)&255,n&255]:[136,136,136];}
function m2Lum(c){const [r,g,b]=m2Hex(c);return (0.299*r+0.587*g+0.114*b)/255;}
function m2Dist(a,b){const x=m2Hex(a),y=m2Hex(b);return Math.abs(x[0]-y[0])+Math.abs(x[1]-y[1])+Math.abs(x[2]-y[2]);}
function m2Cols(M){const ch=(S.clubs[M.h.cid]||{}).c||['#c33','#fff'],ca=(S.clubs[M.a.cid]||{}).c||['#33c','#fff'];const G='#1f7a46',ok=c=>c&&m2Dist(c,G)>=110;let h=ok(ch[0])?ch[0]:ok(ch[1])?ch[1]:'#f2f2f2';let a=ok(ca[0])?ca[0]:ok(ca[1])?ca[1]:'#f2f2f2';
 if(m2Dist(h,a)<140){const alt=[ca[1],ca[0],'#1b2a6b','#f2f2f2','#111111','#e53935'].find(c=>ok(c)&&m2Dist(h,c)>=140);if(alt)a=alt;}const gp=['#f0c419','#7c4dff','#00bcd4','#ff7043','#cddc39','#ec407a','#111111'];const gks=[];[h,a].forEach((c,i)=>{gks[i]=gp.find(g=>m2Dist(g,h)>=150&&m2Dist(g,a)>=150&&!gks.includes(g))||gp[i];});m2Cols.gk=gks;return [h,a];}
function m2Rand(a,b){return a+Math.random()*(b-a);}
/* rychlost minut ve 2D a režim klíčových momentů */
const _m2Speed=speedMs;
speedMs=function(){const sp=(S.settings&&S.settings.speed)||2;let ms=m2On()&&MS&&!MS.ff?[0,2000,1000,450][sp]:_m2Speed();
 if(m2KeyOnly()&&MS&&MS.M){const M=MS.M;const last=M.ev.filter(e=>e.m===M.min);if(!last.some(m2IsKey))ms=m2On()?120:60;}
 if(MS&&MS.hold>0){const h=MS.hold;MS.hold=0;if(!MS.ff)ms=Math.max(ms,Math.round(h*(m2On()?1:0.6)*((S.settings&&S.settings.speed)===3?0.55:1)));}
 return ms;};
/* stav animace */
function m2State(){if(!MS)return null;if(MS.m2)return MS.m2;const M=MS.M;
 MS.m2={lastEv:0,q:[],act:null,ball:{x:.5,y:.5},from:null,to:null,tt0:0,tt1:0,car:{s:0,k:9},poss:0,next:0,pos:[[],[]],force:[{},{}],mode:'',ov:[],trail:null,num:[{},{}],nn:[12,12],t:0,cols:m2Cols(M),pen:false};MS.m2.gk=m2Cols.gk;
 M.sides.forEach((sd,s)=>sd.xi.forEach((id,k)=>{if(id)MS.m2.num[s][id]=k+1;}));
 MS.m2.car={s:0,k:m2Fwd(M,0)};MS.m2.lastEv=M.ev.length;return MS.m2;}
function m2Num(st,s,id){if(!st.num[s][id])st.num[s][id]=st.nn[s]++;return st.num[s][id];}
function m2Fwd(M,s){const sd=M.sides[s],f=FORMS[sd.form]||FORMS['4-4-2'];let b=-1,bd=999;sd.xi.forEach((id,k)=>{if(!id||!f[k])return;const d=f[k][2];if(d<bd){bd=d;b=k;}});return b<0?0:b;}
function m2Gk(M,s){const sd=M.sides[s];return sd.xi[0]?0:sd.xi.findIndex(Boolean);}
/* cílové pozice hráčů podle rozestavení a taktiky */
function m2Target(M,st,s,k){const sd=M.sides[s];const f=(FORMS[sd.form]||FORMS['4-4-2'])[k]||['CM',50,50];const tac=sd.tac||{};
 const dir=s===0?1:-1;let d=(100-f[2])/100;let lat=f[1]/100;
 const wid=tac.width==='wide'?1.12:tac.width==='narrow'?0.84:1;lat=0.5+(lat-0.5)*wid;
 const line=tac.line==='high'?0.04:tac.line==='low'?-0.04:0;
 const bx=s===0?st.ball.x:1-st.ball.x;const has=st.poss===s;
 let x=0.04+d*0.56;
 if(f[0]!=='GK'){x+=line+(bx-0.45)*(has?0.5:0.42)+(has?0.07:-0.05);x=Math.max(0.1,Math.min(0.94,x));}
 else x=Math.max(0.03,Math.min(0.16,0.045+(bx-0.5)*0.12));
 let y=lat+(st.ball.y-0.5)*(f[0]==='GK'?0.15:has?0.22:0.32);
 if(st.mode==='cele'&&st.cele&&st.cele.s===s){x=st.cele.x;y=st.cele.y;}
 if(st.mode==='pen'&&f[0]!=='GK'){const ax=s===st.penS?1:0;x=Math.min(x,0.8);if(s!==st.penS)x=Math.min(x,0.8);}
 if(st.mode==='cor'&&f[0]!=='GK'&&f[2]<80){x=Math.max(x,0.82);y=0.3+lat*0.4;}
 if(st.mode==='ko'){x=Math.min(x,0.49);}
 if(st.mode==='stop'){const ring=k%5,row=Math.floor(k/5);x=0.47-row*0.04;y=0.34+ring*0.08;if(f[0]==='GK'){x=0.36;y=0.5;}}
 if(st.mode==='empty'||st.mode==='dark'&&st.dk){x=0.46+(k%4)*0.02;y=1.12;}
 const fo=st.force[s][k];if(fo&&st.mode!=='stop'&&st.mode!=='empty'&&st.mode!=='dark'){x=fo.x;y=fo.y;}
 const ph=(k*1.7+s*3.1);x+=Math.sin(st.t/900+ph)*0.006;y+=Math.cos(st.t/1100+ph)*0.01;
 return {x:s===0?x:1-x,y:st.mode==='empty'||st.mode==='dark'&&st.dk?y:Math.max(0.03,Math.min(0.97,y))};}
/* míč */
function m2Kick(st,x,y,dur,arc){st.from={x:st.ball.x,y:st.ball.y};st.to={x,y};st.tt0=st.t;st.tt1=st.t+Math.max(60,dur);st.arc=arc||0;}
function m2PlayerXY(st,s,k){const p=st.pos[s][k];return p?{x:p.x,y:p.y}:{x:.5,y:.5};}
function m2Scale(){const sp=(S.settings&&S.settings.speed)||2;let sc=[1,1,0.55,0.28][sp];const st=MS&&MS.m2;if(st&&st.q.length>1)sc/=Math.min(3,st.q.length);if(m2KeyOnly())sc*=0.8;return sc;}
function m2Pass(M,st){const sd=M.sides[st.poss];const cand=[];sd.xi.forEach((id,k)=>{if(id&&k!==st.car.k)cand.push(k);});if(!cand.length)return;
 const cur=m2PlayerXY(st,st.poss,st.car.k);const dir=st.poss===0?1:-1;
 const w=cand.map(k=>{const p=m2PlayerXY(st,st.poss,k);const fw=(p.x-cur.x)*dir;const dd=Math.hypot(p.x-cur.x,p.y-cur.y);return Math.max(0.05,1+fw*3-Math.abs(dd-0.22)*3);});
 let r=Math.random()*w.reduce((a,b)=>a+b,0),k=cand[0];for(let i=0;i<cand.length;i++){r-=w[i];if(r<=0){k=cand[i];break;}}
 const flip=Math.random()<0.16;
 const pb=(M.possBase!=null?M.possBase:50)/100;
 if(flip){const ns=Math.random()<pb?0:1;if(ns!==st.poss){const o=1-st.poss;const mid={x:(cur.x+m2PlayerXY(st,st.poss,k).x)/2,y:(cur.y+m2PlayerXY(st,st.poss,k).y)/2};let bk=-1,bd=9;M.sides[o].xi.forEach((id,j)=>{if(!id)return;const p=m2PlayerXY(st,o,j);const d=Math.hypot(p.x-mid.x,p.y-mid.y);if(d<bd){bd=d;bk=j;}});if(bk>=0){st.pend={s:o,k:bk};const p=m2PlayerXY(st,o,bk);m2Kick(st,p.x,p.y,m2Rand(280,450)*m2Scale());return;}}}
 const p=m2PlayerXY(st,st.poss,k);st.pend={s:st.poss,k};m2Kick(st,p.x,p.y,m2Rand(300,560)*m2Scale(),Math.hypot(p.x-cur.x,p.y-cur.y)>0.35?1:0);}
function m2Ov(st,o){o.t0=st.t;o.dur=(o.dur||1200);st.ov.push(o);if(st.ov.length>6)st.ov.shift();}
function m2Slot(M,s,id){const k=M.sides[s].xi.indexOf(id);return k>=0?k:-1;}
/* skripty k událostem */
function m2Script(M,st,e){const s=e.s==null?st.poss:e.s,o=1-s,dir=s===0?1:-1,sc=m2Scale();const gx=s===0?1:0;
 const att=(x)=>s===0?x:1-x;const steps=[];
 const shooter=()=>{let k=e.p?m2Slot(M,s,e.p):-1;if(k<0)k=m2Fwd(M,s);return k;};
 const shot=(kind)=>{const k=shooter();const spot={x:att(m2Rand(0.78,0.86)),y:m2Rand(0.32,0.68)};
  if(!st.pen){steps.push({d:650,f:()=>{st.mode='';st.poss=s;st.force[s][k]=spot;const p=m2PlayerXY(st,s,k);st.pend={s,k};m2Kick(st,spot.x-dir*0.02,spot.y,420*sc,1);}});}
  else steps.push({d:420,f:()=>{st.force[s][k]={x:att(0.865),y:0.5};st.car={s,k};st.ball={x:att(0.895),y:0.5};}});
  steps.push({d:330,f:()=>{st.force[s]={};st.car=null;st.trail={x:st.ball.x,y:st.ball.y,t0:st.t};const gk=m2Gk(M,o);const g=m2PlayerXY(st,o,gk);
   if(kind==='goal'){m2Kick(st,gx+(s===0?0.012:-0.012),m2Rand(0.465,0.535),300*sc);}
   else if(kind==='save'){m2Kick(st,g.x,g.y,300*sc);}
   else if(kind==='miss'){m2Kick(st,gx+(s===0?0.02:-0.02),Math.random()<.5?m2Rand(0.3,0.42):m2Rand(0.58,0.7),320*sc);}
   else if(kind==='post'){m2Kick(st,gx,Math.random()<.5?0.447:0.553,280*sc);}
   else {const d=m2PlayerXY(st,o,Math.max(1,Math.min(4,Math.floor(Math.random()*4)+1)));m2Kick(st,d.x,d.y,220*sc);}}});
  const gk=m2Gk(M,o);
  if(kind==='goal'){steps.push({d:1500,f:()=>{const sx=att(0.9),sy=st.ball.y<0.5?0.12:0.88;st.mode='cele';st.cele={s,x:s===0?0.9:0.1,y:sy};m2Ov(st,{tp:'big',tx:'GÓL!',c:st.cols[s],dur:1400});}});
   steps.push({d:500,f:()=>{st.mode='ko';st.cele=null;st.ball={x:.5,y:.5};st.poss=o;st.car={s:o,k:m2Fwd(M,o)};st.next=st.t+500*sc;}});}
  else if(kind==='save')steps.push({d:700,f:()=>{m2Ov(st,{tp:'lbl',tx:e.pen?'Chycená penalta!':'Zákrok!',x:st.ball.x,y:st.ball.y});st.poss=o;st.car={s:o,k:gk};}});
  else if(kind==='miss')steps.push({d:700,f:()=>{m2Ov(st,{tp:'lbl',tx:'Vedle!',x:att(0.9),y:st.ball.y});st.ball={x:s===0?0.95:0.05,y:0.5};st.poss=o;st.car={s:o,k:gk};}});
  else if(kind==='post')steps.push({d:650,f:()=>{m2Ov(st,{tp:'lbl',tx:'Tyč!',x:att(0.9),y:st.ball.y});const d=m2PlayerXY(st,o,2);st.pend={s:o,k:2};m2Kick(st,d.x,d.y,300*sc);}});
  else steps.push({d:600,f:()=>{m2Ov(st,{tp:'lbl',tx:'Zblokováno',x:st.ball.x,y:st.ball.y});st.poss=o;st.car={s:o,k:Math.min(3,M.sides[o].xi.length-1)};}});
  steps.push({d:1,f:()=>{st.pen=false;if(st.mode==='pen')st.mode='';}});};
 switch(e.t){
  case 'goal':case 'save':case 'miss':case 'post':case 'block':shot(e.t);break;
  case 'pen':steps.push({d:1100,f:()=>{st.pen=true;st.mode='pen';st.penS=s;st.poss=s;st.car=null;st.ball={x:att(0.895),y:0.5};m2Ov(st,{tp:'big',tx:'PENALTA',c:'#ffd54a',dur:1000});}});break;
  case 'var':steps.push({d:1400,f:()=>{st.car=null;m2Ov(st,{tp:'big',tx:e.vg?'📺 VAR – gól neplatí':'📺 VAR',c:'#9be7ff',dur:1300});}});steps.push({d:1,f:()=>{st.pen=false;st.mode='';st.car={s:1-s,k:m2Gk(M,1-s)};st.poss=1-s;}});break;
  case 'cor':{const cy=Math.random()<.5?0.015:0.985;steps.push({d:500,f:()=>{st.poss=s;st.car=null;st.mode='cor';m2Kick(st,att(0.995),cy,300*sc);m2Ov(st,{tp:'flag',x:att(0.995),y:cy,dur:900});}});
   steps.push({d:700,f:()=>{m2Kick(st,att(m2Rand(0.86,0.92)),m2Rand(0.4,0.6),450*sc,1);m2Ov(st,{tp:'lbl',tx:'Roh',x:att(0.96),y:cy<.5?0.1:0.9});}});
   steps.push({d:300,f:()=>{st.mode='';const k=m2Fwd(M,s);st.car={s,k};}});break;}
  case 'yel':case 'red':{const k=e.p?m2Slot(M,s,e.p):-1;steps.push({d:1300,f:()=>{st.car=null;const p=k>=0?m2PlayerXY(st,s,k):(st.lastRed&&st.lastRed[e.p])||{x:st.ball.x,y:st.ball.y};m2Ov(st,{tp:'card',c:e.t==='red'?'#e53935':'#ffd600',x:p.x,y:p.y,tx:e.p&&typeof nm==='function'?nm(e.p):'',dur:1300});st.poss=o;}});
   steps.push({d:1,f:()=>{st.car={s:o,k:Math.min(5,M.sides[o].xi.length-1)};}});break;}
  case 'off':steps.push({d:1000,f:()=>{st.car=null;m2Ov(st,{tp:'flag',x:st.ball.x,y:s===0?0.985:0.015,dur:900});m2Ov(st,{tp:'lbl',tx:'Ofsajd',x:st.ball.x,y:0.88});st.poss=o;}});steps.push({d:1,f:()=>{st.car={s:o,k:2};}});break;
  case 'inj':{const k=e.p?m2Slot(M,s,e.p):-1;steps.push({d:1000,f:()=>{const p=k>=0?m2PlayerXY(st,s,k):{x:.5,y:.5};m2Ov(st,{tp:'lbl',tx:'🚑',x:p.x,y:p.y,dur:1100});}});break;}
  case 'sub':steps.push({d:700,f:()=>{m2Ov(st,{tp:'lbl',tx:'🔄 Střídání',x:0.5,y:0.94,dur:1000});}});break;
  case 'ht':case 'ft':case 'et':steps.push({d:900,f:()=>{st.car=null;m2Ov(st,{tp:'big',tx:e.t==='ht'?'Poločas':e.t==='ft'?'Konec zápasu':'Prodloužení',c:'#fff',dur:e.t==='ft'?99999:1600});}});
   if(e.t!=='ft')steps.push({d:1,f:()=>{st.mode='ko';st.ball={x:.5,y:.5};st.poss=e.t==='ht'?1:0;st.car={s:st.poss,k:m2Fwd(M,st.poss)};}});break;
  case 'arg':{const R=st.ref||{x:.5,y:.5};if(e.k==='pro'||e.k==='mass'){steps.push({d:1700,f:()=>{st.car=null;st.to=null;const on=[];M.sides[s].xi.forEach((id,k)=>{if(id&&k)on.push(k);});const p0=e.p?m2Slot(M,s,e.p):-1;const near=on.map(k=>[Math.hypot(m2PlayerXY(st,s,k).x-R.x,m2PlayerXY(st,s,k).y-R.y),k]).sort((a,b)=>a[0]-b[0]).slice(0,e.k==='mass'?5:3).map(x=>x[1]);if(p0>0&&!near.includes(p0))near.unshift(p0);
     near.forEach((k,j)=>{const a=j/near.length*Math.PI*2+(s?Math.PI/3:0);st.force[s][k]={x:R.x+Math.cos(a)*0.05,y:R.y+Math.sin(a)*0.08};});
     if(e.k==='mass'){const oo=[];M.sides[o].xi.forEach((id,k)=>{if(id&&k)oo.push(k);});oo.slice(0,4).forEach((k,j)=>{const a=j/4*Math.PI*2+0.4;st.force[o][k]={x:R.x+Math.cos(a)*0.085,y:R.y+Math.sin(a)*0.13};});}
     m2Ov(st,{tp:'lbl',tx:e.k==='mass'?'👊 Strkanice':'😡 Protesty',x:R.x,y:R.y,dur:1600});}});steps.push({d:1,f:()=>{if(e.k!=='mass')return;}});}
    else if(e.k==='cap')steps.push({d:900,f:()=>{const k=e.p?m2Slot(M,s,e.p):-1;if(k>=0)st.force[s][k]={x:R.x+0.02,y:R.y};m2Ov(st,{tp:'lbl',tx:'©️ Kapitán uklidňuje',x:R.x,y:R.y+0.12,dur:900});}});
    else if(e.k==='calm')steps.push({d:700,f:()=>{st.force=[{},{}];m2Ov(st,{tp:'lbl',tx:'Hraje se dál',x:R.x,y:R.y,dur:700});st.car={s:o,k:Math.min(4,M.sides[o].xi.length-1)};st.poss=o;}});
    else{const tx=e.k==='coach'?'🗣️ Trenér zuří':e.k==='coachoff'?'🟥 Trenér na tribunu':e.k==='bench'?'⚡ Hádka laviček':e.k==='staffY'?'🟨 Karta pro lavičku':e.k==='staffR'?'🟥 Člen týmu vykázán':'';steps.push({d:e.k==='coach'||e.k==='bench'?900:1100,f:()=>{st.force=[{},{}];st.coach={s,t0:st.t,k:e.k};m2Ov(st,{tp:'lbl',tx,x:e.k==='bench'?0.5:(s===0?0.32:0.68),y:0.95,dur:1100});}});}
    steps.push({d:1,f:()=>{if(e.k==='calm'||e.k==='coach'||e.k==='coachoff'||e.k==='staffY'||e.k==='staffR'||e.k==='bench')st.force=[{},{}];}});break;}
  case 'wx':steps.push({d:900,f:()=>{const w=(typeof WX!=='undefined'&&WX[e.k])||{ic:'',n:''};m2Ov(st,{tp:'lbl',tx:w.ic+' '+w.n,x:0.5,y:0.1,dur:1500});}});break;
  case 'wxint':case 'pwr':steps.push({d:1600,f:()=>{st.car=null;st.to=null;st.mode=e.t==='pwr'?'dark':'empty';st.dk=1;st.stopT=st.t;st.ball={x:.5,y:.5};m2Ov(st,{tp:'big',tx:e.t==='pwr'?'💡 Výpadek proudu':'⛈️ Přerušeno',c:'#ffd54a',dur:2600});}});break;
  case 'wxres':case 'pwres':steps.push({d:900,f:()=>{st.mode='ko';st.dk=0;st.ball={x:.5,y:.5};st.car={s:0,k:m2Fwd(M,0)};st.poss=0;m2Ov(st,{tp:'lbl',tx:'▶️ Hra pokračuje',x:.5,y:.12,dur:1000});}});break;
  case 'rinj':steps.push({d:1500,f:()=>{st.car=null;st.mode='stop';st.stopT=st.t;st.refDown=st.t;m2Ov(st,{tp:'lbl',tx:'🚑 Zraněný sudí',x:(st.ref||{x:.5}).x,y:(st.ref||{y:.5}).y,dur:1400});}});steps.push({d:1,f:()=>{st.mode='';st.refDown=0;st.car={s:st.poss,k:m2Fwd(M,st.poss)};}});break;
  case 'ko':steps.push({d:1,f:()=>{st.mode='ko';st.ball={x:.5,y:.5};st.car={s:0,k:m2Fwd(M,0)};st.poss=0;}});break;
  case 'pso':steps.push({d:1000,f:()=>{m2Ov(st,{tp:'big',tx:'Penaltový rozstřel',c:'#ffd54a',dur:1200});}});break;
  default:
   if(e.ch){const ch=e.ch,end=(e.s===0?0.04:0.96);
    if(ch==='pause'){steps.push({d:1300,f:()=>{st.car=null;st.to=null;st.mode=e.rac2?'empty':'stop';st.stopT=st.t;m2Ov(st,{tp:'big',tx:e.rac2?'🚫 Hráči v kabinách':'⏸️ Hra přerušena',c:'#ffd54a',dur:2000});}});break;}
    if(ch==='res'){steps.push({d:700,f:()=>{st.mode='ko';st.smoke=null;st.ball={x:.5,y:.5};st.car={s:0,k:m2Fwd(M,0)};st.poss=0;m2Ov(st,{tp:'lbl',tx:'▶️ Hra pokračuje',x:.5,y:.12,dur:1000});}});break;}
    if(ch==='ab'){steps.push({d:1500,f:()=>{st.car=null;st.mode='empty';st.smoke=null;m2Ov(st,{tp:'big',tx:'⛔ Zápas ukončen',c:'#ff6b6b',dur:99999});}});break;}
    if(ch==='smoke'||ch==='pyro'||ch==='joy'){steps.push({d:900,f:()=>{st.smoke={x:end,t0:st.t,c:ch==='smoke'?'rgba(200,200,210,':'rgba(255,120,60,'};m2Ov(st,{tp:'lbl',tx:ch==='smoke'?'💨 Dýmovnice':'🔥 Pyrotechnika',x:end,y:0.12,dur:1300});}});break;}
    if(ch==='invader'){steps.push({d:1800,f:()=>{st.car=null;st.inv={t0:st.t,y0:Math.random()<.5?0.02:0.98,n:1};m2Ov(st,{tp:'lbl',tx:'🏃 Fanoušek na hřišti',x:.5,y:.12,dur:1600});}});break;}
    if(ch==='pitch'){steps.push({d:1800,f:()=>{st.car=null;st.mode='empty';st.inv={t0:st.t,y0:0.98,n:14};m2Ov(st,{tp:'big',tx:'🚨 Fanoušci na hřišti',c:'#ff6b6b',dur:2000});}});break;}
    if(ch==='throw'||ch==='laser'||ch==='fight'||ch==='racism'){const t={throw:'🥤 Předměty na hřišti',laser:'🔦 Laser',fight:'👊 Rvačka na tribuně',racism:'🚫 Rasistické urážky'}[ch];steps.push({d:1100,f:()=>{st.car=null;m2Ov(st,{tp:'lbl',tx:t,x:ch==='fight'?0.5:end,y:ch==='fight'?0.06:0.5,dur:1300});}});break;}
   }
   if(e.cer){steps.push({d:1000,f:()=>{m2Ov(st,{tp:'lbl',tx:e.cer==='cho'?'🎨 Choreo':e.cer==='sil'?'🕯️ Minuta ticha':'👏 Potlesk',x:.5,y:.1,dur:1400});}});break;}
   if(e.gke){steps.push({d:900,f:()=>{const k=m2Gk(M,1-s);const p=m2PlayerXY(st,1-s,k);st.ball={x:p.x+(s===0?-0.03:0.03),y:p.y+0.02};st.car=null;m2Ov(st,{tp:'lbl',tx:'😱 Chyba brankáře',x:p.x,y:p.y,dur:900});}});break;}
   if(e.s!=null&&Math.random()<0.5&&st.poss!==e.s){steps.push({d:1,f:()=>{st.poss=e.s;st.car={s:e.s,k:Math.min(6,M.sides[e.s].xi.length-1)};}});}
 }
 return steps;}
function m2Update(st,dt){const M=MS.M;st.t+=dt;
 if(M.ev.length>st.lastEv){M.ev.slice(st.lastEv).forEach(e=>{if(e.t==='red'&&e.p){const k=-1;}st.q.push(e);});st.lastEv=M.ev.length;if(st.q.length>8)st.q=st.q.filter((e,i,a)=>M2_KEY[e.t]||e.t==='ft'||i>=a.length-3);}
 if(!st.act&&st.q.length){const e=st.q.shift();st.act={steps:m2Script(M,st,e),i:0,end:0};}
 if(st.act){const a=st.act;if(st.t>=a.end){if(a.i>=a.steps.length)st.act=null;else{const sp=a.steps[a.i++];try{sp.f();}catch(err){}a.end=st.t+sp.d*m2Scale();}}}
 /* míč v letu */
 if(st.to){const u=Math.min(1,(st.t-st.tt0)/(st.tt1-st.tt0||1));const e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;st.ball={x:st.from.x+(st.to.x-st.from.x)*e,y:st.from.y+(st.to.y-st.from.y)*e};st.ballH=st.arc?Math.sin(u*Math.PI):0;
  if(u>=1){st.to=null;st.ballH=0;if(st.pend){st.car=st.pend;st.poss=st.pend.s;st.pend=null;}st.next=st.t+m2Rand(350,900)*m2Scale();}}
 else if(!st.act&&!MS.paused&&!M.ended&&st.car&&st.t>=st.next){if(st.mode==='ko')st.mode='';m2Pass(M,st);}
 /* hráči */
 const kf=Math.min(1,dt/260);
 for(let s=0;s<2;s++){const sd=M.sides[s];const np=[];sd.xi.forEach((id,k)=>{if(!id)return;const tg=m2Target(M,st,s,k);let p=st.pos[s][k];
   if(st.car&&st.car.s===s&&st.car.k===k&&!st.to&&!st.act){const dir=s===0?1:-1;tg.x+=dir*0.04;}
   if(!p||p.id!==id){p={x:tg.x,y:s===0?tg.y:tg.y,id};if(st.pos[s][k]&&st.pos[s][k].id!==id){p.x=0.5;p.y=0.99;}}
   p.x+=(tg.x-p.x)*kf;p.y+=(tg.y-p.y)*kf;np[k]=p;});
  /* presink: nejbližší bránící hráč jde k míči */
  if(st.poss!==s&&!st.act&&!st.mode){const pr=(sd.tac&&sd.tac.press==='high')?2:1;const ds=[];np.forEach((p,k)=>{if(p&&k)ds.push([Math.hypot(p.x-st.ball.x,p.y-st.ball.y),k]);});ds.sort((a,b)=>a[0]-b[0]);ds.slice(0,pr).forEach(([d,k])=>{const p=np[k];p.x+=(st.ball.x-p.x)*kf*0.6;p.y+=(st.ball.y-p.y)*kf*0.6;});}
  st.pos[s]=np;}
 if(st.car&&!st.to){const p=st.pos[st.car.s][st.car.k];if(p){const dir=st.car.s===0?1:-1;st.ball={x:p.x+dir*0.012,y:p.y+0.01};}else st.car=null;}
  if(!st.ref)st.ref={x:.5,y:.6};{const dir=st.poss===0?1:-1;let tx=st.ball.x-dir*0.07,ty=st.ball.y+(st.ball.y<0.5?0.12:-0.12);if(st.mode==='stop'){tx=0.5;ty=0.62;}if(st.mode==='empty'||st.mode==='dark'&&st.dk){tx=0.5;ty=1.12;}if(st.act&&st.act.steps&&st.force[0]&&Object.keys(st.force[0]).length+Object.keys(st.force[1]).length>2){tx=st.ref.x;ty=st.ref.y;}
  if(st.refDown){tx=st.ref.x;ty=st.ref.y;}st.ref.x+=(Math.max(0.03,Math.min(0.97,tx))-st.ref.x)*kf*0.8;st.ref.y+=((st.mode==='empty'||st.mode==='dark'&&st.dk?ty:Math.max(0.04,Math.min(0.96,ty)))-st.ref.y)*kf*0.8;}
 if((st.mode==='stop'||st.mode==='empty'||st.mode==='dark')&&st.stopT&&st.t-st.stopT>14000&&!M.ended){st.mode='';st.dk=0;st.stopT=0;}
 {const nf=Object.keys(st.force[0]).length+Object.keys(st.force[1]).length;if(nf&&!st.fT)st.fT=st.t;if(!nf)st.fT=0;if(nf&&!st.act&&st.t-st.fT>2600){st.force=[{},{}];st.fT=0;}}
 if(st.smoke&&st.t-st.smoke.t0>9000)st.smoke=null;if(st.inv&&st.t-st.inv.t0>3200)st.inv=null;
 st.ov=st.ov.filter(o=>st.t-o.t0<o.dur);}
/* počasí na hřišti: lehké částice, max ~70 objektů */
function m2Wx(ctx,st,W,H,M){const k=M.wx&&M.wx.k;const dk=st.mode==='dark'&&st.dk;if(dk){ctx.fillStyle='rgba(0,0,8,.72)';ctx.fillRect(0,0,W,H);}
 if(!k||k==='sun'||k==='cloud'){if(k==='cloud'){ctx.fillStyle='rgba(20,30,40,.08)';ctx.fillRect(0,0,W,H);}return;}
 const n=k==='pour'||k==='storm'?70:k==='rain'?38:k==='snow'?45:k==='wind'?10:0;if(!st.wxp||st.wxp.k!==k){st.wxp={k,a:[]};for(let i=0;i<n;i++)st.wxp.a.push({x:Math.random(),y:Math.random(),v:0.6+Math.random()*0.6});}
 const dt=Math.min(50,st.t-(st.wxp.t||st.t));st.wxp.t=st.t;
 if(k==='rain'||k==='pour'||k==='storm'){ctx.strokeStyle=k==='rain'?'rgba(200,220,255,.45)':'rgba(200,220,255,.55)';ctx.lineWidth=1;ctx.beginPath();const L=k==='rain'?7:10;st.wxp.a.forEach(p=>{p.y+=dt*0.0011*p.v*(k==='rain'?1:1.4);p.x+=dt*0.0002;if(p.y>1){p.y-=1;p.x=Math.random();}if(p.x>1)p.x-=1;const x=p.x*W,y=p.y*H;ctx.moveTo(x,y);ctx.lineTo(x-2,y+L);});ctx.stroke();
  ctx.fillStyle='rgba(10,20,40,'+(k==='rain'?0.1:0.18)+')';ctx.fillRect(0,0,W,H);
  if(k==='storm'){if(!st.fl||st.t>st.fl+4000+Math.random()*3000)st.fl=st.t;const a=Math.max(0,1-(st.t-st.fl)/260);if(a>0){ctx.fillStyle='rgba(255,255,255,'+(a*0.35)+')';ctx.fillRect(0,0,W,H);}}}
 else if(k==='snow'){ctx.fillStyle='rgba(255,255,255,.85)';st.wxp.a.forEach(p=>{p.y+=dt*0.00018*p.v;p.x+=Math.sin(st.t/700+p.v*9)*0.0006;if(p.y>1){p.y-=1;p.x=Math.random();}const x=((p.x%1)+1)%1*W,y=p.y*H;ctx.fillRect(x,y,1.8,1.8);});ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(0,0,W,H);}
 else if(k==='fog'){const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(215,220,225,.42)');g.addColorStop(0.5,'rgba(215,220,225,.22)');g.addColorStop(1,'rgba(215,220,225,.42)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
 else if(k==='wind'){ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;ctx.beginPath();st.wxp.a.forEach(p=>{p.x+=dt*0.0009*p.v;if(p.x>1.1){p.x=-0.1;p.y=Math.random();}const x=p.x*W,y=p.y*H;ctx.moveTo(x,y);ctx.quadraticCurveTo(x+12,y-3,x+24,y);});ctx.stroke();}
 else if(k==='heat'){ctx.fillStyle='rgba(255,170,60,.07)';ctx.fillRect(0,0,W,H);}}
/* vykreslení */
function m2Draw(cv,st){const M=MS.M;const ctx=cv.getContext('2d');const dpr=cv._dpr||1;const W=cv.width/dpr,H=cv.height/dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
 const m=6,pw=W-2*m,ph=H-2*m;const X=x=>m+x*pw,Y=y=>m+y*ph;
 for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#1f7a46':'#238a4f';ctx.fillRect(m+i*pw/10,m,pw/10+0.5,ph);}
 ctx.fillStyle='#17633a';ctx.fillRect(0,0,W,m);ctx.fillRect(0,H-m,W,m);ctx.fillRect(0,0,m,H);ctx.fillRect(W-m,0,m,H);
 ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1.2;ctx.strokeRect(X(0),Y(0),pw,ph);
 ctx.beginPath();ctx.moveTo(X(.5),Y(0));ctx.lineTo(X(.5),Y(1));ctx.stroke();
 ctx.beginPath();ctx.arc(X(.5),Y(.5),0.087*pw,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(X(.5),Y(.5),1.6,0,7);ctx.fill();
 [0,1].forEach(side=>{const sx=side?1:0,d=side?-1:1;ctx.strokeRect(side?X(1-0.157):X(0),Y(0.204),0.157*pw,0.592*ph);ctx.strokeRect(side?X(1-0.052):X(0),Y(0.365),0.052*pw,0.27*ph);
  ctx.beginPath();ctx.arc(X(sx+d*0.105),Y(.5),1.4,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(X(sx+d*0.105),Y(.5),0.087*pw,side?Math.PI-0.92:-0.92,side?Math.PI+0.92:0.92);ctx.stroke();
  ctx.save();ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(side?X(1):X(0)-4,Y(0.446),4,0.108*ph);ctx.strokeRect(side?X(1):X(0)-4,Y(0.446),4,0.108*ph);ctx.restore();});
 /* stopa střely */
 if(st.trail&&st.t-st.trail.t0<900){ctx.strokeStyle='rgba(255,240,150,'+(1-(st.t-st.trail.t0)/900)*0.8+')';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(X(st.trail.x),Y(st.trail.y));ctx.lineTo(X(st.ball.x),Y(st.ball.y));ctx.stroke();ctx.setLineDash([]);}
 if(st.smoke){const a=Math.max(0,1-(st.t-st.smoke.t0)/9000);for(let i=0;i<7;i++){const ph=st.t/1400+i;const sx=X(st.smoke.x+(st.smoke.x<.5?1:-1)*(0.03+0.05*((i*37)%5)/5)+Math.sin(ph)*0.01),sy=Y(0.15+i*0.11+Math.cos(ph)*0.01);const g=ctx.createRadialGradient(sx,sy,2,sx,sy,W*0.09);g.addColorStop(0,st.smoke.c+(0.55*a)+')');g.addColorStop(1,st.smoke.c+'0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,W*0.09,0,7);ctx.fill();}}
 const r=Math.max(6,Math.min(9,W*0.023));ctx.font='bold '+Math.round(r*1.05)+'px -apple-system,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 for(let s=0;s<2;s++){const col=st.cols[s];const tc=m2Lum(col)>0.6?'#111':'#fff';const sd=M.sides[s];
  st.pos[s].forEach((p,k)=>{if(!p)return;const gk=k===0;ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.arc(X(p.x)+1,Y(p.y)+1.5,r,0,7);ctx.fill();
   ctx.fillStyle=gk?(st.gk||['#f0c419','#7c4dff'])[s]:col;ctx.beginPath();ctx.arc(X(p.x),Y(p.y),r,0,7);ctx.fill();
   ctx.lineWidth=st.car&&st.car.s===s&&st.car.k===k?2.2:1;ctx.strokeStyle=st.car&&st.car.s===s&&st.car.k===k?'#fff':'rgba(0,0,0,.45)';ctx.stroke();
   ctx.fillStyle=gk?(m2Lum((st.gk||['#f0c419'])[s])>0.6?'#111':'#fff'):tc;ctx.fillText(String(m2Num(st,s,p.id)),X(p.x),Y(p.y)+0.5);});}
 /* rozhodčí */
 if(st.ref){const rx=X(st.ref.x),ry=Y(st.ref.y);ctx.fillStyle='#151515';ctx.beginPath();if(st.refDown)ctx.ellipse(rx,ry,r*0.9,r*0.45,0,0,7);else ctx.arc(rx,ry,r*0.72,0,7);ctx.fill();ctx.strokeStyle='#ffeb3b';ctx.lineWidth=1.4;ctx.stroke();}
 if(st.coach&&st.t-st.coach.t0<1800){const cx=X(st.coach.s===0?0.32:0.68),cy=H-m-2;ctx.fillStyle=st.coach.k==='coachoff'||st.coach.k==='staffR'?'#e53935':'#fff';ctx.beginPath();ctx.arc(cx+Math.sin(st.t/90)*2,cy,r*0.6,0,7);ctx.fill();}
 if(st.inv){const u=(st.t-st.inv.t0)/3200;for(let i=0;i<st.inv.n;i++){const ix=X(0.25+u*0.5+((i*13)%7)*0.03),iy=Y(st.inv.y0+(st.inv.y0<.5?1:-1)*(0.1+u*0.6+((i*7)%5)*0.04));ctx.fillStyle='#ff9800';ctx.beginPath();ctx.arc(ix,iy,r*0.6,0,7);ctx.fill();}
  const gx=X(0.22+u*0.48),gy=Y(st.inv.y0+(st.inv.y0<.5?1:-1)*(0.05+u*0.56));ctx.fillStyle='#ffeb3b';ctx.beginPath();ctx.arc(gx,gy,r*0.6,0,7);ctx.fill();ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.stroke();}
 /* míč */
 const bh=(st.ballH||0)*4;ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(X(st.ball.x)+1,Y(st.ball.y)+1.5,r*0.42,0,7);ctx.fill();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(X(st.ball.x),Y(st.ball.y)-bh,r*0.42+bh*0.25,0,7);ctx.fill();ctx.strokeStyle='#222';ctx.lineWidth=0.8;ctx.stroke();
 m2Wx(ctx,st,W,H,M);
 /* překryvy */
 st._ly=[];st.ov.forEach(o=>{const a=Math.min(1,(o.dur-(st.t-o.t0))/300);ctx.globalAlpha=Math.max(0,a);
  if(o.tp==='big'){const fs=Math.min(30,W*0.08);ctx.font='900 '+fs+'px -apple-system,system-ui,sans-serif';ctx.fillStyle='rgba(0,0,0,.55)';const tw=ctx.measureText(o.tx).width+24;ctx.fillRect(W/2-tw/2,H/2-fs*0.8,tw,fs*1.6);ctx.fillStyle=o.c||'#fff';ctx.fillText(o.tx,W/2,H/2+1);}
  else if(o.tp==='lbl'){ctx.font='bold 12px -apple-system,system-ui,sans-serif';const tw=ctx.measureText(o.tx).width+10;const x=Math.max(m+tw/2+3,Math.min(W-m-tw/2-3,X(o.x)));let y=Math.max(m+10,Math.min(H-m-10,Y(o.y)-r-8));(st._ly||(st._ly=[])).forEach(q=>{if(Math.abs(q[0]-x)<(q[2]+tw)/2&&Math.abs(q[1]-y)<17)y=q[1]+(q[1]>H-30?-18:18);});st._ly.push([x,y,tw]);ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x-tw/2,y-8,tw,16);ctx.fillStyle='#fff';ctx.fillText(o.tx,x,y);}
  else if(o.tp==='card'){const x=X(o.x),y=Math.max(14,Y(o.y)-r-12);ctx.fillStyle=o.c;ctx.fillRect(x-5,y-8,10,14);ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.strokeRect(x-5,y-8,10,14);if(o.tx){ctx.font='bold 11px -apple-system,system-ui,sans-serif';const tw=ctx.measureText(o.tx).width+8;const lx=Math.max(tw/2+2,Math.min(W-tw/2-2,x));const ly=y<30?y+24:y-16;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(lx-tw/2,ly-7,tw,14);ctx.fillStyle='#fff';ctx.fillText(o.tx,lx,ly);}}
  else if(o.tp==='flag'){const x=X(o.x),y=Y(o.y);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-14);ctx.stroke();ctx.fillStyle='#ffeb3b';ctx.fillRect(x,y-14,9,6);}
  ctx.globalAlpha=1;ctx.font='bold '+Math.round(r*1.05)+'px -apple-system,system-ui,sans-serif';});
 if(MS.paused&&!M.ended&&!st.ov.some(o=>o.tp==='big')){ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(W/2-34,H-26,68,20);ctx.fillStyle='#fff';ctx.font='bold 12px -apple-system,system-ui,sans-serif';ctx.fillText('⏸ Pauza',W/2,H-16);}}
function m2Size(force){const cv=document.getElementById('m2c');if(!cv)return;const box=cv.parentElement;const now=performance.now();
 if(!force&&cv._chk&&now-cv._chk<700&&cv._vh===innerHeight)return;cv._chk=now;cv._vh=innerHeight;
 const cs=getComputedStyle(box);const bw=Math.max(200,box.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0));
 const q=s=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().height:0;};const vw=document.getElementById('mv');const vh=vw?vw.clientHeight:innerHeight;
 const free=vh-q('#mv .mtop')-q('#mv .mtabs')-q('#mvfoot')-6-96;
 const H=Math.round(Math.max(120,Math.min(bw*0.62,free)));const W=Math.round(Math.min(bw,H*2.05));const dpr=Math.min(2,window.devicePixelRatio||1);
 if(cv._w===W&&cv._h===H&&cv._dpr===dpr)return;cv._w=W;cv._h=H;cv._dpr=dpr;cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
function m2Loop(){if(MS&&MS.m2raf)cancelAnimationFrame(MS.m2raf);let last=performance.now();const my=MS;
 const fr=(now)=>{if(!MS||MS!==my||!document.getElementById('m2c')){if(my)my.m2raf=0;return;}const dt=Math.min(100,now-last);last=now;
  if(!document.hidden){const st=m2State();m2Size();m2Update(st,dt);m2Draw(document.getElementById('m2c'),st);}my.m2raf=requestAnimationFrame(fr);};
 my.m2raf=requestAnimationFrame(fr);}
function m2Html(){const k=m2KeyOnly();
 if(m2On())return `<canvas id="m2c" aria-label="2D pohled na hřiště"></canvas><button class="m2b l" onclick="m2Toggle()" aria-label="Přepnout na textový přenos">📝 Text</button><button class="m2b r${k?' on':''}" onclick="m2KeyT()" aria-label="Jen klíčové momenty">⭐ Klíčové</button>`;
 return `<div class="m2off"><button class="btn ghost" onclick="m2Toggle()">🎮 2D zápas</button><button class="btn ghost${k?' on':''}" onclick="m2KeyT()">⭐ ${k?'Klíčové momenty ✓':'Jen klíčové momenty'}</button></div>`;}
function m2Mount(){const mt=document.querySelector('#mv .mtop');if(!mt||!MS)return;let d=document.getElementById('m2d');if(!d){d=document.createElement('div');d.id='m2d';d.className='m2d';mt.after(d);}
 d.classList.toggle('off',!m2On());d.innerHTML=m2Html();if(m2On()){m2State();m2Size(true);m2Loop();}}
function m2Toggle(){S.settings.m2d=m2On()?0:1;if(typeof save==='function')try{save();}catch(e){}m2Mount();if(MS&&!MS.paused)schedule();toast(m2On()?'2D zápas zapnut.':'Textový přenos – 2D pohled je vypnutý.');}
function m2KeyT(){S.settings.m2key=m2KeyOnly()?0:1;if(typeof save==='function')try{save();}catch(e){}m2Mount();if(MS&&!MS.paused)schedule();toast(m2KeyOnly()?'Klíčové momenty: klidné minuty se přetočí.':'Zobrazuji celý zápas.');}
const _m2Draw=drawLive;drawLive=function(){const r=_m2Draw.apply(this,arguments);try{m2Mount();}catch(e){console.warn(e);}return r;};
const _m2Fin=finishNow;finishNow=function(){if(MS)MS.ff=true;return _m2Fin.apply(this,arguments);};
if(typeof window!=='undefined')window.addEventListener('resize',()=>{try{m2Size(true);}catch(e){}});
/* komentář: animuj jen nové řádky (dřív při každé minutě problikl celý seznam) */
const _m2Upd=updLive;updLive=function(){const r=_m2Upd.apply(this,arguments);try{if(MS&&MS.M&&MS.M.wx&&typeof wxText==='function'){const w=document.getElementById('mvwx');if(w){const M=MS.M;const f=M.wxF&&M.wxF.k!==M.wx.k&&WX[M.wxF.k]?` · předpověď ${WX[M.wxF.k].ic}`:'';const t=wxText(M.wx)+f;if(w.textContent!==t){w.textContent=t;if(MS._wxk&&MS._wxk!==M.wx.k){w.classList.remove('wxchg');void w.offsetWidth;w.classList.add('wxchg');}}MS._wxk=M.wx.k;}}}catch(e){}try{if(MS&&MS.tab==='kom'){const b=document.getElementById('mvbody');const n=MS.M.ev.length,pv=MS._evn==null?n:MS._evn;MS._evn=n;const nw=Math.max(0,n-pv);if(b)Array.prototype.forEach.call(b.children,(c,i)=>{if(i>=nw)c.style.animation='none';});}}catch(e){}return r;};

/* v14: hra ve středu pole ve 2D, nastavení, trest pro trenéra, vývoj kurzů, zprávy před zápasem */
function m2Ks(M,st,s){const r=[];const gk=m2Gk(M,s);M.sides[s].xi.forEach((id,k)=>{if(id&&k!==gk)r.push(k);});return r;}
function m2Best(M,st,s,f){const ks=m2Ks(M,st,s);let b=ks[0],bv=-1e9;ks.forEach(k=>{const v=f(m2PlayerXY(st,s,k),k);if(v>bv){bv=v;b=k;}});return b;}
function m2FillKind(tx){tx=String(tx||'');
 if(/křídl|centr|zámezí/i.test(tx))return 'wing';if(/protiútok/i.test(tx))return 'counter';if(/dlouh[éý] mí|za obranu/i.test(tx))return 'long';
 if(/v obraně|ke gólmanovi|vracejí/i.test(tx))return 'back';if(/napad|presink/i.test(tx))return 'press';if(/přenáš|ze strany na stranu/i.test(tx))return 'switch';
 if(/odražený|souboj/i.test(tx))return 'duel';if(/stoper|ustál/i.test(tx))return 'stop';if(/kombinuj|výměn|držení|trpělivě|přelévá|drží míč/i.test(tx))return 'combo';return '';}
function m2Fill(M,st,e){if(e.t!=='fill'||e.s==null||e.ch||e.cer||e.gke||e.rd)return null;const k0=m2FillKind(e.tx);if(!k0)return null;
 const s=e.s,o=1-s,dir=s===0?1:-1,sc=m2Scale(),att=x=>s===0?x:1-x,steps=[];const fx=p=>s===0?p.x:1-p.x;
 const lbl=(tx,x,y)=>m2Ov(st,{tp:'lbl',tx,x,y,dur:1000});
 const to=(sd,k,d,arc)=>{const p=m2PlayerXY(st,sd,k);st.pend={s:sd,k};st.poss=sd;st.car=null;m2Kick(st,p.x,p.y,d*sc,arc);};
 const give=(sd,k)=>{st.poss=sd;st.pend=null;st.car={s:sd,k};};
 const start=()=>{if(st.poss!==s||!st.car||st.car.s!==s){give(s,m2Best(M,st,s,p=>-Math.abs(fx(p)-0.45)));}};
 steps.push({d:1,f:start});
 if(k0==='wing'){const top=Math.random()<.5;let w;steps.push({d:650,f:()=>{w=m2Best(M,st,s,p=>fx(p)+Math.abs(p.y-0.5)*1.4);st.force[s][w]={x:att(0.8),y:top?0.08:0.92};to(s,w,600);}});
  steps.push({d:900,f:()=>{st.force[s]={};st.car=null;st.pend=null;m2Kick(st,att(1.01),m2Rand(0.3,0.7),500*sc,1);lbl('Centr do zámezí',att(0.86),0.5);}});
  steps.push({d:700,f:()=>{give(o,m2Gk(M,o));}});}
 else if(k0==='counter'){let f;steps.push({d:500,f:()=>{f=m2Fwd(M,s);st.force[s][f]={x:att(0.74),y:m2Rand(0.35,0.65)};to(s,f,380);lbl('⚡ Protiútok',att(0.6),0.14);}});
  steps.push({d:700,f:()=>{st.force[s]={};const d=m2Best(M,st,o,p=>-Math.hypot(p.x-st.ball.x,p.y-st.ball.y));to(o,d,300);}});}
 else if(k0==='long'){steps.push({d:900,f:()=>{st.car=null;st.pend=null;m2Kick(st,att(0.93),m2Rand(0.2,0.8),700*sc,1);lbl('Dlouhý míč',att(0.7),0.12);}});
  steps.push({d:600,f:()=>{give(o,m2Gk(M,o));}});}
 else if(k0==='back'){steps.push({d:600,f:()=>{to(s,m2Best(M,st,s,p=>-fx(p)),450);}});steps.push({d:700,f:()=>{to(s,m2Gk(M,s),450);lbl('↩️ Zpět na gólmana',att(0.18),0.14);}});steps.push({d:400,f:()=>{}});}
 else if(k0==='press'){steps.push({d:1,f:()=>{if(st.poss===s)give(o,m2Best(M,st,o,p=>(o===0?-p.x:p.x)));}});
  steps.push({d:1300,f:()=>{const b=st.ball;m2Ks(M,st,s).map(k=>[Math.hypot(m2PlayerXY(st,s,k).x-b.x,m2PlayerXY(st,s,k).y-b.y),k]).sort((a,c)=>a[0]-c[0]).slice(0,3).forEach(([d,k],j)=>{st.force[s][k]={x:b.x-dir*0.03*(j+1)*-1,y:b.y+(j-1)*0.06};});lbl('🔥 Presink',b.x,Math.max(0.12,b.y-0.12));}});
  steps.push({d:1,f:()=>{st.force[s]={};}});}
 else if(k0==='switch'){steps.push({d:900,f:()=>{const y0=st.ball.y;const k=m2Best(M,st,s,p=>Math.abs(p.y-y0)-Math.abs(fx(p)-0.55));to(s,k,650,1);lbl('↔️ Přenesení hry',0.5,0.12);}});}
 else if(k0==='duel'){steps.push({d:900,f:()=>{const b=st.ball;const d=m2Best(M,st,o,p=>-Math.hypot(p.x-b.x,p.y-b.y));st.force[o][d]={x:b.x+dir*0.02,y:b.y};lbl('⚔️ Souboj',b.x,Math.max(0.12,b.y-0.12));}});steps.push({d:1,f:()=>{st.force[o]={};give(s,st.car&&st.car.s===s?st.car.k:m2Best(M,st,s,p=>-Math.abs(fx(p)-0.5)));}});}
 else if(k0==='stop'){steps.push({d:700,f:()=>{const f=m2Fwd(M,s);to(s,f,500);}});steps.push({d:600,f:()=>{const b=st.ball;const d=m2Best(M,st,o,p=>-Math.hypot(p.x-b.x,p.y-b.y));to(o,d,250);lbl('🛑 Odebráno',b.x,Math.max(0.12,b.y-0.12));}});}
 else{const mids=()=>m2Ks(M,st,s).filter(k=>{const x=fx(m2PlayerXY(st,s,k));return x>0.3&&x<0.72;});for(let i=0;i<3;i++)steps.push({d:520,f:()=>{const ms=mids();const cur=st.car&&st.car.k;const c=ms.filter(k=>k!==cur);if(c.length)to(s,c[Math.floor(Math.random()*c.length)],380);if(i===0)lbl('🔁 Kombinace',0.5,0.12);}});}
 return steps;}
try{const _m2s14=m2Script;m2Script=function(M,st,e){try{const r=m2Fill(M,st,e);if(r)return r;}catch(err){}return _m2s14(M,st,e);};}catch(e){}
/* realističtější nastavení podle toho, co se v poločase stalo */
function v14AddCalc(M,h){const lo=h===0?0:45,hi=h===0?46:91;let g=0,sb=0,inj=0,va=0,cd=0,pn=0;(M.ev||[]).forEach(e=>{if(e.m<lo||e.m>=hi)return;if(e.t==='goal')g++;else if(e.t==='sub')sb++;else if(e.t==='inj')inj++;else if(e.t==='var')va++;else if(e.t==='yel'||e.t==='red')cd++;else if(e.t==='pen')pn++;});
 const base=h===0?0.8+0.35*g+0.7*inj+0.9*va+0.15*cd+0.4*pn+Math.random()*1.2:1.6+0.35*g+0.25*Math.min(sb,5)+0.7*inj+0.9*va+0.15*cd+0.4*pn+Math.random()*1.4;
 return Math.max(h===0?1:2,Math.min(h===0?5:8,Math.round(base)));}
try{const _sm14=stepMinute;stepMinute=function(M){if(M&&!M.ended){if(!M._a0)M._a0=[(M.added||[])[0]||1,(M.added||[])[1]||3];
  const h=M.half===1&&M.min===44?0:M.half===2&&M.min===89?1:-1;
  if(h>=0&&!(M._a14||[])[h]){M._a14=M._a14||[];M._a14[h]=1;const inc=Math.max(0,(M.added[h]||0)-M._a0[h]);M.added[h]=Math.min(15,v14AddCalc(M,h)+inc);
   const out=_sm14(M);if(!M.ended&&M.min===(h===0?45:90)){const ev={m:M.min,t:'fill',add14:M.added[h],tx:`⏱️ Čtvrtý rozhodčí ukazuje nastavení: +${M.added[h]} ${czPlural(M.added[h],'minuta','minuty','minut')}.`};out.push(ev);if(M.ev.indexOf(ev)<0)M.ev.push(ev);}return out;}}
 return _sm14(M);};}catch(e){}
try{const _m2s14b=m2Script;m2Script=function(M,st,e){if(e&&e.add14)return [{d:1100,f:()=>{m2Ov(st,{tp:'lbl',tx:'⏱️ +'+e.add14,x:0.5,y:0.9,dur:1400});}}];return _m2s14b(M,st,e);};}catch(e){}
/* zprávy z kabin před zápasem */
function v14Hash(s){let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h;}
function v14News(F){const opp=F.h===S.clubId?F.a:F.h;const oc=S.clubs[opp]||{};const pl=c=>(typeof clubPlayers==='function'?clubPlayers(c):[]);
 const miss=c=>pl(c).filter(p=>p&&(p.inj>0||p.sus>0)).sort((a,b)=>b.ovr-a.ovr).slice(0,3);
 const ln=p=>`${esc(p.n)} <span class="mut">(${p.sus>0?'trest':'zranění'+(p.inj>0?', ještě '+p.inj+' '+czPlural(p.inj,'týden','týdny','týdnů'):'')})</span>`;
 const mo=miss(opp),mm=miss(S.clubId);const rows=[];
 rows.push(mo.length?`<div class="small" style="padding:2px 0">❌ Soupeři chybí: ${mo.map(ln).join(', ')}</div>`:`<div class="small" style="padding:2px 0">✅ Soupeř má k dispozici kompletní kádr.</div>`);
 if(mm.length)rows.push(`<div class="small" style="padding:2px 0">🩹 Nám chybí: ${mm.map(ln).join(', ')}</div>`);
 const top=pl(opp).filter(available).sort((a,b)=>b.ovr-a.ovr);const r=v14Hash(F.h+'|'+F.a+'|'+(S.week||0)+'|'+(S.season||0));
 if(top.length>=4){const p=top[r%4],q=top[(r>>>3)%top.length];const T=[`${p.n} podle místních médií v týdnu trénoval jen individuálně, nakonec by ale měl nastoupit.`,`Trenér soupeře na tiskovce chválil formu hráče ${q.n}.`,`${p.n} se vrací do sestavy po odpočinku v minulém kole.`,`Soupeř v týdnu trénoval hlavně standardní situace.`,`Na tréninku soupeře byl vidět i ${q.n}, který se dával dohromady po drobném zranění.`,`Domácí média čekají, že soupeř začne opatrněji a bude hrát na brejky.`];rows.push(`<div class="small mut" style="padding:2px 0">🗞️ ${esc(T[(r>>>6)%T.length])}</div>`);}
 return `<div class="card" style="padding:10px 12px"><h3>Zprávy z kabin</h3>${rows.join('')}${typeof v14OwnHtml==='function'?v14OwnHtml(F):''}</div>`;}
try{const _pre14=v4PreHtml;v4PreHtml=function(F){let a='';try{a=v14News(F);}catch(e){}return a+_pre14(F);};}catch(e){}

/* v14.1: vývoj kurzů 1/X/2 (před zápasem i live), chybné kurzy vyznačené; uložení výsledků pro otevřené sázky */
function v14O(){if(!S.v14o||typeof S.v14o!=='object')S.v14o={};return S.v14o;}
function v14R2(x){return Math.round(x*100)/100;}
function v14Drift(o,d,dx){if(!d&&!dx)return o;const r=Object.assign({},o);const rd=x=>typeof roundOdd==='function'?roundOdd(x):v14R2(x);r['1']=rd(Math.max(1.02,o['1']*(1+(d||0))));r['2']=rd(Math.max(1.02,o['2']*(1-(d||0))));if(dx)r['X']=rd(Math.max(1.02,o['X']*(1+dx)));return r;}
(function(){const _mo=matchOdds;matchOdds=function(h,a,seed){const o=_mo.apply(this,arguments);try{if(seed&&S&&S.v14o){const R=S.v14o[seed];if(R&&(R.d||R.dx))return v14Drift(o,R.d,R.dx);}}catch(e){}return o;};})();
function v14Err(mid){try{return typeof v13Find==='function'?v13Find(mid):null;}catch(e){return null;}}
/* v14.3: pohyb kurzů během týdne */
const V14_PH=['Otevření','Středa','Pátek','1 h před výkopem','Sestavy'];
function v14M(){const k=S.season+'|'+(S.round||0);if(!S.v14m||S.v14m.k!==k)S.v14m={k,ph:0,lt:Date.now()};return S.v14m;}
function v14Adv(to){const T=v14M();const n=to==null?Math.min(3,T.ph+1):Math.max(T.ph,Math.min(4,to));if(n!==T.ph){T.ph=n;T.lt=Date.now();}return T.ph;}
function v14G(){return (Math.random()+Math.random()+Math.random()-1.5)*2;}
function v14Key(c){try{return clubPlayers(c).filter(p=>p&&(p.inj>0||p.sus>0)).sort((a,b)=>b.ovr-a.ovr).find(p=>p.ovr>=clubPlayers(c).map(x=>x.ovr).sort((a,b)=>b-a)[4])||null;}catch(e){return null;}}
function v14Base(m){return (typeof __v13mo==='function'?__v13mo:matchOdds)(m.h,m.a,m.mid);}
function v14Tri(o){return [o['1'],o['X'],o['2']];}
function v14Cn(id){const c=CL(id);return c?c.n:'';}
function v14New(m){let d0=v14G()*0.03;const ih=v14Key(m.h),ia=v14Key(m.a);let adj=0;if(ih)adj-=0.04;if(ia)adj+=0.04;d0+=adj;let st=0;if(Math.random()<0.07){st=1+Math.floor(Math.random()*3);d0+=(Math.random()<.5?-1:1)*(0.15+Math.random()*0.07);}
 d0=Math.max(-0.3,Math.min(0.3,d0));const R={v:3,d:d0,dx:0,adj,st,ih:ih?ih.n:'',ia:ia?ia.n:'',ph:0,t:Date.now(),h:[]};R.h.push({w:V14_PH[0],l:'Kurzy vypsány',o:v14Tri(v14Drift(v14Base(m),R.d,0))});return R;}
function v14Step(R,m){const k=R.ph+1;const al=[0,0.3,0.35,0.4,0.6][k];let nd=R.d*(1-al)+v14G()*0.01,l='';const own=m.h===S.clubId||m.a===S.clubId;
 const who=x=>x<0?v14Cn(m.h):v14Cn(m.a);
 if(R.st===k){nd=R.d*0.12+v14G()*0.006;l='Velké sázky profesionálů na '+who(nd-R.d);}
 else if(k===1&&R.adj){nd=R.d-R.adj+v14G()*0.008;l='Potvrzeno: '+(R.ih&&R.ia?R.ih+' i '+R.ia:R.ih||R.ia)+' nenastoupí';}
 else if(k===2&&!R.dx){let w=null;try{w=matchWeather(m.h,{});}catch(e){}if(w&&(w.k==='rain'||w.k==='snow'||w.k==='wind')){R.dx=-0.03;l='Předpověď: '+WX[w.k].n.toLowerCase()+' – sází se na remízu';}}
 if(k===4&&!l){if(own){let miss=[];try{const xi=S.tac.xi||[];miss=clubPlayers(S.clubId).filter(available).sort((a,b)=>b.ovr-a.ovr).slice(0,11).filter(p=>!xi.includes(p.id));}catch(e){}
   const us=m.h===S.clubId?-1:1;if(miss.length>=2){nd=nd-us*0.025*Math.min(3,miss.length);l='Sestavy: '+myClub().n+' bez '+miss.slice(0,2).map(p=>p.n).join(' a ');}else{nd=nd+us*0.012;l='Sestavy: '+myClub().n+' v nejsilnější sestavě';}}
  else{nd=R.d*0.4+v14G()*0.012;l=Math.abs(nd-R.d)>0.02?'Sestavy: kurz reaguje na složení '+(nd>R.d?'domácích':'hostů'):'Sestavy bez překvapení';}}
 if(!l){const dd=nd-R.d;const Lh=['Peníze sázkařů na domácí','Tipaři věří domácím','Trenér domácích sebevědomě na tiskovce','Spekulace o oslabené sestavě hostů','Domácí podle zpráv čeká vyprodaný stadion'],La=['Peníze sázkařů na hosty','Tipaři věří hostům','Trenér hostů sebevědomě na tiskovce','Spekulace o oslabené sestavě domácích','Hosté v týdnu trénovali v plné síle'];
  l=Math.abs(dd)<0.005?['Klidný trh, kurz se drží','Bez zpráv, kurz se nehýbe','Sázky jsou vyrovnané'][Math.floor(Math.random()*3)]:(dd<0?Lh:La)[Math.floor(Math.random()*5)];}
 R.d=Math.max(-0.3,Math.min(0.3,nd));R.ph=k;R.h.push({w:V14_PH[k],l,o:v14Tri(v14Drift(v14Base(m),R.d,R.dx))});if(R.h.length>12)R.h.splice(1,R.h.length-12);}
function v14Track(m){const O=v14O();let R=O[m.mid];const cur=v14M().ph;
 if(!R)R=O[m.mid]=v14New(m);else if(R.v!==3){R.v=3;R.ph=cur;R.dx=0;}
 while(R.ph<cur)v14Step(R,m);
 const pe=v14Err(m.mid);const last=R.h[R.h.length-1];
 if(pe&&!(last&&last.e)){R.h.push({w:V14_PH[R.ph],l:`Chybný kurz (${pe.bk||'kancelář'})`,o:v14Tri(matchOdds(m.h,m.a,m.mid)),e:1});}
 else if(!pe&&last&&last.e){R.h.push({w:V14_PH[R.ph],l:'Kurz opraven',o:v14Tri(matchOdds(m.h,m.a,m.mid))});}
 return R;}
function v14Prune(){const O=v14O();const keep={};try{betGroups().forEach(g=>g.ms.forEach(m=>keep[m.mid]=1));(S.bets||[]).slice(0,40).forEach(b=>(b.legs||[]).forEach(l=>keep[l.mid]=1));}catch(e){}const ks=Object.keys(O).filter(k=>k!=='_lv');if(ks.length>70)ks.sort((a,b)=>(O[a].t||0)-(O[b].t||0)).slice(0,ks.length-70).forEach(k=>{if(!keep[k])delete O[k];});}
function v14Arr(mid,k){const R=S.v14o&&S.v14o[mid];if(!R||R.h.length<2)return '';const i={'1':0,'X':1,'2':2}[k];if(i==null)return '';const a=R.h[R.h.length-2].o[i],b=R.h[R.h.length-1].o[i];if(Math.abs(a-b)<0.01)return '';
 return b<a?'<i style="font-style:normal;color:#5fd38d;font-size:11px;margin-left:2px">▼</i>':'<i style="font-style:normal;color:#ff8a65;font-size:11px;margin-left:2px">▲</i>';}
function v14Spark(pts){if(!pts||pts.length<2)return '';const W=64,H=22;const f=pts[0].o;let mx=0.02;pts.forEach(p=>[0,2].forEach(k=>{mx=Math.max(mx,Math.abs(p.o[k]/f[k]-1));}));
 const y=(p,k)=>(H/2-(p.o[k]/f[k]-1)/mx*(H/2-2)).toFixed(1),x=i=>(1+i*(W-2)/(pts.length-1)).toFixed(1);
 return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="flex:none;vertical-align:middle"><line x1="0" x2="${W}" y1="${H/2}" y2="${H/2}" stroke="rgba(255,255,255,.15)"/><polyline fill="none" stroke="#ffd54a" stroke-width="1.6" points="${pts.map((p,i)=>x(i)+','+y(p,0)).join(' ')}"/><polyline fill="none" stroke="#64b5f6" stroke-width="1.6" points="${pts.map((p,i)=>x(i)+','+y(p,2)).join(' ')}"/></svg>`;}
 const y=x=>(H-2-(Math.log(x)-lo)/(hi-lo)*(H-4)).toFixed(1),x=i=>(1+i*(W-2)/(v.length-1)).toFixed(1);
function v14Pct(a,b){const p=Math.round((b/a-1)*100);return (p>0?'+':p<0?'−':'±')+Math.abs(p)+' %';}
function v14Line(R){if(!R||R.h.length<2)return '';const f=R.h[0].o,l=R.h[R.h.length-1].o;const c=(i,n)=>{const p=Math.round((l[i]/f[i]-1)*100);const col=p<0?'#5fd38d':p>0?'#ff8a65':'';return `<span${col?` style="color:${col}"`:''}>${n} ${v14Pct(f[i],l[i])}</span>`;};
 return `<div class="tiny mut" style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">${v14Spark(R.h)}<span>od otevření:</span>${c(0,'1')}${c(1,'X')}${c(2,'2')}</div>`;}
function v14HistBtn(mid){const R=S.v14o&&S.v14o[mid];if(!R||R.h.length<2)return '';const on=UI.v14h===mid;
 let h=v14Line(R)+`<button class="btn ghost sm w100" style="min-height:44px;margin-top:6px" onclick="UI.v14h=${on?'null':`'${mid}'`};render()">📈 Vývoj kurzu${R.h.some(x=>x.e)?' · ⚠️ chyba':''} ${on?'▲':'▼'}</button>`;
 if(on){h+=`<div class="v14h" style="margin-top:4px">${v14Rows(R.h)}<div class="tiny mut" style="margin-top:4px">▼ kurz klesá (sázky jdou na tenhle tip), ▲ kurz roste. Šipka u kurzu ukazuje změnu oproti předchozímu kroku.</div></div>`;}return h;}
function v14Rows(pts){let prev=null;return pts.map(p=>{const c=p.o.map((v,i)=>{const ar=prev?(v<prev.o[i]-0.01?'<span style="color:#5fd38d">▼</span>':v>prev.o[i]+0.01?'<span style="color:#ff8a65">▲</span>':''):'';return `<span style="display:inline-block;min-width:30%;text-align:right">${czOdd(v)}${ar}</span>`;}).join('');prev=p;
 return p.w?`<div class="tiny" style="padding:4px 0;border-top:1px solid rgba(255,255,255,.06)${p.e?';color:#ffb74d':''}"><div><b>${esc(p.w)}</b> · ${p.e?'⚠️ ':''}${esc(p.l)}</div><div style="display:flex;justify-content:space-between;margin-top:2px">${c}</div></div>`:`<div class="tiny" style="display:flex;gap:6px;padding:3px 0;border-top:1px solid rgba(255,255,255,.06)${p.e?';color:#ffb74d':''}"><span style="flex:0 0 46%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.m!=null?p.m+"' ":''}${p.e?'⚠️ ':''}${esc(p.l)}</span><span style="flex:1;display:flex;justify-content:space-between">${c}</span></div>`;}).join('');}
function v14Clock(){const T=v14M();const nx=V14_PH[T.ph+1];return `<div class="card" style="padding:8px 12px"><div class="row small" style="gap:8px"><span>🕒 Teď: <b>${V14_PH[T.ph]}</b></span><span class="sp"></span>${T.ph<3?`<button class="btn ghost sm" style="min-height:44px" onclick="v14Adv();saveGame();render()">⏩ ${nx}</button>`:''}</div><div class="tiny mut" style="margin-top:4px">${T.ph<3?'Kurzy se během týdne hýbou. Sázka zamkne kurz v okamžiku, kdy ji podáš.':T.ph===3?'Sestavy se zveřejní, až otevřeš svůj zápas.':'Sestavy jsou venku, tohle jsou zavírací kurzy.'}</div></div>`;}
function v14Clv(l){try{const R=S.v14o&&S.v14o[l.mid];const i={'1':0,'X':1,'2':2}[l.mk];if(!R||i==null||l.pe||!R.h.length)return '';const c=R.cl?R.cl[i]:R.h[R.h.length-1].o[i];if(!c)return '';
 if(R.cl)return l.o>c+0.005?` · <span class="good">✅ lepší než zavírací kurz ${czOdd(c)}</span>`:l.o<c-0.005?` · <span class="mut">zavírací kurz byl ${czOdd(c)}</span>`:'';
 return Math.abs(l.o-c)>=0.01?` · teď ${czOdd(c)}${c<l.o?' ▼':' ▲'}`:'';}catch(e){return '';}}
/* live */
function v14LvPt(M,l){try{const pr=lvProbs(M);const ks=['1','X','2'];const o=ks.map(k=>v14R2(lvOdd(pr[k])));const raw=ks.map(k=>v14R2(lvOdd0(pr[k])));const e=o.some((v,i)=>Math.abs(v-raw[i])>0.015);
 M.v14lh=M.v14lh||[];const p={m:typeof minLbl==='function'?minLbl(M):M.min,l:e?'Chybný live kurz':l,o};if(e)p.e=1;M.v14lh.push(p);if(M.v14lh.length>24)M.v14lh.splice(1,1);}catch(err){}}
try{const _sm141=stepMinute;stepMinute=function(M){const out=_sm141.apply(this,arguments);try{if(M&&(M.h.user||M.a.user)&&typeof lvProbs==='function'){
  if(!M.v14lh||!M.v14lh.length)v14LvPt(M,'Výkop');
  const nm=i=>{const c=CL(M.sides[i].cid);return c?c.n:'';};
  (out||[]).forEach(e=>{if(e.t==='goal')v14LvPt(M,`⚽ ${M.score[0]}:${M.score[1]} (${nm(e.s)})`);else if(e.t==='red')v14LvPt(M,`🟥 Červená (${nm(e.s)})`);});
  const L=M.v13live;const on=!!(L&&M.min<=L.until&&!M.ended);if(on&&!M._v14le){M._v14le=1;v14LvPt(M,'Chybný live kurz');}else if(!on&&M._v14le===1){M._v14le=2;v14LvPt(M,'Kurz opraven');}
  if(M.ended&&!M._v14sv){M._v14sv=1;v14LvPt(M,'Konec');const O=v14O();O._lv={t:CL(M.h.cid).n+' – '+CL(M.a.cid).n,h:M.v14lh.slice(-24)};}}}catch(e){}return out;};}catch(e){}
function v14Chart(pts){if(!pts||pts.length<2)return '';const W=300,H=86,n=pts.length,lo=Math.log(1),hi=Math.log(20);const y=v=>H-6-(Math.log(Math.min(20,Math.max(1,v)))-lo)/(hi-lo)*(H-12);const x=i=>8+i*(W-16)/(n-1);
 const cols=['#ffd54a','#b0bec5','#64b5f6'];let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block;margin-top:6px;background:rgba(255,255,255,.04);border-radius:10px">`;
 [1.5,3,10].forEach(v=>{s+=`<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(255,255,255,.08)"/><text x="${W-4}" y="${y(v)-2}" font-size="9" fill="rgba(255,255,255,.4)" text-anchor="end">${String(v).replace('.',',')}</text>`;});
 pts.forEach((p,i)=>{if(p.e)s+=`<rect x="${x(i)-5}" y="0" width="10" height="${H}" fill="rgba(255,152,0,.25)"/>`;});
 for(let k=0;k<3;k++)s+=`<polyline fill="none" stroke="${cols[k]}" stroke-width="2" points="${pts.map((p,i)=>x(i).toFixed(1)+','+y(p.o[k]).toFixed(1)).join(' ')}"/>`;
 return s+`</svg><div class="tiny" style="display:flex;gap:10px;margin-top:3px"><span style="color:${cols[0]}">━ 1</span><span style="color:${cols[1]}">━ X</span><span style="color:${cols[2]}">━ 2</span>${pts.some(p=>p.e)?'<span style="color:#ffb74d">▮ chybný kurz</span>':''}</div>`;}
function v14LvHtml(M){if(!M||!M.v14lh||M.v14lh.length<1)return '';const on=!!UI.v14lv;const pts=M.v14lh;
 return `<button class="btn ghost sm w100" style="min-height:44px;margin-top:8px" onclick="UI.v14lv=${on?0:1};updLive()">📈 Vývoj kurzu 1/X/2${pts.some(p=>p.e)?' · ⚠️':''} ${on?'▲':'▼'}</button>${on?v14Chart(pts)+'<div style="margin-top:4px">'+v14Rows(pts.slice(-8))+'</div>':''}`;}
function v14LastLv(){const L=S.v14o&&S.v14o._lv;if(!L||!L.h||L.h.length<2)return '';return `<div class="card"><h3>📈 Live kurzy posledního zápasu</h3><div class="small mut">${esc(L.t)}</div>${v14Chart(L.h)}<div style="margin-top:4px">${v14Rows(L.h.slice(-8))}</div></div>`;}
try{const _rb141=renderBets;renderBets=function(){try{if((UI.betTab||'offer')==='offer'){const T=v14M();if(UI.v14away&&T.ph<3&&Date.now()-T.lt>25000)v14Adv();UI.v14away=0;betGroups().forEach(g=>g.ms.forEach(m=>v14Track(m)));v14Prune();}}catch(e){}let h=_rb141.apply(this,arguments);try{if((UI.betTab||'offer')==='offer'){const i=h.indexOf('<div class="card"><h3>Zahraniční liga');if(i>=0)h=h.slice(0,i)+v14Clock()+h.slice(i);}}catch(e){}try{if(UI.betTab==='my')h+=v14LastLv();}catch(e){}return h;};}catch(e){}
/* výsledky zahraničních zápasů pro otevřené sázky přežijí i znovunačtení */
try{const _sg141=saveGame;saveGame=function(){try{if(S&&S.bets&&typeof BETRES!=='undefined'){const keep={};S.bets.forEach(b=>{if(b.st==='open')(b.legs||[]).forEach(l=>{if(l.st!=='won'&&l.st!=='lost'&&BETRES[l.mid])keep[l.mid]=BETRES[l.mid];});});if(Object.keys(keep).length)S.v14r=keep;else delete S.v14r;}}catch(e){}return _sg141.apply(this,arguments);};}catch(e){}
try{const _st141=settleBets;settleBets=function(){try{if(S&&S.v14r&&typeof BETRES!=='undefined'){for(const k in S.v14r)if(!BETRES[k])BETRES[k]=S.v14r[k];delete S.v14r;}}catch(e){}return _st141.apply(this,arguments);};}catch(e){}

try{const _go143=go;go=function(t){if(t!=='bets')UI.v14away=1;return _go143.apply(this,arguments);};}catch(e){}
try{const _pm143=preMatch;preMatch=function(){try{v14Adv(4);const F=nextMatch();const mf=myFixture();if(F&&mf&&mf[0]===F.h&&mf[1]===F.a){const L=myClub().lg;const r=lgDue(L);if(r>=0)v14Track({mid:'L|'+L+'|'+r+'|'+F.h+'|'+F.a,h:F.h,a:F.a});}}catch(e){}return _pm143.apply(this,arguments);};}catch(e){}
try{const _st143=settleBets;settleBets=function(){try{(S.bets||[]).forEach(b=>{if(b.st==='open')(b.legs||[]).forEach(l=>{const R=S.v14o&&S.v14o[l.mid];if(R&&!R.cl&&typeof BETRES!=='undefined'&&BETRES[l.mid]){const c=R.h.filter(x=>!x.e);if(c.length)R.cl=c[c.length-1].o.slice();}});});}catch(e){}return _st143.apply(this,arguments);};}catch(e){}
function v14OwnHtml(F){try{const mf=myFixture();if(!mf||mf[0]!==F.h||mf[1]!==F.a)return '';const L=myClub().lg;const r=lgDue(L);if(r<0)return '';const R=v14Track({mid:'L|'+L+'|'+r+'|'+F.h+'|'+F.a,h:F.h,a:F.a});const o=R.h[R.h.length-1];
 return `<div class="small" style="padding:4px 0 0">🎲 Kurz na zápas: 1 <b>${czOdd(o.o[0])}</b> · X <b>${czOdd(o.o[1])}</b> · 2 <b>${czOdd(o.o[2])}</b></div>${v14Line(R)}<div class="tiny mut">${esc(o.w||'')} · ${esc(o.l)}</div>${typeof v14OwnBtn==='function'?v14OwnBtn():''}`;}catch(e){return '';}}

/* v14.3: všechny druhy sázek před zápasem */
const V14_GK=0.82,V14_Z0=0.87;
const V14_CS=[[1,0],[2,0],[2,1],[3,0],[3,1],[0,0],[1,1],[2,2],[0,1],[0,2],[1,2],[0,3],[1,3]];
Object.assign(MK_LBL,{'1X':'neprohra domácích (1X)','12':'nebude remíza (12)','X2':'neprohra hostů (X2)',o15:'více než 1,5 gólu',u15:'méně než 1,5 gólu',o35:'více než 3,5 gólu',u35:'méně než 3,5 gólu',
 hm15:'domácí s handicapem −1,5',ap15:'hosté s handicapem +1,5',am15:'hosté s handicapem −1,5',hp15:'domácí s handicapem +1,5',ht1:'poločas: vedou domácí',htX:'poločas: remíza',ht2:'poločas: vedou hosté',
 co95:'více než 9,5 rohu',cu95:'méně než 9,5 rohu',ko35:'více než 3,5 karty',ku35:'méně než 3,5 karty'});
Object.assign(MK_SHORT,{'1X':'1X','12':'12','X2':'X2',o15:'+1,5',u15:'−1,5',o35:'+3,5',u35:'−3,5',hm15:'1 −1,5',ap15:'2 +1,5',am15:'2 −1,5',hp15:'1 +1,5',ht1:'1',htX:'X',ht2:'2',co95:'Rohy +9,5',cu95:'Rohy −9,5',ko35:'Karty +3,5',ku35:'Karty −3,5'});
V14_CS.forEach(([i,j])=>{MK_LBL['cs_'+i+'_'+j]='přesný výsledek '+i+':'+j;MK_SHORT['cs_'+i+'_'+j]=i+':'+j;});
function v14Pf(l,k){let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f;}
function v14Mat(xh,xa,di){if(di==null)di=1.08;const m=[];let t=0;for(let i=0;i<9;i++){m[i]=[];for(let j=0;j<9;j++){let p=v14Pf(xh,i)*v14Pf(xa,j);if(i===j)p*=di;if(!i&&!j)p*=V14_Z0;m[i][j]=p;t+=p;}}for(let i=0;i<9;i++)for(let j=0;j<9;j++)m[i][j]/=t;return m;}
function v14Sum(m,f){let s=0;for(let i=0;i<9;i++)for(let j=0;j<9;j++)if(f(i,j))s+=m[i][j];return s;}
function v14PoisGt(mu,n){let c=0;for(let k=0;k<=n;k++)c+=v14Pf(mu,k);return 1-c;}
function v14Shooters(cid){try{const w={ST:1,CF:1,FW:1,LW:0.55,RW:0.55,AM:0.5,CAM:0.5,LM:0.3,RM:0.3,CM:0.18,DM:0.08,CDM:0.08,LB:0.06,RB:0.06,LWB:0.07,RWB:0.07,CB:0.07,GK:0};
 const ps=clubPlayers(cid).filter(available).sort((a,b)=>b.ovr-a.ovr).slice(0,14);const sc=ps.map(p=>({p,w:(w[p.pos]!=null?w[p.pos]:0.2)*Math.pow(1.06,p.ovr-70)}));const T=sc.reduce((a,b)=>a+b.w,0)||1;return sc.map(x=>({p:x.p,s:x.w/T})).sort((a,b)=>b.s-a.s);}catch(e){return [];}}
const V14_MC={};
function v14Ext(h,a,mid,td){const key=S.season+'|'+(S.round||0)+'|'+(td==null?'':td.toFixed(3));const C=V14_MC[mid];if(C&&C.k===key)return C.o;
 let [xh,xa]=xgPair(strOf(h),strOf(a));xh*=V14_GK;xa*=V14_GK;
 if(td!=null&&isFinite(td)){const T=xh+xa;let lo=0.05,hi=0.95;for(let it=0;it<22;it++){const sh=(lo+hi)/2;const m=v14Mat(T*sh,T*(1-sh));const d=v14Sum(m,(i,j)=>i>j)-v14Sum(m,(i,j)=>i<j);if(d<td)lo=sh;else hi=sh;}const sh=(lo+hi)/2;xh=T*sh;xa=T*(1-sh);}const M=v14Mat(xh,xa),H=v14Mat(xh*0.47,xa*0.47,1.05);const o={};const od=(p,mg)=>roundOdd(1/(Math.max(0.005,p)*mg));
 const p1=v14Sum(M,(i,j)=>i>j),pX=v14Sum(M,(i,j)=>i===j),p2=1-p1-pX;o['1X']=od(p1+pX,1.05);o['12']=od(p1+p2,1.05);o['X2']=od(pX+p2,1.05);
 [[1,'15'],[2,'25'],[3,'35']].forEach(([n,s])=>{const pu=v14Sum(M,(i,j)=>i+j<=n);o['o'+s]=od(1-pu,1.06);o['u'+s]=od(pu,1.06);});
 const hm=v14Sum(M,(i,j)=>i-j>=2),am=v14Sum(M,(i,j)=>j-i>=2);o.hm15=od(hm,1.06);{const gg=v14Sum(M,(i,j)=>i>0&&j>0);o.gg=od(gg,1.06);o.ng=od(1-gg,1.06);}o.ap15=od(1-hm,1.06);o.am15=od(am,1.06);o.hp15=od(1-am,1.06);
 o.ht1=od(v14Sum(H,(i,j)=>i>j),1.07);o.htX=od(v14Sum(H,(i,j)=>i===j),1.07);o.ht2=od(v14Sum(H,(i,j)=>i<j),1.07);
 V14_CS.forEach(([i,j])=>{o['cs_'+i+'_'+j]=od(M[i][j],1.18);});
 const cm=9.8,km=3.9;o.co95=od(v14PoisGt(cm,9),1.06);o.cu95=od(1-v14PoisGt(cm,9),1.06);o.ko35=od(v14PoisGt(km,3),1.06);o.ku35=od(1-v14PoisGt(km,3),1.06);
 if(/^L\|/.test(mid)){[[h,xh],[a,xa]].forEach(([c,x])=>{v14Shooters(c).slice(0,3).forEach(({p,s})=>{const k='sc_'+p.id;o[k]=od(1-Math.exp(-x*s*0.93),1.22);MK_LBL[k]='gól dá: '+p.n;MK_SHORT[k]=String(p.n).split(' ').slice(-1)[0];});});}
 V14_CS.forEach(()=>{});V14_MC[mid]={k:key,o};return o;}
(function(){const _mo=matchOdds;matchOdds=function(h,a,seed){const o=_mo.apply(this,arguments);try{if(seed&&/^[LW]\|/.test(seed)&&S&&S.clubs){let td=null;try{const i1=1/o['1'],i2=1/o['2'],ix=1/o['X'];const sm=i1+i2+ix;if(isFinite(sm)&&sm>0)td=(i1-i2)/sm;}catch(x){}const e=v14Ext(h,a,seed,td);const r=Object.assign({},e,o);['o25','u25','gg','ng'].forEach(k=>{if(e[k])r[k]=e[k];});return r;}}catch(e){}return o;};})();
/* vyhodnocení */
function v14Rnd(s){return typeof mulberry==='function'?mulberry(hashStr(s)):Math.random;}
function v14Pois(r,mu){const L=Math.exp(-mu);let k=0,p=1;do{k++;p*=r();}while(p>L&&k<40);return k-1;}
function v14HT(mid,r){if(r&&r.ht)return r.ht;const m=parseMid(mid);if(r.ev&&r.ev.length===r.gh+r.ga&&r.ev.every(e=>e.m!=null)){let a=0,b=0;r.ev.forEach(e=>{if(e.m<=45){if(e.c===m.a)b++;else a++;}});return [a,b];}
 const R=v14Rnd(mid+'|ht');let a=0,b=0;for(let i=0;i<r.gh;i++)if(R()<0.44)a++;for(let i=0;i<r.ga;i++)if(R()<0.44)b++;return [a,b];}
function v14Stat(mid){const B=typeof BETRES!=='undefined'&&BETRES[mid];if(B&&B.st)return B.st;const R=v14Rnd(mid+'|st');return {c:v14Pois(R,9.8),k:v14Pois(R,3.9)};}
try{const _lr143=legResult;legResult=function(l,r){const k=l.mk,t=r.gh+r.ga;
 switch(k){case '1X':return r.gh>=r.ga;case '12':return r.gh!==r.ga;case 'X2':return r.gh<=r.ga;case 'o15':return t>1;case 'u15':return t<2;case 'o35':return t>3;case 'u35':return t<4;
  case 'hm15':return r.gh-r.ga>=2;case 'ap15':return r.gh-r.ga<2;case 'am15':return r.ga-r.gh>=2;case 'hp15':return r.ga-r.gh<2;
  case 'ht1':case 'htX':case 'ht2':{const [x,y]=v14HT(l.mid,r);return k==='ht1'?x>y:k==='htX'?x===y:x<y;}
  case 'co95':return v14Stat(l.mid).c>9;case 'cu95':return v14Stat(l.mid).c<10;case 'ko35':return v14Stat(l.mid).k>3;case 'ku35':return v14Stat(l.mid).k<4;}
 if(/^cs_/.test(k)){const q=k.split('_');return r.gh===+q[1]&&r.ga===+q[2];}
 if(/^sc_/.test(k)){const pid=k.slice(3);return (r.ev||[]).some(e=>!e.og&&String(e.p)===pid);}
 return _lr143.apply(this,arguments);};}catch(e){}
try{const _st143b=settleBets;settleBets=function(){try{(S.bets||[]).forEach(b=>{if(b.st!=='open')return;(b.legs||[]).forEach(l=>{if(l.st!=='open')return;const r=typeof BETRES!=='undefined'&&BETRES[l.mid];if(!r||r.ab)return;
   if(/^sc_/.test(l.mk)&&!r.ev){l.st='void';l.res='bez údajů o střelcích';return;}
   if(/^ht/.test(l.mk)){const [x,y]=v14HT(l.mid,r);l.xr=' (poločas '+x+':'+y+')';}else if(/^c[ou]95/.test(l.mk))l.xr=' · rohy '+v14Stat(l.mid).c;else if(/^k[ou]35/.test(l.mk))l.xr=' · karty '+v14Stat(l.mid).k;});});}catch(e){}
 const res=_st143b.apply(this,arguments);try{(S.bets||[]).forEach(b=>(b.legs||[]).forEach(l=>{if(l.xr&&l.st!=='open'){l.res=(l.res||'')+l.xr;}if(l.st!=='open')delete l.xr;}));}catch(e){}return res;};}catch(e){}
/* popisky střelců po načtení hry */
function v14Lbl(){const fix=x=>{if(x&&/^sc_/.test(x.mk)&&!MK_LBL[x.mk]){const p=P(x.mk.slice(3));MK_LBL[x.mk]='gól dá: '+(p?p.n:'hráč');MK_SHORT[x.mk]=p?String(p.n).split(' ').slice(-1)[0]:'hráč';}};(S.slip||[]).forEach(fix);(S.bets||[]).forEach(b=>(b.legs||[]).forEach(fix));}
try{const _rb143=renderBets;renderBets=function(){try{v14Lbl();}catch(e){}return _rb143.apply(this,arguments);};}catch(e){}
/* nabídka */
function v14MktHtml(m,b,o){UI.v14g=UI.v14g||{};const fav=(o['1']||9)<=(o['2']||9);const sc=Object.keys(o).filter(k=>/^sc_/.test(k));
 const G=[['g','Góly',['o15','u15','o25','u25','o35','u35']],['bt','Oba dají',['gg','ng']],['dc','Dvojitá',['1X','12','X2']],['hc','Handicap',fav?['hm15','ap15']:['am15','hp15']],['ht','Poločas',['ht1','htX','ht2']],['cs','Výsledek',V14_CS.map(([i,j])=>'cs_'+i+'_'+j)],['sc','Střelci',sc],['rk','Rohy, karty',['co95','cu95','ko35','ku35']]].filter(g=>g[2].length&&g[2].every(k=>o[k]));
 const cur=G.find(g=>g[0]===UI.v14g[m.mid])||G[0];if(!cur)return '';
 const n=cur[2].length;const cols=n===2||n===4?2:3;
 return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px">${G.map(g=>`<button class="chip" style="min-height:44px;padding:6px 2px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis${g===cur?';background:rgba(255,211,77,.22);border-color:var(--acc2)':''}" onclick="UI.v14g['${m.mid}']='${g[0]}';render()">${g[1]}</button>`).join('')}</div>
 <div class="odds" style="margin-top:6px;grid-template-columns:repeat(${cols},1fr)">${cur[2].map(k=>b(k)).join('')}</div>${cur[0]==='rk'?'<div class="tiny mut" style="margin-top:4px">Rohy a karty za celý zápas (žluté i červené).</div>':cur[0]==='sc'?'<div class="tiny mut" style="margin-top:4px">Horní řada domácí, dolní hosté. Gól kdykoli během zápasu, vlastní góly se nepočítají.</div>':''}`;}
/* sázky na vlastní zápas: všechny trhy i v nabídce */
function v14OwnMid(){try{const f=myFixture();if(!f)return null;const L=myClub().lg;const r=lgDue(L);if(r<0)return null;return {mid:'L|'+L+'|'+r+'|'+f[0]+'|'+f[1],h:f[0],a:f[1],r};}catch(e){return null;}}
function v14OwnGroup(){const m=v14OwnMid();if(!m)return [];return [{code:'own',own:1,name:'⭐ Tvůj zápas · '+(m.r+1)+'. kolo',ms:[{mid:m.mid,h:m.h,a:m.a}]}];}
function v14Against(mid,mk){const m=parseMid(mid);const u=m.h===S.clubId?0:m.a===S.clubId?1:-1;if(u<0)return false;return (u===0?['2','X2','am15','ht2']:['1','1X','hm15','ht1']).includes(mk);}
(function(){const _pb=placeBet;placeBet=function(stake,mode){const ag=(S.slip||[]).filter(x=>v14Against(x.mid,x.mk));const n0=(S.bets||[]).length;const r=_pb.apply(this,arguments);
 try{if((S.bets||[]).length>n0&&ag.length&&typeof fixS==='function'){const f=fixS();f.heat+=0.4*ag.length;if(RNG()<0.1){const m=parseMid(ag[0].mid);f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(3,5),st:0,sev:1,opp:CL(m.h===S.clubId?m.a:m.h).n,sc:'?',bet:Math.round(+stake||0)});}
  addNews('👀','Sázka proti vlastnímu týmu. Disciplinární komise si takových sázek všímá.');}}catch(e){}return r;};})();
function v14OwnBtn(){const m=v14OwnMid();if(!m)return '';return `<button class="btn ghost w100" style="min-height:44px;margin-top:6px" onclick="closeModal();UI.betTab='offer';UI.betOpen='${m.mid}';go('bets')">🎲 Všechny sázky na tvůj zápas</button>`;}

// ===== v14.3 všechny živé trhy =====
(function(){for(let a=0;a<=9;a++)for(let b=0;b<=9;b++){LV_MK['cs_'+a+'_'+b]='Konečný výsledek '+a+':'+b;LV_SH['cs_'+a+'_'+b]=a+':'+b;}
 for(let k=0;k<=8;k++){if(!LV_MK['o'+k+'5']){LV_MK['o'+k+'5']='Víc než '+k+',5 gólu';LV_MK['u'+k+'5']='Míň než '+k+',5 gólu';LV_SH['o'+k+'5']='Víc '+k+',5';LV_SH['u'+k+'5']='Míň '+k+',5';}}
 Object.assign(LV_MK,{'1X':'Domácí nebo remíza','12':'Domácí nebo hosté','X2':'Remíza nebo hosté',hm15:'Domácí −1,5 (vyhrají o 2+)',ap15:'Hosté +1,5',am15:'Hosté −1,5 (vyhrají o 2+)',hp15:'Domácí +1,5',lht1:'Poločas: domácí',lhtX:'Poločas: remíza',lht2:'Poločas: hosté',lco:'Rohy celkem: víc',lcu:'Rohy celkem: míň',lko:'Karty celkem: víc',lku:'Karty celkem: míň',lw_y:'Gól v úseku: ano',lw_n:'Gól v úseku: ne'});
 Object.assign(LV_SH,{'1X':'1X','12':'12','X2':'X2',hm15:'Domácí −1,5',ap15:'Hosté +1,5',am15:'Hosté −1,5',hp15:'Domácí +1,5',lht1:'Domácí',lhtX:'Remíza',lht2:'Hosté',lw_y:'Ano',lw_n:'Ne'});})();
const V14L_COR=9.3,V14L_CRD=3.85,V14L_FM=96.5,V14L_PW={ST:1,CF:1,FW:1,LW:0.55,RW:0.55,AM:0.5,CAM:0.5,LM:0.3,RM:0.3,CM:0.18,DM:0.08,CDM:0.08,LB:0.06,RB:0.06,LWB:0.07,RWB:0.07,CB:0.07,GK:0};
function v14LvH1(M){if(M.ended||M.half!==1)return 0;return M.min<45?45-M.min+2.5:Math.max(0.5,45+((M.added&&M.added[0])||2)-M.min);}
function v14LvRem(M){if(M.ended)return 0;const ad=M.added||[];if(M.half===1)return v14LvH1(M)+45+4.5;if(M.half===2){const r=M.min<90?90-M.min+4.5:Math.max(0.5,90+(ad[1]||4)-M.min);return r+(M.ko&&M.ko.decide&&M.score[0]+(M.ko.agg?M.ko.agg[0]:0)===M.score[1]+(M.ko.agg?M.ko.agg[1]:0)?31:0);}
 if(M.half===3)return (M.min<105?105-M.min+1:Math.max(0.5,105+(ad[2]||1)-M.min))+16;return M.min<120?120-M.min+2:Math.max(0.5,120+(ad[3]||2)-M.min);}
function v14LvWin(M){if(M.ended||M.et||M.half>2)return null;const c=M.half===1?[15,30,45]:[60,75,90];for(const w of c){if(w-M.min>=8||(w%45===0&&w-M.min>=3))return w;}return null;}
function v14LvLines(M){const rf=v14LvRem(M)/V14L_FM;const c=M.stats[0].cor+M.stats[1].cor,k=M.stats[0].yc+M.stats[1].yc+M.stats[0].rc+M.stats[1].rc;
 const best=(cur,mu)=>{let b=null,bd=9;for(let d=-1;d<=1;d++){const L=Math.max(cur,Math.floor(cur+mu)+d)+0.5;const po=v14Pc(mu,Math.floor(L)+1-cur);const dd=Math.abs(po-0.5);if(dd<bd){bd=dd;b=L;}}return b;};
 return {c:best(c,V14L_COR*rf),k:best(k,V14L_CRD*rf),w:v14LvWin(M)};}
function v14Pc(l,n){let s=0,t=Math.exp(-l);for(let i=0;i<n;i++){s+=t;t*=l/(i+1);}return 1-s;} // P(X>=n)
function v14HtSc(M){const i=M.ev.findIndex(e=>e.t==='ht');if(i<0)return null;let a=0,b=0;for(let j=0;j<i;j++){const e=M.ev[j];if(e.t==='goal'){if(e.s===0)a++;else b++;}}return [a,b];}
function v14LvShooters(M,i){const sd=M.sides[i];return onPitch(sd).map(id=>{const p=P(id);if(!p)return null;return {p,w:(V14L_PW[sd.slots[sd.xi.indexOf(id)]]!=null?V14L_PW[sd.slots[sd.xi.indexOf(id)]]:(V14L_PW[p.pos]!=null?V14L_PW[p.pos]:0.2))*Math.pow(1.06,(p.ovr||70)-70)};}).filter(x=>x&&x.w>0);}
function v14LvX(M,ln){ln=ln||v14LvLines(M);const r={};const remM=v14LvRem(M);const k=typeof v12XgK==='function'?v12XgK(M):1;const xh=lvRate(M,0)*k,xa=lvRate(M,1)*k;
 const pf=(l,n)=>{let f=1;for(let i=2;i<=n;i++)f*=i;return Math.exp(-l)*Math.pow(l,n)/f;};const MX=[[0.7,0.25],[1,0.5],[1.35,0.25]];const ph=[],pa=[];
 for(let i=0;i<10;i++){ph[i]=0;pa[i]=0;for(const [f,w] of MX){ph[i]+=w*pf(xh*f,i);pa[i]+=w*pf(xa*f,i);}}
 const s=M.score;let t=0;const add=(key,p)=>{r[key]=(r[key]||0)+p;};
 for(let i=0;i<10;i++)for(let j=0;j<10;j++){const p=ph[i]*pa[j];t+=p;const a=s[0]+i,b=s[1]+j,n=a+b,d=a-b;if(a<=9&&b<=9)add('cs_'+a+'_'+b,p);
  for(let q=0;q<=8;q++)add((n>q?'o':'u')+q+'5',p);add(d>=0?'1X':'X2',p);if(d!==0)add('12',p);add(d>=2?'hm15':'ap15',p);add(d<=-2?'am15':'hp15',p);}
 for(const key in r)r[key]/=t||1;['1X','12','X2','hm15','ap15','am15','hp15'].forEach(x=>r[x]=r[x]||0);
 // poločas
 if(M.half===1&&!M.ended){const r1=v14LvH1(M),f=remM?r1/remM:0;const a1=xh*f,b1=xa*f;let h=0,x=0,w=0;for(let i=0;i<8;i++)for(let j=0;j<8;j++){const p=pf(a1,i)*pf(b1,j);const a=s[0]+i,b=s[1]+j;if(a>b)h+=p;else if(a===b)x+=p;else w+=p;}const T=h+x+w||1;r.lht1=h/T;r.lhtX=x/T;r.lht2=w/T;}
 else{const hs=v14HtSc(M)||s;r.lht1=hs[0]>hs[1]?1:0;r.lhtX=hs[0]===hs[1]?1:0;r.lht2=hs[0]<hs[1]?1:0;}
 // rohy a karty
 const rf=remM/V14L_FM;const c=M.stats[0].cor+M.stats[1].cor,kk=M.stats[0].yc+M.stats[1].yc+M.stats[0].rc+M.stats[1].rc;
 r.lco=v14Pc(V14L_COR*rf,Math.floor(ln.c)+1-c);r.lcu=1-r.lco;r.lko=v14Pc(V14L_CRD*rf,Math.floor(ln.k)+1-kk);r.lku=1-r.lko;
 // časový úsek
 if(ln.w){const mins=ln.w%45===0?(M.half===1?v14LvH1(M):Math.max(0,90-M.min)+4.5):Math.max(0,ln.w-M.min);const l=remM?(xh+xa)*Math.min(1,mins/remM):0;r.lw_y=1-Math.exp(-l);r.lw_n=1-r.lw_y;}else{r.lw_y=0;r.lw_n=0;}
 // další střelec
 const tot=xh+xa,p0=Math.exp(-tot);for(let i=0;i<2;i++){const pt=tot>0?(1-p0)*(i?xa:xh)/tot*0.97:0;const L=v14LvShooters(M,i);const T=L.reduce((a,b)=>a+b.w,0)||1;
  L.forEach(x=>{const key='ns_'+x.p.id;r[key]=pt*x.w/T;if(!LV_MK[key]){LV_MK[key]='Další gól dá: '+x.p.n;LV_SH[key]=String(x.p.n).split(' ').slice(-1)[0];}});}
 return r;}
(function(){const _lp=lvProbs;lvProbs=function(M){const r=_lp.apply(this,arguments);try{const x=v14LvX(M);for(const k in x)if(!(k in r)||/^(cs_|o[4-8]5|u[4-8]5|o05|u05|1X|12|X2|hm|ap|am|hp|lht|lc|lk|lw|ns_)/.test(k))r[k]=x[k];}catch(e){console.warn(e);}return r;};})();
function v14LvP(M,b){if(b.ln&&/^(lc|lk|lw)/.test(b.mk))return v14LvX(M,b.ln)[b.mk]||0;return lvProbs(M)[b.mk]||0;}
// vyhodnocení
(function(){const _st=lvState;lvState=function(M,b){const k=b.mk;
 if(/^ns_/.test(k)){const g=lvGoals(M).slice(b.gc).find(e=>!e.og);if(g)return String(g.p)===k.slice(3)?'won':'lost';return M.ended?'lost':null;}
 if(/^lht/.test(k)){if(M.half===1&&!M.ended)return null;const hs=v14HtSc(M)||M.score;const r=hs[0]>hs[1]?'1':hs[0]===hs[1]?'X':'2';return k==='lht'+r?'won':'lost';}
 if(/^lw_/.test(k)&&b.ln&&b.ln.w){const W=b.ln.w;const hi=M.ev.findIndex(e=>e.t==='ht');const ei=M.ev.findIndex(e=>e.t==='et'||e.t==='ft');let gi=0;let g=false;M.ev.forEach((e,i)=>{if(e.t!=='goal')return;gi++;if(gi<=b.gc)return;const inH=b.h===1?(hi<0||i<hi):((ei<0||i<ei)&&(hi<0||i>hi));if(inH&&(W%45===0||e.m<=W))g=true;});const cl=M.ended||M.half>b.h||(W%45!==0&&M.min>=W);if(g)return k==='lw_y'?'won':'lost';if(cl)return k==='lw_n'?'won':'lost';return null;}
 if(/^l[ck][ou]$/.test(k)&&b.ln){const c=k[1]==='c'?M.stats[0].cor+M.stats[1].cor:M.stats[0].yc+M.stats[1].yc+M.stats[0].rc+M.stats[1].rc;const L=k[1]==='c'?b.ln.c:b.ln.k;const ov=k[2]==='o';
  if(c>L)return ov?'won':'lost';if(M.ended)return ov?'lost':'won';return null;}
 return _st.apply(this,arguments);};
 const _co=lvCoVal;lvCoVal=function(w,b){if(!b||!/^(lc|lk|lw|ns_|lht)/.test(b.mk))return _co.apply(this,arguments);if(b.pe)return 0;const M=lvM(w);if(!M||lvState(M,b))return 0;return Math.max(0,Math.round(b.stake*b.o*v14LvP(M,b)*0.9/10)*10);};
 const _op=lvOpen;lvOpen=function(M,mk){if(!M)return false;if(v14LvSus(M))return false;if(/^lht/.test(mk)&&(M.half!==1||M.min>=43))return false;if(/^lw_/.test(mk)&&!v14LvWin(M))return false;
  if(/^ns_/.test(mk)){const id=mk.slice(3);if(!M.sides.some(sd=>onPitch(sd).some(x=>String(x)===id)))return false;}return _op.apply(this,arguments);};
 const _lb=lvBet;lvBet=function(w,mk){const M=lvM(w);if(M&&v14LvSus(M)){toast('Sázky jsou na chvíli pozastavené ('+M.v14sr+').');return;}const ln=M?v14LvLines(M):null;const L=lvList(w);const n=L.length;const r=_lb.apply(this,arguments);
  try{if(L.length>n){const b=L[L.length-1];b.ln=ln;b.h=M.half;b.lb=v14LvLbl(mk,ln);}}catch(e){}return r;};
 const _sm=stepMinute;stepMinute=function(M){const out=_sm.apply(this,arguments);try{if(M){const e=(out||[]).filter(x=>x.t==='goal'||x.t==='red'||x.t==='pen'||x.t==='var').pop();
  if(e){M.v14su=3;M.v14sr=e.t==='goal'?'gól':e.t==='red'?'červená karta':e.t==='pen'?'penalta':'VAR';}else if(M.v14su>0)M.v14su--;}}catch(x){}return out;};})();
function v14LvSus(M){if(!M||!(M.v14su>0)||M.ended)return false;if(M.v13live&&M.v13live.until>=M.min)return false;return true;}
function v14LvLbl(mk,ln){const f=x=>String(x).replace('.',',');if(mk==='lco'||mk==='lcu')return `Rohy celkem: ${mk==='lco'?'víc':'míň'} než ${f(ln.c)}`;if(mk==='lko'||mk==='lku')return `Karty celkem: ${mk==='lko'?'víc':'míň'} než ${f(ln.k)}`;
 if(/^lw_/.test(mk))return `Gól do ${ln.w}. minuty${ln.w%45===0?' (vč. nastavení)':''}: ${mk==='lw_y'?'ano':'ne'}`;return LV_MK[mk]||mk;}
function v14LvGroups(M,pr){const n=M.score[0]+M.score[1];const ln=v14LvLines(M);const G=[['res','Výsledek',['1','X','2']],['nx','Další gól',['nx_h','nx_0','nx_a']]];
 const ou=[];for(let q=n;q<=Math.min(8,n+2);q++)ou.push('o'+q+'5','u'+q+'5');G.push(['ou','Góly',ou,'Celkový počet gólů v zápase, i těch, co už padly.']);
 G.push(['bt','Oba dají',['gg','ng']],['dc','Dvojitá',['1X','12','X2']],['hc','Handicap',['hm15','hp15','am15','ap15'],'Handicap platí na konečný výsledek.']);
 const cs=Object.keys(pr).filter(k=>/^cs_/.test(k)&&pr[k]>0.004).sort((a,b)=>pr[b]-pr[a]).slice(0,6);G.push(['cs','Skóre',cs,'Šest nejpravděpodobnějších konečných výsledků.']);
 const ns=[0,1].map(i=>v14LvShooters(M,i).sort((a,b)=>b.w-a.w).slice(0,3).map(x=>'ns_'+x.p.id));G.push(['ns','Střelec',ns[0].concat(ns[1]),'Horní řada domácí, dolní hosté. Vlastní góly se nepočítají.']);
 G.push(['rk','Rohy, karty',['lco','lcu','lko','lku'],`Teď rohy ${M.stats[0].cor+M.stats[1].cor}, karty ${M.stats[0].yc+M.stats[1].yc+M.stats[0].rc+M.stats[1].rc}. Linie ${String(ln.c).replace('.',',')} rohu a ${String(ln.k).replace('.',',')} karty.`]);
 if(M.half===1&&M.min<43)G.push(['ht','Poločas',['lht1','lhtX','lht2'],`Výsledek 1. poločasu, teď ${M.score[0]}:${M.score[1]}.`]);
 if(ln.w)G.push(['lw','Gól do '+ln.w+"'",['lw_y','lw_n'],`Padne gól do ${ln.w}. minuty${ln.w%45===0?' včetně nastavení':''}?`]);return G;}
function v14LvSh(k,ln){if(k==='lco'||k==='lcu')return (k==='lco'?'Rohy víc ':'Rohy míň ')+String(ln.c).replace('.',',');if(k==='lko'||k==='lku')return (k==='lko'?'Karty víc ':'Karty míň ')+String(ln.k).replace('.',',');return LV_SH[k]||k;}
lvPanel=function(w){const M=lvM(w);if(!M)return '';const end=M.ended||(w==='pm'&&PM.done);const st=UI.lbStake||200;UI.lvG=UI.lvG||{};UI.lvX=UI.lvX||{};const pr=lvProbs(M);
 const own=w==='own';const u=lvUserSide(M);const L=lvList(w);L.forEach(b=>{if(!LV_MK[b.mk]&&b.lb)LV_MK[b.mk]=b.lb;});
 let h=`<div class="card" style="padding:8px 12px"><div class="row small"><b>${own?'🎯 Živé sázky na tvůj zápas':'📡 Souběžný zápas'}</b><span class="sp"></span><span class="mut">${end?'konec':minLbl(M)+"'"}</span></div>
 <div class="row" style="margin:6px 0;gap:8px"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" class="small">${esc(CL(M.h.cid).n)}</span><b style="font-size:18px">${M.score[0]}:${M.score[1]}</b><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right" class="small">${esc(CL(M.a.cid).n)}</span></div>`;
 if(!end){const G=v14LvGroups(M,pr);let g=UI.lvG[w]||'res';if(g!=='-'&&!G.some(x=>x[0]===g))g='res';const ex=!!UI.lvX[w];const ln=v14LvLines(M);
  let vis=ex?G:G.slice(0,3);if(!ex&&g!=='-'&&!vis.some(x=>x[0]===g))vis=[G[0],G[1],G.find(x=>x[0]===g)];
  const chip=(id,t,on,js)=>`<button class="chip" style="min-height:44px;padding:6px 2px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis${on?';background:rgba(255,211,77,.22);border-color:var(--acc2)':''}" onclick="${js}">${t}</button>`;
  h+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6px">${vis.map(x=>chip(x[0],x[1],x[0]===g,`UI.lvG['${w}']='${x[0]===g?'-':x[0]}';updLive()`)).join('')}${chip('more',ex?'Méně ▴':'Další ▾',false,`UI.lvX['${w}']=${ex?0:1};updLive()`)}</div>`;
  h+=`<div class="seg" style="margin-bottom:6px">${[100,200,500,1000].map(v=>`<button class="${st===v?'on':''}" onclick="UI.lbStake=${v};updLive()">${fmtMoney(v)}</button>`).join('')}</div>`;
  const sus=v14LvSus(M);if(sus)h+=`<div class="tiny" style="margin:4px 0;color:var(--acc2)">⏸ Sázky pozastaveny – ${M.v14sr}. Kurzy se přepočítávají.</div>`;
  const Gs=G.find(x=>x[0]===g);if(Gs){const ks=Gs[2];const cols=ks.length%3===0?'grid3':'grid2';
   h+=`<div class="${cols}" style="gap:6px">${ks.map(k=>{const op=lvOpen(M,k);return `<button class="odd" ${op?`onclick="lvBet('${w}','${k}')"`:'disabled style="opacity:.45"'}><small style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${esc(v14LvSh(k,ln))}</small><b>${op?czOdd(lvOdd(pr[k])):(sus?'⏸':'—')}</b></button>`;}).join('')}</div>`;
   if(Gs[3])h+=`<div class="tiny mut" style="margin-top:4px">${Gs[3]}</div>`;}
  if(M.min>=(M.et?118:88))h+=`<div class="tiny mut" style="margin-top:6px">Sázky jsou v závěru zápasu uzavřené.</div>`;}
 if(own&&typeof v14LvHtml==='function')h+=v14LvHtml(M);
 h+=L.map((b,i)=>`<div class="row small" style="padding:5px 0;border-top:1px solid rgba(255,255,255,.06);margin-top:6px;gap:6px"><span style="flex:1;min-width:0">${esc(b.lb||LV_MK[b.mk]||b.mk)} · ${czOdd(b.o)} · ${fmtMoney(b.stake)} <span class="tiny mut">(${b.min}')</span></span>${b.co?`<span class="tiny good">vybráno ${fmtMoney(b.co)}</span>`:b.res?`<span class="tiny ${b.res==='won'?'good':'bad'}">${b.res==='won'?'výhra '+fmtMoney(b.win||Math.round(b.stake*b.o)):'prohra'}</span>`:end?'<span class="tiny mut">vyhodnocuje se</span>':`<button class="btn ghost" style="min-height:44px;padding:0 10px" onclick="lvCashout('${w}',${i})">Vybrat ${fmtMoney(lvCoVal(w,b))}</button>`}</div>`).join('');
 h+=`<div class="tiny mut" style="margin-top:6px">${own?(u>=0?'Kurzy se mění každou minutu podle skóre, času a vyloučení. Po gólu, červené, penaltě nebo VAR se sázky na chvíli pozastaví. Sázka proti vlastnímu týmu je velké riziko, disciplinární komise si jí může všimnout.':''):'Zápas, který se hraje ve stejnou dobu jako ten tvůj.'} Předčasný výběr vyplatí hned část výhry podle aktuálního stavu.${M.ko&&M.ko.decide?' Sázky na výsledek a góly platí včetně prodloužení.':''}</div></div>`;
 return h;};
const V14L_K=0.95; // 0.88→ 0.82 na minutu, protože se počítá i nastavení
// plynulé živé kurzy: přechod chování týmů kolem 60. minuty a vyhlazení přepočtu síly (kromě gólů a vyloučení)
lvRate=function(M,i){const rem=v14LvRem(M)/90*V14L_K*(1+0.09*clamp((M.min-45)/30,0,1));const op=M.sides?M.sides[1-i]:(i?M.h:M.a);
 const my=M.score[i],th=M.score[1-i];let g=1;if(typeof gsMul==='function'){const w=clamp((M.min-52)/16,0,1);g=gsMul(my,th,false)*(1-w)+gsMul(my,th,true)*w;}const late=(M.min>80&&my<th?1.12:1)*(my>th?0.92:1);
 const X=M.xgS||M.xg;return (X?X[i]:(i?1.1:1.3))*0.88*rem*g*late*((op&&op.red)?0.85:1);};
(function(){const _sm=stepMinute;stepMinute=function(M){const out=_sm.apply(this,arguments);try{if(M&&M.xg){const hard=(out||[]).some(e=>e.t==='red'||e.t==='goal');
 if(!M.xgS||hard)M.xgS=M.xg.slice();else M.xgS=M.xgS.map((v,i)=>v+0.3*(M.xg[i]-v));}}catch(e){}return out;};})();


// ---------- boot ----------
window.FM_DATA_VER='71564f09';
(function(){try{if(!loadGame())S=null;var done=function(){render();var sp=document.getElementById('splash');if(sp){sp.classList.add('gone');setTimeout(function(){sp.remove();},450);}};if(S){loadWorld().then(function(){try{postLoad();}catch(e){console.warn(e);}done();},function(e){done();toast(e.message);});}else done();}catch(e){window.__bootErr(e);}})();
