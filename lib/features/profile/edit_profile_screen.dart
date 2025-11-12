import 'package:flutter/material.dart';
import 'package:myapp/models/user_profile.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

class EditProfileScreen extends StatefulWidget {
  final UserProfile userProfile;

  const EditProfileScreen({super.key, required this.userProfile});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _displayNameController;
  late TextEditingController _bioController;
  late TextEditingController _hometownController;
  late TextEditingController _liveInController;
  late TextEditingController _currentStudyController;
  late TextEditingController _instituteNameController;
  late DateTime _dob;

  @override
  void initState() {
    super.initState();
    _displayNameController =
        TextEditingController(text: widget.userProfile.displayName);
    _bioController = TextEditingController(text: widget.userProfile.bio);
    _hometownController =
        TextEditingController(text: widget.userProfile.hometown);
    _liveInController = TextEditingController(text: widget.userProfile.liveIn);
    _currentStudyController =
        TextEditingController(text: widget.userProfile.currentStudy);
    _instituteNameController =
        TextEditingController(text: widget.userProfile.instituteName);
    _dob = widget.userProfile.dob?.toDate() ?? DateTime.now();
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _bioController.dispose();
    _hometownController.dispose();
    _liveInController.dispose();
    _currentStudyController.dispose();
    _instituteNameController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _dob,
      firstDate: DateTime(1900, 1),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _dob) {
      setState(() {
        _dob = picked;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            TextFormField(
              controller: _displayNameController,
              decoration: const InputDecoration(labelText: 'Display Name'),
            ),
            TextFormField(
              controller: _bioController,
              decoration: const InputDecoration(labelText: 'Bio'),
            ),
            TextFormField(
              controller: _hometownController,
              decoration: const InputDecoration(labelText: 'Hometown'),
            ),
            TextFormField(
              controller: _liveInController,
              decoration: const InputDecoration(labelText: 'Lives In'),
            ),
            TextFormField(
              controller: _currentStudyController,
              decoration: const InputDecoration(labelText: 'Current Study'),
            ),
            TextFormField(
              controller: _instituteNameController,
              decoration: const InputDecoration(labelText: 'Institute Name'),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text('Date of Birth: ${DateFormat.yMd().format(_dob)}'),
                const Spacer(),
                TextButton(
                  onPressed: () => _selectDate(context),
                  child: const Text('Select Date'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _saveProfile,
              child: const Text('Save'),
            )
          ],
        ),
      ),
    );
  }

  void _saveProfile() async {
    if (_formKey.currentState!.validate()) {
      final userRef = FirebaseFirestore.instance
          .collection('users')
          .doc(widget.userProfile.uid);
      await userRef.update({
        'displayName': _displayNameController.text,
        'bio': _bioController.text,
        'hometown': _hometownController.text,
        'liveIn': _liveInController.text,
        'currentStudy': _currentStudyController.text,
        'instituteName': _instituteNameController.text,
        'dob': Timestamp.fromDate(_dob),
      });
      if (!mounted) return;
      Navigator.pop(context);
    }
  }
}
