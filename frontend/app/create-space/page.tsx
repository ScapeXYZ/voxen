import { CreateSpaceForm } from "@/components/spaces/CreateSpaceForm";
export default function CreateSpace() {
  return (
    <main id="main" className="shell page">
      <span className="eyebrow">GOOD DECISIONS START WITH COMMON GROUND</span>
      <h1>Create a Space.</h1>
      <p className="page-subtitle">
        Create a governance home for your community. This preview saves a draft
        in your browser; publishing is not connected yet.
      </p>
      <div className="form-layout">
        <aside className="step-sidebar">
          <h3>
            Your community.
            <br />
            Your constitution.
          </h3>
          <p>
            For DAOs, teams, clubs, projects, events, and the people you build
            with.
          </p>
          <div className="ownership-flow">
            <span>Prepare a Space</span>
            <span>↓</span>
            <span>Intended owner accepts</span>
            <span>↓</span>
            <span>Space becomes active</span>
          </div>
        </aside>
        <CreateSpaceForm />
      </div>
    </main>
  );
}
