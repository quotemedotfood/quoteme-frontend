import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/table';
import { displayCustomerName } from '../../utils/customerName';

// CUSTOMERS ON THE QM ADMIN DISTRIBUTOR PAGE (Moose, admin walk 2026-10-29).
// Estate Brands has 1,204 customers; rendering every row at once made the
// page long and slow. Collapsed by default with the count in the header.
// Open, it shows one page of rows at a time, with search across all of them.
// Each name links to the QM admin restaurant page by restaurant id.

export const CUSTOMERS_PER_PAGE = 50;

export interface DistributorCustomer {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

interface Props {
  customers: DistributorCustomer[];
}

function matches(c: DistributorCustomer, q: string): boolean {
  return [c.name, c.city, c.state].some((v) => v != null && v.toLowerCase().includes(q));
}

export function DistributorCustomersSection({ customers }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? customers.filter((c) => matches(c, q)) : customers;
  }, [customers, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CUSTOMERS_PER_PAGE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * CUSTOMERS_PER_PAGE, current * CUSTOMERS_PER_PAGE);
  const count = customers.length;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="distributor-customers-body"
        data-testid="distributor-customers-toggle"
        className="flex items-center gap-2 mb-3 text-left"
      >
        {open ? <ChevronDown size={18} className="text-[#4F4F4F]" /> : <ChevronRight size={18} className="text-[#4F4F4F]" />}
        <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Customers
        </h2>
        <span className="text-sm text-gray-500" data-testid="distributor-customers-count">
          ({count.toLocaleString()})
        </span>
      </button>

      {open && (
        <div id="distributor-customers-body">
          {count === 0 ? (
            <p className="text-sm text-gray-400 py-4">No customers yet</p>
          ) : (
            <>
              <div className="relative max-w-sm mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Search name, city, state..."
                  aria-label="Search customers"
                  className="pl-8"
                />
              </div>

              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No customers match</p>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Name</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>State</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((r) => (
                        <TableRow key={r.id} className="hover:bg-gray-50" data-testid="distributor-customer-row">
                          <TableCell className="font-medium">
                            <Link
                              to={`/qm-admin/restaurants/${r.id}`}
                              className="text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline"
                            >
                              {displayCustomerName(r.name)}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{r.city || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-500">{r.state || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filtered.length > CUSTOMERS_PER_PAGE && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400" data-testid="distributor-customers-range">
                    Showing {(current - 1) * CUSTOMERS_PER_PAGE + 1} to{' '}
                    {Math.min(current * CUSTOMERS_PER_PAGE, filtered.length)} of {filtered.length.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                      Previous
                    </Button>
                    <span className="text-xs text-gray-500">
                      Page {current} of {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
