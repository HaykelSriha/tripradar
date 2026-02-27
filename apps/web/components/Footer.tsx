import Link from "next/link";
import { Plane } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center
                      justify-between gap-4 text-sm text-muted">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center">
            <Plane className="w-3 h-3 text-white" />
          </div>
          <span className="font-display font-semibold text-secondary">TripRadar</span>
        </div>

        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-secondary transition-colors">
            Confidentialité
          </Link>
          <Link href="/cgu" className="hover:text-secondary transition-colors">
            CGU
          </Link>
          <a
            href="mailto:hello@trigradar.fr"
            className="hover:text-secondary transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
