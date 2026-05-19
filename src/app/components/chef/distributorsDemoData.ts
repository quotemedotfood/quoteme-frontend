// Demo data for the Distributors tab — locked per Desi V2 handoff (2026-05-19).
//
// YOUR_DISTRIBUTORS and AREA_DISTRIBUTORS arrays are LOCKED per
// v3-distributors-populated.md Section 1 (Demo data).
//
// TODO: replace with API data from GET /api/v1/chef/distributors

// DEMO constants from source/document.jsx (Justin-locked names).
export const DEMO = {
  restaurant: "Holloway & Sons",
  restaurantCity: "Hudson, NY",
  chefFirst: "Daniel",
  rep: "Marcus Rivera",
  repPhone: "(518) 555-0143",
  repEmail: "marcus@dlisius.co",
} as const;

export interface YourDistributor {
  short: string;
  name: string;
  rep: string;
  repPhone: string;
  repEmail: string | null;
  lastQuote: string;
  quoteCount: number;
  status: 'connected' | 'uploaded';
}

export interface AreaDistributor {
  short: string;
  name: string;
  scope: string;
  items: number;
  updated: string;
  affiliated: boolean;
}

export const YOUR_DISTRIBUTORS: YourDistributor[] = [
  {
    short: "D'Lisius",
    name: "D'Lisius Distribution Co.",
    rep: DEMO.rep,
    repPhone: DEMO.repPhone,
    repEmail: DEMO.repEmail,
    lastQuote: "May 12, 2026",
    quoteCount: 7,
    status: "connected", // rep on QuoteMe, catalog live
  },
  {
    short: "Hudson Provisions",
    name: "Hudson Valley Provisions",
    rep: "Anna Mireles",
    repPhone: "(518) 555-0207",
    repEmail: "anna@hvprovisions.com",
    lastQuote: "Apr 22, 2026",
    quoteCount: 2,
    status: "uploaded", // chef-uploaded price list
  },
  {
    short: "Catskill Specialty",
    name: "Catskill Specialty Cheese",
    rep: "Sam Doyle",
    repPhone: "(845) 555-0119",
    repEmail: null,
    lastQuote: "Mar 30, 2026",
    quoteCount: 1,
    status: "uploaded",
  },
];

export const AREA_DISTRIBUTORS: AreaDistributor[] = [
  { short: "Northwind Seafood",  name: "Northwind Seafood Co.",       scope: "Hudson Valley · Berkshires", items: 380, updated: "May 12", affiliated: true  },
  { short: "Foothill Dairy",     name: "Foothill Dairy Collective",   scope: "Columbia · Greene counties", items: 142, updated: "May 10", affiliated: true  },
  { short: "Riverbend Produce",  name: "Riverbend Farm Produce",      scope: "Hudson Valley",              items: 612, updated: "May 9",  affiliated: false },
  { short: "Two Stones Bakery",  name: "Two Stones Bakery, wholesale", scope: "Hudson · Kingston",          items: 84,  updated: "May 7",  affiliated: false },
];
