import { useState } from 'react';
import TopPanel from './components/TopPanel';
import SidePanel from './components/SidePanel';
import MainPanel from './components/MainPanel';
import BottomPanel from './components/BottomPanel';
import LogsView from './components/LogsView';
import MemoryView from './components/MemoryView';
import ToolsView from './components/ToolsView';
import ContextView from './components/ContextView';
import SettingsView from './components/SettingsView';
import { useWebSocket, type NavPage } from './hooks/useWebSocket';
import { X } from 'lucide-react';

export default function App() {
  const ws = useWebSocket();
  const [activePage, setActivePage] = useState<NavPage>('chat');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (page: NavPage) => {
    setActivePage(page);
    setSidebarOpen(false); // close drawer on mobile after navigation
  };

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col gap-2 p-2 overflow-hidden">
      {/* Top Panel */}
      <TopPanel
        isConnected={ws.isConnected}
        agentStatus={ws.agentStatus}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {/* Body: Side + Main/Bottom */}
      <div className="flex flex-1 min-h-0 gap-2 relative">

        {/* Mobile backdrop overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Side Panel */}
        <SidePanel
          agentStatus={ws.agentStatus}
          activePage={activePage}
          onNavigate={handleNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 gap-2">
          {activePage === 'chat' && (
            <>
              <MainPanel
                messages={ws.messages}
                isGenerating={ws.isGenerating}
                agentStatus={ws.agentStatus}
              />
              <BottomPanel
                onSend={ws.sendMessage}
                onStop={ws.stopGenerating}
                onUpload={ws.uploadFile}
                isGenerating={ws.isGenerating}
                isConnected={ws.isConnected}
                agentStatus={ws.agentStatus}
              />
            </>
          )}

          {activePage === 'logs' && (
            <LogsView
              logs={ws.logs}
              onRequestLogs={ws.requestLogs}
            />
          )}

          {activePage === 'memory' && (
            <MemoryView
              memories={ws.memories}
              onRequestMemories={ws.requestMemories}
            />
          )}

          {activePage === 'tools' && (
            <ToolsView
              toolDetails={ws.toolDetails}
              onRequestTools={ws.requestTools}
            />
          )}

          {activePage === 'context' && (
            <ContextView
              sessions={ws.sessions}
              history={ws.history}
              requestSessions={ws.requestSessions}
              requestHistory={ws.requestHistory}
              clearHistory={ws.clearHistory}
              popHistory={ws.popHistory}
            />
          )}

          {activePage === 'apps' && (
            <main className="flex-1 flex flex-col items-center justify-center min-h-0 glass-panel-solid rounded-xl">
              <p className="text-text-muted text-sm">Apps coming soon...</p>
            </main>
          )}
        </div>
      </div>

      {/* Settings Modal (overlay) */}
      <SettingsView
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={ws.agentConfig}
        onRequestConfig={ws.requestConfig}
        onUpdateConfig={ws.updateConfig}
      />

      {/* Notification Toasts */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {ws.notifications.map(n => {
          const colors: Record<string, string> = {
            info: 'border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary',
            success: 'border-success/30 bg-success/10 text-success',
            warning: 'border-warning/30 bg-warning/10 text-warning',
            error: 'border-danger/30 bg-danger/10 text-danger',
          };
          const c = colors[n.notifyType] || colors.info;
          return (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg pointer-events-auto max-w-[320px] animate-fade-in ${c}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{n.title}</p>
                <p className="text-xs opacity-80 mt-0.5 line-clamp-2">{n.body}</p>
              </div>
              <button
                onClick={() => ws.dismissNotification(n.id)}
                className="shrink-0 p-0.5 rounded hover:bg-white/10 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
