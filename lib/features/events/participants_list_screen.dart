import 'package:flutter/material.dart';
import 'package:myapp/services/event_service.dart';

class EventParticipantsListScreen extends StatelessWidget {
  final String eventId;

  const EventParticipantsListScreen({super.key, required this.eventId});

  @override
  Widget build(BuildContext context) {
    final service = EventService();
    return Scaffold(
      appBar: AppBar(title: const Text('Participants')),
      body: StreamBuilder<List<String>>(
        stream: service.getEventParticipantsIdsStream(eventId),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          final ids = snap.data ?? [];
          if (ids.isEmpty) return const Center(child: Text('No participants yet'));
          return ListView.builder(
            itemCount: ids.length,
            itemBuilder: (context, index) {
              final id = ids[index];
              return ListTile(
                title: Text(id),
              );
            },
          );
        },
      ),
    );
  }
}
