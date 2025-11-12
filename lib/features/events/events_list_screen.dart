import 'package:flutter/material.dart';
import 'package:myapp/services/event_service.dart';
import 'package:myapp/models/event.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'event_detail_screen.dart';
import 'create_edit_event_screen.dart';

class EventsListScreen extends StatelessWidget {
  const EventsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = EventService();
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Events'), actions: [
        if (auth.user != null)
          IconButton(onPressed: () async {
            final created = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateEditEventScreen()));
            if (created == true) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Event created')));
          }, icon: const Icon(Icons.add))
      ]),
      body: StreamBuilder<List<EventInfo>>(
        stream: service.getEventsStream(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final events = snapshot.data ?? [];
          if (events.isEmpty) {
            return const Center(child: Text('No events yet'));
          }
          return ListView.builder(
            itemCount: events.length,
            itemBuilder: (context, index) {
              final e = events[index];
              return ListTile(
                leading: e.profilePictureUrl != null
                    ? CircleAvatar(backgroundImage: NetworkImage(e.profilePictureUrl!))
                    : const CircleAvatar(child: Icon(Icons.event)),
                title: Text(e.name),
                subtitle: Text(e.category),
                onTap: () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventDetailScreen(eventId: e.id)));
                },
              );
            },
          );
        },
      ),
    );
  }
}
