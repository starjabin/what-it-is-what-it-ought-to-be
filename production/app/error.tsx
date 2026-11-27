"use client";
import Link from "next/link";
export default function ErrorBoundary({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="gapPage"><section className="card gapPanel"><h1>Workspace unavailable</h1><p role="alert">The requested workspace could not be loaded. No successful change is assumed.</p><div className="actions"><button className="btn primary" onClick={reset}>Retry</button><Link className="btn" href="/">Return home</Link></div></section></main>}
