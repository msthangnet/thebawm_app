import 'dart:io';
import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:myapp/models/product.dart';

class MarketplaceService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<Product>> getProductsStream() {
    return _firestore.collection('marketplace').orderBy('createdAt', descending: true).snapshots().map((snap) => snap.docs.map((d) => Product.fromFirestore(d)).toList());
  }

  Future<Product?> getProduct(String id) async {
    try {
      final doc = await _firestore.collection('marketplace').doc(id).get();
      if (!doc.exists) return null;
      return Product.fromFirestore(doc);
    } catch (e, s) {
      developer.log('Error getting product', name: 'MarketplaceService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<String?> createProduct(Product p, {List<File>? images}) async {
    try {
      final docRef = _firestore.collection('marketplace').doc();
      final id = docRef.id;
      final data = p.toMap();
      data['id'] = id;
      final imageUrls = <String>[];
      if (images != null && images.isNotEmpty) {
        for (final f in images) {
          final ref = FirebaseStorage.instance.ref().child('marketplace/$id/${f.path.split('/').last}');
          final task = await ref.putFile(f);
          imageUrls.add(await task.ref.getDownloadURL());
        }
      }
      data['imageUrls'] = imageUrls;
      await docRef.set(data);
      return id;
    } catch (e, s) {
      developer.log('Error creating product', name: 'MarketplaceService', error: e, stackTrace: s);
      return null;
    }
  }

  Future<bool> updateProduct(String id, Map<String, dynamic> updates, {List<File>? newImages}) async {
    try {
      if (newImages != null && newImages.isNotEmpty) {
        final imageUrls = <String>[];
        for (final f in newImages) {
          final ref = FirebaseStorage.instance.ref().child('marketplace/$id/${f.path.split('/').last}');
          final task = await ref.putFile(f);
          imageUrls.add(await task.ref.getDownloadURL());
        }
        updates['imageUrls'] = FieldValue.arrayUnion(imageUrls);
      }
      await _firestore.collection('marketplace').doc(id).update(updates);
      return true;
    } catch (e, s) {
      developer.log('Error updating product', name: 'MarketplaceService', error: e, stackTrace: s);
      return false;
    }
  }
}
