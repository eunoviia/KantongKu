let currentUser = null;

auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;
  const uid = user.uid;
  const displayName = user.displayName || (user.email ? user.email.split('@')[0] : "User");

  // Update elemen .logo-area h1 (sudah ada)
  const heading = document.querySelector(".logo-area h1");
  if (heading) {
    heading.textContent = `Halo, ${displayName}!`;
  }

  // Update elemen dengan id 'user-nama'
  const userNamaEl = document.getElementById('user-name');
  if (userNamaEl) {
    userNamaEl.textContent = `Halo, ${displayName}!`;
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.nama) {
        if (heading) heading.textContent = `Halo, ${userData.nama}!`;
        if (userNamaEl) userNamaEl.textContent = `Halo, ${userData.nama}!`;
      }
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
  }

  loadPemasukan(uid);
  loadRiwayatPengeluaran(uid);
  updateInfoBox(uid);
  loadCitaCita(uid);

  const container = document.getElementById('cardContainer');
  if (!container) return;

  try {
    const snapshot = await db.collection('cita-cita')
      .where('uid', '==', uid)
      .orderBy('dibuat', 'desc')
      .get();

    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = '<p>Belum ada cita-cita 😢</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();

      const target = data.target || 0;
      const terkumpul = data.terkumpul || 0;
      const persentase = Math.min((terkumpul / target) * 100, 100).toFixed(1);

      const now = new Date();
      const targetDate = new Date(data.tanggal);
      const timeDiff = targetDate - now;
      const daysLeft = Math.max(Math.ceil(timeDiff / (1000 * 60 * 60 * 24)), 0);

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-title">${data.nama}</div>
        <div class="subtitle">Sisa waktu: ${daysLeft} hari</div>
        <div class="subtitle">Target: Rp${target.toLocaleString('id-ID')}</div>
        <div class="subtitle">Terkumpul: Rp${terkumpul.toLocaleString('id-ID')} (${persentase}%)</div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${persentase}%"></div>
        </div>
      `;

      card.addEventListener('click', () => {
        window.location.href = `detailcitacita.html?id=${doc.id}`;
      });

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Gagal memuat data:', error);
    container.innerHTML = '<p>Gagal memuat data cita-cita.</p>';
  }
});

function formatRupiah(angka) {
  const num = Number(angka);
  if (isNaN(num)) return "Rp 0";
  return "Rp " + num.toLocaleString("id-ID");
}

function getMonthsRemaining(targetTanggal) {
  if (!targetTanggal) return "-";
  const now = new Date();
  const target = new Date(targetTanggal);
  let months = (target.getFullYear() - now.getFullYear()) * 12;
  months += target.getMonth() - now.getMonth();
  if (months < 0) return 0;
  return months;
}

function loadCitaCita(uid) {
  const citaRef = db.collection("cita-cita").where("uid", "==", uid);
  const container = document.getElementById("citaCitaContainer");
  if (!container) return;

  container.innerHTML = "<p>Memuat data cita-cita...</p>";

  citaRef.get()
    .then(querySnapshot => {
      container.innerHTML = "";
      if (querySnapshot.empty) {
        container.innerHTML = "<p>Tidak ada cita-cita yang ditemukan.</p>";
        return;
      }

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const { nama = "-", targetDana = 0, danaTerkumpul = 0, targetTanggal } = data;
        const monthsLeft = getMonthsRemaining(targetTanggal);
        const progress = targetDana > 0 ? Math.min(100, Math.floor((danaTerkumpul / targetDana) * 100)) : 0;

        const card = document.createElement("div");
        card.className = "cita-card";
        card.innerHTML = `
          <h3>${nama}</h3>
          <p><i>${monthsLeft} bulan lagi</i></p>
          <p>${formatRupiah(targetDana)}</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%;"></div>
          </div>
          <small>Progres ${progress}%</small>
        `;
        container.appendChild(card);
      });
    })
    .catch(error => {
      container.innerHTML = `<p>Gagal memuat data cita-cita: ${error.message}</p>`;
      console.error("Error loadCitaCita:", error);
    });
}

function loadPemasukan(uid) {
  const pemasukanTable = document.getElementById("pemasukanTable");
  if (!pemasukanTable) return;

  pemasukanTable.innerHTML = "";
  let rows = "";

  db.collection("pemasukan")
    .where("uid", "==", uid)
    .orderBy("tanggal", "desc")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const kategori = data.kategori || "-";
        const nominal = data.nominal || 0;
        const tanggal = data.tanggal || "-";

        rows += `<tr>
          <td>${kategori}</td>
          <td>${formatRupiah(nominal)}</td>
          <td>${tanggal}</td>
        </tr>`;
      });
      pemasukanTable.innerHTML = rows;
    })
    .catch(err => console.error("Error loadPemasukan:", err));
}

function loadRiwayatPengeluaran(uid) {
  const pengeluaranTable = document.getElementById("pengeluaranTable");
  if (!pengeluaranTable) return;

  pengeluaranTable.innerHTML = "";
  let rows = "";

  db.collection("pengeluaran")
    .where("userId", "==", uid)
    .orderBy("tanggal", "desc")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const kategori = data.kategori || "-";
        const nominal = data.nominal || 0;
        const tanggal = data.tanggal || "-";

        rows += `<tr>
          <td>${kategori}</td>
          <td>${formatRupiah(nominal)}</td>
          <td>${tanggal}</td>
        </tr>`;
      });
      pengeluaranTable.innerHTML = rows;
    })
    .catch(err => console.error("Error loadRiwayatPengeluaran:", err));
}

async function updateInfoBox(uid) {
  try {
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    const pemasukanSnap = await db.collection("pemasukan").where("uid", "==", uid).get();
    pemasukanSnap.forEach(doc => {
      const data = doc.data();
      totalPemasukan += data.nominal || 0;
    });

    const pengeluaranSnap = await db.collection("pengeluaran").where("userId", "==", uid).get();
    pengeluaranSnap.forEach(doc => {
      const data = doc.data();
      totalPengeluaran += data.nominal || 0;
    });

    const saldo = totalPemasukan - totalPengeluaran;

    const saldoEl = document.getElementById("saldo");
    const pemasukanEl = document.getElementById("pemasukan");
    const pengeluaranEl = document.getElementById("pengeluaran");

    if (saldoEl) saldoEl.textContent = formatRupiah(saldo);
    if (pemasukanEl) pemasukanEl.textContent = formatRupiah(totalPemasukan);
    if (pengeluaranEl) pengeluaranEl.textContent = formatRupiah(totalPengeluaran);

    checkAlert(totalPemasukan, totalPengeluaran);
  } catch (error) {
    console.error("Error updateInfoBox:", error);
  }
}

function checkAlert(pemasukan, pengeluaran) {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;

  if (pengeluaran > pemasukan) {
    alertContainer.style.display = 'block';
  } else {
    alertContainer.style.display = 'none';
  }
}

// Tombol logout
const logoutEl = document.querySelector(".logout");
if (logoutEl) {
  logoutEl.addEventListener("click", (e) => {
    e.preventDefault();
    auth.signOut()
      .then(() => {
        window.location.href = "login.html";
      })
      .catch(error => {
        console.error("Logout error:", error);
      });
  });
}

// Tombol tambah cita-cita
window.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".add-goal-box");
  if (btn) {
    btn.addEventListener("click", () => {
      window.location.href = "citacita.html";
    });
  }
});

// Tombol logout alternatif
document.querySelector('.btn-logout').addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = 'login.html';
  }).catch(error => {
    console.error('Gagal logout:', error);
    alert('Gagal logout, coba lagi.');
  });
});
