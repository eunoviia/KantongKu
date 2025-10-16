document.addEventListener('DOMContentLoaded', () => {
  let selectedKategori = '';
  let editId = null;

  const auth = firebase.auth();
  const db = firebase.firestore();

  const form = document.getElementById('pemasukanForm');
  const tbody = document.getElementById('pemasukanBody');

  const kategoriButtons = document.querySelectorAll('.kategori');
  const btnLainnya = document.getElementById('btn-lainnya');
  const inputLainnya = document.getElementById('kategoriInput');
  const btnLogout = document.querySelector('.btn-logout');
  const submitBtn = form.querySelector('button[type="submit"]');

  const nominalInput = document.getElementById('nominal');

  // Format input nominal saat user mengetik
  nominalInput.addEventListener('input', (e) => {
    let value = e.target.value;

    // Hapus semua karakter kecuali angka
    value = value.replace(/[^0-9]/g, '');

    if (value === '') {
      e.target.value = '';
      return;
    }

    // Format angka dengan ribuan pakai Intl.NumberFormat dan BigInt supaya bisa angka panjang
    const formatted = new Intl.NumberFormat('id-ID').format(BigInt(value));
    e.target.value = formatted;
  });

  // Logout
  btnLogout?.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'login.html';
    }).catch((error) => {
      console.error('Gagal logout:', error);
    });
  });

  // Pilih kategori
  kategoriButtons.forEach(button => {
    button.addEventListener('click', () => {
      kategoriButtons.forEach(btn => btn.classList.remove('active'));

      if (button.id === 'btn-lainnya') {
        button.style.display = 'none';
        inputLainnya.style.display = 'inline-block';
        inputLainnya.focus();
        inputLainnya.classList.add('active');
        selectedKategori = '';
      } else {
        button.classList.add('active');
        selectedKategori = button.textContent.trim();
        inputLainnya.style.display = 'none';
        inputLainnya.classList.remove('active');
        inputLainnya.value = '';
        btnLainnya.style.display = 'inline-block';
      }
    });
  });

  inputLainnya.addEventListener('input', () => {
    selectedKategori = inputLainnya.value.trim();
  });

  auth.onAuthStateChanged(user => {
    if (user) {
      const name = user.displayName || user.email.split('@')[0];
      document.getElementById('user-name').textContent = `Halo, ${name}!`;
      loadPemasukan(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });

  async function loadPemasukan(uid) {
    tbody.innerHTML = '';
    const snapshot = await db.collection('pemasukan')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    snapshot.forEach(doc => {
      const data = doc.data();
      tambahKeTabel(data.nominal, data.deskripsi, data.tanggal, data.kategori, doc.id);
    });
  }

  function tambahKeTabel(nominal, deskripsi, tanggal, kategori, id) {
    const tr = document.createElement('tr');

    // Format nominal ke Rupiah, pastikan nominal number (parseFloat)
    const nominalNumber = Number(nominal);
    const formattedNominal = nominalNumber.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

    tr.innerHTML = `
      <td>${formattedNominal}</td>
      <td>${deskripsi}</td>
      <td>${tanggal}</td>
      <td>${kategori}</td>
      <td class="action-buttons">
        <button class="btn-edit" onclick="editPemasukan('${id}')">
          <i class="bi bi-pencil-square"></i>
        </button>
        <button class="btn-delete" onclick="deletePemasukan('${id}')">
          <i class="bi bi-trash-fill"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Ambil nominal dari input, hapus titik ribuan sebelum convert ke number
    const rawNominal = nominalInput.value.replace(/\./g, '');
    const nominal = parseFloat(rawNominal);
    if (isNaN(nominal) || nominal <= 0) {
      alert('Nominal harus diisi dengan angka yang valid dan lebih dari 0.');
      return;
    }

    const deskripsi = document.getElementById('deskripsi').value.trim();
    const tanggal = document.getElementById('tanggal').value;

    if (!selectedKategori) {
      alert('Pilih atau isi kategori terlebih dahulu.');
      return;
    }

    if (!tanggal) {
      alert('Tanggal harus diisi.');
      return;
    }

    const user = auth.currentUser;
    try {
      if (editId) {
        // UPDATE
        await db.collection('pemasukan').doc(editId).update({
          nominal, deskripsi, tanggal, kategori: selectedKategori
        });
        alert('Data berhasil diperbarui!');
      } else {
        // TAMBAH
        await db.collection('pemasukan').add({
          uid: user.uid,
          nominal, deskripsi, tanggal,
          kategori: selectedKategori,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Pemasukan berhasil disimpan!');
      }

      resetForm();
      loadPemasukan(user.uid);

    } catch (error) {
      console.error('Gagal menyimpan:', error);
      alert('Terjadi kesalahan saat menyimpan data.');
    }
  });

  function resetForm() {
    form.reset();
    selectedKategori = '';
    editId = null;
    kategoriButtons.forEach(btn => btn.classList.remove('active'));
    inputLainnya.value = '';
    inputLainnya.style.display = 'none';
    inputLainnya.classList.remove('active');
    btnLainnya.style.display = 'inline-block';
    submitBtn.textContent = 'Simpan ✔';
  }

  window.editPemasukan = async function(id) {
    const doc = await db.collection('pemasukan').doc(id).get();
    const data = doc.data();

    // Format nominal untuk input (hapus format ribuan)
    nominalInput.value = Number(data.nominal).toLocaleString('id-ID');
    document.getElementById('deskripsi').value = data.deskripsi;
    document.getElementById('tanggal').value = data.tanggal;
    selectedKategori = data.kategori;

    // Cek apakah kategori preset atau manual
    const preset = Array.from(kategoriButtons).map(btn => btn.textContent.trim());
    kategoriButtons.forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === selectedKategori);
    });

    if (!preset.includes(selectedKategori)) {
      btnLainnya.style.display = 'none';
      inputLainnya.style.display = 'inline-block';
      inputLainnya.value = selectedKategori;
      inputLainnya.classList.add('active');
    } else {
      btnLainnya.style.display = 'inline-block';
      inputLainnya.style.display = 'none';
      inputLainnya.classList.remove('active');
      inputLainnya.value = '';
    }

    editId = id;
    submitBtn.textContent = 'Update ✔';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.deletePemasukan = async function(id) {
    if (confirm('Yakin ingin menghapus data ini?')) {
      await db.collection('pemasukan').doc(id).delete();
      loadPemasukan(auth.currentUser.uid);
    }
  };
});
