const namaBulan = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

let uid = null;
let editDocId = null;

const kategoriButtons = document.querySelectorAll(".kategori-group .kategori");
const kategoriInput = document.getElementById("kategoriInput");
const nominalInput = document.getElementById("nominal");
const deskripsiInput = document.getElementById("deskripsi");
const tanggalInput = document.getElementById("tanggal");
const btnSimpan = document.querySelector(".btn-simpan");
const tbody = document.getElementById("pengeluaranBody");
const form = document.getElementById("pengeluaranForm");

firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  uid = user.uid;
  const displayName = user.displayName || user.email || "user";
  document.getElementById("user-name").textContent = `Halo, ${displayName.split('@')[0]}!`;

  setupKategoriButtons();
  loadRiwayatPengeluaran();
  setupFormSubmit();
  setupLogout();
  setupNominalFormatting();
});

function setupLogout() {
  document.querySelector(".btn-logout").addEventListener("click", () => {
    firebase.auth().signOut().then(() => {
      window.location.href = "home.html";
    });
  });
}

function setupKategoriButtons() {
  kategoriButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.id === "btn-lainnya") {
        kategoriButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        kategoriInput.style.display = "inline-block";
        kategoriInput.value = "";
        kategoriInput.focus();
      } else {
        kategoriButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        kategoriInput.style.display = "none";
        kategoriInput.value = "";
      }
    });
  });
}

function getSelectedKategori() {
  for (const btn of kategoriButtons) {
    if (btn.classList.contains("active")) {
      if (btn.id === "btn-lainnya") {
        const val = kategoriInput.value.trim();
        return val.length > 0 ? val : null;
      } else {
        return btn.textContent.trim();
      }
    }
  }
  return null;
}

function setupFormSubmit() {
  // Set default tanggal ke hari ini
  tanggalInput.valueAsDate = new Date();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Hilangkan format titik dari input nominal sebelum parse
    const nominalStr = nominalInput.value.replace(/\./g, '').replace(/,/g, '');
    const nominal = Number(nominalStr);
    const deskripsi = deskripsiInput.value.trim();
    const tanggal = tanggalInput.value;
    const kategori = getSelectedKategori();

    if (!kategori) {
      alert("Pilih atau isi kategori pengeluaran.");
      return;
    }
    if (!nominal || nominal <= 0) {
      alert("Nominal harus lebih besar dari nol.");
      return;
    }
    if (!tanggal) {
      alert("Tanggal harus diisi.");
      return;
    }
    if (!deskripsi) {
      alert("Deskripsi harus diisi.");
      return;
    }

    const dataPengeluaran = {
      userId: uid,
      nominal,
      deskripsi,
      tanggal,
      kategori,
      jumlah: nominal
    };

    try {
      const db = firebase.firestore();
      if (editDocId) {
        await db.collection("pengeluaran").doc(editDocId).update(dataPengeluaran);
        alert("Data pengeluaran berhasil diperbarui.");
      } else {
        await db.collection("pengeluaran").add(dataPengeluaran);
        alert("Pengeluaran berhasil disimpan.");
      }
      resetForm();
      await loadRiwayatPengeluaran();
    } catch (err) {
      console.error("Gagal menyimpan data:", err);
      alert("Terjadi kesalahan saat menyimpan data.");
    }
  });
}

function resetForm() {
  form.reset();
  kategoriInput.style.display = "none";
  kategoriButtons.forEach(btn => btn.classList.remove("active"));
  tanggalInput.valueAsDate = new Date();
  editDocId = null;
  btnSimpan.textContent = "Simpan ✔";
  nominalInput.value = "";
}

async function loadRiwayatPengeluaran() {
  tbody.innerHTML = `<tr><td colspan='5' style='text-align:center'>Memuat data...</td></tr>`;
  try {
    const db = firebase.firestore();
    const snapshot = await db.collection("pengeluaran")
      .where("userId", "==", uid)
      .orderBy("tanggal", "desc")
      .get();

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan='5' style='text-align:center'>Tidak ada data pengeluaran.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>Rp ${data.nominal.toLocaleString("id-ID")}</td>
        <td>${data.deskripsi}</td>
        <td>${new Date(data.tanggal).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        <td>${data.kategori}</td>
        <td class="action-buttons">
          <button class="btn btn-sm btn-warning me-1 btn-edit">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-delete">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;

      const btnEdit = tr.querySelector(".btn-edit");
      btnEdit.addEventListener("click", () => isiFormEdit(doc.id, data));

      const btnDelete = tr.querySelector(".btn-delete");
      btnDelete.addEventListener("click", () => {
        if (confirm("Yakin ingin menghapus pengeluaran ini?")) {
          hapusData(doc.id);
        }
      });

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Gagal memuat riwayat pengeluaran:", err);
    tbody.innerHTML = `<tr><td colspan='5' style='text-align:center'>Gagal memuat data.</td></tr>`;
  }
}

function isiFormEdit(docId, data) {
  editDocId = docId;
  
  // Format nominal dengan ribuan saat isi form edit
  nominalInput.value = data.nominal.toLocaleString("id-ID");
  deskripsiInput.value = data.deskripsi;
  tanggalInput.value = data.tanggal;

  kategoriButtons.forEach(btn => btn.classList.remove("active"));

  let found = false;
  for (const btn of kategoriButtons) {
    if (btn.textContent.trim() === data.kategori) {
      btn.classList.add("active");
      kategoriInput.style.display = "none";
      kategoriInput.value = "";
      found = true;
      break;
    }
  }

  if (!found) {
    document.getElementById("btn-lainnya").classList.add("active");
    kategoriInput.style.display = "inline-block";
    kategoriInput.value = data.kategori;
  }

  btnSimpan.textContent = "Update ✔";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hapusData(docId) {
  firebase.firestore().collection("pengeluaran").doc(docId).delete()
    .then(() => {
      alert("Data pengeluaran berhasil dihapus.");
      loadRiwayatPengeluaran();
      if (editDocId === docId) resetForm();
    })
    .catch(err => {
      console.error("Gagal hapus data:", err);
      alert("Terjadi kesalahan saat menghapus data.");
    });
}

// Format input nominal saat user mengetik
function setupNominalFormatting() {
  nominalInput.addEventListener("input", e => {
    // Simpan posisi kursor awal
    let cursorPosition = nominalInput.selectionStart;
    
    // Hapus semua selain angka
    let value = nominalInput.value.replace(/[^0-9]/g, "");
    if(value === "") {
      nominalInput.value = "";
      return;
    }
    
    // Format ke ribuan pakai titik
    let formatted = "";
    let counter = 0;
    for (let i = value.length - 1; i >= 0; i--) {
      formatted = value[i] + formatted;
      counter++;
      if (counter === 3 && i !== 0) {
        formatted = "." + formatted;
        counter = 0;
      }
    }
    
    nominalInput.value = formatted;
    
    // Koreksi posisi kursor supaya tidak melompat aneh
    // Ini opsional, bisa disesuaikan lebih lanjut jika perlu
    nominalInput.selectionStart = nominalInput.selectionEnd = cursorPosition + (nominalInput.value.length - value.length);
  });
}
