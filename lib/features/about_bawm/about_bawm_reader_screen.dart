import 'package:flutter/material.dart';
import 'package:myapp/models/about_bawm.dart';
import 'package:myapp/widgets/fullscreen_image_viewer.dart';
import 'package:myapp/models/about_bawm_page.dart';
import 'package:provider/provider.dart';
import 'package:myapp/services/about_bawm_service.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'package:myapp/services/user_service.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AboutBawmReaderScreen extends StatefulWidget {
  final AboutBawm publication;
  const AboutBawmReaderScreen({super.key, required this.publication});

  @override
  State<AboutBawmReaderScreen> createState() => _AboutBawmReaderScreenState();
}

class _AboutBawmReaderScreenState extends State<AboutBawmReaderScreen> {
  String _activePageId = '';
  bool _showViewer = false;
  List<String> _viewerImages = [];
  int _viewerStart = 0;
  UserProfile? _author;

  @override
  void initState() {
    super.initState();
    final pages = widget.publication.pages ?? [];
    if (pages.isNotEmpty) _activePageId = pages[0].id;
    if (widget.publication.authorId != null) {
      UserService().getUserById(widget.publication.authorId!).then((u) => setState(() => _author = u));
    }
    _maybeIncrementReadCount();
  }

  Future<void> _maybeIncrementReadCount() async {
    final prefs = await SharedPreferences.getInstance();
    final key = 'viewed_about_bawm_${widget.publication.id}';
    if (!prefs.containsKey(key)) {
      final ok = await AboutBawmService().incrementReadCountOncePerSession(widget.publication.id);
      if (ok) prefs.setBool(key, true);
    }
  }

  void _openImageViewer(List<String> images, int start) {
    setState(() {
      _viewerImages = images;
      _viewerStart = start;
      _showViewer = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = widget.publication.pages ?? [];
    final auth = Provider.of<AuthProvider>(context);
    final isOwner = auth.user != null && auth.user!.uid == widget.publication.authorId;
    final isAdmin = auth.userProfile?.userType == 'Admin';
    final canRead = widget.publication.isPublished || isOwner || isAdmin;

    if (!canRead) {
      return Scaffold(appBar: AppBar(title: const Text('About BAWM')), body: const Center(child: Text('Not published yet')));
    }

    return Stack(children: [
      Scaffold(
        appBar: AppBar(title: Text(widget.publication.title)),
        body: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (_author != null) Text('By ${_author!.displayName}', style: const TextStyle(fontSize: 12, color: Colors.black54)),
            const SizedBox(height: 8),
            Expanded(
              child: DefaultTabController(
                length: pages.length,
                child: Column(children: [
                  TabBar(isScrollable: true, tabs: pages.map((p) => Tab(text: p.title)).toList()),
                  Expanded(
                    child: TabBarView(children: pages.map((p) => _buildPageView(p)).toList()),
                  )
                ]),
              ),
            )
          ]),
        ),
      ),
      if (_showViewer) FullscreenImageViewer(images: _viewerImages, startIndex: _viewerStart, onClose: () => setState(() => _showViewer = false))
    ]);
  }

  Widget _buildPageView(AboutBawmPage page) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12.0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(page.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Text(page.content),
        const SizedBox(height: 12),
        if (page.imageUrls.isNotEmpty)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: page.imageUrls.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 8, mainAxisSpacing: 8),
            itemBuilder: (context, index) {
              final url = page.imageUrls[index];
              return GestureDetector(
                onTap: () => _openImageViewer(page.imageUrls, index),
                child: AspectRatio(aspectRatio: 1, child: Image.network(url, fit: BoxFit.cover)),
              );
            },
          )
      ]),
    );
  }
}
