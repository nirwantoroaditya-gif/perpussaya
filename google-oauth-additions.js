const GOOGLE_CLIENT_ID = '514255094974-vpfjf4tmapvs4fbh63d7725or0mr7j3e.apps.googleusercontent.com';

function initGoogleAuth() {
  if (typeof google === 'undefined' || !google.accounts) {
    setTimeout(initGoogleAuth, 500);
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  console.log('✅ Google Auth siap.');
}

function renderGoogleBtn(containerId, theme, size, text) {
  if (typeof google === 'undefined' || !google.accounts) return;
  var container = document.getElementById(containerId);
  if (!container) return;
  google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: theme || 'outline',
    size: size || 'large',
    text: text || 'signin_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: container.offsetWidth || 340,
  });
}

function signInWithGoogle() {
  if (typeof google === 'undefined' || !google.accounts) {
    showToast('Layanan Google belum siap.', 'error');
    return;
  }
  google.accounts.id.prompt();
}

function handleGoogleCredential(response) {
  try {
    var parts   = response.credential.split('.');
    var payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));

    var googleEmail   = payload.email   || '';
    var googleName    = payload.name    || 'Pengguna Google';
    var googlePicture = payload.picture || null;
    var googleSub     = payload.sub     || '';

    var matchedAcc = ACCOUNTS.find(function(a) {
      return a.email && a.email.toLowerCase() === googleEmail.toLowerCase();
    });

    var user;
    if (matchedAcc) {
      user = matchedAcc;
      showToast('Login Google berhasil sebagai ' + user.role + '!', 'success');
    } else {
      var initials = googleName.split(' ').map(function(w){ return w[0]; }).join('').substring(0,2).toUpperCase();
      user = {
        id: 'siswa', nis: 'G-' + googleSub.substring(0,8),
        pass: '', name: googleName, role: 'Siswa',
        email: googleEmail, avatar: initials, color: '#3b7cf4',
      };
      showToast('Selamat datang, ' + googleName.split(' ')[0] + '! Terdaftar sebagai Siswa.', 'success');
    }

    if (googlePicture) user.avatarPhoto = googlePicture;

    currentUser = user;
    closeLoginModal();

    var loginBtn = document.getElementById('navLoginBtn');
    var userPill = document.getElementById('navUserPill');
    if (loginBtn) loginBtn.style.display = 'none';
    if (userPill) userPill.style.display = 'flex';

    ['tabBtnPinjam','tabBtnRiwayat','tabBtnDenda','tabBtnProfil'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.style.opacity = '1'; el.title = ''; }
    });

    document.querySelectorAll('.admin-tab').forEach(function(t){
      t.style.display = 'none';
    });

    loadUserToUI(user);
    loadFromCloud().then(function() {
      startPolling();
      showDueDateBanner();
    });

    if (typeof _pendingTabAfterLogin !== 'undefined' && _pendingTabAfterLogin) {
      var tab = _pendingTabAfterLogin;
      _pendingTabAfterLogin = null;
      setTimeout(function(){ switchMainTab(tab); }, 400);
    }

  } catch(err) {
    console.error('Google error:', err);
    showToast('Gagal login Google. Coba lagi.', 'error');
  }
}

function revokeGoogleSession() {
  if (typeof google === 'undefined' || !google.accounts) return;
  if (!currentUser || !currentUser.email) return;
  try {
    google.accounts.id.revoke(currentUser.email, function(){});
  } catch(e) {}
}