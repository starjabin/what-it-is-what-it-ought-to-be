# Engineering rules

Preserve: Evidence → Position → Gap → Impact → Action → Accountability → Outcome.

Every material AI output must distinguish fact, inference and recommendation; include evidence references or explicitly identify missing evidence; remain reviewable before operational use; preserve tenant scope and audit provenance.

Never trust client-supplied organization IDs for authorization. Enforce tenant access with PostgreSQL RLS plus server checks.

Never store provider credentials, payment card data or raw secrets in application tables.
