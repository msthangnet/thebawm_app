import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/models/quiz.dart';
import 'package:myapp/services/quiz_service.dart';
import 'package:myapp/providers/auth_provider.dart';

class CreateEditQuizScreen extends StatefulWidget {
  final Quiz? quiz;
  const CreateEditQuizScreen({super.key, this.quiz});

  @override
  State<CreateEditQuizScreen> createState() => _CreateEditQuizScreenState();
}

class _CreateEditQuizScreenState extends State<CreateEditQuizScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  List<QuizQuestion> _questions = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.quiz != null) {
      _titleController.text = widget.quiz!.title;
      _questions = widget.quiz!.questions;
    } else {
      _questions = [QuizQuestion(text: '', options: ['', ''], answerIndex: 0)];
    }
  }

  void _addQuestion() {
    setState(() => _questions.add(QuizQuestion(text: '', options: ['', ''], answerIndex: 0)));
  }

  void _removeQuestion(int idx) {
    setState(() => _questions.removeAt(idx));
  }

  void _addOption(int qIndex) {
    setState(() {
      _questions[qIndex].options.add('');
    });
  }

  void _removeOption(int qIndex, int optIndex) {
    setState(() {
      if (_questions[qIndex].options.length > 2) {
        _questions[qIndex].options.removeAt(optIndex);
        if (_questions[qIndex].answerIndex >= _questions[qIndex].options.length) {
          _questions[qIndex].answerIndex = 0;
        }
      }
    });
  }

  Future<void> _submit() async {
    // validate form fields and quiz content
    if (!_formKey.currentState!.validate()) return;
    for (var i = 0; i < _questions.length; i++) {
      final q = _questions[i];
      if (q.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Question ${i + 1} is empty')));
        return;
      }
      if (q.options.length < 2) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Question ${i + 1} must have at least 2 options')));
        return;
      }
      for (var j = 0; j < q.options.length; j++) {
        if (q.options[j].trim().isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Option ${j + 1} for question ${i + 1} is empty')));
          return;
        }
      }
      if (q.answerIndex < 0 || q.answerIndex >= q.options.length) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Invalid answer index for question ${i + 1}')));
        return;
      }
    }
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in')));
      return;
    }
    setState(() => _loading = true);
    final service = QuizService();
    try {
      final quiz = Quiz(id: '', title: _titleController.text.trim(), questions: _questions, authorId: auth.user!.uid);
      final id = await service.createQuiz(quiz);
      if (id != null) Navigator.of(context).pop(true);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Quiz')),
      body: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextFormField(controller: _titleController, decoration: const InputDecoration(labelText: 'Title'), validator: (v) => v == null || v.trim().isEmpty ? 'Title required' : null),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                itemCount: _questions.length,
                itemBuilder: (context, idx) {
                  final q = _questions[idx];
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        TextFormField(initialValue: q.text, decoration: InputDecoration(labelText: 'Question ${idx + 1}'), onChanged: (v) => q.text = v),
                        const SizedBox(height: 8),
                        const Text('Options', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        ...List.generate(q.options.length, (i) => Row(children: [
                          Expanded(child: TextFormField(initialValue: q.options[i], decoration: InputDecoration(labelText: 'Option ${i + 1}'), onChanged: (val) => q.options[i] = val)),
                          const SizedBox(width: 8),
                          IconButton(onPressed: () => _removeOption(idx, i), icon: const Icon(Icons.remove_circle_outline)),
                        ])),
                        Row(children: [TextButton.icon(onPressed: () => _addOption(idx), icon: const Icon(Icons.add), label: const Text('Add Option'))]),
                        Row(children: [Text('Answer:'), const SizedBox(width: 8), DropdownButton<int>(value: q.answerIndex, items: List.generate(q.options.length, (i) => DropdownMenuItem(value: i, child: Text('${i + 1}'))), onChanged: (v) => setState(() => q.answerIndex = v ?? 0))]),
                        Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () => _removeQuestion(idx), child: const Text('Remove Question')))
                      ]),
                    ),
                  );
                },
              ),
            ),
            ElevatedButton.icon(onPressed: _addQuestion, icon: const Icon(Icons.add), label: const Text('Add Question')),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const CircularProgressIndicator() : const Text('Create Quiz'))
          ]),
        ),
      ),
    );
  }
}
