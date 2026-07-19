/**
 * Table.jsx — canonical data-table shell (component-lock-v1.md sibling to
 * Card: same className/style-merge and CSS-custom-property conventions,
 * shaped for tabular rank/stat data instead of panel content).
 *
 * Extracted from Standings.jsx's page-local StandingsTable — same visual
 * contract (mono/tabular-nums numeric cells, overflow-x-auto wrapper, a
 * `highlighted` row for "this is you" with an accent left-edge + tinted
 * background), generalized because ranked/tabular data recurs beyond
 * standings (move history, draft boards, ledgers).
 */

const CELL_ALIGN_CLASSES = { left: 'text-left', center: 'text-center', right: 'text-right' };

export function Table({ className = '', style: styleOverride, children, ...rest }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${className}`.trim()} style={styleOverride} {...rest}>
        {children}
      </table>
    </div>
  );
}

Table.Head = function TableHead({ className = '', children, ...rest }) {
  return <thead className={className} {...rest}>{children}</thead>;
};

Table.Body = function TableBody({ className = '', children, ...rest }) {
  return <tbody className={className} {...rest}>{children}</tbody>;
};

Table.Row = function TableRow({ highlighted = false, className = '', style: styleOverride, children, ...rest }) {
  return (
    <tr
      className={`border-b last:border-0 ${className}`.trim()}
      style={{
        borderColor: highlighted ? 'var(--color-team-accent)' : 'var(--color-border)',
        background: highlighted ? 'color-mix(in srgb, var(--color-team-accent) 12%, transparent)' : 'transparent',
        ...styleOverride,
      }}
      data-table-row-highlighted={highlighted}
      {...rest}
    >
      {children}
    </tr>
  );
};

Table.HeaderCell = function TableHeaderCell({ align = 'left', className = '', style: styleOverride, children, ...rest }) {
  const alignClass = CELL_ALIGN_CLASSES[align] ?? CELL_ALIGN_CLASSES.left;
  return (
    <th
      className={`pb-2.5 pr-4 last:pr-0 font-mono text-xs font-semibold uppercase tracking-wide ${alignClass} ${className}`.trim()}
      style={{ color: 'var(--color-text-tertiary)', ...styleOverride }}
      {...rest}
    >
      {children}
    </th>
  );
};

// `accentEdge` reserves the 4px left border on every cell (transparent when
// false) rather than only rendering it when true, so a highlighted row's
// accent bar doesn't shift that column's content relative to other rows.
Table.Cell = function TableCell({ align = 'left', mono = false, accentEdge = false, className = '', style: styleOverride, children, ...rest }) {
  const alignClass = CELL_ALIGN_CLASSES[align] ?? CELL_ALIGN_CLASSES.left;
  const monoClass = mono ? 'font-mono tabular-nums' : '';
  return (
    <td
      className={`py-3 pr-4 last:pr-0 text-xs ${alignClass} ${monoClass} ${className}`.trim().replace(/\s+/g, ' ')}
      style={{
        color: 'var(--color-text-secondary)',
        borderLeft: accentEdge ? '4px solid var(--color-team-accent)' : '4px solid transparent',
        paddingLeft: accentEdge ? 12 : 0,
        ...styleOverride,
      }}
      {...rest}
    >
      {children}
    </td>
  );
};

export default Table;
