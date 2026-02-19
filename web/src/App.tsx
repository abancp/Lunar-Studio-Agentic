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

export default function App() {
  const ws = useWebSocket();
  const [activePage, setActivePage] = useState<NavPage>('chat');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-bg-primary p-2 flex flex-col gap-2 overflow-hidden">
      {/* Top Panel */}
      <TopPanel
        isConnected={ws.isConnected}
        agentStatus={ws.agentStatus}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Body: Side + Main/Bottom */}
      <div className="flex flex-1 min-h-0 gap-2">
        {/* Side Panel */}
        <SidePanel
          agentStatus={ws.agentStatus}
          activePage={activePage}
          onNavigate={setActivePage}
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
    </div>
  );
}
