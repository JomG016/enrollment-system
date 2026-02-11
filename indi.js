 // ===== CARBOT CONFIG =====
  const DEFAULT_GREETING = "Hi! I'm CARBOT, I'm your assistant for today!";

  // Choices (buttons) + replies
  const FLOW = {
    start: {
      text: DEFAULT_GREETING,
      choices: [
        { label: "Enrollment", next: "enroll" },
        { label: "Guides / FAQs", next: "faq" },
        { label: "Admin", next: "admin" },
        { label: "Contact", next: "contact" },
      ],
    },
    enroll: {
      text: "Enrollment: What do you need?",
      choices: [
        { label: "How to enroll?", next: "how_enroll" },
        { label: "Requirements", next: "requirements" },
        { label: "Back", next: "start" },
      ],
    },
    how_enroll: {
      text: "To enroll: Go to Portal Services → Enrollment, then fill up the form and submit.",
      choices: [{ label: "Back", next: "enroll" }, { label: "Main menu", next: "start" }],
    },
    requirements: {
      text: "Typical requirements: PSA/Birth Certificate, Report Card, ID photo. (Confirm with your school office if needed.)",
      choices: [{ label: "Back", next: "enroll" }, { label: "Main menu", next: "start" }],
    },
    faq: {
      text: "Guides & FAQs: Choose one.",
      choices: [
        { label: "Enrollment steps", next: "how_enroll" },
        { label: "Common problems", next: "problems" },
        { label: "Back", next: "start" },
      ],
    },
    problems: {
      text: "Common problems: wrong details, missing requirements, or page not loading. Tell me which one and I’ll guide you.",
      choices: [
        { label: "Page not loading", next: "not_loading" },
        { label: "Wrong info submitted", next: "wrong_info" },
        { label: "Main menu", next: "start" },
      ],
    },
    not_loading: {
      text: "Try refresh, check internet, or open on another browser (Chrome). If still not working, contact admin.",
      choices: [{ label: "Back", next: "problems" }, { label: "Main menu", next: "start" }],
    },
    wrong_info: {
      text: "If you submitted wrong info, contact the admin so they can help update your record.",
      choices: [{ label: "Back", next: "problems" }, { label: "Main menu", next: "start" }],
    },
    admin: {
      text: "Admin: What do you want to do?",
      choices: [
        { label: "Manage records", next: "admin_records" },
        { label: "Access issues", next: "admin_access" },
        { label: "Back", next: "start" },
      ],
    },
    admin_records: {
      text: "For records management, go to Portal Services → User Admin.",
      choices: [{ label: "Back", next: "admin" }, { label: "Main menu", next: "start" }],
    },
    admin_access: {
      text: "If you can’t access admin tools, make sure you’re using the correct admin account.",
      choices: [{ label: "Back", next: "admin" }, { label: "Main menu", next: "start" }],
    },
    contact: {
      text: "Contact: Do you want to reach the school office or the portal admin?",
      choices: [
        { label: "School office", next: "contact_office" },
        { label: "Portal admin", next: "contact_admin" },
        { label: "Back", next: "start" },
      ],
    },
    contact_office: {
      text: "You can contact the school office during office hours. If you want, add your official contact details here.",
      choices: [{ label: "Main menu", next: "start" }],
    },
    contact_admin: {
      text: "For portal concerns, contact the portal admin (provide your full name + grade level + issue).",
      choices: [{ label: "Main menu", next: "start" }],
    },
  };

  // ===== UI =====
  const launch = document.getElementById("carbotLaunch");
  const chat = document.getElementById("carbot");
  const closeBtn = document.getElementById("carbotClose");
  const resetBtn = document.getElementById("carbotReset");
  const msgs = document.getElementById("carbotMessages");
  const choices = document.getElementById("carbotChoices");

  function addMessage(role, text){
    const row = document.createElement("div");
    row.className = "carbot-row " + role;
    const bubble = document.createElement("div");
    bubble.className = "carbot-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function renderChoices(nodeKey){
    choices.innerHTML = "";
    const node = FLOW[nodeKey];
    if(!node || !node.choices) return;

    node.choices.forEach(c => {
      const b = document.createElement("button");
      b.className = "carbot-chip";
      b.textContent = c.label;
      b.onclick = () => {
        addMessage("user", c.label);
        go(c.next);
      };
      choices.appendChild(b);
    });
  }

  function go(nodeKey){
    const node = FLOW[nodeKey];
    if(!node) return;
    addMessage("bot", node.text);
    renderChoices(nodeKey);
  }

  function openChat(){
    chat.classList.add("open");
    if(!msgs.dataset.started){
      msgs.dataset.started = "1";
      go("start");
    }
  }
  function closeChat(){ chat.classList.remove("open"); }
  function resetChat(){
    msgs.innerHTML = "";
    delete msgs.dataset.started;
    choices.innerHTML = "";
    openChat();
  }

  launch.addEventListener("click", () => {
    chat.classList.contains("open") ? closeChat() : openChat();
  });
  closeBtn.addEventListener("click", closeChat);
  resetBtn.addEventListener("click", resetChat);