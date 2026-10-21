import { getMyRoleName } from "@/actions/admin";

// The role name shown in the sidebar is always the signed-in user's own role.
export default async function roleFetcher() {
  return getMyRoleName();
}
