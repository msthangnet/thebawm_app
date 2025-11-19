import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:myapp/config/app_routes.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/api/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: (value) =>
                    value!.isEmpty ? 'Please enter your email' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                decoration: const InputDecoration(labelText: 'Password'),
                obscureText: true,
                validator: (value) =>
                    value!.isEmpty ? 'Please enter your password' : null,
              ),
              const SizedBox(height: 24),
              if (authProvider.status == AuthStatus.authenticating)
                const CircularProgressIndicator()
                else
                ElevatedButton(
                  onPressed: () async {
                    if (!_formKey.currentState!.validate()) return;
                    final email = _emailController.text;
                    final password = _passwordController.text;
                    final authService = AuthService();
                    final cred = await authService.signInWithEmailAndPassword(
                      email: email,
                      password: password,
                    );
                    final u = cred?.user ?? authService.currentUser;
                    if (u != null) {
                      await u.reload();
                      if (!u.emailVerified) {
                        try {
                          await u.sendEmailVerification();
                        } catch (_) {}
                        if (!context.mounted) return;
                        context.go(AppRoutes.verifyEmail);
                        return;
                      }
                    }
                    // Otherwise the AuthProvider's authStateChanges listener will
                    // update the app routing state when the user is fully signed-in.
                  },
                  child: const Text('Login'),
                ),
              TextButton(
                onPressed: () => context.go(AppRoutes.forgotPassword),
                child: const Text('Forgot Password?'),
              ),
              TextButton(
                onPressed: () => context.go(AppRoutes.signup),
                child: const Text('Don\'t have an account? Sign Up'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
