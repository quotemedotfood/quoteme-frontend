import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="page-shell">
      <header className="site-header">
        <Link to="/" className="brand-mark">
          PairMe
        </Link>
        <nav className="header-nav" aria-label="Legal and support">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/support">Support</Link>
        </nav>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>&copy; {new Date().getFullYear()} PairMe</span>
        <nav aria-label="Footer">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/support">Support</Link>
        </nav>
      </footer>
    </div>
  );
}
