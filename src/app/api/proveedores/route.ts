import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectMongo } from '@/lib/mongo';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectMongo();
    const { default: mongoose } = await import('mongoose');
    const schema = new mongoose.Schema({ nombre: String, telefono: String, email: String, empresa: String, rnc: String }, { timestamps: true });
    const Model = (mongoose.models.Proveedor as any) || mongoose.model('Proveedor', schema);
    const docs = await Model.find({}).collation({ locale: 'es', strength: 1 }).sort({ nombre: 1 }).lean();
    return NextResponse.json(docs.map((d:any)=>({ id: String(d._id), nombre: d.nombre, telefono: d.telefono, email: d.email, empresa: d.empresa, rnc: d.rnc })));
  } catch (e:any) {
    return NextResponse.json({ error: 'Error consultando proveedores' }, { status: 500 });
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
    const Model = (mongoose.models.Proveedor as any) || mongoose.model('Proveedor', schema);
    const doc = await Model.create({ nombre, telefono: body.telefono||null, email: body.email||null, empresa: body.empresa||null, rnc: body.rnc||null });
    return NextResponse.json({ id: String(doc._id) });
  } catch (e:any) {
    return NextResponse.json({ error: 'Error creando proveedor' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  const body = await req.json().catch(()=>({}));
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  try {
    await connectMongo();
    const { default: mongoose } = await import('mongoose');
    const schema = new mongoose.Schema({ nombre: String, telefono: String, email: String, empresa: String, rnc: String }, { timestamps: true });
    const Model = (mongoose.models.Proveedor as any) || mongoose.model('Proveedor', schema);
    await Model.updateOne({ _id: id }, { $set: { nombre: body.nombre, telefono: body.telefono, email: body.email, empresa: body.empresa } });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: 'Error actualizando proveedor' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  try {
    await connectMongo();
    const { default: mongoose } = await import('mongoose');
    const schema = new mongoose.Schema({ nombre: String, telefono: String, email: String, empresa: String, rnc: String }, { timestamps: true });
    const Model = (mongoose.models.Proveedor as any) || mongoose.model('Proveedor', schema);
    await Model.deleteOne({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: 'Error eliminando proveedor' }, { status: 500 });
  }
}
