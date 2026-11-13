// MEP PEOPLE (MEP platform part B, Moose 2026-11-13). Pins against the
// QuoteMe contract (spec/requests/api/v1/mep/connections_spec.rb):
//   N1 a row shows name, title at company, its LinkedIn link, and either its
//      confirmed account or its suggestions; no suggestion says so
//   N2 Link sends THAT suggestion's type and id for THAT person, and only
//      then shows the account; nothing links without the press
//   N3 the import sends the file's text and reports added, updated and
//      skipped lines
//   N4 the star changes only where the MEP's api allows it; QM admin sees
//      it but cannot change it, and only QM admin gets "Add as a group",
//      which asks for the group admin's name (prefilled) and email and sends
//      nothing if either is left empty
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { PeopleList, PeopleApi } from './PeopleList';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const frank = {
  id: 'p1', first_name: 'Frank', last_name: 'Bonanno', linkedin_url: 'https://www.linkedin.com/in/frank-bonanno',
  company: 'Bonanno Concepts, Inc.', position: 'Chef Owner', connected_on: '2019-03-12', starred: false,
  linked_account: false as const,
  suggestions: [
    { account_type: 'restaurant_group' as const, id: 'g1', name: 'Bonanno Concepts', city: null, state: null },
    { account_type: 'restaurant' as const, id: 'r9', name: 'Bonanno Concepts', city: 'Denver', state: 'CO' },
  ],
};
const lou = { ...frank, id: 'p2', first_name: 'Lou', last_name: 'Loose', company: 'Bonanno', position: 'Server', suggestions: [] };
const ana = {
  ...frank, id: 'p3', first_name: 'Ana', last_name: 'Ruiz', company: 'The Crawford', position: 'GM', starred: true,
  linked_account: { account_type: 'hotel' as const, id: 'h1', name: 'The Crawford' }, suggestions: [],
};

function makeApi(over: Partial<PeopleApi> = {}): PeopleApi {
  return {
    list: vi.fn().mockResolvedValue({ data: { people: [frank, lou, ana], total: 3, page: 1, per_page: 50 } }),
    importText: vi.fn().mockResolvedValue({ data: { created: 2, updated: 1, refused: [{ line: 8, reason: 'no LinkedIn profile URL' }] } }),
    link: vi.fn().mockResolvedValue({ data: { ...frank, linked_account: { account_type: 'restaurant', id: 'r9', name: 'Bonanno Concepts', city: 'Denver', state: 'CO' }, suggestions: [] } }),
    unlink: vi.fn(),
    ...over,
  };
}

const rows = () => screen.findAllByTestId('mep-person-row');

describe('PeopleList', () => {
  it('N1 shows each person with their account or suggestions', async () => {
    render(<PeopleList api={makeApi()} />);
    const [f, l, a] = await rows();
    expect(f.textContent).toContain('Frank Bonanno');
    expect(f.textContent).toContain('Chef Owner at Bonanno Concepts, Inc.');
    expect(within(f).getByLabelText('Frank Bonanno on LinkedIn').getAttribute('href')).toBe('https://www.linkedin.com/in/frank-bonanno');
    expect(within(f).getAllByRole('button', { name: /^Link:/ })).toHaveLength(2);
    expect(within(l).getByTestId('person-suggestions').textContent).toContain('No match in our accounts');
    expect(within(a).getByTestId('person-linked').textContent).toContain('The Crawford · Hotel');
  });

  it('N2 links only on a press, with that suggestion for that person', async () => {
    const api = makeApi();
    render(<PeopleList api={api} />);
    const [f] = await rows();
    expect(api.link).not.toHaveBeenCalled();
    fireEvent.click(within(f).getByRole('button', { name: 'Link: Bonanno Concepts · Restaurant · Denver, CO' }));
    await waitFor(() => expect(api.link).toHaveBeenCalledWith('p1', 'restaurant', 'r9'));
    await waitFor(() => expect(within(screen.getAllByTestId('mep-person-row')[0]).getByTestId('person-linked').textContent).toContain('Denver, CO'));
    expect(api.link).toHaveBeenCalledTimes(1);
  });

  it('N3 imports pasted rows and reports the counts and skipped lines', async () => {
    const api = makeApi();
    render(<PeopleList api={api} />);
    await rows();
    fireEvent.change(screen.getByLabelText('Paste rows'), { target: { value: 'Frank,Bonanno,https://www.linkedin.com/in/x,,Co,Chef,1 Jan 2020' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add pasted rows' }));
    await waitFor(() => expect(api.importText).toHaveBeenCalledWith('Frank,Bonanno,https://www.linkedin.com/in/x,,Co,Chef,1 Jan 2020'));
    expect(await screen.findByRole('status')).toHaveTextContent('Added 2, updated 1. 1 skipped (no LinkedIn URL, lines 8).');
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  });

  it("N4 the MEP stars; QM admin sees the star but cannot change it, and alone can add a group with its admin's name and email", async () => {
    const star = vi.fn().mockResolvedValue({ data: { starred: true } });
    render(<PeopleList api={makeApi({ star })} />);
    const [f] = await rows();
    expect(screen.queryByRole('button', { name: /as a restaurant group/ })).toBeNull();
    fireEvent.click(within(f).getByRole('button', { name: 'Star Frank Bonanno' }));
    await waitFor(() => expect(star).toHaveBeenCalledWith('p1', true));
    cleanup();

    const addGroup = vi.fn().mockResolvedValue({ data: { ...lou, linked_account: { account_type: 'restaurant_group', id: 'g2', name: 'Bonanno' } } });
    const prompt = vi.spyOn(window, 'prompt')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('Lou Loose').mockReturnValueOnce('')
      .mockReturnValueOnce('Lou Loose').mockReturnValueOnce('lou@bonanno.com');
    render(<PeopleList api={makeApi({ addGroup })} />);
    const [f2, l2, a2] = await rows();
    expect((within(f2).getByRole('button', { name: 'Star Frank Bonanno' }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(a2).getByRole('button', { name: 'Remove star from Ana Ruiz' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(f2).queryByRole('button', { name: /as a restaurant group/ })).toBeNull();
    const add = within(l2).getByRole('button', { name: 'Add Bonanno as a restaurant group' });
    fireEvent.click(add);
    fireEvent.click(add);
    expect(addGroup).not.toHaveBeenCalled();
    fireEvent.click(add);
    await waitFor(() => expect(addGroup).toHaveBeenCalledWith('p2', { admin_name: 'Lou Loose', admin_email: 'lou@bonanno.com' }));
    expect(prompt).toHaveBeenCalledWith(expect.stringContaining("Group admin's name"), 'Lou Loose');
    expect(addGroup).toHaveBeenCalledTimes(1);
  });
});
