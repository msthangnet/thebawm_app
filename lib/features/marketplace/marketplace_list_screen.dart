import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:myapp/services/marketplace_service.dart';
import 'package:myapp/models/product.dart';
import 'package:myapp/providers/auth_provider.dart';
import 'create_edit_product_screen.dart';
import 'package:myapp/services/user_service.dart';
import 'package:myapp/models/user_profile.dart';

class MarketplaceListScreen extends StatelessWidget {
  const MarketplaceListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = MarketplaceService();
    final auth = Provider.of<AuthProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Marketplace'), actions: [
        if (auth.user != null)
          IconButton(onPressed: () async {
            final created = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateEditProductScreen()));
            if (created == true) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Product created')));
          }, icon: const Icon(Icons.add))
      ]),
      body: StreamBuilder<List<Product>>(
        stream: service.getProductsStream(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text('Error: ${snap.error}'));
          final list = snap.data ?? [];
          if (list.isEmpty) return const Center(child: Text('No products yet'));
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final p = list[i];
              return ListTile(
                leading: p.imageUrls.isNotEmpty ? CircleAvatar(backgroundImage: NetworkImage(p.imageUrls.first)) : const CircleAvatar(child: Icon(Icons.store)),
                title: Text(p.title),
                subtitle: FutureBuilder(
                  future: UserService().getUserById(p.ownerId),
                  builder: (context, usnap) {
                    if (usnap.connectionState == ConnectionState.waiting) return Text('\$${p.price.toStringAsFixed(2)}');
                    final up = usnap.data as UserProfile?;
                    if (up == null) return Text('\$${p.price.toStringAsFixed(2)}');
                    return Row(children: [Text('\$${p.price.toStringAsFixed(2)}'), const SizedBox(width: 8), if (up.profilePictureUrl != null) Padding(padding: const EdgeInsets.only(right:8.0), child: CircleAvatar(backgroundImage: NetworkImage(up.profilePictureUrl!), radius: 10)), Text(up.displayName)]);
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
