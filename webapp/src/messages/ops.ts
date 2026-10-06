import type { DemoRecord } from "../api/seed.ts";
export type Campaign = { id:string; version:number; app:"rider"|"driver"; zone:string; channel:"push"|"banner"|"sms"|"island"; category:string; sv:string; en:string; link:string; startAt:string; expireAt:string; status:"draft"|"scheduled"|"published"|"cancelled"|"expired"; tested:string[]; events:{at:string;actor:string;action:string}[] };
export type CampaignBook={draftRev:number;campaigns:Campaign[]};
export function emptyCampaigns():CampaignBook{return {draftRev:1,campaigns:[]};}
export function newCampaign(id:string,zone:string):Campaign{return {id,version:1,app:"rider",zone,channel:"push",category:"all",sv:"",en:"",link:"",startAt:"",expireAt:"",status:"draft",tested:[],events:[]};}
export function validateCampaign(c:Campaign, publishing=false, now=Date.now()):string|undefined{
 if(!c.id || !c.zone || !["rider","driver"].includes(c.app) || !["push","banner","sms","island"].includes(c.channel))return "Choose a valid campaign audience and channel.";
 if(!c.sv.trim() || !c.en.trim() || c.sv.length>2000 || c.en.length>2000)return "Swedish and English text are required (maximum 2000 characters).";
 if(c.link && !/^\/(?:trips|reservations|support|wallet|home)(?:\/[a-zA-Z0-9_-]+)?$/.test(c.link))return "Choose a supported internal deep link.";
 if(c.startAt && !Number.isFinite(Date.parse(c.startAt)))return "Invalid scheduled time.";
 if(c.expireAt && (!Number.isFinite(Date.parse(c.expireAt)) || Date.parse(c.expireAt)<=Math.max(now,c.startAt?Date.parse(c.startAt):now)))return "Expiry must follow publication time.";
 if(publishing && c.startAt && Date.parse(c.startAt)<=now)return "Scheduled publication must be in the future.";
}
export function campaignAudience(c:Campaign,rows:readonly DemoRecord[]):string[]{return rows.filter(r=>r.zoneId===c.zone && (c.category==="all" || r.category===c.category)).map(r=>r.id);}
export function changeCampaign(book:CampaignBook,c:Campaign,action:"save"|"test"|"publish"|"cancel"|"refresh",actor:string,rows:readonly DemoRecord[]=[],now=Date.now()):{book:CampaignBook;error?:string}{
 const old=book.campaigns.find(x=>x.id===c.id);const fail=(error:string)=>({book,error});
 if(action==="save" && old && old.status!=="draft")return fail("Published campaigns are immutable. Create a new campaign.");
 if(action!=="save" && !old)return fail("Save a campaign first.");
 if(["save","publish","test"].includes(action)){const error=validateCampaign(c,action==="publish",now);if(error)return fail(error);}
 if(action==="publish" && old?.status!=="draft")return fail("Only a draft can be published.");
 if(action==="cancel" && !["draft","scheduled","published"].includes(old!.status))return fail("Campaign is already terminal.");
 let next={...(action==="save"?c:old!),version:(old?.version??0)+1};
 if(action==="publish")next={...next,status:c.startAt?"scheduled":"published"};
 if(action==="test")next={...next,tested:campaignAudience(next,rows)};
 if(action==="cancel")next={...next,status:"cancelled"};
 if(action==="refresh"){if(next.status==="scheduled" && Date.parse(next.startAt)<=now)next={...next,status:"published"};if(next.expireAt && Date.parse(next.expireAt)<=now && ["scheduled","published"].includes(next.status))next={...next,status:"expired"};}
 next={...next,events:[...(old?.events??[]),{at:new Date(now).toISOString(),actor,action}]};
 return {book:{draftRev:book.draftRev+1,campaigns:[...book.campaigns.filter(x=>x.id!==c.id),next]}};
}
