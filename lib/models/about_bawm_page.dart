import 'package:cloud_firestore/cloud_firestore.dart';

class AboutBawmPage {
  String id;
  String title;
  String content;
  String contentType;
  List<String> imageUrls;
  int order;

  AboutBawmPage({required this.id, required this.title, this.content = '', this.contentType = 'paragraph', List<String>? imageUrls, this.order = 0}) : imageUrls = imageUrls ?? [];

  factory AboutBawmPage.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return AboutBawmPage(
      id: doc.id,
      title: data['title'] ?? '',
      content: data['content'] ?? '',
      contentType: data['contentType'] ?? 'paragraph',
      imageUrls: (data['imageUrls'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      order: data['order'] is int ? data['order'] as int : (data['order'] is num ? (data['order'] as num).toInt() : 0),
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
