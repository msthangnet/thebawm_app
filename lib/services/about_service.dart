import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/about.dart';

class AboutService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<AboutInfo?> getAbout() async {
    try {
      final doc = await _firestore.collection('app').doc('about').get();
      if (!doc.exists) return null;
      return AboutInfo.fromFirestore(doc);
    } catch (e, s) {
      developer.log('Error fetching about', name: 'AboutService', error: e, stackTrace: s);
      return null;
    }
  }
}
