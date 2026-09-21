const navItems = [
  ['dashboard','▦','Dashboard'],['zones','⌖','Zone Management'],['pricing','＄','Pricing & Categories'],
  ['security','⚠','Security & Alerts'],['communications','✉','Communications'],['trips','⌁','Trips & Live Map'],
  ['reports','▥','Reports & Analytics'],['franchise','⌂','Franchise Management'],['onboarding','✓','Driver Onboarding'],
  ['payments','▣','Payment Management'],['support','?','Support System'],['promotions','％','Promotions'],
  ['vehicles','▰','Vehicle Management'],['reviews','★','Reviews & Ratings'],['incidents','!','Emergency & Incidents'],
  ['audit','☷','Audit & Compliance'],['notifications','◉','Notification System'],['api','⌘','API & Integration'],
  ['chat','◌','Chat Management'],['database','▤','Database'],['users','♙','User Management'],['settings','⚙','Settings']
];

const pageTitles = Object.fromEntries(navItems.map(([id,,title])=>[id,title]));

const nav = document.getElementById('nav');
nav.innerHTML = navItems.map(([id,icon,title],i)=>`<button class="${i===0?'active':''}" data-page-target="${id}"><span class="nav-icon">${icon}</span><span>${title}</span></button>`).join('');

const genericPages = {
  security:{
    title:'Security & Alerts',subtitle:'Monitor platform services, SOS alerts, fraud and document compliance.',
    stats:[['Payment System','ACTIVE'],['Ride Booking','ACTIVE'],['Driver App','ACTIVE'],['Rider App','ACTIVE']],
    cards:[
      ['SOS Alert - Trip #T38472','Driver John D. triggered SOS at 14:32. Location: 5th Ave & 42nd St','Respond|View on Map|Archive'],
      ['Suspicious Activity Detected','Multiple accounts from same device detected • 2 hours ago','Review|Block'],
      ['GPS Spoofing Detected','Driver ID: D4721 showing inconsistent location data • 3 hours ago','Review|Block']
    ],
    table:{head:['Driver ID','Name','Document Type','Expiry Date','Status','Actions'],rows:[
      ['D2847','Michael Johnson',"Driver's License",'2023-12-15','Expired','Suspend · Notify'],
      ['D3921','Sarah Williams','Insurance','2023-12-20','Expiring Soon','Notify']
    ]}
  },
  communications:{
    title:'Communications',subtitle:'Send popups, manage chats, notifications and templates.',
    custom:`<div class="tabs"><button class="active">Popups</button><button>Chat</button><button>Notifications</button><button>Templates</button></div>
      <div class="split"><article class="panel"><div class="panel-title-row"><h3>Send Popup Notification</h3><button class="primary-btn">Send Popup</button></div>
      <div class="settings-grid"><label>Target<select><option>All Users</option><option>Specific Zone</option><option>Single User</option></select></label><label>Message Type<select><option>Info</option><option>Warning</option><option>Action Required</option></select></label><label>Zone<select><option>Downtown (Z001)</option><option>Uptown (Z002)</option><option>Midtown (Z003)</option></select></label></div><label style="display:flex;flex-direction:column;gap:6px;font-size:11px;color:#687386">Message<textarea placeholder="Type a message"></textarea></label></article>
      <article class="panel"><div class="panel-title-row"><h3>Recent Popups</h3></div><div class="cards-list"><div class="entity-card"><h4>System maintenance scheduled for tonight</h4><p>All Users • Info • 78% acknowledged</p></div><div class="entity-card"><h4>Heavy traffic expected due to parade</h4><p>Zone: Downtown • Warning • 92% acknowledged</p></div></div></article></div>
      <article class="panel"><div class="panel-title-row"><h3>Admin Chat</h3></div><div class="message-window"><div class="message-head">Chat with John Doe (Driver) - Zone: Downtown</div><div class="messages"><div class="bubble admin">Hello John, how can I help you today?</div><div class="bubble user">Hi, I'm having issues with the payment system. It's not accepting my card.</div><div class="bubble admin">I see the issue. Your card was declined due to insufficient funds. Can you try another payment method?</div><div class="bubble user">Okay, I'll try with my wallet balance. Thanks for the help!</div></div><div class="message-compose"><input placeholder="Write a message"><button class="primary-btn">Send</button></div></div></article>`
  },
  trips:{
    title:'Trips & Live Map',subtitle:'Monitor active trips and intervene when necessary.',
    custom:`<article class="panel"><div class="panel-title-row"><h3>Live Map</h3><button class="secondary-btn">Refresh</button></div><div class="map-canvas"><div class="map-road r1"></div><div class="map-road r2"></div><div class="map-zone z1">T38472</div><div class="map-zone z2">T38473</div></div></article>
      <article class="panel"><div class="panel-title-row"><h3>Active Trips</h3></div>${tableHTML(['Trip ID','Driver','Rider','Pickup','Destination','Status','Actions'],[['T38472','John D. (D2847)','Emma R.','5th Ave & 42nd St','Central Park','Ongoing','Reassign · Cancel'],['T38473','Sarah W. (D3921)','Michael T.','Times Square','JFK Airport','En Route','Reassign · Cancel']])}</article>`
  },
  reports:{
    title:'Reports & Analytics',subtitle:'Review financial, driver, passenger and zone performance.',
    stats:[['Downtown Revenue','$198,452'],['Uptown Revenue','$152,369'],['Midtown Revenue','$124,785'],['Reporting Period','Last 30 days']],
    table:{head:['Zone','Today','This Week','This Month','Growth'],rows:[['Downtown','$8,452','$52,147','$198,452','+12%'],['Uptown','$6,784','$41,258','$152,369','+8%'],['Midtown','$5,321','$32,147','$124,785','-3%']]}
  },
  franchise:{
    title:'Franchise Management',subtitle:'Manage franchise partners and zone performance.',
    cards:[
      ['NYC Metro','Owner: John Smith • Zones: Downtown, Uptown, Midtown • Commission: 15%','Edit|Reports|Remove'],
      ['Chicago Central','Owner: Sarah Johnson • Zones: Loop, North Side, South Side • Commission: 18%','Edit|Reports|Remove'],
      ['LA Metro','Owner: Michael Brown • Zones: Hollywood, Downtown, Beverly Hills • Commission: 20%','Edit|Reports|Activate']
    ],
    stats:[['NYC Drivers','247'],['NYC Riders','1,582'],['NYC Revenue','$24.5K'],['NYC Rating','4.7']]
  },
  onboarding:{
    title:'Driver Onboarding & Verification',subtitle:'Review applications, documents, background checks and approvals.',
    stats:[['Application Review','Pending: 24'],['Document Verifications','Pending: 18'],['Background Check','Pending: 12'],['Final Approval','Pending: 8']],
    table:{head:['Application ID','Driver Name','Applied Date','Zone','Status','Actions'],rows:[['APP-8472','Michael Johnson','2023-11-20','Downtown','Document Review','Review · Approve · Reject'],['APP-8471','Sarah Wilson','2023-11-19','Uptown','Background Check','View · Request Info'],['APP-8470','David Brown','2023-11-18','Midtown','Approved','Details · Activate']]}
  },
  payments:{
    title:'Payment & Finance Management',subtitle:'Manage revenue, payouts, commission, refunds and gateways.',
    stats:[['Total Revenue','$248,752'],['Driver Payouts','$186,564'],['Commission','$62,188'],['Refunds','$2,458']],
    table:{head:['Driver ID','Driver Name','Zone','Amount','Period','Status','Actions'],rows:[['D2847','John Driver','Downtown','$1,247.50','Nov 1-15, 2023','Pending','Pay · Details'],['D3921','Sarah Wilson','Uptown','$984.75','Nov 1-15, 2023','Pending','Pay · Details']]}
  },
  support:{
    title:'Support & Ticket System',subtitle:'Handle rider and driver support tickets by priority.',
    cards:[
      ['Payment Failed - Trip T38472','CRITICAL • User: Emma Rider (R4821) • Zone: Downtown • Created: 15 min ago','Take Action|View Details'],
      ['Driver Navigation Issue','HIGH • User: John Driver (D2847) • Zone: Downtown • Created: 45 min ago','Assign|View Details'],
      ['Account Verification Request','NORMAL • User: Michael Thompson • Zone: Midtown • Created: 2 hours ago','Respond|View Details']
    ],
    table:{head:['Ticket ID','Subject','User','Zone','Priority','Status','Actions'],rows:[['TKT-8472','Payment Failed - Trip T38472','Emma Rider','Downtown','CRITICAL','Open','Respond · View'],['TKT-8471','Driver Navigation Issue','John Driver','Downtown','HIGH','In Progress','Update · View']]}
  },
  promotions:{
    title:'Promotions & Marketing',subtitle:'Create promotions and track campaign usage and conversion.',
    stats:[['Active Promotions','3 Active'],['Total Uses','24.5K'],['Discount Value','$18.7K'],['Conversion Rate','12.8%']],
    table:{head:['Promo Code','Description','Discount','Zone','Uses','Status','Actions'],rows:[['WELCOME20','New User Welcome Discount','20% off','All Zones','8,452','Active','Edit · Pause'],['RIDENOW15','Weekend Special','15% off','Downtown','3,247','Active','Edit · Pause'],['SAFETY10','Safety Promotion','10% off','All Zones','5,821','Expired','Copy · Reactivate']]}
  },
  vehicles:{
    title:'Vehicle Management',subtitle:'Manage vehicles, insurance, inspections and maintenance.',
    cards:[['Toyota Camry 2022 (V7842)','Owner: John Driver • Zone: Downtown • License Plate: ABC-1234 • Color: White • Seats: 4','Schedule Maintenance|View Documents|Service History']],
    table:{head:['Vehicle ID','Model','Owner','Zone','License Plate','Status','Actions'],rows:[['V7842','Toyota Camry 2022','John Driver','Downtown','ABC-1234','Active','Edit · Maintenance'],['V7843','Honda Accord 2021','Sarah Wilson','Uptown','XYZ-5678','Active','Edit · Maintenance']]}
  },
  reviews:{
    title:'Reviews & Ratings Management',subtitle:'Moderate reviews and monitor rating health.',
    cards:[['Emma Rider — ⭐⭐⭐⭐⭐','Trip: T38472 • Driver: John Driver • “Excellent service! Driver was punctual, car was clean, and the ride was smooth.”','Approve|Reject|Flag'],['Michael Thompson — ⭐⭐','Trip: T38471 • Driver: Sarah Wilson • “Driver took a longer route and the car wasn’t very clean.”','Respond|View Details']],
    table:{head:['Zone','Average Rating','Total Reviews','5 Stars','1-2 Stars','Response Rate'],rows:[['Downtown','4.7','8,452','6,841 (81%)','247 (3%)','94%'],['Uptown','4.5','6,784','5,128 (76%)','339 (5%)','89%'],['Midtown','4.6','5,321','4,152 (78%)','213 (4%)','91%']]}
  },
  incidents:{
    title:'Emergency & Incident Management',subtitle:'Respond to SOS alerts and active safety incidents.',
    cards:[['SOS Alert - Trip #T38472','Driver: John Driver • Rider: Emma Rider • Zone: Downtown • Location: 5th Ave & 42nd St • CRITICAL','Contact Emergency|View Location|Contact Driver']],
    table:{head:['Incident ID','Type','Trip ID','Zone','Severity','Status','Actions'],rows:[['INC-8472','SOS Alert','T38472','Downtown','CRITICAL','Active','Respond · Details'],['INC-8471','Accident Report','T38465','Uptown','HIGH','Investigating','Update · Details']]}
  },
  audit:{
    title:'Audit & Compliance',subtitle:'Review system activity and compliance reports.',
    cards:[['2023-11-21 14:32:15','Admin login from IP 192.168.1.105 • User: admin@rideshare.com',''],['2023-11-21 13:45:22','Driver document approved • Driver: D2847 (John Driver)',''],['2023-11-21 12:15:08','Pricing updated for Zone Downtown • User: admin@rideshare.com','']],
    table:{head:['Report Type','Period','Generated','Status','Actions'],rows:[['Driver Compliance','Q4 2023','2023-11-20','Complete','View · Download'],['Financial Audit','October 2023','2023-11-15','Complete','View · Download'],['Safety Compliance','Q4 2023','2023-11-10','In Progress','View · Generate']]}
  },
  notifications:{
    title:'Notification System',subtitle:'Create campaigns and monitor notification performance.',
    stats:[['Push Sent','24.8K'],['Push Delivered','18.5K'],['Push Opened','4.2K'],['Open Rate','22.7%']],
    table:{head:['Campaign','Type','Target','Sent','Open Rate','Status','Actions'],rows:[['Weekend Promotion','Push + Email','All Users','24,852','22.7%','Completed','View · Duplicate'],['Driver App Update','Push','All Drivers','8,452','45.2%','Completed','View · Duplicate'],['Safety Reminder','SMS','Zone: Downtown','12,458','18.3%','Scheduled','Edit · Cancel']]}
  },
  api:{
    title:'API & Integration Management',subtitle:'Monitor platform integrations and manage API access.',
    stats:[['Ride Booking API','Operational'],['Payment Gateway','Operational'],['Mapping Service','Operational'],['Notification Service','Operational']],
    table:{head:['Key Name','API Key','Permissions','Created','Last Used','Status','Actions'],rows:[['Mobile App','rs_mob_8472abc...','Read/Write','2023-10-15','2023-11-21 14:25','Active','Regenerate · Revoke'],['Partner Integration','rs_part_3921xyz...','Read Only','2023-09-20','2023-11-20 09:15','Active','Regenerate · Revoke']]}
  },
  chat:{
    title:'Chat Management',subtitle:'Manage driver, rider and support conversations.',
    custom:`<div class="tabs"><button class="active">Driver Chats</button><button>Rider Chats</button><button>Support Chats</button></div><article class="panel"><div class="message-window"><div class="message-head">John Driver (D2847) • Zone: Downtown • Active</div><div class="messages"><div class="bubble admin">Hello John, how can I help you today?</div><div class="bubble user">Hi, I'm having issues with the payment system. It's not accepting my card.</div><div class="bubble admin">I see the issue. Your card was declined due to insufficient funds. Can you try another payment method?</div></div><div class="message-compose"><input placeholder="Write a message"><button class="primary-btn">Send</button></div></div></article>`
  },
  database:{
    title:'Database Management',subtitle:'Monitor database size, records and backups.',
    stats:[['Total Size','24.8 GB'],['Drivers','1,247'],['Riders','3,582'],['Trips','42,847']],
    table:{head:['Table Name','Records','Size','Last Updated','Actions'],rows:[['drivers','1,247','2.4 GB','2023-11-21 14:32','View · Export'],['riders','3,582','1.8 GB','2023-11-21 13:45','View · Export'],['trips','42,847','8.2 GB','2023-11-21 14:15','View · Export']]}
  },
  users:{
    title:'User Management',subtitle:'Manage drivers, riders and account status.',
    cards:[['John Driver','Driver ID: D2847 • Zone: Downtown • Joined: 2023-01-15 • john.driver@example.com • +1 (555) 123-4567','Suspend|Edit|Delete']],
    stats:[["Driver's License",'Expires: 2024-06-15'],['Vehicle Insurance','Expires: 2024-03-20'],['Account Status','Active'],['Zone','Downtown']]
  },
  settings:{
    title:'System Settings',subtitle:'Configure general, security, notification and integration settings.',
    custom:`<div class="tabs"><button class="active">General</button><button>Security</button><button>Notifications</button><button>Integrations</button></div><article class="panel"><div class="panel-title-row"><h3>General Settings</h3><button class="primary-btn">Save All</button></div><div class="settings-grid"><label>System Name<input value="RideShare Pro"></label><label>Default Currency<select><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option><option>SEK (kr)</option><option>TND (د.ت)</option></select></label><label>Time Zone<select><option>UTC-5 (Eastern Time)</option><option>UTC-6 (Central Time)</option><option>UTC-8 (Pacific Time)</option></select></label></div></article><article class="panel"><h3>Security Settings</h3><div class="settings-grid" style="margin-top:14px"><label>Session Timeout (minutes)<input value="30"></label><label>Max Login Attempts<input value="5"></label><fieldset><legend>Authentication</legend><label><input type="checkbox" checked> Require Two-Factor Authentication</label></fieldset></div></article>`
  }
};

function tableHTML(head, rows){
  return `<div class="table-wrap"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((c,i)=>`<td>${i===row.length-2 && /Active|Complete|Pending|CRITICAL|HIGH|Expired|Operational|In Progress/.test(String(c)) ? `<span class="status ${/Active|Complete|Operational/.test(c)?'active':/CRITICAL|Expired/.test(c)?'danger':'warning'}">${c}</span>` : c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderGenericPages(){
  Object.entries(genericPages).forEach(([id,p])=>{
    const el=document.querySelector(`[data-page="${id}"]`);
    if(!el) return;
    let out=`<div class="page-heading"><div><h2>${p.title}</h2><p>${p.subtitle||''}</p></div><div class="actions"><select class="compact-select"><option>All Zones</option><option>Downtown (Z001)</option><option>Uptown (Z002)</option><option>Midtown (Z003)</option></select><button class="secondary-btn">Refresh</button></div></div>`;
    if(p.custom) out+=p.custom;
    else{
      if(p.stats) out+=`<section class="generated-grid">${p.stats.map(([k,v])=>`<article class="mini-stat"><span>${k}</span><strong>${v}</strong></article>`).join('')}</section>`;
      if(p.cards) out+=`<article class="panel"><div class="panel-title-row"><h3>Overview</h3></div><div class="cards-list">${p.cards.map(([t,d,a])=>`<div class="entity-card"><h4>${t}</h4><p>${d}</p>${a?`<div class="card-actions">${a.split('|').map(x=>`<button class="small-btn">${x}</button>`).join('')}</div>`:''}</div>`).join('')}</div></article>`;
      if(p.table) out+=`<article class="panel"><div class="panel-title-row"><h3>Details</h3><button class="secondary-btn">Export</button></div>${tableHTML(p.table.head,p.table.rows)}</article>`;
    }
    el.innerHTML=out;
  });
}

renderGenericPages();

const priceRows=[
  ['Economy','4.00','1.50','0.30','8.00','150.00','0','20'],
  ['Comfort','6.00','2.10','0.42','12.00','220.00','0','25'],
  ['Premium','10.00','3.25','0.60','20.00','350.00','0','30']
];
document.getElementById('pricingRows').innerHTML=priceRows.map(r=>`<tr><td><strong>${r[0]}</strong></td>${r.slice(1).map(v=>`<td><input value="${v}"></td>`).join('')}<td><button class="link-action">Save</button><button class="link-action danger-text">Delete</button></td></tr>`).join('');

nav.addEventListener('click',e=>{
  const b=e.target.closest('[data-page-target]');if(!b)return;
  const id=b.dataset.pageTarget;
  document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.dataset.page===id));
  document.getElementById('pageTitle').textContent=id==='dashboard'?'RideShare Pro Admin Dashboard':pageTitles[id];
  document.getElementById('pageCrumb').textContent=id==='dashboard'?'Dashboard Overview':pageTitles[id];
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
});

document.getElementById('calcFare').addEventListener('click',()=>{
  const d=Math.max(0,Number(document.getElementById('fareDistance').value)||0);
  const m=Math.max(0,Number(document.getElementById('fareDuration').value)||0);
  const cat=document.getElementById('fareCategory').value;
  const rates={economy:[4,1.5,.3,8],comfort:[6,2.1,.42,12],premium:[10,3.25,.6,20],xl:[8,2.7,.5,16]}[cat];
  const total=Math.max(rates[3],rates[0]+d*rates[1]+m*rates[2]);
  document.getElementById('fareResult').textContent='$'+total.toFixed(2);
});

document.querySelectorAll('.tabs').forEach(tabs=>{
  const buttons=[...tabs.querySelectorAll('[data-tab]')];
  if(!buttons.length)return;
  buttons.forEach(btn=>btn.addEventListener('click',()=>{
    buttons.forEach(b=>b.classList.toggle('active',b===btn));
    const page=btn.closest('.page');
    page.querySelectorAll('[data-tab-panel]').forEach(p=>p.classList.toggle('active',p.dataset.tabPanel===btn.dataset.tab));
  }));
});

document.addEventListener('click',e=>{
  const opener=e.target.closest('[data-modal]');
  if(opener){document.getElementById(opener.dataset.modal)?.classList.add('open');return}
  if(e.target.classList.contains('modal')||e.target.classList.contains('modal-close')||e.target.classList.contains('modal-close-action')){
    e.target.closest('.modal')?.classList.remove('open');
  }
});
document.getElementById('menuBtn').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.querySelectorAll('.segmented').forEach(s=>s.addEventListener('click',e=>{if(e.target.tagName==='BUTTON'){s.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===e.target))}}));