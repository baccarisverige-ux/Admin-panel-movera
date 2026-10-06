import {can,type AgentScope,type Role} from "../auth/permissions.ts";
import type {DemoDb} from "./seed.ts";
import type {SafetyBook} from "../safety/ops.ts";
import type {SupportBook} from "../support/ops.ts";
import type {CampaignBook} from "../messages/ops.ts";
import type {GrowthBook} from "../growth/ops.ts";
import type {ReportsBook} from "../reports/ops.ts";
import {ApiError} from "./httpClient.ts";
export type ReadContext={actorId:string;role:Role;scope:AgentScope};
export function scopedSlice<T>(key:string,value:T,db:DemoDb,context?:ReadContext):T{
 if(!context)return value;
 const permissions:Record<string,string>={safetyOps:"incidents.read",supportOps:"support.reply",campaignOps:"settings.read",studioOps:"settings.read",growthOps:"settings.read",reportOps:"overview.read",gateAOps:"system.read"};
 if(permissions[key]&&!can(context.role,permissions[key]))throw new ApiError(403,"Your role cannot read this workspace.");
 const allowed=(zone:string)=>context.scope.zones==="all"||context.scope.zones.includes(zone);
 const filter=<V>(map:Record<string,V>,test:(id:string)=>boolean)=>Object.fromEntries(Object.entries(map).filter(([id])=>test(id))) as Record<string,V>;
 if(key==="safetyOps"){const b=value as SafetyBook;return {...b,policies:filter(b.policies,allowed),incidents:filter(b.incidents,id=>db.incidents.some(r=>r.id===id&&allowed(r.zoneId)))} as T;}
 if(key==="supportOps"){const b=value as SupportBook;return {...b,tickets:filter(b.tickets,id=>db.tickets.some(r=>r.id===id&&allowed(r.zoneId))),drafts:filter(b.drafts,id=>id.startsWith(context.actorId+":")&&db.tickets.some(r=>id.endsWith(":"+r.id)&&allowed(r.zoneId)))} as T;}
 if(key==="campaignOps"){const b=value as CampaignBook;return {...b,campaigns:b.campaigns.filter(c=>allowed(c.zone))} as T;}
 if(key==="growthOps"){const b=value as GrowthBook;const rules=b.rules.filter(r=>allowed(r.zone));return {...b,rules,ledger:b.ledger.filter(x=>rules.some(r=>r.id===x.ruleId)),moderation:filter(b.moderation,id=>db.trips.some(t=>id.startsWith(t.id+"-")&&allowed(t.zoneId)))} as T;}
 if(key==="reportOps"){const b=value as ReportsBook;return {...b,jobs:b.jobs.filter(j=>j.actor===context.actorId&&(!j.filter.zone||allowed(j.filter.zone)))} as T;}
 if(key==="studioOps"&&context.scope.zones!=="all")throw new ApiError(403,"Global content requires all-zone scope.");
 return value;
}
