import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminUsersWithSubscriptions } from "../../lib/supabase/getAdminUsersWithSubscriptions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await getAdminUsersWithSubscriptions();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error interno" });
  }
}
