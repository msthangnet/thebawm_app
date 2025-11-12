import 'package:cloud_firestore/cloud_firestore.dart';

class AboutInfo {
  final String id;
  final String title;
  final String content; // markdown or html
  final DateTime? updatedAt;

  AboutInfo({required this.id, required this.title, required this.content, this.updatedAt});

  factory AboutInfo.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return AboutInfo(
      id: doc.id,
      title: data['title'] ?? '',
      content: data['content'] ?? '',
      updatedAt: data['updatedAt'] is Timestamp ? (data['updatedAt'] as Timestamp).toDate() : null,
    );
  }
}
