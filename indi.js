// ===== CARBOT: ULTRA STRICT WEBSITE-ONLY MODE (Tagalog + humor + flexible) =====
const BOT_AVATAR_SRC = "bot.png";

// =========================
// ULTRA STRICT PROFANITY (DO NOT WEAKEN)
// =========================
const BAD_WORD_ROOTS = [
  "gago","tanga","bobo","ulol","ohulul","tado","tarantado","inutil","siraulo",
  "puta","putangina","tangina","pota","punyeta","leche","bwisit","lintik","yawa","piste",
  "fuck","shit","bitch","asshole","motherfucker","mf"
];

const LEET_MAP = {
  "0":"o","1":"i","2":"z","3":"e","4":"a","5":"s","6":"g","7":"t","8":"b","9":"g",
  "@":"a","$":"s","!":"i","€":"e"
};

function deLeet(s){
  return s.replace(/[0-9@\$!€]/g, ch => LEET_MAP[ch] || ch);
}

function normalizeForProfanity(raw){
  let s = (raw || "").toLowerCase();
  s = deLeet(s);
  s = s.replace(/[\s._\-|/\\,;:()[\]{}'"`~^*+=<>]/g,"");
  s = s.replace(/([a-z])\1{2,}/g,"$1$1");
  s = s.replace(/[^a-z]/g,"");
  return s;
}

function containsBadWords(raw){
  const joined = normalizeForProfanity(raw);
  for(const w of BAD_WORD_ROOTS){
    if(joined.includes(w)) return true;
  }
  return false;
}

// =========================
// WEBSITE GUARDS
// =========================
const ADMIN_GUARD = /(admin|user admin|manage records|database|delete user|create user|reset password|admin tools?)/i;
const OFFTOPIC_GUARD = /(\b\d+\s*[\+\-\*\/]\s*\d+\b|\b1\s*\+\s*1\b|capital of|weather|lyrics|translate|homework|who is|random trivia|math)/i;

// Website scope keywords (loose)
const WEBSITE_KEYWORDS = [
  "cnhs","carmen","portal","enroll","enrollment","mag enroll","register","apply",
  "grade 7","grade 11","balik","balik-aral","transferee","requirements","requirement",
  "psa","birth","sf10","sf9","form 137","form 9","good moral",
  "sp-ict","spict","ict","admission test","interview","skill test","schedule","february","7:30",
  "upload","scan","ocr","auto fill","autofill","submit","error","not loading","di nagloload",
  "faq","faqs","guide","guides","contact","email","facebook","about","principal","head teacher","lis"
];

// =========================
// UI ELEMENTS
// =========================
const launch = document.getElementById("carbotLaunch");
const chat = document.getElementById("carbot");
const closeBtn = document.getElementById("carbotClose");
const resetBtn = document.getElementById("carbotReset");
const msgs = document.getElementById("carbotMessages");
const choices = document.getElementById("carbotChoices");
const textInput = document.getElementById("carbotText");
const sendBtn = document.getElementById("carbotSend");

// =========================
// NORMALIZE
// =========================
function norm(s){
  let t = (s||"").toLowerCase().trim();
  t = t.replace(/([a-z])\1{2,}/g, "$1$1"); // alon-alon typing
  t = t.replace(/\s+/g, " ");
  return t;
}

function looksWebsiteRelated(t){
  if(!t) return false;
  if(OFFTOPIC_GUARD.test(t)) return false;

  for(const k of WEBSITE_KEYWORDS){
    if(t.includes(k)) return true;
  }
  if((t.includes("website") || t.includes("site")) && (t.includes("portal") || t.includes("cnhs"))) return true;

  return false;
}

// =========================
// MESSAGE RENDER
// =========================
function addUser(text){
  const row=document.createElement("div");
  row.className="carbot-row user";
  const bubble=document.createElement("div");
  bubble.className="carbot-bubble";
  bubble.textContent=text;
  row.appendChild(bubble);
  msgs.appendChild(row);
  msgs.scrollTop=msgs.scrollHeight;
}

function addBot(text){
  const row=document.createElement("div");
  row.className="carbot-row bot";

  const av=document.createElement("div");
  av.className="carbot-avatar-sm";
  const img=document.createElement("img");
  img.src=BOT_AVATAR_SRC;
  img.alt="CARBOT";
  av.appendChild(img);

  const bubble=document.createElement("div");
  bubble.className="carbot-bubble";
  bubble.textContent=text;

  row.appendChild(av);
  row.appendChild(bubble);
  msgs.appendChild(row);
  msgs.scrollTop=msgs.scrollHeight;
}

let typingEl=null;
function showTyping(){
  if(typingEl) return;
  typingEl=document.createElement("div");
  typingEl.className="carbot-typing";
  typingEl.innerHTML=`
    <div class="carbot-avatar-sm"><img src="${BOT_AVATAR_SRC}" alt="CARBOT"></div>
    <div class="carbot-dots"><span class="carbot-dot"></span><span class="carbot-dot"></span><span class="carbot-dot"></span></div>
  `;
  msgs.appendChild(typingEl);
  msgs.scrollTop=msgs.scrollHeight;
}
function hideTyping(){
  if(!typingEl) return;
  typingEl.remove();
  typingEl=null;
}

// choices toggle (declared later) — safe call
function showChoices(){
  if (!choices) return;
  choices.classList.remove("collapsed");
  const choicesToggle = document.getElementById("carbotChoicesToggle");
  if (choicesToggle) choicesToggle.textContent = "▲";
}

function botReply(text, vibe="neutral"){
  showTyping();
  const base = 520;
  const extra = vibe === "happy" ? 220 : 420;
  const delay = base + Math.floor(Math.random() * extra);
  setTimeout(()=>{
    hideTyping();
    addBot(text);
    // after bot reply, bring back quick buttons (nice UX)
    showChoices();
  }, delay);
}

// =========================
// VIBE DETECTION (humor mode)
// =========================
function getVibe(t){
  if(/(\bhehe\b|\bhaha\b|😂|🤣|😄|😆|😁|😭|lmao|lol|hshshs)/i.test(t)) return "happy";
  if(/(\bpls\b|please|help|patulong|paano|di ko alam|nalilito|nahihirapan)/i.test(t)) return "help";
  return "neutral";
}

// =========================
// QUICK BUTTONS (PUBLIC ONLY)
// =========================
function renderQuickButtons(){
  if(!choices) return;
  choices.innerHTML = "";
  const chips = [
    {label:"Paano mag-enroll", ask:"paano mag enroll?"},
    {label:"Requirements", ask:"ano requirements?"},
    {label:"Grade 11", ask:"paano mag enroll grade 11?"},
    {label:"Balik-Aral", ask:"paano mag enroll balik-aral?"},
    {label:"Transferee", ask:"transferee requirements?"},
    {label:"SP-ICT + Schedule", ask:"sp-ict requirements at kelan test?"},
    {label:"Upload/OCR", ask:"paano yung upload auto-fill?"},
    {label:"Di naglo-load", ask:"di nagloload yung page, ano gagawin?"},
    {label:"Contact", ask:"paano contact cnhs?"},
  ];

  for(const c of chips){
    const b = document.createElement("button");
    b.className = "carbot-chip";
    b.textContent = c.label;
    b.onclick = () => handleUserText(c.ask);
    choices.appendChild(b);
  }
}

// =========================
// AGREEMENT / DISAGREEMENT (NO REGEX LITERAL BREAKS)
// =========================
const AGREE_PHRASES = [
  // your list (with/without ! — normalizeShortReply strips punctuation anyway)
  "okay","alr","ok","okei","oky","sige","esig","aight","bet","olrayt",
  "bradar","alright","alright bradar","oke bradar","ok bradar",
  "sige yes","yes","i","hell yes","heck yeah","yeah","yeah boi",
  "okay po","sige po","sige nga","pano ba","pano ba?","ge pano ba","ge pano ba?",
  "ok na","oks","okey","okeyy","alr ok","alr okay","alrdy","already","olrayt bradar"
];

const DISAGREE_PHRASES = [
  "pass","pass sa pare","pass ako jan","g pass ako jan","repa",
  "ayoko","ayoko nga","nge","fah",
  "nah","nahh","nahhh","nahhhh","nahhhhh","nahhhhhh",
  "ayookooooo","ayokooooo",
  "neh","ayawku","ayaw ko nga","ayaw ko ngani","ayaw ko nganiii",
  "ayoko ngani","ayoko nganiii","ayaw ko","ayaw"
];

function normalizeShortReply(raw){
  let s = (raw || "").toLowerCase().trim();
  s = s
    .replace(/@/g, "a")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t");

  s = s.replace(/[^a-z0-9?\s]/g, " "); // remove punct
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/([a-z])\1{2,}/g, "$1$1"); // repeats
  return s;
}

function matchesPhraseList(t, list){
  const s = normalizeShortReply(t);
  for (const p of list){
    const pp = normalizeShortReply(p);
    if (!pp) continue;
    if (s === pp) return true;
    if (s.startsWith(pp)) return true; // "ok bradar boss" counts
  }
  return false;
}
function isAgree(t){ return matchesPhraseList(t, AGREE_PHRASES); }
function isDisagree(t){ return matchesPhraseList(t, DISAGREE_PHRASES); }

// =========================
// UNIVERSAL FOLLOW-UP SYSTEM (ALL BOT QUESTIONS MUST RESOLVE)
// =========================
let pending = null; 
// pending = { question, onAgree, onDisagree, onText, allowAnyText }

function ask(question, handlers = {}) {
  pending = {
    question,
    onAgree: handlers.onAgree || null,
    onDisagree: handlers.onDisagree || null,
    onText: handlers.onText || null,
    allowAnyText: handlers.allowAnyText ?? true
  };
  return question;
}
function clearPending(){ pending = null; }

// =========================
// WEBSITE ANSWERS (TAGALOG/Taglish) — uses ask() for questions
// =========================
function outro(vibe="neutral"){
  const variants = [
    "May maitutulong pa ba ako sayo? 😄",
    "Ano pa need mo sa CNHS Portal? 🙂",
    "May iba ka pa bang tanong tungkol sa portal? 😄",
    "Gusto mo pa ba ng guide sa ibang part ng portal? 🙂"
  ];
  // slight variety
  const pick = variants[Math.floor(Math.random()*variants.length)];
  return "\n\n" + pick;
}

function websiteAI(t, vibe){
  const haha = (vibe==="happy") ? " 😄" : "";

  // Admin asked
  if(ADMIN_GUARD.test(t)){
    return "Ay boss, restricted yung Admin/User Admin. Pang-admin lang talaga ’yon. Pero game ako sa Enrollment/FAQs/SP-ICT/Contact!" + outro(vibe);
  }

  // Troubleshoot
  if(/(not loading|di nagloload|loading|error|blank|white screen)/i.test(t)){
    return (
      "Kung ayaw mag-load" + haha + ":\n" +
      "1) Refresh muna\n" +
      "2) Try Chrome / Incognito\n" +
      "3) Check internet\n" +
      "4) Clear cache\n" +
      "5) Pag ayaw pa rin, screenshot mo yung error para mabilis.\n" +
      outro(vibe)
    );
  }

  // Upload/OCR
  if(/(upload|scan|ocr|auto\s*fill|autofill)/i.test(t)){
    return (
      "Yung Upload/Auto-fill" + haha + ":\n" +
      "• Choose File → Upload/Scan\n" +
      "• Hintayin mag auto-fill\n" +
      "• IMPORTANT: i-double check lahat bago i-submit\n" +
      "Tip: mas clear na photo = mas accurate auto-fill.\n" +
      outro(vibe)
    );
  }

  // SP-ICT schedule
  if(/(sp.?ict).*(schedule|kelan|when|date|oras|time|admission test|interview|skill test)/i.test(t) ||
     /(admission test|interview|skill test).*(sp.?ict)/i.test(t)){
    return (
      "SP-ICT Schedule" + haha + ":\n" +
      "📅 Feb 28, 2026\n" +
      "⏰ 7:30 AM\n" +
      "📍 SP-ICT Building\n" +
      outro(vibe)
    );
  }

  // SP-ICT requirements
  if(/(sp.?ict|spict|ict)/i.test(t)){
    return (
      "Para sa SP-ICT (Incoming Grade 7)" + haha + ":\n" +
      "• Report Card (Gen Ave at least 85 from Q1–Q3)\n" +
      "• Application form + 2x2 picture\n" +
      "• PSA Birth Certificate photocopy\n" +
      outro(vibe)
    );
  }

  // Grade 11
  if(/(grade\s*11|g11|incoming\s*11|senior high)/i.test(t)){
    return (
      "Incoming Grade 11" + haha + ":\n" +
      "1) Kumuha ng application form sa guard/guard house\n" +
      "2) Fill-up\n" +
      "3) Submit requirements (PSA photocopy, SF10, SF9, + PEPT/A&E kung ALS)\n" +
      outro(vibe)
    );
  }

  // Balik-aral
  if(/(balik|balik-aral|balik aral|returnee)/i.test(t)){
    return (
      "Balik-Aral" + haha + ":\n" +
      "1) Kumuha ng application form sa guard/guard house\n" +
      "2) Fill-up\n" +
      "3) Submit: PSA photocopy + SF10 + SF9\n" +
      outro(vibe)
    );
  }

  // Transferee
  if(/(transferee|transfer|lipat school)/i.test(t)){
    return (
      "Transferee" + haha + ":\n" +
      "1) Kumuha ng application form sa guard/guard house\n" +
      "2) Fill-up\n" +
      "3) Submit: SF10 + SF9 + Good Moral\n" +
      outro(vibe)
    );
  }

  // Contact
  if(/(contact|email|facebook|fb|address|hotline)/i.test(t)){
    return (
      "Contact/Help" + haha + ":\n" +
      "• Email: 300796@deped.gov\n" +
      "• Facebook: Carmen National High School\n" +
      outro(vibe)
    );
  }

  // Requirements general
  if(/(requirements?|requirement|docs|documents|kailangan)/i.test(t)){
    return (
      "Requirements (common)" + haha + ":\n" +
      "• PSA Birth Certificate photocopy\n" +
      "• SF10 (Form 137)\n" +
      "• SF9 (Report Card)\n" +
      "Note: may dagdag depende kung Transferee/SP-ICT/ALS.\n" +
      outro(vibe)
    );
  }

  // Enroll general
  if(/(enroll|enrollment|mag enroll|paano enroll|apply|register)/i.test(t)){
    return (
      "Paano mag-enroll" + haha + ":\n" +
      "1) Home → Portal Services → Enrollment\n" +
      "2) Fill-up ng student details\n" +
      "3) Optional: Upload/Auto-fill\n" +
      "4) Submit\n" +
      outro(vibe)
    );
  }

  // Fallback inside website
  return (
    "Gets ko 😄 Pero tungkol sa CNHS Portal lang ako.\n" +
    "Try mo: 'paano mag-enroll', 'requirements', 'SP-ICT schedule', 'upload/auto-fill', 'di naglo-load', 'contact'." +
    outro(vibe)
  );
}


  // Troubleshoot — ask what page/error
  if(/(not loading|di nagloload|loading|error|blank|white screen)/i.test(t)){
    return ask(
      "Kung ayaw mag-load" + haha + ":\n" +
      "1) Refresh muna\n" +
      "2) Try Chrome / Incognito\n" +
      "3) Check internet\n" +
      "4) Clear cache\n\n" +
      "Anong page mismo at ano exact error text? (kahit copy-paste)",
      {
        onText: (raw) =>
          "Noted ✅: " + raw.trim() + "\n" +
          "Try mo ulit after clear cache/incognito. Kung ayaw pa rin, sabihin mo anong browser gamit mo (Chrome/Edge) at anong device."
      }
    );
  }

  // Upload/OCR — ask what part failed
  if(/(upload|scan|ocr|auto\s*fill|autofill)/i.test(t)){
    return ask(
      "Yung Upload/Auto-fill" + haha + ":\n" +
      "• Choose File → Upload/Scan\n" +
      "• Hintayin mag auto-fill\n" +
      "• IMPORTANT: i-double check lahat bago i-submit\n\n" +
      "Anong issue: (1) di maka-upload, (2) mali auto-fill, or (3) di nagssave?",
      {
        onText: (raw) =>
          "Gets 👍 (" + raw.trim() + ").\n" +
          "Quick fix: try ibang file (clear photo), rename file (simple name), then re-upload. Kung mali auto-fill, i-edit manual bago submit."
      }
    );
  }

  // SP-ICT schedule — ask checklist yes/no
  if(/(sp.?ict).*(schedule|kelan|when|date|oras|time|admission test|interview|skill test)/i.test(t) ||
     /(admission test|interview|skill test).*(sp.?ict)/i.test(t)){
    return ask(
      "SP-ICT Schedule" + haha + ":\n" +
      "📅 Feb 28, 2026\n" +
      "⏰ 7:30 AM\n" +
      "📍 SP-ICT Building\n\n" +
      "Gusto mo checklist kung ano dadalhin? (Yes/No)",
      {
        onAgree: () =>
          "G! Eto checklist para sa SP-ICT day:\n" +
          "✅ Ballpen + lapis + eraser\n" +
          "✅ Photocopy requirements (PSA + Report Card + application form)\n" +
          "✅ Tubig (optional snack)\n" +
          "✅ Dumating 15–30 mins early 😄",
        onDisagree: () =>
          "Sige boss 😄 Kung need mo pa details (requirements/schedule), chat mo lang."
      }
    );
  }

  // SP-ICT requirements
  if(/(sp.?ict|spict|ict)/i.test(t)){
    return ask(
      "Para sa SP-ICT (Incoming Grade 7)" + haha + ":\n" +
      "• Report Card (Gen Ave at least 85 from Q1–Q3)\n" +
      "• Application form + 2x2 picture\n" +
      "• PSA Birth Certificate photocopy\n\n" +
      "Gusto mo ba quick check kung pasok ka? (Yes/No)",
      {
        onAgree: () =>
          "Sige 😄 Sabihin mo lang average mo (Q1–Q3) para ma-check natin kung pasok.",
        onDisagree: () =>
          "Okay! Kung requirements lang need mo, pwede mo i-screenshot tong list at ready ka na."
      }
    );
  }

  // Grade 11 flow — ask step-by-step yes/no
  if(/(grade\s*11|g11|incoming\s*11|senior high)/i.test(t)){
    return ask(
      "Incoming Grade 11" + haha + ":\n" +
      "1) Kumuha ng application form sa guard/guard house\n" +
      "2) Fill-up\n" +
      "3) Submit requirements (PSA photocopy, SF10, SF9, + PEPT/A&E kung ALS)\n\n" +
      "Gusto mo step-by-step sa portal page? (Yes/No)",
      {
        onAgree: () =>
          "G! Step-by-step sa portal:\n" +
          "1) Home → Portal Services\n" +
          "2) Click Enrollment\n" +
          "3) Fill-up Student Details\n" +
          "4) Optional: Upload/Auto-fill\n" +
          "5) Review then Submit\n\n" +
          "Tanong: nasa Home page ka na ba ngayon? (Yes/No)",
        onDisagree: () =>
          "Sige 😄 Kung checklist lang, ok na yung steps + requirements. Chat ka lang pag stuck ka."
      }
    );
  }

  // Balik-aral — ask grade level
  if(/(balik|balik-aral|balik aral|returnee)/i.test(t)){
    return ask(
      "Balik-Aral" + haha + ":\n" +
      "1) Kumuha ng application form sa guard/guard house\n" +
      "2) Fill-up\n" +
      "3) Submit: PSA photocopy + SF10 + SF9\n\n" +
      "Anong grade level mo babalik? (kahit number lang)",
      {
        onText: (raw) =>
          "Noted 😄 Grade " + raw.trim() + ".\n" +
          "Next: ihanda mo na PSA + SF10 + SF9, tapos proceed sa guard house for form + submission."
      }
    );
  }

  // Transferee — ask from what school
  if(/(transferee|transfer|lipat school)/i.test(t)){
    return ask(
      "Transferee" + haha + ":\n" +
      "1) Kumuha ng application form sa guard/guard house\n" +
      "2) Fill-up\n" +
      "3) Submit: SF10 + SF9 + Good Moral\n\n" +
      "Anong school ka galing? (kahit pangalan lang)",
      {
        onText: (raw) =>
          "Noted 😄 (" + raw.trim() + ").\n" +
          "Kung kumpleto ka na sa SF10/SF9/Good Moral, ready ka na mag-submit.\n" +
          "Gusto mo checklist para ma-check mo isa-isa? (Yes/No)",
        onAgree: () =>
          "G 😄 send mo lang school name (kahit short) para ma-continue ko yung guide.",
        onDisagree: () =>
          "Sige boss 😄 basta tandaan: SF10 + SF9 + Good Moral ang core docs."
      }
    );
  }

  // Teacher to approach
  if(/(sinong teacher|kanino lalapit|which teacher|who to approach|lis coordinator)/i.test(t)){
    return "Kung kanino lalapit sa enrollment" + haha + ":\n" +
      "Depende sa assigned teacher sa enrollment day, pero kadalasan Grade 7 & Grade 11 advisers kasama ang LIS Coordinator ang naka-assign.";
  }

  // Contact
  if(/(contact|email|facebook|fb|address|hotline)/i.test(t)){
    return "Contact/Help" + haha + ":\n" +
      "• Email: 300796@deped.gov\n" +
      "• Facebook: Carmen National High School\n" +
      "Kung portal issue, sabihin mo anong page + anong error para mabilis." + chill;
  }

  // Requirements general — ask category
  if(/(requirements?|requirement|docs|documents|kailangan)/i.test(t)){
    return ask(
      "Requirements depende sa category" + haha + ".\n" +
      "Common: PSA photocopy + SF10 + SF9.\n\n" +
      "Para kanino: Grade 11, Balik-Aral, Transferee, o SP-ICT?",
      {
        onText: (raw) =>
          "Gets 😄 (" + raw.trim() + ").\n" +
          "Pwede mo ulitin na may keyword: 'grade 11', 'balik-aral', 'transferee', or 'sp-ict' para exact checklist ko."
      }
    );
  }

  // Enroll general — ask status yes/no
  if(/(enroll|enrollment|mag enroll|paano enroll|apply|register)/i.test(t)){
    return ask(
      "Paano mag-enroll" + haha + ":\n" +
      "1) Home → Portal Services → Enrollment\n" +
      "2) Fill-up ng student details\n" +
      "3) Optional: Upload/Auto-fill\n" +
      "4) Submit\n\n" +
      "Nasa fill-up ka na ba ngayon? (Yes/No)",
      {
        onAgree: () =>
          "Ayos! 😄 I-check mo lang bawat field bago submit. Pag may error (red text / di masubmit), send mo sakin yung error message.",
        onDisagree: () =>
          "Oks 😄 Start ka muna sa Home page then click Enrollment card. Pag nasa form ka na, chat mo 'nasa fill-up na' para i-guide kita."
      }
    );
  }

  // Fallback (still website-only)
  return "Gets ko 😄 Pero para sakto sagot ko, pili ka dito:\n" +
    "• Enrollment (Grade 11 / Balik-Aral / Transferee)\n" +
    "• SP-ICT (requirements/schedule)\n" +
    "• Upload/Auto-fill\n" +
    "• Error/di naglo-load\n" +
    "• Contact";

// =========================
// MAIN ROUTER
// =========================
let started = false;

function handleUserText(text){
  addUser(text);

  const t = norm(text);
  const vibe = getVibe(t);

  // 1) Bad words (ULTRA strict)
  if(containsBadWords(text)){
    botReply(
      "Uy boss, respeto lang tayo 🙂\n" +
      "Kung may concern ka sa CNHS Portal, sabihin mo lang nang maayos—tutulungan kita.",
      "neutral"
    );
    renderQuickButtons();
    return;
  }

  // 2) Admin
  if(ADMIN_GUARD.test(t)){
    botReply(
      "Restricted yung Admin/User Admin. Pang-admin lang ’yon.\n" +
      "Pero kaya kitang tulungan sa Enrollment/FAQs/SP-ICT/Contact. 😄",
      vibe
    );
    renderQuickButtons();
    return;
  }

  // 3) Clear off-topic
  if(OFFTOPIC_GUARD.test(t)){
    botReply(
      "Hehe website-only ako 😅\n" +
      "Ask ka lang tungkol sa CNHS Portal: enrollment, requirements, SP-ICT, upload/auto-fill, errors, contact.",
      vibe
    );
    renderQuickButtons();
    return;
  }

  // 4) Website-only gate
  if(!looksWebsiteRelated(t)){
    botReply(
      "Pwede ka mag-chat kahit ano, pero sasagot lang ako pag tungkol sa CNHS Portal 🙂\n" +
      "Try mo: “paano mag-enroll”, “requirements”, “SP-ICT schedule”, “di naglo-load”, “contact”.",
      vibe
    );
    renderQuickButtons();
    return;
  }

  // 5) Answer website question
  botReply(websiteAI(t, vibe), vibe);
  renderQuickButtons();
}

// =========================
// INTRO + EVENTS
// =========================
function openChat(){
  chat.classList.add("open");
  if(!started){
    started = true;
    botReply(
      "Hi! I’m CARBOT 😄\n" +
      "Assistant ako ng CNHS Portal. Basta tungkol sa website (Enrollment/FAQs/SP-ICT/Contact), game ako.\n" +
      "Off-topic? auto-pass tayo 😅",
      "happy"
    );
    renderQuickButtons();
  }
  if(textInput) setTimeout(()=>textInput.focus(), 60);
}

function closeChat(){
  chat.classList.remove("open");
}

function resetChat(){
  msgs.innerHTML = "";
  if(choices) choices.innerHTML = "";
  started = false;
  clearPending();
  openChat();
}

function sendCurrent(){
  const v = (textInput?.value || "").trim();
  if(!v) return;
  textInput.value = "";
  handleUserText(v);
}

if(launch) launch.addEventListener("click", () => chat.classList.contains("open") ? closeChat() : openChat());
if(closeBtn) closeBtn.addEventListener("click", closeChat);
if(resetBtn) resetBtn.addEventListener("click", resetChat);
if(sendBtn) sendBtn.addEventListener("click", sendCurrent);
if(textInput) textInput.addEventListener("keydown", e => { if(e.key === "Enter") sendCurrent(); });

// =========================
// Quick Buttons Toggle + Auto-hide (kept)
// =========================
const choicesToggle = document.getElementById("carbotChoicesToggle");

function hideChoices(){
  if (!choices) return;
  choices.classList.add("collapsed");
  if (choicesToggle) choicesToggle.textContent = "▼";
}

function showChoicesLocal(){
  if (!choices) return;
  choices.classList.remove("collapsed");
  if (choicesToggle) choicesToggle.textContent = "▲";
}

if (choicesToggle && choices){
  choicesToggle.addEventListener("click", () => {
    if (choices.classList.contains("collapsed")) showChoicesLocal();
    else hideChoices();
  });
}

if (textInput){
  textInput.addEventListener("focus", hideChoices);
  textInput.addEventListener("input", () => {
    if (textInput.value.trim().length > 0) hideChoices();
  });
}
