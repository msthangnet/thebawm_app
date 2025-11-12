import 'package:flutter/material.dart';
import 'package:myapp/services/event_service.dart';
import 'package:myapp/models/event.dart';
import 'package:provider/provider.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/models/user_type.dart';
import 'package:myapp/features/events/participants_list_screen.dart';
import 'package:myapp/features/events/pending_participants_screen.dart';

class EventDetailScreen extends StatefulWidget {
  final String eventId;

  const EventDetailScreen({super.key, required this.eventId});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  final EventService service = EventService();
  late Future<EventInfo?> _eventFuture;

  @override
  void initState() {
    super.initState();
    _eventFuture = service.getEvent(widget.eventId);
  }

  Future<void> _reload() async {
    setState(() {
      _eventFuture = service.getEvent(widget.eventId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Event')),
      body: FutureBuilder<EventInfo?>(
        future: _eventFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final event = snapshot.data;
          if (event == null) return const Center(child: Text('Event not found'));
          final auth = Provider.of<AuthProvider>(context);
          final user = auth.user;
          final profile = auth.userProfile;
          final isParticipant = user != null && event.participants.contains(user.uid);

          void showNoPermission() {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You do not have permission to perform this action.')));
          }

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(event.name, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(event.category, style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 16),
                if (event.description != null) Text(event.description!),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Text('${event.participants.length} participants'),
                    const SizedBox(width: 16),
                    Text('${event.admins.length} admins'),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    ElevatedButton(onPressed: () {
                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventParticipantsListScreen(eventId: event.id))).then((_) => _reload());
                    }, child: const Text('View Participants')),
                    const SizedBox(width: 8),
                    if ((profile != null && (profile.userType == UserType.Admin)) || event.ownerId == auth.user?.uid || event.admins.contains(auth.user?.uid))
                      ElevatedButton(onPressed: () {
                        Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventPendingParticipantsScreen(eventId: event.id))).then((_) => _reload());
                      }, child: const Text('Pending')),
                  ],
                ),
                const SizedBox(height: 12),
                if (user == null)
                  ElevatedButton(onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in to participate in this event.')));
                  }, child: const Text('Participate'))
                else if (profile != null && (profile.userType == UserType.Inactive || profile.userType == UserType.Suspended))
                  ElevatedButton(onPressed: () => showNoPermission(), child: const Text('Participate'))
                else
                  ElevatedButton(
                    onPressed: () async {
                      try {
                        if (isParticipant) {
                          await service.leaveEvent(event.id, user.uid);
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Left event')));
                        } else {
                          await service.joinEvent(event.id, user.uid);
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Joined event')));
                        }
                        await _reload();
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                      }
                    },
                    child: Text(isParticipant ? 'Leave' : 'Participate'),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
