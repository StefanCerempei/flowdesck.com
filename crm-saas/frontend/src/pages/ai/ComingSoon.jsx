import { Sparkles } from "lucide-react";
import { PageHeader } from "../../components/RentalUI";
export default function ComingSoon() {
  return (
    <main className="dashboard-main r-page">
      <PageHeader
        title="Your next co-driver."
        description="AI Booking Copilot · coming in Phase 3"
      />
      <section className="r-panel r-coming">
        <Sparkles size={38} color="#568270" />
        <h2>AI Assistant is coming soon</h2>
        <p>
          This phase focuses on reliable fleet management and bookings.
          Natural-language inquiries and verified rental offers will follow. You
          can manage real reservations now from the Reservations page.
        </p>
      </section>
    </main>
  );
}
