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
  } else {
    window.location.href = "login.html";
  }
});

function getDocIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function formatRupiah(angka) {
  const num = Number(angka);
  if (isNaN(num)) return "Rp 0";
  return "Rp " + num.toLocaleString("id-ID");
}

function updateProgressBar(progressPercent) {
  const progressFill = document.getElementById("progressFill");
  const progressLabel = document.getElementById("progressLabel");
  progressFill.style.width = progressPercent + "%";
  progressLabel.textContent = `Progress: ${progressPercent.toFixed(2)}%`;
}

function updateTargetMenabungDaily(data) {
  const now = new Date();
  if (!data.tanggal) return "";
  const targetDate = new Date(data.tanggal);
  if (targetDate <= now) return "Tanggal target sudah lewat atau hari ini.";

  const daysLeft = Math.max(Math.ceil((targetDate - now) / (1000*60*60*24)), 1);
  const sisaDana = (Number(data.target) || 0) - (Number(data.terkumpul) || 0);
  if (sisaDana <= 0) return "Target dana sudah tercapai.";

  const targetPerHari = sisaDana / daysLeft;
  return `Anda perlu menabung sekitar <strong>${formatRupiah(targetPerHari.toFixed(0))}</strong> per hari selama ${daysLeft} hari ke depan.`;
}

function updateTargetMenabungMonthly(data) {
  const now = new Date();
  if (!data.tanggal) return "";
  const targetDate = new Date(data.tanggal);
  if (targetDate <= now) return "Tanggal target sudah lewat atau hari ini.";

  let months = (targetDate.getFullYear() - now.getFullYear()) * 12;
  months += targetDate.getMonth() - now.getMonth();
  if (months <= 0) months = 1;

  const sisaDana = (Number(data.target) || 0) - (Number(data.terkumpul) || 0);
  if (sisaDana <= 0) return "Target dana sudah tercapai.";

  const targetPerBulan = sisaDana / months;
  return `Anda perlu menabung sekitar <strong>${formatRupiah(targetPerBulan.toFixed(0))}</strong> per bulan selama ${months} bulan ke depan.`;
}

function updateTargetMenabungByType(data, type) {
  const targetMenabungEl = document.getElementById("targetMenabung");
  if (type === "daily") {
    targetMenabungEl.innerHTML = updateTargetMenabungDaily(data);
  } else if (type === "monthly") {
    targetMenabungEl.innerHTML = updateTargetMenabungMonthly(data);
  }
}

// Render detail data ke halaman
function renderDetail(data) {
  document.getElementById("nama").textContent = data.nama || "-";
  document.getElementById("target").textContent = formatRupiah(data.target || 0);
  document.getElementById("terkumpul").textContent = formatRupiah(data.terkumpul || 0);
  document.getElementById("tanggal").textContent = data.tanggal || "-";

  let progressPercent = 0;
  if (data.target && data.terkumpul) {
    progressPercent = Math.min(100, (data.terkumpul / data.target) * 100);
  }
  updateProgressBar(progressPercent);

  // Update target menabung default (per hari)
  const checkedRadio = document.querySelector('input[name="calcType"]:checked');
  updateTargetMenabungByType(data, checkedRadio ? checkedRadio.value : "daily");
}

// Isi form edit dengan data
function fillEditForm(data) {
  document.getElementById("editNama").value = data.nama || "";
  document.getElementById("editTarget").value = data.target || 0;
  document.getElementById("editTerkumpul").value = data.terkumpul || 0;
  document.getElementById("editTanggal").value = data.tanggal || "";
}

// Toggle mode detail <-> edit
function toggleEditMode(isEdit) {
  document.getElementById("detailView").style.display = isEdit ? "none" : "block";
  document.getElementById("editForm").style.display = isEdit ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", async () => {
  const id = getDocIdFromUrl();
  if (!id) {
    alert("ID cita-cita tidak ditemukan.");
    return;
  }

  let currentData = null;

  async function loadData() {
    try {
      const doc = await db.collection("cita-cita").doc(id).get();
      if (!doc.exists) {
        alert("Data cita-cita tidak ditemukan.");
        return;
      }
      currentData = doc.data();
      renderDetail(currentData);
    } catch (err) {
      console.error("Gagal memuat data:", err);
      alert("Gagal memuat data, coba lagi.");
    }
  }

  await loadData();

  // Radio toggle perhitungan target menabung
  const radios = document.querySelectorAll('input[name="calcType"]');
  radios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (currentData) {
        updateTargetMenabungByType(currentData, radio.value);
      }
    });
  });

  // Tombol Edit
  document.getElementById("btnEdit").addEventListener("click", () => {
    fillEditForm(currentData);
    toggleEditMode(true);
  });

  // Tombol Batal edit
  document.getElementById("btnCancel").addEventListener("click", () => {
    toggleEditMode(false);
  });

  // Tombol Hapus
  document.getElementById("btnDelete").addEventListener("click", async () => {
    const confirmed = confirm("Yakin ingin menghapus cita-cita ini?");
    if (!confirmed) return;

    try {
      await db.collection("cita-cita").doc(id).delete();
      alert("Data cita-cita berhasil dihapus.");
      window.location.href = "citacita.html"; // Kembali ke halaman list
    } catch (err) {
      console.error("Gagal hapus data:", err);
      alert("Gagal menghapus data, coba lagi.");
    }
  });

  // Simpan data edit
  document.getElementById("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nama = document.getElementById("editNama").value.trim();
    const target = Number(document.getElementById("editTarget").value);
    const terkumpul = Number(document.getElementById("editTerkumpul").value);
    const tanggal = document.getElementById("editTanggal").value;

    if (!nama || isNaN(target) || isNaN(terkumpul) || !tanggal) {
      alert("Harap isi semua data dengan benar.");
      return;
    }
    if (target < 0 || terkumpul < 0) {
      alert("Nilai target dan terkumpul tidak boleh negatif.");
      return;
    }
    if (terkumpul > target) {
      alert("Dana terkumpul tidak boleh lebih besar dari target.");
      return;
    }

    try {
      await db.collection("cita-cita").doc(id).update({
        nama,
        target,
        terkumpul,
        tanggal,
      });
      alert("Data berhasil diperbarui.");
      currentData = { nama, target, terkumpul, tanggal };
      renderDetail(currentData);
      toggleEditMode(false);
    } catch (err) {
      console.error("Gagal menyimpan data:", err);
      alert("Gagal menyimpan data, coba lagi.");
    }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const btnBack = document.getElementById('btnBack');
  if (btnBack) {
    btnBack.addEventListener('click', function() {
      window.location.href = 'homecitacita.html';
    });
  }

  const btnBackEdit = document.getElementById('btnBackEdit');
  if (btnBackEdit) {
    btnBackEdit.addEventListener('click', function() {
      window.location.href = 'homecitacita.html';
    });
  }
});
