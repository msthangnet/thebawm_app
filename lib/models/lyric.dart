import 'package:cloud_firestore/cloud_firestore.dart';

class Lyric {
  final String id;
  final String title;
  final String content;
  final String authorId;
  final DateTime? createdAt;

  Lyric({required this.id, required this.title, required this.content, required this.authorId, this.createdAt});

  factory Lyric.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return Lyric(
      id: doc.id,
      title: data['title'] ?? '',
      content: data['content'] ?? '',
      authorId: data['authorId'] ?? '',
      createdAt: data['createdAt'] is Timestamp ? (data['createdAt'] as Timestamp).toDate() : null,
    );
  }

  Map<String, dynamic> toMap() => {'title': title, 'content': content, 'authorId': authorId, 'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp()};
}
