let tankCharts = {};

async function initUser() {
  requireAuth("user");
  await loadMyReadings();
}

function getLpgStatus(level) {
  level = Number(level);

  if (level < 20) return "Critical";
  if (level < 30) return "Warning";

  return "Normal";
}

async function submitReading(e) {
  e.preventDefault();

  const form = new FormData(e.target);

  const body = {
    tankId: form.get("tankId"),

    readingDateTime: form.get("readingDateTime"),

    lpgLevel: Number(form.get("lpgLevel")),

    pressure: Number(form.get("pressure")),

    pressureUnit: form.get("pressureUnit"),

    temperature: form.get("temperature")
      ? Number(form.get("temperature"))
      : null,

    remarks: form.get("remarks"),
  };

  try {
    await request("/api/readings", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    e.target.reset();

    toast("Reading submitted successfully.");

    await loadMyReadings();

    location.hash = "dashboard";
  } catch (err) {
    toast(err.message);
  }
}

async function loadMyReadings() {
  try {
    const { readings } = await request("/api/readings", {
      headers: authHeaders(),
    });
    renderUserSummary(readings);
    renderUserTable(readings);
    renderFourTankCharts(readings);
  } catch (err) {
    toast(err.message);
  }
}

function renderUserSummary(readings) {
  const latest = readings[0];
  document.getElementById("totalReadings").textContent = readings.length;

  document.getElementById("pressureStatus").innerHTML = latest
    ? badge(latest.status)
    : "-";
  document.getElementById("criticalAlerts").textContent = readings.filter(
    (r) => r.status === "Critical",
  ).length;
}

function renderUserTable(readings) {
  document.getElementById("myReadingsTable").innerHTML = readings
    .map((r) => {
      const lpgStatus = getLpgStatus(r.lpgLevel);

      return `
        <tr>
          <td>${r.tankId}</td>

          <td>
            ${formatDate(r.readingDateTime)}
          </td>

          <td>
            ${r.lpgLevel}%
          </td>

          <td>
            ${badge(lpgStatus)}
          </td>

          <td>
            ${r.pressure}
            ${r.pressureUnit === "percent" ? "%" : "PSI"}
          </td>

          <td>
            ${r.temperature ? r.temperature + "°C" : "-"}
          </td>

          <td>
            ${badge(r.status)}
          </td>

          <td>
            ${r.remarks || ""}
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderFourTankCharts(readings) {
  const fixedTanks = [
    { name: "LPG Tank 1", canvasId: "tankChart1" },
    { name: "LPG Tank 2", canvasId: "tankChart2" },
    { name: "LPG Tank 3", canvasId: "tankChart3" },
    { name: "LPG Tank 4", canvasId: "tankChart4" },
  ];

  fixedTanks.forEach((tank) => {
    const tankReadings = readings
      .filter((r) => r.tankId?.toLowerCase() === tank.name.toLowerCase())
      .reverse()
      .slice(-10);

    renderSingleTankChart(tank.canvasId, tank.name, tankReadings);
  });
}

function renderSingleTankChart(canvasId, tankName, readings) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (tankCharts[canvasId]) {
    tankCharts[canvasId].destroy();
  }

  tankCharts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: readings.map((r) =>
        new Date(r.readingDateTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      ),
      datasets: [
        {
          label: "LPG Level (%)",
          data: readings.map((r) => r.lpgLevel ?? null),
          tension: 0.35,
        },
        {
          label: "Pressure",
          data: readings.map((r) => r.pressure ?? null),
          tension: 0.35,
        },
        {
          label: "Temperature (°C)",
          data: readings.map((r) => r.temperature ?? null),
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          enabled: true,
          mode: "index",
          intersect: false,
          callbacks: {
            title: function (context) {
              return `Time: ${context[0].label}`;
            },
            label: function (context) {
              const label = context.dataset.label || "";
              const value = context.raw;

              if (label.includes("LPG")) {
                return `LPG Level: ${value}%`;
              }

              if (label.includes("Pressure")) {
                return `Pressure: ${value}`;
              }

              if (label.includes("Temperature")) {
                return `Temperature: ${value}°C`;
              }

              return `${label}: ${value}`;
            },
          },
        },
        legend: {
          labels: {
            color: "#cfe7f5",
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#8fa8ba",
          },
          grid: {
            color: "rgba(255,255,255,.05)",
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#8fa8ba",
          },
          grid: {
            color: "rgba(255,255,255,.05)",
          },
        },
      },
    },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const unit = document.getElementById("lpgUnit");

  const label = document.getElementById("readingLabel");

  if (unit && label) {
    unit.addEventListener("change", () => {
      label.textContent =
        unit.value === "percent" ? "LPG Level (%)" : "Pressure (PSI)";
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const pressureUnit = document.getElementById("pressureUnit");

  const pressureLabel = document.getElementById("pressureLabel");

  if (pressureUnit && pressureLabel) {
    pressureUnit.addEventListener("change", () => {
      pressureLabel.textContent =
        pressureUnit.value === "psi" ? "Pressure (PSI)" : "Pressure (%)";
    });
  }
});

function showSection(sectionId, link) {
  document.querySelectorAll(".dashboard-section").forEach((section) => {
    section.style.display = "none";
  });

  const selectedSection = document.getElementById(sectionId);

  if (sectionId === "dashboard") {
    selectedSection.style.display = "grid";
  } else {
    selectedSection.style.display = "block";
  }

  document.querySelectorAll(".sidebar a").forEach((a) => {
    a.classList.remove("active");
  });

  if (link) {
    link.classList.add("active");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const defaultLink = document.querySelector(".sidebar a");
  showSection("dashboard", defaultLink);
});
