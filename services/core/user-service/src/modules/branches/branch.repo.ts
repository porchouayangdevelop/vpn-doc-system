import { Branch } from "./branch.schema";
import { Pool, PoolConnection } from "mariadb";

export class BranchRepo {
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
   * Retrieve all active branches.
   * @returns {Promise<Branch[] | null>} A promise that resolves to an array of branches or null if an error occurs.
   */
  async findAll(): Promise<Branch[] | null> {
    let conn: PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();
      return await conn.query<Branch[]>(
        `SELECT * FROM branches where is_active = 1  ORDER BY code`,
      );
    } catch (error: any | unknown) {
      throw error.message;
    } finally {
      conn?.release();
    }
  }

  /**
   * Retrieves a branch by its ID.
   * @param {string} id The ID of the branch to retrieve.
   * @returns {Promise<Branch | null>} A promise that resolves to a branch object or null if the branch does not exist.
   */
  async findById(id: string): Promise<Branch | null> {
    let con: PoolConnection | undefined;
    try {
      con = await this.pool.getConnection();
      const rows = await con.query<Branch[]>(
        `SELECT * FROM branches where id = ?`,
        [id],
      );

      return rows[0] ?? null;
    } catch (error: any | unknown) {
      throw error.message;
    } finally {
      con?.release();
    }
  }

  /**
   * Releases all resources used by the repository, including the pool connection.
   */
  dispose() {
    this.pool.end();
  }
}
