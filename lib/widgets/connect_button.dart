import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:myapp/models/connection_status.dart';
import 'package:myapp/services/community_service.dart';

class ConnectButton extends StatefulWidget {
  final String targetUserId;

  const ConnectButton({super.key, required this.targetUserId});

  @override
  State<ConnectButton> createState() => _ConnectButtonState();
}

class _ConnectButtonState extends State<ConnectButton> {
  final CommunityService _communityService = CommunityService();

  @override
  Widget build(BuildContext context) {
    if (widget.targetUserId == FirebaseAuth.instance.currentUser?.uid) {
      return const SizedBox.shrink();
    }

    return StreamBuilder<ConnectionStatus>(
      stream: _communityService.getConnectionStatus(widget.targetUserId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return ElevatedButton(
            onPressed: null,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(110, 36),
            ),
            child: const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          );
        }

        final status = snapshot.data ?? ConnectionStatus.notConnected;

        switch (status) {
          case ConnectionStatus.notConnected:
            return ElevatedButton(
              onPressed: () {
                _communityService.sendConnectionRequest(widget.targetUserId);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                minimumSize: const Size(110, 36),
              ),
              child: const Text('Connect'),
            );

          case ConnectionStatus.requestSent:
            return ElevatedButton(
              onPressed: () => _showCancelRequestDialog(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.yellow,
                foregroundColor: Colors.black,
                minimumSize: const Size(110, 36),
              ),
              child: const Text('Requested'),
            );

          case ConnectionStatus.connected:
            return ElevatedButton(
              onPressed: () => _showDisconnectDialog(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                minimumSize: const Size(110, 36),
              ),
              child: const Text('Connected'),
            );

          case ConnectionStatus.requestReceived:
            return ElevatedButton(
              onPressed: () => _showRespondToRequestDialog(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                minimumSize: const Size(110, 36),
              ),
              child: const Text('Respond'),
            );
        }
      },
    );
  }

  Future<void> _showCancelRequestDialog(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Cancel Request'),
          content: const Text('Are you sure you want to cancel this connection request?'),
          actions: <Widget>[
            TextButton(
              child: const Text('No'),
              onPressed: () {
                Navigator.of(dialogContext).pop();
              },
            ),
            TextButton(
              child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red)),
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _communityService.cancelConnectionRequest(widget.targetUserId);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Connection request canceled.")),
                );
              },
            ),
          ],
        );
      },
    );
  }

  Future<void> _showDisconnectDialog(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Confirm Disconnection'),
          content: const Text('Are you sure you want to disconnect from this user?'),
          actions: <Widget>[
            TextButton(
              child: const Text('Cancel'),
              onPressed: () {
                Navigator.of(dialogContext).pop();
              },
            ),
            TextButton(
              child: const Text(
                'Disconnect',
                style: TextStyle(color: Colors.red),
              ),
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _communityService.disconnect(widget.targetUserId);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Successfully disconnected.")),
                );
              },
            ),
          ],
        );
      },
    );
  }

  Future<void> _showRespondToRequestDialog(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Connection Request'),
          content: const Text('This user wants to connect with you.'),
          actions: <Widget>[
            TextButton(
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _communityService.declineConnectionRequest(widget.targetUserId);
              },
              child: const Text('Decline'),
            ),
            ElevatedButton(
              child: const Text('Accept'),
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _communityService.acceptConnectionRequest(widget.targetUserId);
              },
            ),
          ],
        );
      },
    );
  }
}
