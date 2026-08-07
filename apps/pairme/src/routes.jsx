import React from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { usePairMe } from './lib/state';
import { Phone } from './App';

/**
 * Syncs the URL -> vm.s on mount and whenever the matched route's screen
 * index or table code changes (deep link, browser back/forward, typed URL).
 * The reverse direction (vm.s -> URL) is handled inside usePairMe's `go`.
 *
 * Known limitation (documented, not fixed here): because `go()` uses
 * navigate() without managing a manual history stack, browser back does not
 * retrace onboarding steps the way Desi's own in-screen back button does.
 * That in-screen back/forward UX is unaffected; only the browser chrome
 * back button is coarser than a full SPA history implementation would be.
 */
function RouteBridge({ vm, screenIndex, tableCode }) {
  React.useEffect(() => {
    vm.syncFromRoute(screenIndex, tableCode ? { tableCode } : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenIndex, tableCode]);
  return <Phone vm={vm} />;
}

function TableCodeRoute({ vm }) {
  const { code } = useParams();
  // Table QR landing. DO NOT RENAME this path: the Universal Links
  // association file points here. The contract has no documented endpoint
  // to resolve a table code to a venue yet, so this stores the code and
  // renders the Menu screen (the same destination WhereTo's "scan the code"
  // button reaches) rather than guessing at a lookup call. TODO once the BE
  // adds a resolver: call it here and set selectedVenueId from the result.
  return <RouteBridge vm={vm} screenIndex={9} tableCode={code} />;
}

export default function PairMeApp() {
  const navigate = useNavigate();
  const cameraInputRef = React.useRef(null);
  const galleryInputRef = React.useRef(null);

  const vm = usePairMe({
    navigate,
    openCamera: () => cameraInputRef.current && cameraInputRef.current.click(),
    openGallery: () => galleryInputRef.current && galleryInputRef.current.click(),
  });

  const handleFileChosen = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (file) vm.handleCaptureFile(file);
  };

  return (
    <>
      {/*
        CAMERA (non-negotiable): a plain file input, not getUserMedia/video.
        iOS Safari cannot control the flash and the use case is a dark
        dining room, so the OS camera app (flash/focus/HDR) is what we want.
        Two inputs: one forces the camera (capture=environment, wired to
        Camera.jsx's shutter button / vm.camFire), one is a plain picker
        (wired to the gallery icon / vm.camUpload). Both feed the same
        capture -> parse -> POST rows pipeline in state.js.
      */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />
      <Routes>
        <Route path="/" element={<RouteBridge vm={vm} screenIndex={0} />} />
        <Route path="/signin" element={<RouteBridge vm={vm} screenIndex={1} />} />
        <Route path="/setup/1" element={<RouteBridge vm={vm} screenIndex={2} />} />
        <Route path="/setup/2" element={<RouteBridge vm={vm} screenIndex={3} />} />
        <Route path="/setup/3" element={<RouteBridge vm={vm} screenIndex={4} />} />
        <Route path="/setup/4" element={<RouteBridge vm={vm} screenIndex={5} />} />
        <Route path="/setup/5" element={<RouteBridge vm={vm} screenIndex={6} />} />
        <Route path="/setup/6" element={<RouteBridge vm={vm} screenIndex={7} />} />
        <Route path="/venue" element={<RouteBridge vm={vm} screenIndex={8} />} />
        <Route path="/t/:code" element={<TableCodeRoute vm={vm} />} />
        <Route path="/capture" element={<RouteBridge vm={vm} screenIndex={18} />} />
        <Route path="/menu" element={<RouteBridge vm={vm} screenIndex={9} />} />
        <Route path="/direction" element={<RouteBridge vm={vm} screenIndex={10} />} />
        <Route path="/wines" element={<RouteBridge vm={vm} screenIndex={11} />} />
        <Route path="/wines/brief" element={<RouteBridge vm={vm} screenIndex={16} />} />
        <Route path="/server" element={<RouteBridge vm={vm} screenIndex={12} />} />
        <Route path="/rate" element={<RouteBridge vm={vm} screenIndex={13} />} />
        <Route path="/profile" element={<RouteBridge vm={vm} screenIndex={14} />} />
        <Route path="/profile/friend" element={<RouteBridge vm={vm} screenIndex={15} />} />
        <Route path="/profile/settings" element={<RouteBridge vm={vm} screenIndex={17} />} />
        <Route path="*" element={<RouteBridge vm={vm} screenIndex={0} />} />
      </Routes>
    </>
  );
}
