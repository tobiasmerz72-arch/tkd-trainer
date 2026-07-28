const $=id=>document.getElementById(id);
const BELTS=["White","Yellow Stripe","Yellow","Green Stripe","Green","Blue Stripe","Blue","Red Stripe","Red Belt","Black Stripe"];
const LEARNING_KEY="academy_learning_v5";
let COMMON=[],TECHNIQUES=[],THEORY=[],deck=[],current=null,deckIndex=0,answerShown=false;
let rightCount=0,wrongCount=0,sessionSeen=new Set();
let wrongKeys=new Set(JSON.parse(localStorage.getItem("academy_wrong")||"[]"));
let learning=JSON.parse(localStorage.getItem(LEARNING_KEY)||"{}");


function haptic(pattern=12){
  try{if("vibrate" in navigator)navigator.vibrate(pattern)}catch(_){}
}
function hideLaunchScreen(){
  const launch=$("launchScreen");
  if(!launch)return;
  requestAnimationFrame(()=>launch.classList.add("launch-hidden"));
  setTimeout(()=>launch.remove(),650);
}

function unique(data,key){return [...new Set(data.map(x=>x[key]).filter(Boolean))].sort()}
function fillSelect(select,values,all=true){
  const currentValue=select.value;
  select.innerHTML=(all?'<option value="All">All</option>':'')+values.map(v=>`<option value="${v}">${v}</option>`).join("");
  if([...select.options].some(o=>o.value===currentValue))select.value=currentValue;
}
function shuffle(items){
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
function cardKey(c){return c.question?`theory|${c.question}`:[c.english,c.korean,c.belt||"",c.category||""].join("|")}
function recordFor(card){
  const key=cardKey(card);
  return learning[key]||{right:0,wrong:0,streak:0,last:0};
}
function isMastered(card){
  const r=recordFor(card),attempts=r.right+r.wrong;
  return attempts>=3&&r.streak>=3&&r.right/attempts>=.8;
}
function masteryPercent(items){
  if(!items.length)return 0;
  return Math.round(items.filter(isMastered).length/items.length*100);
}
function saveLearning(){localStorage.setItem(LEARNING_KEY,JSON.stringify(learning))}

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
function filteredCards(ignoreMode=false){
  const type=$("practiceType").value;
  let items=[...dataForType()];
  const category=$("category").value;
  if(category&&category!=="All")items=items.filter(x=>x.category===category);
  if(type==="techniques"){
    const belt=$("belt").value,scope=$("scope").value,target=BELTS.indexOf(belt);
    items=items.filter(x=>scope==="only"?x.belt===belt:BELTS.indexOf(x.belt)<=target);
  }
  if(!ignoreMode&&$("mode").value==="wrong")items=items.filter(x=>wrongKeys.has(cardKey(x)));
  return items;
}
function updateSummary(){
  const items=filteredCards();
  const count=items.length;
  if($("mode").value==="smart"){
    const mastered=items.filter(isMastered).length;
    $("deckSummary").textContent=`${count} cards · ${mastered} mastered · ${masteryPercent(items)}% complete`;
  }else{
    $("deckSummary").textContent=`${count} ${count===1?"card":"cards"} ready`;
  }
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
function smartDeck(items){
  const active=[],mastered=[];
  shuffle(items).forEach(card=>(isMastered(card)?mastered:active).push(card));
  active.sort((a,b)=>{
    const ra=recordFor(a),rb=recordFor(b);
    const scoreA=ra.wrong*3-ra.right+Math.random()*3;
    const scoreB=rb.wrong*3-rb.right+Math.random()*3;
    return scoreB-scoreA;
  });
  return [...active,...shuffle(mastered)];
}

function startPractice(){
  const items=filteredCards();
  if(!items.length){$("deckSummary").textContent="No cards match these settings.";return}
  const mode=$("mode").value;
  deck=mode==="smart"?smartDeck(items):mode==="random"?shuffle(items):[...items];
  deckIndex=0;rightCount=0;wrongCount=0;sessionSeen=new Set();
  $("setupScreen").classList.add("hidden");$("practiceScreen").classList.remove("hidden");
  updateTitle();showCard();
}
function updateTitle(){
  const type=$("practiceType").value;
  $("practiceTitle").textContent=type==="common"?"COMMON TERMS":type==="techniques"?"TECHNIQUES":"THEORY";
  $("swipeHint").textContent="Tap to flip · swipe left for next · swipe right for previous";
}
function textSize(el,text,kind="term"){
  el.classList.remove("medium","small","xsmall","theory-question","theory-answer");
  const length=(text||"").length;
  if(kind==="theory-question"){
    el.classList.add("theory-question");
    if(length>220)el.classList.add("xsmall");else if(length>130)el.classList.add("small");else if(length>75)el.classList.add("medium");
    return;
  }
  if(kind==="theory-answer"){
    el.classList.add("theory-answer");
    if(length>700)el.classList.add("xsmall");else if(length>420)el.classList.add("small");else if(length>230)el.classList.add("medium");
    return;
  }
  if(length>60)el.classList.add("xsmall");else if(length>38)el.classList.add("small");else if(length>22)el.classList.add("medium");
}
function fitTheoryText(el){
  requestAnimationFrame(()=>{
    const classes=["medium","small","xsmall"];let i=0;
    while(el.scrollHeight>el.clientHeight&&i<classes.length)el.classList.add(classes[i++]);
  });
}
function showCard(){
  current=deck[deckIndex%deck.length];answerShown=false;sessionSeen.add(cardKey(current));
  $("flashcard").classList.remove("is-flipped");
  $("flashcard").setAttribute("aria-label","Flash card. Tap to reveal the answer.");
  const type=$("practiceType").value;
  if(type==="theory"){
    $("question").textContent=current.question;textSize($("question"),current.question,"theory-question");
    $("hangul").textContent="";$("answerWord").textContent=current.answer;textSize($("answerWord"),current.answer,"theory-answer");
    $("answerDetails").textContent="";$("audioButton").classList.add("hidden");fitTheoryText($("question"));
  }else{
    const koFirst=$("direction").value==="ko2en",q=koFirst?current.korean:current.english,a=koFirst?current.english:current.korean;
    $("question").textContent=q;textSize($("question"),q);$("hangul").textContent=koFirst?(current.hangul||""):"";
    $("answerWord").textContent=a;textSize($("answerWord"),a);$("answerDetails").textContent=!koFirst&&current.hangul?current.hangul:"";
    $("audioButton").classList.toggle("hidden",!koFirst);
  }
  const belt=type==="techniques"?(current.belt||""):"";
  $("beltBadge").textContent=belt;$("beltBadge").classList.toggle("hidden",!belt);
  updateProgress();animateCard();
}
function animateCard(){const c=$("flashcard");c.classList.remove("card-pop");void c.offsetWidth;c.classList.add("card-pop")}
function toggleAnswer(){
  if(!current)return;haptic(8);answerShown=!answerShown;$("flashcard").classList.toggle("is-flipped",answerShown);
  $("flashcard").setAttribute("aria-label",answerShown?"Answer shown. Tap to return to the question.":"Flash card. Tap to reveal the answer.");
  if($("practiceType").value==="theory"&&answerShown)fitTheoryText($("answerWord"));
  if($("practiceType").value!=="theory"){
    const koreanVisible=$("direction").value==="ko2en"||answerShown;$("audioButton").classList.toggle("hidden",!koreanVisible);
  }
}
function moveCard(direction){
  if(!deck.length)return;haptic(6);const c=$("flashcard"),exitClass=direction>0?"card-exit-left":"card-exit-right";c.classList.add(exitClass);
  setTimeout(()=>{c.classList.remove(exitClass);deckIndex=(deckIndex+direction+deck.length)%deck.length;showCard()},190);
}
function nextCard(){moveCard(1)}function previousCard(){moveCard(-1)}
function scheduleReview(card,correct){
  if($("mode").value!=="smart")return;
  const rec=recordFor(card);
  let delay=null;
  if(!correct)delay=3+Math.floor(Math.random()*3);
  else if(!isMastered(card)&&rec.streak<3)delay=8+Math.floor(Math.random()*5);
  if(delay===null)return;
  const insertAt=Math.min(deck.length,deckIndex+delay);
  const nearby=deck.slice(Math.max(0,insertAt-2),insertAt+2).some(c=>cardKey(c)===cardKey(card));
  if(!nearby)deck.splice(insertAt,0,card);
}
function grade(correct){
  if(!current)return;haptic(correct?18:[18,45,18]);
  const key=cardKey(current),old=recordFor(current);
  const updated={right:old.right+(correct?1:0),wrong:old.wrong+(correct?0:1),streak:correct?old.streak+1:0,last:Date.now()};
  learning[key]=updated;saveLearning();
  if(correct){rightCount++;wrongKeys.delete(key)}else{wrongCount++;wrongKeys.add(key)}
  localStorage.setItem("academy_wrong",JSON.stringify([...wrongKeys]));
  scheduleReview(current,correct);updateStats();nextCard();
}
function updateProgress(){
  const percent=Math.round(((deckIndex+1)/deck.length)*100);
  $("progressCount").textContent=`${deckIndex+1} / ${deck.length} · ${percent}%`;$("progressBar").style.width=`${percent}%`;updateStats();
}
function updateStats(){
  const base=`${rightCount} right · ${wrongCount} wrong`;
  if($("mode").value==="smart"){
    const items=filteredCards(true),mastered=items.filter(isMastered).length;
    $("stats").textContent=`${base} · ${mastered}/${items.length} mastered (${masteryPercent(items)}%)`;
  }else $("stats").textContent=base;
}
function speak(){
  if(!current||$("practiceType").value==="theory")return;
  const text=current.hangul||current.korean;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=current.hangul?"ko-KR":"en-NZ";u.rate=.82;speechSynthesis.speak(u);
}
function backToSettings(){$("practiceScreen").classList.add("hidden");$("setupScreen").classList.remove("hidden");save();updateSummary()}
function resetProgress(){
  if(!confirm("Reset all Smart Learning progress and the Wrong-only list?"))return;
  learning={};wrongKeys=new Set();localStorage.removeItem(LEARNING_KEY);localStorage.removeItem("academy_wrong");updateSummary();
  $("deckSummary").textContent="Learning progress reset.";
}

document.querySelectorAll(".practice-tile").forEach(b=>b.addEventListener("click",()=>selectPractice(b.dataset.value)));
document.querySelectorAll(".choice-row").forEach(b=>b.addEventListener("click",()=>selectDirection(b.dataset.direction)));
["belt","scope","category","mode"].forEach(id=>$(id).addEventListener("change",()=>{save();updateSummary()}));
$("startButton").addEventListener("click",startPractice);$("resetProgressButton").addEventListener("click",resetProgress);
$("backButton").addEventListener("click",backToSettings);$("settingsButton").addEventListener("click",backToSettings);
let suppressCardClick=false;
$("flashcard").addEventListener("click",()=>{if(suppressCardClick){suppressCardClick=false;return}toggleAnswer()});
$("wrongButton").addEventListener("click",()=>grade(false));$("rightButton").addEventListener("click",()=>grade(true));
$("audioButton").addEventListener("click",e=>{e.stopPropagation();speak()});
let touchX=0,touchY=0;
$("flashcard").addEventListener("touchstart",e=>{touchX=e.changedTouches[0].screenX;touchY=e.changedTouches[0].screenY;suppressCardClick=false},{passive:true});
$("flashcard").addEventListener("touchend",e=>{
  const dx=e.changedTouches[0].screenX-touchX,dy=e.changedTouches[0].screenY-touchY;
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy))return;suppressCardClick=true;if(dx<0)nextCard();else previousCard();
},{passive:true});
document.addEventListener("keydown",e=>{
  if($("practiceScreen").classList.contains("hidden"))return;
  if(e.key==="Enter"||e.key===" "){e.preventDefault();toggleAnswer()}if(e.key==="ArrowRight"){e.preventDefault();nextCard()}
  if(e.key==="ArrowLeft"){e.preventDefault();previousCard()}if(e.key==="ArrowUp")grade(true);if(e.key==="ArrowDown")grade(false);if(e.key==="Escape")backToSettings();
});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
window.addEventListener("load",()=>setTimeout(hideLaunchScreen,420));
setTimeout(hideLaunchScreen,1600);
load();
