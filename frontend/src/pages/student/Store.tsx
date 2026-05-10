import { useState, useMemo } from "react";
import { sileo } from "sileo";
import { storeService } from "../../services/store";

// Catálogo Expandido y Categorizado
const CATALOG = [
  {
    id: "cert_estudio",
    name: "Certificado de Estudio",
    price: 15000,
    icon: "🎓",
    category: "Certificados",
    description:
      "Constancia de matrícula activa. Ideal para trámites de EPS o cajas de compensación.",
  },
  {
    id: "cert_notas",
    name: "Certificado de Notas",
    price: 20000,
    icon: "📄",
    category: "Certificados",
    description:
      "Documento oficial con el promedio acumulado y notas definitivas por materia.",
  },
  {
    id: "derecho_grado",
    name: "Derechos de Grado",
    price: 350000,
    icon: "📜",
    category: "Académico",
    description:
      "Pago oficial obligatorio para iniciar trámites de titulación y ceremonia de grado.",
  },
  {
    id: "carnet_duplicado",
    name: "Duplicado de Carnet",
    price: 25000,
    icon: "🪪",
    category: "Administrativo",
    description:
      "Reposición de carnet institucional por pérdida, robo o deterioro físico.",
  },
  {
    id: "val_ingles",
    name: "Validación de Inglés",
    price: 45000,
    icon: "🌎",
    category: "Académico",
    description:
      "Examen de suficiencia para validar requisitos de lengua extranjera en el programa.",
  },
  {
    id: "seguro_acc",
    name: "Seguro Estudiantil",
    price: 12000,
    icon: "🏥",
    category: "Administrativo",
    description:
      "Póliza de accidentes personales con cobertura nacional para el semestre vigente.",
  },
];

const CATEGORIES = ["Todos", "Certificados", "Académico", "Administrativo"];

export default function Store() {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todos");

  // Filtrado dinámico
  const filteredItems = useMemo(() => {
    if (activeCategory === "Todos") return CATALOG;
    return CATALOG.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const handleBuyCertificate = async (itemId: string, itemName: string) => {
    setPurchasingId(itemId);
    try {
      await storeService.buyCertificate(itemId);
      sileo.success({
        title: "¡Solicitud Aprobada!",
        description: `El saldo fue descontado. Tu ${itemName} llegará al correo en breve.`,
      });
    } catch (error: any) {
      // Manejado por interceptor
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Encabezado con Categorías */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter">
            Tienda de <span className="text-primary">Servicios</span>
          </h1>
          <p className="text-muted mt-1 font-medium text-sm">
            Adquiere documentos oficiales descontando de tu billetera digital.
          </p>
        </div>

        {/* Filtros Estilo Píldora */}
        <div className="flex bg-surface border border-line p-1 rounded-xl shadow-sm overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid del Catálogo Estilo Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group bg-surface border border-line p-6 rounded-3xl shadow-sm hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
          >
            {/* Badge de Categoría sutil */}
            <span className="absolute top-6 right-6 text-[10px] font-black bg-line/50 text-muted px-2 py-1 rounded uppercase tracking-tighter">
              {item.category}
            </span>

            <div className="w-14 h-14 bg-background border border-line rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-500">
              {item.icon}
            </div>

            <h3 className="text-lg font-bold text-foreground mb-2 leading-tight group-hover:text-primary transition-colors">
              {item.name}
            </h3>

            <p className="text-xs text-muted font-medium mb-8 leading-relaxed flex-grow">
              {item.description}
            </p>

            <div className="pt-6 border-t border-line/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">
                  Costo del trámite
                </span>
                <span className="text-xl font-black text-foreground tabular-nums">
                  ${item.price.toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => handleBuyCertificate(item.id, item.name)}
                disabled={purchasingId === item.id}
                className="w-full bg-foreground hover:bg-primary text-background font-black py-3 rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-wait flex items-center justify-center gap-2 text-sm"
              >
                {purchasingId === item.id ? (
                  <span className="flex items-center gap-2 animate-pulse">
                    PROCESANDO...
                  </span>
                ) : (
                  "COMPRAR AHORA"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info de Seguridad & Proceso (Efecto Glassmorphism) */}
      <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl flex items-start gap-5 backdrop-blur-md">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">
            Garantía de Entrega Digital
          </p>
          <p className="text-xs text-muted leading-relaxed">
            Todas las compras se procesan mediante{" "}
            <strong>transacciones ACID con Row-Level Locks</strong>. Tras la
            validación del saldo, el motor de generación en Go despachará el
            documento vía SMTP TLS a tu correo institucional de forma inmediata.
          </p>
        </div>
      </div>
    </div>
  );
}
