import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/about_bawm_page.dart';

class AboutBawm {
  final String id;
  final String title;
  final String slug;
  final String? description;
  final String? coverPhotoUrl;
  final String? authorId;
  final bool isPublished;
  final DateTime? publishDate;
  final int readCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<AboutBawmPage>? pages;

  AboutBawm({
    required this.id,
    required this.title,
    required this.slug,
    this.description,
    this.coverPhotoUrl,
    this.authorId,
    this.isPublished = true,
    this.publishDate,
    this.readCount = 0,
    this.createdAt,
    this.updatedAt,
    this.pages,
  });

  factory AboutBawm.fromFirestore(DocumentSnapshot doc, {List<AboutBawmPage>? pages}) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return AboutBawm(
      id: doc.id,
      title: data['title'] ?? '',
      slug: data['slug'] ?? '',
      description: data['description'] ?? '',
      coverPhotoUrl: data['coverPhotoUrl'],
      authorId: data['authorId'],
      isPublished: data['isPublished'] ?? true,
      publishDate: data['publishDate'] is Timestamp ? (data['publishDate'] as Timestamp).toDate() : null,
      readCount: (data['readCount'] is int) ? data['readCount'] as int : (data['readCount'] is num ? (data['readCount'] as num).toInt() : 0),
      createdAt: data['createdAt'] is Timestamp ? (data['createdAt'] as Timestamp).toDate() : null,
      updatedAt: data['updatedAt'] is Timestamp ? (data['updatedAt'] as Timestamp).toDate() : null,
      pages: pages,
    );
  }
}
