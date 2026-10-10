"use client";
import {useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
type Item={id:string;kind:string;title:string;body:string|null;href:string|null;read_at:string|null;created_at:string};
export function NotificationsClient({initial}:{initial:Item[]}){const [items,setItems]=useState(initial);
 async function mark(id:string){const s=createClient();if(!s)return;const now=new Date().toISOString();const {error}=await s.from("notifications").update({read_at:now}).eq("id",id);if(!error)setItems(items.map(i=>i.id===id?{...i,read_at:now}:i))}
 return <div className="notificationList">{items.map(i=><article className={"card notificationCard "+(i.read_at?"read":"unread")} key={i.id}><div><span className="badge neutral">{i.kind.replaceAll("_"," ")}</span><h3>{i.title}</h3><p>{i.body||""}</p><div className="meta">{new Date(i.created_at).toLocaleString()}</div></div><div className="notificationActions">{i.href&&<Link className="btn" href={i.href}>Open</Link>}{!i.read_at&&<button className="btn" onClick={()=>mark(i.id)}>Mark read</button>}</div></article>)}{!items.length&&<div className="card emptyState">No notifications. Material assignments and review events will appear here.</div>}</div>
}