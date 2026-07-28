
const $=id=>document.getElementById(id);
const BELTS=["White","Yellow Stripe","Yellow","Green Stripe","Green","Blue Stripe","Blue","Red Stripe","Red Belt","Black Stripe"];
let COMMON=[],TECHNIQUES=[],THEORY=[],deck=[],current=null,deckIndex=0,answerShown=false;
let rightCount=0,wrongCount=0,wrongKeys=new Set(JSON.parse(localStorage.getItem("academy_wrong")||"[]"));

function unique(data,key){return [...new Set(data.map(x=>x[key]).filter(Boolean))].sort()}
function fillSelect(select,values,all=true){
  const current=select.value;
  select.innerHTML=(all?'<option value="All">All</option>':'')+values.map(v=>`<option value="${v}">${v}</option>`).join("");
  if([...select.options].some(o=>o.value===current)) select.value=current;
}
function shuffle(items){
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
function cardKey(c){return c.question?`theory|${c.question}`:[c.english,c.korean,c.belt||"",c.category||""].join("|")}

async function load(){
  try{
    [COMMON,TECHNIQUES,THEORY]=await Promise.all([
      fetch("common_terms.json").then(r=>{if(!r.ok)throw Error("common_terms.json missing");return r.json()}),
      fetch("techniques.json").then(r=>{if(!r.ok)throw Error("techniques.json missing");return r.json()}),
      fetch("theory.json").then(r=>{if(!r.ok)throw Error("theory.json missing");return r.json()})
    ]);
    fillSelect($("belt"),BELTS,false);
    restore();
    updateSettings();
  }catch(e){$("deckSummary").textContent="Could not load: "+e.message}
}

function selectPractice(value){
  $("practiceType").value=value;
  document.querySelectorAll(".practice-tile").forEach(b=>b.classList.toggle("active",b.dataset.value===value));
  updateSettings();save();
}
function selectDirection(value){
  $("direction").value=value;
  document.querySelectorAll(".choice-row").forEach(b=>{
    const active=b.dataset.direction===value;b.classList.toggle("active",active);
    b.querySelector(".choice-check").textContent=active?"✓":"○";
  });save();updateSummary();
}
function dataForType(){
  return $("practiceType").value==="common"?COMMON:$("practiceType").value==="techniques"?TECHNIQUES:THEORY;
}
function updateSettings(){
  const type=$("practiceType").value;
  $("directionSection").classList.toggle("hidden",type==="theory");
  $("beltRow").classList.toggle("hidden",type!=="techniques");
  $("scopeRow").classList.toggle("hidden",type!=="techniques");
  fillSelect($("category"),unique(dataForType(),"category"),true);
  updateSummary();
}
function filteredCards(){
  const type=$("practiceType").value;
  let items=[...dataForType()];
  const category=$("category").value;
  if(category&&category!=="All")items=items.filter(x=>x.category===category);
  if(type==="techniques"){
    const belt=$("belt").value,scope=$("scope").value,target=BELTS.indexOf(belt);
    items=items.filter(x=>scope==="only"?x.belt===belt:BELTS.indexOf(x.belt)<=target);
  }
  if($("mode").value==="wrong")items=items.filter(x=>wrongKeys.has(cardKey(x)));
  return items;
}
function updateSummary(){
  const count=filteredCards().length;
  $("deckSummary").textContent=`${count} ${count===1?"card":"cards"} ready`;
}
function save(){
  const values={type:$("practiceType").value,direction:$("direction").value,belt:$("belt").value,scope:$("scope").value,category:$("category").value,mode:$("mode").value};
  localStorage.setItem("academy_settings",JSON.stringify(values));
}
function restore(){
  const s=JSON.parse(localStorage.getItem("academy_settings")||"{}");
  if(s.type)selectPractice(s.type);
  if(s.direction)selectDirection(s.direction);
  ["belt","scope","category","mode"].forEach(k=>{if(s[k]&&[...$(k).options].some(o=>o.value===s[k]))$(k).value=s[k]});
  updateSettings();
}

function startPractice(){
  deck=filteredCards();
  if(!deck.length){$("deckSummary").textContent="No cards match these settings.";return}
  if($("mode").value==="random")deck=shuffle(deck);
  deckIndex=0;rightCount=0;wrongCount=0;
  $("setupScreen").classList.add("hidden");$("practiceScreen").classList.remove("hidden");
  updateTitle();showCard();
}
function updateTitle(){
  const type=$("practiceType").value;
  $("practiceTitle").textContent=type==="common"?"COMMON TERMS":type==="techniques"?"TECHNIQUES":"THEORY";
  $("swipeHint").textContent=type==="theory"?"Swipe left to reveal · left again for next":"Swipe left for next · tap to reveal";
}
function textSize(el,text,kind="term"){
  el.classList.remove("medium","small","xsmall","theory-question","theory-answer");
  const length=(text||"").length;
  if(kind==="theory-question"){
    el.classList.add("theory-question");
    if(length>220)el.classList.add("xsmall");
    else if(length>130)el.classList.add("small");
    else if(length>75)el.classList.add("medium");
    return;
  }
  if(kind==="theory-answer"){
    el.classList.add("theory-answer");
    if(length>700)el.classList.add("xsmall");
    else if(length>420)el.classList.add("small");
    else if(length>230)el.classList.add("medium");
    return;
  }
  if(length>60)el.classList.add("xsmall");
  else if(length>38)el.classList.add("small");
  else if(length>22)el.classList.add("medium");
}
function fitTheoryText(el){
  requestAnimationFrame(()=>{
    const classes=["medium","small","xsmall"];
    let i=0;
    while(el.scrollHeight>el.clientHeight&&i<classes.length){
      el.classList.add(classes[i++]);
    }
  });
}
function showCard(){
  current=deck[deckIndex%deck.length];answerShown=false;
  $("frontContent").classList.remove("hidden");$("backContent").classList.add("hidden");
  const type=$("practiceType").value;
  if(type==="theory"){
    $("question").textContent=current.question;
    textSize($("question"),current.question,"theory-question");
    $("hangul").textContent="";
    $("answerWord").textContent=current.answer;
    textSize($("answerWord"),current.answer,"theory-answer");
    $("answerDetails").textContent="";
    $("audioButton").classList.add("hidden");
    fitTheoryText($("question"));
  }else{
    const koFirst=$("direction").value==="ko2en";
    const q=koFirst?current.korean:current.english;
    const a=koFirst?current.english:current.korean;
    $("question").textContent=q;textSize($("question"),q);
    $("hangul").textContent=koFirst?(current.hangul||""):"";
    $("answerWord").textContent=a;textSize($("answerWord"),a);
    $("answerDetails").textContent=!koFirst&&current.hangul?current.hangul:"";
    $("audioButton").classList.toggle("hidden",!koFirst);
  }
  // Technique cards show the belt only. Category is deliberately hidden.
  const belt=type==="techniques"?(current.belt||""):"";
  $("beltBadge").textContent=belt;
  $("beltBadge").classList.toggle("hidden",!belt);
  updateProgress();animateCard();
}
function animateCard(){
  const c=$("flashcard");c.classList.remove("card-pop");void c.offsetWidth;c.classList.add("card-pop");
}
function toggleAnswer(){
  if(!current)return;
  answerShown=!answerShown;
  $("frontContent").classList.toggle("hidden",answerShown);
  $("backContent").classList.toggle("hidden",!answerShown);
  if($("practiceType").value==="theory"&&answerShown)fitTheoryText($("answerWord"));
  if($("practiceType").value!=="theory"){
    const koreanVisible=$("direction").value==="ko2en"||answerShown;
    $("audioButton").classList.toggle("hidden",!koreanVisible);
  }
}
function nextCard(){
  const c=$("flashcard");c.classList.add("card-exit");
  setTimeout(()=>{c.classList.remove("card-exit");deckIndex=(deckIndex+1)%deck.length;showCard()},150);
}
function grade(correct){
  if(!current)return;
  const key=cardKey(current);
  if(correct){rightCount++;wrongKeys.delete(key)}else{wrongCount++;wrongKeys.add(key)}
  localStorage.setItem("academy_wrong",JSON.stringify([...wrongKeys]));
  updateStats();nextCard();
}
function updateProgress(){
  $("progressCount").textContent=`${deckIndex+1} / ${deck.length}`;
  $("progressBar").style.width=`${((deckIndex+1)/deck.length)*100}%`;
  updateStats();
}
function updateStats(){$("stats").textContent=`${rightCount} right · ${wrongCount} wrong`}
function speak(){
  if(!current||$("practiceType").value==="theory")return;
  const text=current.hangul||current.korean;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.lang=current.hangul?"ko-KR":"en-NZ";u.rate=.82;speechSynthesis.speak(u);
}
function backToSettings(){
  $("practiceScreen").classList.add("hidden");$("setupScreen").classList.remove("hidden");save();updateSummary();
}

document.querySelectorAll(".practice-tile").forEach(b=>b.addEventListener("click",()=>selectPractice(b.dataset.value)));
document.querySelectorAll(".choice-row").forEach(b=>b.addEventListener("click",()=>selectDirection(b.dataset.direction)));
["belt","scope","category","mode"].forEach(id=>$(id).addEventListener("change",()=>{save();updateSummary()}));
$("startButton").addEventListener("click",startPractice);
$("backButton").addEventListener("click",backToSettings);$("settingsButton").addEventListener("click",backToSettings);
$("flashcard").addEventListener("click",toggleAnswer);
$("wrongButton").addEventListener("click",()=>grade(false));$("rightButton").addEventListener("click",()=>grade(true));
$("audioButton").addEventListener("click",e=>{e.stopPropagation();speak()});

let touchX=0,touchY=0;
$("flashcard").addEventListener("touchstart",e=>{touchX=e.changedTouches[0].screenX;touchY=e.changedTouches[0].screenY},{passive:true});
$("flashcard").addEventListener("touchend",e=>{
  const dx=e.changedTouches[0].screenX-touchX,dy=e.changedTouches[0].screenY-touchY;
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy))return;
  if(dx<0){
    if($("practiceType").value==="theory"&&!answerShown)toggleAnswer();else nextCard();
  }else toggleAnswer();
},{passive:true});
document.addEventListener("keydown",e=>{
  if($("practiceScreen").classList.contains("hidden"))return;
  if(e.key==="Enter")toggleAnswer();
  if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();if($("practiceType").value==="theory"&&!answerShown)toggleAnswer();else nextCard()}
  if(e.key==="ArrowUp")grade(true);if(e.key==="ArrowDown")grade(false);if(e.key==="Escape")backToSettings();
});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
load();
