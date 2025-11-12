import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myapp/models/connection.dart';
import 'package:myapp/models/connection_status.dart';

class ConnectionService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<Connection>> getConnectionsForUser(String userId) {
    return _firestore
        .collection('connections')
        .where('userId', isEqualTo: userId)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map((doc) => Connection.fromFirestore(doc))
              .toList(),
        );
  }

  Stream<ConnectionStatus> getConnectionStatus(
    String currentUserId,
    String otherUserId,
  ) {
    return _firestore.collection('connections').snapshots().map((snapshot) {
      final docs = snapshot.docs;
      final requestSent = docs.any(
        (doc) =>
            doc.data()['userId'] == currentUserId &&
            doc.data()['connectedUserId'] == otherUserId &&
            doc.data()['status'] == 'pending',
      );
      if (requestSent) return ConnectionStatus.requestSent;

      final requestReceived = docs.any(
        (doc) =>
            doc.data()['userId'] == otherUserId &&
            doc.data()['connectedUserId'] == currentUserId &&
            doc.data()['status'] == 'pending',
      );
      if (requestReceived) return ConnectionStatus.requestReceived;

      final connected = docs.any(
        (doc) =>
            ((doc.data()['userId'] == currentUserId &&
                    doc.data()['connectedUserId'] == otherUserId) ||
                (doc.data()['userId'] == otherUserId &&
                    doc.data()['connectedUserId'] == currentUserId)) &&
            doc.data()['status'] == 'connected',
      );
      if (connected) return ConnectionStatus.connected;

      return ConnectionStatus.notConnected;
    });
  }

  Future<void> sendConnectionRequest(
    String currentUserId,
    String otherUserId,
  ) async {
    await _firestore.collection('connections').add({
      'userId': currentUserId,
      'connectedUserId': otherUserId,
      'status': 'pending',
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> acceptConnection(
    String currentUserId,
    String otherUserId,
  ) async {
    final query = await _firestore
        .collection('connections')
        .where('userId', isEqualTo: otherUserId)
        .where('connectedUserId', isEqualTo: currentUserId)
        .where('status', isEqualTo: 'pending')
        .get();

    if (query.docs.isNotEmpty) {
      final docId = query.docs.first.id;
      await _firestore.collection('connections').doc(docId).update({
        'status': 'connected',
      });
    }
  }

  Future<void> disconnect(String currentUserId, String otherUserId) async {
    final query = await _firestore
        .collection('connections')
        .where('status', isEqualTo: 'connected')
        .get();
    final docs = query.docs;
    try {
      final connection = docs.firstWhere(
        (doc) =>
            (doc.data()['userId'] == currentUserId &&
                doc.data()['connectedUserId'] == otherUserId) ||
            (doc.data()['userId'] == otherUserId &&
                doc.data()['connectedUserId'] == currentUserId),
      );
      await _firestore.collection('connections').doc(connection.id).delete();
    } catch (e) {
      // No connection found, do nothing
    }
  }
}
