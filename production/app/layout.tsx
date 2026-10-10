import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"What It Is / What It Ought to Be",description:"Contract Intelligence that turns gaps into action."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
