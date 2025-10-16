// Data warna
const warna = [
  '#F3722C', '#F8961E', '#F9C74F',
  '#90BE6D', '#43AA8B', '#577590', '#277DA1',
  '#4D908E', '#F9844A', '#43AA8B'
];

const kategoriWarnaMap = {};

// Fungsi untuk memastikan warna kategori konsisten
function getColorForCategory(kategori) {
  if (kategoriWarnaMap[kategori]) return kategoriWarnaMap[kategori];
  const warnaDipakai = warna[Object.keys(kategoriWarnaMap).length % warna.length];
  kategoriWarnaMap[kategori] = warnaDipakai;
  return warnaDipakai;
}

let currentUserId = null;

// Autentikasi user
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUserId = user.uid;
    const greetingEl = document.getElementById('user-name');
    if (greetingEl) {
      const namaUser = user.displayName || user.email || "User";
      greetingEl.textContent = `Halo, ${namaUser.split('@')[0]}!`;
    }
    initYearFilter();
    const tahunSekarang = new Date().getFullYear();
    renderChart(tahunSekarang);
    renderPieCharts(tahunSekarang);
  } else {
    window.location.href = "login.html";
  }
});

// Line chart
const ctx = document.getElementById('chartPengeluaran').getContext('2d');
let lineChart = null;
let pieChartPengeluaran = null;
let pieChartPemasukan = null;

// Labels bulan
function generateMonthLabels() {
  return ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
}

// Ambil data pemasukan/pengeluaran per bulan
async function getDataPerBulan(collectionName, tahun) {
  const monthlyTotals = new Array(12).fill(0);
  if (!currentUserId) return monthlyTotals;

  try {
    let query = null;
    if (collectionName === 'pengeluaran') {
      query = db.collection(collectionName).where('userId', '==', currentUserId);
    } else {
      query = db.collection(collectionName).where('uid', '==', currentUserId);
    }

    const snapshot = await query.get();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.tanggal) return;
      const tanggal = data.tanggal.seconds ? new Date(data.tanggal.seconds * 1000) : new Date(data.tanggal);
      if (tanggal.getFullYear() === tahun) {
        const bulanIndex = tanggal.getMonth();
        monthlyTotals[bulanIndex] += Number(data.nominal) || 0;
      }
    });
  } catch (error) {
    console.error("Error getting documents:", error);
  }
  return monthlyTotals;
}

// Render line chart
async function renderChart(tahun) {
  if (!currentUserId) return;

  const pemasukanData = await getDataPerBulan('pemasukan', tahun);
  const pengeluaranData = await getDataPerBulan('pengeluaran', tahun);
  const labels = generateMonthLabels();

  if (lineChart) lineChart.destroy();

  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: pemasukanData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: 'Pengeluaran',
          data: pengeluaranData,
          borderColor: '#f3b400',
          backgroundColor: 'rgba(243, 180, 0, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `Rp ${Number(ctx.parsed.y).toLocaleString('id-ID')}`
          }
        },
        legend: {
          position: 'top',
          labels: {
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => 'Rp ' + value.toLocaleString('id-ID'),
          },
          title: {
            display: true,
            text: 'Nominal (Rp)',
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        },
        x: {
          title: {
            display: true,
            text: 'Bulan',
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        }
      }
    }
  });
}

// Filter tahun
function initYearFilter() {
  const select = document.getElementById('filterTahun');
  const currentYear = new Date().getFullYear();

  select.innerHTML = '';

  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.text = y;
    if (y === currentYear) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', (e) => {
    const year = Number(e.target.value);
    renderChart(year);
    renderPieCharts(year);
  });
}

// Render pie chart pengeluaran & pemasukan
async function renderPieCharts(tahun) {
  if (!currentUserId) return;

  const pengeluaranMap = {};
  const pemasukanMap = {};

  const pengeluaranSnapshot = await db.collection('pengeluaran')
    .where('userId', '==', currentUserId)
    .get();

  pengeluaranSnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.tanggal) return;
    const tanggal = data.tanggal.seconds ? new Date(data.tanggal.seconds * 1000) : new Date(data.tanggal);
    if (tanggal.getFullYear() !== tahun) return;

    const kategori = data.kategori || 'Lainnya';
    pengeluaranMap[kategori] = (pengeluaranMap[kategori] || 0) + Number(data.nominal || 0);
  });

  const pemasukanSnapshot = await db.collection('pemasukan')
    .where('uid', '==', currentUserId)
    .get();

  pemasukanSnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.tanggal) return;
    const tanggal = data.tanggal.seconds ? new Date(data.tanggal.seconds * 1000) : new Date(data.tanggal);
    if (tanggal.getFullYear() !== tahun) return;

    const kategori = data.kategori || 'Lainnya';
    pemasukanMap[kategori] = (pemasukanMap[kategori] || 0) + Number(data.nominal || 0);
  });

  tampilkanPieChart('pieChartPengeluaran', pengeluaranMap, 'Pengeluaran', pieChartPengeluaran, chart => pieChartPengeluaran = chart);
  tampilkanPieChart('pieChartPemasukan', pemasukanMap, 'Pemasukan', pieChartPemasukan, chart => pieChartPemasukan = chart);
}

// Tampilkan pie chart dengan persentase di dalam chart
function tampilkanPieChart(idCanvas, dataMap, label, chartInstance, setChart) {
  if (!currentUserId) return;

  const ctx = document.getElementById(idCanvas).getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const labels = Object.keys(dataMap);
  const data = Object.values(dataMap);
  const backgroundColors = labels.map(k => getColorForCategory(k));
  const total = data.reduce((a, b) => a + b, 0);

  const newChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: label,
        data,
        backgroundColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: Rp ${value.toLocaleString('id-ID')} (${percentage}%)`;
            }
          }
        },
        datalabels: {
          color: '#fff',
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value) => {
            const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
            return `${percentage}%`;
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  setChart(newChart);
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    firebase.auth().signOut()
      .then(() => {
        window.location.href = 'login.html';
      })
      .catch(err => {
        alert('Gagal logout: ' + err.message);
      });
  });
}
