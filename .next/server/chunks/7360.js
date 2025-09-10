"use strict";exports.id=7360,exports.ids=[7360],exports.modules={67360:(a,b,c)=>{c.d(b,{J:()=>j,N:()=>n,auth:()=>o});var d=c(28120),e=c(7028),f=c(36112),g=c(52963),h=c(74438),i=c(86692);let j={ADMIN:"ADMIN",COORDINADOR:"COORDINADOR",VOLUNTARIO:"VOLUNTARIO"},k=f.Ik({email:f.Yj().email(),password:f.Yj().min(6)});async function l(a){if(process.env.MONGODB_URI){await (0,i.N)();let{default:b}=await c.e(7812).then(c.bind(c,77812)),d=await b.findOne({email:a}).lean();return!d||Array.isArray(d)?null:{id:String(d._id),name:d.name,email:d.email,passwordHash:d.passwordHash,role:d.role,emailVerified:+!!d.emailVerified}}return h.db.prepare("SELECT id, name, email, password_hash as passwordHash, role, email_verified as emailVerified FROM users WHERE email = ?").get(a)??null}async function m(a){if(process.env.MONGODB_URI){await (0,i.N)();let{default:b}=await c.e(7812).then(c.bind(c,77812)),d=await b.findOne({email:a}).select({role:1,emailVerified:1,name:1,settings:1}).lean();return{role:d?.role,approved:!!d?.emailVerified,name:d?.name??null,settings:d?.settings??{}}}let b=h.db.prepare("SELECT name, role, email_verified as emailVerified FROM users WHERE email = ?").get(a);return{role:b?.role??null,approved:b?.emailVerified===1,name:b?.name??null,settings:{}}}let n={session:{strategy:"jwt"},pages:{signIn:"/signin"},providers:[(0,d.A)({name:"Credentials",credentials:{email:{label:"Email",type:"email"},password:{label:"Password",type:"password"}},authorize:async a=>{let b=k.safeParse(a);if(!b.success)return null;let{email:c,password:d}=b.data,f=await l(c);if(!f||!f.passwordHash||!await (0,e.UD)(d,f.passwordHash))return null;if(1!==f.emailVerified)throw Error("PendienteAprobacion");let{role:g,name:h,settings:i}=await m(c);return{id:f.id,email:f.email,name:h??f.name??void 0,role:g??f.role??j.VOLUNTARIO,settings:i??{}}}})],callbacks:{async jwt({token:a,user:b}){if(b&&(a.role=b.role??a.role??j.VOLUNTARIO,a.name=b.name??a.name,a.settings=b.settings??a.settings??{}),a?.email)try{let{role:b,approved:c,name:d,settings:e}=await m(a.email);a.role=b??a.role??j.VOLUNTARIO,a.approved=c??!1,a.name=d??a.name,a.settings=e??a.settings??{}}catch{}return a},session:({session:a,token:b})=>(a.user=a.user??{},a.user.role=b.role??j.VOLUNTARIO,a.user.approved=b.approved??!1,b&&b.name&&(a.user.name=String(b.name)),a.user.settings=b.settings??{},a)}};function o(){return(0,g.getServerSession)(n)}},74438:(a,b,c)=>{c.d(b,{db:()=>j});var d=c(87550),e=c.n(d),f=c(33873),g=c.n(f),h=c(7028);let i=g().join(process.cwd(),"data","app.db"),j=new(e())(i);j.pragma("journal_mode = WAL"),j.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'VOLUNTARIO',
  email_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS volunteers (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  congregacion TEXT,
  a2 INTEGER DEFAULT 0,
  trabajo_altura INTEGER DEFAULT 0,
  created_by TEXT,
  short_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fichas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad TEXT DEFAULT 'MEDIA',
  estado TEXT DEFAULT 'ABIERTA',
  asignado_a TEXT,
  vencimiento TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);try{j.prepare("ALTER TABLE fichas ADD COLUMN instrucciones TEXT").run()}catch{}try{j.prepare("ALTER TABLE fichas ADD COLUMN notas TEXT").run()}catch{}try{j.prepare("ALTER TABLE fichas ADD COLUMN checklist TEXT").run()}catch{}try{j.prepare("ALTER TABLE fichas ADD COLUMN pdfId TEXT").run()}catch{}try{j.prepare("ALTER TABLE volunteers ADD COLUMN short_id TEXT").run()}catch{}try{j.prepare("ALTER TABLE volunteers ADD COLUMN email TEXT").run()}catch{}try{j.prepare("ALTER TABLE volunteers ADD COLUMN cargo TEXT").run()}catch{}try{let a=process.env.ADMIN_EMAIL,b=process.env.ADMIN_PASSWORD,c=process.env.ADMIN_PASSWORD_HASH;if(a&&!j.prepare("SELECT id FROM users WHERE email = ?").get(a)&&(c||b)){let d=c&&c.length>0?c:h.Ay.hashSync(b,10);j.prepare(`INSERT INTO users (id, name, email, password_hash, role, email_verified)
         VALUES (@id, @name, @email, @password_hash, @role, 1)`).run({id:crypto.randomUUID(),name:"Administrador",email:a,password_hash:d,role:"ADMIN"})}}catch(a){}}};