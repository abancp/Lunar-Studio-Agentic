import TopPanel from './components/TopPanel';
import SidePanel from './components/SidePanel';
import MainPanel from './components/MainPanel';
import BottomPanel from './components/BottomPanel';

export default function App() {
  return (
    <div className="h-screen w-screen bg-bg-primary p-2 flex flex-col gap-2 overflow-hidden">
      {/* Top Panel */}
      <TopPanel />

      {/* Body: Side + Main/Bottom */}
      <div className="flex flex-1 min-h-0 gap-2">
        {/* Side Panel */}
        <SidePanel />

        {/* Main Content + Bottom */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 gap-2">
          <MainPanel />
          <BottomPanel />
        </div>
      </div>
    </div>
  );
}
