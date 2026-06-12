import { libsqlClient } from '../db/client';

export async function getSummary() {
  const [recv, pay, cust, vend] = await Promise.all([
    libsqlClient.execute(`SELECT COALESCE(SUM(total),0) as v FROM invoices WHERE status = 'SENT'`),
    libsqlClient.execute(`SELECT COALESCE(SUM(total),0) as v FROM bills WHERE status = 'RECEIVED'`),
    libsqlClient.execute(`SELECT COUNT(*) as v FROM contacts WHERE (type='CUSTOMER' OR type='BOTH') AND is_active=1`),
    libsqlClient.execute(`SELECT COUNT(*) as v FROM contacts WHERE (type='VENDOR' OR type='BOTH') AND is_active=1`),
  ]);
  return {
    receivable: Number(recv.rows[0].v),
    payable: Number(pay.rows[0].v),
    customers: Number(cust.rows[0].v),
    vendors: Number(vend.rows[0].v),
  };
}

export async function getProfitLoss(from: string, to: string) {
  const [invRows, billRows, jeRows] = await Promise.all([
    libsqlClient.execute({
      sql: `SELECT ca.id, ca.code, ca.name, 'REVENUE' as type, COALESCE(SUM(il.amount),0) as net
            FROM invoice_lines il
            JOIN invoices i ON i.id = il.invoice_id AND i.status NOT IN ('VOID','DRAFT') AND i.date >= ? AND i.date <= ?
            JOIN chart_accounts ca ON ca.id = il.account_id AND ca.type = 'REVENUE'
            GROUP BY ca.id`,
      args: [from, to],
    }),
    libsqlClient.execute({
      sql: `SELECT ca.id, ca.code, ca.name, 'EXPENSE' as type, COALESCE(SUM(bl.amount),0) as net
            FROM bill_lines bl
            JOIN bills b ON b.id = bl.bill_id AND b.status NOT IN ('VOID','DRAFT') AND b.date >= ? AND b.date <= ?
            JOIN chart_accounts ca ON ca.id = bl.account_id AND ca.type = 'EXPENSE'
            GROUP BY ca.id`,
      args: [from, to],
    }),
    libsqlClient.execute({
      sql: `SELECT ca.id, ca.code, ca.name, ca.type,
              COALESCE(SUM(CASE WHEN ca.type='REVENUE' THEN jel.credit - jel.debit ELSE jel.debit - jel.credit END),0) as net
            FROM chart_accounts ca
            JOIN journal_entry_lines jel ON jel.account_id = ca.id
            JOIN journal_entries je ON je.id = jel.journal_entry_id
              AND je.status = 'POSTED' AND je.date >= ? AND je.date <= ?
            WHERE ca.type IN ('REVENUE','EXPENSE') AND ca.is_active = 1
            GROUP BY ca.id`,
      args: [from, to],
    }),
  ]);

  const map = new Map<string, { id: string; code: string; name: string; type: string; net: number }>();
  for (const result of [invRows, billRows, jeRows]) {
    for (const r of result.rows) {
      const key = String(r.id);
      const existing = map.get(key);
      if (existing) {
        existing.net += Number(r.net);
      } else {
        map.set(key, { id: String(r.id), code: String(r.code), name: String(r.name), type: String(r.type), net: Number(r.net) });
      }
    }
  }

  const revenue: object[] = [], expenses: object[] = [];
  let totalRevenue = 0, totalExpenses = 0;
  for (const entry of [...map.values()].sort((a, b) => a.code.localeCompare(b.code))) {
    if (entry.type === 'REVENUE') { revenue.push(entry); totalRevenue += entry.net; }
    else { expenses.push(entry); totalExpenses += entry.net; }
  }
  return { from, to, revenue, totalRevenue, expenses, totalExpenses, netIncome: totalRevenue - totalExpenses };
}

export async function getBalanceSheet(asOf: string) {
  const [rows, arResult, apResult, invRevResult, billExpResult, jeNetResult] = await Promise.all([
    libsqlClient.execute({
      sql: `SELECT ca.id, ca.code, ca.name, ca.type,
              COALESCE(SUM(jel.debit),0) as total_debit,
              COALESCE(SUM(jel.credit),0) as total_credit
            FROM chart_accounts ca
            LEFT JOIN journal_entry_lines jel ON jel.account_id = ca.id
            LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
              AND je.status = 'POSTED' AND je.date <= ?
            WHERE ca.type IN ('ASSET','LIABILITY','EQUITY') AND ca.is_active = 1
            GROUP BY ca.id ORDER BY ca.code`,
      args: [asOf],
    }),
    libsqlClient.execute({ sql: `SELECT COALESCE(SUM(total),0) as v FROM invoices WHERE status='SENT' AND date <= ?`, args: [asOf] }),
    libsqlClient.execute({ sql: `SELECT COALESCE(SUM(total),0) as v FROM bills WHERE status='RECEIVED' AND date <= ?`, args: [asOf] }),
    libsqlClient.execute({
      sql: `SELECT COALESCE(SUM(il.amount),0) as v FROM invoice_lines il
            JOIN invoices i ON i.id=il.invoice_id AND i.status NOT IN ('VOID','DRAFT') AND i.date <= ?
            JOIN chart_accounts ca ON ca.id=il.account_id AND ca.type='REVENUE'`,
      args: [asOf],
    }),
    libsqlClient.execute({
      sql: `SELECT COALESCE(SUM(bl.amount),0) as v FROM bill_lines bl
            JOIN bills b ON b.id=bl.bill_id AND b.status NOT IN ('VOID','DRAFT') AND b.date <= ?
            JOIN chart_accounts ca ON ca.id=bl.account_id AND ca.type='EXPENSE'`,
      args: [asOf],
    }),
    libsqlClient.execute({
      sql: `SELECT COALESCE(SUM(CASE WHEN ca.type='REVENUE' THEN jel.credit-jel.debit ELSE jel.debit-jel.credit END),0) as v
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id=jel.journal_entry_id AND je.status='POSTED' AND je.date <= ?
            JOIN chart_accounts ca ON ca.id=jel.account_id AND ca.type IN ('REVENUE','EXPENSE')`,
      args: [asOf],
    }),
  ]);

  const arAmount = Number(arResult.rows[0].v);
  const apAmount = Number(apResult.rows[0].v);
  const retainedEarnings = Number(invRevResult.rows[0].v) - Number(billExpResult.rows[0].v) + Number(jeNetResult.rows[0].v);

  const map = new Map<string, { id: string; code: string; name: string; type: string; balance: number }>();
  for (const r of rows.rows) {
    const d = Number(r.total_debit), c = Number(r.total_credit);
    const balance = r.type === 'ASSET' ? d - c : c - d;
    map.set(String(r.code), { id: String(r.id), code: String(r.code), name: String(r.name), type: String(r.type), balance });
  }

  if (arAmount !== 0 && map.has('1100')) map.get('1100')!.balance += arAmount;
  if (apAmount !== 0 && map.has('2000')) map.get('2000')!.balance += apAmount;
  if (retainedEarnings !== 0 && map.has('3100')) map.get('3100')!.balance += retainedEarnings;

  const assets: object[] = [], liabilities: object[] = [], equity: object[] = [];
  let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;
  for (const entry of [...map.values()].sort((a, b) => a.code.localeCompare(b.code))) {
    if (entry.balance === 0) continue;
    if (entry.type === 'ASSET') { assets.push(entry); totalAssets += entry.balance; }
    else if (entry.type === 'LIABILITY') { liabilities.push(entry); totalLiabilities += entry.balance; }
    else { equity.push(entry); totalEquity += entry.balance; }
  }
  return { asOf, assets, totalAssets, liabilities, totalLiabilities, equity, totalEquity };
}