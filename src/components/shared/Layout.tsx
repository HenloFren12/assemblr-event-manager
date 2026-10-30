// src/components/shared/Layout.tsx
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/setup', label: 'Setup' },
  { to: '/board', label: 'Board' },
  { to: '/whatif', label: 'What if?' },
  { to: '/budget', label: 'Budget' },
  { to: '/outreach', label: 'Outreach' },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="app-header">
        <span className="brand">Assemblr</span>
        <nav aria-label="Main navigation">
          {NAV_LINKS.map(link => (
            <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
          ))}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
    </>
  );
}
