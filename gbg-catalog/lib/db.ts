import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT ?? 1433),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

declare global {
  // eslint-disable-next-line no-var
  var _gbgPool: Promise<sql.ConnectionPool> | undefined;
}

export function getPool(): Promise<sql.ConnectionPool> {
  if (!global._gbgPool) {
    global._gbgPool = new sql.ConnectionPool(config).connect();
  }
  return global._gbgPool;
}
