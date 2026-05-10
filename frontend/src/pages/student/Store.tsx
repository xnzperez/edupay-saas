import { useState } from "react";
import { sileo } from "sileo";
import { storeService } from "../../services/store";

// Espejo exacto del map O(1) de internal/store/models.go
const CATALOG = [
  {
    id: "cert_estudio",
    name: "Certificado de Estudio",
    price: 15000,
    icon: "🎓",
    description:
      "Constancia de matrícula activa en el semestre actual. Ideal para trámites de EPS.",
  },
  {
    id: "cert_notas",
    name: "Certificado de Notas",
    price: 20000,
    icon: "📄",
    description:
      "Documento oficial con el promedio acumulado y notas definitivas por materia.",
  },
  {
    id: "derecho_grado",
    name: "Derechos de Grado",
    price: 350000,
    icon: "📜",
    description:
      "Pago oficial y obligatorio para iniciar los trámites de titulación y ceremonia.",
  },
];

export default function Store() {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handleBuyCertificate = async (itemId: string, itemName: string) => {
    setPurchasingId(itemId);
    try {
      // Disparamos la petición a Go. Recuerda: esto retorna un 200 casi instantáneo
      // mientras la Goroutine en el backend genera el PDF y envía el correo con Resend.
      await storeService.buyCertificate(itemId);

      sileo.success({
        title: "¡Solicitud Aprobada!",
        description: `El saldo fue descontado. Tu ${itemName} llegará al correo asociado en breve.`,
      });
    } catch (error: any) {
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tighter">
          Tienda de <span className="text-primary">Servicios</span>
        </h1>
        <p className="text-foreground mt-1 font-medium">
          Adquiere certificados académicos oficiales descontando de tu
          billetera.
        </p>
      </div>

      {/* Grid del Catálogo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATALOG.map((item) => (
          <div
            key={item.id}
            className="bg-surface border border-line p-8 rounded-3xl shadow-lg hover:border-primary transition-all group flex flex-col h-full"
          >
            <div className="text-4xl mb-4">{item.icon}</div>

            <h3 className="text-xl font-bold text-foreground mb-2 leading-tight">
              {item.name}
            </h3>

            <p className="text-sm text-foreground mb-6 flex-grow">
              {item.description}
            </p>

            <div className="border-t border-line/50 pt-6 mt-auto">
              <div className="flex items-end justify-between mb-6">
                <span className="text-xs font-bold text-foreground uppercase tracking-widest">
                  Valor Unitario
                </span>
                <span className="text-2xl font-black text-primary tabular-nums">
                  ${item.price.toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => handleBuyCertificate(item.id, item.name)}
                disabled={purchasingId === item.id}
                className="w-full bg-primary hover:bg-primary-hover text-background font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-wait shadow-lg shadow-primary/10"
              >
                {purchasingId === item.id
                  ? "PROCESANDO PAGO..."
                  : "COMPRAR AHORA"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Nota de advertencia */}
      <div className="bg-muted/20 border border-line p-5 rounded-2xl flex items-start gap-4">
        <span className="text-xl">ℹ️</span>
        <p className="text-sm text-foreground">
          <strong className="text-foreground">Proceso Asíncrono:</strong> Al hacer
          clic en comprar, el sistema verificará tu saldo con bloqueo de fila
          (ACID). Si es aprobado, el PDF se generará en los servidores y se
          despachará automáticamente a tu correo electrónico registrado.
        </p>
      </div>
    </div>
  );
}
