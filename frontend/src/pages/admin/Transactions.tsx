import { useState, useEffect } from "react";
import { sileo } from "sileo";
import {
  getGlobalTransactions,
  type GlobalTransactionDTO,
} from "../../services/wallet";

export default function Transactions() {
  const [transactions, setTransactions] = useState<GlobalTransactionDTO[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const response = await getGlobalTransactions(currentPage, 10); // 10 registros por página
      setTransactions(response.data);
      setTotalPages(response.total_pages);
    } catch (error: any) {
      sileo.error({
        title: "Error de Auditoría",
        description:
          (error.response?.data?.message || error.response?.data?.error) ||
          "No se pudo cargar el historial de transacciones globales.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Escuchamos los cambios de página para disparar la petición HTTP
  useEffect(() => {
    fetchTransactions(page);
  }, [page]);

  // Helper para renderizar los tipos de transacción con los colores de Nord
  const renderTxBadge = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return (
          <span className="px-2.5 py-1 bg-nord-14/10 text-nord-14 border border-nord-14/20 rounded-md text-[10px] font-black tracking-widest uppercase">
            Recarga
          </span>
        );
      case "TRANSFER_IN":
      case "TRANSFER_OUT":
        return (
          <span className="px-2.5 py-1 bg-nord-8/10 text-nord-8 border border-nord-8/20 rounded-md text-[10px] font-black tracking-widest uppercase">
            P2P
          </span>
        );
      case "PAYMENT":
      case "PURCHASE":
        return (
          <span className="px-2.5 py-1 bg-nord-15/10 text-nord-15 border border-nord-15/20 rounded-md text-[10px] font-black tracking-widest uppercase">
            Pago / Compra
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-nord-3/20 text-nord-4 border border-nord-3/50 rounded-md text-[10px] font-black tracking-widest uppercase">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-nord-6 tracking-tight">
          Auditoría de Transacciones
        </h1>
        <p className="text-nord-4 mt-2 font-medium">
          Historial inmutable de todos los movimientos financieros del Tenant.
        </p>
      </div>

      <div className="bg-nord-1 border border-nord-2 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center animate-pulse text-nord-4 font-mono text-sm">
            DESCARGANDO LIBROS MAYORES...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-nord-4 italic">
            El sistema no registra transacciones aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-nord-2/50 border-b border-nord-2 text-xs uppercase tracking-wider text-nord-4">
                  <th className="p-4 font-bold">Referencia / Fecha</th>
                  <th className="p-4 font-bold">Usuario</th>
                  <th className="p-4 font-bold">Tipo</th>
                  <th className="p-4 font-bold text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nord-2">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-nord-2/20 transition-colors"
                  >
                    <td className="p-4">
                      <p className="text-nord-6 font-mono text-sm font-bold">
                        {tx.reference || tx.id.substring(0, 8).toUpperCase()}
                      </p>
                      <p className="text-nord-4 text-xs mt-1">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-nord-6 font-bold text-sm">
                        {tx.user_full_name}
                      </p>
                      <p className="text-nord-4 text-xs">{tx.user_email}</p>
                    </td>
                    <td className="p-4">{renderTxBadge(tx.tx_type)}</td>
                    <td className="p-4 text-right">
                      <p
                        className={`font-black tabular-nums ${
                          tx.tx_type === "DEPOSIT" || tx.tx_type === "TRANSFER_IN"
                            ? "text-nord-14"
                            : "text-nord-11"
                        }`}
                      >
                        {tx.tx_type === "DEPOSIT" || tx.tx_type === "TRANSFER_IN"
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

        {/* Controles de Paginación */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-nord-2 bg-nord-2/10 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs font-bold px-4 py-2 bg-nord-3 text-nord-6 rounded-lg hover:bg-nord-4 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← ANTERIOR
            </button>
            <span className="text-xs font-bold text-nord-4 uppercase tracking-widest">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="text-xs font-bold px-4 py-2 bg-nord-3 text-nord-6 rounded-lg hover:bg-nord-4 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              SIGUIENTE →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}