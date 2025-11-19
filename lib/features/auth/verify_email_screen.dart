import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart' as app_auth;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:myapp/config/app_routes.dart';

class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  bool _isSending = false;
  int _resendTimer = 60;
  Timer? _timer;
  Timer? _verificationTimer;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  @override
  void initState() {
    super.initState();
    // Periodically check email verification status
    _verificationTimer = Timer.periodic(const Duration(seconds: 3), (
      timer,
    ) async {
      await _auth.currentUser?.reload();
      final user = _auth.currentUser;
      if (user?.emailVerified == true) {
        timer.cancel();
        if (mounted) {
          // Clear provider verification flag if present
          final auth = Provider.of<app_auth.AuthProvider>(
            context,
            listen: false,
          );
          if (auth.requiresEmailVerification) {
            // provider will pick up authStateChanges and update status
          }
          context.go(AppRoutes.home);
        }
      }
    });
    startResendTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _verificationTimer?.cancel();
    super.dispose();
  }

  void startResendTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendTimer > 0) {
        setState(() {
          _resendTimer--;
        });
      } else {
        _timer?.cancel();
      }
    });
  }

  void _resendEmail() async {
    if (_resendTimer == 0) {
      setState(() {
        _isSending = true;
      });

      try {
        await _auth.currentUser?.sendEmailVerification();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Verification email sent!')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
        }
      }

      setState(() {
        _isSending = false;
        _resendTimer = 60;
      });
      startResendTimer();
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Verify Email')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.email_outlined, size: 80),
              const SizedBox(height: 24),
              Text(
                'Check Your Inbox',
                style: textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Builder(builder: (context) {
                final pendingEmail = Provider.of<app_auth.AuthProvider>(
                      context,
                    ).pendingEmail ??
                    _auth.currentUser?.email;
                return Text(
                  'We have sent a verification link to $pendingEmail. Please check your email and click the link to verify your account.',
                  textAlign: TextAlign.center,
                );
              }),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isSending || _resendTimer > 0 ? null : _resendEmail,
                child: _isSending
                    ? const CircularProgressIndicator()
                    : Text(
                        _resendTimer > 0
                            ? 'Resend in $_resendTimer seconds'
                            : 'Resend Verification Email',
                      ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextButton(
                    onPressed: () => context.go(AppRoutes.login),
                    child: const Text('Back to Login'),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () async {
                      await _auth.signOut();
                      if (!context.mounted) return;
                      context.go(AppRoutes.landing);
                    },
                    child: const Text('Cancel'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
