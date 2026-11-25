"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import {normalizeLocale,translate,direction,type Locale} from "../lib/ui/locale";
const C=createContext<{locale:Locale;setLocale:(l:Locale)=>void}>({locale:"en",setLocale:()=>{}});
export function LocaleProvider({children}:{children:ReactNode}){const [locale,set]=useState<Locale>("en");useEffect(()=>{try{set(normalizeLocale(localStorage.getItem("gap-ui-locale")))}catch{}},[]);function setLocale(v:Locale){set(v);try{localStorage.setItem("gap-ui-locale",v)}catch{}}return <C.Provider value={{locale,setLocale}}>{children}</C.Provider>}
export function useLocale(){const {locale,setLocale}=useContext(C);return {locale,setLocale,dir:direction(locale),t:(s:string)=>translate(locale,s)}}
export function LanguageSwitch(){const {locale,setLocale}=useLocale();return <div className="gapLanguage" role="group" aria-label="Interface language"><button type="button" lang="en" aria-pressed={locale==="en"} onClick={()=>setLocale("en")}>English</button><button type="button" lang="ar" aria-pressed={locale==="ar"} onClick={()=>setLocale("ar")}>العربية</button></div>}
