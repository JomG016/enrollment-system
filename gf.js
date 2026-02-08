    // ✅ Tabs animation
    const viewFaqs  = document.getElementById("view-faqs");
    const viewAbout = document.getElementById("view-about");

    function setActive(which){
      document.querySelectorAll(".pillnav .pill").forEach(p=>{
        p.classList.toggle("is-active", p.dataset.tab === which);
      });
    }

    function showFaqs(){
      viewAbout.classList.remove("is-active");
      viewFaqs.classList.add("is-active");
      viewFaqs.classList.remove("from-right");
      viewFaqs.classList.add("from-left");
      setActive("faqs");
    }

    function showAbout(){
      viewFaqs.classList.remove("is-active");
      viewAbout.classList.add("is-active");
      viewAbout.classList.remove("from-left");
      viewAbout.classList.add("from-right");
      setActive("about");
    }

    document.querySelector('[data-tab="faqs"]').addEventListener("click", showFaqs);
    document.querySelector('[data-tab="about"]').addEventListener("click", showAbout);

    // ✅ FAQ accordion
    document.querySelectorAll("[data-faq]").forEach(row => {
      const btn = row.querySelector(".faq-btn");
      const ans = row.querySelector(".faq-a");
      btn.addEventListener("click", () => {
        const open = row.classList.toggle("open");
        ans.setAttribute("aria-hidden", String(!open));
      });
    });

    // ✅ Slideshow (image1-6)
    const slides = Array.from(document.querySelectorAll(".slide"));
    const dots   = Array.from(document.querySelectorAll(".dot"));
    let idx = 0;

    function show(i){
      slides.forEach((s,k)=>s.classList.toggle("active", k===i));
      dots.forEach((d,k)=>d.classList.toggle("active", k===i));
      idx = i;
    }
    setInterval(()=> show((idx+1)%slides.length), 2500);
  
    // =========================
    // ✅ CLICKABLE CONTACTS (Email + Google Maps)
    // =========================
     // =========================
// ✅ CLICKABLE CONTACTS (Gmail compose + Google Maps STREET VIEW)
// =========================
(function () {
  const email = "300796@deped.gov";
  const locationText = "CRXF+6X8, Zaragoza, Nueva Ecija";
  const fbURL = "https://web.facebook.com/profile.php?id=100054440982715"; // palitan kung exact page

  // helper: open mail compose
 // helper: open mail compose (FIXED)
function openEmailCompose() {
  const subject = encodeURIComponent("Inquiry");
  const body = encodeURIComponent("Hello CNHS,\n\n");

  const gmailComposeURL =
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;

  // ✅ Desktop: open Gmail compose directly (no setTimeout, no double navigation)
  // ✅ Mobile: you can still use mailto if you want, but Gmail web also works
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // mobile mail app (often Gmail)
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  } else {
    // desktop gmail web compose (reliable)
    window.open(gmailComposeURL, "_blank", "noopener,noreferrer");
  }
}

  // helper: open GOOGLE MAPS STREET VIEW (360°)
  // helper: open GOOGLE MAPS STREET VIEW (FORCE 360)
function openMaps() {
  // coords near the school gate
  const lat = 15.448239;
  const lng = 120.8255137;

  // ✅ Force Street View using "layer=c&cbll="
  // cbll = camera base lat,lng (Street View nearest pano)
  // cbp  = camera params: 11 = pano, then heading, pitch, zoom
  const url =
    `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=11,214.89,0,0,0`;

  window.open(url, "_blank", "noopener,noreferrer");
}


  // Make the rows clickable without changing HTML structure
  const rows = document.querySelectorAll(".panel.contact .contact-row");

  rows.forEach((row) => {
    const txt = row.querySelector(".contact-txt");
    if (!txt) return;

    const textValue = (txt.textContent || "").trim();

    row.style.cursor = "pointer";
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    
    // 📘 Facebook row (ICON-BASED — sure hit)
if (row.querySelector(".icon-facebook")) {
  row.setAttribute("aria-label", "Open Facebook page");
  row.addEventListener("click", openFacebook);
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") openFacebook();
  });
}

    // 📧 Email row
    if (textValue.includes("@")) {
      row.setAttribute("aria-label", `Email ${email}`);
      row.addEventListener("click", openEmailCompose);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") openEmailCompose();
      });
    }

    // 📍 Location row (STRICT match — hindi sasabit sa iba)
   // 📍 Location row (robust match)
const norm = textValue.toLowerCase().replace(/\s+/g, " ").trim();
const isLocation =
  norm.includes("crxf+6x8") && norm.includes("zaragoza"); // sure na location row

if (isLocation) {
  row.setAttribute("aria-label", `Open Street View: ${locationText}`);
  row.addEventListener("click", openMaps);
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") openMaps();
  });
}
 // helper: open Facebook page
function openFacebook() {
  window.open(fbURL, "_blank", "noopener,noreferrer");
}
// =========================
// ✅ POWERED BY → redirect to definitions
// =========================
(function () {
  const techLinks = {
    html: "https://developer.mozilla.org/en-US/docs/Web/HTML",
    css: "https://developer.mozilla.org/en-US/docs/Web/CSS",
    js: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    firebase: "https://firebase.google.com/docs",
    git: "https://git-scm.com/docs",
  };

  document.querySelectorAll(".powered-stack button[data-tech]").forEach((btn) => {
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
      const tech = btn.dataset.tech;
      const url = techLinks[tech];
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });

    // accessibility: Enter/Space support
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();
// =========================
// 🎨 DESIGNED FROM buttons
// =========================
(function () {
  const designLinks = {
    canva: "https://en.wikipedia.org/wiki/Canva",
    figma: "https://en.wikipedia.org/wiki/Figma",
  };

  document.querySelectorAll("button[data-design]").forEach((btn) => {
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
      const url = designLinks[btn.dataset.design];
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });
  });
})();

  });
})();
