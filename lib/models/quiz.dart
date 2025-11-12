import 'package:cloud_firestore/cloud_firestore.dart';

class QuizQuestion {
  String text;
  List<String> options;
  int answerIndex;

  QuizQuestion({required this.text, required this.options, required this.answerIndex});

  factory QuizQuestion.fromMap(Map<String, dynamic> m) => QuizQuestion(text: m['text'] ?? '', options: List<String>.from(m['options'] ?? []), answerIndex: m['answerIndex'] ?? 0);
  Map<String, dynamic> toMap() => {'text': text, 'options': options, 'answerIndex': answerIndex};
}

class Quiz {
  final String id;
  final String title;
  final List<QuizQuestion> questions;
  final String authorId;
  final DateTime? createdAt;

  Quiz({required this.id, required this.title, required this.questions, required this.authorId, this.createdAt});

  factory Quiz.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return Quiz(
      id: doc.id,
      title: data['title'] ?? '',
      questions: (data['questions'] as List<dynamic>?)?.map((e) => QuizQuestion.fromMap(Map<String, dynamic>.from(e))).toList() ?? [],
      authorId: data['authorId'] ?? '',
      createdAt: data['createdAt'] is Timestamp ? (data['createdAt'] as Timestamp).toDate() : null,
    );
  }

  Map<String, dynamic> toMap() => {
        'title': title,
        'questions': questions.map((q) => q.toMap()).toList(),
        'authorId': authorId,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
      };
}
