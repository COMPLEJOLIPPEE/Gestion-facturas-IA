import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui";
import { getCurrentRole, canWrite } from "@/lib/auth/permissions";
import EmpleadoForm from "./form";
import { crearEmpleado } from "./actions";

export default async function NuevoEmpleadoPage() {
  const role=await getCurrentRole();
  if(!canWrite(role)) return <PageContainer><PageHeader title="Nuevo empleado" description="Sin permisos" icon={<UserPlus className="h-6 w-6"/>}/><p className="text-sm text-gray-600">No tenés permisos para crear empleados.</p></PageContainer>;
  return <PageContainer>
    <PageHeader title="Nuevo empleado" description="Alta de personal" icon={<UserPlus className="h-6 w-6"/>}
      actions={<Link href="/empleados"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Button></Link>}/>
    <EmpleadoForm action={crearEmpleado}/>
  </PageContainer>;
}
