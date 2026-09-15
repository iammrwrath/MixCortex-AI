import React, { useState } from 'react';
import { MixCortexStandaloneApp } from './components/cortex/MixCortexStandaloneApp';
import { PatchUpdateModal } from './components/cortex/PatchUpdateModal';

export const App: React.FC = () => {
  const [showPatchModal, setShowPatchModal] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07090e]">
      <MixCortexStandaloneApp onOpenPatchModal={() => setShowPatchModal(true)} />
      {showPatchModal && <PatchUpdateModal onClose={() => setShowPatchModal(false)} />}
    </div>
  );
};

export default App;
