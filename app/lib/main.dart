import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'providers/agent_provider.dart';
import 'models/models.dart';
import 'widgets/top_panel.dart';
import 'widgets/side_panel.dart';
import 'widgets/main_panel.dart';
import 'widgets/bottom_panel.dart';
import 'widgets/placeholder_views.dart';
import 'screens/settings_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0A0A0F),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(
    ChangeNotifierProvider(
      create: (_) => AgentProvider(),
      child: const LunarStudioApp(),
    ),
  );
}

class LunarStudioApp extends StatelessWidget {
  const LunarStudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lunar Studio',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme.copyWith(
        textTheme: GoogleFonts.interTextTheme(AppTheme.theme.textTheme),
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  NavPage _activePage = NavPage.chat;

  void _navigate(NavPage page) {
    setState(() => _activePage = page);
  }

  @override
  Widget build(BuildContext context) {
    final agent = context.watch<AgentProvider>();
    final width = MediaQuery.of(context).size.width;
    final isWide = width >= 768;

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      // Drawer — only on mobile
      drawer: isWide
          ? null
          : Drawer(
              width: 280,
              backgroundColor: Colors.transparent,
              elevation: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 0, 8),
                  child: Column(
                    children: [
                      // Close header in drawer
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 4, 4, 8),
                        child: Row(
                          children: [
                            Text(
                              'NAVIGATION',
                              style: TextStyle(
                                color: AppTheme.textMuted,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 1.5,
                              ),
                            ),
                            const Spacer(),
                            IconButton(
                              icon: Icon(
                                Icons.close_rounded,
                                color: AppTheme.textSecondary,
                                size: 18,
                              ),
                              onPressed: () => Navigator.pop(context),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: SidePanelWidget(
                          agentStatus: agent.agentStatus,
                          activePage: _activePage,
                          onNavigate: (page) {
                            Navigator.pop(context);
                            _navigate(page);
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
      body: SafeArea(
        child: Builder(
          builder: (ctx) {
            return Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                children: [
                  // Top Panel
                  TopPanelWidget(
                    isConnected: agent.isConnected,
                    agentStatus: agent.agentStatus,
                    onOpenSettings: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        fullscreenDialog: true,
                        builder: (_) => const SettingsScreen(),
                      ),
                    ),
                    onOpenSidebar: () {
                      if (!isWide) {
                        Scaffold.of(ctx).openDrawer();
                      }
                    },
                  ),
                  const SizedBox(height: 8),

                  // Body
                  Expanded(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Sidebar — inline on wide screens
                        if (isWide) ...[
                          SizedBox(
                            width: width >= 1024 ? 288 : 224,
                            child: SidePanelWidget(
                              agentStatus: agent.agentStatus,
                              activePage: _activePage,
                              onNavigate: _navigate,
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],

                        // Main Content
                        Expanded(child: _buildPageContent(agent)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),

      // Settings overlay
      floatingActionButton: null,
    );
  }

  Widget _buildPageContent(AgentProvider agent) {
    switch (_activePage) {
      case NavPage.chat:
        return Column(
          children: [
            Expanded(
              child: MainPanelWidget(
                messages: agent.messages,
                isGenerating: agent.isGenerating,
                agentStatus: agent.agentStatus,
              ),
            ),
            const SizedBox(height: 8),
            BottomPanelWidget(
              onSend: agent.sendMessage,
              onStop: agent.stopGenerating,
              isGenerating: agent.isGenerating,
              isConnected: agent.isConnected,
              agentStatus: agent.agentStatus,
            ),
          ],
        );
      case NavPage.logs:
        return const LogsView();
      case NavPage.memory:
        return const MemoryView();
      case NavPage.tools:
        return const ToolsView();
      case NavPage.context:
        return const ContextView();
      case NavPage.apps:
        return const AppsView();
    }
  }
}
