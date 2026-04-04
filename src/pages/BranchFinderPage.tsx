import { BranchFinder } from '../shared/branch-finder/BranchFinder'

export function BranchFinderPage() {
  return (
    <>
      <section className="bs-hero">
        <div className="bs-container">
          <p className="bs-eyebrow">Brightstream Branch Finder</p>
          <h1 className="bs-hero__title">Find a branch near you.</h1>
          <p className="bs-hero__subtitle">
            Search by city, ZIP, or branch name — then get directions in one
            click.
          </p>
        </div>
      </section>

      <section className="bs-section">
        <div className="bs-container">
          <BranchFinder />
        </div>
      </section>
    </>
  )
}

