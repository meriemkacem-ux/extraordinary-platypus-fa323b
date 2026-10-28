import {getStore} from '@netlify/blobs';
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
const defaults={title:'THE PINK CODE',duration:30,questions:[
{en:'What should you do when you notice a new breast lump?',ar:'ماذا تفعل عند ملاحظة كتلة جديدة في الثدي؟',optionsEn:['Ignore it','Consult a healthcare professional','Wait one year'],optionsAr:['تجاهلها','استشارة مختص صحي','الانتظار سنة'],correct:1,whyEn:'A new lump should be assessed promptly; most lumps are not cancer.',whyAr:'يجب تقييم أي كتلة جديدة دون تأخير، ومعظم الكتل ليست سرطانية.'},
{en:'Can breast cancer occur without pain?',ar:'هل يمكن أن يظهر سرطان الثدي دون ألم؟',optionsEn:['Yes','No','Only after age 70'],optionsAr:['نعم','لا','فقط بعد سن السبعين'],correct:0,whyEn:'Breast cancer may be painless. Do not rely on pain to decide whether to seek advice.',whyAr:'قد لا يصاحب سرطان الثدي ألم، فلا ينبغي الاعتماد على الألم وحده.'},
{en:'What is a mammogram?',ar:'ما هو تصوير الثدي الشعاعي؟',optionsEn:['An X-ray image of the breast','A blood test','A vaccine'],optionsAr:['صورة شعاعية للثدي','تحليل دم','لقاح'],correct:0,whyEn:'Mammography is an X-ray test used in breast screening and assessment.',whyAr:'التصوير الشعاعي للثدي فحص بالأشعة يستخدم للكشف والتقييم.'},
{en:'Who should determine screening age and frequency?',ar:'من يحدد سن وتكرار فحوص الكشف؟',optionsEn:['Local medical guidance and individual risk','Social media','The same rule worldwide'],optionsAr:['الإرشادات الطبية المحلية والمخاطر الفردية','وسائل التواصل','قاعدة واحدة عالمياً'],correct:0,whyEn:'Screening recommendations differ by country and individual risk.',whyAr:'تختلف توصيات الكشف حسب البلد وعوامل الخطورة الفردية.'},
{en:'Which change deserves medical attention?',ar:'أي تغيير يستدعي استشارة طبية؟',optionsEn:['New nipple discharge, especially bloody','Only a painful lump','No change matters'],optionsAr:['إفراز جديد من الحلمة خصوصاً الدموي','كتلة مؤلمة فقط','لا تغيير مهم'],correct:0,whyEn:'New breast or nipple changes should be checked by a professional.',whyAr:'ينبغي تقييم التغيرات الجديدة في الثدي أو الحلمة طبياً.'},
{en:'Does having no family history mean there is no breast cancer risk?',ar:'هل يعني غياب التاريخ العائلي انعدام خطر سرطان الثدي؟',optionsEn:['No','Yes','Only in younger people'],optionsAr:['لا','نعم','فقط عند الأصغر سناً'],correct:0,whyEn:'Most breast cancers are not associated with a known family history.',whyAr:'كثير من حالات سرطان الثدي لا ترتبط بتاريخ عائلي معروف.'}
]};
function valid(c){return c&&Array.isArray(c.questions)&&c.questions.length>=1&&c.questions.length<=80&&c.questions.every(q=>typeof q.en==='string'&&typeof q.ar==='string'&&q.en.length<=300&&q.ar.length<=300&&Array.isArray(q.optionsEn)&&Array.isArray(q.optionsAr)&&q.optionsEn.length>=2&&q.optionsEn.length<=5&&q.optionsAr.length===q.optionsEn.length&&q.optionsEn.every(x=>typeof x==='string'&&x.length<=200)&&q.optionsAr.every(x=>typeof x==='string'&&x.length<=200)&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.optionsEn.length&&typeof q.whyEn==='string'&&typeof q.whyAr==='string');}
export default async(req)=>{
 try{
 const url=new URL(req.url), act=url.searchParams.get('action')||'content';
 const store=getStore({name:'pink-code-v5',consistency:'strong'});
 if(req.method==='GET'&&act==='content')return json(await store.get('content',{type:'json'})||defaults);
 if(req.method==='GET'&&act==='leaderboard'){
 const entries=(await store.list({prefix:'score/'})).blobs;
 const rows=await Promise.all(entries.slice(0,300).map(async x=>await store.get(x.key,{type:'json'})));
 return json(rows.filter(Boolean).sort((a,b)=>b.score-a.score||a.seconds-b.seconds).slice(0,30));
 }
 if(req.method==='POST'&&act==='content'){
 const secret=(process.env.PINK_ADMIN_SECRET||process.env.ADMIN_SECRET);
 if(!secret||secret.length<16)return json({error:'Admin secret not configured (minimum 16 characters).'},503);
 if(req.headers.get('authorization')!==`Bearer ${secret}`)return json({error:'Unauthorized'},401);
 const c=await req.json();if(!valid(c))return json({error:'Invalid question format'},400);
 await store.setJSON('content',{title:'THE PINK CODE',duration:30,questions:c.questions});
 return json({ok:true});
 }
 if(req.method==='POST'&&act==='score'){
 const v=await req.json();const name=String(v.name||'').trim().slice(0,40);
 if(name.length<2||!/^[\p{L}\p{N} _.'-]+$/u.test(name))return json({error:'Invalid team name'},400);
 const score=Number(v.score),seconds=Number(v.seconds);
 if(!Number.isInteger(score)||score<0||score>1000||!Number.isFinite(seconds)||seconds<0||seconds>7200)return json({error:'Invalid score'},400);
 const row={name,score,seconds:Math.round(seconds),date:new Date().toISOString()};
 await store.setJSON('score/'+crypto.randomUUID(),row);return json({ok:true});
 }
 return json({error:'Not found'},404);
 }catch(e){return json({error:'Server unavailable. Check site deployment.'},500)}
};
