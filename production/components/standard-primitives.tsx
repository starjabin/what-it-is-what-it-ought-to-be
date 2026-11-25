import type {ComponentPropsWithoutRef,ReactNode} from "react";
/** Shared, semantic primitives. No data fetching, authorization or evidence mutation. */
export function StandardTable({className="",...props}:ComponentPropsWithoutRef<"table">){return <table {...props} className={("gapTable "+className).trim()} data-ui="standard-table"/>}
export function TableRegion({label,children}:{label:string;children:ReactNode}){return <div className="tableWrap" role="region" aria-label={label} tabIndex={0} data-ui="table-region">{children}</div>}
export function FormFeedback({className="notice",...props}:ComponentPropsWithoutRef<"div">){return <div {...props} className={className} role="status" aria-live="polite" data-ui="form-feedback"/>}
