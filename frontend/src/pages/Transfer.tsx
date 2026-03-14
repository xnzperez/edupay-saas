import { useState } from "react";
import { useNavigate } from "react-router";
import { sileo } from "sileo";
import { sendTransfer } from "../services/wallet";

export default function Transfer() {
  const navigate = useNavigate();

  // Estados para capturar los inputs del formulario
  const [toEmail, setToEmail] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación de seguridad básica en el frontend
    if (!amount || amount <= 0) {
      sileo.error({
        title: "Monto inválido",
        description: "El monto debe ser mayor a 0",
      });
      return;
    }

    setIsSending(true);

    try {
      // Enviamos la petición a nuestro backend en Go
      const data = await sendTransfer({
        to_email: toEmail,
        amount: Number(amount),
      });

      // Notificamos el éxito y regresamos al panel principal
      sileo.success({
        title: "¡Transferencia exitosa!",
        description: data.message || `Has enviado $${amount} a ${toEmail}`,
      });
      navigate("/dashboard");
    } catch (error: any) {
      // Capturamos los errores que programamos en Go (ej: "saldo insuficiente" o "usuario no existe")
      sileo.error({
        title: "Transferencia rechazada",
        description: error.response?.data?.error || "No se pudo realizar la transferencia",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-nord-1 rounded-xl shadow-lg border border-nord-2 p-8 mt-8">
      <h2 className="text-xl font-bold text-nord-8 mb-6">Enviar Dinero</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-nord-4 text-sm font-medium mb-1">
              Correo del Destinatario
            </label>
            <input
              type="email"
              required
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="w-full bg-nord-0 border border-nord-3 text-nord-6 rounded-lg p-3 focus:outline-none focus:border-nord-8 transition-colors"
              placeholder="mateo@campusucc.edu.co"
            />
          </div>

          <div>
            <label className="block text-nord-4 text-sm font-medium mb-1">
              Monto a transferir (COP)
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || "")}
              className="w-full bg-nord-0 border border-nord-3 text-nord-6 rounded-lg p-3 focus:outline-none focus:border-nord-8 transition-colors"
              placeholder="15000"
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full bg-nord-8 hover:bg-nord-10 text-nord-0 font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
          >
            {isSending ? "Procesando..." : "Transferir"}
          </button>
      </form>
    </div>
  );
}
