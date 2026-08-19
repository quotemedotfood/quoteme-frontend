import { RepActivitySection } from '../components/distributor-admin/RepActivitySection';

export function DistributorCommandCenterPage() {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#2A2A2A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Command Center
        </h1>
        <p
          className="text-sm text-gray-500 mt-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          A live view of what's moving in the field.
        </p>
      </div>

      {/*
        Section 2 — Rep Activity.
        Sections 4 & 6 will be added as sibling <section> blocks here
        when those dispatches are built.
      */}
      <div className="space-y-10">
        <RepActivitySection />
      </div>
    </div>
  );
}
