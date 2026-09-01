import Image from "next/image";
import Link from "next/link";

// Ecosystem footer per the canonical recipe (gemini/witus/public/brand/footer-recipe.md):
// same structure everywhere, Field Guide palette here. The Rise Wellness callout below is the
// canonical copy with only the [swap]-marked colors and the app-name token changed; the
// disclaimer is byte-identical by rule (vetted with the partner; never paraphrase).

interface SiblingProduct {
  name: string;
  href: string;
}

// Canonical sibling-product list. Mirror with gemini/witus/lib/products.ts and the recipe
// (2026-08 corrections absorbed: Wanderlust rename, Learn.WitUS standalone URL).
const SIBLING_PRODUCTS: SiblingProduct[] = [
  { name: "WitUS.online", href: "https://witus.online" },
  { name: "WitUS Inbox", href: "https://inbox.witus.online" },
  { name: "CentenarianOS", href: "https://centenarianos.com" },
  { name: "Work.WitUS", href: "https://work.witus.online" },
  { name: "Tour Manager OS", href: "https://tour.witus.online" },
  { name: "Wanderlust", href: "https://wanderlust.witus.online" },
  { name: "Fly.WitUS", href: "https://fly.witus.online" },
  { name: "FlashLearnAI", href: "https://flashlearnai.witus.online" },
  { name: "Learn.WitUS", href: "https://learn.witus.online" },
  { name: "AwesomeWebStore", href: "https://awesomewebstore.com" },
];

// [swap] Field Guide tokens: moss accent, rule borders, muted text.
const linkClasses =
  "inline-flex items-center min-h-7 text-muted hover:text-moss hover:underline transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-rule bg-card">
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/brand/witus/logomark.svg" alt="WitUS" width={56} height={56} className="mb-2 h-12 w-auto" />
          <p className="font-display text-lg tracking-wide italic">VO GOAT</p>
          <p className="text-xs text-muted">The daily voiceover game</p>
        </div>

        <RiseWellnessCallout />

        <div className="grid grid-cols-1 gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-2 font-semibold">Ecosystem</p>
            <ul className="space-y-1">
              {SIBLING_PRODUCTS.map((p) => (
                <li key={p.href}>
                  <a href={p.href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                    {p.name}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 font-semibold">VO GOAT</p>
            <ul className="space-y-1">
              <li>
                <Link href="/" className={linkClasses}>
                  Today
                </Link>
              </li>
              <li>
                <Link href="/menagerie" className={linkClasses}>
                  Menagerie
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className={linkClasses}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/about" className={linkClasses}>
                  About the method
                </Link>
              </li>
              <li>
                <Link href="/voice-data" className={linkClasses}>
                  Your voice data
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-2 font-semibold">Partners &amp; Legal</p>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://www.centenarianos.com/safety#rise-wellness"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClasses}
                >
                  Rise Wellness
                  <span className="sr-only"> (mental-health partner — opens in new tab)</span>
                </a>
                <p className="text-xs leading-tight text-muted">Mental-health partner</p>
              </li>
              <li className="pt-2">
                <a href="https://witus.online/terms" target="_blank" rel="noopener noreferrer" className={linkClasses}>
                  Terms
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </li>
              <li>
                <a href="https://witus.online/privacy" target="_blank" rel="noopener noreferrer" className={linkClasses}>
                  Privacy
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </li>
              <li>
                <a href="mailto:bam@awews.com" className={linkClasses}>
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-rule pt-6 text-center text-xs text-muted">
          <p>
            © {year} B4C LLC — A{" "}
            <a
              href="https://awesomewebstore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-moss hover:underline"
            >
              AwesomeWebStore.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>{" "}
            brand
          </p>
        </div>
      </div>
    </footer>
  );
}

// Canonical copy from footer-recipe.md. The section keeps a FIXED light surface in both color
// schemes because its inner text colors are part of the verbatim block; only the [swap]-marked
// colors and the app-name token differ from the recipe.
function RiseWellnessCallout() {
  return (
    <section
      aria-labelledby="rise-wellness-heading"
      className="mb-8 rounded-lg border border-[#d9d4c7] bg-[#f7f3ea] p-5 text-sm"
    >
      <header className="mb-3">
        <p className="text-[11px] font-semibold tracking-wide text-[#3f6212] uppercase">Mental health support</p>
        <h2 id="rise-wellness-heading" className="text-base font-semibold text-gray-900">
          Rise Wellness of Indiana
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">Independent mental health provider · Not affiliated with VO GOAT</p>
      </header>

      <p className="leading-relaxed text-gray-700">
        Rise Wellness of Indiana provides compassionate, personalized, holistic mental health
        care: evidence-based medicine, trauma-informed care, and a whole-person approach to help
        you heal, grow, and thrive in mind, body, and spirit.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Services</p>
          <ul className="space-y-0.5 text-xs text-gray-700">
            <li>ADHD testing &amp; management (in-person and from home)</li>
            <li>Anxiety &amp; depression</li>
            <li>Maternal mental health</li>
            <li>Medication management</li>
            <li>GeneSight® genetic testing</li>
            <li>Behavioral therapy &amp; coaching</li>
            <li>Routine lab testing</li>
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Visit or call</p>
          <address className="text-xs leading-relaxed text-gray-700 not-italic">
            320 North Meridian Street
            <br />
            Indianapolis, IN 46204
            <br />
            Mon–Sat by appointment · Sun closed
          </address>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs">
            <a
              href="tel:+13179650299"
              className="inline-flex min-h-7 items-center rounded font-medium text-[#3f6212] hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              317-965-0299
            </a>
            <span aria-hidden="true" className="text-gray-300">
              ·
            </span>
            <a
              href="https://risewellnessofindiana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-7 items-center rounded font-medium text-[#3f6212] hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              risewellnessofindiana.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <span aria-hidden="true" className="text-gray-300">
              ·
            </span>
            <a
              href="https://www.centenarianos.com/safety#rise-wellness"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-7 items-center rounded font-medium text-[#3f6212] hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              Full safety page
              <span className="sr-only"> on centenarianos.com (opens in new tab)</span>
            </a>
          </div>
        </div>
      </div>

      <blockquote className="mt-4 border-l-2 border-[#3f6212]/40 pl-3 text-xs text-gray-600 italic">
        &ldquo;At Rise Wellness, we believe everyone has the capacity to rise above challenges
        and live a fulfilling, healthy life. Our care is guided by the belief that healing is
        personal, holistic, and rooted in compassion.&rdquo;
        <span className="mt-1 block text-gray-500 not-italic">Rise Wellness of Indiana</span>
      </blockquote>

      {/* === NON-NEGOTIABLE DISCLAIMER ===
           Edit ONLY the app name token. Don't paraphrase. Don't trim.
           Don't reorder. This was vetted with the partner. */}
      <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
        Rise Wellness of Indiana is an independent organization. They are not affiliated with,
        employed by, or endorsed by VO GOAT, CentenarianOS, B4C LLC, AwesomeWebStore.com, or
        Anthony McDonald. We are grateful for their collaboration on mental health safety
        resources for our community.
      </p>
    </section>
  );
}
