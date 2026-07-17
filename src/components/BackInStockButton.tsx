import { useState } from "react";
import { toast } from "sonner";
import { useSubmitBackInStock } from "@/lib/api/queries";

// Compact "Request Back in Stock" control for product grids — a small
// popover email form rather than a full page, since it needs to fit in a
// product card's action row alongside "View Details".
export function BackInStockButton({
  perfumeId,
  variantId,
  className,
}: {
  perfumeId: string;
  variantId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const submit = useSubmitBackInStock();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await submit.mutateAsync({ perfumeId, variantId, email: email.trim() });
      toast.success("We'll let you know the moment it's back.");
      setEmail("");
      setOpen(false);
    } catch {
      toast.error("Couldn't submit that just now — please try again.");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={className ?? "text-[10px] uppercase tracking-[0.35em] text-gold hover:text-gold/80"}
      >
        Request Back in Stock
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="flex w-full items-center gap-2"
    >
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        aria-label="Email for back-in-stock alert"
        className="min-w-0 flex-1 rounded-sm border border-border bg-transparent px-2 py-1.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-gold focus:outline-none"
      />
      <button
        type="submit"
        disabled={submit.isPending}
        className="whitespace-nowrap rounded-sm border border-gold/50 px-3 py-1.5 text-[9px] uppercase tracking-[0.3em] text-gold disabled:opacity-50"
      >
        Notify Me
      </button>
    </form>
  );
}
