export const STUDIO_SLOTS=["driver-home","driver-event","rider-banner-1","rider-banner-2","rider-banner-3","rider-banner-4","rider-banner-5","rider-banner-6","help","legal","app-versions"] as const;
export type StudioText={title:string;sv:string;en:string;image:string;expiresAt:string;minVersion:string;recommendedVersion:string;reaccept:boolean};
export type StudioSlot={author:string;draft:StudioText;published:StudioText|null;history:{version:number;at:string;actor:string;text:StudioText;action:"publish"|"rollback"}[]};
export type StudioBook={draftRev:number;slots:Record<string,StudioSlot>};
export function emptyStudio():StudioBook{return {draftRev:1,slots:{}};}
export function studioSlot(book:StudioBook,id:string):StudioSlot{return book.slots[id]??{author:"nora",draft:{title:"Movera",sv:"",en:"",image:"",expiresAt:"",minVersion:"",recommendedVersion:"",reaccept:false},published:null,history:[]};}
export function validateStudio(id:string,d:StudioText):string|undefined{
 if(!STUDIO_SLOTS.includes(id as typeof STUDIO_SLOTS[number]))return "Invalid content slot.";
 if(!d.title.trim() || !d.sv.trim() || !d.en.trim())return "Title and both translations are required.";
 if(d.image && !/^https:\/\//.test(d.image))return "Images must use HTTPS.";
 if(d.expiresAt && (!Number.isFinite(Date.parse(d.expiresAt)) || Date.parse(d.expiresAt)<=Date.now()))return "Expiry must be a future date.";
 if(id==="app-versions"){const valid=/^\d+\.\d+\.\d+$/;if(!valid.test(d.minVersion)||!valid.test(d.recommendedVersion))return "Use semantic versions such as 1.2.3.";const a=d.minVersion.split(".").map(Number),b=d.recommendedVersion.split(".").map(Number);for(let i=0;i<3;i++){if(a[i]>b[i])return "Recommended version cannot be below minimum.";if(a[i]<b[i])break;}}
}
export function changeStudio(book:StudioBook,id:string,draft:StudioText,action:"save"|"publish"|"rollback",actor:string):{book:StudioBook;error?:string}{
 const old=studioSlot(book,id);const error=action!=="rollback"?validateStudio(id,draft):undefined;if(error)return {book,error};
 if(action==="publish"&&old.author===actor)return {book,error:"A second agent must publish."};
 if(action==="rollback"&&old.history.length<2)return {book,error:"No prior published version is available."};
 let next=action==="save"?{...old,author:actor,draft:{...draft}}:old;
 if(action!=="save"){const text=action==="publish"?{...old.draft}:{...old.history[old.history.length-2].text};next={...old,published:text,history:[...old.history,{version:old.history.length+1,at:new Date().toISOString(),actor,text,action}]};}
 return {book:{draftRev:book.draftRev+1,slots:{...book.slots,[id]:next}}};
}
