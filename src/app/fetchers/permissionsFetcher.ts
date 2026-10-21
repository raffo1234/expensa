import { PermissionType } from "@/types/permissionType";
import { listPermissions } from "@/actions/admin";

export default async function permissionsFetcher(): Promise<PermissionType[] | null> {
  return (await listPermissions("created_at")) as PermissionType[];
}
