/* Auto Empire Tycoon — campaign identity and onboarding. */
(function(){
'use strict';
const VERSION='Alpha 2.1.0',BUILD='2100';
const profileKey='autoempire_company_profile_v1';
const difficulties=Object.freeze({casual:{name:'Casual',cash:55000,rent:700,offers:1.25,description:'Mais capital, custos menores e compradores mais ativos.'},normal:{name:'Empreendedor',cash:35000,rent:1200,offers:1,description:'Equilíbrio entre oportunidade e risco.'},hard:{name:'Magnata',cash:22000,rent:1900,offers:.8,description:'Caixa apertado, despesas maiores e vendas mais difíceis.'}});
const difficultyOf=v=>Object.hasOwn(difficulties,v)?v:'normal';
const text=(v,max)=>String(v||'').trim().replace(/\s+/g,' ').slice(0,max);
const valid=(v)=>v.length>=2&&/[\p{L}\p{N}]/u.test(v);
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readProfile=()=>{
 try{const v=JSON.parse(localStorage.getItem(profileKey));return v&&valid(text(v.company,42))&&valid(text(v.owner,42))?{company:text(v.company,42),owner:text(v.owner,42),difficulty:difficultyOf(v.difficulty)}:null}catch(e){return null}
};
let profile=readProfile();
const style=document.createElement('style');
style.textContent=`
#ae-company-screen{position:fixed;inset:0;z-index:9999;overflow:auto;display:none;align-items:center;justify-content:center;padding:calc(20px + env(safe-area-inset-top)) 18px calc(20px + env(safe-area-inset-bottom));background:radial-gradient(ellipse at top,#234657,#07141d 72%);color:#e8f1f1}
#ae-company-screen.is-open{display:flex}
#ae-company-screen .ae-onboard-card{width:min(100%,490px);padding:25px 22px;background:#142a37;border:1px solid #507283;border-radius:20px;box-shadow:0 20px 70px #000a}
#ae-company-screen .ae-eyebrow{color:#edc879;font-size:11px;font-weight:900;letter-spacing:2px}
#ae-company-screen h1{font-size:27px;line-height:1.13;margin:14px 0 9px;color:#fff}
#ae-company-screen p{color:#c1d4da;font-size:13px;line-height:1.6}
#ae-company-screen label{display:block;font-size:12px;font-weight:800;margin:17px 0 6px}
#ae-company-screen input{display:block;width:100%;min-height:47px;padding:12px;border-radius:10px;border:1px solid #6b8a99;background:#091a25;color:#fff;font:inherit;font-size:16px;box-sizing:border-box}
#ae-company-screen .ae-onboard-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px}
#ae-company-screen button{min-height:46px;padding:10px 18px;border:0;border-radius:10px;background:#edca82;color:#17232b;font-weight:900;flex:1;cursor:pointer}
#ae-company-screen button.ghost{border:1px solid #617d8a;background:#243e4b;color:#e8f1f1}
#ae-company-screen .ae-error{color:#ffa69e;min-height:20px;font-size:12px;margin-top:8px}
#ae-company-identity{margin:0 0 12px;padding:12px 14px;border:1px solid #456575;border-radius:12px;background:#102a38;display:flex;justify-content:space-between;gap:10px;align-items:center}
#ae-company-identity strong{display:block;color:#f6d595;font-size:15px}
#ae-company-identity small{display:block;color:#b7cdd7;font-size:11px;margin-top:3px}
#ae-company-identity button{border:1px solid #547485;border-radius:9px;background:#244453;color:#e4edf1;padding:8px 11px;white-space:nowrap;font-size:11px}
`;
document.head.appendChild(style);
style.textContent+=`#ae-company-screen select{display:block;width:100%;min-height:47px;padding:12px;border-radius:10px;border:1px solid #6b8a99;background:#091a25;color:#fff;font:inherit;font-size:16px}#ae-company-screen .ae-difficulty-help{font-size:11px;color:#b9ced7;min-height:32px;margin-top:7px}#ae-company-screen .ae-difficulty-note{font-size:11px;color:#f1d28f}`;
const screen=document.createElement('section');
screen.id='ae-company-screen';screen.setAttribute('role','dialog');screen.setAttribute('aria-modal','true');screen.setAttribute('aria-labelledby','ae-company-title');
screen.innerHTML='<div class="ae-onboard-card"><div class="ae-eyebrow">AUTO EMPIRE · SUA HISTÓRIA COMEÇA AQUI</div><h1 id="ae-company-title">Construa seu império automotivo</h1><p>Escolha o nome da sua concessionária e apresente quem está no comando. Sua identidade aparecerá durante a campanha.</p><form id="ae-company-form"><label for="ae-company-name">Nome da empresa</label><input id="ae-company-name" name="company" maxlength="42" autocomplete="organization" placeholder="Ex.: Aurora Motors" required><label for="ae-owner-name">Nome do proprietário</label><input id="ae-owner-name" name="owner" maxlength="42" autocomplete="name" placeholder="Ex.: Alex Silva" required><label for="ae-difficulty">Dificuldade</label><select id="ae-difficulty" name="difficulty"><option value="casual">Casual — comece com vantagem</option><option value="normal" selected>Empreendedor — equilibrado</option><option value="hard">Magnata — desafio maior</option></select><div class="ae-difficulty-help" id="ae-difficulty-help"></div><div class="ae-error" id="ae-company-error" aria-live="polite"></div><div class="ae-onboard-actions"><button type="button" class="ghost" id="ae-company-cancel">Voltar</button><button type="submit" id="ae-company-submit">Começar minha história →</button></div></form><p id="ae-company-footnote">Sua campanha atual e seus veículos serão preservados.</p></div>';
document.body.appendChild(screen);
let creatingNew=false;
const form=screen.querySelector('form'),company=screen.querySelector('#ae-company-name'),owner=screen.querySelector('#ae-owner-name'),cancel=screen.querySelector('#ae-company-cancel'),difficulty=screen.querySelector('#ae-difficulty');
const explain=()=>{screen.querySelector('#ae-difficulty-help').textContent=difficulties[difficultyOf(difficulty.value)].description};difficulty.addEventListener('change',explain);
const main=document.querySelector('main.content')||document.querySelector('.content');
const identity=document.createElement('div');identity.id='ae-company-identity';
if(main)main.prepend(identity);
const renderIdentity=()=>{
 if(!profile){identity.style.display='none';return}
 identity.style.display='flex';
 identity.innerHTML='<div><strong>'+escapeHtml(profile.company)+'</strong><small>Proprietário: '+escapeHtml(profile.owner)+' · '+difficulties[difficultyOf(s?.difficulty||profile.difficulty)].name+'</small></div><button type="button" id="ae-company-edit">Editar perfil</button>';
 identity.querySelector('button').addEventListener('click',()=>show(false));
};
const show=(required)=>{
 screen.classList.add('is-open');document.body.style.overflow='hidden';
 company.value=profile?.company||'';owner.value=profile?.owner||'';difficulty.value=difficultyOf(s?.difficulty||profile?.difficulty);difficulty.disabled=!!profile&&!creatingNew;explain();
 screen.querySelector('#ae-company-error').textContent='';
 cancel.hidden=!!required;
 screen.querySelector('#ae-company-submit').textContent=required?'Fundar concessionária →':'Salvar identidade';
 screen.querySelector('#ae-company-footnote').textContent=required?'A criação do perfil não apaga nem substitui dados de jogo já salvos.':'As alterações de nome não modificam seu estoque nem suas finanças.';
 requestAnimationFrame(()=>company.focus());
};
const hide=()=>{screen.classList.remove('is-open');document.body.style.overflow=''};
cancel.addEventListener('click',hide);
form.addEventListener('submit',e=>{
 e.preventDefault();
 const next={company:text(company.value,42),owner:text(owner.value,42),difficulty:difficultyOf(creatingNew||!profile?difficulty.value:profile.difficulty)};
 if(!valid(next.company)||!valid(next.owner)){screen.querySelector('#ae-company-error').textContent='Informe nomes com pelo menos dois caracteres válidos.';return}
 try{localStorage.setItem(profileKey,JSON.stringify(next))}catch(err){screen.querySelector('#ae-company-error').textContent='Não foi possível salvar. Verifique o armazenamento do navegador.';return}
 profile=next;if(creatingNew){seed();paused=true;creatingNew=false;showTab()}else if(s&&!s.difficulty){s.difficulty=next.difficulty;save()}renderIdentity();hide();
 if(typeof toast==='function')toast('Bem-vindo à '+next.company+'!');
});
renderIdentity();
if(!profile)show(true);
const previousSeed=seed;
seed=function(){previousSeed();const mode=difficultyOf(profile?.difficulty||difficulty.value);s.difficulty=mode;s.cash=difficulties[mode].cash;save()};
const previousTickDay=tickDay;
tickDay=function(){const day=s.day;previousTickDay();if(s.day!==day&&s.day%30===0){const mode=difficulties[difficultyOf(s.difficulty)];s.cash+=1200-mode.rent;save()}};
newGame=function(){
 if(!confirm('Iniciar uma nova campanha? O estoque e o dinheiro atuais serão substituídos.'))return;
 creatingNew=true;show(false);difficulty.disabled=false;
 screen.querySelector('#ae-company-submit').textContent='Criar nova campanha →';
 screen.querySelector('#ae-company-footnote').textContent='A nova campanha substitui o progresso atual ao confirmar. Escolha a dificuldade.';
};
cancel.addEventListener('click',()=>{creatingNew=false});
function showTab(){if(typeof window.show==='function')window.show('garage');else if(typeof render==='function')render()}
document.title='Auto Empire Tycoon — '+VERSION;
const banner=document.getElementById('ae-version');if(banner)banner.textContent='AUTO EMPIRE TYCOON · '+VERSION+' · BUILD '+BUILD;
const tag=document.querySelector('.top .tag');if(tag)tag.textContent='ALPHA 2.1.0 · ESCOLHA SEU DESAFIO';
})();
