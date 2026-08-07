import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="legal-page">
      <h1>Page not found</h1>
      <p>
        We could not find that page. Head back to the <Link to="/">PairMe home page</Link>.
      </p>
    </div>
  );
}
