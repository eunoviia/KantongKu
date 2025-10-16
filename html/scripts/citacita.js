let currentUser = null;
let editId = null;

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    const name = user.displayName || user.email.split('@')[0];
    document.getElementById('user-name').textContent = `Halo, ${name}!`;
    loadCitaCita();
    document.getElementById('targetTanggal').max = '2030-12-31';

    // Pasang format ribuan realtime untuk input targetDana dan danaTerkumpul
    setupFormatInput(document.getElementById('targetDana'));
    setupFormatInput(document.getElementById('danaTerkumpul'));

  } else {
    window.location.href = 'login.html';
  }
});

async function loadCitaCita() {
  const tbody = document.getElementById('citaBody');
  tbody.innerHTML = '';

  try {
    const snapshot = await db.collection('cita-cita')
      .where('uid', '==', currentUser.uid)
      .orderBy('dibuat', 'desc')
      .get();

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Belum ada data</td></tr>`;
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${data.nama}</td>
        <td>Rp${data.target.toLocaleString('id-ID')}</td>
        <td>Rp${data.terkumpul.toLocaleString('id-ID')}</td>
        <td>${data.tanggal}</td>
        <td class="action-buttons">
          <button class="btn-edit" onclick="editPemasukan('${doc.id}')">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn-delete" onclick="deletePemasukan('${doc.id}')">
            <i class="bi bi-trash-fill"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });

  } catch (error) {
    console.error(error);
    alert('Gagal memuat data');
  }
}

async function deletePemasukan(id) {
  if (confirm('Yakin ingin menghapus cita-cita ini?')) {
    try {
      await db.collection('cita-cita').doc(id).delete();
      loadCitaCita();
      alert('Data berhasil dihapus!');
    } catch (error) {
      console.error(error);
      alert('Gagal menghapus data');
    }
  }
}

async function editPemasukan(id) {
  try {
    const doc = await db.collection('cita-cita').doc(id).get();
    if (!doc.exists) return alert('Data tidak ditemukan');

    const data = doc.data();
    document.getElementById('namaCita').value = data.nama;
    // Tampilkan angka dengan format titik ribuan saat edit
    document.getElementById('targetDana').value = data.target.toLocaleString('id-ID');
    document.getElementById('danaTerkumpul').value = data.terkumpul.toLocaleString('id-ID');
    document.getElementById('targetTanggal').value = data.tanggal;

    editId = id;
    document.querySelector('.btn-simpan').textContent = 'Update ✔';
    document.getElementById('btnCancelEdit').style.display = 'inline-block';

  } catch (error) {
    console.error(error);
    alert('Gagal mengambil data');
  }
}

document.getElementById('btnCancelEdit').addEventListener('click', () => {
  editId = null;
  document.getElementById('citacitaForm').reset();
  document.querySelector('.btn-simpan').textContent = 'Simpan ✔';
  document.getElementById('btnCancelEdit').style.display = 'none';
});

document.getElementById('citacitaForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nama = document.getElementById('namaCita').value.trim();

  // Ambil value, hilangkan titik ribuan, baru parseInt
  const targetStr = document.getElementById('targetDana').value.replace(/\./g, '');
  const target = parseInt(targetStr) || 0;

  const terkumpulStr = document.getElementById('danaTerkumpul').value.replace(/\./g, '');
  const terkumpul = parseInt(terkumpulStr) || 0;

  const tanggal = document.getElementById('targetTanggal').value;

  if (!nama || target <= 0 || terkumpul < 0 || !tanggal) {
    alert('Harap isi semua field!');
    return;
  }

  if (terkumpul > target) {
    alert('Dana terkumpul tidak boleh melebihi target!');
    return;
  }

  try {
    if (editId) {
      await db.collection('cita-cita').doc(editId).update({
        nama,
        target,
        terkumpul,
        tanggal
      });
      alert('Data berhasil diperbarui!');
      editId = null;
      document.querySelector('.btn-simpan').textContent = 'Simpan ✔';
      document.getElementById('btnCancelEdit').style.display = 'none';
    } else {
      await db.collection('cita-cita').add({
        uid: currentUser.uid,
        nama,
        target,
        terkumpul,
        tanggal,
        dibuat: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert('Data berhasil disimpan!');
    }

    e.target.reset();
    loadCitaCita();

  } catch (error) {
    console.error(error);
    alert('Gagal menyimpan data');
  }
});

document.querySelector('.btn-logout').addEventListener('click', () => {
  auth.signOut();
});


// Fungsi format ribuan dengan titik, dipakai di input saat ketik
function formatRibuan(angka) {
  const angkaBersih = angka.replace(/\D/g, '');
  return angkaBersih.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function setupFormatInput(inputElement) {
  if (!inputElement) return;
  inputElement.addEventListener('input', (e) => {
    const input = e.target;
    const cursorPos = input.selectionStart;
    const originalLength = input.value.length;

    input.value = formatRibuan(input.value);

    const newLength = input.value.length;
    const diff = newLength - originalLength;
    input.selectionEnd = cursorPos + diff;
  });
}
