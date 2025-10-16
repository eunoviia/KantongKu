// home.js

document.addEventListener('DOMContentLoaded', () => {
  const daftarBtn = document.querySelector('.btn-daftar');
  const masukBtn = document.querySelector('.btn-masuk');

  if (daftarBtn) {
    daftarBtn.addEventListener('click', () => {
      window.location.href = 'login.html'; // arahkan ke halaman login untuk registrasi
    });
  }

  if (masukBtn) {
    masukBtn.addEventListener('click', () => {
      window.location.href = 'login.html'; // arahkan juga ke halaman login
    });
  }
});
