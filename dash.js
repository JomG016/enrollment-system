function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

// NIGHT MODE
function toggleNight() {
  document.body.classList.toggle("night");
}

// LOAD INVENTORY (from g8910.html submissions)
const inventory = JSON.parse(localStorage.getItem("inventory")) || {};
const container = document.getElementById("inventoryContainer");

for (const grade in inventory) {
  for (const track in inventory[grade]) {
    for (const section in inventory[grade][track]) {
      const div = document.createElement("div");
      div.className = "inv-block";
      div.innerHTML = `
        <h3>${grade} - ${track} - ${section}</h3>
        <p>Total: ${inventory[grade][track][section].length}</p>
      `;
      container.appendChild(div);
    }
  }
}
