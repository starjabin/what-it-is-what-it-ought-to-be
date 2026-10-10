import Link from "next/link";

const nav=[
  ["/dashboard","DB","Dashboard"],
  ["/projects","PJ","Projects"],
  ["/gaps","GP","Gap Register"],
  ["/actions","AC","Actions"],
  ["/analyst","AI","AI Analyst"],
  ["/billing","BL","Billing"]
];

export function AppShell({children,mode="demo"}:{children:React.ReactNode;mode?:string}){
  return <div className="shell">
    <aside className="sidebar">
      <div className="logo">WHAT IT IS<small>WHAT IT OUGHT TO BE</small></div>
      <div className="navTitle">Workspace</div>
      {nav.map(([href,icon,label])=><Link key={href} href={href} className="navLink"><span className="navIcon">{icon}</span>{label}</Link>)}
      <div className="navTitle">Product rule</div>
      <div className="muted" style={{padding:"8px 10px",color:"#91aac0"}}>Evidence → Position → Gap → Impact → Action → Outcome</div>
    </aside>
    <main className="main">
      <header className="topbar"><strong>International Contract Intelligence</strong><span className="mode">{mode==="live"?"Live services":"Demo data"}</span></header>
      <div className="content">{children}</div>
    </main>
  </div>
}
