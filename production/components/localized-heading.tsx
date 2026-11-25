"use client";
import {useLocale} from "./locale-provider";
export function LocalizedHeading({eyebrow,title,description}:{eyebrow:string;title:string;description:string}){const {t}=useLocale();return <div className="pageHead"><div><div className="eyebrow">{t(eyebrow)}</div><h1>{t(title)}</h1><div className="muted">{t(description)}</div></div></div>}
