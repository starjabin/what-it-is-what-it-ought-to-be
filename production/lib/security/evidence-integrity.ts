/** Verify the exact bytes returned by Storage before use. Missing metadata fails closed. */
export const MAX_EVIDENCE_BYTES=100*1024*1024;
export type EvidenceFingerprint={content_hash:string|null;byte_size:number|null};
export async function verifyEvidenceBlob(blob:Blob,record:EvidenceFingerprint):Promise<void>{
 const hash=record.content_hash;
 if(typeof hash!=="string"||!/^([a-fA-F0-9]{64})$/.test(hash)||typeof record.byte_size!=="number"||!Number.isSafeInteger(record.byte_size)||record.byte_size<0||record.byte_size>MAX_EVIDENCE_BYTES)throw new Error("Source fingerprint is missing or invalid. Evidence held for review.");
 if(blob.size!==record.byte_size||blob.size>MAX_EVIDENCE_BYTES)throw new Error("Evidence size mismatch. Source held for review.");
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",await blob.arrayBuffer())),b=>b.toString(16).padStart(2,"0")).join("");
 if(digest!==hash.toLowerCase())throw new Error("Evidence SHA-256 mismatch. Source held for review.");
}
