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

  AuthProvider() {
    _authService.authStateChanges.listen(_onAuthStateChanged);
    _user = _authService.currentUser;
    _onAuthStateChanged(_user);
  }

  User? get user => _user;
  UserProfile? get userProfile => _userProfile;
  AuthStatus get status => _status;

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
    }
    return userCredential;
  }

  Future<UserCredential?> signIn(String email, String password) async {
    _status = AuthStatus.authenticating;
    notifyListeners();
    return await _authService.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<void> sendPasswordReset(String email) async {
    await _authService.sendPasswordResetEmail(email: email);
  }

  Future<void> signOut() async {
    await _authService.signOut();
  }
}
