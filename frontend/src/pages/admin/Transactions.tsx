import { useState, useEffect, useCallback } from "react";
import {
  getGlobalTransactions,
  exportTransactionsCSV,
  type GlobalTransactionDTO,
} from "../../services/wallet";
import { useNotificationStore } from "../../store/notificationStore";
import { sileo } from "sileo";

export default function Transactions() {
  const [transactions, setTransactions] = useState<GlobalTransactionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Estados de Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const addNotification = useNotificationStore((s) => s.addNotification);

  // Memoización de la petición para evitar re-renders por dependencias fantasma
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getGlobalTransactions(page, limit);
      setTransactions(response.data || []);
      setTotalPages(response.total_pages || 1);
    } catch (error: unknown) {
      addNotification("Error", "Fallo al obtener transacciones.", "warning");
      sileo.error({
        title: "Error",
        description: "Fallo al obtener transacciones.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, addNotification]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handler para resetear la página al cambiar el límite
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const blob = await exportTransactionsCSV();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.setAttribute("download", `Auditoria_Transacciones_${timestamp}.csv`);

      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      sileo.success({
        title: "Descarga completa",
        description: "El reporte CSV ha sido generado.",
      });
    } catch (error: unknown) {
      addNotification(
        "Error",
        "No se pudo generar el archivo de auditoría.",
        "warning",
      );
      sileo.error({
        title: "Error",
        description: "No se pudo generar el archivo de auditoría.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderTxBadge = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return (
          <span className="px-2.5 py-1 bg-success/10 text-success border border-success/20 rounded-md text-[10px] font-black tracking-widest uppercase">
            Recarga
          </span>
        );
      case "TRANSFER_IN":
      case "TRANSFER_OUT":
        return (
          <span className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-black tracking-widest uppercase">
            P2P
          </span>
        );
      case "PAYMENT":
      case "PURCHASE":
        return (
          <span className="px-2.5 py-1 bg-warning/10 text-warning border border-warning/20 rounded-md text-[10px] font-black tracking-widest uppercase">
            Pago / Compra
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-muted/20 text-foreground border border-line/50 rounded-md text-[10px] font-black tracking-widest uppercase">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header unificado (Título + Botón Global de Acción) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Auditoría de Transacciones
          </h1>
          <p className="text-foreground mt-2 font-medium">
            Historial inmutable de todos los movimientos financieros del Tenant.
          </p>
        </div>

        {/* Corrección: Removido el bloqueo por array vacío y forzado el z-index */}
        <button
          onClick={handleExportCSV}
          disabled={isExporting || isLoading}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 transform hover:-translate-y-0.5 shadow-md disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed cursor-pointer"
        >
          {isExporting ? "Generando CSV..." : "Exportar Auditoría CSV"}
        </button>
      </div>

      <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <div className="h-12 bg-surface border border-line rounded-xl animate-pulse"></div>
            <div className="h-12 bg-surface border border-line rounded-xl animate-pulse"></div>
            <div className="h-12 bg-surface border border-line rounded-xl animate-pulse"></div>
            <div className="h-12 bg-surface border border-line rounded-xl animate-pulse"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-foreground italic">
            El sistema no registra transacciones aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-line/50 border-b border-line text-xs uppercase tracking-wider text-foreground">
                  <th className="p-4 font-bold">Referencia / Fecha</th>
                  <th className="p-4 font-bold">Usuario</th>
                  <th className="p-4 font-bold">Tipo</th>
                  <th className="p-4 font-bold text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-line/20 transition-colors"
                  >
                    <td className="p-4">
                      <p className="text-foreground font-mono text-sm font-bold">
                        {tx.reference || tx.id.substring(0, 8).toUpperCase()}
                      </p>
                      <p className="text-foreground text-xs mt-1">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-foreground font-bold text-sm">
                        {tx.user_full_name}
                      </p>
                      <p className="text-foreground text-xs">{tx.user_email}</p>
                    </td>
                    <td className="p-4">{renderTxBadge(tx.tx_type)}</td>
                    <td className="p-4 text-right">
                      <p
                        className={`font-black tabular-nums ${tx.tx_type === "DEPOSIT" || tx.tx_type === "TRANSFER_IN" ? "text-success" : "text-danger"}`}
                      >
                        {tx.tx_type === "DEPOSIT" ||
                        tx.tx_type === "TRANSFER_IN"
                          ? "+"
                          : "-"}
                        ${tx.amount.toLocaleString("es-CO")}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Controles de Paginación estilo StudentsList */}
        {!isLoading && transactions.length > 0 && (
          <div className="bg-background border-t border-line p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>Mostrar:</span>
              <select
                value={limit}
                onChange={handleLimitChange}
                className="bg-surface border border-line text-foreground rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>por página</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="text-sm font-bold text-primary disabled:text-muted disabled:cursor-not-allowed hover:text-primary-hover transition-colors"
              >
                &larr; Anterior
              </button>
              <span className="text-sm font-medium text-foreground">
                Página <span className="text-foreground">{page}</span> de{" "}
                <span className="text-foreground">{totalPages}</span>
              </span>
              <button
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={page >= totalPages || totalPages === 0}
                className="text-sm font-bold text-primary disabled:text-muted disabled:cursor-not-allowed hover:text-primary-hover transition-colors"
              >
                Siguiente &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
