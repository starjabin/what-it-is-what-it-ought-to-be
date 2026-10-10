
import {NextResponse} from "next/server";

export async function POST(){
  return NextResponse.json({
    error:"The public Customer Assistant has been retired. Sign in and use the Internal Assistant, which reads only your workspace database."
  },{status:410});
}
