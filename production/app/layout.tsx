import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={
 title:{default:"What It Is / What It Ought to Be",template:"%s | What It Is / What It Ought to Be"},
 description:"Contract Intelligence that turns gaps into action. Evidence, contract position, team communication, document control and accountable outcomes in one workspace.",
 keywords:["contract intelligence","contract administration","commercial management","claims","document control","contract AI","gap analysis"]
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
