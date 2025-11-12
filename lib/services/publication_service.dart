import 'dart:io';
import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:myapp/models/publication.dart';
import 'package:myapp/models/publication_page.dart';

class PublicationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<Publication>> getPublicationsStream() {
    return _firestore.collection('publications').orderBy('createdAt', descending: true).snapshots().map((snap) {
      return snap.docs.map((d) => Publication.fromFirestore(d)).toList();
    });
  }

  Future<Publication?> getPublication(String id) async {
    try {
      final doc = await _firestore.collection('publications').doc(id).get();
      if (!doc.exists) return null;
      return Publication.fromFirestore(doc);
    } catch (e, s) {
      developer.log('Error getting publication', name: 'PublicationService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createPublicationWithPages(Publication pub, {File? coverFile, Map<String, List<File>>? pageFiles, List<PublicationPage>? pages}) async {
    try {
      final docRef = _firestore.collection('publications').doc();
      final id = docRef.id;
      final data = pub.toMap();
      data['id'] = id;
      data['bookId'] = pub.bookId;

      if (coverFile != null) {
        final ref = FirebaseStorage.instance.ref().child('publications/$id/cover/${coverFile.path.split('/').last}');
        await ref.putFile(coverFile);
        data['coverPhotoUrl'] = await ref.getDownloadURL();
      }

      await docRef.set(data);

      // pages: optional list of PublicationPage objects with metadata
      if ((pages != null && pages.isNotEmpty) || (pageFiles != null && pageFiles.isNotEmpty)) {
        final batch = _firestore.batch();

        // If pages metadata provided, persist those docs (and include any files below)
        if (pages != null) {
          for (final page in pages) {
            final pageRef = docRef.collection('pages').doc(page.id);
            final files = pageFiles != null ? pageFiles[page.id] ?? [] : [];
            final imageUrls = <String>[];
            for (final f in files) {
              final pRef = FirebaseStorage.instance.ref().child('publications/$id/pages/${page.id}/${f.path.split('/').last}');
              final task = await pRef.putFile(f);
              final url = await task.ref.getDownloadURL();
              imageUrls.add(url);
            }
            final data = {
              'id': page.id,
              'title': page.title,
              'content': page.content,
              'order': page.order,
              'imageUrls': imageUrls,
            };
            batch.set(pageRef, data, SetOptions(merge: true));
          }
        } else if (pageFiles != null) {
          // Fallback: no metadata provided, but pageFiles present -> create pages with imageUrls only
          for (final entry in pageFiles.entries) {
            final pageId = entry.key;
            final files = entry.value;
            final pageRef = docRef.collection('pages').doc(pageId);
            final imageUrls = <String>[];
            for (final f in files) {
              final pRef = FirebaseStorage.instance.ref().child('publications/$id/pages/$pageId/${f.path.split('/').last}');
              final task = await pRef.putFile(f);
              final url = await task.ref.getDownloadURL();
              imageUrls.add(url);
            }
            batch.set(pageRef, {
              'id': pageId,
              'imageUrls': imageUrls,
            }, SetOptions(merge: true));
          }
        }

        await batch.commit();
      }

      return id;
    } catch (e, s) {
      developer.log('Error creating publication', name: 'PublicationService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<bool> updatePublication(String id, Map<String, dynamic> updates, {File? coverFile, Map<String, List<File>>? pageFiles, List<PublicationPage>? pages}) async {
    try {
      final docRef = _firestore.collection('publications').doc(id);
      if (coverFile != null) {
        final ref = FirebaseStorage.instance.ref().child('publications/$id/cover/${coverFile.path.split('/').last}');
        await ref.putFile(coverFile);
        updates['coverPhotoUrl'] = await ref.getDownloadURL();
      }
      await docRef.update(updates);

      if ((pages != null && pages.isNotEmpty) || (pageFiles != null && pageFiles.isNotEmpty)) {
        final batch = _firestore.batch();

        // If pages metadata provided, update those docs and include any new image uploads
        if (pages != null) {
          for (final page in pages) {
            final pageRef = docRef.collection('pages').doc(page.id);
            final files = pageFiles != null ? pageFiles[page.id] ?? [] : [];
            final newImageUrls = <String>[];
            for (final f in files) {
              final pRef = FirebaseStorage.instance.ref().child('publications/$id/pages/${page.id}/${f.path.split('/').last}');
              final task = await pRef.putFile(f);
              final url = await task.ref.getDownloadURL();
              newImageUrls.add(url);
            }

            final data = {
              'id': page.id,
              'title': page.title,
              'content': page.content,
              'order': page.order,
            };

            // If there are new images, add them to imageUrls array
            if (newImageUrls.isNotEmpty) {
              data['imageUrls'] = FieldValue.arrayUnion(newImageUrls);
            }

            batch.set(pageRef, data, SetOptions(merge: true));
          }
        } else if (pageFiles != null) {
          // Fallback: only new files provided for pages (no metadata updates)
          for (final entry in pageFiles.entries) {
            final pageId = entry.key;
            final files = entry.value;
            final pageRef = docRef.collection('pages').doc(pageId);
            final imageUrls = <String>[];
            for (final f in files) {
              final pRef = FirebaseStorage.instance.ref().child('publications/$id/pages/$pageId/${f.path.split('/').last}');
              final task = await pRef.putFile(f);
              final url = await task.ref.getDownloadURL();
              imageUrls.add(url);
            }
            batch.set(pageRef, {
              'id': pageId,
              'imageUrls': FieldValue.arrayUnion(imageUrls),
            }, SetOptions(merge: true));
          }
        }

        await batch.commit();
      }

      return true;
    } catch (e, s) {
      developer.log('Error updating publication', name: 'PublicationService', error: e, stackTrace: s);
      return false;
    }
  }

  Future<bool> removePageImageUrl(String publicationId, String pageId, String url) async {
    try {
      final pageRef = _firestore.collection('publications').doc(publicationId).collection('pages').doc(pageId);
      await pageRef.update({'imageUrls': FieldValue.arrayRemove([url])});
      return true;
    } catch (e, s) {
      developer.log('Error removing page image url', name: 'PublicationService', error: e, stackTrace: s);
      return false;
    }
  }

  Stream<List<PublicationPage>> getPagesStream(String publicationId) {
    return _firestore.collection('publications').doc(publicationId).collection('pages').orderBy('order').snapshots().map((snap) {
      return snap.docs.map((d) => PublicationPage.fromFirestore(d)).toList();
    });
  }

  Future<List<PublicationPage>> getPagesOnce(String publicationId) async {
    try {
      final snap = await _firestore.collection('publications').doc(publicationId).collection('pages').orderBy('order').get();
      return snap.docs.map((d) => PublicationPage.fromFirestore(d)).toList();
    } catch (e, s) {
      developer.log('Error fetching pages once', name: 'PublicationService', error: e, stackTrace: s);
      return [];
    }
  }
}
