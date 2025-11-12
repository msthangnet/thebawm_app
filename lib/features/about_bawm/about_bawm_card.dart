import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/models/about_bawm.dart';
import 'package:myapp/services/about_bawm_service.dart';
import 'package:myapp/services/user_service.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:myapp/providers/auth_provider.dart';

class AboutBawmCard extends StatefulWidget {
  final AboutBawm publication;
  final VoidCallback? onDeleted;

  const AboutBawmCard({super.key, required this.publication, this.onDeleted});

  @override
  State<AboutBawmCard> createState() => _AboutBawmCardState();
}

class _AboutBawmCardState extends State<AboutBawmCard> {
  bool _deleting = false;
  UserProfile? _author;

  @override
  void initState() {
    super.initState();
    if (widget.publication.authorId != null) {
      UserService().getUserById(widget.publication.authorId!).then((u) => setState(() => _author = u));
    }
  }

  Future<void> _handleDelete() async {
    setState(() => _deleting = true);
    final svc = AboutBawmService();
    final ok = await svc.deleteAboutWithPages(widget.publication.id);
    setState(() => _deleting = false);
    if (ok && widget.onDeleted != null) widget.onDeleted!();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final userProfile = auth.userProfile;
    final isOwner = user != null && widget.publication.authorId == user.uid;
    final isAdmin = userProfile?.userType == 'Admin';
    final canDelete = isOwner || isAdmin;

    return Card(
      clipBehavior: Clip.hardEdge,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GestureDetector(
            onTap: () {
              // navigate to reader screen by slug
              Navigator.of(context).pushNamed('/about-bawm/${widget.publication.slug}');
            },
            child: SizedBox(
              height: 160,
              child: widget.publication.coverPhotoUrl != null
                  ? Image.network(widget.publication.coverPhotoUrl!, fit: BoxFit.cover, width: double.infinity)
                  : Container(color: Colors.grey.shade300),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.publication.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (_author != null) Text('By ${_author!.displayName}', style: const TextStyle(fontSize: 12, color: Colors.black54)),
              const SizedBox(height: 8),
              Text(widget.publication.description ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
            ]),
          ),
          ButtonBar(alignment: MainAxisAlignment.spaceBetween, children: [
            TextButton(onPressed: () => Navigator.of(context).pushNamed('/about-bawm/${widget.publication.slug}'), child: const Text('Read')),
            if (canDelete) IconButton(icon: _deleting ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.delete), onPressed: _deleting ? null : _handleDelete)
          ])
        ],
      ),
    );
  }
}
