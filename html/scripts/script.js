 // Pastikan auth & db sudah didefinisikan sebelumnya
const signupForm = document.querySelector('.signup-form form');
const loginForm = document.querySelector('.login-form form');

// SIGN UP
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = signupForm.txt.value.trim();
    const email = signupForm.email.value.trim();
    const password = signupForm.pswd.value;

    if (!username || !email || !password) {
      alert('Semua form wajib diisi!');
      return;
    }

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      await user.updateProfile({ displayName: username });

      await db.collection('users').doc(user.uid).set({
        username,
        email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert('Registrasi berhasil!');
      window.location.href = 'menu.html';
    } catch (error) {
      alert('Gagal daftar: ' + error.message);
      console.error(error);
    }
  });
}

// LOGIN
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = loginForm.email.value.trim();
    const password = loginForm.pswd.value;

    if (!email || !password) {
      alert("Email dan password wajib diisi!");
      return;
    }

    try {
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = 'menu.html';
    } catch (error) {
      alert('Login gagal: ' + error.message);
      console.error(error);
    }
  });
}
