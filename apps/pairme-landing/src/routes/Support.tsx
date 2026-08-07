import DraftBanner from '../components/DraftBanner';

export default function Support() {
  return (
    <div className="legal-page">
      <DraftBanner />
      <h1>Support</h1>
      <p className="placeholder-note">
        This is placeholder copy for App Store submission purposes. It will be replaced
        with final support details.
      </p>

      <h2>Need help</h2>
      <p>
        If PairMe is not working the way you expect, or you have a question about a
        pairing suggestion, reach out and we will help.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:support@pairme.app">support@pairme.app</a>
      </p>

      <h2>Common questions</h2>
      <p>
        Where does PairMe get its suggestions from? PairMe reads the wine list or menu
        in your photo and matches it against pairing guidance, then hands you a short
        line to say to your server.
      </p>
      <p>
        Can I buy wine through PairMe? No. PairMe does not sell wine or take orders. It
        only helps you ask your server the right question.
      </p>
    </div>
  );
}
