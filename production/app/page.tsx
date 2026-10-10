import Link from "next/link";

const modules=[
  ["Contract workspace","Contracts, obligations, notices, variations and commercial records in one operating view."],
  ["Gap Engine","Compare WHAT IT IS with WHAT IT OUGHT TO BE and convert differences into owned action."],
  ["Evidence management","Private document storage, source traceability, version context and evidence-linked findings."],
  ["Team accountability","Assign documents and actions to named owners with deadlines, priorities and statuses."],
  ["Project communication","Keep commercial discussion inside the workspace, connected to projects and evidence."],
  ["AI Analyst","Grounded analysis that proposes structured findings for human review instead of replacing judgment."]
];

const onboarding=[
  ["01","Create account","Register with your work email and sign in securely."],
  ["02","Set up organization","Choose your market, currency and first project."],
  ["03","Build the team","Invite contracts, commercial, planning, legal and executive users."],
  ["04","Bring the evidence","Upload contracts, instructions, correspondence, programmes and records."],
  ["05","Run the operating loop","Detect gaps, assign actions, communicate and track closure."]
];

const audiences=["Contractors","Consultants","Owners & Developers","PMCs","Commercial Teams","QS & Claims","Legal Teams","Executives"];

export default function Home(){
  return <main className="marketing">
    <header className="marketingNav">
      <Link href="/" className="marketingBrand"><span className="brandMark">W</span><span>WHAT IT IS<small>WHAT IT OUGHT TO BE</small></span></Link>
      <nav className="marketingLinks">
        <a href="#product">Product</a><a href="#workflow">Workflow</a><a href="#teams">Teams</a><a href="#security">Security</a>
      </nav>
      <div className="navActions"><Link className="btn subtle" href="/sign-in">Sign in</Link><Link className="btn primary" href="/sign-up">Start workspace</Link></div>
    </header>

    <section className="marketingHero">
      <div className="heroGlow"/>
      <div className="heroCopy">
        <div className="pill">Contract Intelligence Operating System</div>
        <h1>Turn contract risk into <span>clear, owned action.</span></h1>
        <p>Move from scattered contracts, email threads and spreadsheets to one evidence-led workspace for position, gaps, impacts, actions, accountability and outcomes.</p>
        <div className="heroButtons"><Link className="btn primary large" href="/sign-up">Create your workspace</Link><Link className="btn darkOutline large" href="/assistant">Ask the product assistant</Link></div>
        <div className="heroProof"><span>Evidence before opinion</span><span>Human-controlled AI</span><span>Private tenant workspaces</span><span>International by design</span></div>
      </div>

      <div className="productPreview">
        <div className="previewTop"><span className="previewBrand">Executive Dashboard</span><span className="liveDot">Live workspace</span></div>
        <div className="previewStats">
          <div><small>Open gaps</small><b>18</b><em>6 material</em></div>
          <div><small>Actions due</small><b>9</b><em>3 urgent</em></div>
          <div><small>Evidence records</small><b>247</b><em>92% linked</em></div>
        </div>
        <div className="previewGrid">
          <div className="previewPanel">
            <div className="previewHeading">Attention required</div>
            <div className="previewIssue"><span className="risk critical">Critical</span><b>Notice compliance not evidenced</b><small>Contract Manager · due in 2 days</small></div>
            <div className="previewIssue"><span className="risk high">High</span><b>Variation work ahead of formal control</b><small>Commercial Manager · due in 5 days</small></div>
            <div className="previewIssue"><span className="risk medium">Medium</span><b>Recovery actions require owners</b><small>Planning Manager · due in 8 days</small></div>
          </div>
          <div className="previewPanel">
            <div className="previewHeading">Operating loop</div>
            {["Evidence","Position","Gap","Impact","Action","Outcome"].map((x,i)=><div className="loopRow" key={x}><span>{i+1}</span><b>{x}</b></div>)}
          </div>
        </div>
      </div>
    </section>

    <section className="audienceStrip">{audiences.map(a=><span key={a}>{a}</span>)}</section>

    <section className="section" id="product">
      <div className="sectionIntro"><div className="eyebrow">One commercial operating system</div><h2>From document overload to controlled execution.</h2><p>Designed around how contract teams actually work: evidence, positions, deadlines, correspondence, decisions and follow-through.</p></div>
      <div className="featureGrid">{modules.map(([title,desc],i)=><article className="featureCard" key={title}><div className="featureIcon">{String(i+1).padStart(2,"0")}</div><h3>{title}</h3><p>{desc}</p></article>)}</div>
    </section>

    <section className="section darkSection" id="workflow">
      <div className="sectionIntro light"><div className="eyebrow">The Gap Engine</div><h2>Know what exists. Know what should exist. Close the gap.</h2><p>Every material issue becomes a structured record instead of an untracked observation.</p></div>
      <div className="gapFramework">
        {["WHAT IT IS","WHAT IT OUGHT TO BE","WHY","EVIDENCE","GAP","IMPACT","ACTION","OWNER","DEADLINE","STATUS"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><b>{x}</b></div>)}
      </div>
    </section>

    <section className="section" id="teams">
      <div className="splitMarketing">
        <div>
          <div className="eyebrow">Built for coordinated teams</div>
          <h2>Contracts, communication and documents in the same workspace.</h2>
          <p className="lead">Invite project users, communicate in project channels, upload private records, assign documents for review or action, and keep deadlines visible without losing the evidence trail.</p>
          <div className="checkList">
            <div>✓ Role-based organization membership</div><div>✓ Project and organization channels</div><div>✓ Private document storage</div><div>✓ Document assignment and due dates</div><div>✓ Action status and accountability</div><div>✓ Evidence-linked AI analysis</div>
          </div>
        </div>
        <div className="workflowBoard">
          <div className="workflowColumn"><small>DOCUMENT</small><b>Site Instruction 027.pdf</b><span>Assigned to Contract Manager</span><em>Due 12 Oct</em></div>
          <div className="workflowArrow">→</div>
          <div className="workflowColumn"><small>REVIEW</small><b>Notice requirement identified</b><span>Evidence check in progress</span><em>High priority</em></div>
          <div className="workflowArrow">→</div>
          <div className="workflowColumn"><small>ACTION</small><b>Issue compliant notice</b><span>Owner + deadline tracked</span><em>Human approval</em></div>
        </div>
      </div>
    </section>

    <section className="section softSection">
      <div className="sectionIntro"><div className="eyebrow">Client onboarding</div><h2>From signup to a working contract workspace in minutes.</h2><p>New clients are guided through the core setup rather than dropped into an empty application.</p></div>
      <div className="onboardingSteps">{onboarding.map(([n,t,d])=><div className="onboardCard" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}</div>
    </section>

    <section className="section" id="security">
      <div className="trustGrid">
        <div className="trustCopy"><div className="eyebrow">Trust by architecture</div><h2>Commercial intelligence without surrendering control.</h2><p>Tenant isolation, private storage, row-level access controls, audit provenance and human review are part of the product architecture—not marketing add-ons.</p></div>
        <div className="trustCards"><div><b>Private by default</b><span>Documents stay inside tenant-scoped private storage.</span></div><div><b>Human-controlled AI</b><span>AI proposes; authorized users confirm consequential findings.</span></div><div><b>Traceable decisions</b><span>Evidence, actions and AI provenance remain linked to operational records.</span></div><div><b>International deployment</b><span>Market and currency profiles support global teams, including Saudi Arabia.</span></div></div>
      </div>
    </section>

    <section className="finalCta">
      <div><div className="eyebrow">Start with one project</div><h2>Build a clearer contractual position from day one.</h2><p>Create the workspace, invite your team and bring the first contract or project record.</p></div>
      <div className="heroButtons"><Link className="btn primary large" href="/sign-up">Create workspace</Link><Link className="btn darkOutline large" href="/sign-in">Sign in</Link></div>
    </section>

    <footer className="marketingFooter"><div><b>WHAT IT IS / WHAT IT OUGHT TO BE</b><span>Contract Intelligence that turns gaps into action.</span></div><div><Link href="/assistant">Customer Assistant</Link><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></div></footer>
  </main>
}
