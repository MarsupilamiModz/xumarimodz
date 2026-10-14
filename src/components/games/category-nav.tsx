import Link from "next/link";
import { ChipTabs, type ChipOption } from "@/components/ui/chip-tabs";
import { buildCategoryTree, categoryBreadcrumb, type FlatCategory } from "@/lib/categories";

type Tree = ReturnType<typeof buildCategoryTree>;

/** Kategoriebaum in Reihenfolge (Eltern vor Kindern) als flache Chip-Liste. */
function flatten(nodes: Tree, out: ChipOption[] = []): ChipOption[] {
  for (const node of nodes) {
    out.push({ value: node.slug, label: node.name });
    if (node.children.length > 0) flatten(node.children, out);
  }
  return out;
}

export function CategoryNav({
  locale,
  gameSlug,
  categories,
  activeSlug,
  allLabel,
  label,
  breadcrumbLabel,
}: {
  locale: string;
  gameSlug: string;
  categories: FlatCategory[];
  activeSlug?: string;
  allLabel: string;
  label: string;
  breadcrumbLabel: string;
}) {
  const base = `/${locale}/games/${gameSlug}`;
  const options: ChipOption[] = [{ value: "", label: allLabel }, ...flatten(buildCategoryTree(categories))];
  const breadcrumb = activeSlug
    ? categoryBreadcrumb(
        categories,
        categories.find((c) => c.slug === activeSlug)?.id ?? ""
      )
    : [];

  return (
    <div className="page-container space-y-3 py-6">
      {breadcrumb.length > 0 && (
        <nav aria-label={breadcrumbLabel} className="meta flex flex-wrap items-center gap-1.5">
          <Link href={base} className="transition-colors duration-fast hover:text-ink">
            {allLabel}
          </Link>
          {breadcrumb.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              <Link href={`${base}?category=${c.slug}`} className="transition-colors duration-fast hover:text-ink">
                {c.name}
              </Link>
            </span>
          ))}
        </nav>
      )}
      <ChipTabs
        label={label}
        options={options}
        value={activeSlug ?? ""}
        hrefFor={(slug) => (slug ? `${base}?category=${slug}` : base)}
      />
    </div>
  );
}
