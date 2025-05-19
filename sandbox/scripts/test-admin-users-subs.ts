import { getAdminUsersWithSubscriptions } from "../../src/lib/supabase/getAdminUsersWithSubscriptions";

(async () => {
  try {
    const data = await getAdminUsersWithSubscriptions();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
})();
