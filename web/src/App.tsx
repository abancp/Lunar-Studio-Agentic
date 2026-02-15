import TopPanel from './components/TopPanel';
import SidePanel from './components/SidePanel';
import MainPanel from './components/MainPanel';
import BottomPanel from './components/BottomPanel';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const ws = useWebSocket();

  return (
    <div className="h-screen w-screen bg-bg-primary p-2 flex flex-col gap-2 overflow-hidden">
      {/* Top Panel */}
      <TopPanel
        isConnected={ws.isConnected}
        agentStatus={ws.agentStatus}
      />

      {/* Body: Side + Main/Bottom */}
      <div className="flex flex-1 min-h-0 gap-2">
        {/* Side Panel */}
        <SidePanel agentStatus={ws.agentStatus} />

        {/* Main Content + Bottom */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 gap-2">
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
        </div>
      </div>
    </div>
  );
}
