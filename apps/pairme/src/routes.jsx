import React from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { usePairMe } from './lib/state';
import { Phone, DeviceFrame } from './App';
import Login from './screens/Login';
import EntryScreen from './screens/EntryScreen';
import TellUsScreen from './screens/TellUsScreen';
import WineList from './screens/WineList';
import OperatorPage from './operator/OperatorPage';

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

/**
 * Browse the full wine list. Not one of Phone's onboarding SCREENS (it does
 * not read vm.screenNo or draw the CTA bar), but mounted inside the same
 * 390x800 device shell via DeviceFrame below, same as every other route in
 * this file except /operator - a bare, borderless full-width wine list was
 * the phone-frame regression Moose caught (see DeviceFrame's doc comment,
 * App.jsx). Reads whatever wine rows + picked dishes are already in memory
 * (vm.wineListWines/wineListPickedDishes, see state.js), zero network at
 * this seam.
 */
function WineListRoute({ vm }) {
  const navigate = useNavigate();
  return (
    <WineList
      wines={vm.wineListWines}
      pickedDishes={vm.wineListPickedDishes}
      tables={vm.wineListTables}
      say={vm.wineListSay}
      onBack={() => navigate('/wines')}
    />
  );
}

function TableCodeRoute({ vm }) {
  const { code } = useParams();
  // Table QR landing. DO NOT RENAME this path: the Universal Links
  // association file points here. This renders the Menu screen (the same
  // destination WhereTo's "scan the code" button reaches) while
  // usePairMe's own /t/:code effect (state.js) resolves `code` to a venue +
  // wine list via GET /v1/t/:code and feeds the result into the same
  // /t/demo data path (venueName/venueCity/selectedVenueId/demoWineRows/
  // demoDishes).
  //
  // PENDING BE: GET /v1/t/:code is NOT built server side yet - it rides
  // superset #340. This FE is coded against the contract (see
  // lib/api.js's getTableCode doc comment) and mocked in tests until the
  // backend catches up; `/t/demo` alone keeps using the already-built GET
  // /v1/demo, unchanged.
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
        {/*
          Entry-points brief: the four diner entry points (paste-first) live
          on ONE screen, mounted inside the 390x800 device shell like every
          other route below except /operator (see DeviceFrame, App.jsx).
          Used to render full-viewport, outside the shell entirely - that
          was the phone-frame regression, not a deliberate design: it read
          as a desktop page, not a phone demo. See screens/EntryScreen.jsx.
        */}
        <Route path="/entry" element={<DeviceFrame><EntryScreen /></DeviceFrame>} />
        {/*
          WhereTo's fourth path (item 6/7/8): "Just tell us here", the
          at-home / no-menu case. Mounted inside the device shell like
          /entry above - extraction, correction, and a three-way choice
          scroll inside the shell same as any other screen; nothing about
          this walk needed the full viewport. See screens/TellUsScreen.jsx.
        */}
        <Route path="/tell-us" element={<DeviceFrame><TellUsScreen /></DeviceFrame>} />
        {/*
          Restaurant OPERATOR flow (restaurant_admin), standalone and
          full-viewport, deliberately NOT wrapped in DeviceFrame - it is the
          restaurant-side desktop surface, not a diner-facing phone screen,
          and a 390px frame around it would be wrong. See
          operator/OperatorPage.jsx for the client-side-only build note and
          the BE persistence seam (confirmed/pushed pairings do not reach a
          diner at /t/:code yet - that is a follow-up, not this build).
        */}
        <Route path="/operator" element={<OperatorPage />} />
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
        <Route path="/wines/list" element={<DeviceFrame keepNativeScrollbar><WineListRoute vm={vm} /></DeviceFrame>} />
        <Route path="/wines/brief" element={<RouteBridge vm={vm} screenIndex={16} />} />
        <Route path="/server" element={<RouteBridge vm={vm} screenIndex={12} />} />
        <Route path="/rate" element={<RouteBridge vm={vm} screenIndex={13} />} />
        <Route path="/profile" element={<RouteBridge vm={vm} screenIndex={14} />} />
        <Route path="/profile/friend" element={<RouteBridge vm={vm} screenIndex={15} />} />
        <Route path="/profile/settings" element={<RouteBridge vm={vm} screenIndex={17} />} />
        {/*
          AUTH CONTRACT (locked, feat/pairme-accounts-be). A real,
          bookmarkable route, not one of Phone's onboarding SCREENS above -
          it draws its own layout, not <Phone> - but mounted inside the
          same device shell via DeviceFrame like every other route in this
          file except /operator. Because `vm` is created once in PairMeApp
          (above) and this <Route> is a sibling of the phone-frame routes
          inside the SAME <Routes>, navigating here and back does not
          remount usePairMe: onboarding progress, the picked dishes,
          everything, survives the round trip.
          NO WALL: nothing above navigates here on its own; this is only
          reached via the top-right "Log in" chrome button (vm.goLogin,
          App.jsx) or a direct visit.
        */}
        <Route path="/login" element={<DeviceFrame><Login vm={vm} /></DeviceFrame>} />
        <Route path="*" element={<RouteBridge vm={vm} screenIndex={0} />} />
      </Routes>
    </>
  );
}
