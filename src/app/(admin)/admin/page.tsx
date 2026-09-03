export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <h1 className="text-xl font-semibold">Admin console</h1>
      <p className="text-sm text-foreground/60">
        Platform admin tools. Tariffs now include per-feature AI credits and fixed models.
      </p>
      <ul className="list-inside list-disc text-sm text-foreground/80">
        <li>
          <a className="text-accent underline-offset-2 hover:underline" href="/admin/tariffs">
            Tariffs — AI credits & models
          </a>
        </li>
      </ul>
    </div>
  );
}
