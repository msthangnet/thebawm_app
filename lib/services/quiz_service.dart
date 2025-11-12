import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/quiz.dart';

class QuizService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<Quiz>> getQuizzesStream() {
    return _firestore.collection('quizzes').orderBy('createdAt', descending: true).snapshots().map((snap) => snap.docs.map((d) => Quiz.fromFirestore(d)).toList());
  }

  Future<Quiz?> getQuiz(String id) async {
    try {
      final doc = await _firestore.collection('quizzes').doc(id).get();
      if (!doc.exists) return null;
      return Quiz.fromFirestore(doc);
    } catch (e, s) {
      developer.log('Error getting quiz', name: 'QuizService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createQuiz(Quiz quiz) async {
    try {
      final doc = await _firestore.collection('quizzes').add(quiz.toMap());
      return doc.id;
    } catch (e, s) {
      developer.log('Error creating quiz', name: 'QuizService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<bool> updateQuiz(String id, Map<String, dynamic> updates) async {
    try {
      await _firestore.collection('quizzes').doc(id).update(updates);
      return true;
    } catch (e, s) {
      developer.log('Error updating quiz', name: 'QuizService', error: e, stackTrace: s);
      return false;
    }
  }
}
