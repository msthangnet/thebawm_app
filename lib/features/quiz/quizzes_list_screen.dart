import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/services/quiz_service.dart';
import 'package:myapp/models/quiz.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/user_service.dart';
import 'package:myapp/models/user_profile.dart';
import 'create_edit_quiz_screen.dart';

class QuizzesListScreen extends StatelessWidget {
  const QuizzesListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = QuizService();
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Quizzes'), actions: [
        if (auth.user != null)
          IconButton(onPressed: () async {
            final created = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateEditQuizScreen()));
            if (created == true) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quiz created')));
          }, icon: const Icon(Icons.add))
      ]),
      body: StreamBuilder<List<Quiz>>(
        stream: service.getQuizzesStream(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text('Error: ${snap.error}'));
          final list = snap.data ?? [];
          if (list.isEmpty) return const Center(child: Text('No quizzes yet'));
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final q = list[i];
              return ListTile(
                title: Text(q.title),
                subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${q.questions.length} questions'),
                  FutureBuilder(
                    future: UserService().getUserById(q.authorId),
                    builder: (context, usnap) {
                      if (usnap.connectionState == ConnectionState.waiting) return const SizedBox();
                      final up = usnap.data;
                      if (up == null) return const SizedBox();
                      return Row(children: [if (up.profilePictureUrl != null) Padding(padding: const EdgeInsets.only(right:8.0), child: CircleAvatar(backgroundImage: NetworkImage(up.profilePictureUrl!), radius: 10)), Text(up.displayName)]);
                    },
                  )
                ]),
              );
            },
          );
        },
      ),
    );
  }
}
