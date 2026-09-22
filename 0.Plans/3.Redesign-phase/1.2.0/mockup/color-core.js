(() => {
 const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const rgba = (hex,alpha) => `rgba(${rgb(hex).join(',')},${alpha})`;
 const mix = (base,tint,weight) => '#'+rgb(base).map((value,i)=>Math.round(value*(1-weight)+rgb(tint)[i]*weight).toString(16).padStart(2,'0')).join('');
 function tokens(palette,mode) {
  const dark=mode==='dark', [paper,ink,muted,accent]=palette[mode], [a,b,c]=palette.colors;
  const solid=mix(paper,dark?'#000000':'#FFFFFF',dark?.04:.52);
  return {
   '--paper':paper,'--ink':ink,'--muted':muted,'--accent':accent,'--solid':solid,
   '--surface':rgba(solid,dark?.85:.78),'--line':rgba('#FFFFFF',dark?.19:.9),'--border':rgba(ink,.14),
   '--mint':mix(solid,a,dark?.25:.28),'--on-accent':dark?paper:'#FFFFFF',
   '--tone-a':a,'--tone-b':b,'--tone-c':c,'--tone-a-soft':mix(solid,a,.23),'--tone-b-soft':mix(solid,b,.21),'--tone-c-soft':mix(solid,c,.22),
   '--ambient-a':rgba(a,dark?.19:.38),'--ambient-b':rgba(b,dark?.16:.30),'--ambient-c':rgba(c,dark?.20:.28),
   '--glow':rgba(a,dark?.18:.20),'--focus':accent,'--status':dark?'#7EDBC1':'#237660',
   '--shadow':`0 18px 42px -23px ${rgba(dark?'#000000':ink,dark?.75:.32)},0 1px 3px ${rgba('#FFFFFF',dark?.08:.35)}`,
   '--shine':rgba('#FFFFFF',dark?.20:.83),'--sheen':rgba('#FFFFFF',dark?.07:.33),
   '--hero-a':rgba(solid,dark?.91:.97),'--hero-b':rgba(mix(solid,a,.2),dark?.86:.72),
   '--dock-a':rgba(mix(solid,a,.1),dark?.92:.89),'--dock-b':rgba(mix(solid,c,.12),dark?.86:.76),
   '--editor-surface':rgba(solid,dark?.95:.94),
   '--danger':dark?'#FFB1BA':'#AA354B','--danger-bg':dark?'#4A2835':'#FBE3E7',
   '--warning':dark?'#EFCE8D':'#765522','--warning-bg':dark?'#3E3525':'#F9EDCE',
   '--success-bg':dark?'#234038':'#E3F2E9','--ring-shadow':rgba(accent,.24),'--backdrop':rgba(paper,dark?.60:.28)
  };
 }
 function apply(palette,mode,target=document.body){
  target.dataset.palette=palette.id;target.dataset.colorMode=mode;
  for(const [key,value] of Object.entries(tokens(palette,mode)))target.style.setProperty(key,value);
 }
 window.ChromaColor={rgb,rgba,mix,tokens,apply,get:id=>CHROMA_PALETTES.find(p=>p.id===id)||CHROMA_PALETTES[0]};
})();
