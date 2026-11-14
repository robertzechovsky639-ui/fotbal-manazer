// ===================== FOTBAL MANAŽER – jádro =====================
const STORE=(function(){const mem={};let ls=null;try{const t='__fm_t';window.localStorage.setItem(t,'1');window.localStorage.removeItem(t);ls=window.localStorage;}catch(e){ls=null;}
 return {ok:!!ls,get(k){try{if(ls){const v=ls.getItem(k);if(v!=null)return v;}}catch(e){}return mem[k]==null?null:mem[k];},
  set(k,v){mem[k]=v;if(!ls)return false;try{ls.setItem(k,v);return true;}catch(e){try{ls.removeItem(k);ls.setItem(k,v);return true;}catch(e2){return false;}}},
  del(k){delete mem[k];try{if(ls)ls.removeItem(k);}catch(e){}}};})();
const SAVE_KEY='fotbalManazer_save_v1';
const FM_VER=6;
let S=null;
let RNG=Math.random;
const rnd=(a,b)=>a+RNG()*(b-a), rint=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[Math.floor(RNG()*a.length)];
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
function xgPair(sh,sa){const k=24;let xh=1.3*Math.exp((sh.att-sa.def)/k+(sh.mid-sa.mid)/80)*1.12;let xa=1.3*Math.exp((sa.att-sh.def)/k+(sa.mid-sh.mid)/80)*0.9;return [clamp(xh,0.15,4.2),clamp(xa,0.12,3.8)];}
function poisson(l){let L=Math.exp(-l),k=0,p=1;do{k++;p*=RNG();}while(p>L&&k<12);return k-1;}
function pickScorer(ids){const ps=ids.map(P).filter(Boolean);return wpick(ps,p=>{const g=GRP(p.pos);return (g==='F'?6:g==='M'?(p.pos==='AM'?3.6:1.8):g==='D'?0.55:0.01)*Math.pow(Math.max(20,p.a[1]||50)/60,3);});}
function pickAssist(ids,ex){const ps=ids.map(P).filter(p=>p&&p.id!==ex);return wpick(ps,p=>{const g=GRP(p.pos);return (g==='F'?2.5:g==='M'?3.2:g==='D'?1:0.05)*Math.pow(Math.max(20,p.a[2]||50)/60,2);});}
function quickMatch(h,a){const fh=S.clubs[h].form||bestForm(h),fa=S.clubs[a].form||bestForm(a);const lh=autoLineup(h,fh),la=autoLineup(a,fa);
 const sh=lineStrength(lh.xi,fh,{}),sa=lineStrength(la.xi,fa,{});let [xh,xa]=xgPair(sh,sa);try{const fx=wxFx(matchWeather(h,{h,a,type:'lg'}));if(fx&&isFinite(fx.rate*fx.acc)){xh*=fx.rate*fx.acc;xa*=fx.rate*fx.acc;}}catch(e){}let gh=poisson(xh),ga=poisson(xa);const fz=S._forced&&S._forced[h+'|'+a];if(fz){gh=fz.gh;ga=fz.ga;delete S._forced[h+'|'+a];}
 const ev=[];const add=(cid,xi,n)=>{for(let i=0;i<n;i++){const fs=fz&&fz.sc&&fz.sc[cid]&&fz.sc[cid][i]&&P(fz.sc[cid][i]);const s=fs||pickScorer(xi);const as=RNG()<0.72?pickAssist(xi,s&&s.id):null;if(s){s.st.g++;s.car.g++;}if(as)as.st.as++;ev.push({t:'g',c:cid,p:s&&s.id,as:as&&as.id,m:rint(2,90)});}};
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
   applyResult(code,h,a,m.gh,m.ga);BETRES['L|'+code+'|'+r+'|'+h+'|'+a]={gh:m.gh,ga:m.ga};res.push({h,a,gh:m.gh,ga:m.ga,ev:(m.ev||[]).filter(e=>e.t==='g').map(e=>({c:e.c,p:e.p,m:e.m}))});}
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
 if(me.money<0&&!S._debtWarn){S._debtWarn=1;addNews('⚠️','Klub je v minusu. Vedení žádá prodej hráčů nebo snížení mezd.');S.boardTrust=clamp(S.boardTrust-4,0,100);}
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
 addNews('📅',`Začíná sezóna ${seasonLabel(S.season)}. Vedení očekává: ${expectText(myClub().expect)}.`);
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
 for(let i=0;i<2;i++){const sd=M.sides[i],op=M.sides[1-i];const rate=M.xg[i]/90/0.225*(m>80&&M.score[i]<M.score[1-i]?1.25:1)*(sd.red?0.75:1)*(op.red?1.3:1)*(M.fx?M.fx.rate:1)*tacRate(sd.tac)*(op.tac.tempo==='fast'?1.04:1);
  if(RNG()<rate){out.push(...chance(M,i));}
  else if(RNG()<0.055*(sd.tac.width==='wide'?1.3:sd.tac.width==='narrow'?0.8:1)){out.push({m,t:'cor',s:i,tx:`${sideName(i)} mají rohový kop.`});M.stats[i].cor++;if(RNG()<0.12*spMul(sd))out.push(...chance(M,i,'head'));}
  if(RNG()<0.12){M.stats[i].fou++;if(RNG()<0.16*bribeCardMul(M,i))out.push(...card(M,i));}
  if(RNG()<0.02*(op.tac.trap?1.8:1)){const p=pick(onPitch(sd).filter(id=>GRP(P(id).pos)==='F'))||pick(onPitch(sd));M.stats[i].off++;if(RNG()<0.4)out.push({m,t:'off',s:i,tx:`${nm(p)} byl v ofsajdu.`});}
  if(RNG()<0.0028*(sd.tac.press==='high'?1.3:1)*(M.fx?M.fx.inj:1)){const id=pick(onPitch(sd).filter(x=>GRP(P(x).pos)!=='G'));if(id){const p=P(id);p._minj=rint(1,5)+(RNG()<0.15?rint(3,8):0);out.push({m,t:'inj',s:i,p:id,tx:`🚑 ${nm(id)} zůstal ležet na trávníku a nemůže pokračovat.`});forceSub(M,i,id,out);}}}
 if(!out.length&&RNG()<0.09){const i=RNG()<M.possBase/100?0:1;const wf=M.wx&&WX_FILL[M.wx.k];if(wf&&RNG()<0.22)out.push({m,t:'fill',tx:pick(wf)});else out.push({m,t:'fill',s:i,tx:fillT(pick(T_FILL),{T:sideName(i)})});}
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
 let q;const pen=!kind&&RNG()<0.035*bribePenMul(M,i);if(pen){q=0.76;const tk=sd.tac.pk&&onPitch(sd).includes(sd.tac.pk)?P(sd.tac.pk):null;if(tk)sh=tk;}else{q=clamp(0.02+Math.pow(RNG(),2.4)*0.52,0.02,0.6);if(kind==='head')q*=0.8;if(op.tac.trap&&!kind&&RNG()<0.07)q=Math.max(q,0.38);}
 const shotQ=(sh.a[1]+(pen?sh.a[1]:sh.ovr))/2;const gkQ=gk?gk.ovr*(0.85+0.15*gk.cond/100):45;
 let pg=q*clamp(1+(shotQ-gkQ-8)/160,0.8,1.2)*(M.fx&&!pen?M.fx.acc:1);M.stats[i].sh++;M.stats[i].xg+=q;
 const S1=pSurname(sh),K=gk?pSurname(gk):'brankář';
 if(pen){if(RNG()<0.1&&!(M.bribe&&M.bribe.side===i)){M.stats[i].sh--;M.stats[i].xg-=q;out.push({m,t:'var',s:i,tx:`📺 Videorozhodčí! Sudí si zákrok přehrál u monitoru a nařízenou penaltu pro ${S.clubs[sd.cid].n} odvolal. Hraje se dál.`});return out;}out.push({m,t:'pen',s:i,p:sh.id,tx:`Penalta! ${sideName(i)} kopou pokutový kop, k míči se staví ${S1}.`});}
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
function card(M,i){const sd=M.sides[i];const m=M.min;const ids=onPitch(sd).filter(id=>P(id).pos!=='GK');const id=wpick(ids,x=>(GRP(P(x).pos)==='D'?2:GRP(P(x).pos)==='M'?1.5:0.8)*(typeof persCardMul==='function'?persCardMul(x):1));if(!id)return [];
 const out=[];M.yc=M.yc||{};const direct=RNG()<0.04;
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
 M.ev.filter(e=>e.t==='goal').forEach(e=>{const p=P(e.p);if(p){const st=M.cup?(p.cst||(p.cst=newStats())):p.st;st.g++;p.car.g++;}if(e.as){const a=P(e.as);if(a){const st=M.cup?(a.cst||(a.cst=newStats())):a.st;st.as++;}}});
 const tot=M.stats[0].pos+M.stats[1].pos||1;M.poss=[Math.round(M.stats[0].pos/tot*100),0];M.poss[1]=100-M.poss[0];
 M.result={pen:M.pen||null,et:!!M.et,h:M.h.cid,a:M.a.cid,gh:res[0],ga:res[1],ev:M.ev.filter(e=>e.t==='goal').map(e=>({t:'g',c:M.sides[e.s].cid,p:e.p,m:e.m}))};}
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
function wMatch(h,a){const [xh,xa]=xgPair(synth(h),synth(a));if(RNG()<0.002)return {gh:3,ga:0,ab:1};return {gh:poisson(xh),ga:poisson(xa)};}
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
function quickCup(h,a,ko){let [xh,xa]=xgPair(synth(h),synth(a));try{const fx=wxFx(matchWeather(h,{h,a,type:'cup'}));if(fx&&isFinite(fx.rate*fx.acc)){xh*=fx.rate*fx.acc;xa*=fx.rate*fx.acc;}}catch(e){}let gh=poisson(xh),ga=poisson(xa);let pen=null,et=false;if(ko&&ko.decide&&gh+ko.agg[0]===ga+ko.agg[1]){et=true;gh+=poisson(xh/3.2);ga+=poisson(xa/3.2);if(gh+ko.agg[0]===ga+ko.agg[1])pen=wPens(clubStr(h),clubStr(a));}return {gh,ga,pen,et};}
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
function roundOdd(x){x=clamp(x,1.03,40);return x<2?Math.round(x*100)/100:x<5?Math.round(x*20)/20:Math.round(x*10)/10;}
function strOf(ref){const c=S.clubs[ref];if(c&&!c.tmp)return synthLine(ref);return synth(ref);}
function synthLine(cid){const s=S.clubs[cid].rep||60;return {att:s,def:s,mid:s,gk:s,ovr:s};}
function matchOdds(h,a,seed){const [xh,xa]=xgPair(strOf(h),strOf(a));const [ph,pd,pa]=winProb(xh,xa);const l=xh+xa;const pu=Math.exp(-l)*(1+l+l*l/2);const pg=(1-Math.exp(-xh))*(1-Math.exp(-xa));
 const n=(k)=>1+((hashStr(seed+k)%100)/100-0.5)*0.06;const M=1.07;
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
 const navWarn={tac:(()=>{try{return !!lineupIssues();}catch(e){return false;}})(),club:fans()<30||S.boardTrust<30,bets:(S.bets||[]).some(b=>b.st!=='open'&&!b.seen)};
 const tabs=[['home','🏟️','Přehled'],['squad','👥','Kádr'],['tac','📋','Taktika'],['league','🏆','Soutěže'],['market','💼','Přestupy'],['bets','🎲','Sázky'],['club','🏦','Klub']];
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
  <div class="card"><h3>Nová kariéra</h3><label class="small mut">Jméno trenéra</label><input id="mgr" maxlength="30" placeholder="Např. Robert Zechovský" value="${esc(st.name||'')}"><div style="height:12px"></div><button class="btn big" id="st1">Vybrat zemi a klub</button></div>
  <div class="card small mut">Hra se ukládá automaticky do prohlížeče. Soupisky vycházejí ze skutečných kádrů pro sezónu 2026/27, hodnocení hráčů jsou orientační.</div></div>`;
 if(st.step===1)return `<div class="view" style="padding-top:calc(14px + env(safe-area-inset-top,0px))"><div class="row" style="margin-bottom:10px"><button class="btn ghost sm" onclick="UI.start.step=0;render()">‹ Zpět</button><b>Vyber zemi</b></div>
  ${REGIONS.map(([r,ccs])=>`<div class="card"><h3>${r}</h3>${ccs.filter(cc=>FM_CAT.countries[cc]).map(cc=>{const ls=countryLeagues(cc,true);return `<button class="lgpick" onclick="startPickCountry('${cc}')"><span class="f">${flag(cc)}</span><span class="t"><b>${esc(FM_CAT.countries[cc])}</b><small>${ls.map(l=>esc(l.name)).join(' · ')}</small></span><span class="mut">›</span></button>`;}).join('')}</div>`).join('')}</div>`;
 if(st.step===2){const ls=countryLeagues(st.cc,true);return `<div class="view" style="padding-top:calc(14px + env(safe-area-inset-top,0px))"><div class="row" style="margin-bottom:10px"><button class="btn ghost sm" onclick="UI.start.step=1;render()">‹ Zpět</button><b>${flag(st.cc)} ${esc(FM_CAT.countries[st.cc])}</b></div>
  <div class="card"><h3>Soutěž</h3><div class="seg">${ls.map(l=>`<button class="${st.lg===l.code?'on':''}" onclick="startPickLeague('${l.code}')">${esc(l.name)}</button>`).join('')}</div></div>
  <div id="clublist">${st.lg&&DATA[st.lg]?clubPickList(st.lg):'<div class="empty"><div class="sp2" style="margin:0 auto 10px"></div>Načítám kluby…</div>'}</div></div>`;}
 return '';}
function clubPickList(code){const d=DATA[code];const arr=d.clubs.map(c=>{const top=c.p.map(p=>p[3]).sort((a,b)=>b-a).slice(0,16);return {c,str:top.reduce((s,x)=>s+x,0)/top.length};}).sort((a,b)=>b.str-a.str);
 return `<div class="card"><h3>Vyber klub<span class="sp"></span><span class="tiny">${arr.length} klubů</span></h3>${arr.map((x,i)=>`<button class="lgpick" onclick="startConfirm('${code}',${d.clubs.indexOf(x.c)})">${badge(x.c)}<span class="t"><b>${esc(x.c.n)}</b><small>Síla kádru ${Math.round(x.str)} · ${i<2?'favorit soutěže':i<arr.length*0.35?'ambice na horní příčky':i<arr.length*0.7?'střed tabulky':'boj o záchranu'}${x.c.b?' · rezervní tým (nemůže postoupit)':''}</small></span><span>${ovrB(x.str)}</span></button>`).join('')}</div>`;}
function bindStart(){const b=$('#st1');if(b)b.onclick=()=>{const n=($('#mgr').value||'').trim();UI.start.name=n||'Trenér';UI.start.step=1;render();window.scrollTo(0,0);};}
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
 h+=`<div class="grid2" style="margin-bottom:12px"><div class="tile"><div class="k">Důvěra vedení</div><div class="v ${S.boardTrust<30?'bad':S.boardTrust>65?'good':''}">${S.boardTrust} %</div><div class="bar" style="margin-top:5px"><i style="width:${S.boardTrust}%"></i></div></div><div class="tile"><div class="k">Cíl sezóny</div><div class="v" style="font-size:13.5px;white-space:normal">${expectText(me.expect)}</div></div></div>`;
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
 <div class="card">${(res.ev||[]).length?res.ev.sort((a,b)=>a.m-b.m).map(e=>{const p=P(e.p);return `<div class="row small" style="padding:4px 0;${e.c===res.a?'flex-direction:row-reverse;text-align:right':''}"><span class="mut b">${e.m}'</span><span>⚽ ${p?esc(p.n):'—'}</span></div>`;}).join(''):'<div class="empty">Bez branek.</div>'}</div>`);}
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
 if(ct==='tr')return h+renderTraining();if(ct==='zaz')return h+renderFacilities();if(ct==='kar')return h+renderCareer();
 if(ct==='fin'){h+=`<div class="grid2" style="margin-bottom:10px"><div class="tile"><div class="k">Fanoušci</div><div class="v ${fansCls()}">${fansIc()} ${fansLabel()}</div></div><div class="tile"><div class="k">Důvěra vedení</div><div class="v ${S.boardTrust<30?'bad':S.boardTrust>65?'good':''}">${Math.round(S.boardTrust)} %</div></div></div><div class="card"><h3>💶 Finance</h3><div class="grid2"><div class="tile"><div class="k">Zůstatek</div><div class="v ${me.money<0?'bad':'gold'}">${fmtMoney(me.money)}</div></div><div class="tile"><div class="k">Bilance týdne</div><div class="v ${me.tv-wages<0?'bad':'good'}">${fmtMoney(me.tv-wages)}</div></div><div class="tile"><div class="k">Mzdy / týden</div><div class="v" style="font-size:14px">${fmtMoney(wages)}</div></div><div class="tile"><div class="k">TV a sponzoři / týden</div><div class="v" style="font-size:14px">${fmtMoney(me.tv)}</div></div></div>
 <div class="small mut" style="margin-top:10px;line-height:1.6">Tato sezóna: vstupné ${fmtMoney(f.gate)} · prodeje ${fmtMoney(f.tr_in)} · nákupy ${fmtMoney(f.tr_out)} · mzdy ${fmtMoney(f.wages)}<br>Stadion: ${fmtNum(me.cap)} míst · vstupenka ${fmtMoney(me.ticket)}</div>
 <details style="margin-top:8px"><summary class="small cy" style="min-height:40px;display:flex;align-items:center">Pohyby na účtu</summary>${S.fin.log.slice(0,25).map(l=>`<div class="row small" style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span class="mut" style="width:52px">${l.r+1>S.maxRound?'léto':(l.r+1)+'. k.'}</span><span style="flex:1">${esc(l.t)}</span><b class="${l.v<0?'bad':'good'}">${fmtMoney(l.v)}</b></div>`).join('')}</details></div>
 <div class="card"><h3>👔 Vedení klubu</h3><div class="small">Cíl sezóny: <b class="gold">${expectText(me.expect)}</b></div><div class="small" style="margin-top:6px">Důvěra vedení: <b>${S.boardTrust} %</b></div><div class="bar" style="margin-top:6px"><i style="width:${S.boardTrust}%"></i></div><div class="tiny mut" style="margin-top:6px">Trenér: ${esc(S.manager)}</div></div>
 `+fansCard()+`<div class="card"><h3>📰 Média</h3><div class="small">Rivalové v médiích: ${Object.entries(S.riv||{}).filter(([k,v])=>v>=3&&CL(k)).map(([k])=>esc(CL(k).n)).join(', ')||'zatím nikdo'}</div><div class="tiny mut" style="margin-top:6px">Odpovědi na tiskových konferencích ovlivňují morálku kabiny, fanoušky, vedení i vztahy se soupeři.</div></div>`;return h;}
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
 <div class="small mut" style="margin:-2px 2px 10px">Sázíš z vlastních peněz trenéra (plat ${fmtMoney(S.salary||200)} za kolo), ne z peněz klubu. Na zápasy vlastního týmu sázet nesmíš. Všechno jsou jen herní peníze.</div>`;
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
 if(bt==='offer'){const gs=betGroups();const wl=FM_CAT.leagues.filter(l=>S.W&&S.W.lg[l.code]);
 h+=`<div class="card"><h3>Zahraniční liga v nabídce</h3><select onchange="UI.betW=this.value;render()">${wl.map(l=>`<option value="${l.code}" ${l.code===(UI.betW||'ENG1')?'selected':''}>${esc(l.country)} – ${esc(l.name)}</option>`).join('')}</select></div>`;
 if(!gs.length)h+='<div class="card"><div class="empty">Teď nejsou v nabídce žádné zápasy.</div></div>';
 gs.forEach(g=>{h+=`<div class="card" style="padding:8px 10px"><h3>${esc(g.name)}</h3>${g.ms.map(m=>{const o=matchOdds(m.h,m.a,m.mid);const inS=k=>sl.some(x=>x.mid===m.mid&&x.mk===k);const open=UI.betOpen===m.mid;
  const b=k=>`<button class="odd ${inS(k)?'on':''}" onclick="toast(addToSlip('${m.mid}','${k}'));saveGame();render()"><small>${MK_SHORT[k]}</small><b>${czOdd(o[k])}</b></button>`;
  return `<div class="bm"><div class="row small" style="gap:6px;margin-bottom:6px">${badge(CL(m.h),'sm')}<b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(CL(m.h).n)} – ${esc(CL(m.a).n)}</b>${badge(CL(m.a),'sm')}</div><div class="odds">${b('1')}${b('X')}${b('2')}<button class="odd more" onclick="UI.betOpen=${open?'null':`'${m.mid}'`};render()"><small>další</small><b>${open?'▲':'▼'}</b></button></div>${open?`<div class="odds" style="margin-top:6px">${b('o25')}${b('u25')}${b('gg')}${b('ng')}</div>`:''}${typeof volMini==='function'?volMini(m.h,m.a,m.mid):''}</div>`;}).join('')}</div>`;});
 return h;}
 const open=S.bets.filter(b=>b.st==='open'),done=S.bets.filter(b=>b.st!=='open').slice(0,UI.betAll?80:12);
 const bRow=b=>`<div class="betrow ${b.st}"><div class="row small"><b>${b.legs.length>1?'AKO '+b.legs.length+' tipů':esc(midTitle(b.legs[0].mid))}</b><span class="sp"></span><span class="tag ${b.st==='won'?'g':b.st==='lost'?'r':''}">${{open:'čeká',won:'výhra',lost:'prohra',void:'vráceno'}[b.st]}</span></div>
  ${b.legs.map(l=>`<div class="tiny ${l.st==='won'?'good':l.st==='lost'?'bad':'mut'}">${b.legs.length>1?esc(midTitle(l.mid))+' · ':''}${MK_LBL[l.mk]} @ ${czOdd(l.o)}${l.res?' · '+esc(l.res):''}</div>`).join('')}
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
 <div class="card" style="padding:8px 12px"><div class="row small" style="gap:10px;flex-wrap:wrap"><span>${wxText(wx)}</span><span class="sp"></span><span>${fansIc()} Fanoušci: <b class="${fansCls()}">${fansLabel()}</b></span></div>${(S.riv&&S.riv[opp]>=3)?'<div class="tiny gold" style="margin-top:4px">🔥 Vyhrocený souboj s rivalem – soupeř bude extra motivovaný.</div>':''}</div>
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
 ${gs.length?`<div class="card" style="padding:10px 12px"><h3>Branky</h3>${gs.map(e=>`<div class="row small" style="padding:3px 0;${e.s===1?'flex-direction:row-reverse;text-align:right':''}"><b class="mut">${e.m}'</b><span>⚽ ${esc(nm(e.p))}${e.pen?' (pen.)':''}</span></div>`).join('')}</div>`:''}`;}
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
 ${gs.length?`<div class="card" style="padding:8px 12px;margin-top:10px">${gs.map(e=>`<div class="row small" style="padding:2px 0;${e.s===1?'flex-direction:row-reverse;text-align:right':''}"><b class="mut">${e.m}'</b><span>⚽ ${esc(P(e.p)?P(e.p).n:'')}${e.pen?' (pen.)':''}</span></div>`).join('')}</div>`:''}
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
 const verdict=rep.pos<=rep.exp-2?'Vedení je nadšené, výrazně jsi překonal očekávání.':rep.pos<=rep.exp?'Vedení je spokojené, cíl sezóny jsi splnil.':rep.pos<=rep.exp+2?'Vedení je mírně zklamané, cíl jsi těsně nesplnil.':'Vedení je nespokojené, výsledky byly hluboko pod očekáváním.';
 modal(`<div class="c"><div style="font-size:46px">${rep.pos===1?'🏆':rep.myMove>0?'🎉':rep.myMove<0?'😢':'📋'}</div><h2>Sezóna ${seasonLabel(rep.season)}</h2><div class="b" style="font-size:18px">${rep.pos}. místo z ${rep.n}</div><div class="small mut">${rep.pts} bodů · ${rep.w} výher, ${rep.d} remíz, ${rep.l} proher · skóre ${rep.gf}:${rep.ga}</div>${moveTxt}</div>
 <div class="card" style="margin-top:10px;padding:10px 12px"><div class="small">${verdict}</div><div class="small" style="margin-top:6px">Důvěra vedení: <b>${rep.trust} %</b></div><div class="small" style="margin-top:6px">Prémie za umístění: <b class="gold">${fmtMoney(rep.prize)}</b></div>
 ${rep.topScorer?`<div class="small" style="margin-top:6px">Král střelců: <b>${esc(rep.topScorer.n)}</b> (${esc(rep.topScorer.club)}, ${rep.topScorer.g} ${czPlural(rep.topScorer.g,'gól','góly','gólů')})</div>`:''}
 ${rep.mrep!=null?`<div class="small" style="margin-top:6px">Tvoje reputace: <b>${rep.mrep}</b> (${rep.mrepD>=0?'+':''}${rep.mrepD})</div>`:''}${rep.freeGone&&rep.freeGone.length?`<div class="small" style="margin-top:6px">Odchod po konci smlouvy: ${rep.freeGone.map(esc).join(', ')}</div>`:''}${rep.added&&rep.added.length?`<div class="small" style="margin-top:6px">🆕 Nové soutěže: ${rep.added.map(esc).join(', ')}</div>`:''}
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
 if(S.fans<18&&RNG()<0.25){addNews('🪧','Fanoušci vyvěsili na tribuně transparent s výzvou k odchodu trenéra. Vedení je nervózní.');S.boardTrust=clamp(S.boardTrust-2,0,100);}
 if(S.fans>85&&RNG()<0.15)addNews('🎶','Kotel celý zápas zpíval a fanoušci po hře děkovali hráčům. Nálada kolem klubu je skvělá.',1);}
function fansCard(){const f=fans();return `<div class="card"><h3>📣 Nálada fanoušků</h3><div class="row"><span style="font-size:30px">${fansIc()}</span><div style="flex:1"><b class="${fansCls()}">${fansLabel()}</b> <span class="mut small">${Math.round(f)} / 100</span><div class="bar" style="margin-top:5px"><i style="width:${f}%"></i></div></div></div>
 <div class="tiny mut" style="margin-top:8px;line-height:1.5">Nálada stoupá s výhrami, hlavně nad silnějšími soupeři a rivaly, a klesá po porážkách, prodeji opor a při drahých vstupenkách. Ovlivňuje návštěvnost, příjmy ze vstupného i důvěru vedení.</div>
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
 <div class="card" style="padding:10px 12px"><div class="small">Rozhodčí bude v hraničních situacích malinko nakloněný tvému týmu: o něco častěji odpíská penaltu ve tvůj prospěch a dá kartu soupeři. <b>Hrozí ale skandál:</b> pokuta, odečet bodů, propad důvěry vedení i fanoušků a v horším případě vyhazov.</div>
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
  addNews('🚨',`SKANDÁL! Média zveřejnila nahrávky, na kterých trenér ${S.manager} domlouvá „pozornost" pro rozhodčího. Disciplinární komise: pokuta ${fmtMoney(fine)} a odečet ${ded} bodů.`);
  if(S.boardTrust<=8){addNews('🧾','Vedení klubu po skandálu zvažuje okamžité odvolání trenéra. Další chyba už se neodpouští.');}
  if(S.boardTrust<=0)S.sackNow=1;});}
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
 const [txt,ans]=PRESS_Q[q];return `<div class="card press" style="padding:10px 12px"><h3>🎤 ${kind==='pre'?'Tisková konference před zápasem':'Rozhovor po zápase'}</h3><div class="small" style="margin-bottom:8px">„${esc(txt)}"</div>${ans.map((a,i)=>`<button class="btn ghost w100 pans" style="margin-bottom:6px;text-align:left;justify-content:flex-start;white-space:normal;height:auto;min-height:44px" onclick="pressAnswer('${kind}','${q}',${i})">${esc(a[0])}</button>`).join('')}</div>`;}
function pressAnswer(kind,q,i){const a=PRESS_Q[q][1][i];const fx=a[1];const opp=UI.pressOpp;
 if(fx.mor)clubPlayers(S.clubId).forEach(p=>p.mor=clamp(p.mor+fx.mor,5,100));if(fx.fans)fansAdd(fx.fans);if(fx.board)S.boardTrust=clamp(Math.round(S.boardTrust+fx.board),0,100);
 if(fx.riv&&opp){S.riv=S.riv||{};S.riv[opp]=clamp((S.riv[opp]||0)+fx.riv,-10,10);}
 const eff=[fx.mor?`morálka ${fx.mor>0?'+':''}${fx.mor}`:'',fx.fans?`fanoušci ${fx.fans>0?'+':''}${fx.fans}`:'',fx.board?`vedení ${fx.board>0?'+':''}${fx.board}`:'',fx.riv?'rivalita roste':''].filter(Boolean).join(' · ');
 UI.pressKey[kind]='done';UI.pressDone=Object.assign(UI.pressDone||{},{[kind]:`Odpověděl jsi: „${a[0]}"${eff?' ('+eff+')':''}`});
 if(Math.random()<0.4){const head={postWin:'Trenér po výhře: ',postLoss:'Trenér po porážce: ',postDraw:'Trenér po remíze: '}[q]||'Trenér na tiskovce: ';addNews('🎤',head+'„'+a[0]+'"',1);}
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
 if(e.t==='goal'){const pen=C.pen===e.s&&C.penM>=M.min-1;C.pen=null;const pid=e.p;const ex={p:chSurn(pid),tm:S.clubs[M.sides[e.s].cid].n};
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
 ticket:['Vstupné je drahé jak v Londýně, to si vedení přehnalo.'],scandal:['Po té aféře s obálkou se na trenéra dívám skrz prsty.'],
 scorer:['{G} – střelec jak má být!','Gól, který dal {G}, byl čistá krása.']};
function forumHtml(M){const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const res=my>th?'win':my<th?'loss':'draw';const mine=Object.keys(M.played).filter(id=>P(id)&&P(id).cl===S.clubId).sort((a,b)=>finite(M.rt[b])-finite(M.rt[a]));
 const B=mine[0]?pSurname(P(mine[0])):'brankář',W=mine.length?pSurname(P(mine[mine.length-1])):'obrana';const gs=M.ev.filter(e=>e.t==='goal'&&e.s===ui);const G=gs.length?pSurname(P(gs[0].p)||{n:'útočník'}):null;
 const d={B,W,G,SC:my+':'+th,T:fmtMoney(myClub().ticket)};const pool=[];const add=(k,n)=>{if(FORUM[k])for(let i=0;i<(n||1);i++)pool.push(FORUM[k]);};
 add(res,3);if(res==='win'&&my-th>=3)add('bigwin',2);if(M.derby)add(res==='win'?'derby_win':res==='loss'?'derby_loss':'draw',2);if(M.wx&&FORUM[M.wx.k])add(M.wx.k);if(myClub().ticketBase&&myClub().ticket>myClub().ticketBase*1.2)add('ticket');if(S.scandal&&S.scandal.s===S.season)add('scandal');if(G&&res!=='loss')add('scorer');
 const used=new Set();const nk=shuffle(FN.slice());const posts=[];for(let k=0;k<3&&pool.length;k++){let t,g=0;do{t=pick(pick(pool));}while(used.has(t)&&g++<20);used.add(t);t=t.replace(/\{(\w+)\}/g,(_,x)=>d[x]||'');posts.push(`<div class="chatl"><b class="cp-fanH">${nk[k]}</b><div>${esc(t)}</div></div>`);}
 return `<div class="card" style="padding:8px 12px"><h3>💬 Fórum fanoušků</h3>${posts.join('')}</div>`;}
function keyMoments(M){const K=M.ev.filter(e=>['goal','red','var','pen','post','inj','pso'].includes(e.t)||(e.t==='save'&&/penalt/i.test(e.tx||'')));if(!K.length)return '';
 return `<div class="card" style="padding:8px 12px"><h3>🎬 Klíčové momenty</h3>${K.slice(0,14).map(e=>`<div class="row small" style="padding:3px 0;align-items:flex-start"><b class="mut" style="min-width:34px">${e.m}'</b><span style="flex:1">${esc(String(e.tx||'').replace(/^⚽ /,'⚽ '))}</span></div>`).join('')}</div>`;}
function v4PreHtml(F){const opp=F.h===S.clubId?F.a:F.h;const oc=CL(opp);if(!oc)return '';const der=isDerby(F.h,F.a);const sm=clubStr(S.clubId),so=clubStr(opp);
 const kind=der?'pre_derby':(S.riv&&S.riv[opp]>=3)?'pre_riv':so>=sm?'pre_fav':'pre_dog';
 let tip='';if(stLv('as')){const sdo=so-sm;tip=`<div class="tiny" style="margin-top:6px">🧑‍🏫 Asistent: ${sdo>4?'Soupeř je silnější, zkus nižší obrannou linii a protiútoky.':sdo<-4?'Jsme favorit, vysoký presink a rychlé tempo by je měly zlomit.':'Vyrovnaný zápas, rozhodnout mohou standardky.'}${M_wxTip(F)}</div>`;}
 return `<div class="card" style="padding:8px 12px">${der?'<div class="small warn" style="margin-bottom:4px">🔥 Derby! Vyprodaný stadion, vyhrocená atmosféra a víc karet.</div>':''}<div class="small">🗣️ Trenér soupeře (${esc(oc.n)}): „${esc(rivalQuote(kind))}"</div>${tip}</div>`;}
function M_wxTip(F){try{const w=matchWeather(F.h,F);return w.k==='rain'||w.k==='snow'?' Kvůli počasí hraj spíš přímočaře.':w.k==='heat'?' Ve vedru šetři síly, nižší presink.':w.k==='wind'?' Ve větru se vyhni dlouhým míčům.':'';}catch(e){return '';}}
function v4PostHtml(M){if(M._v4h)return M._v4h;const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const opp=CL(M.sides[1-ui].cid);const k=my>th?'post_loss':my<th?'post_win':'post_draw';
 M._v4h=keyMoments(M)+`<div class="card" style="padding:8px 12px"><div class="small">🗣️ Trenér soupeře (${esc(opp.n)}): „${esc(rivalQuote(k))}"</div></div>`+forumHtml(M);return M._v4h;}
function v4AfterMatch(M){if(!S.v4)v4init();const C=S.v4.career;const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];
 if(my>th){C.w++;ach('vyhra1');if(C.w>=50)ach('vyhry50');if(my-th>=5)ach('kanonada');if(M.derby)ach('derby');}else if(my===th)C.d++;else C.l++;
 C.unb=my>=th?(C.unb||0)+1:0;C.best=Math.max(C.best||0,C.unb);if(C.unb>=10)ach('neporaz');
 if(M.sides[ui]===M.h&&M.att>=myClub().cap*0.98)ach('vyprodano');if(M.ev.some(e=>e.t==='goal'&&e.s===ui&&P(e.p)&&P(e.p).yth))ach('odchovanec');
 const best=motm(M);const bp=P(best);if(bp&&bp.cl===S.clubId){bp.car=bp.car||{};bp.car.motm=(bp.car.motm||0)+1;bp.hap=clamp((bp.hap||60)+2,0,100);}
 if(M.F&&M.F.type==='cup'&&cupById(M.F.cup)&&cupById(M.F.cup).kind==='grp')ach('evropa');
 if(RNG()<0.5){const opp=CL(M.sides[1-ui].cid);addNews('🗣️',`Trenér soupeře (${opp.n}): „${rivalQuote(my>th?'post_loss':my<th?'post_win':'post_draw')}"`,1);}}
// ----- živé sázky na souběžný zápas -----
let PM=null;
function pmStart(M){PM=null;if(!M.F||M.F.type==='cup')return;const myLg=myClub().lg;const codes=[myLg].concat(Object.keys(S.leagues).filter(c=>c!==myLg));
 for(const code of codes){const r=lgDue(code);if(r<0)continue;const fx=(S.leagues[code].fix[r]||[]).filter(f=>f[0]!==S.clubId&&f[1]!==S.clubId);if(!fx.length)continue;const f=fx.slice().sort((a,b)=>clubStr(b[0])+clubStr(b[1])-clubStr(a[0])-clubStr(a[1]))[0];
  const save={};[...clubPlayers(f[0]),...clubPlayers(f[1])].forEach(p=>save[p.id]=[p.cond,p.inj,p.sus]);
  const pm=createMatch(f[0],f[1],{h:f[0],a:f[1],type:'lg',code,r});pm.code=code;pm.r=r;pm._save=save;PM={M:pm,bets:[],done:0};S.v4.pmRefund=0;return;}}
function pmTick(M){if(!PM||PM.done)return;const pm=PM.M;let g=0;while(!pm.ended&&pm.min<M.min&&g++<5){stepMinute(pm);}}
function pmEnd(){if(!PM||PM.done)return;const pm=PM.M;let g=0;while(!pm.ended&&g++<300)stepMinute(pm);PM.done=1;
 const sc={};sc[pm.h.cid]=[];sc[pm.a.cid]=[];pm.ev.filter(e=>e.t==='goal').forEach(e=>sc[pm.sides[e.s].cid].push(e.p));
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
 ${Object.entries(TALK).map(([k,t])=>`<button class="btn ghost big" style="margin-bottom:8px;text-align:left" onclick="htApply('${k}')">${t[0]} <b>${t[1]}</b><div class="tiny mut">„${t[2]}"</div></button>`).join('')}`);}
function htApply(k){if(!MS)return closeModal();const r=talkEff(MS.M,k,1);closeModal();MS.M.ev.push({m:45,t:'ht',tx:'🗣️ '+r.tx});try{updLive();}catch(e){}toast(r.tx);}
function talkSeg(){const t=UI.talk||'';return `<div class="small" style="margin-top:8px">🗣️ Proslov v kabině před zápasem:</div><div class="seg" style="margin-top:4px">${Object.entries(TALK).map(([k,x])=>`<button class="${t===k?'on':''}" onclick="UI.talk='${k}';this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${x[0]} ${x[1]}</button>`).join('')}</div>`;}
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
 for(let i=0;i<2&&pool.length;i++){const sm=clubStr(S.clubId);const cand=pool.filter(r=>Math.abs(clubStr(r)-sm)<=8);const o=pick(cand.length?cand:pool);const [xh,xa]=xgPair(strOf(S.clubId),strOf(o));const gh=poisson(xh),ga=poisson(xa);res.push(`${CL(o).n} ${gh}:${ga}`);S.cohesion=clamp(S.cohesion+2,0,100);}
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
 return `<div class="card" style="padding:10px 12px;border-color:var(--gold)"><div class="small">🎩 <b>Tip týdne</b> od Vlasty, který sází už čtyřicet let:</div><div class="row small" style="margin-top:6px"><span style="flex:1;min-width:0"><b>${esc(midTitle(t.mid))}</b><div class="tiny mut">${MK_LBL[t.mk]} · „${t.o<1.6?'Tohle je jistota, na to bych vsadil i chalupu.':'Kurz má hodnotu, tady bych to risknul.'}"</div></span><b class="gold">${czOdd(t.o)}</b><button class="btn ghost sm" style="min-height:44px;margin-left:6px" onclick="toast(addToSlip('${t.mid}','${t.mk}')||'Přidáno na sázenku.');saveGame();render()">Vsadit</button></div>${st[0]?`<div class="tiny mut" style="margin-top:4px">Vlastovy tipy: ${st[1]} z ${st[0]} vyšlo.</div>`:''}</div>`;}
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
const FIXL={1:['Nenápadně','Pár zaváhání v obraně, nic okatého. Menší šance na úspěch, menší riziko.',5],2:['Okatě','Hráči hrají vyloženě na prohru. Výrazně vyšší šance na „správný" výsledek, ale velké riziko odhalení.',14]};
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
 modal(`<h2>🕴️ Nabídka „prodat" zápas</h2><div class="small mut" style="margin-bottom:8px">Satirická herní mechanika, jen s herními penězi. Ve skutečném fotbale je ovlivňování zápasů trestný čin.</div>
 <div class="card" style="padding:10px 12px"><div class="small">Muž z podezřelé sázkařské skupiny ti nabízí peníze na osobní konto, když zápas dopadne podle jejich přání. Záloha 30 % hned, zbytek po zápase. <b>Když to nevyjde, budou chtít zálohu zpátky i s úroky.</b></div></div>
 <div class="small" style="margin:8px 0 4px"><b>Co chtějí</b></div>${opt(Object.entries(FIXK).map(([k,x])=>[k,x[0]+' · '+fmtMoney(fixPay(k)),x[1]]),d.k,'fixPickK')}
 <div class="small" style="margin:8px 0 4px"><b>Jak moc to hrát</b></div>${opt(Object.entries(FIXL).map(([k,x])=>[+k,x[0],x[1]]),d.l,'fixPickL')}
 <div class="small" style="margin:8px 0 4px"><b>Vsadit si proti vlastnímu týmu</b> <span class="tiny mut">(kurz na soupeře ${czOdd(od)})</span></div><div class="grid2" style="gap:6px">${FIX_BETS.map(b=>`<button class="btn ${d.bet===b?'gold':'ghost'}" ${b>S.wallet?'disabled':''} onclick="fixPickB(${b})">${b?fmtMoney(b):'Nesázet'}</button>`).join('')}</div>
 <div class="small" style="margin-top:10px">Riziko odhalení: <b class="${fixRisk(d)>35?'bad':'warn'}">${fixRisk(d)} %</b> · podezření svazu: ${fixHeatTxt()}${f.conv?` · dřívější tresty: ${f.conv}`:''}</div>
 <div class="tiny mut" style="margin-top:4px">Poctiví hráči (profesionálové a vůdci) můžou odmítnout a věc vynést ven. Sázka proti sobě riziko výrazně zvyšuje.</div>
 <div class="grid2" style="margin-top:10px;gap:8px">${deal?`<button class="btn ghost" onclick="fixCancel()">Zrušit dohodu</button>`:`<button class="btn ghost" onclick="UI.fxd=null;closeModal();preMatch()">Odmítnout</button>`}<button class="btn gold" onclick="fixAccept()">${deal?'Upravit dohodu':'Domluvit'}</button></div>`);}
function fixPickK(k){UI.fxd.k=k;fixSheet();}function fixPickL(l){UI.fxd.l=l;fixSheet();}function fixPickB(b){if(b>S.wallet)return;UI.fxd.bet=b;fixSheet();}
function fixAccept(){const d=UI.fxd;if(!d)return;UI.fix={k:d.k,l:d.l,bet:d.bet,pay:fixPay(d.k),odd:fixOppOdd(UI.F)};UI.fxd=null;closeModal();toast('Dohodnuto. Teď už není cesty zpět…');preMatch();}
function fixCancel(){const x=UI.fix;UI.fix=null;UI.fxd=null;if(x&&!x.forced){const f=fixS();f.pr={owe:Math.round(x.pay*0.3/100)*100,forced:null,r:S.round,s:S.season,why:'cancel'};addNews('📞','Telefonát z neznámého čísla: „Dohoda je dohoda, trenére. Za zrušení se platí."');}closeModal();preMatch();}
function fixOfferCard(F){const f=fixS();if(!F||f.ban||UI.fix||(f.pr&&f.pr.owe))return '';const h=hashStr('of'+S.season+'|'+S.round+'|'+F.h+F.a)%100;if(h>=13||UI.fixNo===S.round+'|'+S.season)return '';
 return `<div class="card" style="padding:10px 12px;border-color:var(--warn,#e9b949)"><div class="small">📞 <b>Neznámé číslo:</b> „Trenére, máme pro vás nabídku na ${fmtMoney(fixPay('lose'))}. Stačí, když zítra prohrajete."</div><div class="grid2" style="margin-top:8px;gap:8px"><button class="btn ghost" onclick="fixRefuse()">Odmítnout</button><button class="btn ghost" onclick="fixSheet()">Vyslechnout</button></div></div>`;}
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
function fixSettle(M){const f=fixS();if(f.ban>0){f.ban--;if(!f.ban)addNews('✅','Trest skončil, trenér se vrací na lavičku.');}
 const x=M.fix;if(!x||x._done)return;x._done=1;const ui=x.side;const my=M.score[ui],th=M.score[1-ui];const ok=fixMet(M);const res=[];
 if(x.bet){if(th>my){const w=Math.round(x.bet*x.odd);S.wallet+=w;res.push(`Sázka proti vlastnímu týmu vyšla: +${fmtMoney(w)}.`);}else res.push(`Sázka proti vlastnímu týmu propadla (−${fmtMoney(x.bet)}).`);}
 if(x.forced){if(!f.pr){}else if(ok){f.pr=null;res.push('Mafie je spokojená, dluh je smazaný.');}else{f.pr.owe=Math.round(f.pr.owe*1.3/100)*100;f.pr.forced=null;res.push('Ani tentokrát to nevyšlo. Dluh u mafie roste.');}}
 else if(ok){const rest=x.pay-x.adv;S.wallet+=rest;res.push(`„Obchod" vyšel: celkem ${fmtMoney(x.pay)} na osobní konto.`);f.ok++;}
 else{const owe=x.adv*2;f.pr={owe,forced:null,r:S.round,s:S.season,why:'fail'};res.push(`Zápas nedopadl podle dohody. Mafie chce zpátky ${fmtMoney(owe)}.`);addNews('📞',`Výhrůžný telefonát: „Trenére, dohodli jsme se jinak. Do příštího zápasu chceme ${fmtMoney(owe)}."`);}
 x.ref.forEach(id=>{const p=P(id);if(p){p.hap=clamp((p.hap||60)-12,0,100);addNews('🙅',`${p.n} odmítl hrát na prohru a v kabině je dusno.`,1);}});
 const obvious=(x.fav>3&&th-my>=3)||x.l===2;let risk=4+8*x.l+(x.bet?14+x.bet/700:0)+f.heat*5+f.conv*6+(obvious?12:0)+x.ref.length*8;risk=clamp(risk,0,92);
 if(RNG()*100<risk){const sev=x.l+(x.bet?1:0)+(obvious?1:0)+(x.ref.length?1:0);f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(3,5),st:0,sev,opp:CL(M.sides[1-ui].cid).n,sc:my+':'+th,bet:x.bet});}
 else if(ok)ach('prodano');
 if(th>my&&obvious)fansAdd(-5,'Fanoušci po zápase pískali: „Prodali jste to!" Na tribunách to vřelo.');
 M._fixRes={ok,res};}
function fixWeek(){const f=fixS();f.heat=Math.max(0,f.heat-0.1);
 for(const c of f.cases.slice()){if(c.s<S.season){c.s=S.season;c.r0=Math.min(c.r0,1);c.r1=Math.max(2,c.r1-S.maxRound);}
  if(c.st===0&&S.round>=c.r0){c.st=1;addNews('🔎',`Disciplinární komise zahájila prošetřování podezřelých sázek na zápas s týmem ${c.opp} (${c.sc}). Kurzy se před zápasem hýbaly podivně.`);fansAdd(-3);S.boardTrust=clamp(S.boardTrust-4,0,100);}
  else if(c.st===1&&S.round>=c.r1){f.cases=f.cases.filter(z=>z!==c);const guilty=RNG()<clamp(0.35+0.08*c.sev+(c.bet?0.1:0)+0.05*f.conv,0,0.85);
   if(!guilty){addNews('📁',`Disciplinární komise zastavila řízení kvůli nedostatku důkazů. Pověst ale utrpěla.`);fansAdd(-3);if(S.v4)S.v4.mrep=clamp(S.v4.mrep-3,0,100);continue;}
   const me=myClub();const sev=c.sev+f.conv;const fine=Math.round(clamp((me.tv||0)*4*sev,150000,Math.max(300000,(me.money||0)*0.15))/1e4)*1e4;const L0=S.leagues[me.lg];const dedSo=L0&&L0.dedS===S.season?(L0.ded||0):0;const ded=Math.max(0,Math.min(2+2*c.sev+f.conv,9,15-dedSo));const ban=Math.min(8,1+c.sev+f.conv);
   money(-fine,'prize','Pokuta za ovlivňování zápasu');const L=S.leagues[me.lg];if(L&&L.table&&L.table[S.clubId]){L.table[S.clubId].pts-=ded;if(L.dedS!==S.season){L.dedS=S.season;L.ded=0;}L.ded=(L.ded||0)+ded;}
   f.ban=Math.max(f.ban,ban);f.conv++;if(S.v4)S.v4.mrep=clamp(S.v4.mrep-8*sev,0,100);fansAdd(-(12+5*sev));S.boardTrust=clamp(S.boardTrust-(18+8*sev),0,100);
   clubPlayers(S.clubId).forEach(p=>{p.hap=clamp((p.hap||60)-8,0,100);p.mor=clamp((p.mor||60)-8,0,100);});S.scandal={s:S.season,r:S.round,l:Math.min(3,sev),fix:1};ach('chycen');
   addNews('🚨',`SKANDÁL! Trenér ${S.manager} usvědčen z prodeje zápasu s týmem ${c.opp}. Trest: pokuta ${fmtMoney(fine)}, odečet ${ded} bodů a zákaz vedení týmu na ${ban} ${czPlural(ban,'zápas','zápasy','zápasů')}.`);
   if(sev>=4||f.conv>=3||S.boardTrust<=0){S.sackNow=1;S.sackWhy='Po usvědčení z prodeje zápasu';}}}
 const p=f.pr;if(p&&p.owe&&p.forced==null&&(S.round-p.r>=3||p.s<S.season)){p.r=S.round;p.s=S.season;fixMafiaHit();}}
function fixMafiaHit(){const f=fixS();const r=RNG();const ps=clubPlayers(S.clubId);
 if(r<0.35){const loss=Math.min(S.wallet,Math.round(f.pr.owe*0.5/100)*100);S.wallet-=loss;addNews('🔥',`Někdo ti v noci podpálil auto. Škoda ${fmtMoney(loss)} z osobního konta. Vzkaz za stěračem: „Dluh trvá."`);}
 else if(r<0.7){ps.forEach(p=>p.mor=clamp((p.mor||60)-6,0,100));addNews('😨','Před tréninkem postávali neznámí muži a hráčům vyhrožovali. Nálada v kabině je pod psa.');}
 else{f.cases.push({s:S.season,r0:S.round+1,r1:S.round+rint(2,4),st:0,sev:2,opp:'neznámým soupeřem',sc:'?',bet:0});addNews('📰','Novináři dostali anonymní tip na trenéra, který „spolupracuje se sázkaři". Začíná se o tom mluvit.');}}
function fixPay2(){const f=fixS();const p=f.pr;if(!p)return;if(S.wallet<p.owe){toast('Na osobním kontě nemáš dost peněz.');return;}S.wallet-=p.owe;f.pr=null;addNews('💸','Dluh u sázkařské mafie je splacený. Snad už dají pokoj.');saveGame();render();}
function fixThrow(){const f=fixS();if(!f.pr)return;f.pr.forced=1;toast('Příští zápas máš „prohrát". Dluh se tím smaže.');saveGame();render();}
function fixDefy(){const f=fixS();if(!f.pr)return;f.pr.r=S.round;fixMafiaHit();if(RNG()<0.5){f.pr=null;addNews('🛡️','Mafie po čase přestala volat. Prý našla jiného trenéra.');}saveGame();render();}
function fixHomeCard(){const f=fixS();let h='';const p=f.pr;
 if(p&&p.owe&&p.forced==null)h+=`<div class="card" style="border-color:var(--red,#e5484d)"><h3>📞 Mafie chce peníze</h3><div class="small">${p.why==='cancel'?'Zrušil jsi domluvený zápas.':'Prodaný zápas nedopadl podle dohody.'} Chtějí ${fmtMoney(p.owe)}. Na osobním kontě máš ${fmtMoney(S.wallet)}.</div>
  <button class="btn ghost w100" style="margin-top:8px" onclick="fixPay2()">💸 Zaplatit ${fmtMoney(p.owe)}</button><button class="btn ghost w100" style="margin-top:6px" onclick="fixThrow()">🎭 Prohrát příští zápas místo placení</button><button class="btn ghost w100" style="margin-top:6px" onclick="fixDefy()">🙅 Odmítnout a riskovat</button></div>`;
 else if(p&&p.forced===1)h+=`<div class="card" style="padding:10px 12px"><div class="small">🎭 Mafie čeká, že příští zápas prohraješ. Dluh: ${fmtMoney(p.owe)}.</div></div>`;
 if(f.ban>0)h+=`<div class="card" style="padding:10px 12px"><div class="small">⛔ <b>Zákaz vedení týmu:</b> ještě ${f.ban} ${czPlural(f.ban,'zápas','zápasy','zápasů')}. Tým vede asistent a zápasy se hrají bez tebe.</div></div>`;
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
 const _ph=v4PreHtml;v4PreHtml=function(F){let x='';try{const f=fixS();x=fixOfferCard(F);if(f.pr&&f.pr.forced===1&&!UI.fix)UI.fix={k:'lose',l:1,bet:0,pay:0,odd:1,forced:1};if(UI.fix)x+=`<div class="card" style="padding:8px 12px"><div class="small">🕴️ Domluveno: <b>${esc(FIXK[UI.fix.k][0].toLowerCase())}</b>, ${esc(FIXL[UI.fix.l][0].toLowerCase())}${UI.fix.bet?`, sázka proti sobě ${fmtMoney(UI.fix.bet)}`:''}.</div></div>`;if(f.ban>0)x+=`<div class="card" style="padding:8px 12px"><div class="small">⛔ Máš zákaz vedení týmu. Zápas se odehraje bez tebe.</div></div>`;}catch(e){}return x+_ph(F);};
 const _hc=v4HomeCards;v4HomeCards=function(){let h='';try{h=fixHomeCard();}catch(e){}return h+_hc();};
 const _wk=v4Week;v4Week=function(){_wk();try{fixWeek();}catch(e){console.warn(e);}};
 const _sl=startLive;startLive=function(){if(S.fix&&S.fix.ban>0){toast('Máš zákaz vedení týmu, zápas se odehraje bez tebe.');return quickPlay();}return _sl();};
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
function fxGoal(M,j,tx,out,shooter){const sd=M.sides[j];const sh=shooter||shooterOf(sd);if(!sh)return;M.score[j]++;M.stats[j].sh++;M.stats[j].sot++;M.stats[j].xg+=0.45;fxRat(sh.id,0.8,M);
 const e={m:M.min,t:'goal',s:j,p:sh.id,pen:false,tx:tx.replace('{S}',pSurname(sh)),sc:M.score.slice(),fx:1};out.push(e);if(M._firstG==null)M._firstG=j;}
function pickDef(sd){const ids=onPitch(sd).filter(id=>GRP(P(id).pos)==='D');return P(pick(ids.length?ids:onPitch(sd)));}
const FXT={gk:['⚽ GÓL! Nevídaná hrubka: {K} pustil lehkou střelu, kterou poslal {S}, mezi rukama do sítě.','⚽ GÓL! {K} vyběhl z branky naprosto zbytečně a {S} míč jen poslal do prázdné sítě.','⚽ GÓL! {K} chtěl kličkovat ve vlastním vápně, přišel o míč a {S} skóroval.'],
 og:['⚽ GÓL! Vlastní gól! {D} si nešťastně, nebo možná šťastně, srazil centr do vlastní branky. Zapsán je {S}, který centroval.','⚽ GÓL! {D} odvracel tak nešikovně, že míč skončil ve vlastní síti. Gól připsán hráči {S}.'],
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
 else if(r<0.47){fxGoal(M,o,pick(FXT.og).replace('{D}',D),out);if(df)fxRat(df.id,-1,M);}
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
function lvProbs(M){const tot=M.et?120:90;const rem=M.ended?0:Math.max(0,tot-M.min)/90;let xh=(M.xg?M.xg[0]:1.3)*rem,xa=(M.xg?M.xg[1]:1.1)*rem;
 const rh=(M.h&&M.h.red)||0,ra=(M.a&&M.a.red)||0;xh*=Math.pow(0.78,rh)*Math.pow(1.25,ra);xa*=Math.pow(0.78,ra)*Math.pow(1.25,rh);
 const pf=(l,k)=>{let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f;};const s=M.score;const r={};for(const k in LV_MK)r[k]=0;let t=0;
 for(let i=0;i<9;i++)for(let j=0;j<9;j++){const p=pf(xh,i)*pf(xa,j);t+=p;const a=s[0]+i,b=s[1]+j,n=a+b;r[a>b?'1':a===b?'X':'2']+=p;r[n>1?'o15':'u15']+=p;r[n>2?'o25':'u25']+=p;r[n>3?'o35':'u35']+=p;r[a>0&&b>0?'gg':'ng']+=p;}
 for(const k in r)r[k]/=t||1;const l=xh+xa;const p0=Math.exp(-l);r.nx_0=p0;r.nx_h=l>0?(1-p0)*xh/l:0;r.nx_a=l>0?(1-p0)*xa/l:0;return r;}
function lvOdd(p){return clamp(chOdd(p),1.01,50);}
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
function volLive(M,w){const h=M.h.cid,a=M.a.cid,seed=h+a+S.season;const base=volPre(h,a,seed);const lp=lvProbs(M);const f=1+Math.min(M.min,95)/40;const bl=Math.min(0.7,M.min/90*0.8);
 const pre=base.res.map(x=>x/base.pool);const lv=volSplit(lp,seed+'l'+Math.floor(M.min/5),['1','X','2']);const sh=pre.map((x,i)=>x*(1-bl)+lv[i]*bl);const pool=base.pool*f;
 const res=sh.map(x=>Math.round(pool*x/10)*10);const ouPre=base.ou.map(x=>x/(base.ou[0]+base.ou[1]||1));const ol=volSplit(lp,seed+'q'+Math.floor(M.min/5),['o25','u25']);const ou=ouPre.map((x,i)=>Math.round(pool*0.45*(x*(1-bl)+ol[i]*bl)/10)*10);
 const nx=volSplit(lp,seed+'n'+lvGoals(M).length,['nx_h','nx_0','nx_a']).map(x=>Math.round(pool*0.2*Math.min(1,M.min/20+0.2)*x/10)*10);
 for(const b of lvList(w)){const k={'1':[res,0],'X':[res,1],'2':[res,2],o25:[ou,0],u25:[ou,1],nx_h:[nx,0],nx_0:[nx,1],nx_a:[nx,2]}[b.mk];if(k)k[0][k[1]]+=b.stake;}
 return {res,ou,nx};}
function volBar(vals,labels){const t=vals.reduce((x,y)=>x+y,0)||1;const cls=['vb1','vbx','vb2'];
 return `<div class="vbar">${vals.map((v,i)=>`<span class="${cls[i%3]}" style="width:${Math.max(4,Math.round(v/t*100))}%"></span>`).join('')}</div><div class="vlbl">${vals.map((v,i)=>`<span>${esc(labels[i])} <b>${Math.round(v/t*100)} %</b><small>${fmtMoney(v)}</small></span>`).join('')}</div>`;}
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
function volMini(h,a,mid){try{const v=volPre(h,a,mid);const t=v.res.reduce((x,y)=>x+y,0)||1;return `<div class="vbar">${v.res.map((x,i)=>`<span class="${['vb1','vbx','vb2'][i]}" style="width:${Math.max(4,Math.round(x/t*100))}%"></span>`).join('')}</div><div class="tiny mut" style="margin-top:3px">Vsazeno ${fmtMoney(t)}: domácí ${Math.round(v.res[0]/t*100)} %, remíza ${Math.round(v.res[1]/t*100)} %, hosté ${Math.round(v.res[2]/t*100)} %</div>`;}catch(e){return '';}}

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
function chCalm(){const c=chS();if(c.calm)return;c.calm=1;fansAdd(-3);addNews('📢',`Trenér ${S.manager} vyzval fanoušky, aby podporovali tým bez pyrotechniky a výtržností.`,1);toast('Fanoušci dostali vzkaz. Část kotle je naštvaná, ale riziko výtržností klesá.');if(typeof preMatch==='function'&&document.getElementById('pmgo'))preMatch();}
function chAfter(M){const c=chS();const ui=userSide(M);c.calm=0;
 if(M.chDoors)c.doors=Math.max(0,c.doors-1);else if(M.chSec)c.sec=Math.max(0,c.sec-1);if(M.chAway)c.away=Math.max(0,c.away-1);
 const L=(M.chaos||[]).filter(x=>!x.joy);if(!L.length)return;const me=myClub();const lvl=clamp(Math.exp(((me.rep||60)-60)/15),0.3,4);
 for(const inc of L){const X=CHX[inc.k];const club=S.clubs[M.sides[inc.s].cid];const mine=inc.s===ui;
  let fine=Math.round((20000+rint(0,20000))*(X.f[0]+RNG()*(X.f[1]-X.f[0]))*(inc.pause?2:1)*(inc.ab?5:1)*lvl/1000)*1000;const pun=[];
  if(mine){c.n++;fine=Math.round(fine*(1+0.35*(c.n-1))/1000)*1000;money(-fine,'prize','Pokuta za chování fanoušků');pun.push('pokuta '+fmtMoney(fine));
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


// ---------- boot ----------
window.FM_DATA_VER='911516f8';
(function(){try{if(!loadGame())S=null;var done=function(){render();var sp=document.getElementById('splash');if(sp){sp.classList.add('gone');setTimeout(function(){sp.remove();},450);}};if(S){loadWorld().then(function(){try{postLoad();}catch(e){console.warn(e);}done();},function(e){done();toast(e.message);});}else done();}catch(e){window.__bootErr(e);}})();
