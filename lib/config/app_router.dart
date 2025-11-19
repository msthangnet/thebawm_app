import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:myapp/config/app_routes.dart';
import 'package:myapp/features/auth/forgot_password_screen.dart';
import 'package:myapp/features/auth/login_screen.dart';
import 'package:myapp/features/auth/signup_screen.dart';
import 'package:myapp/features/auth/verify_email_screen.dart';
import 'package:myapp/features/auth/landing_screen.dart';
import 'package:myapp/features/home/home_screen.dart';
import 'package:myapp/features/profile/profile_route.dart';
import 'package:myapp/features/pages/pages_list_screen.dart';
import 'package:myapp/features/groups/groups_list_screen.dart';
import 'package:myapp/features/events/events_list_screen.dart';
import 'package:myapp/features/books/books_list_screen.dart';
import 'package:myapp/features/videos/videos_list_screen.dart';
import 'package:myapp/features/lyrics/lyrics_list_screen.dart';
import 'package:myapp/features/quiz/quizzes_list_screen.dart';
import 'package:myapp/features/marketplace/marketplace_list_screen.dart';
import 'package:myapp/features/about/about_screen.dart';
import 'package:myapp/features/about_bawm/abouts_list_screen.dart';
import 'package:myapp/features/about_bawm/about_bawm_reader_route.dart';
import 'package:myapp/features/settings/settings_screen.dart';
import 'package:myapp/providers/auth_provider.dart';

class AppRouter {
  final AuthProvider authProvider;

  AppRouter({required this.authProvider});

  late final GoRouter router = GoRouter(
    refreshListenable: authProvider,
    initialLocation: AppRoutes.landing,
    routes: [
      GoRoute(
        path: AppRoutes.landing,
        builder: (context, state) => const LandingScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/pages',
        builder: (context, state) => const PagesListScreen(),
      ),
      GoRoute(
        path: '/groups',
        builder: (context, state) => const GroupsListScreen(),
      ),
      GoRoute(
        path: '/events',
        builder: (context, state) => const EventsListScreen(),
      ),
      GoRoute(
        path: '/books',
        builder: (context, state) => const BooksListScreen(),
      ),
      GoRoute(
        path: '/videos',
        builder: (context, state) => const VideosListScreen(),
      ),
      GoRoute(
        path: '/lyrics',
        builder: (context, state) => const LyricsListScreen(),
      ),
      GoRoute(
        path: '/quizzes',
        builder: (context, state) => const QuizzesListScreen(),
      ),
      GoRoute(
        path: '/marketplace',
        builder: (context, state) => const MarketplaceListScreen(),
      ),
      GoRoute(
        path: '/about',
        builder: (context, state) => const AboutScreen(),
      ),
      GoRoute(
        path: AppRoutes.aboutBawm,
        builder: (context, state) => const AboutsListScreen(),
      ),
      GoRoute(
        path: AppRoutes.aboutBawmReader,
        builder: (context, state) {
          final slug = state.pathParameters['slug']!;
          return AboutBawmReaderRoute(slug: slug);
        },
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.signup,
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.verifyEmail,
        builder: (context, state) => const VerifyEmailScreen(),
      ),
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) {
          final username = state.pathParameters['username']!;
          return ProfileRoute(username: username);
        },
      ),
      GoRoute(
        path: AppRoutes.settings,
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
    redirect: (context, state) {
      final auth = context.read<AuthProvider>();
      final isLoggedIn = auth.status == AuthStatus.authenticated;

      // Pages allowed for unauthenticated users
      final allowedWhenUnauthenticated = {
        AppRoutes.landing,
        AppRoutes.login,
        AppRoutes.signup,
        AppRoutes.forgotPassword,
        AppRoutes.verifyEmail,
      };

      final goingTo = state.matchedLocation;

      // If user requires email verification, always send them to verify page
      if (auth.requiresEmailVerification && goingTo != AppRoutes.verifyEmail) {
        return AppRoutes.verifyEmail;
      }

      if (!isLoggedIn && !allowedWhenUnauthenticated.contains(goingTo)) {
        return AppRoutes.landing;
      }

      if (isLoggedIn && allowedWhenUnauthenticated.contains(goingTo)) {
        return AppRoutes.home;
      }

      return null;
    },
  );
}
