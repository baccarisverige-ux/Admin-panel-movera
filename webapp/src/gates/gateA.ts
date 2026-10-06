export const GATE_A_CHECKS=["typecheck","lint","unit","e2e","browser-matrix","responsive-evidence","permission-errors","refresh-persistence","live-release"] as const;
export type GateCheck=typeof GATE_A_CHECKS[number];
export type GateEvidence={check:GateCheck;sha:string;status:"pass"|"fail";url:string;at:string;actor:string};
export type GateBook={draftRev:number;evidence:GateEvidence[]};
export function emptyGateA():GateBook{return {draftRev:1,evidence:[]};}
export function recordGateA(book:GateBook,e:GateEvidence):{book:GateBook;error?:string}{if(!GATE_A_CHECKS.includes(e.check)||!/^([a-f0-9]{40})$/.test(e.sha)||!["pass","fail"].includes(e.status)||!/^https:\/\/github\.com\/baccarisverige-ux\/Admin-panel-movera\/(?:actions\/runs\/\d+|commit\/[a-f0-9]{40})(?:[/#?].*)?$/.test(e.url))return {book,error:"Evidence needs a full commit SHA and a repository CI-run or commit URL."};return {book:{draftRev:book.draftRev+1,evidence:[...book.evidence,e]}};}
export function gateAState(book:GateBook,sha:string){const checks=GATE_A_CHECKS.map(check=>({check,evidence:book.evidence.filter(e=>e.check===check&&e.sha===sha).at(-1)}));return {checks,passed:checks.every(c=>c.evidence?.status==="pass")};}
