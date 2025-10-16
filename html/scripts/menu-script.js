const namaBulan = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

let totalPemasukan = 0;
let totalPengeluaran = 0;
let chartPie = null;

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const db = firebase.firestore();
  const displayName = user.displayName || user.email || "user";
  document.getElementById("greeting").textContent = `Halo, ${displayName.split('@')[0]}!`;

  // Navigasi tombol
  document.querySelector('.btn-logout').addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
      window.location.href = "home.html";
    });
  });

  document.querySelector('.btn-income').addEventListener('click', () => {
    window.location.href = "tambah-pemasukan.html";
  });

  document.querySelector('.btn-expense').addEventListener('click', () => {
    window.location.href = "tambah-pengeluaran.html";
  });

  ambilRingkasanKeuangan(db, uid);
  tampilkanGrafikBulanSekarang(db, uid);

  // Event listener filter bulan & tahun
  document.getElementById("bulanSelect").addEventListener("change", () => gantiBulanTahun(db, uid));
  document.getElementById("tahunSelect").addEventListener("change", () => gantiBulanTahun(db, uid));
  document.querySelector("button.tampilkan-filter").addEventListener("click", () => gantiBulanTahun(db, uid));
});

function ambilRingkasanKeuangan(db, uid) {
  totalPemasukan = 0;
  totalPengeluaran = 0;

  // Pemasukan pakai 'uid'
  db.collection("pemasukan").where("uid", "==", uid).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        totalPemasukan += doc.data().nominal || 0;
      });
      document.getElementById("pemasukan").textContent = `Rp ${totalPemasukan.toLocaleString("id-ID")}`;
      updateSaldo(); // Panggil setelah data pemasukan selesai
    })
    .catch(err => console.error("Gagal ambil pemasukan:", err));

  // Pengeluaran tetap pakai 'userId'
  db.collection("pengeluaran").where("userId", "==", uid).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        totalPengeluaran += doc.data().nominal || 0;
      });
      document.getElementById("pengeluaran").textContent = `Rp ${totalPengeluaran.toLocaleString("id-ID")}`;
      updateSaldo(); // Panggil setelah data pengeluaran selesai
    })
    .catch(err => console.error("Gagal ambil pengeluaran:", err));
}

function updateSaldo() {
  const saldo = totalPemasukan - totalPengeluaran;
  document.getElementById("saldo").textContent = `Rp ${saldo.toLocaleString("id-ID")}`;

  const alertContainer = document.getElementById('alertContainer');
  if (totalPengeluaran > totalPemasukan) {
    alertContainer.style.display = 'block';
  } else {
    alertContainer.style.display = 'none';
  }
}

function tampilkanGrafikBulanSekarang(db, uid) {
  const today = new Date();
  const bulan = String(today.getMonth() + 1).padStart(2, '0');
  const tahun = today.getFullYear();

  document.getElementById("bulanSelect").value = bulan;
  document.getElementById("tahunSelect").value = tahun;
  document.getElementById("judulChart").textContent = `Distribusi Pengeluaran ${namaBulan[today.getMonth()]} ${tahun}`;

  loadPengeluaranPerBulan(db, uid, `${tahun}-${bulan}`);
}

function gantiBulanTahun(db, uid) {
  const bulan = document.getElementById("bulanSelect").value;
  const tahun = document.getElementById("tahunSelect").value;
  const bulanIndex = parseInt(bulan, 10) - 1;

  document.getElementById("judulChart").textContent = `Distribusi Pengeluaran ${namaBulan[bulanIndex]} ${tahun}`;
  loadPengeluaranPerBulan(db, uid, `${tahun}-${bulan}`);
}

function loadPengeluaranPerBulan(db, uid, bulanKey) {
  const awal = `${bulanKey}-01`;
  const akhir = `${bulanKey}-31`;

  tampilkanPieChart({ loading: true });

  db.collection("pengeluaran")
    .where("userId", "==", uid)
    .where("tanggal", ">=", awal)
    .where("tanggal", "<=", akhir)
    .get()
    .then(snapshot => {
      const kategoriMap = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const kategori = data.kategori;
        const nominal = data.nominal || 0;
        if (!kategori || typeof nominal !== "number") return;
        kategoriMap[kategori] = (kategoriMap[kategori] || 0) + nominal;
      });
      tampilkanPieChart(kategoriMap);
    })
    .catch(error => {
      console.error("Gagal mengambil data pengeluaran:", error);
      tampilkanPieChart({});
    });
}

function tampilkanPieChart(dataMap) {
  const ctx = document.getElementById('pieChart').getContext('2d');

  if (chartPie) chartPie.destroy();

  if (dataMap.loading) {
    chartPie = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ["Memuat..."],
        datasets: [{
          data: [1],
          backgroundColor: ['#ccc']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    });
    return;
  }

  const labels = Object.keys(dataMap);
  const values = Object.values(dataMap);

  if (labels.length === 0) {
    chartPie = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ["Tidak ada data"],
        datasets: [{
          data: [1],
          backgroundColor: ['#e0e0e0']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'bottom' }
        }
      }
    });
    return;
  }

  const warna = [
    '#F3722C', '#F8961E', '#F9C74F',
    '#90BE6D', '#43AA8B', '#577590', '#277DA1',
    '#4D908E', '#F9844A', '#43AA8B'
  ];

  chartPie = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: warna.slice(0, labels.length)
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}
