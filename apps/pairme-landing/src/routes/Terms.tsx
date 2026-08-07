import DraftBanner from '../components/DraftBanner';

export default function Terms() {
  return (
    <div className="legal-page">
      <DraftBanner />
      <h1>Terms of Service</h1>
      <p className="placeholder-note">
        This is placeholder copy for App Store submission purposes. It will be replaced
        with the final terms.
      </p>

      <h2>Using PairMe</h2>
      <p>
        PairMe gives you plain-language pairing suggestions based on photos you take of
        wine lists and menus. It is a suggestion tool, not a substitute for professional
        advice.
      </p>

      <h2>No ordering or purchasing</h2>
      <p>
        PairMe does not sell wine, take orders, or process payments. It is meant to help
        you talk to your server, nothing more.
      </p>

      <h2>Your responsibilities</h2>
      <p>
        You agree to use PairMe only for lawful purposes and to drink responsibly.
        Suggestions are provided as-is, without guarantee of availability, pricing, or
        accuracy of any particular list.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of PairMe after an
        update means you accept the revised terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent through the Support page.
      </p>
    </div>
  );
}
