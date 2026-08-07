import DraftBanner from '../components/DraftBanner';

export default function Privacy() {
  return (
    <div className="legal-page">
      <DraftBanner />
      <h1>Privacy Policy</h1>
      <p className="placeholder-note">
        This is placeholder copy for App Store submission purposes. It will be replaced
        with the final policy text.
      </p>

      <h2>What we collect</h2>
      <p>
        PairMe collects the information needed to identify wines and dishes from photos
        you take in the app, along with basic device and usage information to keep the
        app working and improving.
      </p>

      <h2>How we use it</h2>
      <p>
        We use this information to generate pairing suggestions, to operate and secure
        the app, and to understand how PairMe is used so we can make it better.
      </p>

      <h2>What we do not do</h2>
      <p>
        We do not sell your personal information, and PairMe does not process orders,
        payments, or purchases of any kind.
      </p>

      <h2>Your choices</h2>
      <p>
        You can request access to, correction of, or deletion of your information at
        any time by contacting us through the Support page.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent through the Support page.
      </p>
    </div>
  );
}
