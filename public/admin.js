let allReadings = [];
let levelChart;
let tankPressureCharts = {};

Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";

Chart.defaults.font.size = 13;

Chart.defaults.font.weight = "500";

Chart.defaults.color = "#d6e4f0";

function getLpgChartColor(level) {
  level = Number(level);

  if (level < 20) {
    return "#ef4444"; // red
  }

  if (level < 30) {
    return "#f59e0b"; // yellow
  }

  return "#22c55e"; // green
}

function getLpgStatus(level) {
  level = Number(level);

  if (level < 20) return "Critical";
  if (level < 30) return "Warning";

  return "Normal";
}

async function initAdmin() {
  requireAuth("admin");
  await Promise.all([loadAdminReadings(), loadUsers()]);
}

async function loadUsers() {
  try {
    const { users } = await request("/api/admin/users", {
      headers: authHeaders(),
    });

    document.getElementById("adminUsersCount").textContent = users.length;

    document.getElementById("usersTable").innerHTML = users
      .map(
        (u) => `
        <tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
          <td>${u.status || "approved"}</td>
          <td>${formatDate(u.createdAt)}</td>
          <td>
            ${
              u.role === "user" && u.status !== "approved"
                ? `<button class="btn" onclick="approveUser('${u._id}')">Approve</button>`
                : ""
            }

            ${
              u.role !== "admin"
                ? `<button class="btn danger" onclick="deleteUserAccount('${u._id}')">Delete</button>`
                : ""
            }
          </td>
        </tr>
      `,
      )
      .join("");
  } catch (err) {
    toast(err.message);
  }
}

async function loadAdminReadings() {
  try {
    const params = new URLSearchParams();
    const search = document.getElementById("searchInput")?.value;
    const status = document.getElementById("statusFilter")?.value;
    const from = document.getElementById("fromFilter")?.value;
    const to = document.getElementById("toFilter")?.value;
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const { readings } = await request(
      `/api/admin/readings?${params.toString()}`,
      { headers: authHeaders() },
    );
    allReadings = readings;
    renderAdminSummary(readings);
    renderAdminTable(readings);
    renderAdminCharts(readings);
  } catch (err) {
    toast(err.message);
  }
}

function renderAdminSummary(readings) {
  document.getElementById("adminTotalTanks").textContent = 4;
  document.getElementById("adminTotalRecords").textContent = readings.length;
  document.getElementById("adminCritical").textContent = readings.filter(
    (r) => r.status === "Critical",
  ).length;
}

function renderAdminTable(readings) {
  document.getElementById("adminReadingsTable").innerHTML = readings
    .map((r) => {
      const lpgStatus = getLpgStatus(r.lpgLevel);

      return `
      <tr>
        <td>${r.tankId}</td>
        <td>${formatDate(r.readingDateTime)}</td>
        <td>${r.lpgLevel}%</td>
        <td>${badge(lpgStatus)}</td>
        <td>
          ${r.pressure}
          ${r.pressureUnit === "percent" ? "%" : " PSI"}
        </td>
        <td>${r.temperature ?? "-"}°C</td>
        <td>${badge(r.status)}</td>
        <td>${r.submittedBy?.name || "Unknown"}</td>
        <td>${r.remarks || ""}</td>
        <td>
          <button class="btn"
            onclick='openEditModal(${JSON.stringify(r).replace(/'/g, "&#39;")})'>
            Edit
          </button>

          <button class="btn danger"
            onclick="deleteReading('${r._id}')">
            Delete
          </button>
        </td>
      </tr>
      `;
    })
    .join("");
}

function renderAdminCharts(readings) {
  const tankOrder = ["LPG Tank 1", "LPG Tank 2", "LPG Tank 3", "LPG Tank 4"];

  const latestByTank = tankOrder.map((tank) => {
    return readings.find((r) => r.tankId === tank);
  });

  const labels = tankOrder;

  const levelData = latestByTank.map((r) => {
    return r ? r.lpgLevel : 0;
  });

  // LPG LEVEL BAR CHART
  if (levelChart) {
    levelChart.destroy();
  }

  levelChart = new Chart(document.getElementById("levelChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "LPG Level (%)",
          data: levelData,
          backgroundColor: levelData.map((level) => getLpgChartColor(level)),
          borderRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            color: "#dce7f2",
            font: {
              size: 14,
              weight: "600",
            },
          },
        },

        tooltip: {
          backgroundColor: "rgba(12,22,34,.95)",

          titleColor: "#fff",

          bodyColor: "#dce7f2",

          borderColor: "rgba(255,255,255,.08)",

          borderWidth: 1,
        },
      },

      scales: {
        x: {
          ticks: {
            color: "#a8bfd0",

            font: {
              size: 14,
              weight: "500",
            },
          },

          grid: {
            color: "rgba(255,255,255,.04)",
          },
        },

        y: {
          beginAtZero: true,

          ticks: {
            color: "#a8bfd0",

            font: {
              size: 13,
              weight: "500",
            },
          },

          grid: {
            color: "rgba(255,255,255,.04)",
          },
        },
      },
    },
  });

  // 4 FIXED TANKS
  const tanks = [
    {
      name: "LPG Tank 1",
      canvasId: "tankPressureChart1",
    },
    {
      name: "LPG Tank 2",
      canvasId: "tankPressureChart2",
    },
    {
      name: "LPG Tank 3",
      canvasId: "tankPressureChart3",
    },
    {
      name: "LPG Tank 4",
      canvasId: "tankPressureChart4",
    },
  ];

  tanks.forEach((tank) => {
    const tankReadings = readings
      .filter((r) => r.tankId === tank.name)
      .slice(-10);

    renderSingleTankAdminChart(tank.canvasId, tank.name, tankReadings);
  });
}

function renderSingleTankAdminChart(canvasId, tankName, readings) {
  const ctx = document.getElementById(canvasId);

  if (!ctx) return;

  if (tankPressureCharts[canvasId]) {
    tankPressureCharts[canvasId].destroy();
  }

  tankPressureCharts[canvasId] = new Chart(ctx, {
    type: "line",

    data: {
      labels: readings.map((r) =>
        new Date(r.readingDateTime).toLocaleTimeString(),
      ),

      datasets: [
        {
          label: "Pressure",

          data: readings.map((r) => r.pressure),

          tension: 0.35,
        },

        {
          label: "Temperature (°C)",

          data: readings.map((r) => r.temperature),

          tension: 0.35,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false,
      },

      plugins: {
        legend: {
          labels: {
            color: "#dce7f2",

            font: {
              size: 13,
              weight: "600",
            },
          },
        },

        tooltip: {
          enabled: true,

          backgroundColor: "rgba(12,22,34,.95)",

          titleColor: "#fff",

          bodyColor: "#dce7f2",

          borderColor: "rgba(255,255,255,.08)",

          borderWidth: 1,
        },
      },

      scales: {
        x: {
          ticks: {
            color: "#a8bfd0",

            font: {
              size: 12,
              weight: "500",
            },
          },

          grid: {
            color: "rgba(255,255,255,.04)",
          },
        },

        y: {
          beginAtZero: true,

          ticks: {
            color: "#a8bfd0",

            font: {
              size: 12,
              weight: "500",
            },
          },

          grid: {
            color: "rgba(255,255,255,.04)",
          },
        },
      },
    },
  });
}

function toDatetimeLocal(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function openEditModal(r) {
  document.getElementById("editId").value = r._id;
  document.getElementById("editTankId").value = r.tankId;
  document.getElementById("editDateTime").value = toDatetimeLocal(
    r.readingDateTime,
  );
  document.getElementById("editLevel").value = r.lpgLevel;
  document.getElementById("editPressure").value = r.pressure;
  document.getElementById("editPressureUnit").value = r.pressureUnit || "psi";
  document.getElementById("editTemperature").value = r.temperature ?? "";
  document.getElementById("editRemarks").value = r.remarks || "";

  updateEditPressureLabel();

  document.getElementById("editModal").classList.add("show");
}

function updateEditPressureLabel() {
  const unit = document.getElementById("editPressureUnit");
  const label = document.getElementById("editPressureLabel");

  if (!unit || !label) return;

  label.textContent = unit.value === "psi" ? "Pressure (PSI)" : "Pressure (%)";
}

document.addEventListener("DOMContentLoaded", () => {
  const editPressureUnit = document.getElementById("editPressureUnit");

  if (editPressureUnit) {
    editPressureUnit.addEventListener("change", updateEditPressureLabel);
  }
});

function closeEditModal() {
  document.getElementById("editModal").classList.remove("show");
}

async function saveEdit(e) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target));
  const id = body.id;
  delete body.id;
  try {
    await request(`/api/admin/readings/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    closeEditModal();
    toast("Reading updated.");
    await loadAdminReadings();
  } catch (err) {
    toast(err.message);
  }
}

async function deleteReading(id) {
  if (!confirm("Delete this reading? This cannot be undone.")) return;
  try {
    await request(`/api/admin/readings/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    toast("Reading deleted.");
    await loadAdminReadings();
  } catch (err) {
    toast(err.message);
  }
}

function showAdminSection(sectionId, link) {
  document.querySelectorAll(".admin-section").forEach((section) => {
    section.style.display = "none";
  });

  const selectedSection = document.getElementById(sectionId);

  if (selectedSection) {
    selectedSection.style.display = sectionId === "overview" ? "grid" : "block";
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
  showAdminSection("overview", defaultLink);
});

async function approveUser(userId) {
  if (!confirm("Approve this user account?")) return;

  try {
    await request(`/api/admin/users/${userId}/approve`, {
      method: "PUT",
      headers: authHeaders(),
    });

    toast("User approved successfully.");
    await loadUsers();
  } catch (err) {
    toast(err.message);
  }
}

async function deleteUserAccount(userId) {
  if (!confirm("Delete this user account?")) return;

  try {
    await request(`/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    toast("User deleted successfully.");
    await loadUsers();
  } catch (err) {
    toast(err.message);
  }
}

async function downloadMonthlyExcel() {
  try {
    const month = document.getElementById("reportMonth").value;

    if (!month) {
      toast("Please select a month first.");
      return;
    }

    const res = await fetch(`/api/admin/export/monthly-excel?month=${month}`, {
      headers: authHeaders(),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Excel export failed.");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `lpg-monthly-report-${month}.xlsx`;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message);
  }
}
