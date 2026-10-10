import Link from "next/link";

const nav=[
  ["/dashboard","DB","Dashboard"],
  ["/projects","PJ","Projects"],
  ["/team","TM","Team"],
  ["/communication","CM","Communication"],
  ["/documents","DC","Documents"],
  ["/gaps","GP","Gap Register"],
  ["/actions","AC","Actions"],
  ["/analyst","AI","AI Analyst"],
  ["/billing","BL","Billing"]
];

export function AppShell({children,mode="live",organizationName="International Contract Intelligence"}:{children:React.ReactNode;mode?:string;organizationName?:string}){
  return <div className="shell">
    <aside className="sidebar">
      <Link href="/dashboard" className="logo">WHAT IT IS<small>WHAT IT OUGHT TO BE</small></Link>
      <div className="workspaceMini"><small>Workspace</small><b>{organizationName}</b></div>
      <div className="navTitle">Operate</div>
      {nav.map(([href,icon,label])=><Link key={href} href={href} className="navLink"><span className="navIcon">{icon}</span>{label}</Link>)}
      <div className="navTitle">Operating rule</div>
      <div className="sidebarRule">Evidence → Position → Gap → Impact → Action → Accountability → Outcome</div>
      <div className="sidebarFooter"><Link href="/">Public site</Link><Link href="/assistant">Customer Assistant</Link></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><small className="topEyebrow">Contract Intelligence Workspace</small><strong>{organizationName}</strong></div><span className="mode">{mode==="live"?"Live services":"Demo data"}</span></header>
      <div className="content">{children}</div>
    </main>
  </div>
}
