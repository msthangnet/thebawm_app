import 'package:flutter/material.dart';
import 'package:myapp/services/event_service.dart';

class EventPendingParticipantsScreen extends StatelessWidget {
  final String eventId;

  const EventPendingParticipantsScreen({super.key, required this.eventId});

  @override
  Widget build(BuildContext context) {
    final service = EventService();
    return Scaffold(
      appBar: AppBar(title: const Text('Pending Participants')),
      body: StreamBuilder<List<String>>(
        stream: service.getPendingParticipantsIdsStream(eventId),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          final pending = snap.data ?? [];
          if (pending.isEmpty) return const Center(child: Text('No pending participants'));
          return ListView.builder(
            itemCount: pending.length,
            itemBuilder: (context, index) {
              final uid = pending[index];
              return ListTile(
                title: Text(uid),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.check, color: Colors.green),
                      onPressed: () async {
                        try {
                          await service.approveParticipant(eventId, uid);
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Approved')));
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                        }
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.red),
                      onPressed: () async {
                        try {
                          await service.declineParticipant(eventId, uid);
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Declined')));
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                        }
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
