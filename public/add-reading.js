const token = localStorage.getItem("lpg_token");

if (!token) {
  window.location.href = "/login.html";
}

const params = new URLSearchParams(window.location.search);

const tank = params.get("tank");

if (tank) {
  document.getElementById("tankId").value = tank;
}

document.getElementById("readingDateTime").value = new Date()
  .toISOString()
  .slice(0, 16);

document.getElementById("readingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const payload = {
      tankId: document.getElementById("tankId").value,

      readingDateTime: document.getElementById("readingDateTime").value,

      lpgLevel: Number(document.getElementById("lpgLevel").value),

      pressure: Number(document.getElementById("pressure").value),

      pressureUnit: document.getElementById("pressureUnit").value,

      temperature: Number(document.getElementById("temperature").value) || null,

      remarks: document.getElementById("remarks").value,
    };

    const response = await fetch("/api/readings", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    alert("Reading submitted successfully.");

    location.reload();
  } catch (err) {
    alert(err.message);
  }
});
