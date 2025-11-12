import 'package:flutter/material.dart';
import 'package:myapp/services/about_bawm_service.dart';
import 'package:myapp/features/about_bawm/about_bawm_reader_screen.dart';
import 'package:myapp/models/about_bawm.dart';

class AboutBawmReaderRoute extends StatefulWidget {
  final String slug;
  const AboutBawmReaderRoute({super.key, required this.slug});

  @override
  State<AboutBawmReaderRoute> createState() => _AboutBawmReaderRouteState();
}

class _AboutBawmReaderRouteState extends State<AboutBawmReaderRoute> {
  AboutBawm? _publication;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    final svc = AboutBawmService();
    final pub = await svc.getAboutBySlug(widget.slug);
    setState(() { _publication = pub; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_publication == null) return const Scaffold(body: Center(child: Text('Not found')));
    return AboutBawmReaderScreen(publication: _publication!);
  }
}
