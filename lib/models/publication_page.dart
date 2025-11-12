import 'package:cloud_firestore/cloud_firestore.dart';

class PublicationPage {
  String id;
  String title;
  String content;
  String contentType; // 'paragraph' | 'code'
  List<String> imageUrls;
  int order;

  PublicationPage({
    required this.id,
    required this.title,
    required this.content,
    this.contentType = 'paragraph',
    this.imageUrls = const [],
    this.order = 0,
  });

  factory PublicationPage.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return PublicationPage(
      id: doc.id,
      title: data['title'] ?? '',
      content: data['content'] ?? '',
      contentType: data['contentType'] ?? 'paragraph',
      imageUrls: List<String>.from(data['imageUrls'] ?? []),
      order: data['order'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'title': title,
        'content': content,
        'contentType': contentType,
        'imageUrls': imageUrls,
        'order': order,
      };
}
