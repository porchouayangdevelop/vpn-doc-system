import { Branch } from "./branch.schema";
import { Db } from "@/plugins/db";

export class BranchRepo {
  constructor(private deps: { db: Db }) {}

  private get db() {
    return this.deps.db;
  }

  /**
   * Retrieve all active branches.
   * @returns {Promise<Branch[] | null>} A promise that resolves to an array of branches or null if an error occurs.
   */
  async findAll(): Promise<Branch[] | null> {
    try {
      return await this.db.query<Branch[]>(
        `SELECT * FROM branches where is_active = 1  ORDER BY code`,
      );
    } catch (error: any | unknown) {
      throw error.message;
    }
  }

  /**
   * Retrieves a branch by its ID.
   * @param {string} id The ID of the branch to retrieve.
   * @returns {Promise<Branch | null>} A promise that resolves to a branch object or null if the branch does not exist.
   */
  async findById(id: string): Promise<Branch | null> {
    try {
      const rows = await this.db.query<Branch[]>(
        `SELECT * FROM branches where id = ?`,
        [id],
      );

      return rows[0] ?? null;
    } catch (error: any | unknown) {
      throw error.message;
    }
  }

  /**
   * Releases all resources used by the repository, including the pool connection.
   */
  dispose() {
    this.db.pool.end();
  }
}
