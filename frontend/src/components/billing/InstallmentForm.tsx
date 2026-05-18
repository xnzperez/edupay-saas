import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBilling } from "../../hooks/useCreateBilling";
import type { StudentSearchResult } from "../../types/billing";

const billingSchema = z.object({
  concept: z
    .string()
    .min(4, "El concepto debe ser descriptivo (ej. Matrícula)"),
  amount: z
    .number({ message: "Ingresa un monto válido" })
    .min(1000, "El monto mínimo a facturar es de $1,000 COP"),
  due_date: z.string().min(1, "Debes seleccionar una fecha de vencimiento"),
});

type BillingFormValues = z.infer<typeof billingSchema>;

interface InstallmentFormProps {
  student: StudentSearchResult;
  onSuccess: () => void;
}

export function InstallmentForm({ student, onSuccess }: InstallmentFormProps) {
  const { isBilling, emitInstallment } = useCreateBilling({ onSuccess });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
  });

  const onSubmit = async (data: BillingFormValues) => {
    const success = await emitInstallment(
      {
        user_id: student.id,
        description: data.concept,
        amount: data.amount,
        due_date: data.due_date,
      },
      student.full_name
    );
    if (success) {
      reset();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
      <div>
        <label className="block text-sm font-bold text-foreground tracking-wide mb-2">
          CONCEPTO DEL COBRO
        </label>
        <input
          type="text"
          {...register("concept")}
          placeholder="Ej: Matrícula Semestre 9"
          className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted focus:outline-none transition-all ${
            errors.concept
              ? "border-danger focus:ring-4 focus:ring-danger/20 focus:border-danger"
              : "border-line focus:border-primary focus:ring-4 focus:ring-primary/20"
          }`}
        />
        {errors.concept && (
          <p className="text-danger text-xs mt-1 font-bold animate-pulse">
            {errors.concept.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-foreground tracking-wide mb-2">
            MONTO (COP)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground font-bold">
              $
            </span>
            <input
              type="number"
              {...register("amount", { valueAsNumber: true })}
              placeholder="0.00"
              className={`w-full pl-8 pr-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted focus:outline-none transition-all ${
                errors.amount
                  ? "border-danger focus:ring-4 focus:ring-danger/20 focus:border-danger"
                  : "border-line focus:border-primary focus:ring-4 focus:ring-primary/20"
              }`}
            />
          </div>
          {errors.amount && (
            <p className="text-danger text-xs mt-1 font-bold animate-pulse">
              {errors.amount.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-foreground tracking-wide mb-2">
            VENCE EL
          </label>
          <input
            type="date"
            {...register("due_date")}
            style={{ colorScheme: "dark" }}
            className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground focus:outline-none transition-all ${
              errors.due_date
                ? "border-danger focus:ring-4 focus:ring-danger/20 focus:border-danger"
                : "border-line focus:border-primary focus:ring-4 focus:ring-primary/20"
            }`}
          />
          {errors.due_date && (
            <p className="text-danger text-xs mt-1 font-bold animate-pulse">
              {errors.due_date.message}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isBilling}
        className="w-full mt-4 bg-danger hover:bg-danger/80 text-white font-extrabold text-lg py-4 rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 hover:-translate-y-0.5 flex justify-center items-center"
      >
        {isBilling ? "Procesando Cobro..." : "EMITIR COBRO"}
      </button>
    </form>
  );
}
