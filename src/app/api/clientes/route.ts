import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectMongo } from '@/lib/mongo';

// MinimalClientes schema stored in Mongo as a simple collection 'clientes'.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectMongo();
    const { default: mongoose } = await import('mongoose');
    const schema = new mongoose.Schema({ nombre: String, telefono: String, email: String, empresa: String, rnc: String }, { timestamps: true });
    const Model = (mongoose.models.Cliente as any) || mongoose.model('Cliente', schema);
    const docs = await Model.find({}).collation({ locale: 'es', strength: 1 }).sort({ nombre: 1 }).lean();
    return NextResponse.json(docs.map((d:any)=>({ id: String(d._id), nombre: d.nombre, telefono: d.telefono, email: d.email, empresa: d.empresa, rnc: d.rnc })));
  } catch (e:any) {
    return NextResponse.json({ error: 'Error consultando clientes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(()=>({}));
  const nombre = (body.nombre||'').toString().trim();
  if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  try {
    await connectMongo();
    const { default: mongoose } = await import('mongoose');
    const schema = new mongoose.Schema({ nombre: String, telefono: String, email: String, empresa: String, rnc: String }, { timestamps: true });
    const Model = (mongoose.models.Cliente as any) || mongoose.model('Cliente', schema);
    const doc = await Model.create({ nombre, telefono: body.telefono||null, email: body.email||null, empresa: body.empresa||null, rnc: body.rnc||null });
    return NextResponse.json({ id: String(doc._id) });
  } catch (e:any) {
    return NextResponse.json({ error: 'Error creando cliente' }, { status: 500 });
  }
}
