import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/config/app_router.dart';
import 'package:myapp/config/theme.dart';
import 'package:myapp/providers/auth_provider.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Access the AuthProvider here in the build method.
    final authProvider = Provider.of<AuthProvider>(context);
    // Create the AppRouter instance.
    final appRouter = AppRouter(authProvider: authProvider);

    // Use the router configuration.
    return MaterialApp.router(
      title: 'The Bawm',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: appRouter.router,
      debugShowCheckedModeBanner: false,
    );
  }
}
