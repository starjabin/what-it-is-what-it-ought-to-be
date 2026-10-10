import type {NextConfig} from "next";
const csp=["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","form-action 'self'","script-src 'self' 'unsafe-inline'","style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","font-src 'self' data:","connect-src 'self' https://*.supabase.co wss://*.supabase.co","upgrade-insecure-requests"].join("; ");
const headers=[
 {key:"Content-Security-Policy",value:csp},
 {key:"X-Frame-Options",value:"DENY"},
 {key:"X-Content-Type-Options",value:"nosniff"},
 {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
 {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=()"},
 {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
 {key:"Cross-Origin-Resource-Policy",value:"same-origin"},
 {key:"Strict-Transport-Security",value:"max-age=63072000; includeSubDomains; preload"}
];
const nextConfig:NextConfig={reactStrictMode:true,poweredByHeader:false,async headers(){return [{source:"/:path*",headers}]}};
export default nextConfig;