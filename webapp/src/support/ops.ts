import type { DemoRecord } from "../api/seed.ts";
export type SupportLine = { id: string; text: string; actor: string; kind: "reply" | "note"; at: string; attachment?: string; delivery: "simulated" | "private" };
export type TicketOps = { owner: string | null; ownerUntil: string | null; priority: "normal" | "urgent"; language: "sv" | "en"; tags: string; dueAt: string; messages: SupportLine[] };
export type SupportBook = { draftRev: number; tickets: Record<string, TicketOps>; drafts: Record<string,string> };
export function emptySupport(): SupportBook { return { draftRev:1,tickets:{},drafts:{} }; }
export function ticketOps(book: SupportBook, row: DemoRecord): TicketOps { return book.tickets[row.id] ?? { owner:null,ownerUntil:null,priority:"normal",language:"sv",tags:"",dueAt:new Date(Date.now()+86400000).toISOString(),messages:[] }; }
export function supportChange(book: SupportBook, row: DemoRecord, actor: string, kind: "claim"|"assign"|"reply"|"note"|"draft"|"metadata", text: string, key: string, owner?: string, attachment?: string, meta?: Partial<TicketOps>): {book:SupportBook;error?:string} {
 const old=ticketOps(book,row); const fail=(error:string)=>({book,error});
 if (["reply","note"].includes(kind) && !text.trim()) return fail("Write a message first.");
 if (text.length>4000) return fail("Messages are limited to 4000 characters.");
 if (attachment && (attachment.length>255 || /[<>]/.test(attachment))) return fail("Invalid attachment name.");
 if (["reply","note"].includes(kind) && old.owner && old.owner!==actor && Date.parse(old.ownerUntil ?? "")>Date.now()) return fail("This ticket belongs to another agent.");
 if (old.messages.some(m=>m.id===key)) return {book};
 if (kind==="draft") return {book:{...book,draftRev:book.draftRev+1,drafts:{...book.drafts,[`${actor}:${row.id}`]:text}}};
 if (kind==="assign" && !owner) return fail("Choose an eligible agent.");
 let next=old;
 if(kind==="claim" || kind==="assign") next={...old,owner:kind==="claim"?actor:owner!,ownerUntil:new Date(Date.now()+3*86400000).toISOString()};
 if(kind==="metadata") next={...old,priority:meta?.priority ?? old.priority,language:meta?.language ?? old.language,tags:meta?.tags ?? old.tags};
 if(kind==="reply" || kind==="note") next={...old,messages:[...old.messages,{id:key,text:text.trim(),actor,kind,at:new Date().toISOString(),attachment,delivery:kind==="note"?"private":"simulated"}]};
 return {book:{...book,draftRev:book.draftRev+1,tickets:{...book.tickets,[row.id]:next},drafts:{...book.drafts,[`${actor}:${row.id}`]:kind==="reply"||kind==="note"?"":book.drafts[`${actor}:${row.id}`]??""}}};
}
