import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sileo } from "sileo";

import { sendTransfer } from "../../services/wallet";
import { contactService, type Contact } from "../../services/contacts";
import {
  transferSchema,
  type TransferFormValues,
} from "../../validations/transfer";

export default function Transfer() {
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);

  // Estados de datos
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<string[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Estados del formulario de nuevo contacto
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
  });

  const currentEmail = watch("to_email");

  // Carga paralela de Directorio y Recientes
  const loadData = async () => {
    try {
      const [contactsData, recentData] = await Promise.all([
        contactService.getContacts(),
        contactService.getRecentContacts(),
      ]);
      setContacts(contactsData);
      setRecentTransfers(recentData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectContact = (email: string) => {
    // Si el email viene dentro de un texto largo en 'reference', extraemos solo el correo (regex simple)
    const emailMatch = email.match(
      /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/,
    );
    const cleanEmail = emailMatch ? emailMatch[0] : email;

    setValue("to_email", cleanEmail, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleRemoveContact = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    // UI Optimista: Lo quitamos de la lista al instante
    const previousContacts = [...contacts];
    setContacts((prev) => prev.filter((c) => c.id !== id));

    try {
      await contactService.removeContact(id);
      sileo.success({
        title: "Contacto eliminado",
        description: "Se ha removido de tu libreta.",
      });
    } catch (error) {
      // Revertir si falla
      setContacts(previousContacts);
      sileo.error({
        title: "Error",
        description: "No se pudo eliminar el contacto.",
      });
    }
  };

  const handleSaveContact = async () => {
    if (!newContactName || !newContactEmail) {
      sileo.warning({
        title: "Datos incompletos",
        description: "Ingresa nombre y correo.",
      });
      return;
    }

    try {
      await contactService.addContact(newContactEmail, newContactName);
      sileo.success({
        title: "Contacto Guardado",
        description: "Agregado a tu libreta.",
      });
      setIsAddingContact(false);
      setNewContactName("");
      setNewContactEmail("");
      loadData(); // Recargamos para ver el nuevo contacto
    } catch (error: any) {
      // Atrapamos el error 404 personalizado que enviamos desde Go
      if (error.response && error.response.status === 404) {
        sileo.error({
          title: "Usuario No Encontrado",
          description:
            error.response.data.error || "El correo no existe en el sistema.",
        });
      } else {
        sileo.error({
          title: "Error",
          description: "Ocurrió un problema al guardar el contacto.",
        });
      }
    }
  };

  const onSubmit = async (data: TransferFormValues) => {
    setIsSending(true);
    try {
      const response = await sendTransfer(data);
      sileo.success({
        title: "¡Transferencia exitosa!",
        description:
          response.message ||
          `Has enviado $${data.amount.toLocaleString()} a ${data.to_email}`,
      });
      navigate("/student");
    } catch (error: any) {
      // Interceptores globales manejan el error
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tighter">
          Enviar <span className="text-primary">Dinero</span>
        </h1>
        <p className="text-muted mt-1 font-medium text-sm">
          Transfiere fondos a tus compañeros de forma instantánea y segura.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* --- PANEL IZQUIERDO: Formulario --- */}
        <div className="lg:col-span-3 bg-surface border border-line rounded-3xl p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted tracking-wider uppercase">
                Monto a Transferir
              </label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl text-foreground font-black opacity-50">
                  $
                </span>
                <input
                  type="number"
                  {...register("amount", { valueAsNumber: true })}
                  className={`w-full bg-background border rounded-2xl py-6 pl-14 pr-6 text-4xl font-black text-foreground focus:outline-none transition-all ${
                    errors.amount
                      ? "border-danger focus:ring-4 focus:ring-danger/20"
                      : "border-line focus:border-primary focus:ring-4 focus:ring-primary/20"
                  }`}
                  placeholder="0"
                />
              </div>
              {errors.amount && (
                <p className="text-danger text-xs font-bold animate-pulse">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-3 border-t border-line pt-8">
              <label className="text-xs font-bold text-muted tracking-wider uppercase">
                Correo del Destinatario
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  type="email"
                  {...register("to_email")}
                  className={`w-full bg-background border rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-foreground focus:outline-none transition-all ${
                    errors.to_email
                      ? "border-danger focus:ring-4 focus:ring-danger/20"
                      : "border-line focus:border-primary focus:ring-4 focus:ring-primary/20"
                  }`}
                  placeholder="usuario@campusucc.edu.co"
                />
              </div>
              {errors.to_email && (
                <p className="text-danger text-xs font-bold animate-pulse">
                  {errors.to_email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full bg-primary hover:bg-primary-hover text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSending ? (
                <span className="animate-pulse">ENVIANDO FONDOS...</span>
              ) : (
                "CONFIRMAR TRANSFERENCIA"
              )}
            </button>
          </form>
        </div>

        {/* --- PANEL DERECHO: Recientes y Directorio --- */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Bloque Recientes (Si hay transferencias previas) */}
          {!isLoadingContacts && recentTransfers.length > 0 && (
            <div className="bg-surface border border-line rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-foreground mb-4">
                Transferencias Recientes
              </h3>
              <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                {recentTransfers.map((ref, idx) => {
                  // Extraemos solo el correo o nombre si la referencia es larga
                  const displayStr = ref.split(" ").pop() || ref;
                  const initials = displayStr.substring(0, 2).toUpperCase();

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectContact(ref)}
                      className="flex flex-col items-center gap-2 shrink-0 group focus:outline-none"
                    >
                      <div className="w-12 h-12 rounded-full bg-line/30 group-hover:bg-primary/20 flex items-center justify-center font-black text-xs text-foreground group-hover:text-primary transition-all border border-transparent group-hover:border-primary/30">
                        {initials}
                      </div>
                      <span className="text-[10px] font-bold text-muted group-hover:text-foreground w-16 truncate text-center">
                        {displayStr.split("@")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bloque Directorio */}
          <div className="bg-surface border border-line rounded-3xl p-6 shadow-sm flex flex-col flex-1 max-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-foreground">Directorio</h3>
              <button
                type="button"
                onClick={() => setIsAddingContact(!isAddingContact)}
                className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                {isAddingContact ? "CANCELAR" : "+ NUEVO"}
              </button>
            </div>

            {isAddingContact && (
              <div className="mb-4 p-4 bg-background border border-line rounded-2xl space-y-3 animate-fade-in">
                <input
                  type="text"
                  placeholder="Nombre corto (Ej. Juan P.)"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full text-xs font-bold bg-surface border border-line p-2.5 rounded-lg focus:border-primary focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="correo@campusucc.edu.co"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  className="w-full text-xs font-bold bg-surface border border-line p-2.5 rounded-lg focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveContact}
                  className="w-full text-xs font-bold bg-foreground text-background py-2 rounded-lg hover:bg-primary transition-colors"
                >
                  GUARDAR CONTACTO
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {isLoadingContacts ? (
                <div className="text-center text-xs font-bold text-muted mt-10 animate-pulse">
                  Cargando...
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center text-xs font-bold text-muted mt-10">
                  No tienes contactos guardados.
                </div>
              ) : (
                contacts.map((contact) => {
                  const isSelected = currentEmail === contact.contact_email;
                  const initials = contact.contact_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={contact.id}
                      onClick={() => handleSelectContact(contact.contact_email)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-background border-line hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div
                          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-black text-xs ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-line/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-sm text-foreground truncate">
                            {contact.contact_name}
                          </p>
                          <p
                            className={`text-[10px] font-medium tracking-wide truncate ${isSelected ? "text-primary" : "text-muted"}`}
                          >
                            {contact.contact_email}
                          </p>
                        </div>
                      </div>

                      {/* Botón Eliminar Contacto (Papelera en hover) */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveContact(e, contact.id)}
                        className="p-2 shrink-0 rounded-full hover:bg-danger/10 text-muted hover:text-danger transition-colors focus:outline-none"
                        title="Eliminar contacto"
                      >
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
