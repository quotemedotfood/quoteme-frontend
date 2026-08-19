// Shared "nothing to show" block for the QM-admin list pages.
//
// The Chefs page already had this right. Its empty state read:
//
//   <div className="text-center py-16 text-gray-400">
//     <p className="text-lg font-medium">No chef accounts found</p>
//   </div>
//
// "found" is honest in both of the states these pages can be in: the list is
// genuinely empty, or a search filter matched nothing. The other list pages
// said "No <thing> yet" plus a second line promising where records would show
// up ("Restaurants will appear here when reps create them", "Create your
// first distributor to get started"). Both halves are false the moment the
// search box has text in it: the records exist, the filter hid them, and the
// operator is told to go create data they already have.
//
// This is the Chefs markup and wording extracted verbatim so there is exactly
// one variant of it in the admin rather than five near-copies. `label` is the
// plural noun that goes between "No" and "found", so it reads "No restaurants
// found", "No brands found", and so on.
export function AdminEmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-lg font-medium">No {label} found</p>
    </div>
  );
}
