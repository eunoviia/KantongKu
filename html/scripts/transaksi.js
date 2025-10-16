firebase.auth().onAuthStateChanged(user => {
  if (user) {
    const uid = user.uid;
    const greetingEl = document.getElementById('user-name');
    if (greetingEl) {
      const namaUser = user.displayName && user.displayName.trim() !== ""
        ? user.displayName
        : (user.email ? user.email.split('@')[0] : "User");
      greetingEl.textContent = `Halo, ${namaUser}`;
    }
    loadPemasukan(uid);
    loadPengeluaran(uid);
  } else {
    window.location.href = "login.html";
  }
});

function loadPemasukan(uid) {
  const pemasukanBody = document.getElementById('pemasukanBody');
  db.collection('pemasukan')
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      pemasukanBody.innerHTML = '';
      if (snapshot.empty) {
        pemasukanBody.innerHTML = '<tr><td colspan="4">Belum ada data pemasukan.</td></tr>';
        return;
      }
      snapshot.forEach(doc => {
        const data = doc.data();
        const nominal = data.nominal || 0;
        const deskripsi = data.deskripsi || '-';
        const kategori = data.kategori || '-';
        const tanggal = data.createdAt && data.createdAt.toDate ? 
                        data.createdAt.toDate().toLocaleDateString() : '-';

        const row = `
          <tr>
            <td>Rp ${nominal.toLocaleString()}</td>
            <td>${deskripsi}</td>
            <td>${tanggal}</td>
            <td>${kategori}</td>
          </tr>
        `;
        pemasukanBody.innerHTML += row;
      });
    })
    .catch(error => {
      console.error("Error loading pemasukan:", error);
      pemasukanBody.innerHTML = '<tr><td colspan="4">Gagal memuat data pemasukan.</td></tr>';
    });
}

function loadPengeluaran(userId) {
  const pengeluaranBody = document.getElementById('pengeluaranBody');
  db.collection('pengeluaran')
    .where('userId', '==', userId)
    .orderBy('tanggal', 'desc')  // Pastikan field tanggal ada dan tipe string atau timestamp
    .get()
    .then(snapshot => {
      pengeluaranBody.innerHTML = '';
      if (snapshot.empty) {
        pengeluaranBody.innerHTML = '<tr><td colspan="4">Belum ada data pengeluaran.</td></tr>';
        return;
      }
      snapshot.forEach(doc => {
        const data = doc.data();
        const nominal = data.nominal || 0;
        const deskripsi = data.deskripsi || '-';
        const kategori = data.kategori || '-';
        // Jika tanggal di pengeluaran juga Timestamp, konversi juga
        const tanggal = data.tanggal && data.tanggal.toDate ? 
                        data.tanggal.toDate().toLocaleDateString() : data.tanggal || '-';

        const row = `
          <tr>
            <td>Rp ${nominal.toLocaleString()}</td>
            <td>${deskripsi}</td>
            <td>${tanggal}</td>
            <td>${kategori}</td>
          </tr>
        `;
        pengeluaranBody.innerHTML += row;
      });
    })
    .catch(error => {
      console.error("Error loading pengeluaran:", error);
      pengeluaranBody.innerHTML = '<tr><td colspan="4">Gagal memuat data pengeluaran.</td></tr>';
    });
}

// Logout button handler
const logoutBtn = document.querySelector('.btn-logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    firebase.auth().signOut()
      .then(() => {
        window.location.href = "index.html";
      })
      .catch(error => {
        console.error('Error saat logout:', error);
      });
  });
}
