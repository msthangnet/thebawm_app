import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/api/auth_service.dart';
import 'package:myapp/models/user_profile.dart';

enum AuthStatus {
  uninitialized,
  authenticated,
  authenticating,
  unauthenticated,
}

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  User? _user;
  UserProfile? _userProfile;
  AuthStatus _status = AuthStatus.uninitialized;
  bool _requiresEmailVerification = false;
  String? _pendingEmail;

  AuthProvider() {
    _authService.authStateChanges.listen(_onAuthStateChanged);
    _user = _authService.currentUser;
    _onAuthStateChanged(_user);
  }

  User? get user => _user;
  UserProfile? get userProfile => _userProfile;
  AuthStatus get status => _status;
  bool get requiresEmailVerification => _requiresEmailVerification;
  String? get pendingEmail => _pendingEmail;

  Future<void> _onAuthStateChanged(User? user) async {
    if (user == null) {
      _user = null;
      _userProfile = null;
      _status = AuthStatus.unauthenticated;
    } else {
      _user = user;
      await user.reload(); // Refresh user state
      if (user.emailVerified) {
        await _fetchUserProfile(user.uid);
        _status = AuthStatus.authenticated;
      } else {
        _status = AuthStatus
            .unauthenticated; // Stay unauthenticated until email is verified
      }
    }
    notifyListeners();
  }

  Future<void> _fetchUserProfile(String uid) async {
    final doc = await _firestore.collection('users').doc(uid).get();
    if (doc.exists) {
      _userProfile = UserProfile.fromFirestore(doc);
    }
  }

  Future<UserCredential?> signUp(String email, String password) async {
    _status = AuthStatus.authenticating;
    notifyListeners();
    UserCredential? userCredential = await _authService
        .signUpWithEmailAndPassword(email: email, password: password);
    if (userCredential?.user != null) {
      await userCredential!.user!.sendEmailVerification();
      _requiresEmailVerification = true;
      _pendingEmail = email;
      // keep user unauthenticated until they verify
      _status = AuthStatus.unauthenticated;
      notifyListeners();
    }
    return userCredential;
  }

  /// Attempts sign in. Returns `true` when the account requires email
  /// verification (user signed in but is not verified). Returns `false`
  /// when sign in succeeded and email is verified (or when sign-in failed).
  Future<bool> signIn(String email, String password) async {
    _status = AuthStatus.authenticating;
    notifyListeners();
    final cred = await _authService.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    bool requiresVerification = false;
    final u = cred?.user ?? _authService.currentUser;
    if (u != null) {
      await u.reload();
      if (!u.emailVerified) {
        try {
          await u.sendEmailVerification();
        } catch (_) {}
        _requiresEmailVerification = true;
        _pendingEmail = email;
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        requiresVerification = true;
      } else {
        _requiresEmailVerification = false;
        _pendingEmail = null;
        // populate profile and mark authenticated
        _user = u;
        _status = AuthStatus.authenticated;
        notifyListeners();
      }
    }

    return requiresVerification;
  }

  Future<void> sendPasswordReset(String email) async {
    await _authService.sendPasswordResetEmail(email: email);
  }

  Future<void> signOut() async {
    await _authService.signOut();
  }
}
