import { PAYMENT_INSTRUCTIONS } from "../data/plans";
import { Info } from "lucide-react";

export default function PaymentInstructions({ amount }) {
  return (
    <div className="fiche border-or-400 rounded p-4 mb-4">
      {amount && (
        <p className="font-display text-lg text-ocre-600 mb-2">
          Montant à payer : {amount.toLocaleString("fr-FR")} FCFA
        </p>
      )}
      <p className="text-sm font-medium mb-1">Payez via :</p>
      <ul className="text-sm space-y-0.5 mb-3">
        <li>Orange Money : <b>{PAYMENT_INSTRUCTIONS.orangeMoney}</b></li>
        <li>MTN Money : <b>{PAYMENT_INSTRUCTIONS.mtnMoney}</b></li>
        <li>Wave : <b>{PAYMENT_INSTRUCTIONS.wave}</b></li>
      </ul>
      <div className="flex items-start gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded px-2.5 py-2">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 leading-relaxed">{PAYMENT_INSTRUCTIONS.note}</p>
      </div>
    </div>
  );
}
