import type { Metadata } from "next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryForm } from "@/components/admin/category-form";
import { toggleCategoryActiveAction } from "@/lib/actions/admin-categories";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    include: { children: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } },
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Categories</h1>

      <Card>
        <CardContent className="pt-5">
          <CardTitle className="mb-4">Add category</CardTitle>
          <CategoryForm topLevelCategories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-card border border-border-brand bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-dark">
                {cat.name} {cat.isAgeRestricted && <Badge variant="warning" className="ml-2">Age-restricted</Badge>}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant={cat.isActive ? "brand" : "outline"}>{cat.isActive ? "Active" : "Inactive"}</Badge>
                <form action={toggleCategoryActiveAction}>
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <button type="submit" className="rounded-control border border-border-brand px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                    {cat.isActive ? "Disable" : "Enable"}
                  </button>
                </form>
              </div>
            </div>
            {cat.children.length > 0 && (
              <div className="mt-2 space-y-1.5 border-t border-border-brand pt-2">
                {cat.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between pl-4 text-sm">
                    <span className="text-gray-600">— {child.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={child.isActive ? "brand" : "outline"}>{child.isActive ? "Active" : "Inactive"}</Badge>
                      <form action={toggleCategoryActiveAction}>
                        <input type="hidden" name="categoryId" value={child.id} />
                        <button type="submit" className="rounded-control border border-border-brand px-2.5 py-1 text-xs font-semibold text-brand-dark hover:bg-brand-bg">
                          {child.isActive ? "Disable" : "Enable"}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
