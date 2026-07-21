import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:intl/intl.dart';
import '../config/constants.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/badge_provider.dart';
import '../services/api_service.dart';

class ChatScreen extends StatefulWidget {
  final Appointment appointment;
  const ChatScreen({super.key, required this.appointment});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _ctrl   = TextEditingController();
  final _scroll = ScrollController();
  List<ChatMessage> _messages = [];
  bool _loading = true;
  IO.Socket? _socket;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _connectSocket();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<BadgeProvider>().markChatViewed(widget.appointment.id);
    });
  }

  @override
  void dispose() {
    _socket?.disconnect();
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      _messages = await ApiService.getMessages(widget.appointment.id);
    } catch (_) {}
    setState(() => _loading = false);
    _scrollToBottom();
  }

  void _connectSocket() {
    final token = context.read<AuthProvider>().token;
    _socket = IO.io(kSocketUrl, IO.OptionBuilder()
      .setTransports(['websocket'])
      .setAuth({'token': token})
      .build(),
    );
    _socket!.on('connect', (_) {
      _socket!.emit('join_appointment', {'appointmentId': widget.appointment.id});
    });
    _socket!.on('receive_message', (data) {
      final msg = ChatMessage.fromJson(data as Map<String, dynamic>);
      if (msg.appointmentId == widget.appointment.id) {
        setState(() => _messages.add(msg));
        _scrollToBottom();
      }
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _send() {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    _ctrl.clear();
    _socket?.emit('send_message', {
      'appointmentId': widget.appointment.id,
      'message': text,
    });
  }

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthProvider>().userId;
    final isPatient = context.watch<AuthProvider>().user?.role == 'patient';
    final other = isPatient ? widget.appointment.doctorName : widget.appointment.patientName;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        // Header
        Container(
          padding: EdgeInsets.only(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16, right: 16, bottom: 12,
          ),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF2A44C8), Color(0xFF3B5BDB)],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
          ),
          child: Row(children: [
            IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
            ),
            CircleAvatar(
              backgroundColor: Colors.white.withValues(alpha: 0.2),
              child: Text(other.isNotEmpty ? other[0] : '?', style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w800, color: Colors.white,
              )),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(other, style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15,
              )),
              Text('Secure consultation', style: GoogleFonts.plusJakartaSans(
                fontSize: 11, color: Colors.white.withValues(alpha: 0.7),
              )),
            ])),
          ]),
        ),

        // Messages
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (_, i) {
                final msg = _messages[i];
                final isMine = msg.senderId == me;
                return _Bubble(msg: msg, isMine: isMine);
              },
            ),
        ),

        // Input bar
        Container(
          padding: EdgeInsets.only(
            left: 12, right: 12, top: 10,
            bottom: MediaQuery.of(context).padding.bottom + 10,
          ),
          color: Colors.white,
          child: Row(children: [
            Expanded(child: Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(24),
              ),
              child: TextField(
                controller: _ctrl,
                style: GoogleFonts.plusJakartaSans(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Type a message…',
                  hintStyle: GoogleFonts.plusJakartaSans(color: AppColors.textMuted),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
                onSubmitted: (_) => _send(),
              ),
            )),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _send,
              child: Container(
                width: 44, height: 44,
                decoration: const BoxDecoration(
                  color: AppColors.primary, shape: BoxShape.circle,
                ),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _Bubble extends StatelessWidget {
  final ChatMessage msg;
  final bool isMine;

  const _Bubble({required this.msg, required this.isMine});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMine ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isMine ? 18 : 4),
            bottomRight: Radius.circular(isMine ? 4 : 18),
          ),
          boxShadow: AppShadows.soft,
        ),
        child: Column(crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start, children: [
          Text(msg.text, style: GoogleFonts.plusJakartaSans(
            fontSize: 14, color: isMine ? Colors.white : AppColors.textPrimary,
          )),
          const SizedBox(height: 4),
          Text(
            DateFormat('h:mm a').format(msg.createdAt),
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10, color: isMine ? Colors.white.withValues(alpha: 0.6) : AppColors.textMuted,
            ),
          ),
        ]),
      ),
    );
  }
}
