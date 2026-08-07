export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">PairMe</p>
        <h1>Show my server.</h1>
        <p className="lede">
          Point your camera at a wine list or a menu, and PairMe tells you what to say
          to your server. No jargon, no guessing, just the right words to get a pairing
          you will actually enjoy.
        </p>
      </section>

      <section className="feature-grid">
        <div className="feature">
          <h2>Scan, do not search</h2>
          <p>
            PairMe reads the list in front of you. No typing in bottle names, no
            scrolling through a database that does not have your restaurant in it.
          </p>
        </div>
        <div className="feature">
          <h2>Say it with confidence</h2>
          <p>
            You get a short, plain-language line to hand to your server: what you are
            eating, what you like, and what to ask for.
          </p>
        </div>
        <div className="feature">
          <h2>Built for the table, not the cellar</h2>
          <p>
            PairMe is for the moment you are sitting down to dinner, not for building a
            collection. It is a conversation starter with the person who knows the
            list best, your server.
          </p>
        </div>
      </section>

      <section className="closing">
        <h2>Let your server do what they do best.</h2>
        <p>
          PairMe helps you ask the right question. It does not sell wine, and it will
          not try to.
        </p>
      </section>
    </div>
  );
}
