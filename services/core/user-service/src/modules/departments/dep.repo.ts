import { Pool, PoolConnection } from "mariadb";
import { Department } from "./dep.schema";

export class DepartmentRepo {
  private pool!: Pool;
  constructor() {}

  /**
   * Sets the pool connection for the repository.
   * @param {Pool} pool The pool connection to use.
   */
  setPool(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Retrieve all active departments.
   * @returns {Promise<Department[] | null>} A promise that resolves to an array of departments or null if an error occurs.
   */
  async findAll(): Promise<Department[] | null> {
    let conn: PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();
      return await conn.query<Department[]>(
        `SELECT * FROM departments where is_active = 1  ORDER BY code`,
      );
    } catch (error: any | unknown) {
      throw error.message;
    } finally {
      conn?.release();
    }
  }

  async findById(id: string): Promise<Department | null> {
    let con: PoolConnection | undefined;
    try {
      con = await this.pool.getConnection();
      const rows = await con.query<Department[]>(
        `SELECT * FROM departments WHERE branch_id = ? AND is_active = 1 ORDER BY code`,
        [id],
      );

      return rows[0] ?? null;
    } catch (error: any | unknown) {
      throw error.message;
    } finally {
      con?.release();
    }
  }
  dispose() {
    this.pool.end();
  }
}
